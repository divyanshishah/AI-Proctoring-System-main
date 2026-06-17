"""
models.py — SQLAlchemy Database Models
=======================================
Defines all database tables using SQLAlchemy ORM.
SQLite is used for development; swap DATABASE_URL in .env for PostgreSQL.

Tables:
  - User           : Students and admins
  - Exam           : Exam definitions created by admins
  - ExamSession    : A student's attempt at a specific exam
  - Violation      : Individual proctoring violations with screenshots
  - Report         : Post-exam summary reports
"""

from datetime import datetime, timezone
from flask_sqlalchemy import SQLAlchemy

# Shared db instance — imported by app.py and blueprints
db = SQLAlchemy()


# ─────────────────────────────────────────────────────────────────────────────
#  User Model
# ─────────────────────────────────────────────────────────────────────────────

class User(db.Model):
    """Represents both students and admin users."""
    __tablename__ = "users"

    id            = db.Column(db.Integer, primary_key=True)
    username      = db.Column(db.String(80), unique=True, nullable=False)
    full_name     = db.Column(db.String(120), nullable=False)
    email         = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    role          = db.Column(db.String(20), nullable=False, default="student")  # "student" | "admin"
    student_id    = db.Column(db.String(50), unique=True, nullable=True)         # University roll number
    department    = db.Column(db.String(100), nullable=True)
    is_active     = db.Column(db.Boolean, default=True, nullable=False)
    created_at    = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    sessions      = db.relationship("ExamSession", backref="student", lazy="dynamic",
                                    foreign_keys="ExamSession.student_id")
    exams_created = db.relationship("Exam", backref="creator", lazy="dynamic",
                                    foreign_keys="Exam.created_by")

    def to_dict(self, include_private=False):
        data = {
            "id":          self.id,
            "username":    self.username,
            "full_name":   self.full_name,
            "email":       self.email,
            "role":        self.role,
            "student_id":  self.student_id,
            "department":  self.department,
            "is_active":   self.is_active,
            "created_at":  self.created_at.isoformat() if self.created_at else None,
        }
        return data

    def __repr__(self):
        return f"<User {self.username} ({self.role})>"


# ─────────────────────────────────────────────────────────────────────────────
#  Exam Model
# ─────────────────────────────────────────────────────────────────────────────

class Exam(db.Model):
    """An exam created by an admin/teacher."""
    __tablename__ = "exams"

    id               = db.Column(db.Integer, primary_key=True)
    title            = db.Column(db.String(200), nullable=False)
    description      = db.Column(db.Text, nullable=True)
    subject          = db.Column(db.String(100), nullable=True)
    duration_minutes = db.Column(db.Integer, nullable=False, default=60)
    total_marks      = db.Column(db.Integer, nullable=False, default=100)
    created_by       = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    start_time       = db.Column(db.DateTime, nullable=True)
    end_time         = db.Column(db.DateTime, nullable=True)
    is_active        = db.Column(db.Boolean, default=True, nullable=False)
    # JSON string containing list of question objects [{q, options, answer, marks}]
    questions_json   = db.Column(db.Text, nullable=True)
    created_at       = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    sessions = db.relationship("ExamSession", backref="exam", lazy="dynamic")

    def to_dict(self, include_questions=False):
        import json
        data = {
            "id":               self.id,
            "title":            self.title,
            "description":      self.description,
            "subject":          self.subject,
            "duration_minutes": self.duration_minutes,
            "total_marks":      self.total_marks,
            "created_by":       self.created_by,
            "creator_name":     self.creator.full_name if self.creator else None,
            "start_time":       self.start_time.isoformat() if self.start_time else None,
            "end_time":         self.end_time.isoformat() if self.end_time else None,
            "is_active":        self.is_active,
            "created_at":       self.created_at.isoformat() if self.created_at else None,
            "session_count":    self.sessions.count(),
        }
        if include_questions and self.questions_json:
            data["questions"] = json.loads(self.questions_json)
        return data

    def __repr__(self):
        return f"<Exam {self.title}>"


# ─────────────────────────────────────────────────────────────────────────────
#  ExamSession Model
# ─────────────────────────────────────────────────────────────────────────────

class ExamSession(db.Model):
    """Records one student's attempt at one exam."""
    __tablename__ = "exam_sessions"

    id               = db.Column(db.Integer, primary_key=True)
    student_id       = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    exam_id          = db.Column(db.Integer, db.ForeignKey("exams.id"), nullable=False)
    started_at       = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    ended_at         = db.Column(db.DateTime, nullable=True)
    # Status: "active" | "completed" | "terminated" | "pending"
    status           = db.Column(db.String(20), default="active", nullable=False)
    trust_score      = db.Column(db.Float, default=100.0, nullable=False)  # 0–100
    total_violations = db.Column(db.Integer, default=0, nullable=False)
    ip_address       = db.Column(db.String(50), nullable=True)
    browser_info     = db.Column(db.String(200), nullable=True)
    # Proctoring flags
    face_verified    = db.Column(db.Boolean, default=False)
    tab_switches     = db.Column(db.Integer, default=0)
    fullscreen_exits = db.Column(db.Integer, default=0)

    # Relationships
    violations = db.relationship("Violation", backref="session", lazy="dynamic",
                                 cascade="all, delete-orphan")
    report     = db.relationship("Report", backref="session", uselist=False,
                                 cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id":               self.id,
            "student_id":       self.student_id,
            "exam_id":          self.exam_id,
            "student_name":     self.student.full_name if self.student else None,
            "exam_title":       self.exam.title if self.exam else None,
            "started_at":       self.started_at.isoformat() if self.started_at else None,
            "ended_at":         self.ended_at.isoformat() if self.ended_at else None,
            "status":           self.status,
            "trust_score":      round(self.trust_score, 1),
            "total_violations": self.total_violations,
            "tab_switches":     self.tab_switches,
            "fullscreen_exits": self.fullscreen_exits,
            "face_verified":    self.face_verified,
            "ip_address":       self.ip_address,
        }

    def __repr__(self):
        return f"<Session student={self.student_id} exam={self.exam_id} status={self.status}>"


# ─────────────────────────────────────────────────────────────────────────────
#  Violation Model
# ─────────────────────────────────────────────────────────────────────────────

class Violation(db.Model):
    """A single proctoring violation event within an exam session."""
    __tablename__ = "violations"

    # Violation type constants
    TYPE_NO_FACE       = "no_face"
    TYPE_MULTI_FACE    = "multiple_faces"
    TYPE_LOOKING_AWAY  = "looking_away"
    TYPE_PHONE         = "phone_detected"
    TYPE_TAB_SWITCH    = "tab_switch"
    TYPE_FULLSCREEN    = "fullscreen_exit"
    TYPE_AUDIO_NOISE   = "audio_noise"
    TYPE_OBJECT        = "suspicious_object"

    # Severity constants
    SEV_LOW      = "low"
    SEV_MEDIUM   = "medium"
    SEV_HIGH     = "high"
    SEV_CRITICAL = "critical"

    id                  = db.Column(db.Integer, primary_key=True)
    session_id          = db.Column(db.Integer, db.ForeignKey("exam_sessions.id"), nullable=False)
    violation_type      = db.Column(db.String(50), nullable=False)
    severity            = db.Column(db.String(20), nullable=False, default="medium")
    timestamp           = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    screenshot_path     = db.Column(db.String(300), nullable=True)  # Relative path under screenshots/
    details             = db.Column(db.Text, nullable=True)          # JSON string with extra data
    acknowledged        = db.Column(db.Boolean, default=False)
    score_deduction     = db.Column(db.Float, default=0.0)           # Trust score deducted

    def to_dict(self):
        return {
            "id":               self.id,
            "session_id":       self.session_id,
            "violation_type":   self.violation_type,
            "severity":         self.severity,
            "timestamp":        self.timestamp.isoformat() if self.timestamp else None,
            "screenshot_path":  self.screenshot_path,
            "details":          self.details,
            "acknowledged":     self.acknowledged,
            "score_deduction":  self.score_deduction,
        }

    def __repr__(self):
        return f"<Violation {self.violation_type} session={self.session_id}>"


# ─────────────────────────────────────────────────────────────────────────────
#  Report Model
# ─────────────────────────────────────────────────────────────────────────────

class Report(db.Model):
    """Auto-generated post-exam report summarising a session's proctoring data."""
    __tablename__ = "reports"

    id                     = db.Column(db.Integer, primary_key=True)
    session_id             = db.Column(db.Integer, db.ForeignKey("exam_sessions.id"),
                                       nullable=False, unique=True)
    generated_at           = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    trust_score            = db.Column(db.Float, nullable=False)
    total_violations       = db.Column(db.Integer, nullable=False, default=0)
    # JSON string: {"no_face": 3, "multiple_faces": 1, "tab_switch": 5, ...}
    violation_breakdown    = db.Column(db.Text, nullable=True)
    summary                = db.Column(db.Text, nullable=True)    # Auto-generated text summary
    recommendations        = db.Column(db.Text, nullable=True)    # Admin notes / recommendations
    risk_level             = db.Column(db.String(20), nullable=True)  # "low"|"medium"|"high"|"critical"

    def to_dict(self):
        import json
        return {
            "id":                  self.id,
            "session_id":          self.session_id,
            "generated_at":        self.generated_at.isoformat() if self.generated_at else None,
            "trust_score":         round(self.trust_score, 1),
            "total_violations":    self.total_violations,
            "violation_breakdown": json.loads(self.violation_breakdown) if self.violation_breakdown else {},
            "summary":             self.summary,
            "recommendations":     self.recommendations,
            "risk_level":          self.risk_level,
        }

    def __repr__(self):
        return f"<Report session={self.session_id} trust={self.trust_score}>"
