"""
admin.py — Admin Dashboard Blueprint
======================================
Aggregate statistics, live session monitoring, violation management,
and screenshot serving for the teacher/admin panel.

Endpoints:
  GET /api/admin/dashboard        — Key metrics for the admin home page
  GET /api/admin/live-sessions    — All currently active exam sessions
  GET /api/admin/violations       — Recent violations (all sessions)
  PUT /api/admin/violations/<id>  — Acknowledge a violation
  GET /api/admin/screenshots/<session_id>/<filename>  — Serve screenshot image
  GET /api/admin/students         — List all students
"""

import os
from collections import Counter
from flask import Blueprint, request, jsonify, send_from_directory, current_app
from flask_jwt_extended import jwt_required, get_jwt
from models import db, User, Exam, ExamSession, Violation, Report

admin_bp = Blueprint("admin", __name__)


def _require_admin():
    claims = get_jwt()
    if claims.get("role") != "admin":
        return False, (jsonify({"error": "Admin access required"}), 403)
    return True, None


# ─────────────────────────────────────────────────────────────────────────────
#  GET /api/admin/dashboard
# ─────────────────────────────────────────────────────────────────────────────

@admin_bp.route("/dashboard", methods=["GET"])
@jwt_required()
def dashboard():
    """Aggregate statistics for the admin home page."""
    ok, err = _require_admin()
    if not ok:
        return err

    total_students       = User.query.filter_by(role="student", is_active=True).count()
    total_exams          = Exam.query.count()
    active_sessions      = ExamSession.query.filter_by(status="active").count()
    completed_sessions   = ExamSession.query.filter_by(status="completed").count()
    total_violations     = Violation.query.count()
    unacknowledged       = Violation.query.filter_by(acknowledged=False).count()

    # Average trust score (completed sessions)
    completed = ExamSession.query.filter_by(status="completed").all()
    avg_trust = (
        round(sum(s.trust_score for s in completed) / len(completed), 1)
        if completed else 100.0
    )

    # Violation breakdown (all time)
    violations = Violation.query.with_entities(Violation.violation_type).all()
    breakdown  = dict(Counter(v[0] for v in violations))

    # Recent 5 violations with session/student info
    recent_violations = (
        Violation.query
        .order_by(Violation.timestamp.desc())
        .limit(10)
        .all()
    )
    recent_data = []
    for v in recent_violations:
        s = ExamSession.query.get(v.session_id)
        recent_data.append({
            **v.to_dict(),
            "student_name": s.student.full_name if s and s.student else "Unknown",
            "exam_title":   s.exam.title if s and s.exam else "Unknown",
        })

    return jsonify({
        "stats": {
            "total_students":      total_students,
            "total_exams":         total_exams,
            "active_sessions":     active_sessions,
            "completed_sessions":  completed_sessions,
            "total_violations":    total_violations,
            "unacknowledged":      unacknowledged,
            "avg_trust_score":     avg_trust,
        },
        "violation_breakdown":   breakdown,
        "recent_violations":     recent_data,
    }), 200


# ─────────────────────────────────────────────────────────────────────────────
#  GET /api/admin/live-sessions
# ─────────────────────────────────────────────────────────────────────────────

@admin_bp.route("/live-sessions", methods=["GET"])
@jwt_required()
def live_sessions():
    """Return all currently active exam sessions for the live monitor page."""
    ok, err = _require_admin()
    if not ok:
        return err

    sessions = (
        ExamSession.query
        .filter_by(status="active")
        .order_by(ExamSession.started_at.asc())
        .all()
    )
    return jsonify({"sessions": [s.to_dict() for s in sessions]}), 200


# ─────────────────────────────────────────────────────────────────────────────
#  GET /api/admin/violations
# ─────────────────────────────────────────────────────────────────────────────

@admin_bp.route("/violations", methods=["GET"])
@jwt_required()
def get_violations():
    """Return paginated violations. Query params: session_id, type, severity, page."""
    ok, err = _require_admin()
    if not ok:
        return err

    query = Violation.query

    if request.args.get("session_id"):
        query = query.filter_by(session_id=int(request.args["session_id"]))
    if request.args.get("type"):
        query = query.filter_by(violation_type=request.args["type"])
    if request.args.get("severity"):
        query = query.filter_by(severity=request.args["severity"])

    page       = int(request.args.get("page", 1))
    per_page   = int(request.args.get("per_page", 20))
    paginated  = query.order_by(Violation.timestamp.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )

    result = []
    for v in paginated.items:
        s = ExamSession.query.get(v.session_id)
        result.append({
            **v.to_dict(),
            "student_name": s.student.full_name if s and s.student else "Unknown",
            "exam_title":   s.exam.title if s and s.exam else "Unknown",
        })

    return jsonify({
        "violations": result,
        "total":      paginated.total,
        "pages":      paginated.pages,
        "page":       page,
    }), 200


# ─────────────────────────────────────────────────────────────────────────────
#  PUT /api/admin/violations/<id>
# ─────────────────────────────────────────────────────────────────────────────

@admin_bp.route("/violations/<int:violation_id>", methods=["PUT"])
@jwt_required()
def acknowledge_violation(violation_id):
    """Mark a violation as acknowledged by admin."""
    ok, err = _require_admin()
    if not ok:
        return err

    v = Violation.query.get_or_404(violation_id)
    v.acknowledged = True
    db.session.commit()
    return jsonify({"message": "Violation acknowledged", "violation": v.to_dict()}), 200


# ─────────────────────────────────────────────────────────────────────────────
#  GET /api/admin/screenshots/<session_id>/<filename>
# ─────────────────────────────────────────────────────────────────────────────

@admin_bp.route("/screenshots/<int:session_id>/<path:filename>", methods=["GET"])
@jwt_required()
def serve_screenshot(session_id, filename):
    """Serve a violation screenshot image file."""
    ok, err = _require_admin()
    if not ok:
        return err

    screenshots_folder = current_app.config["SCREENSHOTS_FOLDER"]
    session_folder     = os.path.join(screenshots_folder, str(session_id))

    return send_from_directory(session_folder, filename)


# ─────────────────────────────────────────────────────────────────────────────
#  GET /api/admin/screenshots/<session_id>  — list all screenshots
# ─────────────────────────────────────────────────────────────────────────────

@admin_bp.route("/screenshots/<int:session_id>", methods=["GET"])
@jwt_required()
def list_screenshots(session_id):
    """List all screenshot filenames for a session."""
    ok, err = _require_admin()
    if not ok:
        return err

    folder = os.path.join(current_app.config["SCREENSHOTS_FOLDER"], str(session_id))
    if not os.path.exists(folder):
        return jsonify({"screenshots": []}), 200

    files = sorted(os.listdir(folder))
    urls  = [
        f"/api/admin/screenshots/{session_id}/{f}"
        for f in files
        if f.lower().endswith((".jpg", ".jpeg", ".png"))
    ]
    return jsonify({"screenshots": urls}), 200


# ─────────────────────────────────────────────────────────────────────────────
#  GET /api/admin/students
# ─────────────────────────────────────────────────────────────────────────────

@admin_bp.route("/students", methods=["GET"])
@jwt_required()
def list_students():
    """List all students with their session counts."""
    ok, err = _require_admin()
    if not ok:
        return err

    students = User.query.filter_by(role="student").order_by(User.created_at.desc()).all()
    result   = []
    for s in students:
        data = s.to_dict()
        data["total_sessions"]     = s.sessions.count()
        data["completed_sessions"] = s.sessions.filter_by(status="completed").count()
        result.append(data)

    return jsonify({"students": result}), 200


# ─────────────────────────────────────────────────────────────────────────────
#  GET /api/admin/sessions/<id>  — session detail
# ─────────────────────────────────────────────────────────────────────────────

@admin_bp.route("/sessions/<int:session_id>", methods=["GET"])
@jwt_required()
def session_detail(session_id):
    """Detailed view of one exam session including all violations."""
    ok, err = _require_admin()
    if not ok:
        return err

    session    = ExamSession.query.get_or_404(session_id)
    violations = session.violations.order_by(Violation.timestamp.asc()).all()

    return jsonify({
        "session":    session.to_dict(),
        "violations": [v.to_dict() for v in violations],
    }), 200
