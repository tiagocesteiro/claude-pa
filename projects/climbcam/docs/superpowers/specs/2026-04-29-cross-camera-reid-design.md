# Cross-Camera ReID & Best-Angle Editor — Design Spec
**Date:** 2026-04-29
**Project:** ClimbCam
**Status:** Approved

---

## Goal

Given two synchronized cameras filming the same climbing wall from different angles, automatically:
1. Identify which CLIMBER IDs across cameras belong to the same real person
2. Score each clip by visual quality (how well you can see the climber and route)
3. Produce a highlight reel per person using the best-angle clip for each climb event
4. Generate a unified multi-camera viewer

---

## Context & Constraints

- Both cameras are time-synchronized (timestamps directly comparable)
- Same wall, different angles, ~20% spatial overlap
- Inputs: `clips_metadata.json` from each camera output folder + saved 480p clips
- HSV histograms are NOT saved in metadata — must be recomputed from clips
- Existing ReID method: HSV 16×16×16 histogram + Bhattacharyya distance (threshold 0.5)
- Output: JSON mapping + per-person highlight reels + unified viewer

---

## Architecture

```
clips_metadata_cam1.json  ──┐
clips_metadata_cam2.json  ──┤──► 1. CORRELATOR ──► cross_camera_map.json
                             │       (temporal + HSV)
                             │
cross_camera_map.json  ──────┤──► 2. SCORER ──► quality scores per clip
                             │       (bbox + centering + sharpness)
                             │
                             └──► 3. EDITOR ──► highlight reels (FFmpeg)
                                               + viewer_multicam.html
```

Single entry point: `correlate.py --cam1 <output_dir1> --cam2 <output_dir2> --out <output_multicam_dir>`

---

## Phase 1 — Correlator

### Input
- `cam1_dir/clips_metadata.json` — metadata file; clip files (1080p + 480p) must exist in the same directory
- `cam2_dir/clips_metadata.json` — same structure

### Algorithm

**Step 1 — Build activity windows per CLIMBER:**
For each CLIMBER ID, compute its full activity window as `(min start_s, max end_s)` across all its clips.

**Step 2 — Temporal overlap candidates:**
For each pair `(C1 ∈ cam1_climbers, C2 ∈ cam2_climbers)`, compute:
```
overlap = max(0, min(C1.end, C2.end) - max(C1.start, C2.start))
union   = max(C1.end, C2.end) - min(C1.start, C2.start)
iou     = overlap / union
```
Pairs with `iou > 0.30` are candidates.

**Step 3 — HSV appearance check:**
For each candidate pair, sample 5 frames from one 480p clip per CLIMBER, compute HSV 16×16×16 histogram (L1-normalized), compare with Bhattacharyya. `dist < 0.50` → appearance match.

**Step 4 — Optimal assignment:**
Apply Hungarian algorithm across the candidate matrix (score = iou × (1 - bhattacharyya_dist)) to find globally optimal 1-to-1 assignment. CLIMBERs with no match → solo person (single camera only).

### Output — `cross_camera_map.json`
```json
[
  {
    "person_id": "REAL_001",
    "cam1_climber": "CLIMBER-003",
    "cam2_climber": "CLIMBER-007",
    "confidence": 0.87,
    "match_type": "dual"
  },
  {
    "person_id": "REAL_002",
    "cam1_climber": "CLIMBER-005",
    "cam2_climber": null,
    "confidence": 1.0,
    "match_type": "solo_cam1"
  }
]
```

---

## Phase 2 — Scorer

### Per-clip quality score

For each 480p clip, sample 5 evenly-spaced frames and run YOLO detection (imgsz=320, no tracking) to find the largest person bbox. Compute:

| Metric | Weight | Formula |
|---|---|---|
| `bbox_size` | 0.5 | `bbox_area / frame_area` |
| `centering` | 0.3 | `1 - (dist_to_center / max_possible_dist)` |
| `sharpness` | 0.2 | `laplacian_variance(bbox_crop)`, min-max normalized across all clips in the batch |

`score = 0.5 × bbox_size + 0.3 × centering + 0.2 × sharpness`

Fallback: if YOLO finds no person in any sampled frame, score = 0.1 (clip still used if no alternative).

### Per-climb-event best angle

Align climb events across cameras by temporal overlap (IoU > 0.3 on individual clip intervals, not CLIMBER windows). For matched events, the clip with higher score wins. For unmatched events, the single available clip is used.

Scores are written into `cross_camera_map.json` under each person:
```json
{
  "climb_events": [
    {
      "event_num": 1,
      "start_s": 100.0,
      "end_s": 123.0,
      "cam1_clip": "CLIMBER_003_climb02_480p.mp4", "cam1_score": 0.72,
      "cam2_clip": "CLIMBER_007_climb03_480p.mp4", "cam2_score": 0.61,
      "best_cam": "cam1",
      "best_clip_1080p": "CLIMBER_003_climb02_1080p.mp4"
    }
  ]
}
```

---

## Phase 3 — Editor

### Highlight reel
For each REAL_PERSON, collect `best_clip_1080p` paths ordered by `start_s`. Concatenate via FFmpeg `concat` demuxer (stream copy — no re-encode). Output: `REAL_001_highlight.mp4`.

### viewer_multicam.html
Static HTML, no server required. Built from template matching existing viewer style (dark theme).

Structure:
- Header: session summary (total persons, total climbs, dual-camera matches)
- Person cards, sorted by total climbs descending
  - Card header: person ID, match confidence badge, total climbs
  - Top: `<video>` player showing highlight reel
  - Below: tabs — "All cameras" | "Camera 1" | "Camera 2" — with individual clip grid
  - Filter bar: search by person ID, filter by camera coverage

### Output directory structure
```
output_multicam/
  cross_camera_map.json       ← mapping + scores
  REAL_001_highlight.mp4
  REAL_002_highlight.mp4
  ...
  viewer_multicam.html
```
Original cam1/cam2 clip directories are read-only — nothing is moved or modified.

---

## Script Interface

```bash
python correlate.py \
  --cam1 newclips/output_constanca \
  --cam2 newclips/output_tiago \
  --out  newclips/output_multicam
```

Optional flags:
- `--iou-thresh 0.30` (temporal overlap threshold)
- `--reid-thresh 0.50` (Bhattacharyya threshold)
- `--no-score` (skip YOLO scoring, use temporal-only for best angle)

---

## Error Handling

- Missing 480p clip for a CLIMBER → skip HSV step, use temporal-only match for that pair
- YOLO finds no person in scorer → fallback score 0.1
- Single-camera CLIMBERs → included as solo persons, no match attempt
- FFmpeg concat failure on a clip → log warning, skip that clip in the reel

---

## Dependencies

All already available in the existing venv:
- `opencv-python` — HSV histograms, Laplacian sharpness
- `ultralytics` — YOLO scoring pass
- `scipy` — Hungarian algorithm (`linear_sum_assignment`)
- `ffmpeg` — clip concatenation (via subprocess)
