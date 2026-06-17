"""
seed_data.py — Demo Data Seeder
================================
Populates the database with realistic demo data for university presentation.

Accounts created:
  Admin:    admin@proctor.edu   / Admin@123
  Students: alice@test.edu     / Student@123
            bob@test.edu       / Student@123
            carol@test.edu     / Student@123

Run:
    cd backend
    python seed_data.py
"""

import sys, os, json
sys.path.insert(0, os.path.dirname(__file__))

from datetime import datetime, timezone, timedelta
from werkzeug.security import generate_password_hash

# Bootstrap the Flask app so we have DB access
from app import create_app
from models import db, User, Exam, ExamSession, Violation, Report

QUESTIONS = [
    {"id": 1, "question": "What does CPU stand for?",
     "options": ["Central Processing Unit", "Computer Personal Unit", "Central Program Utility", "Core Processing Unit"],
     "answer": 0, "marks": 10},
    {"id": 2, "question": "Which data structure uses LIFO?",
     "options": ["Queue", "Stack", "Tree", "Graph"],
     "answer": 1, "marks": 10},
    {"id": 3, "question": "What is the time complexity of binary search?",
     "options": ["O(n)", "O(n²)", "O(log n)", "O(1)"],
     "answer": 2, "marks": 10},
    {"id": 4, "question": "Which protocol is used for email?",
     "options": ["HTTP", "FTP", "SMTP", "TCP"],
     "answer": 2, "marks": 10},
    {"id": 5, "question": "What is the output of 2**8 in Python?",
     "options": ["16", "64", "256", "512"],
     "answer": 2, "marks": 10},
    {"id": 6, "question": "Which language is primarily used for web styling?",
     "options": ["JavaScript", "Python", "CSS", "HTML"],
     "answer": 2, "marks": 10},
    {"id": 7, "question": "What does SQL stand for?",
     "options": ["Structured Query Language", "Simple Query Logic", "System Query Language", "Standard Question List"],
     "answer": 0, "marks": 10},
    {"id": 8, "question": "Which sorting algorithm has worst-case O(n log n)?",
     "options": ["Bubble Sort", "Merge Sort", "Selection Sort", "Insertion Sort"],
     "answer": 1, "marks": 10},
    {"id": 9, "question": "What is an IP address?",
     "options": ["Internet Protocol address", "Internal Program address", "Interface Protocol address", "Internet Process address"],
     "answer": 0, "marks": 10},
    {"id": 10, "question": "Which of these is NOT an OOP principle?",
     "options": ["Encapsulation", "Polymorphism", "Compilation", "Inheritance"],
     "answer": 2, "marks": 10},
]

def seed():
    app = create_app()
    with app.app_context():
        print("🌱 Seeding demo data...")

        # Clear existing data
        for model in [Report, Violation, ExamSession, Exam, User]:
            db.session.query(model).delete()
        db.session.commit()

        # ── Users ──────────────────────────────────────────────────────────
        admin = User(
            username="admin", full_name="Dr. Sarah Ahmed",
            email="admin@proctor.edu",
            password_hash=generate_password_hash("Admin@123", method="pbkdf2:sha256"),
            role="admin", department="Computer Science",
        )
        alice = User(
            username="alice", full_name="Alice Johnson",
            email="alice@test.edu",
            password_hash=generate_password_hash("Student@123", method="pbkdf2:sha256"),
            role="student", student_id="CS2021-001", department="Computer Science",
        )
        bob = User(
            username="bob", full_name="Bob Smith",
            email="bob@test.edu",
            password_hash=generate_password_hash("Student@123", method="pbkdf2:sha256"),
            role="student", student_id="CS2021-002", department="Computer Science",
        )
        carol = User(
            username="carol", full_name="Carol Williams",
            email="carol@test.edu",
            password_hash=generate_password_hash("Student@123", method="pbkdf2:sha256"),
            role="student", student_id="CS2021-003", department="Information Technology",
        )
        db.session.add_all([admin, alice, bob, carol])
        db.session.flush()

        # ── Exams ──────────────────────────────────────────────────────────
        now = datetime.now(timezone.utc)
        exam1 = Exam(
            title="Computer Science Fundamentals — Final Exam",
            description="Covers data structures, algorithms, networking, and OOP principles.",
            subject="CS101", duration_minutes=60, total_marks=100,
            created_by=admin.id, is_active=True,
            start_time=now - timedelta(hours=2),
            end_time=now + timedelta(hours=4),
            questions_json=json.dumps(QUESTIONS),
        )
        exam2 = Exam(
            title="Database Management Systems — Midterm",
            description="SQL, normalization, ER diagrams, and transaction management.",
            subject="DBMS301", duration_minutes=45, total_marks=50,
            created_by=admin.id, is_active=True,
            questions_json=json.dumps(QUESTIONS[:5]),
        )
        db.session.add_all([exam1, exam2])
        db.session.flush()

        # ── Sessions (Alice — completed with violations) ───────────────────
        s_alice = ExamSession(
            student_id=alice.id, exam_id=exam1.id,
            started_at=now - timedelta(hours=1, minutes=30),
            ended_at=now - timedelta(minutes=30),
            status="completed", trust_score=62.0,
            total_violations=8, tab_switches=3, fullscreen_exits=2,
            face_verified=True, ip_address="192.168.1.101",
        )
        # Bob — active session (for live demo)
        s_bob = ExamSession(
            student_id=bob.id, exam_id=exam1.id,
            started_at=now - timedelta(minutes=20),
            status="active", trust_score=85.0,
            total_violations=2, tab_switches=1, fullscreen_exits=0,
            face_verified=True, ip_address="192.168.1.102",
        )
        # Carol — completed, clean
        s_carol = ExamSession(
            student_id=carol.id, exam_id=exam2.id,
            started_at=now - timedelta(hours=2),
            ended_at=now - timedelta(hours=1),
            status="completed", trust_score=97.0,
            total_violations=1, tab_switches=0, fullscreen_exits=1,
            face_verified=True, ip_address="192.168.1.103",
        )
        db.session.add_all([s_alice, s_bob, s_carol])
        db.session.flush()

        # ── Violations for Alice ───────────────────────────────────────────
        alice_violations = [
            Violation(session_id=s_alice.id, violation_type="tab_switch",
                      severity="high", score_deduction=5.0,
                      timestamp=now - timedelta(hours=1, minutes=20),
                      details='{"url": "google.com"}'),
            Violation(session_id=s_alice.id, violation_type="no_face",
                      severity="high", score_deduction=5.0,
                      timestamp=now - timedelta(hours=1, minutes=10)),
            Violation(session_id=s_alice.id, violation_type="multiple_faces",
                      severity="critical", score_deduction=10.0,
                      timestamp=now - timedelta(hours=1)),
            Violation(session_id=s_alice.id, violation_type="looking_away",
                      severity="medium", score_deduction=3.0,
                      timestamp=now - timedelta(minutes=55)),
            Violation(session_id=s_alice.id, violation_type="phone_detected",
                      severity="critical", score_deduction=10.0,
                      timestamp=now - timedelta(minutes=50)),
            Violation(session_id=s_alice.id, violation_type="tab_switch",
                      severity="high", score_deduction=5.0,
                      timestamp=now - timedelta(minutes=45)),
            Violation(session_id=s_alice.id, violation_type="fullscreen_exit",
                      severity="medium", score_deduction=3.0,
                      timestamp=now - timedelta(minutes=40)),
            Violation(session_id=s_alice.id, violation_type="audio_noise",
                      severity="medium", score_deduction=3.0,
                      timestamp=now - timedelta(minutes=35)),
        ]
        db.session.add_all(alice_violations)

        # ── Violations for Bob (active session) ───────────────────────────
        bob_violations = [
            Violation(session_id=s_bob.id, violation_type="tab_switch",
                      severity="high", score_deduction=5.0,
                      timestamp=now - timedelta(minutes=10)),
            Violation(session_id=s_bob.id, violation_type="looking_away",
                      severity="medium", score_deduction=3.0,
                      timestamp=now - timedelta(minutes=5)),
        ]
        db.session.add_all(bob_violations)

        # ── Violations for Carol ──────────────────────────────────────────
        carol_violations = [
            Violation(session_id=s_carol.id, violation_type="fullscreen_exit",
                      severity="medium", score_deduction=3.0,
                      timestamp=now - timedelta(hours=1, minutes=45)),
        ]
        db.session.add_all(carol_violations)

        # ── Report for Alice ──────────────────────────────────────────────
        alice_report = Report(
            session_id=s_alice.id, trust_score=62.0, total_violations=8,
            risk_level="high",
            violation_breakdown=json.dumps({
                "tab_switch": 2, "no_face": 1, "multiple_faces": 1,
                "looking_away": 1, "phone_detected": 1,
                "fullscreen_exit": 1, "audio_noise": 1,
            }),
            summary=(
                "Student 'Alice Johnson' completed 'Computer Science Fundamentals'. "
                "8 violations were recorded, resulting in a trust score of 62/100. "
                "Multiple faces and phone detection events are of particular concern."
            ),
            recommendations=(
                "Frequent tab switching detected — consider lockdown browser. "
                "Multiple faces detected — verify identity. "
                "Mobile phone detected — policy reminder required."
            ),
        )
        # Report for Carol
        carol_report = Report(
            session_id=s_carol.id, trust_score=97.0, total_violations=1,
            risk_level="low",
            violation_breakdown=json.dumps({"fullscreen_exit": 1}),
            summary=(
                "Student 'Carol Williams' completed 'Database Management Systems'. "
                "1 minor violation recorded. Trust score: 97/100. "
                "The student appears to have completed the exam with minimal suspicious activity."
            ),
            recommendations="No specific interventions recommended.",
        )
        db.session.add_all([alice_report, carol_report])
        db.session.commit()

        print("\n✅ Demo data seeded successfully!\n")
        print("┌─────────────────────────────────────────────────────┐")
        print("│  DEMO CREDENTIALS                                   │")
        print("├─────────────────────────────────────────────────────┤")
        print("│  Admin:   admin@proctor.edu    / Admin@123          │")
        print("│  Student: alice@test.edu       / Student@123        │")
        print("│  Student: bob@test.edu         / Student@123        │")
        print("│  Student: carol@test.edu       / Student@123        │")
        print("└─────────────────────────────────────────────────────┘")

if __name__ == "__main__":
    seed()
