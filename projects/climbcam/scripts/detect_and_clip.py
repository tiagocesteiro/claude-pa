"""
ClimbCam — detect_and_clip.py
Pipeline completo: 4K → zona → deteção YOLO → ReID → clips 1080p+480p → HTML viewer

O vídeo de entrada DEVE ser 4K. O YOLO corre internamente a imgsz=640 (rápido),
mas os bboxes voltam em coordenadas 4K. Clips extraídos do 4K com crop da subida.

Uso:
    python detect_and_clip.py <video_4k_path> [--output-dir <dir>]

Exemplo:
    python detect_and_clip.py newclips/camera_1_constanca_4K.mp4 --output-dir newclips/output_constanca
"""

import sys
import os
import json
import subprocess
import webbrowser
import numpy as np
import cv2
from pathlib import Path
from collections import defaultdict
from ultralytics import YOLO

# ── Config ─────────────────────────────────────────────────────────────────────
SCRIPT_DIR   = Path(__file__).parent
MODEL_PATH   = str(SCRIPT_DIR.parent / "yolov8n-pose.pt")
TRACKER_CFG  = str(SCRIPT_DIR / "bytetrack_50fps.yaml")

CONF          = 0.35
IMGSZ         = 640     # YOLO inference size; keypoints devolvidos em res original
MERGE_GAP_S   = 5.0
PRE_S         = 3.0
POST_S        = 3.0
CLIMB_FRAMES  = 3       # frames consecutivos on-wall para confirmar subida
FLOOR_MARGIN  = 0.02    # fração da altura do frame
KP_CONF_MIN   = 0.25
REID_THRESH   = 0.5     # Bhattacharyya: 0=idêntico, 1=completamente diferente
DEDUP_OVERLAP = 0.6     # fração de sobreposição para considerar track duplicado

# Keypoints COCO
LEFT_WRIST  = 9
RIGHT_WRIST = 10
LEFT_ANKLE  = 15
RIGHT_ANKLE = 16

# ── Args ───────────────────────────────────────────────────────────────────────
if len(sys.argv) < 2:
    print("Uso: python detect_and_clip.py <video_path> [--output-dir <dir>]")
    sys.exit(1)

video_path = Path(sys.argv[1]).resolve()
if not video_path.exists():
    print(f"Erro: vídeo não encontrado: {video_path}")
    sys.exit(1)

output_dir = video_path.parent / "output"
i = 2
while i < len(sys.argv):
    if sys.argv[i] == "--output-dir" and i + 1 < len(sys.argv):
        output_dir = Path(sys.argv[i + 1]).resolve()
        i += 2
    else:
        i += 1

output_dir.mkdir(parents=True, exist_ok=True)
# Zona: strip _4K do stem para compatibilidade com zones.json existentes
zone_stem  = video_path.stem.replace("_4K", "").replace("_4k", "")
zones_path = video_path.parent / (zone_stem + "_zones.json")

# ── Passo 1: Definição de zona ─────────────────────────────────────────────────
def pick_zone_simple(vid_path, out_path):
    """
    Picker via matplotlib — mais fiável no Windows com DPI scaling.
    Clica nos cantos, ENTER guarda, ESC limpa.
    """
    import matplotlib
    matplotlib.use("TkAgg")
    import matplotlib.pyplot as plt
    import matplotlib.patches as mpatches

    cap = cv2.VideoCapture(str(vid_path))
    total_f = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    cap.set(cv2.CAP_PROP_POS_FRAMES, total_f // 2)
    ret, frame = cap.read()
    cap.release()
    if not ret:
        return False

    frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    H, W = frame_rgb.shape[:2]

    fig, ax = plt.subplots(figsize=(13, 7))
    fig.patch.set_facecolor("#111")
    ax.imshow(frame_rgb)
    ax.axis("off")
    title = ax.set_title(
        "Clica nos cantos da parede  |  ENTER = guardar  |  ESC = limpar",
        color="white", fontsize=11, pad=8,
    )

    pts = []
    dots,  = ax.plot([], [], "o", color="#ff3333", ms=8, zorder=5)
    nums   = []
    poly_line, = ax.plot([], [], "-", color="#ff3333", lw=2, zorder=4)
    fill_patch = [None]

    def redraw():
        if not pts:
            dots.set_data([], [])
            poly_line.set_data([], [])
        else:
            xs, ys = zip(*pts)
            dots.set_data(xs, ys)
            if len(pts) >= 2:
                lx = list(xs) + [xs[0]]
                ly = list(ys) + [ys[0]]
                poly_line.set_data(lx, ly)
            else:
                poly_line.set_data(xs, ys)

        for t in nums:
            t.remove()
        nums.clear()
        for i, (px, py) in enumerate(pts):
            nums.append(ax.text(px + W * 0.01, py - H * 0.02, str(i + 1),
                                color="white", fontsize=9, zorder=6))

        if fill_patch[0]:
            fill_patch[0].remove()
            fill_patch[0] = None
        if len(pts) >= 3:
            patch = plt.Polygon(pts, closed=True,
                                facecolor="#ff3333", alpha=0.2,
                                edgecolor="none", zorder=3)
            ax.add_patch(patch)
            fill_patch[0] = patch

        n = len(pts)
        if n < 3:
            msg = f"Clica na parede  ({n} pontos — mínimo 3)"
            col = "#ffaa00"
        else:
            msg = f"{n} pontos  |  ENTER para guardar  |  ESC para limpar"
            col = "#44ff88"
        title.set_text(msg)
        title.set_color(col)
        fig.canvas.draw_idle()

    def on_click(event):
        if event.inaxes is ax and event.button == 1 and event.xdata is not None:
            pts.append((event.xdata, event.ydata))
            redraw()

    def on_key(event):
        if event.key == "enter" and len(pts) >= 3:
            pts_pct = [[round(p[0] / W, 4), round(p[1] / H, 4)] for p in pts]
            data = [{"name": "Wall A", "pts_pct": pts_pct, "start_s": 0, "end_s": None}]
            with open(out_path, "w") as f:
                json.dump(data, f, indent=2)
            print(f"  Zona guardada: {out_path} ({len(pts)} pontos)")
            plt.close(fig)
        elif event.key == "escape":
            pts.clear()
            redraw()
            print("  Pontos limpos — recomeça a clicar.")

    fig.canvas.mpl_connect("button_press_event", on_click)
    fig.canvas.mpl_connect("key_press_event", on_key)
    plt.tight_layout()
    plt.show()  # bloqueia até a janela fechar

    return out_path.exists() and json.loads(out_path.read_text()) != []

if not zones_path.exists() or json.loads(zones_path.read_text()) == []:
    print(f"\nSem zonas definidas em: {zones_path}")
    ok = pick_zone_simple(video_path, zones_path)
    if not ok:
        print("Erro: não foi possível abrir o vídeo para definir zona.")
        sys.exit(1)

with open(zones_path) as f:
    raw = json.load(f)

# Normaliza: wall_picker grava dict, zone_editor grava lista
if isinstance(raw, dict) and "pts_pct" in raw:
    zones = [{"name": video_path.stem, "pts_pct": raw["pts_pct"]}]
else:
    zones = raw

print(f"\nZonas: {[z['name'] for z in zones]}")

# ── Passo 2: Info do vídeo ─────────────────────────────────────────────────────
cap   = cv2.VideoCapture(str(video_path))
W     = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
H     = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
fps   = cap.get(cv2.CAP_PROP_FPS) or 25.0
total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
dur   = total / fps
cap.release()

print(f"Vídeo: {W}x{H} @ {fps:.0f}fps — {dur:.1f}s — {total} frames")

# ── Geometria de zonas ─────────────────────────────────────────────────────────
def zone_poly(zone):
    return np.array(
        [[int(p[0] * W), int(p[1] * H)] for p in zone["pts_pct"]],
        dtype=np.int32,
    )

def point_in_poly(cx, cy, poly):
    return cv2.pointPolygonTest(poly, (float(cx), float(cy)), False) >= 0

polys    = [zone_poly(z) for z in zones]
floor_ys = [int(np.max(poly[:, 1])) for poly in polys]

# ── Passo 3: Loop de deteção (headless) ────────────────────────────────────────
def new_state():
    return {
        "in_zone":           False,
        "on_wall_frames":    0,
        "climb_started":     False,
        "climb_start_frame": None,
        "climb_end_frame":   None,
        "climb_count":       0,
    }

zone_state   = defaultdict(lambda: defaultdict(new_state))
candidates   = []
track_bboxes = defaultdict(list)  # tid → [(frame_idx, bx1, by1, bx2, by2)]

model = YOLO(MODEL_PATH)
print(f"\nA detetar... (imgsz={IMGSZ}, conf={CONF}, device=cuda)\n")

frame_idx = 0
for result in model.track(
    source=str(video_path),
    stream=True,
    imgsz=IMGSZ,
    classes=[0],
    conf=CONF,
    tracker=TRACKER_CFG,
    device="cuda",
    verbose=False,
):
    frame_idx += 1
    if frame_idx % 100 == 0 or frame_idx == total:
        pct = frame_idx / total * 100
        print(f"\r  {pct:5.1f}% — frame {frame_idx}/{total}", end="", flush=True)

    if result.boxes is None or result.boxes.id is None:
        # Track perdido — reset in_zone para evitar falsos FIM
        for zi in range(len(zones)):
            for tid, st in zone_state[zi].items():
                if st["in_zone"]:
                    st["in_zone"] = False
                    st["on_wall_frames"] = 0
        continue

    boxes  = result.boxes.xyxy.cpu().numpy()
    ids    = result.boxes.id.cpu().numpy().astype(int)
    active = set(ids)
    cur_s  = frame_idx / fps

    for det_idx, (box, tid) in enumerate(zip(boxes, ids)):
        bx1, by1, bx2, by2 = map(int, box)
        cx = (bx1 + bx2) // 2
        cy = by2  # ponto base da bbox

        # Keypoints: tornozelos e pulsos
        ankle_pts, wrist_pts = [], []
        if result.keypoints is not None:
            kps_xy   = result.keypoints.xy[det_idx]
            kps_conf = result.keypoints.conf[det_idx]
            for ki in (LEFT_ANKLE, RIGHT_ANKLE):
                kc = float(kps_conf[ki])
                kx, ky = float(kps_xy[ki][0]), float(kps_xy[ki][1])
                if kc >= KP_CONF_MIN and kx > 0 and ky > 0:
                    ankle_pts.append((int(kx), int(ky)))
            for ki in (LEFT_WRIST, RIGHT_WRIST):
                kc = float(kps_conf[ki])
                kx, ky = float(kps_xy[ki][0]), float(kps_xy[ki][1])
                if kc >= KP_CONF_MIN and kx > 0 and ky > 0:
                    wrist_pts.append((int(kx), int(ky)))

        for zi, (zone, poly) in enumerate(zip(zones, polys)):
            zone_start = zone.get("start_s", 0)
            zone_end   = zone.get("end_s", None)
            if cur_s < zone_start or (zone_end is not None and cur_s > zone_end):
                continue

            st      = zone_state[zi][tid]
            floor_y = floor_ys[zi]
            thresh_y = floor_y - FLOOR_MARGIN * H

            feet_off   = any(ay < thresh_y for _, ay in ankle_pts)
            hands_on   = any(point_in_poly(wx, wy, poly) for wx, wy in wrist_pts)
            is_on_wall = feet_off and hands_on

            if point_in_poly(cx, cy, poly):
                if not st["in_zone"]:
                    st["in_zone"]        = True
                    st["on_wall_frames"] = 0

                st["on_wall_frames"] = st["on_wall_frames"] + 1 if is_on_wall else 0

                if not st["climb_started"] and st["on_wall_frames"] >= CLIMB_FRAMES:
                    st["climb_started"]     = True
                    st["climb_start_frame"] = frame_idx
                    st["climb_count"]      += 1
                    print(f"\n  [{cur_s:.1f}s] CLIMB #{st['climb_count']} — ID#{tid} '{zone['name']}'")

                if st["climb_started"]:
                    st["climb_end_frame"] = frame_idx
                    # Guarda amostras de bbox para ReID (cada 15 frames)
                    if frame_idx % 15 == 0:
                        track_bboxes[int(tid)].append((frame_idx, bx1, by1, bx2, by2))
            else:
                if st["in_zone"]:
                    st["in_zone"]        = False
                    st["on_wall_frames"] = 0
                    if st["climb_started"]:
                        ef = st["climb_end_frame"] or frame_idx
                        candidates.append({
                            "zone":        zone["name"],
                            "tid":         int(tid),
                            "start_frame": st["climb_start_frame"],
                            "end_frame":   ef,
                            "duration_s":  (ef - st["climb_start_frame"]) / fps,
                        })
                        st["climb_started"] = False

    # Track perdido: reset in_zone para tracks não vistos neste frame
    for zi in range(len(zones)):
        for tid, st in zone_state[zi].items():
            if st["in_zone"] and tid not in active:
                st["in_zone"]        = False
                st["on_wall_frames"] = 0

# Flush: escaladores ainda ativos no último frame
for zi in range(len(zones)):
    for tid, st in zone_state[zi].items():
        if st["climb_started"] and st["climb_start_frame"] is not None:
            ef = st["climb_end_frame"] or frame_idx
            candidates.append({
                "zone":        zones[zi]["name"],
                "tid":         int(tid),
                "start_frame": st["climb_start_frame"],
                "end_frame":   ef,
                "duration_s":  (ef - st["climb_start_frame"]) / fps,
            })

print(f"\n\nDeteção: {len(candidates)} candidato(s) antes de merge.")

# ── Merge ──────────────────────────────────────────────────────────────────────
def merge_candidates(cands):
    if not cands:
        return cands
    cands = sorted(cands, key=lambda c: c["start_frame"])
    merged = [dict(cands[0])]
    for c in cands[1:]:
        prev  = merged[-1]
        gap_s = (c["start_frame"] - prev["end_frame"]) / fps
        same_zone = c["zone"] == prev["zone"]
        same_tid  = c["tid"]  == prev["tid"]
        if same_zone and same_tid and gap_s <= MERGE_GAP_S:
            prev["end_frame"]  = max(prev["end_frame"], c["end_frame"])
            prev["duration_s"] = (prev["end_frame"] - prev["start_frame"]) / fps
            print(f"  [merge] gap {gap_s:.1f}s — fundiu '{prev['zone']}' ID#{prev['tid']}")
        else:
            merged.append(dict(c))
    return merged

candidates = merge_candidates(candidates)
print(f"{len(candidates)} climb(s) após merge.")

# ── Dedup: remove tracks que são sub-parte de outro (ByteTrack duplicates) ────
def dedup_candidates(cands):
    """
    Quando ByteTrack perde e recria um ID enquanto o original ainda existe,
    ficamos com dois tracks sobrepostos no tempo. Remove o mais curto.
    """
    if len(cands) <= 1:
        return cands
    # Ordena por duração, mais longos primeiro
    cands = sorted(cands, key=lambda c: c["end_frame"] - c["start_frame"], reverse=True)
    kept = []
    for c in cands:
        dup = False
        c_len = c["end_frame"] - c["start_frame"]
        for k in kept:
            overlap_s = max(0, min(c["end_frame"], k["end_frame"]) - max(c["start_frame"], k["start_frame"]))
            if c_len > 0 and overlap_s / c_len >= DEDUP_OVERLAP:
                print(f"  [dedup] ID#{c['tid']} ({c['duration_s']:.1f}s) dentro de ID#{k['tid']} ({k['duration_s']:.1f}s) → removido")
                dup = True
                break
        if not dup:
            kept.append(c)
    # Restaura ordem cronológica
    return sorted(kept, key=lambda c: c["start_frame"])

candidates = dedup_candidates(candidates)
print(f"{len(candidates)} climb(s) após dedup.\n")

if not candidates:
    print("Nenhuma subida detetada. Verifica as zonas e tenta novamente.")
    sys.exit(0)

# ── Passo 4: ReID — mesmo escalador → mesmo CLIMBER ID ────────────────────────
print("ReID: a comparar aparência entre tracks...\n")

def compute_appearance(vid_path, samples):
    """
    Lê bboxes do escalador directamente do vídeo (4K) e calcula histograma HSV.
    Os bboxes já estão em coordenadas do vid_path (4K), sem conversão de escala.
    """
    if not samples:
        return None
    cap   = cv2.VideoCapture(str(vid_path))
    hists = []
    for (fi, bx1, by1, bx2, by2) in samples[:8]:
        cap.set(cv2.CAP_PROP_POS_FRAMES, fi - 1)
        ret, frame = cap.read()
        if not ret:
            continue
        crop = frame[max(0, by1):by2, max(0, bx1):bx2]
        if crop.size == 0:
            continue
        hsv  = cv2.cvtColor(crop, cv2.COLOR_BGR2HSV)
        hist = cv2.calcHist([hsv], [0, 1, 2], None, [16, 16, 16],
                            [0, 180, 0, 256, 0, 256])
        cv2.normalize(hist, hist, alpha=1, beta=0, norm_type=cv2.NORM_L1)
        hists.append(hist.flatten())
    cap.release()
    return np.mean(hists, axis=0) if hists else None

unique_tids = list(set(c["tid"] for c in candidates))
tid_hist    = {}
for tid in unique_tids:
    h = compute_appearance(video_path, track_bboxes.get(tid, []))
    if h is not None:
        tid_hist[tid] = h
    print(f"  ID#{tid}: {len(track_bboxes.get(tid, []))} amostras "
          f"{'OK' if h is not None else '(sem crops — ID único)'}")

# Time range por track
def tid_range(tid):
    frames = [(c["start_frame"], c["end_frame"]) for c in candidates if c["tid"] == tid]
    if not frames:
        return None, None
    return min(f[0] for f in frames), max(f[1] for f in frames)

# Union-Find
parent = {tid: tid for tid in unique_tids}

def find(x):
    while parent[x] != x:
        parent[x] = parent[parent[x]]
        x = parent[x]
    return x

def union(a, b):
    parent[find(a)] = find(b)

# Compara pares com janelas temporais não sobrepostas
for i, t1 in enumerate(unique_tids):
    for t2 in unique_tids[i + 1:]:
        if t1 not in tid_hist or t2 not in tid_hist:
            continue
        s1, e1 = tid_range(t1)
        s2, e2 = tid_range(t2)
        if s1 is None or s2 is None:
            continue
        if not (e1 < s2 or e2 < s1):
            continue  # sobreposição temporal → não podem ser a mesma pessoa
        # Bhattacharyya: 0=idêntico, 1=completamente diferente
        dist = cv2.compareHist(
            tid_hist[t1].astype(np.float32),
            tid_hist[t2].astype(np.float32),
            cv2.HISTCMP_BHATTACHARYYA,
        )
        verdict = "MERGE" if dist < REID_THRESH else "diff"
        print(f"  ID#{t1} vs ID#{t2}: Bhattacharyya={dist:.3f} → {verdict}")
        if dist < REID_THRESH:
            union(t1, t2)

# Atribui CLIMBER IDs
cluster_to_climber = {}
climber_counter    = 0
tid_to_climber     = {}
for tid in unique_tids:
    root = find(tid)
    if root not in cluster_to_climber:
        climber_counter += 1
        cluster_to_climber[root] = f"CLIMBER-{climber_counter:03d}"
    tid_to_climber[tid] = cluster_to_climber[root]

print(f"\nReID: {len(unique_tids)} track(s) → {climber_counter} escalador(es) únicos")
for tid, cid in sorted(tid_to_climber.items()):
    print(f"  ID#{tid} → {cid}")

# Segundo merge: funde eventos do mesmo CLIMBER com gap < MERGE_GAP_S
def merge_by_climber(cands):
    if not cands:
        return cands
    for c in cands:
        c["climber_id"] = tid_to_climber.get(c["tid"], "CLIMBER-UNK")
    cands = sorted(cands, key=lambda c: c["start_frame"])
    merged = [dict(cands[0])]
    for c in cands[1:]:
        prev  = merged[-1]
        gap_s = (c["start_frame"] - prev["end_frame"]) / fps
        if (c["climber_id"] == prev["climber_id"]
                and c["zone"] == prev["zone"]
                and gap_s <= MERGE_GAP_S):
            prev["end_frame"]  = max(prev["end_frame"], c["end_frame"])
            prev["duration_s"] = (prev["end_frame"] - prev["start_frame"]) / fps
            print(f"  [merge2] {prev['climber_id']} gap {gap_s:.1f}s — fundiu ID#{prev['tid']}+ID#{c['tid']}")
        else:
            merged.append(dict(c))
    return merged

candidates = merge_by_climber(candidates)
print(f"{len(candidates)} climb(s) final.\n")

# ── Passo 5: Extração de clips ─────────────────────────────────────────────────
print(f"\nA extrair {len(candidates)} clip(s)...\n")

clips_meta          = []
climber_clip_count  = defaultdict(int)

for c in candidates:
    tid        = c["tid"]
    climber_id = c.get("climber_id") or tid_to_climber.get(tid, "CLIMBER-UNK")
    climber_clip_count[climber_id] += 1
    clip_num   = climber_clip_count[climber_id]

    start_s  = max(0.0, c["start_frame"] / fps - PRE_S)
    end_s    = min(dur,  c["end_frame"]   / fps + POST_S)
    clip_dur = end_s - start_s

    safe     = climber_id.replace("-", "_")
    base     = f"{safe}_climb{clip_num:02d}"
    f1080    = output_dir / f"{base}_1080p.mp4"
    f480     = output_dir / f"{base}_480p.mp4"

    # Crop da subida: union de bboxes + 20% margem + forçar 4:3
    climb_bboxes = [
        (bx1, by1, bx2, by2)
        for fi, bx1, by1, bx2, by2 in track_bboxes.get(tid, [])
        if c["start_frame"] <= fi <= c["end_frame"]
    ]
    if climb_bboxes:
        xmin = min(b[0] for b in climb_bboxes)
        ymin = min(b[1] for b in climb_bboxes)
        xmax = max(b[2] for b in climb_bboxes)
        ymax = max(b[3] for b in climb_bboxes)
        # 20% margem
        dx  = int((xmax - xmin) * 0.20)
        dy  = int((ymax - ymin) * 0.20)
        x1  = max(0, xmin - dx)
        y1  = max(0, ymin - dy)
        x2  = min(W, xmax + dx)
        y2  = min(H, ymax + dy)
        # Forçar 4:3 expandindo o lado mais estreito
        bw, bh = x2 - x1, y2 - y1
        if bh > 0 and bw / bh < 4 / 3:  # muito alto → alargar
            tw   = int(bh * 4 / 3) & ~1
            ex   = (tw - bw) // 2
            x1   = max(0, x1 - ex)
            x2   = min(W, x1 + tw)
            if x2 - x1 < tw:
                x1 = max(0, x2 - tw)
        else:                              # muito largo → aumentar altura
            th   = int(bw * 3 / 4) & ~1
            ey   = (th - bh) // 2
            y1   = max(0, y1 - ey)
            y2   = min(H, y1 + th)
            if y2 - y1 < th:
                y1 = max(0, y2 - th)
        cx1 = int(x1) & ~1
        cy1 = int(y1) & ~1
        cw  = (int(x2) - cx1) & ~1
        ch  = (int(y2) - cy1) & ~1
        vf  = f"crop={cw}:{ch}:{cx1}:{cy1},scale=1440:1080"
        print(f"  crop 4:3: ({cx1},{cy1}) {cw}×{ch}px → 1440×1080 ({len(climb_bboxes)} bboxes)")
    else:
        # Sem bboxes: recortar centro 4:3 da frame completa
        cw  = int(H * 4 / 3) & ~1
        cx1 = ((W - cw) // 2) & ~1
        vf  = f"crop={cw}:{H}:{cx1}:0,scale=1440:1080"
        print(f"  crop 4:3: sem bboxes → centro {cw}×{H}px")

    # 1080p — extrai do 4K (video_path) com crop da subida
    cmd_1080 = [
        "ffmpeg", "-y",
        "-ss", f"{start_s:.3f}",
        "-i", str(video_path),
        "-t", f"{clip_dur:.3f}",
        "-vf", vf,
        "-c:v", "libx264", "-preset", "fast", "-crf", "18",
        "-c:a", "aac",
        "-movflags", "+faststart",
        str(f1080),
    ]
    print(f"[1080p] {f1080.name}  ({start_s:.1f}s → {end_s:.1f}s, {clip_dur:.1f}s)")
    r = subprocess.run(cmd_1080, capture_output=True)
    if r.returncode != 0:
        print(f"  ERRO FFmpeg: {r.stderr.decode()[:300]}")
        continue

    # 480p preview 4:3 — gerado a partir do clip 1080p
    cmd_480 = [
        "ffmpeg", "-y",
        "-i", str(f1080),
        "-vf", "scale=640:480",
        "-c:v", "libx264", "-preset", "fast", "-crf", "28",
        "-c:a", "aac",
        "-movflags", "+faststart",
        str(f480),
    ]
    print(f"[480p]  {f480.name}")
    subprocess.run(cmd_480, capture_output=True, check=True)

    size_mb = f1080.stat().st_size / 1_048_576
    print(f"  OK — {size_mb:.1f} MB\n")

    clips_meta.append({
        "climber_id": climber_id,
        "climb_num":  clip_num,
        "zone":       c["zone"],
        "tid":        tid,
        "start_s":    round(start_s, 2),
        "end_s":      round(end_s, 2),
        "duration_s": round(clip_dur, 2),
        "file_1080p": f1080.name,
        "file_480p":  f480.name,
    })

# Guarda metadata
meta_path = output_dir / "clips_metadata.json"
with open(meta_path, "w", encoding="utf-8") as f:
    json.dump(clips_meta, f, indent=2, ensure_ascii=False)
print(f"Metadata: {meta_path}")

# ── Passo 6: Gerar viewer.html ─────────────────────────────────────────────────
print("A gerar viewer.html...")

clips_js    = json.dumps(clips_meta, indent=2, ensure_ascii=False)
video_name  = video_path.name
n_climbers  = climber_counter
n_clips     = len(clips_meta)

html = f"""<!DOCTYPE html>
<html lang="pt">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>ClimbCam Viewer</title>
<style>
*,*::before,*::after{{box-sizing:border-box;margin:0;padding:0}}
body{{background:#0f0f0f;color:#e0e0e0;font-family:system-ui,-apple-system,sans-serif;min-height:100vh}}
header{{background:#161616;border-bottom:1px solid #252525;padding:14px 24px;display:flex;align-items:center;gap:16px;flex-wrap:wrap}}
.logo{{font-size:1.1rem;font-weight:700;color:#fff;letter-spacing:.5px}}
.logo span{{color:#3b82f6}}
.stats{{font-size:.82rem;color:#666;margin-left:auto}}
.filters{{padding:14px 24px;display:flex;gap:8px;flex-wrap:wrap;align-items:center;border-bottom:1px solid #1a1a1a}}
.filters label{{font-size:.78rem;color:#555;margin-right:2px}}
.filter-btn{{background:#1a1a1a;border:1px solid #2a2a2a;color:#888;padding:5px 13px;border-radius:16px;cursor:pointer;font-size:.78rem;transition:all .15s;line-height:1.4}}
.filter-btn:hover{{background:#222;color:#ccc;border-color:#3a3a3a}}
.filter-btn.active{{background:#1d4ed8;border-color:#2563eb;color:#fff}}
.grid{{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:16px;padding:20px 24px 40px}}
.card{{background:#161616;border:1px solid #222;border-radius:10px;overflow:hidden;transition:border-color .2s,transform .1s}}
.card:hover{{border-color:#333;transform:translateY(-1px)}}
.card.hidden{{display:none}}
.video-wrap{{position:relative;background:#000;cursor:pointer}}
.card video{{width:100%;display:block;max-height:200px;object-fit:contain}}
.play-overlay{{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.3);opacity:1;transition:opacity .2s}}
.play-overlay svg{{width:48px;height:48px;fill:#fff;opacity:.85}}
.card video:not([paused]) ~ .play-overlay,
.play-overlay.playing{{opacity:0;pointer-events:none}}
.card-body{{padding:12px 14px}}
.card-header{{display:flex;align-items:center;gap:8px;margin-bottom:8px}}
.badge{{padding:3px 10px;border-radius:12px;font-size:.72rem;font-weight:700;letter-spacing:.3px;color:#fff}}
.zone-tag{{font-size:.75rem;color:#555;background:#1a1a1a;padding:2px 8px;border-radius:10px;border:1px solid #2a2a2a}}
.meta{{font-size:.78rem;color:#555;margin-bottom:10px}}
.meta b{{color:#888}}
.actions{{display:flex;gap:8px}}
.btn-play{{flex:1;background:#2563eb;border:none;color:#fff;padding:7px 10px;border-radius:7px;cursor:pointer;font-size:.8rem;transition:background .15s}}
.btn-play:hover{{background:#1d4ed8}}
.btn-dl{{background:#1a1a1a;border:1px solid #2a2a2a;color:#777;padding:7px 10px;border-radius:7px;font-size:.8rem;text-decoration:none;display:inline-flex;align-items:center;gap:4px;transition:all .15s}}
.btn-dl:hover{{background:#222;color:#bbb;border-color:#3a3a3a}}
.empty{{display:none;text-align:center;padding:80px 24px;color:#444;font-size:.95rem}}
</style>
</head>
<body>
<header>
  <div class="logo">Climb<span>Cam</span></div>
  <div class="stats" id="stats"></div>
</header>
<div class="filters">
  <label>Filtrar:</label>
  <button class="filter-btn active" data-filter="all" onclick="setFilter('all',this)">Todos</button>
</div>
<div class="grid" id="grid"></div>
<div class="empty" id="empty">Nenhum clip encontrado para este filtro.</div>

<script>
const CLIPS = {clips_js};
const VIDEO_FILE = "{video_name}";

const statsEl   = document.getElementById('stats');
const filtersEl = document.querySelector('.filters');
const gridEl    = document.getElementById('grid');
const emptyEl   = document.getElementById('empty');

let activeVideo = null;

// ── Build filter buttons ────────────────────────────────────────────────────
const climbers = [...new Set(CLIPS.map(c => c.climber_id))].sort();
climbers.forEach(cid => {{
  const btn = document.createElement('button');
  btn.className = 'filter-btn';
  btn.textContent = cid;
  btn.dataset.filter = cid;
  btn.onclick = () => setFilter(cid, btn);
  filtersEl.appendChild(btn);
}});

const totalClimbers = climbers.length;
statsEl.textContent = `${{VIDEO_FILE}} — ${{totalClimbers}} escalador(es) — ${{CLIPS.length}} clip(s)`;

// ── Filter ─────────────────────────────────────────────────────────────────
function setFilter(value, btn) {{
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  let visible = 0;
  document.querySelectorAll('.card').forEach(card => {{
    const show = value === 'all' || card.dataset.climber === value;
    card.classList.toggle('hidden', !show);
    if (show) visible++;
  }});
  emptyEl.style.display = visible === 0 ? 'block' : 'none';
  if (activeVideo) {{ activeVideo.pause(); updatePlayBtn(activeVideo); activeVideo = null; }}
}}

// ── Play/Pause ─────────────────────────────────────────────────────────────
function updatePlayBtn(video) {{
  const btn = video.closest('.card').querySelector('.btn-play');
  const overlay = video.closest('.card').querySelector('.play-overlay');
  if (video.paused) {{
    btn.textContent = '▶ Play';
    overlay.classList.remove('playing');
  }} else {{
    btn.textContent = '⏸ Pause';
    overlay.classList.add('playing');
  }}
}}

function togglePlay(video) {{
  if (activeVideo && activeVideo !== video) {{
    activeVideo.pause();
    updatePlayBtn(activeVideo);
  }}
  if (video.paused) {{
    video.play();
    activeVideo = video;
  }} else {{
    video.pause();
    if (activeVideo === video) activeVideo = null;
  }}
  updatePlayBtn(video);
}}

// ── Build cards ────────────────────────────────────────────────────────────
function fmtTime(s) {{
  const h = Math.floor(s/3600), m = Math.floor((s%3600)/60), sec = Math.floor(s%60);
  if (h > 0) return `${{h}}:${{String(m).padStart(2,'0')}}:${{String(sec).padStart(2,'0')}}`;
  return `${{String(m).padStart(2,'0')}}:${{String(sec).padStart(2,'0')}}`;
}}

const COLORS = ['#1d4ed8','#7c3aed','#0f766e','#b45309','#be123c','#15803d','#c2410c','#1e40af'];

CLIPS.forEach((c, i) => {{
  const colorIdx = climbers.indexOf(c.climber_id) % COLORS.length;
  const color = COLORS[colorIdx];
  const card = document.createElement('div');
  card.className = 'card';
  card.dataset.climber = c.climber_id;

  card.innerHTML = `
    <div class="video-wrap" onclick="togglePlay(this.querySelector('video'))">
      <video preload="metadata" src="${{c.file_480p}}" playsinline></video>
      <div class="play-overlay">
        <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
      </div>
    </div>
    <div class="card-body">
      <div class="card-header">
        <span class="badge" style="background:${{color}}">${{c.climber_id}}</span>
        <span class="zone-tag">${{c.zone}}</span>
      </div>
      <div class="meta">
        Subida #${{c.climb_num}} &nbsp;·&nbsp;
        <b>${{fmtTime(c.start_s)}}</b> &nbsp;·&nbsp;
        <b>${{c.duration_s.toFixed(1)}}s</b>
      </div>
      <div class="actions">
        <button class="btn-play" onclick="togglePlay(this.closest('.card').querySelector('video'))">▶ Play</button>
        <a class="btn-dl" href="${{c.file_1080p}}" download>⬇ 1080p</a>
      </div>
    </div>`;

  // Sync play state on video events
  const video = card.querySelector('video');
  video.addEventListener('ended', () => {{
    updatePlayBtn(video);
    if (activeVideo === video) activeVideo = null;
  }});
  video.addEventListener('pause', () => updatePlayBtn(video));
  video.addEventListener('play',  () => updatePlayBtn(video));

  gridEl.appendChild(card);
}});
</script>
</body>
</html>"""

viewer_path = output_dir / "viewer.html"
viewer_path.write_text(html, encoding="utf-8")

# ── Resumo ─────────────────────────────────────────────────────────────────────
print(f"\n{'='*50}")
print(f"  Escaladores: {n_climbers}")
print(f"  Clips:       {n_clips}")
print(f"  Output:      {output_dir}")
print(f"  Viewer:      {viewer_path}")
print(f"{'='*50}\n")
print("A abrir viewer no browser...")
webbrowser.open(viewer_path.as_uri())
