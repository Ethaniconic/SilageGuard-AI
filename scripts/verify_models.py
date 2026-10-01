"""
SILAGEGUARD AI — Model execution check

Proves the two models can actually run, not merely that the files exist:

  * vision  — loads mobilenetv3_silage.onnx through onnxruntime, runs a real
              forward pass, checks the output shape matches the class count
  * sensor  — walks the JSON Random Forest trees and predicts, checking the
              decision flips sensibly between good and spoiled silage

Usage:
    python scripts/verify_models.py
"""
from __future__ import annotations

import json
import os
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
VISION_DIR = ROOT / "models" / "vision"
SENSOR_DIR = ROOT / "models" / "sensor"


def _backend_python() -> str | None:
    backend_v = ROOT / "backend" / ".venv"
    candidates: list[Path] = []
    if os.name == "nt":
        candidates.extend([
            backend_v / "Scripts" / "python.exe",
            backend_v / "Scripts" / "python",
        ])
    else:
        candidates.extend([
            backend_v / "bin" / "python",
            backend_v / "bin" / "python3",
        ])
    for candidate in candidates:
        if candidate.exists():
            return str(candidate)
    return shutil.which("python") or shutil.which("python3")


def _ensure_backend_python() -> None:
    try:
        import numpy  # noqa: F401
        import onnxruntime  # noqa: F401
        return
    except ImportError:
        pass

    backend_python = _backend_python()
    if backend_python and Path(backend_python).exists() and Path(backend_python).resolve() != Path(sys.executable).resolve():
        os.execv(backend_python, [backend_python, str(Path(__file__).resolve())] + sys.argv[1:])

    print(
        "Missing model dependencies. Install with: "
        "cd backend && .venv\\Scripts\\python -m pip install -r requirements.txt",
        file=sys.stderr,
    )
    sys.exit(1)


_ensure_backend_python()

passed: list[str] = []
failed: list[str] = []


def check(label: str, ok: bool, detail: str = "") -> None:
    (passed if ok else failed).append(label)
    print(f"  {'PASS' if ok else 'FAIL'}  {label}" + (f" — {detail}" if detail and not ok else ""))


def section(t: str) -> None:
    print(f"\n{t}\n{'-' * len(t)}")


# ---------------------------------------------------------------------------
section("1. Vision model (ONNX)")


def check_vision() -> None:
    onnx_path = VISION_DIR / "mobilenetv3_silage.onnx"
    check("onnx file present", onnx_path.exists(), str(onnx_path))
    if not onnx_path.exists():
        return

    try:
        import importlib
        import numpy as np  # pyright: ignore[reportMissingImports]
        ort = importlib.import_module("onnxruntime")
    except ImportError as exc:
        check("onnxruntime + numpy importable", False, str(exc))
        return
    check("onnxruntime + numpy importable", True)

    try:
        sess = ort.InferenceSession(str(onnx_path), providers=["CPUExecutionProvider"])
    except Exception as exc:  # noqa: BLE001
        check("session loads", False, f"{type(exc).__name__}: {exc}")
        return
    check("session loads", True)

    inp = sess.get_inputs()[0]
    out = sess.get_outputs()[0]
    print(f"    input : {inp.name} {inp.shape} {inp.type}")
    print(f"    output: {out.name} {out.shape}")

    shape = [d if isinstance(d, int) else 1 for d in inp.shape]
    # The graph is NCHW (batch, channels, height, width) = [1, 3, 224, 224].
    check("input is NCHW 1x3x224x224", shape == [1, 3, 224, 224], str(shape))

    try:
        result = sess.run(None, {inp.name: np.zeros(shape, dtype=np.float32)})
    except Exception as exc:  # noqa: BLE001
        check("forward pass runs", False, f"{type(exc).__name__}: {exc}")
        return
    check("forward pass runs", True)

    probs = np.asarray(result[0])
    check("output is 3-class", probs.reshape(-1).shape[0] == 3, str(probs.shape))

    if probs.reshape(-1).shape[0] == 3:
        p = np.exp(probs.reshape(-1))
        p = p / p.sum()
        print(f"    softmax: safe={p[0]:.3f} caution={p[1]:.3f} unsafe={p[2]:.3f}")
        check("softmax sums to 1", abs(float(p.sum()) - 1.0) < 1e-4, f"{float(p.sum())}")


# ---------------------------------------------------------------------------
section("2. Sensor model (JSON Random Forest)")

def check_sensor() -> None:
    model_path = SENSOR_DIR / "sensor_rf_model.json"
    check("forest file present", model_path.exists(), str(model_path))
    if not model_path.exists():
        return

    try:
        m = json.loads(model_path.read_text(encoding="utf-8"))
    except Exception as exc:  # noqa: BLE001
        check("forest parses", False, str(exc))
        return

    for key in ("classes", "feature_names", "trees", "n_classes"):
        check(f"forest has '{key}'", key in m)

    classes = m["classes"]
    features = m["feature_names"]
    trees = m["trees"]
    check("3 classes (SAFE/CAUTION/UNSAFE)", classes == ["SAFE", "CAUTION", "UNSAFE"], str(classes))
    check("trees present", len(trees) > 0, str(len(trees)))

    def predict(vec: list[float]) -> tuple[str, list[float]]:
        acc = [0.0] * len(classes)
        for t in trees:
            i = 0
            while t["children_left"][i] != -1:
                go_left = vec[t["feature"][i]] <= t["threshold"][i]
                i = t["children_left"][i] if go_left else t["children_right"][i]
            for k, v in enumerate(t["value"][i]):
                acc[k] += v
        total = sum(acc) or 1.0
        probs = [v / total for v in acc]
        return classes[max(range(len(probs)), key=lambda k: probs[k])], probs

    def vector(**over: float) -> list[float]:
        base = {
            "ph": 4.0, "moisture_adc": 2000.0, "temperature": 28.0, "ambient": 25.0,
            "delta_temp": 3.0, "ph_dev": 0.0, "moisture_dev": 0.0, "heat_rise": 3.0,
            "storage_type": 0.0, "crop_type": 0.0, "depth_bucket": 1.0,
        }
        base.update(over)
        return [base[k] for k in features]

    try:
        good, gp = predict(vector(ph=3.9, ph_dev=-0.1))
        bad, bp = predict(
            vector(ph=5.5, ph_dev=1.5, temperature=38.0, delta_temp=12.0, heat_rise=12.0)
        )
    except Exception as exc:  # noqa: BLE001
        check("forest walks and predicts", False, f"{type(exc).__name__}: {exc}")
        return
    check("forest walks and predicts", True)

    print(f"    good silage  (pH 3.9)  -> {good}  {[round(v, 3) for v in gp]}")
    print(f"    spoiled      (pH 5.5)  -> {bad}  {[round(v, 3) for v in bp]}")

    check("good silage classified SAFE", good == "SAFE", good)
    check("spoiled silage classified UNSAFE", bad == "UNSAFE", bad)
    check("probabilities sum to 1", abs(sum(gp) - 1.0) < 1e-6 and abs(sum(bp) - 1.0) < 1e-6)


# ---------------------------------------------------------------------------
check_vision()
check_sensor()

# ---------------------------------------------------------------------------
section("3. Model metadata")
metrics_v = VISION_DIR / "vision_model_metrics.json"
metrics_s = SENSOR_DIR / "sensor_model_metrics.json"
check("vision metrics present", metrics_v.exists())
check("sensor metrics present", metrics_s.exists())
for p in (metrics_v, metrics_s):
    if p.exists():
        try:
            json.loads(p.read_text(encoding="utf-8"))
            check(f"{p.name} parses", True)
        except Exception as exc:  # noqa: BLE001
            check(f"{p.name} parses", False, str(exc))

check("model card present", (ROOT / "models" / "docs" / "MODEL_CARD.md").exists())

# ---------------------------------------------------------------------------
print(f"\n{'=' * 60}")
print(f"passed: {len(passed)}   failed: {len(failed)}")
for f in failed:
    print(f"  - {f}")
print("=" * 60)
sys.exit(1 if failed else 0)
