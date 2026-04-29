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
