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
