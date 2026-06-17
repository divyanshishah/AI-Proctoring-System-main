import numpy as np

# Thresholds (0-100 scale matching Web Audio normalized RMS)
_NOISE_LOW = 15          # Background ambient - normal
_NOISE_MEDIUM = 30       # Elevated - might be talking
_NOISE_HIGH = 50         # Likely talking or loud environment
_NOISE_CRITICAL = 75     # Very loud - shouting / external person speaking

# Rolling history for smoothing (last N readings)
_history: list[float] = []
_HISTORY_MAX = 10


def analyze_audio(rms_value: float) -> dict:
    """
    Analyze a single RMS audio amplitude reading.

    Args:
        rms_value: Float 0-100, normalized RMS from Web Audio API

    Returns:
        {
            "rms": float,               # current reading
            "average_rms": float,       # rolling average
            "noise_level": str,         # quiet|normal|elevated|high|critical
            "is_suspicious": bool,
            "violation": str | None,
            "severity": str | None,
            "message": str,
        }
    """
    global _history

    try:
        rms = float(rms_value)
        rms = max(0.0, min(100.0, rms))   # Clamp to valid range
    except (TypeError, ValueError):
        return _clean_result()

    # Update rolling history
    _history.append(rms)
    if len(_history) > _HISTORY_MAX:
        _history.pop(0)

    avg_rms = float(np.mean(_history))

    # Determine noise level label
    if avg_rms < _NOISE_LOW:
        noise_level = "quiet"
        is_suspicious = False
        violation = None
        severity = None
        message = "Audio levels are quiet - normal"
    elif avg_rms < _NOISE_MEDIUM:
        noise_level = "normal"
        is_suspicious = False
        violation = None
        severity = None
        message = "Audio levels are normal"
    elif avg_rms < _NOISE_HIGH:
        noise_level = "elevated"
        is_suspicious = True
        violation = "audio_noise"
        severity = "low"
        message = "Elevated audio detected - possible conversation"
    elif avg_rms < _NOISE_CRITICAL:
        noise_level = "high"
        is_suspicious = True
        violation = "audio_noise"
        severity = "medium"
        message = "High audio noise - student may be speaking"
    else:
        noise_level = "critical"
        is_suspicious = True
        violation = "audio_noise"
        severity = "high"
        message = "Critical audio level - loud noise or conversation detected"

    return {
        "rms": round(rms, 2),
        "average_rms": round(avg_rms, 2),
        "noise_level": noise_level,
        "is_suspicious": is_suspicious,
        "violation": violation,
        "severity": severity,
        "message": message,
    }


def reset_history():
    """Reset rolling history - call when a session ends."""
    global _history
    _history = []


def _clean_result() -> dict:
    return {
        "rms": 0.0,
        "average_rms": 0.0,
        "noise_level": "unknown",
        "is_suspicious": False,
        "violation": None,
        "severity": None,
        "message": "Invalid audio data",
    }
