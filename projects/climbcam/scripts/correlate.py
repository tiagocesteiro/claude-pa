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

    def first_hist(clips, clips_dir, cid):
        clip = next((c for c in clips if c["climber_id"] == cid), None)
        if clip is None:
            return None
        return compute_hsv_hist(clips_dir / clip["file_480p"])

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
                score_matrix[i, j] = iou * 0.5

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
