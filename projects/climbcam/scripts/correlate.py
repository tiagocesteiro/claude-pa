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


# ── Scorer ────────────────────────────────────────────────────────────────────

def score_clip_and_crop(clip_path: Path, model, frame_w: int, frame_h: int) -> tuple:
    """
    Runs YOLO on frames of clip_path (480p).
    Returns (raw_score_dict | None, crop_dict).
    raw_score_dict keys: bbox, center, sharp (unnormalized).
    """
    cap   = cv2.VideoCapture(str(clip_path))
    total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    if total == 0:
        cap.release()
        return None, {"x": 0, "y": 0, "w": frame_w, "h": frame_h}

    sample_step   = max(1, total // 30)
    score_indices = set(int(i * total / 5) for i in range(5))
    visit_indices = sorted(set(range(0, total, sample_step)) | score_indices)

    bbox_sizes, centerings, sharpnesses, all_bboxes = [], [], [], []
    frame_area = frame_w * frame_h
    max_dist   = ((frame_w / 2) ** 2 + (frame_h / 2) ** 2) ** 0.5

    for fi in visit_indices:
        cap.set(cv2.CAP_PROP_POS_FRAMES, fi)
        ret, frame = cap.read()
        if not ret:
            continue
        h, w = frame.shape[:2]
        results = model.predict(frame, imgsz=320, conf=0.3, verbose=False, classes=[0])
        if results and len(results[0].boxes.xyxy.cpu().numpy()) > 0:
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
                best_crop = crop2 if best_cam == "cam2" else crop1
                events.append({
                    "event_num":       event_num,
                    "person_id":       person["person_id"],
                    "start_s":         min(clip1["start_s"], clip2["start_s"]),
                    "end_s":           max(clip1["end_s"],   clip2["end_s"]),
                    "zone":            clip1["zone"],
                    "cam1_clip":       clip1["file_480p"], "cam1_score": s1,
                    "cam2_clip":       clip2["file_480p"], "cam2_score": s2,
                    "best_cam":        best_cam,
                    "best_clip_1080p": best_clip["file_1080p"],
                    "best_clip_dir":   "cam1" if best_cam == "cam1" else "cam2",
                    "crop":            best_crop,
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


# ── Viewer ────────────────────────────────────────────────────────────────────

def build_viewer(persons: list, events: list, session_label: str) -> str:
    """Build viewer_multicam.html as a string. Dark theme, person cards."""
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
.highlight-wrap{{background:#000}}
.highlight-wrap video{{width:100%;display:block;max-height:260px;object-fit:contain}}
.clips-grid{{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:8px;padding:10px 12px}}
.clip-item{{background:#111;border:1px solid #1a1a1a;border-radius:8px;overflow:hidden}}
.clip-item video{{width:100%;display:block;max-height:130px;object-fit:contain;background:#000}}
.clip-meta{{padding:6px 8px;font-size:.72rem;color:#555}}
.clip-meta b{{color:#888}}
.dl-link{{color:#3b82f6;font-size:.7rem;text-decoration:none}}
.dl-link:hover{{color:#60a5fa}}
.reel-actions{{padding:10px 12px}}
.btn-secondary{{background:#1a1a1a;border:1px solid #2a2a2a;color:#777;padding:7px 14px;border-radius:7px;font-size:.8rem;text-decoration:none;display:inline-block}}
.btn-secondary:hover{{background:#222;color:#bbb}}
</style>
</head>
<body>
<header>
  <div class="logo">Climb<span>Cam</span>
    <span style="font-size:.75rem;color:#555;font-weight:400">multi-camera</span>
  </div>
  <div class="stats">
    {session_label} — {n_persons} pessoa(s) — {n_events} subida(s) — {n_dual} dual-cam
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
  const evts     = eventsByPerson[p.person_id] || [];
  const isDual   = p.match_type === 'dual';
  const highlight = p.person_id.replace(/_/g,'') + '_highlight.mp4';

  const card = document.createElement('div');
  card.className = 'person-card';
  card.dataset.matchType = p.match_type;

  const badgeClass = isDual ? 'match-dual' : 'match-solo';
  const badgeText  = isDual
    ? `✓ matched ${{Math.round(p.confidence*100)}}%`
    : `single-cam (${{p.cam1_climber||p.cam2_climber}})`;

  const clipsHtml = evts.map(e => {{
    const clip480  = e.best_cam==='cam1' ? e.cam1_clip : e.cam2_clip;
    const clip1080 = e.best_clip_1080p;
    const camLabel = e.best_cam.toUpperCase();
    return `<div class="clip-item">
      <video src="${{clip480||''}}" preload="metadata" onclick="this.paused?this.play():this.pause()"></video>
      <div class="clip-meta">
        #${{e.event_num}} · <b>${{fmtTime(e.start_s)}}</b> · ${{(e.end_s-e.start_s).toFixed(1)}}s
        · <span style="color:#3b82f6">${{camLabel}} ★</span>
        <br><a class="dl-link" href="${{clip1080||''}}" download>⬇ 1080p</a>
      </div>
    </div>`;
  }}).join('');

  card.innerHTML = `
    <div class="person-header">
      <span class="badge" style="background:${{color}}">${{p.person_id}}</span>
      <span class="match-badge ${{badgeClass}}">${{badgeText}}</span>
      <span class="climb-count">${{evts.length}} subida(s)</span>
    </div>
    <div class="highlight-wrap">
      <video src="${{highlight}}" preload="metadata" controls style="cursor:pointer"></video>
    </div>
    <div class="reel-actions">
      <a class="btn-secondary" href="${{highlight}}" download>⬇ Highlight reel</a>
    </div>
    <div class="clips-grid">${{clipsHtml}}</div>`;

  container.appendChild(card);
}});
</script>
</body>
</html>"""
