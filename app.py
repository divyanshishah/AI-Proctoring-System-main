"""
app.py — Flask Application Factory
=====================================
Creates and configures the Flask app, registers all blueprints,
initialises extensions (SQLAlchemy, JWT, SocketIO, CORS), and
creates database tables on first run.

Run:
    python app.py
"""

import os
from flask import Flask, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_socketio import SocketIO

# Extension instances
from models import db
socketio = SocketIO()
jwt      = JWTManager()


def create_app():
    """Application factory — returns a fully configured Flask app."""
    app = Flask(__name__)

    # ── Load config ───────────────────────────────────────────────────────
    from config import ActiveConfig
    app.config.from_object(ActiveConfig)

    # ── Ensure screenshot folder exists ───────────────────────────────────
    os.makedirs(app.config["SCREENSHOTS_FOLDER"], exist_ok=True)

    # ── Initialise extensions ─────────────────────────────────────────────
    db.init_app(app)
    jwt.init_app(app)

    CORS(app,
         resources={r"/api/*": {"origins": app.config["CORS_ORIGINS"]}},
         supports_credentials=True)

    socketio.init_app(
        app,
        cors_allowed_origins="*",
        async_mode='threading',
        logger=False,
        engineio_logger=False,
        ping_timeout=60,
        ping_interval=25,
    )

    # ── Register blueprints ───────────────────────────────────────────────
    from auth    import auth_bp
    from exams   import exams_bp
    from admin   import admin_bp
    from reports import reports_bp

    app.register_blueprint(auth_bp,    url_prefix="/api/auth")
    app.register_blueprint(exams_bp,   url_prefix="/api/exams")
    app.register_blueprint(admin_bp,   url_prefix="/api/admin")
    app.register_blueprint(reports_bp, url_prefix="/api/reports")

    # ── Register Socket.IO event handlers ─────────────────────────────────
    from flask import request
    import time
    import uuid
    from audio_detection import analyze_audio, reset_history
    from detection_engine import process_frame, log_behavioral_violation, cleanup_session

    @socketio.on("connect")
    def on_connect():
        print(f"\n🔌 DEBUG: Socket connected! SID: {request.sid}")

    @socketio.on("join_session")
    def on_join_session(data):
        print(f"📡 DEBUG: join_session received: {data}")
        session_id = data.get("session_id")
        socketio.emit("session_joined", {"session_id": session_id, "message": "Proctoring active."}, to=request.sid)

    @socketio.on("video_frame")
    def on_video_frame(data):
        result = process_frame(
            base64_frame       = data.get("frame", ""),
            session_id         = data.get("session_id"),
            student_name       = "Student",
            app_context        = app.app_context(),
            screenshots_folder = app.config["SCREENSHOTS_FOLDER"],
        )
        socketio.emit("detection_result", result, to=request.sid)
        
        if result.get("violations"):
            for v in result["violations"]:
                print(f"\n🚨 VIOLATION: {v['type']}")
                socketio.emit("violation_alert", {
                    "id": str(uuid.uuid4()),
                    "ts": int(time.time() * 1000),
                    "type": v["type"], 
                    "severity": v["severity"],
                    "message": f"Proctoring Alert: {v['type'].replace('_', ' ').capitalize()}",
                }, to=request.sid)

    @socketio.on("tab_switch")
    def on_tab_switch(data):
        print("\n⚠️ TAB SWITCH DETECTED")
        socketio.emit("violation_alert", {
            "id": str(uuid.uuid4()),
            "ts": int(time.time() * 1000),
            "type": "tab_switch",
            "severity": "high",
            "message": "⚠️ Tab switching detected! Stay on the exam page.",
        }, to=request.sid)

    @socketio.on("fullscreen_exit")
    def on_fullscreen_exit(data):
        print("\n⚠️ FULLSCREEN EXIT DETECTED")
        socketio.emit("violation_alert", {
            "id": str(uuid.uuid4()),
            "ts": int(time.time() * 1000),
            "type": "fullscreen_exit",
            "severity": "medium",
            "message": "⚠️ Please return to fullscreen mode immediately.",
        }, to=request.sid)

    @socketio.on("audio_data")
    def on_audio_data(data):
        audio_result = analyze_audio(data.get("rms", 0))
        if audio_result["is_suspicious"]:
            socketio.emit("violation_alert", {
                "id": str(uuid.uuid4()),
                "ts": int(time.time() * 1000),
                "type": "audio_noise",
                "severity": audio_result["severity"],
                "message": audio_result["message"],
            }, to=request.sid)
    @app.route("/", methods=["GET"])
    def health():
        return jsonify({
            "status":  "online",
            "service": "AI Proctoring System API",
            "version": "1.0.0",
        }), 200

    @app.route("/api/health", methods=["GET"])
    def api_health():
        return jsonify({"status": "ok"}), 200

    # ── JWT error handlers ────────────────────────────────────────────────
    @jwt.unauthorized_loader
    def missing_token(reason):
        return jsonify({"error": "Missing or invalid token", "reason": reason}), 401

    @jwt.expired_token_loader
    def expired_token(header, payload):
        return jsonify({"error": "Token has expired"}), 401

    @jwt.invalid_token_loader
    def invalid_token(reason):
        return jsonify({"error": "Invalid token", "reason": reason}), 422

    # ── Create all DB tables on first run ─────────────────────────────────
    with app.app_context():
        db.create_all()
        print("✅ Database tables created / verified.")

    return app


# ── Entry point ───────────────────────────────────────────────────────────────
if __name__ == "__main__":
    app = create_app()
    print("\n🚀 AI Proctoring System Backend — Starting...")
    print("📡 API:       http://localhost:5000")
    print("🔌 SocketIO:  ws://localhost:5000")
    print("📁 DB:        backend/proctoring.db")
    print("─" * 45)

    socketio.run(
        app,
        host="0.0.0.0",
        port=5000,
        debug=True,
        use_reloader=False,   # Disable reloader to avoid SocketIO conflicts
        log_output=True,
        allow_unsafe_werkzeug=True,
    )