import os
import base64
import json
import threading
from datetime import datetime, timezone

import cv2
import numpy as np

from face_detection import detect_faces, get_face_verification
from pose_estimation import estimate_head_pose
from phone_detection import detect_objects
from models import db, ExamSession, Violation

_frame_counters: dict[int, int] = {}   # session_id -> frame count
_FRAME_SKIP = 2                         # Run heavy detectors every N frames

_SCORE_DEDUCTIONS = {
    "low": 1.0,
    "medium": 3.0,
    "high": 5.0,
    "critical": 10.0,
}

_VIOLATION_COOLDOWN = 8
_last_violation_time: dict[str, datetime] = {}   # "session_id:type" -> datetime


def process_frame(
    base64_frame: str,
    session_id: int,
    student_name: str,
    app_context,
    screenshots_folder: str,
) -> dict:
    """
    Full pipeline: decode -> detect -> log violations -> return results.

    Args:
        base64_frame: JPEG frame encoded as base64 string
        session_id: Active ExamSession.id
        student_name: Student's full name (for face verification label)
        app_context: Flask app object (for db operations)
        screenshots_folder: Absolute path to screenshots/ directory

    Returns:
        Aggregated detection results dict with any violations found.
    """
    frame = _decode_frame(base64_frame)

    if frame is None:
        return {"error": "Invalid frame data", "violations": []}

    _frame_counters[session_id] = _frame_counters.get(session_id, 0) + 1
    run_heavy = (_frame_counters[session_id] % _FRAME_SKIP == 0)

    face_result = detect_faces(frame)
    pose_result = estimate_head_pose(frame) if run_heavy else _empty_pose()
    obj_result = detect_objects(frame) if run_heavy else _empty_obj()
    verify_result = get_face_verification(frame, student_name) if run_heavy else None

    new_violations = []

    for result, v_type_key in [
        (face_result, "violation"),
        (pose_result, "violation"),
        (obj_result, "violation"),
    ]:
        v_type = result.get(v_type_key)
        v_severity = result.get("severity")
        if v_type and v_severity:
            new_violations.append({
                "type": v_type,
                "severity": v_severity,
                "details": result,
            })

    logged_violations = []
    if new_violations:
        screenshot_path = _save_screenshot(
            frame,
            session_id,
            screenshots_folder,
            new_violations[0]["type"],
        )
        with app_context:
            for v in new_violations:
                if _is_cooled_down(session_id, v["type"]):
                    _log_violation(
                        session_id=session_id,
                        violation_type=v["type"],
                        severity=v["severity"],
                        details=v["details"],
                        screenshot=screenshot_path,
                    )
                    _mark_violation_time(session_id, v["type"])
                    logged_violations.append({
                        "type": v["type"],
                        "severity": v["severity"],
                        "new_trust_score": None,
                    })

    return {
        "face": face_result,
        "pose": pose_result,
        "objects": obj_result,
        "verification": verify_result,
        "violations": logged_violations,
        "frame_number": _frame_counters.get(session_id, 0),
    }


def _save_screenshot(
    frame: np.ndarray,
    session_id: int,
    screenshots_folder: str,
    violation_type: str,
) -> str | None:
    """Save violation frame as JPEG and return relative path."""
    try:
        folder = os.path.join(screenshots_folder, str(session_id))
        os.makedirs(folder, exist_ok=True)

        ts = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S_%f")
        filename = f"{ts}_{violation_type}.jpg"
        filepath = os.path.join(folder, filename)

        # Resize to reduce storage footprint
        small = cv2.resize(frame, (640, 480))
        cv2.imwrite(filepath, small, [cv2.IMWRITE_JPEG_QUALITY, 85])

        # Return a relative path stored in the DB
        return f"{session_id}/{filename}"
    except Exception as e:
        print(f"âš ï¸  Screenshot save failed: {e}")
        return None


def _log_violation(
    session_id: int,
    violation_type: str,
    severity: str,
    details: dict,
    screenshot: str | None,
) -> dict | None:
    """Write a Violation row and update ExamSession trust score."""
    deduction = _SCORE_DEDUCTIONS.get(severity, 2.0)

    try:
        session = db.session.get(ExamSession, session_id)
        if not session or session.status != "active":
            return None

        # Update trust score (floor at 0)
        session.trust_score = max(0.0, session.trust_score - deduction)
        session.total_violations += 1

        violation = Violation(
            session_id=session_id,
            violation_type=violation_type,
            severity=severity,
            screenshot_path=screenshot,
            details=json.dumps({
                k: v for k, v in details.items()
                if k not in ("violation", "severity") and _is_serialisable(v)
            }),
            score_deduction=deduction,
        )
        db.session.add(violation)
        db.session.commit()

        return {
            "id": violation.id,
            "type": violation_type,
            "severity": severity,
            "score_deduction": deduction,
            "new_trust_score": round(session.trust_score, 1),
            "screenshot": screenshot,
            "timestamp": violation.timestamp.isoformat(),
        }
    except Exception as e:
        db.session.rollback()
        print(f"âš ï¸  DB violation log failed: {e}")
        return None


def log_behavioral_violation(
    session_id: int,
    violation_type: str,
    severity: str = "high",
    details: dict | None = None,
    app_context=None,
):
    """
    Log a behavioural violation (tab switch, fullscreen exit) that originates
    in the browser â€” no frame screenshot needed.
    """
    with app_context:
        try:
            session = db.session.get(ExamSession, session_id)
            if not session:
                return

            if violation_type == "tab_switch":
                session.tab_switches += 1
            elif violation_type == "fullscreen_exit":
                session.fullscreen_exits += 1

            deduction = _SCORE_DEDUCTIONS.get(severity, 3.0)
            session.trust_score = max(0.0, session.trust_score - deduction)
            session.total_violations += 1

            v = Violation(
                session_id=session_id,
                violation_type=violation_type,
                severity=severity,
                screenshot_path=None,
                details=json.dumps(details or {}),
                score_deduction=deduction,
            )
            db.session.add(v)
            db.session.commit()
        except Exception as e:
            db.session.rollback()
            print(f"âš ï¸  Behavioral violation log failed: {e}")


def _is_cooled_down(session_id: int, violation_type: str) -> bool:
    key = f"{session_id}:{violation_type}"
    last = _last_violation_time.get(key)
    if last is None:
        return True
    elapsed = (datetime.now(timezone.utc) - last).total_seconds()
    return elapsed >= _VIOLATION_COOLDOWN


def _mark_violation_time(session_id: int, violation_type: str):
    _last_violation_time[f"{session_id}:{violation_type}"] = datetime.now(timezone.utc)


def cleanup_session(session_id: int):
    """Remove per-session state when session ends."""
    _frame_counters.pop(session_id, None)
    keys = [k for k in _last_violation_time if k.startswith(f"{session_id}:")]
    for k in keys:
        del _last_violation_time[k]


def _decode_frame(base64_frame: str) -> np.ndarray | None:
    """Decode a base64 JPEG/PNG string to a BGR numpy array."""
    try:
        # Strip data URI prefix if present  (data:image/jpeg;base64,...)
        if "," in base64_frame:
            base64_frame = base64_frame.split(",", 1)[1]
        img_bytes = base64.b64decode(base64_frame)
        arr = np.frombuffer(img_bytes, dtype=np.uint8)
        frame = cv2.imdecode(arr, cv2.IMREAD_COLOR)
        return frame
    except Exception as e:
        print(f"âš ï¸  Frame decode error: {e}")
        return None


def _is_serialisable(value) -> bool:
    """Check if a value can be JSON-serialised."""
    try:
        json.dumps(value)
        return True
    except (TypeError, ValueError):
        return False


def _empty_pose() -> dict:
    return {
        "looking_away": False,
        "direction": "forward",
        "yaw": 0.0,
        "pitch": 0.0,
        "violation": None,
        "severity": None,
    }


def _empty_obj() -> dict:
    return {
        "phone_detected": False,
        "objects": [],
        "violation": None,
        "severity": None,
        "message": "Skipped (frame skip)",
    }
