# Cross-Camera ReID & Best-Angle Editor — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement `correlate.py` — matches climbers across two synchronized cameras, scores clip quality, crops to climber's zone, and produces per-person highlight reels + unified viewer.

**Architecture:** Three phases in a single script: (1) CLIMBER-level temporal+HSV matching with Hungarian assignment; (2) YOLO scoring pass computing bbox quality + crop region per clip; (3) FFmpeg crop+encode per clip and concat into highlight reels, plus static viewer HTML.

**Tech Stack:** Python 3.10+, OpenCV, ultralytics (YOLOv8n-pose), scipy (linear_sum_assignment), FFmpeg (subprocess), pytest

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `scripts/correlate.py` | Create | Full pipeline: correlator + scorer + editor + viewer |
| `scripts/tests/__init__.py` | Create | Make tests a package |
| `scripts/tests/test_correlate.py` | Create | Unit tests for all pure functions |

Existing `scripts/correlator.py` is untouched — kept as reference.

---

## Task 1: Scaffold + Helper Functions

**Files:**
- Create: `scripts/correlate.py`
- Create: `scripts/tests/__init__.py`
- Create: `scripts/tests/test_correlate.py`

- [ ] **Step 1.1: Write failing tests for helper functions**

Create `scripts/tests/__init__.py` (empty) and `scripts/tests/test_correlate.py`:

```python
# scripts/tests/test_correlate.py
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

import pytest
import numpy as np
from correlate import activity_window, temporal_iou, compute_crop_rect

CLIPS_CAM1 = [
    {"climber_id": "CLIMBER-001", "climb_num": 1, "start_s": 10.0, "end_s": 20.0,
     "zone": "Wall A", "tid": 1,
     "file_1080p": "CLIMBER_001_climb01_1080p.mp4", "file_480p": "CLIMBER_001_climb01_480p.mp4"},
    {"climber_id": "CLIMBER-001", "climb_num": 2, "start_s": 30.0, "end_s": 45.0,
     "zone": "Wall A", "tid": 1,
     "file_1080p": "CLIMBER_001_climb02_1080p.mp4", "file_480p": "CLIMBER_001_climb02_480p.mp4"},
    {"climber_id": "CLIMBER-002", "climb_num": 1, "start_s": 100.0, "end_s": 110.0,
     "zone": "Wall A", "tid": 5,
     "file_1080p": "CLIMBER_002_climb01_1080p.mp4", "file_480p": "CLIMBER_002_climb01_480p.mp4"},
]

def test_activity_window_single_clip():
    windows = activity_window([CLIPS_CAM1[2]])
    assert windows["CLIMBER-002"] == (100.0, 110.0)

def test_activity_window_multi_clip():
    windows = activity_window(CLIPS_CAM1[:2])
    assert windows["CLIMBER-001"] == (10.0, 45.0)

def test_temporal_iou_full_overlap():
    assert temporal_iou((10.0, 45.0), (10.0, 45.0)) == pytest.approx(1.0)

def test_temporal_iou_no_overlap():
    assert temporal_iou((10.0, 20.0), (30.0, 40.0)) == 0.0

def test_temporal_iou_partial():
    # overlap=5, union=15
    assert temporal_iou((0.0, 10.0), (5.0, 15.0)) == pytest.approx(5.0 / 15.0)

def test_compute_crop_rect_basic():
    bboxes = [(100, 200, 300, 500)]
    crop = compute_crop_rect(bboxes, 1920, 1080, margin=0.10)
    # bbox w=200, h=300 → dx=20, dy=30
    assert crop["x"] == 80   # 100-20
    assert crop["y"] == 170  # 200-30
    assert crop["w"] == 240  # (300+20) - 80
    assert crop["h"] == 360  # (500+30) - 170

def test_compute_crop_rect_clamped():
    bboxes = [(0, 0, 1920, 1080)]
    crop = compute_crop_rect(bboxes, 1920, 1080, margin=0.10)
    assert crop["x"] == 0
    assert crop["y"] == 0
    assert crop["w"] == 1920
    assert crop["h"] == 1080

def test_compute_crop_rect_even_dimensions():
    bboxes = [(101, 201, 302, 502)]
    crop = compute_crop_rect(bboxes, 1920, 1080, margin=0.10)
    assert crop["w"] % 2 == 0
    assert crop["h"] % 2 == 0

def test_compute_crop_rect_empty():
    crop = compute_crop_rect([], 1920, 1080, margin=0.10)
    assert crop == {"x": 0, "y": 0, "w": 1920, "h": 1080}

def test_normalize_scores_basic():
    from correlate import normalize_scores
    raw = [{"bbox": 0.4, "center": 0.8, "sharp": 100.0},
           {"bbox": 0.2, "center": 0.5, "sharp": 200.0}]
    scores = normalize_scores(raw)
    assert len(scores) == 2
    assert all(0.0 <= s <= 1.0 for s in scores)
    # clip with higher sharpness should score higher (other things equal)
    assert scores[1] > scores[0]

def test_normalize_scores_fallback():
    from correlate import normalize_scores
    scores = normalize_scores([None, None])
    assert scores == [0.1, 0.1]
```

- [ ] **Step 1.2: Run tests — confirm they all fail**

```bash
"d:/Claude - PA/projects/climbcam/venv/Scripts/python.exe" -m pytest \
  "d:/Claude - PA/projects/climbcam/scripts/tests/test_correlate.py" -v
```

Expected: `ModuleNotFoundError: No module named 'correlate'`

- [ ] **Step 1.3: Create `scripts/correlate.py` with helpers**

```python
"""
ClimbCam — correlate.py
Cross-camera ReID: correlaciona CLIMBERs entre câmeras, scorer, crop/zoom, highlight reel.

Uso:
    python correlate.py --cam1 newclips/output_constanca --cam2 newclips/output_tiago --out newclips/output_multicam

Flags opcionais:
    --iou-thresh  0.30   (sobreposição temporal mínima para candidatos)
    --reid-thresh 0.50   (distância Bhattacharyya máxima para match)
    --no-score          (salta scoring YOLO; usa clip completo sem zoom)
"""

import argparse
import json
import subprocess
import shutil
import webbrowser
from pathlib import Path
from collections import defaultdict

import cv2
import numpy as np
from scipy.optimize import linear_sum_assignment
from ultralytics import YOLO

SCRIPT_DIR = Path(__file__).parent
MODEL_PATH  = str(SCRIPT_DIR.parent / "yolov8n-pose.pt")
HSV_BINS    = [16, 16, 16]
CROP_MARGIN = 0.10
CRF         = 18
SCORE_W     = {"bbox": 0.5, "center": 0.3, "sharp": 0.2}


# ── Pure helpers (tested) ─────────────────────────────────────────────────────

def activity_window(clips: list) -> dict:
    """Returns {climber_id: (start_s, end_s)} spanning all clips of each climber."""
    windows = {}
    for c in clips:
        cid = c["climber_id"]
        if cid not in windows:
            windows[cid] = (c["start_s"], c["end_s"])
        else:
            s, e = windows[cid]
            windows[cid] = (min(s, c["start_s"]), max(e, c["end_s"]))
    return windows


def temporal_iou(w1: tuple, w2: tuple) -> float:
    """IoU of two time windows (start, end)."""
    overlap = max(0.0, min(w1[1], w2[1]) - max(w1[0], w2[0]))
    union   = max(w1[1], w2[1]) - min(w1[0], w2[0])
    return overlap / union if union > 0 else 0.0


def compute_crop_rect(bboxes: list, frame_w: int, frame_h: int, margin: float = 0.10) -> dict:
    """
    Union of all (x1,y1,x2,y2) bboxes + margin%, clamped to frame bounds.
    Result w and h are forced to even numbers (FFmpeg requirement).
    """
    if not bboxes:
        return {"x": 0, "y": 0, "w": frame_w, "h": frame_h}
    x1 = min(b[0] for b in bboxes)
    y1 = min(b[1] for b in bboxes)
    x2 = max(b[2] for b in bboxes)
    y2 = max(b[3] for b in bboxes)
    dx = int((x2 - x1) * margin)
    dy = int((y2 - y1) * margin)
    x1 = max(0, x1 - dx)
    y1 = max(0, y1 - dy)
    x2 = min(frame_w, x2 + dx)
    y2 = min(frame_h, y2 + dy)
    w  = (x2 - x1) & ~1   # floor to even
    h  = (y2 - y1) & ~1
    return {"x": int(x1), "y": int(y1), "w": int(w), "h": int(h)}


def normalize_scores(raw_scores: list) -> list:
    """
    raw_scores: list of {"bbox": float, "center": float, "sharp": float} or None.
    Returns list of final weighted scores (0.0–1.0), None entries → 0.1.
    Sharpness is min-max normalized across the batch before weighting.
    """
    valid = [s for s in raw_scores if s is not None]
    if not valid:
        return [0.1] * len(raw_scores)
    sharpnesses = [s["sharp"] for s in valid]
    sharp_min   = min(sharpnesses)
    sharp_range = max(sharpnesses) - sharp_min
    result = []
    for s in raw_scores:
        if s is None:
            result.append(0.1)
            continue
        sharp_norm = (s["sharp"] - sharp_min) / sharp_range if sharp_range > 0 else 0.5
        score = (SCORE_W["bbox"]   * min(s["bbox"],   1.0) +
                 SCORE_W["center"] * min(s["center"], 1.0) +
                 SCORE_W["sharp"]  * sharp_norm)
        result.append(round(score, 4))
    return result
```

- [ ] **Step 1.4: Run tests — confirm helpers pass**

```bash
"d:/Claude - PA/projects/climbcam/venv/Scripts/python.exe" -m pytest \
  "d:/Claude - PA/projects/climbcam/scripts/tests/test_correlate.py" -v
```

Expected: all 10 tests PASS.

- [ ] **Step 1.5: Commit**

```bash
cd "d:/Claude - PA" && git add projects/climbcam/scripts/correlate.py projects/climbcam/scripts/tests/ && git commit -m "feat(climbcam): correlate.py scaffold + helper functions + tests"
```

---

## Task 2: Cross-Camera Correlator

**Files:**
- Modify: `scripts/correlate.py` — add `compute_hsv_hist`, `build_person_map`
- Modify: `scripts/tests/test_correlate.py` — add correlator tests

- [ ] **Step 2.1: Add failing tests for `compute_hsv_hist` and `build_person_map`**

Append to `scripts/tests/test_correlate.py`:

```python
from unittest.mock import patch, MagicMock
from correlate import compute_hsv_hist, build_person_map

def test_compute_hsv_hist_returns_array(tmp_path):
    # Mock cv2.VideoCapture so no real video needed
    mock_cap = MagicMock()
    mock_cap.get.return_value = 30  # 30 frames
    mock_frame = np.zeros((480, 854, 3), dtype=np.uint8)
    mock_cap.read.return_value = (True, mock_frame)
    with patch("cv2.VideoCapture", return_value=mock_cap):
        hist = compute_hsv_hist(tmp_path / "fake.mp4", n_frames=3)
    assert hist is not None
    assert hist.shape == (16 * 16 * 16,)
    assert abs(hist.sum() - 1.0) < 1e-5  # L1 normalized

def test_compute_hsv_hist_empty_video(tmp_path):
    mock_cap = MagicMock()
    mock_cap.get.return_value = 0
    with patch("cv2.VideoCapture", return_value=mock_cap):
        hist = compute_hsv_hist(tmp_path / "empty.mp4")
    assert hist is None

def _make_hist(seed: int) -> np.ndarray:
    rng = np.random.default_rng(seed)
    h = rng.random(16 * 16 * 16).astype(np.float32)
    h /= h.sum()
    return h

def test_build_person_map_matched():
    clips1 = [
        {"climber_id": "CLIMBER-001", "climb_num": 1, "start_s": 10.0, "end_s": 45.0,
         "zone": "Wall A", "tid": 1,
         "file_1080p": "c1.mp4", "file_480p": "c1_480p.mp4"},
    ]
    clips2 = [
        {"climber_id": "CLIMBER-003", "climb_num": 1, "start_s": 12.0, "end_s": 43.0,
         "zone": "Wall A", "tid": 3,
         "file_1080p": "c3.mp4", "file_480p": "c3_480p.mp4"},
    ]
    # Make histograms nearly identical so Bhattacharyya ≈ 0
    identical_hist = _make_hist(42)
    with patch("correlate.compute_hsv_hist", return_value=identical_hist):
        persons = build_person_map(clips1, clips2, Path("."), Path("."),
                                   iou_thresh=0.30, reid_thresh=0.50)
    assert len(persons) == 1
    assert persons[0]["match_type"] == "dual"
    assert persons[0]["cam1_climber"] == "CLIMBER-001"
    assert persons[0]["cam2_climber"] == "CLIMBER-003"

def test_build_person_map_no_temporal_overlap():
    clips1 = [{"climber_id": "CLIMBER-001", "climb_num": 1, "start_s": 10.0, "end_s": 20.0,
               "zone": "Wall A", "tid": 1, "file_1080p": "a.mp4", "file_480p": "a480.mp4"}]
    clips2 = [{"climber_id": "CLIMBER-002", "climb_num": 1, "start_s": 100.0, "end_s": 110.0,
               "zone": "Wall A", "tid": 2, "file_1080p": "b.mp4", "file_480p": "b480.mp4"}]
    identical_hist = _make_hist(42)
    with patch("correlate.compute_hsv_hist", return_value=identical_hist):
        persons = build_person_map(clips1, clips2, Path("."), Path("."),
                                   iou_thresh=0.30, reid_thresh=0.50)
    assert len(persons) == 2
    types = {p["match_type"] for p in persons}
    assert "solo_cam1" in types
    assert "solo_cam2" in types

def test_build_person_map_solo_cam1():
    # cam2 has no climbers
    clips1 = [{"climber_id": "CLIMBER-001", "climb_num": 1, "start_s": 10.0, "end_s": 20.0,
               "zone": "Wall A", "tid": 1, "file_1080p": "a.mp4", "file_480p": "a480.mp4"}]
    with patch("correlate.compute_hsv_hist", return_value=_make_hist(1)):
        persons = build_person_map(clips1, [], Path("."), Path("."),
                                   iou_thresh=0.30, reid_thresh=0.50)
    assert len(persons) == 1
    assert persons[0]["match_type"] == "solo_cam1"
    assert persons[0]["cam2_climber"] is None
```

- [ ] **Step 2.2: Run tests — confirm new ones fail**

```bash
"d:/Claude - PA/projects/climbcam/venv/Scripts/python.exe" -m pytest \
  "d:/Claude - PA/projects/climbcam/scripts/tests/test_correlate.py" -v -k "hsv or person_map"
```

Expected: `ImportError: cannot import name 'compute_hsv_hist'`

- [ ] **Step 2.3: Implement `compute_hsv_hist` and `build_person_map`**

Append to `scripts/correlate.py` after the helpers section:

```python
# ── HSV appearance ────────────────────────────────────────────────────────────

def compute_hsv_hist(clip_path: Path, n_frames: int = 5) -> np.ndarray | None:
    """Sample n_frames from clip, return mean HSV 16×16×16 histogram (L1-norm) or None."""
    cap   = cv2.VideoCapture(str(clip_path))
    total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    if total == 0:
        cap.release()
        return None
    indices = [int(i * total / n_frames) for i in range(n_frames)]
    hists   = []
    for fi in indices:
        cap.set(cv2.CAP_PROP_POS_FRAMES, fi)
        ret, frame = cap.read()
        if not ret:
            continue
        hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
        h   = cv2.calcHist([hsv], [0, 1, 2], None, HSV_BINS, [0, 180, 0, 256, 0, 256])
        cv2.normalize(h, h, alpha=1, beta=0, norm_type=cv2.NORM_L1)
        hists.append(h.flatten())
    cap.release()
    return np.mean(hists, axis=0).astype(np.float32) if hists else None


# ── Correlator ────────────────────────────────────────────────────────────────

def build_person_map(clips1: list, clips2: list,
                     clips_dir1: Path, clips_dir2: Path,
                     iou_thresh: float, reid_thresh: float) -> list:
    """
    Returns list of person dicts:
      {person_id, cam1_climber, cam2_climber, confidence, match_type}
    match_type: 'dual' | 'solo_cam1' | 'solo_cam2'
    """
    windows1  = activity_window(clips1)
    windows2  = activity_window(clips2)
    climbers1 = list(windows1.keys())
    climbers2 = list(windows2.keys())
    n1, n2    = len(climbers1), len(climbers2)

    # Build HSV histograms (one per CLIMBER — first 480p clip)
    def first_hist(clips, clips_dir, cid):
        clip = next((c for c in clips if c["climber_id"] == cid), None)
        if clip is None:
            return None
        return compute_hsv_hist(clips_dir / clip["file_480p"])

    # Score matrix for Hungarian assignment
    score_matrix = np.zeros((max(n1, 1), max(n2, 1)))
    for i, c1 in enumerate(climbers1):
        for j, c2 in enumerate(climbers2):
            iou = temporal_iou(windows1[c1], windows2[c2])
            if iou < iou_thresh:
                continue
            h1 = first_hist(clips1, clips_dir1, c1)
            h2 = first_hist(clips2, clips_dir2, c2)
            if h1 is not None and h2 is not None:
                dist = cv2.compareHist(h1, h2, cv2.HISTCMP_BHATTACHARYYA)
                if dist > reid_thresh:
                    continue
                score_matrix[i, j] = iou * (1.0 - dist)
            else:
                score_matrix[i, j] = iou * 0.5  # partial confidence (no histogram)

    # Optimal 1-to-1 assignment
    row_ind, col_ind = linear_sum_assignment(-score_matrix)

    persons    = []
    matched1   = set()
    matched2   = set()
    person_num = 0

    for i, j in zip(row_ind, col_ind):
        if i >= n1 or j >= n2 or score_matrix[i, j] == 0:
            continue
        person_num += 1
        persons.append({
            "person_id":    f"REAL_{person_num:03d}",
            "cam1_climber": climbers1[i],
            "cam2_climber": climbers2[j],
            "confidence":   round(float(score_matrix[i, j]), 3),
            "match_type":   "dual",
        })
        matched1.add(i)
        matched2.add(j)

    for i, c1 in enumerate(climbers1):
        if i not in matched1:
            person_num += 1
            persons.append({
                "person_id":    f"REAL_{person_num:03d}",
                "cam1_climber": c1,
                "cam2_climber": None,
                "confidence":   1.0,
                "match_type":   "solo_cam1",
            })

    for j, c2 in enumerate(climbers2):
        if j not in matched2:
            person_num += 1
            persons.append({
                "person_id":    f"REAL_{person_num:03d}",
                "cam1_climber": None,
                "cam2_climber": c2,
                "confidence":   1.0,
                "match_type":   "solo_cam2",
            })

    return persons
```

- [ ] **Step 2.4: Run all tests — confirm pass**

```bash
"d:/Claude - PA/projects/climbcam/venv/Scripts/python.exe" -m pytest \
  "d:/Claude - PA/projects/climbcam/scripts/tests/test_correlate.py" -v
```

Expected: all tests PASS.

- [ ] **Step 2.5: Commit**

```bash
cd "d:/Claude - PA" && git add projects/climbcam/scripts/correlate.py projects/climbcam/scripts/tests/test_correlate.py && git commit -m "feat(climbcam): cross-camera correlator with HSV ReID + Hungarian assignment"
```

---

## Task 3: YOLO Scorer + Crop Region

**Files:**
- Modify: `scripts/correlate.py` — add `score_clip_and_crop`, `build_climb_events`
- Modify: `scripts/tests/test_correlate.py` — add scorer tests

- [ ] **Step 3.1: Add failing tests for scorer**

Append to `scripts/tests/test_correlate.py`:

```python
from unittest.mock import patch, MagicMock
from correlate import score_clip_and_crop, build_climb_events

def _mock_yolo_result(x1, y1, x2, y2):
    box = MagicMock()
    box.xyxy.cpu.return_value.numpy.return_value = np.array([[x1, y1, x2, y2]])
    result = MagicMock()
    result.boxes = box
    return [result]

def test_score_clip_and_crop_returns_raw_score_and_crop(tmp_path):
    mock_cap = MagicMock()
    mock_cap.get.return_value = 50
    frame = np.zeros((1080, 1920, 3), dtype=np.uint8)
    mock_cap.read.return_value = (True, frame)
    mock_model = MagicMock()
    mock_model.predict.return_value = _mock_yolo_result(500, 100, 1000, 900)
    with patch("cv2.VideoCapture", return_value=mock_cap):
        raw_score, crop = score_clip_and_crop(tmp_path / "clip.mp4", mock_model, 1920, 1080)
    assert "bbox" in raw_score
    assert "center" in raw_score
    assert "sharp" in raw_score
    assert raw_score["bbox"] > 0
    assert crop["w"] % 2 == 0
    assert crop["h"] % 2 == 0

def test_score_clip_and_crop_no_detections(tmp_path):
    mock_cap = MagicMock()
    mock_cap.get.return_value = 10
    mock_cap.read.return_value = (True, np.zeros((1080, 1920, 3), dtype=np.uint8))
    mock_model = MagicMock()
    empty_result = MagicMock()
    empty_result.boxes.xyxy.cpu.return_value.numpy.return_value = np.zeros((0, 4))
    mock_model.predict.return_value = [empty_result]
    with patch("cv2.VideoCapture", return_value=mock_cap):
        raw_score, crop = score_clip_and_crop(tmp_path / "clip.mp4", mock_model, 1920, 1080)
    assert raw_score is None
    assert crop == {"x": 0, "y": 0, "w": 1920, "h": 1080}

def test_build_climb_events_matched_picks_best():
    persons = [{
        "person_id": "REAL_001",
        "cam1_climber": "CLIMBER-001",
        "cam2_climber": "CLIMBER-003",
        "confidence": 0.85,
        "match_type": "dual",
    }]
    clips1 = [
        {"climber_id": "CLIMBER-001", "climb_num": 1, "start_s": 10.0, "end_s": 20.0,
         "zone": "Wall A", "tid": 1,
         "file_1080p": "C1_c1_1080p.mp4", "file_480p": "C1_c1_480p.mp4"},
    ]
    clips2 = [
        {"climber_id": "CLIMBER-003", "climb_num": 1, "start_s": 11.0, "end_s": 19.0,
         "zone": "Wall A", "tid": 3,
         "file_1080p": "C3_c1_1080p.mp4", "file_480p": "C3_c1_480p.mp4"},
    ]
    from pathlib import Path
    d1, d2 = Path("/cam1"), Path("/cam2")
    clip_scores = {
        str(d1 / "C1_c1_480p.mp4"): ({"bbox": 0.3, "center": 0.5, "sharp": 50.0},
                                      {"x": 0, "y": 0, "w": 1920, "h": 1080}),
        str(d2 / "C3_c1_480p.mp4"): ({"bbox": 0.6, "center": 0.8, "sharp": 100.0},
                                      {"x": 100, "y": 50, "w": 800, "h": 900}),
    }
    events = build_climb_events(persons, clips1, clips2, clip_scores,
                                iou_thresh=0.30, clips_dir1=d1, clips_dir2=d2)
    assert len(events) == 1
    event = events[0]
    assert event["person_id"] == "REAL_001"
    # cam2 has higher bbox+center+sharp → best_cam should be cam2
    assert event["best_cam"] == "cam2"
    assert event["crop"] == {"x": 100, "y": 50, "w": 800, "h": 900}
```

- [ ] **Step 3.2: Run — confirm new tests fail**

```bash
"d:/Claude - PA/projects/climbcam/venv/Scripts/python.exe" -m pytest \
  "d:/Claude - PA/projects/climbcam/scripts/tests/test_correlate.py" -v -k "score or climb_events"
```

Expected: `ImportError: cannot import name 'score_clip_and_crop'`

- [ ] **Step 3.3: Implement `score_clip_and_crop` and `build_climb_events`**

Append to `scripts/correlate.py`:

```python
# ── Scorer ────────────────────────────────────────────────────────────────────

def score_clip_and_crop(clip_path: Path, model, frame_w: int, frame_h: int) -> tuple:
    """
    Runs YOLO on all frames of clip_path (480p).
    Returns (raw_score_dict | None, crop_dict).
    raw_score_dict keys: bbox, center, sharp (unnormalized).
    """
    cap   = cv2.VideoCapture(str(clip_path))
    total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    if total == 0:
        cap.release()
        return None, {"x": 0, "y": 0, "w": frame_w, "h": frame_h}

    sample_step   = max(1, total // 30)   # ~30 frames for crop
    score_indices = set(int(i * total / 5) for i in range(5))
    # Combine so score frames are always visited even if step skips them
    visit_indices = sorted(set(range(0, total, sample_step)) | score_indices)

    bbox_sizes, centerings, sharpnesses, all_bboxes = [], [], [], []
    frame_area = frame_w * frame_h
    max_dist   = ((frame_w / 2) ** 2 + (frame_h / 2) ** 2) ** 0.5

    for fi in visit_indices:
        h, w = frame.shape[:2]
        results = model.predict(frame, imgsz=320, conf=0.3, verbose=False, classes=[0])
        if results and len(results[0].boxes.xyxy) > 0:
            boxes = results[0].boxes.xyxy.cpu().numpy()
            areas = [(b[2] - b[0]) * (b[3] - b[1]) for b in boxes]
            bx1, by1, bx2, by2 = boxes[int(np.argmax(areas))]
            all_bboxes.append((int(bx1), int(by1), int(bx2), int(by2)))
            if fi in score_indices:
                bbox_sizes.append((bx2 - bx1) * (by2 - by1) / frame_area)
                cx, cy = (bx1 + bx2) / 2, (by1 + by2) / 2
                centerings.append(1.0 - ((cx - w/2)**2 + (cy - h/2)**2)**0.5 / max_dist)
                crop_img = frame[int(by1):int(by2), int(bx1):int(bx2)]
                if crop_img.size > 0:
                    gray = cv2.cvtColor(crop_img, cv2.COLOR_BGR2GRAY)
                    sharpnesses.append(cv2.Laplacian(gray, cv2.CV_64F).var())

    cap.release()

    if not bbox_sizes:
        return None, {"x": 0, "y": 0, "w": frame_w, "h": frame_h}

    raw = {
        "bbox":   float(np.mean(bbox_sizes)),
        "center": float(np.mean(centerings)),
        "sharp":  float(np.mean(sharpnesses)) if sharpnesses else 0.0,
    }
    crop = compute_crop_rect(all_bboxes, frame_w, frame_h, margin=CROP_MARGIN)
    return raw, crop


def build_climb_events(persons: list, clips1: list, clips2: list,
                       clip_scores: dict, iou_thresh: float,
                       clips_dir1: Path = Path("."), clips_dir2: Path = Path(".")) -> list:
    """
    clip_scores: {str(full_path_480p): (raw_score | None, crop_dict)}
    Returns list of climb event dicts with best_cam, best_clip_1080p, crop, scores.
    """
    # Index clips by climber_id
    by_climber1 = defaultdict(list)
    by_climber2 = defaultdict(list)
    for c in clips1:
        by_climber1[c["climber_id"]].append(c)
    for c in clips2:
        by_climber2[c["climber_id"]].append(c)

    # Build full-path keys for score lookup (avoids filename collision between cameras)
    def key1(c): return str(clips_dir1 / c["file_480p"])
    def key2(c): return str(clips_dir2 / c["file_480p"])
    all_keys = [key1(c) for c in clips1] + [key2(c) for c in clips2]
    all_raw_ordered = [clip_scores.get(k, (None, {}))[0] for k in all_keys]
    final_scores = normalize_scores(all_raw_ordered)
    score_map = {k: v for k, v in zip(all_keys, final_scores)}

    events = []
    event_num = 0

    for person in persons:
        c1id = person["cam1_climber"]
        c2id = person["cam2_climber"]
        cam1_clips = sorted(by_climber1.get(c1id, []), key=lambda x: x["start_s"])
        cam2_clips = sorted(by_climber2.get(c2id, []), key=lambda x: x["start_s"])

        # Match individual climb clips across cameras by temporal IoU
        used2 = set()
        for clip1 in cam1_clips:
            best_iou, best_clip2 = 0.0, None
            for idx2, clip2 in enumerate(cam2_clips):
                if idx2 in used2:
                    continue
                iou = temporal_iou((clip1["start_s"], clip1["end_s"]),
                                   (clip2["start_s"], clip2["end_s"]))
                if iou > iou_thresh and iou > best_iou:
                    best_iou, best_clip2 = iou, (idx2, clip2)

            event_num += 1
            k1   = key1(clip1)
            s1   = score_map.get(k1, 0.1)
            raw1, crop1 = clip_scores.get(k1, (None, {"x":0,"y":0,"w":1920,"h":1080}))

            if best_clip2:
                idx2, clip2 = best_clip2
                used2.add(idx2)
                k2   = key2(clip2)
                s2   = score_map.get(k2, 0.1)
                raw2, crop2 = clip_scores.get(k2, (None, {"x":0,"y":0,"w":1920,"h":1080}))
                best_cam  = "cam2" if s2 > s1 else "cam1"
                best_clip = clip2 if best_cam == "cam2" else clip1
                best_crop = crop2 if best_cam == "cam2" else crop1
                events.append({
                    "event_num":      event_num,
                    "person_id":      person["person_id"],
                    "start_s":        min(clip1["start_s"], clip2["start_s"]),
                    "end_s":          max(clip1["end_s"],   clip2["end_s"]),
                    "zone":           clip1["zone"],
                    "cam1_clip":      clip1["file_480p"], "cam1_score": s1,
                    "cam2_clip":      clip2["file_480p"], "cam2_score": s2,
                    "best_cam":       best_cam,
                    "best_clip_1080p": best_clip["file_1080p"],
                    "best_clip_dir":  "cam1" if best_cam == "cam1" else "cam2",
                    "crop":           best_crop,
                })
            else:
                events.append({
                    "event_num":      event_num,
                    "person_id":      person["person_id"],
                    "start_s":        clip1["start_s"],
                    "end_s":          clip1["end_s"],
                    "zone":           clip1["zone"],
                    "cam1_clip":      clip1["file_480p"], "cam1_score": s1,
                    "cam2_clip":      None,              "cam2_score": None,
                    "best_cam":       "cam1",
                    "best_clip_1080p": clip1["file_1080p"],
                    "best_clip_dir":  "cam1",
                    "crop":           crop1,
                })

        # Unmatched cam2 clips (solo)
        for idx2, clip2 in enumerate(cam2_clips):
            if idx2 in used2:
                continue
            event_num += 1
            k2   = key2(clip2)
            s2   = score_map.get(k2, 0.1)
            _, crop2 = clip_scores.get(k2, (None, {"x":0,"y":0,"w":1920,"h":1080}))
            events.append({
                "event_num":      event_num,
                "person_id":      person["person_id"],
                "start_s":        clip2["start_s"],
                "end_s":          clip2["end_s"],
                "zone":           clip2["zone"],
                "cam1_clip":      None, "cam1_score": None,
                "cam2_clip":      clip2["file_480p"], "cam2_score": s2,
                "best_cam":       "cam2",
                "best_clip_1080p": clip2["file_1080p"],
                "best_clip_dir":  "cam2",
                "crop":           crop2,
            })

    events.sort(key=lambda e: e["start_s"])
    return events
```

- [ ] **Step 3.4: Run all tests — confirm pass**

```bash
"d:/Claude - PA/projects/climbcam/venv/Scripts/python.exe" -m pytest \
  "d:/Claude - PA/projects/climbcam/scripts/tests/test_correlate.py" -v
```

Expected: all tests PASS.

- [ ] **Step 3.5: Commit**

```bash
cd "d:/Claude - PA" && git add projects/climbcam/scripts/correlate.py projects/climbcam/scripts/tests/test_correlate.py && git commit -m "feat(climbcam): YOLO scorer + crop region + climb event builder"
```

---

## Task 4: FFmpeg Editor

**Files:**
- Modify: `scripts/correlate.py` — add `crop_and_encode`, `build_highlight_reel`
- Modify: `scripts/tests/test_correlate.py` — add editor tests

- [ ] **Step 4.1: Add failing tests for editor**

Append to `scripts/tests/test_correlate.py`:

```python
from correlate import crop_and_encode, build_highlight_reel

def test_crop_and_encode_calls_ffmpeg(tmp_path):
    src = tmp_path / "input.mp4"
    src.touch()
    dst = tmp_path / "output.mp4"
    with patch("subprocess.run") as mock_run:
        mock_run.return_value = MagicMock(returncode=0)
        result = crop_and_encode(src, dst, {"x": 0, "y": 0, "w": 1280, "h": 720})
    assert result is True
    call_args = mock_run.call_args[0][0]
    assert "ffmpeg" in call_args
    assert "crop=1280:720:0:0" in " ".join(call_args)
    assert "-crf" in call_args

def test_crop_and_encode_returns_false_on_failure(tmp_path):
    src = tmp_path / "input.mp4"
    src.touch()
    with patch("subprocess.run") as mock_run:
        mock_run.return_value = MagicMock(returncode=1)
        result = crop_and_encode(src, tmp_path / "out.mp4",
                                 {"x": 0, "y": 0, "w": 1920, "h": 1080})
    assert result is False

def test_build_highlight_reel_single_clip(tmp_path):
    src = tmp_path / "clip1.mp4"
    src.touch()
    dst = tmp_path / "reel.mp4"
    with patch("correlate.shutil.copy2") as mock_copy:
        result = build_highlight_reel([src], dst)
    assert result is True
    mock_copy.assert_called_once_with(src, dst)

def test_build_highlight_reel_multi_clip(tmp_path):
    clips = [tmp_path / f"clip{i}.mp4" for i in range(3)]
    for c in clips:
        c.touch()
    dst = tmp_path / "reel.mp4"
    with patch("subprocess.run") as mock_run:
        mock_run.return_value = MagicMock(returncode=0)
        result = build_highlight_reel(clips, dst)
    assert result is True
    call_args = mock_run.call_args[0][0]
    assert "ffmpeg" in call_args
    assert "-f" in call_args
    assert "concat" in call_args

def test_build_highlight_reel_empty(tmp_path):
    result = build_highlight_reel([], tmp_path / "reel.mp4")
    assert result is False
```

- [ ] **Step 4.2: Run — confirm fail**

```bash
"d:/Claude - PA/projects/climbcam/venv/Scripts/python.exe" -m pytest \
  "d:/Claude - PA/projects/climbcam/scripts/tests/test_correlate.py" -v -k "encode or reel"
```

Expected: `ImportError: cannot import name 'crop_and_encode'`

- [ ] **Step 4.3: Implement `crop_and_encode` and `build_highlight_reel`**

Append to `scripts/correlate.py`:

```python
# ── Editor ────────────────────────────────────────────────────────────────────

def crop_and_encode(src: Path, dst: Path, crop: dict, crf: int = CRF) -> bool:
    """Apply FFmpeg crop filter and H.264 encode. Returns True on success."""
    x, y, w, h = crop["x"], crop["y"], crop["w"], crop["h"]
    cmd = [
        "ffmpeg", "-y", "-i", str(src),
        "-vf", f"crop={w}:{h}:{x}:{y}",
        "-c:v", "libx264", "-crf", str(crf), "-preset", "fast",
        "-c:a", "copy",
        str(dst),
    ]
    result = subprocess.run(cmd, capture_output=True)
    if result.returncode != 0:
        print(f"  [warn] FFmpeg crop failed: {src.name} → {result.stderr.decode()[:200]}")
    return result.returncode == 0


def build_highlight_reel(cropped_clips: list, output_path: Path) -> bool:
    """
    Concatenate cropped clips into a highlight reel.
    Clips may have different resolutions — scale to 1280×720, letterbox.
    Returns True on success.
    """
    if not cropped_clips:
        return False
    if len(cropped_clips) == 1:
        shutil.copy2(cropped_clips[0], output_path)
        return True

    list_path = output_path.parent / f"{output_path.stem}_concat.txt"
    with open(list_path, "w") as f:
        for clip in cropped_clips:
            f.write(f"file '{clip.resolve()}'\n")

    scale_filter = ("scale=1280:720:force_original_aspect_ratio=decrease,"
                    "pad=1280:720:(ow-iw)/2:(oh-ih)/2")
    cmd = [
        "ffmpeg", "-y", "-f", "concat", "-safe", "0",
        "-i", str(list_path),
        "-vf", scale_filter,
        "-c:v", "libx264", "-crf", str(CRF), "-preset", "fast",
        "-c:a", "aac",
        str(output_path),
    ]
    result = subprocess.run(cmd, capture_output=True)
    list_path.unlink(missing_ok=True)
    if result.returncode != 0:
        print(f"  [warn] Highlight reel failed: {result.stderr.decode()[:200]}")
    return result.returncode == 0
```

- [ ] **Step 4.4: Run all tests — confirm pass**

```bash
"d:/Claude - PA/projects/climbcam/venv/Scripts/python.exe" -m pytest \
  "d:/Claude - PA/projects/climbcam/scripts/tests/test_correlate.py" -v
```

Expected: all tests PASS.

- [ ] **Step 4.5: Commit**

```bash
cd "d:/Claude - PA" && git add projects/climbcam/scripts/correlate.py projects/climbcam/scripts/tests/test_correlate.py && git commit -m "feat(climbcam): FFmpeg crop+encode and highlight reel builder"
```

---

## Task 5: viewer_multicam.html Generator

**Files:**
- Modify: `scripts/correlate.py` — add `build_viewer`
- Modify: `scripts/tests/test_correlate.py` — add viewer tests

- [ ] **Step 5.1: Add failing tests for `build_viewer`**

Append to `scripts/tests/test_correlate.py`:

```python
from correlate import build_viewer

SAMPLE_PERSONS = [
    {"person_id": "REAL_001", "cam1_climber": "CLIMBER-001", "cam2_climber": "CLIMBER-003",
     "confidence": 0.87, "match_type": "dual"},
    {"person_id": "REAL_002", "cam1_climber": "CLIMBER-005", "cam2_climber": None,
     "confidence": 1.0,  "match_type": "solo_cam1"},
]
SAMPLE_EVENTS = [
    {"event_num": 1, "person_id": "REAL_001", "start_s": 10.0, "end_s": 20.0, "zone": "Wall A",
     "cam1_clip": "c1.mp4", "cam1_score": 0.6,
     "cam2_clip": "c2.mp4", "cam2_score": 0.8,
     "best_cam": "cam2", "best_clip_1080p": "c2_1080p.mp4",
     "best_clip_dir": "cam2",
     "crop": {"x": 0, "y": 0, "w": 1280, "h": 720}},
]

def test_build_viewer_returns_html(tmp_path):
    html = build_viewer(SAMPLE_PERSONS, SAMPLE_EVENTS, "session_test")
    assert "<!DOCTYPE html>" in html
    assert "REAL_001" in html
    assert "viewer_multicam" in html.lower() or "ClimbCam" in html

def test_build_viewer_contains_person_cards(tmp_path):
    html = build_viewer(SAMPLE_PERSONS, SAMPLE_EVENTS, "session_test")
    assert "REAL_001" in html
    assert "REAL_002" in html

def test_build_viewer_dual_match_badge(tmp_path):
    html = build_viewer(SAMPLE_PERSONS, SAMPLE_EVENTS, "session_test")
    assert "dual" in html or "matched" in html.lower() or "87" in html

def test_build_viewer_summary_stats(tmp_path):
    html = build_viewer(SAMPLE_PERSONS, SAMPLE_EVENTS, "session_test")
    assert "2" in html   # 2 persons
    assert "1" in html   # 1 event
```

- [ ] **Step 5.2: Run — confirm fail**

```bash
"d:/Claude - PA/projects/climbcam/venv/Scripts/python.exe" -m pytest \
  "d:/Claude - PA/projects/climbcam/scripts/tests/test_correlate.py" -v -k "viewer"
```

Expected: `ImportError: cannot import name 'build_viewer'`

- [ ] **Step 5.3: Implement `build_viewer`**

Append to `scripts/correlate.py`:

```python
# ── Viewer ────────────────────────────────────────────────────────────────────

def build_viewer(persons: list, events: list, session_label: str) -> str:
    """Build viewer_multicam.html as a string. Dark theme, person cards with tabs."""
    n_persons   = len(persons)
    n_events    = len(events)
    n_dual      = sum(1 for p in persons if p["match_type"] == "dual")
    persons_js  = json.dumps(persons,  indent=2, ensure_ascii=False)
    events_js   = json.dumps(events,   indent=2, ensure_ascii=False)
    COLORS      = ["#1d4ed8","#7c3aed","#0f766e","#b45309","#be123c","#15803d","#c2410c"]

    return f"""<!DOCTYPE html>
<html lang="pt">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>ClimbCam — Multi-Camera Viewer</title>
<style>
*,*::before,*::after{{box-sizing:border-box;margin:0;padding:0}}
body{{background:#0f0f0f;color:#e0e0e0;font-family:system-ui,-apple-system,sans-serif}}
header{{background:#161616;border-bottom:1px solid #252525;padding:14px 24px;display:flex;align-items:center;gap:16px;flex-wrap:wrap}}
.logo{{font-size:1.1rem;font-weight:700;color:#fff}}.logo span{{color:#3b82f6}}
.stats{{font-size:.82rem;color:#666;margin-left:auto}}
.filters{{padding:14px 24px;display:flex;gap:8px;flex-wrap:wrap;border-bottom:1px solid #1a1a1a;align-items:center}}
.filters label{{font-size:.78rem;color:#555;margin-right:2px}}
.filter-btn{{background:#1a1a1a;border:1px solid #2a2a2a;color:#888;padding:5px 13px;border-radius:16px;cursor:pointer;font-size:.78rem;transition:all .15s}}
.filter-btn:hover{{background:#222;color:#ccc}}.filter-btn.active{{background:#1d4ed8;border-color:#2563eb;color:#fff}}
.persons{{display:grid;grid-template-columns:repeat(auto-fill,minmax(420px,1fr));gap:20px;padding:20px 24px 40px}}
.person-card{{background:#161616;border:1px solid #222;border-radius:12px;overflow:hidden}}
.person-card.hidden{{display:none}}
.person-header{{padding:14px 16px;border-bottom:1px solid #222;display:flex;align-items:center;gap:10px}}
.badge{{padding:3px 10px;border-radius:12px;font-size:.75rem;font-weight:700;color:#fff}}
.match-badge{{font-size:.7rem;padding:2px 8px;border-radius:8px;border:1px solid}}
.match-dual{{color:#22c55e;background:rgba(34,197,94,.1);border-color:rgba(34,197,94,.3)}}
.match-solo{{color:#f59e0b;background:rgba(245,158,11,.1);border-color:rgba(245,158,11,.3)}}
.climb-count{{font-size:.8rem;color:#555;margin-left:auto}}
.highlight-wrap{{background:#000;position:relative}}
.highlight-wrap video{{width:100%;display:block;max-height:260px;object-fit:contain}}
.cam-tabs{{display:flex;gap:4px;padding:8px 12px;background:#111;border-bottom:1px solid #1a1a1a}}
.cam-tab{{background:#1a1a1a;border:1px solid #2a2a2a;color:#666;padding:4px 12px;border-radius:6px;cursor:pointer;font-size:.75rem;transition:all .15s}}
.cam-tab:hover{{color:#aaa}}.cam-tab.active{{background:#2563eb;border-color:#2563eb;color:#fff}}
.clips-grid{{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:8px;padding:10px 12px}}
.clip-item{{background:#111;border:1px solid #1a1a1a;border-radius:8px;overflow:hidden}}
.clip-item video{{width:100%;display:block;max-height:130px;object-fit:contain;background:#000}}
.clip-meta{{padding:6px 8px;font-size:.72rem;color:#555}}
.clip-meta b{{color:#888}}
.dl-link{{color:#3b82f6;font-size:.7rem;text-decoration:none}}
.dl-link:hover{{color:#60a5fa}}
.reel-actions{{padding:10px 12px;display:flex;gap:8px}}
.btn{{padding:7px 14px;border-radius:7px;cursor:pointer;font-size:.8rem;border:none}}
.btn-primary{{background:#2563eb;color:#fff}}.btn-primary:hover{{background:#1d4ed8}}
.btn-secondary{{background:#1a1a1a;border:1px solid #2a2a2a;color:#777}}.btn-secondary:hover{{background:#222;color:#bbb}}
</style>
</head>
<body>
<header>
  <div class="logo">Climb<span>Cam</span>
    <span style="font-size:.75rem;color:#555;font-weight:400">multi-camera</span>
  </div>
  <div class="stats">
    {session_label} — {n_persons} pessoa(s) — {n_events} subida(s) — {n_dual} matched dual-cam
  </div>
</header>
<div class="filters">
  <label>Filtrar:</label>
  <button class="filter-btn active" data-filter="all" onclick="setFilter('all',this)">Todas</button>
  <button class="filter-btn" data-filter="dual" onclick="setFilter('dual',this)">Dual-cam</button>
  <button class="filter-btn" data-filter="solo" onclick="setFilter('solo',this)">Single-cam</button>
</div>
<div class="persons" id="persons"></div>
<script>
const PERSONS = {persons_js};
const EVENTS  = {events_js};
const COLORS  = {json.dumps(COLORS)};

function fmtTime(s) {{
  const m = Math.floor(s/60), sec = Math.floor(s%60);
  return String(m).padStart(2,'0') + ':' + String(sec).padStart(2,'0');
}}

function setFilter(v, btn) {{
  document.querySelectorAll('.filter-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('.person-card').forEach(card => {{
    const mt = card.dataset.matchType;
    const show = v==='all' || (v==='dual'&&mt==='dual') || (v==='solo'&&mt!=='dual');
    card.classList.toggle('hidden', !show);
  }});
}}

const eventsByPerson = {{}};
EVENTS.forEach(e => {{
  if (!eventsByPerson[e.person_id]) eventsByPerson[e.person_id] = [];
  eventsByPerson[e.person_id].push(e);
}});

const container = document.getElementById('persons');
PERSONS.forEach((p, pi) => {{
  const color    = COLORS[pi % COLORS.length];
  const events   = eventsByPerson[p.person_id] || [];
  const isDual   = p.match_type === 'dual';
  const highlight = p.person_id.replace('_','')+  '_highlight.mp4';

  const card = document.createElement('div');
  card.className = 'person-card';
  card.dataset.matchType = p.match_type;

  const badgeClass = isDual ? 'match-dual' : 'match-solo';
  const badgeText  = isDual
    ? `✓ matched ${{Math.round(p.confidence*100)}}%`
    : `single-cam (${{p.cam1_climber||p.cam2_climber}})`;

  const clipsHtml = events.map(e => {{
    const clip480  = e.best_cam==='cam1' ? e.cam1_clip : e.cam2_clip;
    const clip1080 = e.best_clip_1080p;
    const camLabel = e.best_cam.toUpperCase();
    const altClip  = e.best_cam==='cam1' ? e.cam2_clip : e.cam1_clip;
    return `<div class="clip-item">
      <video src="${{clip480||''}}" preload="metadata" onclick="this.paused?this.play():this.pause()"></video>
      <div class="clip-meta">
        #${{e.event_num}} · <b>${{fmtTime(e.start_s)}}</b> · ${{(e.end_s-e.start_s).toFixed(1)}}s
        · <span style="color:#3b82f6">${{camLabel}} ★</span>
        ${{altClip ? '<br><span style="color:#555">alt: '+e.best_cam==='cam1'?'cam2':'cam1'+'</span>' : ''}}
        <br><a class="dl-link" href="${{clip1080||''}}" download>⬇ 1080p</a>
      </div>
    </div>`;
  }}).join('');

  card.innerHTML = `
    <div class="person-header">
      <span class="badge" style="background:${{color}}">${{p.person_id}}</span>
      <span class="match-badge ${{badgeClass}}">${{badgeText}}</span>
      <span class="climb-count">${{events.length}} subida(s)</span>
    </div>
    <div class="highlight-wrap">
      <video src="${{highlight}}" preload="metadata" controls
             onclick="this.paused?this.play():this.pause()"
             style="cursor:pointer"></video>
    </div>
    <div class="reel-actions">
      <a class="btn btn-secondary" href="${{highlight}}" download>⬇ Highlight reel</a>
    </div>
    <div class="clips-grid">${{clipsHtml}}</div>`;

  container.appendChild(card);
}});
</script>
</body>
</html>"""
```

- [ ] **Step 5.4: Run all tests**

```bash
"d:/Claude - PA/projects/climbcam/venv/Scripts/python.exe" -m pytest \
  "d:/Claude - PA/projects/climbcam/scripts/tests/test_correlate.py" -v
```

Expected: all tests PASS.

- [ ] **Step 5.5: Commit**

```bash
cd "d:/Claude - PA" && git add projects/climbcam/scripts/correlate.py projects/climbcam/scripts/tests/test_correlate.py && git commit -m "feat(climbcam): viewer_multicam.html generator"
```

---

## Task 6: CLI Wiring + Main Pipeline

**Files:**
- Modify: `scripts/correlate.py` — add `main()` and `if __name__ == "__main__"`

- [ ] **Step 6.1: Implement `main()`**

Append to `scripts/correlate.py`:

```python
# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="ClimbCam — cross-camera correlator")
    parser.add_argument("--cam1",       required=True, help="Output dir de câmera 1 (tem clips_metadata.json)")
    parser.add_argument("--cam2",       required=True, help="Output dir de câmera 2")
    parser.add_argument("--out",        required=True, help="Pasta de output multicam")
    parser.add_argument("--iou-thresh", type=float, default=0.30)
    parser.add_argument("--reid-thresh",type=float, default=0.50)
    parser.add_argument("--no-score",   action="store_true", help="Salta scoring YOLO")
    args = parser.parse_args()

    cam1_dir = Path(args.cam1).resolve()
    cam2_dir = Path(args.cam2).resolve()
    out_dir  = Path(args.out).resolve()
    out_dir.mkdir(parents=True, exist_ok=True)

    # Load metadata
    with open(cam1_dir / "clips_metadata.json") as f:
        clips1 = json.load(f)
    with open(cam2_dir / "clips_metadata.json") as f:
        clips2 = json.load(f)

    print(f"Cam1: {len(clips1)} clips ({len(set(c['climber_id'] for c in clips1))} CLIMBERs)")
    print(f"Cam2: {len(clips2)} clips ({len(set(c['climber_id'] for c in clips2))} CLIMBERs)")

    # Phase 1 — Correlator
    print("\n[1/3] Correlator (temporal + HSV)...")
    persons = build_person_map(clips1, clips2, cam1_dir, cam2_dir,
                               args.iou_thresh, args.reid_thresh)
    n_dual = sum(1 for p in persons if p["match_type"] == "dual")
    print(f"  {len(persons)} pessoa(s) real(is) → {n_dual} dual-cam, "
          f"{len(persons)-n_dual} single-cam")

    # Phase 2 — Scorer
    clip_scores = {}
    if not args.no_score:
        print("\n[2/3] Scorer (YOLO)...")
        model = YOLO(MODEL_PATH)
        all_clips = [(c, cam1_dir) for c in clips1] + [(c, cam2_dir) for c in clips2]
        for clip, clip_dir in all_clips:
            path_480 = clip_dir / clip["file_480p"]
            if not path_480.exists():
                print(f"  [skip] {clip['file_480p']} não encontrado")
                clip_scores[clip["file_480p"]] = (None, {"x":0,"y":0,"w":1920,"h":1080})
                continue
            cap = cv2.VideoCapture(str(path_480))
            fw  = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            fh  = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
            cap.release()
            raw, crop = score_clip_and_crop(path_480, model, fw, fh)
            clip_scores[str(path_480)] = (raw, crop)
            status = f"score={raw}" if raw else "no detection"
            print(f"  {clip['file_480p']}: {status}")
    else:
        print("\n[2/3] Scorer saltado (--no-score)")
        full_crop = {"x": 0, "y": 0, "w": 1920, "h": 1080}
        for c in clips1:
            clip_scores[str(cam1_dir / c["file_480p"])] = ({"bbox":0.5,"center":0.5,"sharp":50.0}, full_crop)
        for c in clips2:
            clip_scores[str(cam2_dir / c["file_480p"])] = ({"bbox":0.5,"center":0.5,"sharp":50.0}, full_crop)

    # Build climb events
    events = build_climb_events(persons, clips1, clips2, clip_scores, args.iou_thresh,
                                clips_dir1=cam1_dir, clips_dir2=cam2_dir)
    print(f"\n  {len(events)} climb events")

    # Phase 3 — Editor
    print("\n[3/3] Editor (crop + highlight reels)...")

    # Map each person to their ordered cropped clips
    person_reels = defaultdict(list)
    for event in events:
        src_dir  = cam1_dir if event["best_clip_dir"] == "cam1" else cam2_dir
        src_1080 = src_dir / event["best_clip_1080p"]
        if not src_1080.exists():
            print(f"  [skip] {event['best_clip_1080p']} não encontrado")
            continue
        pid  = event["person_id"]
        enum = event["event_num"]
        dst  = out_dir / f"{pid}_climb{enum:02d}_cropped_1080p.mp4"
        ok   = crop_and_encode(src_1080, dst, event["crop"])
        if ok:
            person_reels[pid].append(dst)
            print(f"  {dst.name}  ✓")
        else:
            print(f"  {dst.name}  ✗ (FFmpeg error)")

    for person in persons:
        pid    = person["person_id"]
        clips  = person_reels[pid]
        reel   = out_dir / f"{pid}_highlight.mp4"
        ok     = build_highlight_reel(clips, reel)
        print(f"  {reel.name}: {'✓' if ok else '✗'}")

    # Save cross_camera_map.json
    cross_map = []
    for person in persons:
        p_events = [e for e in events if e["person_id"] == person["person_id"]]
        cross_map.append({**person, "climb_events": p_events})
    map_path = out_dir / "cross_camera_map.json"
    with open(map_path, "w", encoding="utf-8") as f:
        json.dump(cross_map, f, indent=2, ensure_ascii=False)
    print(f"\nMetadata: {map_path}")

    # Generate viewer
    session_label = f"{cam1_dir.parent.name}"
    html  = build_viewer(persons, events, session_label)
    viewer_path = out_dir / "viewer_multicam.html"
    viewer_path.write_text(html, encoding="utf-8")
    print(f"Viewer:   {viewer_path}")

    print(f"\n{'='*52}")
    print(f"  Pessoas:   {len(persons)}")
    print(f"  Dual-cam:  {n_dual}")
    print(f"  Eventos:   {len(events)}")
    print(f"  Output:    {out_dir}")
    print(f"{'='*52}")
    webbrowser.open(viewer_path.as_uri())


if __name__ == "__main__":
    main()
```

- [ ] **Step 6.2: Run full test suite — confirm all pass**

```bash
"d:/Claude - PA/projects/climbcam/venv/Scripts/python.exe" -m pytest \
  "d:/Claude - PA/projects/climbcam/scripts/tests/test_correlate.py" -v
```

Expected: all tests PASS.

- [ ] **Step 6.3: Commit**

```bash
cd "d:/Claude - PA" && git add projects/climbcam/scripts/correlate.py && git commit -m "feat(climbcam): CLI main() pipeline wiring"
```

---

## Task 7: Integration Run on Real Data

- [ ] **Step 7.1: Run on real data — cam1=output_constanca, cam2=output (tiago)**

```bash
"d:/Claude - PA/projects/climbcam/venv/Scripts/python.exe" \
  "d:/Claude - PA/projects/climbcam/scripts/correlate.py" \
  --cam1 "d:/Claude - PA/projects/climbcam/newclips/output_constanca" \
  --cam2 "d:/Claude - PA/projects/climbcam/newclips/output" \
  --out  "d:/Claude - PA/projects/climbcam/newclips/output_multicam"
```

Expected output:
```
Cam1: N clips (M CLIMBERs)
Cam2: N clips (M CLIMBERs)
[1/3] Correlator...
  X pessoa(s) real(is) → Y dual-cam, Z single-cam
[2/3] Scorer (YOLO)...
[3/3] Editor...
===
```

- [ ] **Step 7.2: Verify output files exist**

```bash
ls "d:/Claude - PA/projects/climbcam/newclips/output_multicam/"
```

Expected: `cross_camera_map.json`, `REAL_*_highlight.mp4` files, `viewer_multicam.html`

- [ ] **Step 7.3: Open viewer and verify visually**

Open `newclips/output_multicam/viewer_multicam.html` in browser. Check:
- Person cards render with correct IDs
- Highlight reels play (cropped/zoomed to climber zone)
- Dual-cam matches show confidence badge
- Individual clip tabs work

- [ ] **Step 7.4: Final commit**

```bash
cd "d:/Claude - PA" && git add projects/climbcam/scripts/correlate.py projects/climbcam/scripts/tests/ && git commit -m "feat(climbcam): correlate.py complete — cross-camera ReID, scorer, crop, highlight reels"
```
