import os
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app
from models import db, ExamSession

app = create_app()
with app.app_context():
    session = ExamSession.query.order_by(ExamSession.id.desc()).first()
    if session:
        print(f"Latest Session ID: {session.id}")
        print(f"Student ID: {session.student_id}")
        print(f"Status: {session.status}")
        print(f"Trust Score: {session.trust_score}")
        print(f"Total Violations: {session.total_violations}")
    else:
        print("No sessions found.")
