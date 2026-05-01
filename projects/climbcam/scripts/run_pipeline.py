"""
ClimbCam — run_pipeline.py
Corre o pipeline completo: detect_and_clip (cam1 + cam2) → correlate.

As câmeras gravam sempre em 4K. Os ficheiros 4K são o input primário.

Uso:
    python run_pipeline.py
    python run_pipeline.py --no-score   (salta YOLO scorer no correlator)
"""

import subprocess
import sys
from pathlib import Path

VENV    = Path(__file__).parent.parent / "venv" / "Scripts" / "python.exe"
SCRIPTS = Path(__file__).parent
BASE    = Path(__file__).parent.parent / "newclips"

# Input: sempre 4K
CAM1      = BASE / "camera_1_constanca_4K.mp4"
OUT_CAM1  = BASE / "output_constanca"

CAM2      = BASE / "camera_2_tiago_4K.mp4"
OUT_CAM2  = BASE / "output_tiago"

OUT_MULTI = BASE / "output_multicam"

no_score = "--no-score" in sys.argv


def run(label, cmd):
    print(f"\n{'='*60}")
    print(f"  {label}")
    print(f"{'='*60}\n")
    result = subprocess.run(cmd)
    if result.returncode != 0:
        print(f"\nERRO em: {label} (código {result.returncode})")
        sys.exit(result.returncode)


# ── Câmera 1 ──────────────────────────────────────────────────────────────────
if not CAM1.exists():
    print(f"Erro: {CAM1} não encontrado")
    sys.exit(1)

run("CÂMERA 1 — detect_and_clip (4K)", [
    str(VENV), str(SCRIPTS / "detect_and_clip.py"),
    str(CAM1), "--output-dir", str(OUT_CAM1),
])

# ── Câmera 2 ──────────────────────────────────────────────────────────────────
if not CAM2.exists():
    print(f"Erro: {CAM2} não encontrado")
    sys.exit(1)

run("CÂMERA 2 — detect_and_clip (4K)", [
    str(VENV), str(SCRIPTS / "detect_and_clip.py"),
    str(CAM2), "--output-dir", str(OUT_CAM2),
])

# ── Correlator ────────────────────────────────────────────────────────────────
corr_cmd = [
    str(VENV), str(SCRIPTS / "correlate.py"),
    "--cam1", str(OUT_CAM1),
    "--cam2", str(OUT_CAM2),
    "--out",  str(OUT_MULTI),
]
if no_score:
    corr_cmd.append("--no-score")

run("CORRELATOR — cross-camera ReID + clips + viewer", corr_cmd)

print(f"\n{'='*60}")
print(f"  Pipeline completo!")
print(f"  Viewer: {OUT_MULTI / 'viewer_multicam.html'}")
print(f"{'='*60}\n")
