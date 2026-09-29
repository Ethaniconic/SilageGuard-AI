"""
SILAGEGUARD AI — Real Multimodal AI Inference Engine
Executes real on-server edge model inference using:
  1. MobileNetV3-Small INT8 ONNX vision model on real input photographs
  2. 11-feature Random Forest sensor model on physical telemetry (pH, moisture, temperature, ambient)
  3. Continuous Multimodal Evidence Fusion (MSSI) and deterministic safety rules
"""
from __future__ import annotations

import base64
import io
import json
import time
from functools import lru_cache
from pathlib import Path
from typing import Any

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from pydantic import BaseModel
import numpy as np
from PIL import Image

router = APIRouter(tags=["inference"])

CLASS_NAMES = ["SAFE", "CAUTION", "UNSAFE"]
IMAGE_MEAN = np.array([0.485, 0.456, 0.406], dtype=np.float32)
IMAGE_STD = np.array([0.229, 0.224, 0.225], dtype=np.float32)


def _workspace_root() -> Path:
    # backend/app/routers/inference.py -> ../../.. == workspace root
    return Path(__file__).resolve().parents[3]


def _models_dir() -> Path:
    return _workspace_root() / "models"


@lru_cache(maxsize=1)
def _get_onnx_session():
    import onnxruntime as ort
    model_path = _models_dir() / "vision" / "mobilenetv3_silage.onnx"
    if not model_path.exists():
        raise FileNotFoundError(f"Vision model not found at {model_path}")
    return ort.InferenceSession(str(model_path), providers=["CPUExecutionProvider"])


@lru_cache(maxsize=1)
def _get_sensor_forest() -> dict:
    forest_path = _models_dir() / "sensor" / "sensor_rf_model.json"
    if not forest_path.exists():
        return {}
    with open(forest_path, "r", encoding="utf-8") as f:
        return json.load(f)


class VisionPayload(BaseModel):
    image_base64: str | None = None
    image_path: str | None = None
    uri: str | None = None
    demo_preset: str | None = None


class SensorPayload(BaseModel):
    ph: float | None = None
    moisture: float | None = None
    temperature: float | None = None
    ambient: float | None = None
    crop_type: str | None = None
    pit_depth_cm: int | None = None


class MultimodalPayload(BaseModel):
    image_base64: str | None = None
    image_path: str | None = None
    uri: str | None = None
    telemetry: SensorPayload | None = None
    demo_preset: str | None = None


def _load_image_from_input(
    image_base64: str | None = None,
    image_path: str | None = None,
    uri: str | None = None,
) -> Image.Image:
    raw_str = image_base64 or image_path or uri
    if not raw_str:
        raise HTTPException(
            status_code=400,
            detail="No image input provided. Provide image_base64, image_path, or uri."
        )

    # 1. Base64 data URL or pure base64 string
    if raw_str.startswith("data:image") or (len(raw_str) > 300 and "/" in raw_str and not raw_str.startswith("file:") and not raw_str.startswith("/") and not raw_str.startswith("C:") and not raw_str.startswith("E:")):
        try:
            b64_data = raw_str.split(",", 1)[1] if "," in raw_str else raw_str
            raw_bytes = base64.b64decode(b64_data)
            return Image.open(io.BytesIO(raw_bytes))
        except Exception:
            pass

    # 2. File path or file:// URI
    clean_path = raw_str.replace("file://", "").strip()
    p = Path(clean_path)
    if p.exists() and p.is_file():
        try:
            return Image.open(p)
        except Exception as exc:
            raise HTTPException(status_code=400, detail=f"Failed to open image from disk path {clean_path}: {exc}")

    # 3. Relative workspace candidate paths
    ws_root = _workspace_root()
    candidates = [
        ws_root / clean_path,
        ws_root / "mobile" / clean_path,
        ws_root / "frontend" / clean_path,
        ws_root / "datasets" / "raw" / "vision" / clean_path,
        ws_root / "mobile" / "assets" / "images" / Path(clean_path).name,
        ws_root / "frontend" / "assets" / "images" / Path(clean_path).name,
    ]
    for c in candidates:
        if c.exists() and c.is_file():
            try:
                return Image.open(c)
            except Exception as exc:
                raise HTTPException(status_code=400, detail=f"Failed to open candidate image {c}: {exc}")

    # 4. Fallback decode base64
    try:
        raw_bytes = base64.b64decode(raw_str)
        return Image.open(io.BytesIO(raw_bytes))
    except Exception:
        raise HTTPException(
            status_code=400,
            detail=f"Image could not be resolved from input: {raw_str[:80]}..."
        )


def _evaluate_image_quality(pil_img: Image.Image) -> dict[str, Any]:
    """
    Agricultural Image Quality Assessment (IQA):
    - Rejects black screen / lens covered / underexposed frames
    - Rejects whiteout / overexposed frames
    - Rejects solid monochrome / featureless blank canvases
    """
    img_gray = pil_img.convert("L")
    arr = np.array(img_gray, dtype=np.float32)
    mean_val = float(np.mean(arr))
    std_val = float(np.std(arr))

    # Black screen / camera covered / pitch dark (low mean AND low contrast)
    if (mean_val < 15.0 and std_val < 12.0) or (mean_val < 35.0 and std_val < 8.0):
        return {
            "passed": False,
            "is_dark": True,
            "is_overexposed": False,
            "is_blank": False,
            "brightness": round(mean_val, 1),
            "contrast": round(std_val, 1),
            "reason": "Image is too dark or black screen (camera covered). Please capture silage with proper lighting.",
        }

    # Whiteout / heavy overexposure
    if mean_val > 240.0 and std_val < 15.0:
        return {
            "passed": False,
            "is_dark": False,
            "is_overexposed": True,
            "is_blank": False,
            "brightness": round(mean_val, 1),
            "contrast": round(std_val, 1),
            "reason": "Image is overexposed or blank white screen. Please ensure even ambient lighting.",
        }

    # Featureless blank canvas / solid color
    if std_val < 5.0:
        return {
            "passed": False,
            "is_dark": False,
            "is_overexposed": False,
            "is_blank": True,
            "brightness": round(mean_val, 1),
            "contrast": round(std_val, 1),
            "reason": "Solid color or blank image detected. Silage forage texture is not visible.",
        }

    return {
        "passed": True,
        "is_dark": False,
        "is_overexposed": False,
        "is_blank": False,
        "brightness": round(mean_val, 1),
        "contrast": round(std_val, 1),
        "reason": "Acceptable image quality.",
    }


def _run_vision_onnx(pil_img: Image.Image) -> dict[str, Any]:
    start_time = time.perf_counter()

    # Step 1: Enforce Image Quality Assessment (IQA) gate
    iqa = _evaluate_image_quality(pil_img)
    if not iqa["passed"]:
        return {
            "prediction": "RETAKE_REQUIRED",
            "confidence": 0,
            "probabilities": {
                "safe": 0.0,
                "caution": 0.0,
                "unsafe": 0.0,
            },
            "mould_probability": 0.0,
            "iqa_passed": False,
            "iqa_report": iqa,
            "reasons": [iqa["reason"]],
            "need_retake": True,
            "latency_ms": round((time.perf_counter() - start_time) * 1000, 2),
            "model_version": "MobileNetV3-Small-INT8-v4.1",
            "disclaimer": "Rapid AI Screening Tool — Image Quality Assessment Rejection.",
        }

    session = _get_onnx_session()

    # Preprocess: resize to 224x224 RGB, ImageNet normalization
    img_rgb = pil_img.convert("RGB").resize((224, 224), Image.Resampling.BILINEAR)
    arr = np.array(img_rgb, dtype=np.float32) / 255.0
    norm = (arr - IMAGE_MEAN) / IMAGE_STD
    tensor = np.transpose(norm, (2, 0, 1))[np.newaxis, ...].astype(np.float32)

    # Execute forward pass on real ONNX model
    raw_outputs = session.run(None, {"input": tensor})
    logits = raw_outputs[0][0]

    # Numerically stable softmax
    exp = np.exp(logits - np.max(logits))
    probs = exp / np.sum(exp)

    pred_idx = int(np.argmax(probs))
    pred_class = CLASS_NAMES[pred_idx]
    confidence = int(np.clip(np.round(float(np.max(probs)) * 100), 0, 100))
    latency_ms = round((time.perf_counter() - start_time) * 1000, 2)

    return {
        "prediction": pred_class,
        "confidence": confidence,
        "probabilities": {
            "safe": round(float(probs[0]), 4),
            "caution": round(float(probs[1]), 4),
            "unsafe": round(float(probs[2]), 4),
        },
        "mould_probability": round(float(probs[2]), 4),
        "iqa_passed": True,
        "iqa_report": iqa,
        "need_retake": False,
        "latency_ms": latency_ms,
        "model_version": "MobileNetV3-Small-INT8-v4.1",
        "disclaimer": "Rapid AI Screening Tool — Not a laboratory diagnostic device.",
    }


def _run_sensor_rf(telemetry: SensorPayload) -> dict[str, Any] | None:
    if telemetry.ph is None and telemetry.moisture is None and telemetry.temperature is None:
        return None

    forest = _get_sensor_forest()
    if not forest or "trees" not in forest:
        return None

    start_time = time.perf_counter()
    ph = telemetry.ph if telemetry.ph is not None else 4.0
    moisture = telemetry.moisture if telemetry.moisture is not None else 65.0
    temp = telemetry.temperature if telemetry.temperature is not None else 25.0
    ambient = telemetry.ambient if telemetry.ambient is not None else 24.0

    # 11 features: ph, moisture_adc, temperature, ambient, delta_temp, ph_dev, moisture_dev, heat_rise, storage_type, crop_type, depth_bucket
    moisture_adc = max(1100.0, min(3300.0, 3200.0 - (moisture / 100.0) * 2000.0))
    delta_temp = temp - ambient
    ph_dev = abs(ph - 4.0)
    moisture_dev = abs(moisture - 64.0)
    heat_rise = max(0.0, delta_temp)

    feat_vec = [
        ph,
        moisture_adc,
        temp,
        ambient,
        delta_temp,
        ph_dev,
        moisture_dev,
        heat_rise,
        0.0,  # storage_type (0=Bunker)
        0.0,  # crop_type (0=Corn)
        1.0,  # depth_bucket (1=40cm)
    ]

    trees = forest["trees"]
    n_classes = forest.get("n_classes", 3)
    prob_sums = np.zeros(n_classes, dtype=np.float64)

    for tree in trees:
        node = 0
        lefts = tree["children_left"]
        rights = tree["children_right"]
        features = tree["feature"]
        thresholds = tree["threshold"]
        values = tree["value"]

        while lefts[node] != -1:
            feat_idx = features[node]
            if feat_vec[feat_idx] <= thresholds[node]:
                node = lefts[node]
            else:
                node = rights[node]

        leaf_vals = np.array(values[node], dtype=np.float64)
        total = leaf_vals.sum()
        if total > 0:
            prob_sums += leaf_vals / total

    rf_probs = prob_sums / len(trees)
    pred_idx = int(np.argmax(rf_probs))
    pred_class = CLASS_NAMES[pred_idx]
    confidence = int(np.clip(np.round(float(np.max(rf_probs)) * 100), 0, 100))
    latency_ms = round((time.perf_counter() - start_time) * 1000, 2)

    return {
        "prediction": pred_class,
        "confidence": confidence,
        "probabilities": {
            "safe": round(float(rf_probs[0]), 4),
            "caution": round(float(rf_probs[1]), 4),
            "unsafe": round(float(rf_probs[2]), 4),
        },
        "latency_ms": latency_ms,
    }


@router.post("/vision")
async def predict_vision(payload: VisionPayload):
    """
    Run real MobileNetV3-Small ONNX inference on a base64 encoded silage photograph,
    local image path, or asset URI.
    Returns real prediction, class probabilities, mould probability, and measured latency.
    """
    pil_img = _load_image_from_input(
        image_base64=payload.image_base64,
        image_path=payload.image_path,
        uri=payload.uri,
    )
    return _run_vision_onnx(pil_img)


@router.post("/vision/upload")
async def predict_vision_upload(file: UploadFile = File(...)):
    """
    Multipart file upload endpoint for real vision model inference on uploaded images.
    """
    try:
        contents = await file.read()
        pil_img = Image.open(io.BytesIO(contents))
        return _run_vision_onnx(pil_img)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Could not read uploaded image: {exc}")


@router.post("/sensor")
async def predict_sensor(payload: SensorPayload):
    """
    Run real 11-feature Random Forest inference on physical probe telemetry.
    Returns real prediction, class probabilities, confidence, and measured latency.
    """
    res = _run_sensor_rf(payload)
    if res is None:
        raise HTTPException(
            status_code=400,
            detail="Sensor telemetry is empty or probe is disconnected."
        )
    return res


@router.post("/predict")
async def predict_multimodal(payload: MultimodalPayload):
    """
    Full Multimodal AI Inference Pipeline.
    Runs ONNX vision model on photo and Random Forest on physical probe telemetry.
    If probe telemetry is disconnected/omitted, executes honest Vision-Only screening without fake sensor latencies.
    """
    start_total = time.perf_counter()

    vision_res = None
    if payload.image_base64 or payload.image_path or payload.uri:
        pil_img = _load_image_from_input(
            image_base64=payload.image_base64,
            image_path=payload.image_path,
            uri=payload.uri,
        )
        vision_res = _run_vision_onnx(pil_img)

    sensor_res = None
    if payload.telemetry:
        sensor_res = _run_sensor_rf(payload.telemetry)

    # Determine modality state honestly
    has_sensor = sensor_res is not None
    has_vision = vision_res is not None

    if not has_sensor and not has_vision:
        raise HTTPException(status_code=400, detail="At least one modality (image or probe sensor) must be supplied.")

    # Image Quality Assessment Gate: If photo failed IQA (e.g. black screen), reject immediately
    if has_vision and vision_res.get("need_retake"):
        modality_state = "MULTIMODAL" if has_sensor else "VISION_ONLY"
        return {
            "decision": "RETAKE_REQUIRED",
            "mssi_score": 0,
            "confidence": 0,
            "need_retake": True,
            "modality_state": modality_state,
            "vision_result": vision_res,
            "sensor_result": sensor_res,
            "total_latency_ms": round((time.perf_counter() - start_total) * 1000, 2),
            "reasons": vision_res.get("reasons", ["Silage photo failed quality check (black screen or covered lens)."]),
            "disclaimer": "Rapid AI Screening Tool — Image Quality Assessment Rejection.",
        }

    if has_sensor and has_vision:
        modality_state = "MULTIMODAL"
        s_score = int(round(sensor_res["probabilities"]["safe"] * 100 + sensor_res["probabilities"]["caution"] * 50))
        v_score = int(round(vision_res["probabilities"]["safe"] * 100 + vision_res["probabilities"]["caution"] * 50))
        fusion_score = int(np.clip(round(0.55 * s_score + 0.45 * v_score), 0, 100))
        confidence = int(np.clip(round(0.55 * sensor_res["confidence"] + 0.45 * vision_res["confidence"]), 0, 100))
        total_latency_ms = round((time.perf_counter() - start_total) * 1000, 2)
        if vision_res["prediction"] == "UNSAFE" or sensor_res["prediction"] == "UNSAFE":
            decision = "UNSAFE"
        elif fusion_score >= 72 and vision_res["prediction"] == "SAFE" and sensor_res["prediction"] == "SAFE":
            decision = "SAFE"
        else:
            decision = "CAUTION"
    elif has_sensor:
        modality_state = "SENSOR_ONLY"
        fusion_score = int(round(sensor_res["probabilities"]["safe"] * 100 + sensor_res["probabilities"]["caution"] * 50))
        confidence = int(sensor_res["confidence"])
        total_latency_ms = sensor_res["latency_ms"]
        decision = sensor_res["prediction"]
    else:
        modality_state = "VISION_ONLY"
        v_probs = vision_res["probabilities"]
        fusion_score = int(round(v_probs["safe"] * 100 + v_probs["caution"] * 50))
        confidence = int(vision_res["confidence"])
        total_latency_ms = vision_res["latency_ms"]
        decision = vision_res["prediction"]

    return {
        "decision": decision,
        "mssi_score": fusion_score,
        "confidence": confidence,
        "need_retake": False,
        "modality_state": modality_state,
        "vision_result": vision_res,
        "sensor_result": sensor_res,
        "total_latency_ms": total_latency_ms,
        "disclaimer": "Rapid AI Screening Tool — Not a laboratory diagnostic device.",
    }
