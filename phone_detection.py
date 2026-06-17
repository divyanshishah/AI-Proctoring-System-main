import numpy as np

try:
    from ultralytics import YOLO as _YOLO
    _model = _YOLO("yolov8n.pt")   # Downloads ~6MB on first call
    YOLO_AVAILABLE = True
    print("âœ… YOLOv8 model loaded successfully.")
except Exception as e:
    YOLO_AVAILABLE = False
    print(f"âš ï¸  YOLOv8 not available: {e}. Phone detection disabled.")

_SUSPICIOUS_CLASSES = {
    67: {"label": "cell phone", "severity": "critical", "violation": "phone_detected"},
    73: {"label": "book", "severity": "medium", "violation": "suspicious_object"},
    63: {"label": "laptop", "severity": "high", "violation": "suspicious_object"},
    76: {"label": "scissors", "severity": "low", "violation": "suspicious_object"},
    84: {"label": "book", "severity": "medium", "violation": "suspicious_object"},
}

_CONFIDENCE_THRESHOLD = 0.45


def detect_objects(frame: np.ndarray) -> dict:
    """
    Run YOLOv8 object detection on a single frame.

    Args:
        frame: BGR numpy array

    Returns:
        {
            "phone_detected":  bool,
            "objects":         [ {"label", "confidence", "x","y","w","h", "violation"} ],
            "violation":       str | None,     â€” most severe violation type
            "severity":        str | None,
            "message":         str,
        }
    """
    if not YOLO_AVAILABLE:
        return _clean_result("YOLOv8 not available â€” phone detection disabled")

    if frame is None or frame.size == 0:
        return _clean_result("Empty frame")

    # Run inference (verbose=False suppresses per-frame console output)
    results = _model(frame, verbose=False, conf=_CONFIDENCE_THRESHOLD)

    detected_objects = []
    phone_detected = False
    top_violation = None
    top_severity = None
    severity_order = ["critical", "high", "medium", "low"]

    for result in results:
        boxes = result.boxes
        for box in boxes:
            cls_id = int(box.cls[0])
            confidence = float(box.conf[0])

            if cls_id not in _SUSPICIOUS_CLASSES:
                continue

            info = _SUSPICIOUS_CLASSES[cls_id]
            x1, y1, x2, y2 = box.xyxy[0].tolist()

            obj = {
                "label": info["label"],
                "confidence": round(confidence * 100, 1),
                "x": int(x1),
                "y": int(y1),
                "w": int(x2 - x1),
                "h": int(y2 - y1),
                "violation": info["violation"],
                "severity": info["severity"],
            }
            detected_objects.append(obj)

            if info["label"] == "cell phone":
                phone_detected = True

            # Track most severe violation
            if top_severity is None or (
                severity_order.index(info["severity"]) <
                severity_order.index(top_severity)
            ):
                top_violation = info["violation"]
                top_severity = info["severity"]

    message = "No suspicious objects detected"
    if detected_objects:
        labels = [o["label"] for o in detected_objects]
        message = f"Detected: {', '.join(set(labels))}"

    return {
        "phone_detected": phone_detected,
        "objects": detected_objects,
        "violation": top_violation,
        "severity": top_severity,
        "message": message,
    }


def _clean_result(message: str = "") -> dict:
    return {
        "phone_detected": False,
        "objects": [],
        "violation": None,
        "severity": None,
        "message": message,
    }
