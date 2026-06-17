"""
face_detection.py — Frame-Based Face Detection Module
=======================================================
Receives a decoded numpy frame (from WebSocket), detects faces using
OpenCV's Haar Cascade classifier, and returns structured results.

In demo-mode: face recognition returns "verified" whenever exactly
one face is detected — no dlib/face_recognition library needed.

Functions:
  detect_faces(frame)          -> dict
  get_face_verification(frame) -> dict
"""

import cv2
import numpy as np

# ── Load Haar Cascade classifier once at module load time ────────────────────
_face_cascade = cv2.CascadeClassifier(
    cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
)

# Severity mapping based on violation type
VIOLATION_SEVERITY = {
    "no_face":       "high",
    "multiple_faces": "critical",
}


def detect_faces(frame: np.ndarray) -> dict:
    """
    Detect faces in a single frame.

    Args:
        frame: BGR numpy array (decoded from WebSocket base64)

    Returns:
        {
            "face_count": int,
            "faces": [{"x", "y", "w", "h"} ...],
            "status": str,
            "violation": str | None,   — violation type if any
            "severity": str | None,
        }
    """
    if frame is None or frame.size == 0:
        return _error_result("Empty frame received")

    # Convert to grayscale for faster detection
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    gray = cv2.equalizeHist(gray)   # Improve contrast in low-light

    # Detect faces
    faces_raw = _face_cascade.detectMultiScale(
        gray,
        scaleFactor  = 1.1,
        minNeighbors = 5,
        minSize      = (30, 30),
        flags        = cv2.CASCADE_SCALE_IMAGE,
    )

    face_count = len(faces_raw)
    faces      = [{"x": int(x), "y": int(y), "w": int(w), "h": int(h)}
                  for (x, y, w, h) in faces_raw]

    # Determine status and violation type
    if face_count == 0:
        return {
            "face_count": 0,
            "faces":      [],
            "status":     "No face detected",
            "violation":  "no_face",
            "severity":   "high",
        }
    elif face_count == 1:
        return {
            "face_count": 1,
            "faces":      faces,
            "status":     "Face detected ✓",
            "violation":  None,
            "severity":   None,
        }
    else:
        return {
            "face_count": face_count,
            "faces":      faces,
            "status":     f"Multiple faces detected ({face_count})",
            "violation":  "multiple_faces",
            "severity":   "critical",
        }


def get_face_verification(frame: np.ndarray, student_name: str = "Student") -> dict:
    """
    Demo-mode face verification.
    Returns 'verified' when exactly 1 face is detected.
    No dlib or face_recognition library required.

    Args:
        frame:        BGR numpy array
        student_name: Name label for the result

    Returns:
        {
            "verified": bool,
            "confidence": float,   — 0–100%
            "identity":  str,
            "message":   str,
        }
    """
    result = detect_faces(frame)

    if result["face_count"] == 1:
        return {
            "verified":   True,
            "confidence": 94.5,          # Demo: fixed high confidence
            "identity":   student_name,
            "message":    f"Identity verified: {student_name}",
        }
    elif result["face_count"] == 0:
        return {
            "verified":   False,
            "confidence": 0.0,
            "identity":   None,
            "message":    "No face detected for verification",
        }
    else:
        return {
            "verified":   False,
            "confidence": 0.0,
            "identity":   None,
            "message":    "Multiple faces — cannot verify identity",
        }


def draw_detection_overlay(frame: np.ndarray, detection_result: dict) -> np.ndarray:
    """
    Draw bounding boxes and status text on a frame for debugging.
    Not used in production web app — only for local testing.
    """
    for face in detection_result.get("faces", []):
        x, y, w, h = face["x"], face["y"], face["w"], face["h"]
        color = (0, 255, 0) if detection_result["face_count"] == 1 else (0, 0, 255)
        cv2.rectangle(frame, (x, y), (x + w, y + h), color, 2)

    status = detection_result.get("status", "")
    cv2.putText(frame, status, (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 255), 2)
    return frame


def _error_result(message: str) -> dict:
    return {
        "face_count": 0,
        "faces":      [],
        "status":     message,
        "violation":  None,
        "severity":   None,
    }