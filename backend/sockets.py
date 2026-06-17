from flask import request, current_app
from flask_socketio import emit, join_room, leave_room

from app import socketio
from models import db, ExamSession
from audio_detection import analyze_audio, reset_history
from detection_engine import process_frame, log_behavioral_violation, cleanup_session

_active_connections: dict = {}
ADMIN_ROOM = "admin_monitor"


@socketio.on("connect")
def on_connect():
    emit("connected", {"message": "Connected to AI Proctoring Server", "sid": request.sid})


@socketio.on("disconnect")
def on_disconnect():
    conn = _active_connections.pop(request.sid, None)
    if conn:
        session_id = conn.get("session_id")
        if session_id:
            cleanup_session(session_id)
            reset_history()
            socketio.emit("student_disconnected", {"session_id": session_id}, to=ADMIN_ROOM)


@socketio.on("join_session")
def on_join_session(data):
    print(f"ðŸ“¡ DEBUG: join_session received: {data}")
    with open("socket_debug.log", "a") as f:
        f.write(f"Received join_session: {data}\n")

    session_id = data.get("session_id")
    student_name = data.get("student_name", "Student")
    if not session_id:
        emit("error", {"message": "session_id required"})
        return

    room = f"session_{session_id}"
    join_room(room)
    _active_connections[request.sid] = {
        "session_id": session_id,
        "student_name": student_name,
        "room": room,
    }
    emit("session_joined", {"session_id": session_id, "message": "Proctoring active."})
    socketio.emit(
        "student_joined",
        {"session_id": session_id, "student_name": student_name},
        to=ADMIN_ROOM,
    )


@socketio.on("video_frame")
def on_video_frame(data):
    # Log every 10th frame to terminal to avoid spamming
    if request.sid not in _active_connections:
        print(f"âš ï¸ DEBUG: video_frame from unregistered SID: {request.sid}")

    with open("socket_debug.log", "a") as f:
        f.write(f"Received video_frame from {request.sid}\n")

    conn = _active_connections.get(request.sid)
    if not conn:
        return
    session_id = conn["session_id"]
    student_name = conn["student_name"]
    frame_data = data.get("frame", "")

    result = process_frame(
        base64_frame=frame_data,
        session_id=session_id,
        student_name=student_name,
        app_context=current_app._get_current_object().app_context(),
        screenshots_folder=current_app.config["SCREENSHOTS_FOLDER"],
    )
    emit("detection_result", result)

    if result.get("violations"):
        for v in result["violations"]:
            emit("violation_alert", {
                "type": v["type"],
                "severity": v["severity"],
                "message": _msg(v["type"]),
                "trust_score": v.get("new_trust_score"),
            })
        socketio.emit("live_violation", {
            "session_id": session_id,
            "student_name": student_name,
            "violations": result["violations"],
            "trust_score": result["violations"][-1].get("new_trust_score") or 100.0,
        }, to=ADMIN_ROOM)


@socketio.on("audio_data")
def on_audio_data(data):
    conn = _active_connections.get(request.sid)
    if not conn:
        return
    session_id = conn["session_id"]
    audio_result = analyze_audio(data.get("rms", 0))
    emit("audio_result", audio_result)
    if audio_result["is_suspicious"]:
        log_behavioral_violation(
            session_id=session_id,
            violation_type=audio_result["violation"],
            severity=audio_result["severity"],
            details={"rms": audio_result["rms"]},
            app_context=current_app._get_current_object().app_context(),
        )
        emit("violation_alert", {
            "type": audio_result["violation"],
            "severity": audio_result["severity"],
            "message": audio_result["message"],
        })


@socketio.on("tab_switch")
def on_tab_switch(data):
    conn = _active_connections.get(request.sid)
    if not conn:
        return
    log_behavioral_violation(
        session_id=conn["session_id"],
        violation_type="tab_switch",
        severity="high",
        details={},
        app_context=current_app._get_current_object().app_context(),
    )
    emit("violation_alert", {
        "type": "tab_switch",
        "severity": "high",
        "message": "âš ï¸ Tab switching detected! Stay on the exam page.",
    })
    socketio.emit("live_violation", {
        "session_id": conn["session_id"],
        "student_name": conn["student_name"],
        "violations": [{"type": "tab_switch", "severity": "high"}],
    }, to=ADMIN_ROOM)


@socketio.on("fullscreen_exit")
def on_fullscreen_exit(data):
    conn = _active_connections.get(request.sid)
    if not conn:
        return
    log_behavioral_violation(
        session_id=conn["session_id"],
        violation_type="fullscreen_exit",
        severity="medium",
        details={},
        app_context=current_app._get_current_object().app_context(),
    )
    emit("violation_alert", {
        "type": "fullscreen_exit",
        "severity": "medium",
        "message": "âš ï¸ Please return to fullscreen mode immediately.",
    })


@socketio.on("leave_session")
def on_leave_session(data):
    conn = _active_connections.pop(request.sid, None)
    if conn:
        cleanup_session(conn["session_id"])
        reset_history()
        leave_room(conn["room"])
        emit("session_ended", {"message": "Session ended. Thank you."})
        socketio.emit("student_left", {"session_id": conn["session_id"]}, to=ADMIN_ROOM)


@socketio.on("admin_join")
def on_admin_join(data):
    join_room(ADMIN_ROOM)
    emit("admin_joined", {"message": "Connected to live monitor.", "room": ADMIN_ROOM})


def _msg(vtype: str) -> str:
    return {
        "no_face": "âš ï¸ No face detected! Look at your camera.",
        "multiple_faces": "ðŸš¨ Multiple faces detected!",
        "looking_away": "âš ï¸ Please look at the screen.",
        "phone_detected": "ðŸš¨ Mobile phone detected!",
        "tab_switch": "âš ï¸ Tab switching is not allowed.",
        "fullscreen_exit": "âš ï¸ Return to fullscreen mode.",
        "audio_noise": "âš ï¸ Excessive noise detected.",
        "suspicious_object": "âš ï¸ Suspicious object detected.",
    }.get(vtype, "âš ï¸ Violation recorded.")
