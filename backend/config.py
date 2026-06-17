"""
config.py — Application Configuration
======================================
Centralised settings for development and production environments.
All sensitive values are read from environment variables (see .env).
"""

import os
from pathlib import Path
from datetime import timedelta
from dotenv import load_dotenv

# Resolve the directory where this file lives (backend/)
BASE_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BASE_DIR.parent

# Load the repository .env consistently, even when the app is launched from VS Code.
load_dotenv(PROJECT_ROOT / ".env")


def _sqlite_uri(path: Path) -> str:
    """Return a SQLAlchemy SQLite URI for an absolute filesystem path."""
    return f"sqlite:///{str(path.resolve()).replace(chr(92), '/')}"


def _resolve_database_uri() -> str:
    """Keep SQLite paths stable regardless of the current working directory."""
    database_url = os.environ.get("DATABASE_URL", "").strip()
    if not database_url:
        return _sqlite_uri(BASE_DIR / "proctoring.db")

    if database_url.startswith("sqlite:///"):
        raw_path = database_url.removeprefix("sqlite:///")
        if raw_path and raw_path != ":memory:" and not os.path.isabs(raw_path):
            return _sqlite_uri(BASE_DIR / raw_path)

    return database_url


class Config:
    """Base configuration shared across environments."""

    # ── Flask ──────────────────────────────────────────────────────────────
    SECRET_KEY = os.environ.get("SECRET_KEY", "dev-secret-key-please-change")
    DEBUG = False
    TESTING = False

    # ── Database ───────────────────────────────────────────────────────────
    # SQLite stored inside the backend/ directory for easy sharing
    SQLALCHEMY_DATABASE_URI = _resolve_database_uri()
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # ── JWT ────────────────────────────────────────────────────────────────
    JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "jwt-secret-please-change")
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=8)   # Tokens valid for 8 hours

    # ── CORS ───────────────────────────────────────────────────────────────
    # Allow local frontend dev servers from VS Code, Vite, or similar tools.
    CORS_ORIGINS = [
        r"^https?://localhost(:\d+)?$",
        r"^https?://127\.0\.0\.1(:\d+)?$",
    ]

    # ── File Storage ───────────────────────────────────────────────────────
    SCREENSHOTS_FOLDER = str(BASE_DIR / "screenshots")
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024   # 16 MB max upload

    # ── Socket.IO ──────────────────────────────────────────────────────────
    SOCKETIO_ASYNC_MODE = "threading"
    SOCKETIO_CORS_ALLOWED_ORIGINS = "*"

    # ── AI Detection ───────────────────────────────────────────────────────
    # Frame analysis interval — process every N-th frame to reduce CPU load
    FRAME_SKIP = 3
    # Violation severity thresholds
    FACE_DETECTION_CONFIDENCE = 0.6
    HEAD_POSE_THRESHOLD = 25       # degrees off-centre before "looking away"
    AUDIO_NOISE_THRESHOLD = 60     # dB-like RMS threshold
    PHONE_CONFIDENCE_THRESHOLD = 0.5


class DevelopmentConfig(Config):
    """Development-specific overrides."""
    DEBUG = True


class ProductionConfig(Config):
    """Production-specific overrides."""
    DEBUG = False
    # Override with real secrets via environment variables in production


# Active configuration — reads APP_ENV environment variable
_ENV_MAP = {
    "development": DevelopmentConfig,
    "production": ProductionConfig,
}

ActiveConfig = _ENV_MAP.get(os.environ.get("APP_ENV", "development"), DevelopmentConfig)
