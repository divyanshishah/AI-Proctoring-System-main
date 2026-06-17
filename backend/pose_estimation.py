"""
pose_estimation.py — Head Pose Estimation (Looking Away Detection)
===================================================================
Uses MediaPipe FaceMesh to estimate head yaw/pitch angles.
"""

import cv2
import numpy as np

MEDIAPIPE_AVAILABLE = False
_face_mesh_ctx      = None

try:
    import mediapipe as mp
    # Attempt to import face_mesh directly if solutions is missing
    try:
        import mediapipe.tasks.python.vision as vision
        # If using tasks API (0.10+), this is the modern way, 
        # but for simplicity we try to keep the old solutions API if possible.
    except:
        pass

    # Some versions of mediapipe on new Python versions might not expose 'solutions' directly
    # or it might fail due to missing dependencies.
    if hasattr(mp, 'solutions'):
        _face_mesh_mod = mp.solutions.face_mesh
        _face_mesh_ctx = _face_mesh_mod.FaceMesh(
            static_image_mode        = True,
            max_num_faces            = 1,
            refine_landmarks         = False,
            min_detection_confidence = 0.5,
            min_tracking_confidence  = 0.5,
        )
        MEDIAPIPE_AVAILABLE = True
        print("MediaPipe FaceMesh loaded successfully.")
    else:
        print("MediaPipe installed but 'solutions' attribute missing.")

except Exception as e:
    # Remove emojis to avoid UnicodeEncodeError on some terminals
    print(f"Warning: MediaPipe unavailable - head pose disabled. ({str(e)})")

# Six landmark indices used for PnP (Nose tip, chin, eye corners, mouth corners)
_POSE_POINTS = [1, 152, 263, 33, 287, 57]

# Corresponding 3-D model points (generic human face, mm units)
_MODEL_POINTS = np.array([
    (0.0,    0.0,    0.0),
    (0.0,  -330.0,  -65.0),
    (-225.0, 170.0, -135.0),
    (225.0,  170.0, -135.0),
    (-150.0,-150.0, -125.0),
    (150.0, -150.0, -125.0),
], dtype=np.float64)

YAW_THRESHOLD   = 25   # degrees left/right
PITCH_THRESHOLD = 20   # degrees up/down


def estimate_head_pose(frame: np.ndarray) -> dict:
    """
    Estimate head pose from a BGR frame.
    Returns looking_away bool + direction + yaw/pitch + violation info.
    """
    if not MEDIAPIPE_AVAILABLE or _face_mesh_ctx is None:
        return _forward_result()

    if frame is None or frame.size == 0:
        return _forward_result()

    h, w = frame.shape[:2]
    rgb  = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

    try:
        results = _face_mesh_ctx.process(rgb)
    except Exception:
        return _forward_result()

    if not results or not results.multi_face_landmarks:
        return _forward_result()

    landmarks = results.multi_face_landmarks[0].landmark

    # 2-D image points
    image_points = np.array([
        (landmarks[i].x * w, landmarks[i].y * h)
        for i in _POSE_POINTS
    ], dtype=np.float64)

    # Camera intrinsics (estimated)
    focal   = w
    center  = (w / 2.0, h / 2.0)
    cam_mat = np.array([
        [focal, 0,     center[0]],
        [0,     focal, center[1]],
        [0,     0,     1        ],
    ], dtype=np.float64)
    dist = np.zeros((4, 1))

    ok, rvec, _ = cv2.solvePnP(
        _MODEL_POINTS, image_points, cam_mat, dist,
        flags=cv2.SOLVEPNP_ITERATIVE
    )
    if not ok:
        return _forward_result()

    rmat, _ = cv2.Rodrigues(rvec)
    angles, *_ = cv2.RQDecomp3x3(rmat)

    pitch = angles[0] * 360
    yaw   = angles[1] * 360

    looking_away = False
    direction    = "forward"

    if abs(yaw) > YAW_THRESHOLD:
        looking_away = True
        direction    = "left" if yaw < 0 else "right"
    elif abs(pitch) > PITCH_THRESHOLD:
        looking_away = True
        direction    = "down" if pitch < 0 else "up"

    return {
        "looking_away": looking_away,
        "direction":    direction,
        "yaw":          round(float(yaw), 2),
        "pitch":        round(float(pitch), 2),
        "violation":    "looking_away" if looking_away else None,
        "severity":     "medium"       if looking_away else None,
    }


def _forward_result() -> dict:
    return {
        "looking_away": False,
        "direction":    "forward",
        "yaw":          0.0,
        "pitch":        0.0,
        "violation":    None,
        "severity":     None,
    }
