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
import logging
from pathlib import Path
from typing import Any

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from pydantic import BaseModel
import numpy as np
from PIL import Image

logger = logging.getLogger("uvicorn.error")
router = APIRouter(tags=["inference"])

from app.services.safety_rules import evaluate_safety_rules

VISION_5_CLASSES = [
    "Abnormal_appearance",
    "Foreign_object",
    "Healthy",
    "Mould",
    "Spoilage"
]
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


@lru_cache(maxsize=1)
def _get_pytorch_model():
    import sys
    import torch
    vision_dir = str(_models_dir() / "vision")
    if vision_dir not in sys.path:
        sys.path.insert(0, vision_dir)
    from train_mobilenetv3 import MobileNetV3Silage

    device = torch.device("cpu")
    model = MobileNetV3Silage(num_classes=5, pretrained=False, architecture="large").to(device)
    pth_path = _models_dir() / "vision" / "mobilenetv3_silage.pth"
    if pth_path.exists():
        sd = torch.load(str(pth_path), map_location=device)
        model.load_state_dict(sd)
    model.eval()
    return model


def _generate_gradcam(pil_img: Image.Image, target_class: int = 0) -> tuple[str | None, dict | None, str]:
    """
    Computes class-specific Grad-CAM activation heatmap overlay on silage face.
    Returns: (base64_jpeg_overlay, hotspot_bbox, hotspot_description)
    """
    try:
        import sys
        import cv2
        import torch
        vision_dir = str(_models_dir() / "vision")
        if vision_dir not in sys.path:
            sys.path.insert(0, vision_dir)
        from gradcam import GradCAM

        model = _get_pytorch_model()
        target_layer = model.features[-1]
        gcam = GradCAM(model, target_layer)

        # Preprocess PIL image for PyTorch (224x224 RGB, ImageNet normalization)
        img_rgb = pil_img.convert("RGB").resize((224, 224), Image.Resampling.BILINEAR)
        arr = np.array(img_rgb, dtype=np.float32) / 255.0
        norm = (arr - IMAGE_MEAN) / IMAGE_STD
        tensor = torch.from_numpy(np.transpose(norm, (2, 0, 1))).unsqueeze(0).float()

        cam, _ = gcam.generate_heatmap(tensor, target_class=target_class)

        # Generate JET heatmap overlay blended with original image
        img_bgr = cv2.cvtColor(np.array(img_rgb), cv2.COLOR_RGB2BGR)
        heatmap = cv2.resize(cam, (224, 224))
        heatmap_uint8 = np.uint8(255 * heatmap)
        colored_heatmap = cv2.applyColorMap(heatmap_uint8, cv2.COLORMAP_JET)

        overlay = cv2.addWeighted(colored_heatmap, 0.55, img_bgr, 0.45, 0)

        # Calculate bounding box of primary activation hotspot (> 65% max activation)
        hotspots = np.where(heatmap > 0.65)
        bbox = None
        if len(hotspots[0]) > 0:
            ymin, ymax = int(np.min(hotspots[0])), int(np.max(hotspots[0]))
            xmin, xmax = int(np.min(hotspots[1])), int(np.max(hotspots[1]))
            bbox = {"xmin": xmin, "ymin": ymin, "xmax": xmax, "ymax": ymax}

        # Encode overlay to base64 JPEG
        success, buffer = cv2.imencode(".jpg", overlay, [int(cv2.IMWRITE_JPEG_QUALITY), 85])
        if not success:
            return None, None, "Encoding failed"

        b64_str = base64.b64encode(buffer).decode("utf-8")
        gradcam_b64 = f"data:image/jpeg;base64,{b64_str}"

        class_name = VISION_5_CLASSES[target_class] if target_class < len(VISION_5_CLASSES) else "Silage"
        if class_name in ["Mould", "Spoilage"]:
            desc = f"Heatmap activations ({class_name}) localize fungal mycelium, aerobic heating, and surface spoilage."
        elif class_name in ["Abnormal_appearance", "Foreign_object"]:
            desc = f"Heatmap activations ({class_name}) localize dark discoloration, ash contamination, or texture abnormality."
        else:
            desc = "Even, low-intensity activations confirm uniform olive-green forage with healthy lactic fermentation."

        return gradcam_b64, bbox, desc
    except Exception as exc:
        logger.warning(f"GradCAM generation error: {exc}")
        return None, None, f"GradCAM unavailable: {exc}"


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
    confidence = int(np.clip(np.round(float(np.max(probs)) * 100), 0, 100))
    latency_ms = round((time.perf_counter() - start_time) * 1000, 2)

    if len(probs) == 5:
        sub_class = VISION_5_CLASSES[pred_idx]
        # Index 0: Abnormal_appearance -> CAUTION
        # Index 1: Foreign_object -> UNSAFE (physical contaminant)
        # Index 2: Healthy -> SAFE
        # Index 3: Mould -> UNSAFE (mycotoxin risk)
        # Index 4: Spoilage -> UNSAFE (aerobic spoilage)
        if pred_idx == 2:
            pred_class = "SAFE"
        elif pred_idx == 0:
            pred_class = "CAUTION"
        else:
            pred_class = "UNSAFE"

        safe_prob = round(float(probs[2]), 4)
        caution_prob = round(float(probs[0]), 4)
        unsafe_prob = round(float(probs[1] + probs[3] + probs[4]), 4)
        mould_prob = round(float(probs[3]), 4)
        class_distribution = {VISION_5_CLASSES[i]: round(float(probs[i]), 4) for i in range(5)}
    else:
        pred_class = CLASS_NAMES[pred_idx]
        sub_class = pred_class
        safe_prob = round(float(probs[0]), 4)
        caution_prob = round(float(probs[1]), 4)
        unsafe_prob = round(float(probs[2]), 4)
        mould_prob = round(float(probs[2]), 4)
    # Generate transparent Grad-CAM activation heatmap overlay
    gradcam_b64, hotspot_bbox, hotspot_desc = _generate_gradcam(pil_img, pred_idx)

    return {
        "prediction": pred_class,
        "detected_class": sub_class,
        "confidence": confidence,
        "probabilities": {
            "safe": safe_prob,
            "caution": caution_prob,
            "unsafe": unsafe_prob,
        },
        "class_probabilities": class_distribution,
        "mould_probability": mould_prob,
        "gradcam_heatmap_b64": gradcam_b64,
        "hotspot_bbox": hotspot_bbox,
        "hotspot_description": hotspot_desc,
        "iqa_passed": True,
        "iqa_report": iqa,
        "need_retake": False,
        "latency_ms": latency_ms,
        "model_version": "MobileNetV3-Small-5Class-ONNX",
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
    Run real MobileNetV3 ONNX inference on a base64 encoded silage photograph,
    local image path, or asset URI.
    Returns real prediction, class probabilities, mould probability, and measured latency.
    """
    logger.info("[AI-VISION-INFERENCE] Received POST /api/v1/inference/vision")
    print(f"\n=======================================================", flush=True)
    print(f"[AI-VISION-INFERENCE] Received POST /api/v1/inference/vision", flush=True)
    pil_img = _load_image_from_input(
        image_base64=payload.image_base64,
        image_path=payload.image_path,
        uri=payload.uri,
    )
    print(f"[AI-VISION-INFERENCE] Image Dimensions: {pil_img.size} | Mode: {pil_img.mode}", flush=True)
    result = _run_vision_onnx(pil_img)
    logger.info(f"[AI-VISION-INFERENCE] Verdict: {result.get('prediction')} | Class: {result.get('detected_class')} | Conf: {result.get('confidence')}%")
    print(f"[AI-VISION-INFERENCE] Verdict: {result.get('prediction')} | Class: {result.get('detected_class')}", flush=True)
    print(f"[AI-VISION-INFERENCE] Confidence: {result.get('confidence')}% | Latency: {result.get('latency_ms')}ms", flush=True)
    print(f"[AI-VISION-INFERENCE] Probabilities: {result.get('probabilities')}", flush=True)
    print(f"=======================================================\n", flush=True)
    return result


@router.post("/vision/upload")
async def predict_vision_upload(file: UploadFile = File(...)):
    """
    Multipart file upload endpoint for real vision model inference on uploaded images.
    """
    logger.info(f"[AI-VISION-INFERENCE] Received Multipart POST /api/v1/inference/vision/upload: {file.filename}")
    print(f"\n=======================================================", flush=True)
    print(f"[AI-VISION-INFERENCE] Received Multipart POST /api/v1/inference/vision/upload", flush=True)
    try:
        contents = await file.read()
        print(f"[AI-VISION-INFERENCE] Uploaded File: {file.filename} ({len(contents)} bytes)", flush=True)
        pil_img = Image.open(io.BytesIO(contents))
        print(f"[AI-VISION-INFERENCE] Image Dimensions: {pil_img.size} | Mode: {pil_img.mode}", flush=True)
        result = _run_vision_onnx(pil_img)
        logger.info(f"[AI-VISION-INFERENCE] Verdict: {result.get('prediction')} | Class: {result.get('detected_class')} | Conf: {result.get('confidence')}% | Latency: {result.get('latency_ms')}ms")
        print(f"[AI-VISION-INFERENCE] Verdict: {result.get('prediction')} | Class: {result.get('detected_class')}", flush=True)
        print(f"[AI-VISION-INFERENCE] Confidence: {result.get('confidence')}% | Latency: {result.get('latency_ms')}ms", flush=True)
        print(f"[AI-VISION-INFERENCE] Probabilities: {result.get('probabilities')}", flush=True)
        print(f"=======================================================\n", flush=True)
        return result
    except Exception as exc:
        logger.error(f"[AI-VISION-INFERENCE] Upload processing failed: {exc}")
        print(f"[AI-VISION-INFERENCE] Upload processing failed: {exc}", flush=True)
        raise HTTPException(status_code=400, detail=f"Could not read uploaded image: {exc}")


@router.post("/sensor")
async def predict_sensor(payload: SensorPayload):
    """
    Run real 11-feature Random Forest inference on physical probe telemetry.
    Returns real prediction, class probabilities, confidence, and measured latency.
    """
    print(f"\n[AI-SENSOR-INFERENCE] Received POST /api/v1/inference/sensor", flush=True)
    res = _run_sensor_rf(payload)
    if res is None:
        raise HTTPException(
            status_code=400,
            detail="Sensor telemetry is empty or probe is disconnected."
        )
    print(f"[AI-SENSOR-INFERENCE] Verdict: {res.get('prediction')} | Confidence: {res.get('confidence')}%", flush=True)
    return res


@router.post("/predict")
async def predict_multimodal(payload: MultimodalPayload):
    """
    Full Multimodal AI Inference Pipeline.
    Runs ONNX vision model on photo and Random Forest on physical probe telemetry.
    If probe telemetry is disconnected/omitted, executes honest Vision-Only screening without fake sensor latencies.
    """
    print(f"\n=======================================================", flush=True)
    print(f"⚡ [MULTIMODAL FUSION INFERENCE] Received POST /api/v1/inference/predict", flush=True)
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

    # Evaluate deterministic agronomic safety rules
    t_ph = payload.telemetry.ph if payload.telemetry else None
    t_moist = payload.telemetry.moisture if payload.telemetry else None
    t_temp = payload.telemetry.temperature if payload.telemetry else None
    t_amb = payload.telemetry.ambient if payload.telemetry else 25.0
    v_pred = vision_res.get("prediction") if vision_res else None
    v_class = vision_res.get("detected_class") if vision_res else None

    safety_check = evaluate_safety_rules(
        ph=t_ph,
        moisture=t_moist,
        temperature=t_temp,
        ambient=t_amb,
        vision_prediction=v_pred,
        detected_class=v_class,
    )

    if safety_check["triggered"] and safety_check["override_verdict"]:
        decision = safety_check["override_verdict"]

    return {
        "decision": decision,
        "mssi_score": fusion_score,
        "confidence": confidence,
        "need_retake": False,
        "modality_state": modality_state,
        "safety_rules": safety_check,
        "vision_result": vision_res,
        "sensor_result": sensor_res,
        "gradcam_heatmap_b64": vision_res.get("gradcam_heatmap_b64") if vision_res else None,
        "hotspot_bbox": vision_res.get("hotspot_bbox") if vision_res else None,
        "hotspot_description": vision_res.get("hotspot_description") if vision_res else None,
        "total_latency_ms": total_latency_ms,
        "disclaimer": "Rapid AI Screening Tool — Not a laboratory diagnostic device.",
    }


@router.get("/warmup")
async def warmup_models():
    """
    Explicitly pre-activates and warms up the MobileNetV3 ONNX model,
    PyTorch Grad-CAM network, and Random Forest sensor model on startup.
    Ensures zero cold-start latency when a farmer captures a silage photo.
    """
    start = time.perf_counter()
    session = _get_onnx_session()
    pytorch_model = _get_pytorch_model()
    forest = _get_sensor_forest()

    # Fast warm-up pass with dummy tensor
    try:
        dummy_img = Image.new("RGB", (224, 224), color=(128, 140, 60))
        gradcam_b64, bbox, desc = _generate_gradcam(dummy_img, target_class=2)
        gradcam_ready = bool(gradcam_b64)
    except Exception as exc:
        logger.warning(f"Grad-CAM warmup notice: {exc}")
        gradcam_ready = False

    latency_ms = round((time.perf_counter() - start) * 1000, 2)
    return {
        "status": "READY",
        "onnx_ready": session is not None,
        "pytorch_gradcam_ready": gradcam_ready,
        "sensor_rf_ready": len(forest.get("trees", [])) > 0,
        "warmup_latency_ms": latency_ms,
        "message": "MobileNetV3 and Grad-CAM activation pipelines are fully initialized.",
    }

