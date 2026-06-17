"""
reports.py — Report Generation Blueprint
==========================================
Generates, stores, and retrieves post-exam proctoring reports.

Endpoints:
  POST /api/reports/generate/<session_id>  — Generate report for a session
  GET  /api/reports/<session_id>           — Get report for a session
  GET  /api/reports                        — List all reports (admin)
"""

import json
from collections import Counter
from datetime import datetime, timezone
from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt, get_jwt_identity
from models import db, ExamSession, Violation, Report

reports_bp = Blueprint("reports", __name__)


def _calculate_risk_level(trust_score: float, total_violations: int) -> str:
    """Determine risk level from trust score."""
    if trust_score >= 85:
        return "low"
    elif trust_score >= 65:
        return "medium"
    elif trust_score >= 40:
        return "high"
    else:
        return "critical"


def _generate_summary(session, violations, breakdown) -> str:
    """Auto-generate a human-readable summary paragraph."""
    duration = ""
    if session.ended_at and session.started_at:
        mins = int((session.ended_at - session.started_at).total_seconds() / 60)
        duration = f" The exam lasted {mins} minutes."

    top_violation = max(breakdown, key=breakdown.get) if breakdown else None
    top_text = f"The most frequent violation was '{top_violation}' ({breakdown[top_violation]} times). " if top_violation else ""

    risk = _calculate_risk_level(session.trust_score, session.total_violations)
    risk_text = {
        "low":      "The student appears to have completed the exam with minimal suspicious activity.",
        "medium":   "Some suspicious behaviour was detected. Manual review is recommended.",
        "high":     "Significant suspicious activity was detected. This session requires careful review.",
        "critical": "Critical level of suspicious activity. Academic integrity may have been compromised.",
    }[risk]

    return (
        f"Student '{session.student.full_name}' completed the exam '{session.exam.title}'.{duration} "
        f"A total of {session.total_violations} violation(s) were recorded, "
        f"resulting in a trust score of {session.trust_score:.1f}/100. "
        f"{top_text}{risk_text}"
    )


# ─────────────────────────────────────────────────────────────────────────────
#  POST /api/reports/generate/<session_id>
# ─────────────────────────────────────────────────────────────────────────────

@reports_bp.route("/generate/<int:session_id>", methods=["POST"])
@jwt_required()
def generate_report(session_id):
    """Generate (or regenerate) a proctoring report for a session."""
    claims = get_jwt()
    role   = claims.get("role")

    session = ExamSession.query.get_or_404(session_id)

    # Students can only access their own reports
    if role == "student" and session.student_id != int(get_jwt_identity()):
        return jsonify({"error": "Access denied"}), 403

    # Collect violation data
    violations = session.violations.all()
    breakdown  = dict(Counter(v.violation_type for v in violations))

    # Delete existing report if any
    if session.report:
        db.session.delete(session.report)
        db.session.flush()

    risk    = _calculate_risk_level(session.trust_score, session.total_violations)
    summary = _generate_summary(session, violations, breakdown)

    report = Report(
        session_id          = session_id,
        trust_score         = session.trust_score,
        total_violations    = session.total_violations,
        violation_breakdown = json.dumps(breakdown),
        summary             = summary,
        risk_level          = risk,
        recommendations     = _build_recommendations(breakdown, risk),
    )
    db.session.add(report)
    db.session.commit()

    return jsonify({"message": "Report generated", "report": report.to_dict()}), 201


def _build_recommendations(breakdown: dict, risk: str) -> str:
    """Build recommendation text based on violation types found."""
    tips = []
    if breakdown.get("tab_switch", 0) > 3:
        tips.append("Frequent tab switching detected — consider lockdown browser enforcement.")
    if breakdown.get("no_face", 0) > 5:
        tips.append("Student was absent from webcam feed multiple times — verify webcam setup.")
    if breakdown.get("multiple_faces", 0) > 0:
        tips.append("Multiple faces detected — potential identity fraud; verify with ID.")
    if breakdown.get("phone_detected", 0) > 0:
        tips.append("Mobile phone detected — policy reminder should be issued.")
    if breakdown.get("audio_noise", 0) > 3:
        tips.append("High audio noise — student may have had external assistance.")
    if not tips:
        tips.append("No specific interventions recommended.")
    return " ".join(tips)


# ─────────────────────────────────────────────────────────────────────────────
#  GET /api/reports/<session_id>
# ─────────────────────────────────────────────────────────────────────────────

@reports_bp.route("/<int:session_id>", methods=["GET"])
@jwt_required()
def get_report(session_id):
    """Fetch the report for a session. Auto-generates if not yet created."""
    claims  = get_jwt()
    role    = claims.get("role")
    session = ExamSession.query.get_or_404(session_id)

    if role == "student" and session.student_id != int(get_jwt_identity()):
        return jsonify({"error": "Access denied"}), 403

    if not session.report:
        # Auto-generate on first access
        return generate_report(session_id)

    # Also return violations for the timeline chart
    violations = session.violations.order_by(Violation.timestamp.asc()).all()

    return jsonify({
        "report":     session.report.to_dict(),
        "session":    session.to_dict(),
        "violations": [v.to_dict() for v in violations],
    }), 200


# ─────────────────────────────────────────────────────────────────────────────
#  GET /api/reports
# ─────────────────────────────────────────────────────────────────────────────

@reports_bp.route("", methods=["GET"])
@jwt_required()
def list_reports():
    """List all reports — admin only."""
    claims = get_jwt()
    if claims.get("role") != "admin":
        return jsonify({"error": "Admin access required"}), 403

    reports = Report.query.order_by(Report.generated_at.desc()).all()
    result  = []
    for r in reports:
        data = r.to_dict()
        if r.session:
            data["student_name"] = r.session.student.full_name if r.session.student else "Unknown"
            data["exam_title"]   = r.session.exam.title if r.session.exam else "Unknown"
        result.append(data)

    return jsonify({"reports": result}), 200
