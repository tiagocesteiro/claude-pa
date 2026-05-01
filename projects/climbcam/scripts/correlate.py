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
CROP_MARGIN = 0.20   # margem à volta da union de bboxes da subida
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

    # Pre-compute HSV histograms
    hists1 = {c: first_hist(clips1, clips_dir1, c) for c in climbers1}
    hists2 = {c: first_hist(clips2, clips_dir2, c) for c in climbers2}

    score_matrix = np.zeros((max(n1, 1), max(n2, 1)))
    for i, c1 in enumerate(climbers1):
        for j, c2 in enumerate(climbers2):
            iou = temporal_iou(windows1[c1], windows2[c2])
            if iou < iou_thresh:
                continue
            h1, h2 = hists1.get(c1), hists2.get(c2)
            if h1 is not None and h2 is not None:
                dist = cv2.compareHist(h1, h2, cv2.HISTCMP_BHATTACHARYYA)
                # HSV como score suave — não rejeita (full-frame clips não são
                # discriminativos o suficiente para cross-câmera).
                # IoU domina (60%), HSV ajusta (40%).
                hsv_factor = max(0.0, 1.0 - dist)
                score_matrix[i, j] = iou * (0.6 + 0.4 * hsv_factor)
            else:
                score_matrix[i, j] = iou * 0.6

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


# ── Scorer ────────────────────────────────────────────────────────────────────

def score_clip_and_crop(clip_path: Path, model, frame_w: int, frame_h: int,
                        segment_s: float = 3.0) -> tuple:
    """
    Runs YOLO on frames of clip_path (480p).
    Returns (raw_score_dict | None, crop_dict, segments).
    segments: [{t_start, t_end, score, crop}] per segment_s window — used for dynamic switching.
    Occlusion penalty applied when another person covers >20% of the target climber's bbox.
    """
    cap      = cv2.VideoCapture(str(clip_path))
    total    = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    fps_clip = cap.get(cv2.CAP_PROP_FPS) or 25.0
    if total == 0:
        cap.release()
        return None, {"x": 0, "y": 0, "w": frame_w, "h": frame_h}, []

    sample_step   = max(1, total // 30)
    score_indices = set(int(i * total / 5) for i in range(5))
    visit_indices = sorted(set(range(0, total, sample_step)) | score_indices)

    bbox_sizes, centerings, sharpnesses, all_bboxes = [], [], [], []
    frame_area = frame_w * frame_h
    max_dist   = ((frame_w / 2) ** 2 + (frame_h / 2) ** 2) ** 0.5

    # Per-segment accumulators: seg_idx → {bboxes, bbox_sizes, centerings, sharpnesses}
    seg_data: dict = {}

    for fi in visit_indices:
        cap.set(cv2.CAP_PROP_POS_FRAMES, fi)
        ret, frame = cap.read()
        if not ret:
            continue
        h, w = frame.shape[:2]
        results = model.predict(frame, imgsz=640, conf=0.25, verbose=False, classes=[0])
        if results and len(results[0].boxes.xyxy.cpu().numpy()) > 0:
            boxes = results[0].boxes.xyxy.cpu().numpy()
            areas = [(b[2] - b[0]) * (b[3] - b[1]) for b in boxes]
            best_idx = int(np.argmax(areas))
            bx1, by1, bx2, by2 = boxes[best_idx]
            ibbox = (int(bx1), int(by1), int(bx2), int(by2))
            all_bboxes.append(ibbox)

            # Occlusion: check if any other person covers >20% of the target bbox
            occlusion = 0.0
            target_area = max(1.0, (bx2 - bx1) * (by2 - by1))
            for k, ob in enumerate(boxes):
                if k == best_idx:
                    continue
                ox1, oy1, ox2, oy2 = ob
                ix1 = max(bx1, ox1); iy1 = max(by1, oy1)
                ix2 = min(bx2, ox2); iy2 = min(by2, oy2)
                if ix2 > ix1 and iy2 > iy1:
                    inter = (ix2 - ix1) * (iy2 - iy1)
                    occlusion = max(occlusion, inter / target_area)

            # Segment index based on frame time
            seg_idx = int((fi / fps_clip) / segment_s)
            if seg_idx not in seg_data:
                seg_data[seg_idx] = {"bboxes": [], "bbox_sizes": [], "centerings": [],
                                     "sharpnesses": [], "occlusions": []}
            seg_data[seg_idx]["bboxes"].append(ibbox)
            seg_data[seg_idx]["occlusions"].append(occlusion)

            if fi in score_indices:
                bs = (bx2 - bx1) * (by2 - by1) / frame_area
                cx, cy = (bx1 + bx2) / 2, (by1 + by2) / 2
                ce = 1.0 - ((cx - w/2)**2 + (cy - h/2)**2)**0.5 / max_dist
                # Apply occlusion penalty immediately
                occ_factor = max(0.0, 1.0 - occlusion)
                bbox_sizes.append(bs * occ_factor)
                centerings.append(ce * occ_factor)
                seg_data[seg_idx]["bbox_sizes"].append(bs * occ_factor)
                seg_data[seg_idx]["centerings"].append(ce * occ_factor)
                crop_img = frame[int(by1):int(by2), int(bx1):int(bx2)]
                if crop_img.size > 0:
                    gray = cv2.cvtColor(crop_img, cv2.COLOR_BGR2GRAY)
                    sh = cv2.Laplacian(gray, cv2.CV_64F).var() * occ_factor
                    sharpnesses.append(sh)
                    seg_data[seg_idx]["sharpnesses"].append(sh)

    cap.release()

    if not bbox_sizes:
        return None, {"x": 0, "y": 0, "w": frame_w, "h": frame_h}, []

    raw = {
        "bbox":   float(np.mean(bbox_sizes)),
        "center": float(np.mean(centerings)),
        "sharp":  float(np.mean(sharpnesses)) if sharpnesses else 0.0,
    }
    crop = compute_crop_rect(all_bboxes, frame_w, frame_h, margin=CROP_MARGIN)

    # Build per-segment list
    segments = []
    for seg_idx in sorted(seg_data.keys()):
        sd = seg_data[seg_idx]
        t_start = seg_idx * segment_s
        t_end   = t_start + segment_s
        seg_score = (
            SCORE_W["bbox"]   * float(np.mean(sd["bbox_sizes"]))   if sd["bbox_sizes"]  else 0.0 +
            SCORE_W["center"] * float(np.mean(sd["centerings"]))   if sd["centerings"]  else 0.0 +
            SCORE_W["sharp"]  * float(np.mean(sd["sharpnesses"])) if sd["sharpnesses"] else 0.0
        )
        seg_crop = compute_crop_rect(sd["bboxes"], frame_w, frame_h, margin=CROP_MARGIN)
        segments.append({"t_start": t_start, "t_end": t_end,
                         "score": round(seg_score, 4), "crop": seg_crop})

    return raw, crop, segments



def _scale_crop(crop: dict, src_w: int, src_h: int, dst_w: int, dst_h: int) -> dict:
    """Scale crop from (src_w × src_h) space to (dst_w × dst_h) space."""
    sx = dst_w / src_w
    sy = dst_h / src_h
    x  = int(crop["x"] * sx) & ~1
    y  = int(crop["y"] * sy) & ~1
    w  = min(int(crop["w"] * sx) & ~1, dst_w - x)
    h  = min(int(crop["h"] * sy) & ~1, dst_h - y)
    return {"x": max(0, x), "y": max(0, y), "w": max(2, w), "h": max(2, h)}


def _find_segment(segments: list, t: float) -> dict | None:
    """Return the segment that covers time t (clip-relative)."""
    for s in segments:
        if s["t_start"] <= t < s["t_end"]:
            return s
    return segments[-1] if segments else None


def build_edit_plan(segs1: list, segs2: list,
                    clip1_start_s: float, clip2_start_s: float,
                    clip1_dur: float, clip2_dur: float,
                    segment_s: float = 2.0) -> list:
    """
    Compare per-segment scores from two cameras and build a dynamic edit plan.
    Returns [{cam, t_start, t_end, crop_480p}] — t coords are relative to each clip's own start.
    Consecutive same-camera segments are merged.
    """
    abs_start = max(clip1_start_s, clip2_start_s)
    abs_end   = min(clip1_start_s + clip1_dur, clip2_start_s + clip2_dur)
    if abs_end <= abs_start:
        return []

    plan = []
    t = abs_start
    while t < abs_end - 0.1:
        t_end = min(t + segment_s, abs_end)
        t1    = t - clip1_start_s
        t2    = t - clip2_start_s
        seg1  = _find_segment(segs1, t1) if segs1 else None
        seg2  = _find_segment(segs2, t2) if segs2 else None
        s1    = seg1["score"] if seg1 else 0.0
        s2    = seg2["score"] if seg2 else 0.0

        if s1 >= s2:
            plan.append({"cam": "cam1", "t_start": t1,
                         "t_end": t1 + (t_end - t),
                         "crop_480p": seg1["crop"] if seg1 else {"x":0,"y":0,"w":854,"h":480}})
        else:
            plan.append({"cam": "cam2", "t_start": t2,
                         "t_end": t2 + (t_end - t),
                         "crop_480p": seg2["crop"] if seg2 else {"x":0,"y":0,"w":854,"h":480}})
        t = t_end

    # Merge consecutive same-camera segments
    merged = [plan[0]] if plan else []
    for seg in plan[1:]:
        if seg["cam"] == merged[-1]["cam"]:
            merged[-1]["t_end"] = seg["t_end"]
        else:
            merged.append(dict(seg))
    return merged


def assemble_dynamic_edit(plan: list, clip1_1080p: Path, clip2_1080p: Path,
                           output_path: Path, tmp_dir: Path) -> bool:
    """
    Cut segments from clips per edit plan and concatenate.
    -ss is placed AFTER -i for frame-accurate sync (no keyframe drift).
    Crop coords are in 480p space → scaled to actual clip dimensions.
    Output: 1440×1080 (4:3).
    """
    if not plan:
        return False

    tmp_dir.mkdir(parents=True, exist_ok=True)
    OUT_W, OUT_H = 1440, 1080

    def clip_dims(path):
        if not path or not path.exists():
            return OUT_W, OUT_H
        cap = cv2.VideoCapture(str(path))
        w   = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        h   = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        cap.release()
        return (w, h) if w > 0 else (OUT_W, OUT_H)

    dims = {
        "cam1": clip_dims(clip1_1080p),
        "cam2": clip_dims(clip2_1080p),
    }
    # 480p previews are 640×480 (4:3) for new clips, 854×480 for old
    def preview_dims(path):
        if not path or not path.exists():
            return 640, 480
        cap = cv2.VideoCapture(str(path))
        cap.release()
        return 640, 480  # correlate.py scorer always uses these dims

    segment_files = []
    scale_filter  = (f"scale={OUT_W}:{OUT_H}:force_original_aspect_ratio=decrease,"
                     f"pad={OUT_W}:{OUT_H}:(ow-iw)/2:(oh-ih)/2")

    for i, seg in enumerate(plan):
        src = clip1_1080p if seg["cam"] == "cam1" else clip2_1080p
        if not src or not src.exists():
            continue
        dst_w, dst_h = dims[seg["cam"]]
        pw,    ph    = preview_dims(src)
        crop = _scale_crop(seg["crop_480p"], pw, ph, dst_w, dst_h)
        x, y, w, h  = crop["x"], crop["y"], crop["w"], crop["h"]
        dur  = max(0.1, seg["t_end"] - seg["t_start"])
        dst  = tmp_dir / f"seg_{i:03d}.mp4"
        vf   = f"crop={w}:{h}:{x}:{y},{scale_filter}"
        # -ss AFTER -i → frame-accurate, no keyframe drift between cameras
        cmd = [
            "ffmpeg", "-y",
            "-i", str(src),
            "-ss", f"{seg['t_start']:.3f}",
            "-t",  f"{dur:.3f}",
            "-vf", vf,
            "-c:v", "libx264", "-crf", str(CRF), "-preset", "fast",
            "-c:a", "aac",
            str(dst),
        ]
        r = subprocess.run(cmd, capture_output=True)
        if r.returncode == 0:
            segment_files.append(dst)
        else:
            print(f"  [warn] seg {i}: {r.stderr.decode()[:120]}")

    if not segment_files:
        return False
    return build_highlight_reel(segment_files, output_path)


def build_climb_events(persons: list, clips1: list, clips2: list,
                       clip_scores: dict, iou_thresh: float,
                       clips_dir1: Path = Path("."), clips_dir2: Path = Path("."),
                       clip_segments: dict | None = None) -> list:
    """
    clip_scores:    {str(full_path_480p): (raw_score | None, crop_dict)}
    clip_segments:  {str(full_path_480p): [{t_start, t_end, score, crop}]} for dynamic switching
    Returns list of climb event dicts. Dual-cam events include edit_plan for dynamic switching.
    """
    by_climber1 = defaultdict(list)
    by_climber2 = defaultdict(list)
    for c in clips1:
        by_climber1[c["climber_id"]].append(c)
    for c in clips2:
        by_climber2[c["climber_id"]].append(c)

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
                alt_clip  = clip1 if best_cam == "cam2" else clip2
                best_crop = crop2 if best_cam == "cam2" else crop1

                # Build dynamic edit plan if segment data is available
                segs1 = (clip_segments or {}).get(k1, [])
                segs2 = (clip_segments or {}).get(k2, [])
                edit_plan = build_edit_plan(
                    segs1, segs2,
                    clip1["start_s"], clip2["start_s"],
                    clip1["end_s"] - clip1["start_s"],
                    clip2["end_s"] - clip2["start_s"],
                ) if (segs1 or segs2) else []

                events.append({
                    "event_num":        event_num,
                    "person_id":        person["person_id"],
                    "start_s":          min(clip1["start_s"], clip2["start_s"]),
                    "end_s":            max(clip1["end_s"],   clip2["end_s"]),
                    "zone":             clip1["zone"],
                    "cam1_clip":        clip1["file_480p"], "cam1_score": s1,
                    "cam2_clip":        clip2["file_480p"], "cam2_score": s2,
                    "best_cam":         best_cam,
                    "best_clip_1080p":  best_clip["file_1080p"],
                    "best_clip_dir":    "cam1" if best_cam == "cam1" else "cam2",
                    "alt_clip_1080p":   alt_clip["file_1080p"],
                    "alt_clip_dir":     "cam2" if best_cam == "cam1" else "cam1",
                    "crop":             best_crop,
                    "edit_plan":        edit_plan,
                })
            else:
                events.append({
                    "event_num":       event_num,
                    "person_id":       person["person_id"],
                    "start_s":         clip1["start_s"],
                    "end_s":           clip1["end_s"],
                    "zone":            clip1["zone"],
                    "cam1_clip":       clip1["file_480p"], "cam1_score": s1,
                    "cam2_clip":       None,               "cam2_score": None,
                    "best_cam":        "cam1",
                    "best_clip_1080p": clip1["file_1080p"],
                    "best_clip_dir":   "cam1",
                    "crop":            crop1,
                })

        for idx2, clip2 in enumerate(cam2_clips):
            if idx2 in used2:
                continue
            event_num += 1
            k2   = key2(clip2)
            s2   = score_map.get(k2, 0.1)
            _, crop2 = clip_scores.get(k2, (None, {"x":0,"y":0,"w":1920,"h":1080}))
            events.append({
                "event_num":       event_num,
                "person_id":       person["person_id"],
                "start_s":         clip2["start_s"],
                "end_s":           clip2["end_s"],
                "zone":            clip2["zone"],
                "cam1_clip":       None, "cam1_score": None,
                "cam2_clip":       clip2["file_480p"], "cam2_score": s2,
                "best_cam":        "cam2",
                "best_clip_1080p": clip2["file_1080p"],
                "best_clip_dir":   "cam2",
                "crop":            crop2,
            })

    events.sort(key=lambda e: e["start_s"])
    return events


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
    Clips may have different resolutions — scale to 1280x720, letterbox.
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

    scale_filter = ("scale=1440:1080:force_original_aspect_ratio=decrease,"
                    "pad=1440:1080:(ow-iw)/2:(oh-ih)/2")
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


# ── Viewer ────────────────────────────────────────────────────────────────────

def build_viewer(persons: list, events: list, session_label: str) -> str:
    """Build viewer_multicam.html. One player per person, clickable climb list."""
    n_persons  = len(persons)
    n_events   = len(events)
    n_dual     = sum(1 for p in persons if p["match_type"] == "dual")
    persons_js = json.dumps(persons, indent=2, ensure_ascii=False)
    events_js  = json.dumps(events,  indent=2, ensure_ascii=False)
    COLORS     = ["#1d4ed8","#7c3aed","#0f766e","#b45309","#be123c","#15803d","#c2410c"]

    return f"""<!DOCTYPE html>
<html lang="pt">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>ClimbCam — Sessão</title>
<style>
*,*::before,*::after{{box-sizing:border-box;margin:0;padding:0}}
body{{background:#0f0f0f;color:#e0e0e0;font-family:system-ui,-apple-system,sans-serif;font-size:14px}}
header{{background:#161616;border-bottom:1px solid #2a2a2a;padding:12px 20px;display:flex;align-items:center;gap:12px}}
.logo{{font-size:1rem;font-weight:700;color:#fff}}.logo span{{color:#3b82f6}}
.stats{{font-size:.8rem;color:#555;margin-left:auto}}
.filters{{padding:10px 20px;display:flex;gap:6px;border-bottom:1px solid #1a1a1a}}
.fbtn{{background:#1a1a1a;border:1px solid #2a2a2a;color:#777;padding:4px 12px;border-radius:14px;cursor:pointer;font-size:.75rem}}
.fbtn.active{{background:#2563eb;border-color:#2563eb;color:#fff}}
.persons{{display:grid;grid-template-columns:repeat(auto-fill,minmax(460px,1fr));gap:16px;padding:16px 20px 40px}}
.card{{background:#161616;border:1px solid #252525;border-radius:10px;overflow:hidden}}
.card.hidden{{display:none}}
.card-header{{padding:10px 14px;border-bottom:1px solid #222;display:flex;align-items:center;gap:8px}}
.pid{{padding:2px 10px;border-radius:10px;font-size:.75rem;font-weight:700;color:#fff}}
.dual{{color:#22c55e;font-size:.72rem;background:rgba(34,197,94,.1);border:1px solid rgba(34,197,94,.3);padding:2px 8px;border-radius:6px}}
.solo{{color:#f59e0b;font-size:.72rem;background:rgba(245,158,11,.1);border:1px solid rgba(245,158,11,.3);padding:2px 8px;border-radius:6px}}
.nclimbs{{font-size:.75rem;color:#444;margin-left:auto}}
.player-wrap{{background:#000;position:relative}}
.player-wrap video{{width:100%;display:block;aspect-ratio:16/9;object-fit:contain}}
.climb-list{{padding:8px 10px;display:flex;flex-wrap:wrap;gap:6px;border-top:1px solid #1e1e1e}}
.climb-row{{display:flex;align-items:center;gap:8px;padding:5px 4px;border-radius:6px}}
.climb-row:hover{{background:#1a1a1a}}
.climb-time{{font-size:.72rem;color:#666;min-width:120px}}
.angle-btns{{display:flex;gap:4px}}
.abtn{{background:#1a1a1a;border:1px solid #2a2a2a;color:#777;padding:3px 9px;border-radius:5px;cursor:pointer;font-size:.7rem;transition:all .12s}}
.abtn:hover{{background:#222;color:#ccc}}
.abtn.best{{border-color:#444;color:#aaa}}
.abtn.active{{background:#1d4ed8;border-color:#2563eb;color:#fff}}
.abtn.alt{{color:#555}}
.card-footer{{padding:8px 10px;border-top:1px solid #1e1e1e;display:flex;gap:8px;align-items:center}}
.dl{{color:#3b82f6;font-size:.72rem;text-decoration:none}}.dl:hover{{color:#60a5fa}}
.reel-lbl{{font-size:.72rem;color:#444}}
</style>
</head>
<body>
<header>
  <div class="logo">Climb<span>Cam</span></div>
  <div class="stats">{session_label} &nbsp;·&nbsp; {n_persons} pessoas &nbsp;·&nbsp; {n_events} subidas &nbsp;·&nbsp; {n_dual} dual-cam</div>
</header>
<div class="filters">
  <button class="fbtn active" onclick="filter('all',this)">Todas</button>
  <button class="fbtn" onclick="filter('dual',this)">Dual-cam</button>
  <button class="fbtn" onclick="filter('solo',this)">Single-cam</button>
</div>
<div class="persons" id="persons"></div>
<script>
const PERSONS = {persons_js};
const EVENTS  = {events_js};
const COLORS  = {json.dumps(COLORS)};

function fmtTime(s){{const m=Math.floor(s/60),sec=Math.floor(s%60);return String(m).padStart(2,'0')+':'+String(sec).padStart(2,'0');}}
function filter(v,btn){{document.querySelectorAll('.fbtn').forEach(b=>b.classList.remove('active'));btn.classList.add('active');document.querySelectorAll('.card').forEach(c=>{{const mt=c.dataset.mt;c.classList.toggle('hidden',v!=='all'&&(v==='dual'?mt!=='dual':mt==='dual'));}});}}

const byPerson={{}};
EVENTS.forEach(e=>{{if(!byPerson[e.person_id])byPerson[e.person_id]=[];byPerson[e.person_id].push(e);}});

document.getElementById('persons').innerHTML = PERSONS.map((p,pi)=>{{
  const color  = COLORS[pi%COLORS.length];
  const evts   = byPerson[p.person_id]||[];
  const reel   = `${{p.person_id}}_highlight.mp4`;
  const isDual = p.match_type==='dual';
  const badge  = isDual
    ? `<span class="dual">✓ ${{Math.round(p.confidence*100)}}% matched</span>`
    : `<span class="solo">single-cam</span>`;

  // Per climb: one row with the climb time + angle buttons
  const climbRows = evts.map((e,i)=>{{
    const num     = String(e.event_num).padStart(2,'0');
    const best    = `${{e.person_id}}_climb${{num}}_cropped_1080p.mp4`;
    const time    = `${{fmtTime(e.start_s)}} · ${{(e.end_s-e.start_s).toFixed(0)}}s`;
    const hasDyn  = e.edit_plan && e.edit_plan.length > 1;
    const nCuts   = hasDyn ? e.edit_plan.filter((s,i)=>i>0&&s.cam!==e.edit_plan[i-1].cam).length : 0;

    const bestCam = e.best_cam==='cam1' ? 'CAM1' : 'CAM2';
    const dynTag  = hasDyn ? ` <span style="font-size:.6rem;opacity:.6">${{nCuts}} cortes</span>` : '';
    const bestBtn = `<button class="abtn best${{i===0?' active':''}}" onclick="loadClip('${{p.person_id}}',this,'${{best}}')">${{bestCam}} ★${{dynTag}}</button>`;

    // Alt angle: disabled (not pre-encoded), shown greyed out
    let altBtn = '';
    if(e.alt_clip_1080p && e.cam1_clip && e.cam2_clip){{
      const altCam = e.best_cam==='cam1' ? 'CAM2' : 'CAM1';
      altBtn = `<span class="abtn alt" title="Ângulo alternativo (não editado)">${{altCam}}</span>`;
    }}

    return `<div class="climb-row${{i===0?' first':''}}">
      <span class="climb-time">#${{i+1}} &nbsp;${{time}}</span>
      <div class="angle-btns">${{bestBtn}}${{altBtn}}</div>
      <a class="dl" href="${{best}}" download title="Download">⬇</a>
    </div>`;
  }}).join('');

  const firstSrc = evts.length ? `${{evts[0].person_id}}_climb${{String(evts[0].event_num).padStart(2,'0')}}_cropped_1080p.mp4` : reel;

  return `<div class="card" data-mt="${{p.match_type}}">
    <div class="card-header">
      <span class="pid" style="background:${{color}}">${{p.person_id}}</span>
      ${{badge}}
      <span class="nclimbs">${{evts.length}} subida(s)</span>
    </div>
    <div class="player-wrap">
      <video id="v_${{p.person_id}}" src="${{firstSrc}}" controls preload="metadata"></video>
    </div>
    <div class="climb-list">${{climbRows}}</div>
    <div class="card-footer">
      <a class="dl" href="${{reel}}" download>⬇ highlight reel completo</a>
    </div>
  </div>`;
}}).join('');

function loadClip(pid, btn, src){{
  const video = document.getElementById('v_'+pid);
  const wasPlaying = !video.paused;
  video.src = src;
  video.load();
  if(wasPlaying) video.play();
  btn.closest('.card').querySelectorAll('.abtn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
}}
</script>
</body>
</html>"""


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="ClimbCam — cross-camera correlator")
    parser.add_argument("--cam1",        required=True,
                        help="Output dir de câmera 1 (contém clips_metadata.json + clips)")
    parser.add_argument("--cam2",        required=True,
                        help="Output dir de câmera 2")
    parser.add_argument("--out",         required=True,
                        help="Pasta de output multicam")
    parser.add_argument("--iou-thresh",  type=float, default=0.20)
    parser.add_argument("--reid-thresh", type=float, default=0.75)
    parser.add_argument("--no-score",    action="store_true",
                        help="Salta scoring YOLO; usa clip completo sem zoom")
    args = parser.parse_args()

    cam1_dir = Path(args.cam1).resolve()
    cam2_dir = Path(args.cam2).resolve()
    out_dir  = Path(args.out).resolve()
    out_dir.mkdir(parents=True, exist_ok=True)

    with open(cam1_dir / "clips_metadata.json") as f:
        clips1 = json.load(f)
    with open(cam2_dir / "clips_metadata.json") as f:
        clips2 = json.load(f)

    n_c1 = len(set(c["climber_id"] for c in clips1))
    n_c2 = len(set(c["climber_id"] for c in clips2))
    print(f"Cam1: {len(clips1)} clips ({n_c1} CLIMBERs)")
    print(f"Cam2: {len(clips2)} clips ({n_c2} CLIMBERs)")

    # Phase 1 — Correlator
    print("\n[1/3] Correlator (temporal + HSV)...")
    persons = build_person_map(clips1, clips2, cam1_dir, cam2_dir,
                               args.iou_thresh, args.reid_thresh)
    n_dual = sum(1 for p in persons if p["match_type"] == "dual")
    print(f"  {len(persons)} pessoa(s) → {n_dual} dual-cam, {len(persons)-n_dual} single-cam")

    # Phase 2 — Scorer
    clip_scores    = {}
    clip_segments  = {}
    if not args.no_score:
        print("\n[2/3] Scorer (YOLO)...")
        model = YOLO(MODEL_PATH)
        for clip, clip_dir in [(c, cam1_dir) for c in clips1] + [(c, cam2_dir) for c in clips2]:
            path_480 = clip_dir / clip["file_480p"]
            key      = str(path_480)
            if not path_480.exists():
                print(f"  [skip] {clip['file_480p']} não encontrado")
                clip_scores[key] = (None, {"x": 0, "y": 0, "w": 1920, "h": 1080})
                continue
            cap = cv2.VideoCapture(str(path_480))
            fw  = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            fh  = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
            cap.release()
            raw, crop, segs = score_clip_and_crop(path_480, model, fw, fh)
            clip_scores[key]   = (raw, crop)
            clip_segments[key] = segs
            n_segs = len(segs)
            if raw:
                print(f"  {clip['file_480p']}: crop=({crop['x']},{crop['y']},{crop['w']}x{crop['h']}) "
                      f"[{n_segs} seg]")
            else:
                print(f"  {clip['file_480p']}: no detection")
    else:
        print("\n[2/3] Scorer saltado (--no-score) — dynamic switching desactivado")
        full_crop = {"x": 0, "y": 0, "w": 1920, "h": 1080}
        for c in clips1:
            clip_scores[str(cam1_dir / c["file_480p"])] = ({"bbox": 0.5, "center": 0.5, "sharp": 50.0}, full_crop)
        for c in clips2:
            clip_scores[str(cam2_dir / c["file_480p"])] = ({"bbox": 0.5, "center": 0.5, "sharp": 50.0}, full_crop)

    events = build_climb_events(persons, clips1, clips2, clip_scores, args.iou_thresh,
                                clips_dir1=cam1_dir, clips_dir2=cam2_dir,
                                clip_segments=clip_segments if not args.no_score else None)
    print(f"\n  {len(events)} climb event(s)")

    # Phase 3 — Editor
    print("\n[3/3] Editor (crop + dynamic switching + highlight reels)...")
    person_reels = defaultdict(list)
    tmp_dir = out_dir / "_segments_tmp"

    for event in events:
        pid  = event["person_id"]
        enum = event["event_num"]
        dst  = out_dir / f"{pid}_climb{enum:02d}_cropped_1080p.mp4"

        edit_plan = event.get("edit_plan", [])
        has_both  = event.get("alt_clip_1080p") and event.get("cam2_clip")

        if edit_plan and has_both:
            # Dynamic angle switching
            d1 = cam1_dir if event["best_clip_dir"] == "cam1" else cam2_dir
            d2 = cam2_dir if event["alt_clip_dir"]  == "cam2" else cam1_dir
            c1 = d1 / event["best_clip_1080p"]
            c2 = d2 / event["alt_clip_1080p"]
            n_cuts = len([s for i, s in enumerate(edit_plan[1:])
                          if s["cam"] != edit_plan[i]["cam"]])
            print(f"  {dst.name}  [{len(edit_plan)} segmentos, {n_cuts} cortes]")
            ok = assemble_dynamic_edit(edit_plan, c1, c2, dst, tmp_dir / f"e{enum}")
        else:
            # Single best angle
            src_dir  = cam1_dir if event["best_clip_dir"] == "cam1" else cam2_dir
            src_1080 = src_dir / event["best_clip_1080p"]
            if not src_1080.exists():
                print(f"  [skip] {event['best_clip_1080p']} não encontrado")
                continue
            print(f"  {dst.name}  [single cam: {event['best_cam']}]")
            # Scale crop from 480p preview space to actual 1080p clip dimensions
            cap_tmp = cv2.VideoCapture(str(src_1080))
            dst_w   = int(cap_tmp.get(cv2.CAP_PROP_FRAME_WIDTH))  or 1440
            dst_h   = int(cap_tmp.get(cv2.CAP_PROP_FRAME_HEIGHT)) or 1080
            cap_tmp.release()
            crop_1080 = _scale_crop(event["crop"], 640, 480, dst_w, dst_h)
            ok = crop_and_encode(src_1080, dst, crop_1080)

        if ok:
            person_reels[pid].append(dst)
            print(f"    ✓")
        else:
            print(f"    ✗")

    for person in persons:
        pid  = person["person_id"]
        reel = out_dir / f"{pid}_highlight.mp4"
        ok   = build_highlight_reel(person_reels[pid], reel)
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
    html        = build_viewer(persons, events, cam1_dir.parent.name)
    viewer_path = out_dir / "viewer_multicam.html"
    viewer_path.write_text(html, encoding="utf-8")
    print(f"Viewer:   {viewer_path}")

    print(f"\n{'='*52}")
    print(f"  Pessoas:  {len(persons)}")
    print(f"  Dual-cam: {n_dual}")
    print(f"  Eventos:  {len(events)}")
    print(f"  Output:   {out_dir}")
    print(f"{'='*52}")
    webbrowser.open(viewer_path.as_uri())


if __name__ == "__main__":
    main()
