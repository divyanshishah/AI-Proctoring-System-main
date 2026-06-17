"""
exams.py — Exam Management Blueprint
======================================
CRUD for exams and exam session management (start / submit).

Endpoints:
  GET    /api/exams              — List exams (all active for students, all for admin)
  POST   /api/exams              — Create exam (admin only)
  GET    /api/exams/<id>         — Get exam detail
  PUT    /api/exams/<id>         — Update exam (admin only)
  DELETE /api/exams/<id>         — Delete exam (admin only)
  POST   /api/exams/<id>/start   — Student starts an exam session
  POST   /api/exams/<id>/submit  — Student submits / ends their session
  GET    /api/exams/<id>/sessions — List all sessions for an exam (admin only)
  GET    /api/exams/my-sessions  — Student: list their own past sessions
"""

import json
from datetime import datetime, timezone
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from models import db, Exam, ExamSession, User

exams_bp = Blueprint("exams", __name__)


def _require_admin():
    """Helper: returns (True, None) if admin, else (False, error_response)."""
    claims = get_jwt()
    if claims.get("role") != "admin":
        return False, (jsonify({"error": "Admin access required"}), 403)
    return True, None


# ─────────────────────────────────────────────────────────────────────────────
#  GET /api/exams
# ─────────────────────────────────────────────────────────────────────────────

@exams_bp.route("", methods=["GET"])
@jwt_required()
def list_exams():
    """Return list of exams. Students see only active exams."""
    claims = get_jwt()
    role   = claims.get("role")

    if role == "admin":
        exams = Exam.query.order_by(Exam.created_at.desc()).all()
    else:
        exams = Exam.query.filter_by(is_active=True).order_by(Exam.created_at.desc()).all()

    return jsonify({"exams": [e.to_dict() for e in exams]}), 200


# ─────────────────────────────────────────────────────────────────────────────
#  POST /api/exams
# ─────────────────────────────────────────────────────────────────────────────

@exams_bp.route("", methods=["POST"])
@jwt_required()
def create_exam():
    """Create a new exam — admin only."""
    ok, err = _require_admin()
    if not ok:
        return err

    data     = request.get_json(silent=True) or {}
    user_id  = int(get_jwt_identity())

    if not data.get("title"):
        return jsonify({"error": "Exam title is required"}), 400

    # Parse optional datetime strings
    start_time = None
    end_time   = None
    try:
        if data.get("start_time"):
            start_time = datetime.fromisoformat(data["start_time"])
        if data.get("end_time"):
            end_time = datetime.fromisoformat(data["end_time"])
    except ValueError:
        return jsonify({"error": "Invalid datetime format. Use ISO 8601."}), 400

    exam = Exam(
        title            = data["title"].strip(),
        description      = data.get("description", "").strip(),
        subject          = data.get("subject", "").strip(),
        duration_minutes = int(data.get("duration_minutes", 60)),
        total_marks      = int(data.get("total_marks", 100)),
        created_by       = user_id,
        start_time       = start_time,
        end_time         = end_time,
        is_active        = bool(data.get("is_active", True)),
        questions_json   = json.dumps(data["questions"]) if data.get("questions") else None,
    )
    db.session.add(exam)
    db.session.commit()

    return jsonify({"message": "Exam created", "exam": exam.to_dict()}), 201


# ─────────────────────────────────────────────────────────────────────────────
#  GET /api/exams/<id>
# ─────────────────────────────────────────────────────────────────────────────

@exams_bp.route("/<int:exam_id>", methods=["GET"])
@jwt_required()
def get_exam(exam_id):
    """Return a single exam. Students get questions only during an active session."""
    exam   = Exam.query.get_or_404(exam_id)
    claims = get_jwt()
    role   = claims.get("role")

    # Students only see questions if they have an active session
    include_questions = (role == "admin")
    if role == "student":
        user_id = int(get_jwt_identity())
        active  = ExamSession.query.filter_by(
            student_id=user_id, exam_id=exam_id, status="active"
        ).first()
        include_questions = (active is not None)

    return jsonify({"exam": exam.to_dict(include_questions=include_questions)}), 200


# ─────────────────────────────────────────────────────────────────────────────
#  PUT /api/exams/<id>
# ─────────────────────────────────────────────────────────────────────────────

@exams_bp.route("/<int:exam_id>", methods=["PUT"])
@jwt_required()
def update_exam(exam_id):
    """Update an exam — admin only."""
    ok, err = _require_admin()
    if not ok:
        return err

    exam = Exam.query.get_or_404(exam_id)
    data = request.get_json(silent=True) or {}

    if "title"            in data: exam.title            = data["title"].strip()
    if "description"      in data: exam.description      = data["description"]
    if "subject"          in data: exam.subject          = data["subject"]
    if "duration_minutes" in data: exam.duration_minutes = int(data["duration_minutes"])
    if "total_marks"      in data: exam.total_marks      = int(data["total_marks"])
    if "is_active"        in data: exam.is_active        = bool(data["is_active"])
    if "questions"        in data: exam.questions_json   = json.dumps(data["questions"])

    db.session.commit()
    return jsonify({"message": "Exam updated", "exam": exam.to_dict()}), 200


# ─────────────────────────────────────────────────────────────────────────────
#  DELETE /api/exams/<id>
# ─────────────────────────────────────────────────────────────────────────────

@exams_bp.route("/<int:exam_id>", methods=["DELETE"])
@jwt_required()
def delete_exam(exam_id):
    """Delete an exam — admin only."""
    ok, err = _require_admin()
    if not ok:
        return err

    exam = Exam.query.get_or_404(exam_id)
    db.session.delete(exam)
    db.session.commit()
    return jsonify({"message": "Exam deleted"}), 200


# ─────────────────────────────────────────────────────────────────────────────
#  POST /api/exams/<id>/start
# ─────────────────────────────────────────────────────────────────────────────

@exams_bp.route("/<int:exam_id>/start", methods=["POST"])
@jwt_required()
def start_session(exam_id):
    """Student starts an exam — creates an ExamSession."""
    user_id = int(get_jwt_identity())
    exam    = Exam.query.get_or_404(exam_id)

    if not exam.is_active:
        return jsonify({"error": "This exam is not currently active"}), 403

    # Check if already has an active session
    existing = ExamSession.query.filter_by(
        student_id=user_id, exam_id=exam_id, status="active"
    ).first()
    if existing:
        return jsonify({
            "message": "Resuming existing session",
            "session": existing.to_dict(),
            "exam":    exam.to_dict(include_questions=True),
        }), 200

    # Create new session
    session = ExamSession(
        student_id   = user_id,
        exam_id      = exam_id,
        ip_address   = request.remote_addr,
        browser_info = request.headers.get("User-Agent", "")[:200],
        status       = "active",
        trust_score  = 100.0,
    )
    db.session.add(session)
    db.session.commit()

    return jsonify({
        "message": "Exam session started",
        "session": session.to_dict(),
        "exam":    exam.to_dict(include_questions=True),
    }), 201


# ─────────────────────────────────────────────────────────────────────────────
#  POST /api/exams/<id>/submit
# ─────────────────────────────────────────────────────────────────────────────

@exams_bp.route("/<int:exam_id>/submit", methods=["POST"])
@jwt_required()
def submit_session(exam_id):
    """Student submits / ends their exam session."""
    user_id = int(get_jwt_identity())

    session = ExamSession.query.filter_by(
        student_id=user_id, exam_id=exam_id, status="active"
    ).first()
    if not session:
        return jsonify({"error": "No active session found for this exam"}), 404

    session.status   = "completed"
    session.ended_at = datetime.now(timezone.utc)
    db.session.commit()

    return jsonify({
        "message": "Exam submitted successfully",
        "session": session.to_dict(),
    }), 200


# ─────────────────────────────────────────────────────────────────────────────
#  GET /api/exams/<id>/sessions  (admin only)
# ─────────────────────────────────────────────────────────────────────────────

@exams_bp.route("/<int:exam_id>/sessions", methods=["GET"])
@jwt_required()
def exam_sessions(exam_id):
    """Return all sessions for an exam — admin only."""
    ok, err = _require_admin()
    if not ok:
        return err

    Exam.query.get_or_404(exam_id)  # 404 if exam not found
    sessions = ExamSession.query.filter_by(exam_id=exam_id)\
                                .order_by(ExamSession.started_at.desc()).all()
    return jsonify({"sessions": [s.to_dict() for s in sessions]}), 200


# ─────────────────────────────────────────────────────────────────────────────
#  GET /api/exams/my-sessions  (student)
# ─────────────────────────────────────────────────────────────────────────────

@exams_bp.route("/my-sessions", methods=["GET"])
@jwt_required()
def my_sessions():
    """Return the logged-in student's own exam sessions."""
    user_id  = int(get_jwt_identity())
    sessions = ExamSession.query.filter_by(student_id=user_id)\
                                .order_by(ExamSession.started_at.desc()).all()
    return jsonify({"sessions": [s.to_dict() for s in sessions]}), 200
