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

from unittest.mock import patch, MagicMock
from correlate import compute_hsv_hist, build_person_map

def test_compute_hsv_hist_returns_array(tmp_path):
    mock_cap = MagicMock()
    mock_cap.get.return_value = 30
    mock_frame = np.zeros((480, 854, 3), dtype=np.uint8)
    mock_cap.read.return_value = (True, mock_frame)
    with patch("cv2.VideoCapture", return_value=mock_cap):
        hist = compute_hsv_hist(tmp_path / "fake.mp4", n_frames=3)
    assert hist is not None
    assert hist.shape == (16 * 16 * 16,)
    assert abs(hist.sum() - 1.0) < 1e-5

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
    clips1 = [{"climber_id": "CLIMBER-001", "climb_num": 1, "start_s": 10.0, "end_s": 20.0,
               "zone": "Wall A", "tid": 1, "file_1080p": "a.mp4", "file_480p": "a480.mp4"}]
    with patch("correlate.compute_hsv_hist", return_value=_make_hist(1)):
        persons = build_person_map(clips1, [], Path("."), Path("."),
                                   iou_thresh=0.30, reid_thresh=0.50)
    assert len(persons) == 1
    assert persons[0]["match_type"] == "solo_cam1"
    assert persons[0]["cam2_climber"] is None

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
    assert event["best_cam"] == "cam2"
    assert event["crop"] == {"x": 100, "y": 50, "w": 800, "h": 900}

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

def test_build_viewer_returns_html():
    html = build_viewer(SAMPLE_PERSONS, SAMPLE_EVENTS, "session_test")
    assert "<!DOCTYPE html>" in html
    assert "REAL_001" in html
    assert "ClimbCam" in html

def test_build_viewer_contains_person_cards():
    html = build_viewer(SAMPLE_PERSONS, SAMPLE_EVENTS, "session_test")
    assert "REAL_001" in html
    assert "REAL_002" in html

def test_build_viewer_dual_match_badge():
    html = build_viewer(SAMPLE_PERSONS, SAMPLE_EVENTS, "session_test")
    assert "dual" in html or "matched" in html.lower() or "87" in html

def test_build_viewer_summary_stats():
    html = build_viewer(SAMPLE_PERSONS, SAMPLE_EVENTS, "session_test")
    assert "session_test" in html
