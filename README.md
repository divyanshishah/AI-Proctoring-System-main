# 🛡️ ProctorAI — AI-Based Online Proctoring System

A university semester project demonstrating intelligent real-time exam monitoring using **Computer Vision, Machine Learning, and Full-Stack Web Development**.

---

## 🚀 Quick Start

### 1️⃣ Backend Setup

```bash
cd backend

# Install Python dependencies
pip install -r ../requirements.txt

# Seed demo data
python seed_data.py

# Start Flask server
python app.py
```

Backend runs at:

```text
http://localhost:5000
```

---

### 2️⃣ Frontend Setup

Install Node.js 18+ from:

```text
https://nodejs.org
```

```bash
cd frontend

# Install packages
npm install

# Start development server
npm run dev
```

Frontend runs at:

```text
http://localhost:5173
```

---

### 3️⃣ Open in Browser

```text
http://localhost:5173
```

---

## 🔐 Demo Credentials

| Role    | Email                                         | Password    |
| ------- | --------------------------------------------- | ----------- |
| Admin   | [admin@proctor.edu](mailto:admin@proctor.edu) | Admin@123   |
| Student | [alice@test.edu](mailto:alice@test.edu)       | Student@123 |
| Student | [bob@test.edu](mailto:bob@test.edu)           | Student@123 |
| Student | [carol@test.edu](mailto:carol@test.edu)       | Student@123 |

---

# ✨ Features

## 👨‍🎓 Student Features

* Secure Login & Registration
* Exam Dashboard
* Real-Time Webcam Monitoring
* Live Violation Detection
* Real-Time Trust Score
* Countdown Timer with Auto Submit

---

## 👨‍🏫 Admin / Teacher Features

* Analytics Dashboard
* Exam CRUD Operations
* Live Session Monitoring
* Instant Violation Alerts
* Automatic Screenshot Capture
* Detailed Exam Reports
* Screenshot Gallery

---

# 🤖 AI Proctoring Modules

| Module                | Technology          | Detects                  |
| --------------------- | ------------------- | ------------------------ |
| Face Detection        | OpenCV Haar Cascade | No Face / Multiple Faces |
| Head Pose Detection   | MediaPipe FaceMesh  | Looking Away             |
| Object Detection      | YOLOv8n             | Mobile Phones            |
| Audio Analysis        | Web Audio API       | Noise & Conversation     |
| Behaviour Tracking    | JavaScript Events   | Tab Switch               |
| Identity Verification | Demo Verification   | Face Presence            |

---

# 🏗️ Project Structure

```text
ai-proctoring-system/
│
├── backend/
│   ├── app.py
│   ├── auth.py
│   ├── exams.py
│   ├── admin.py
│   ├── reports.py
│   ├── sockets.py
│   ├── detection_engine.py
│   └── screenshots/
│
├── frontend/
│   └── src/
│       ├── pages/
│       ├── components/
│       ├── context/
│       └── services/
│
├── requirements.txt
└── README.md
```

---

# 🔧 Tech Stack

| Layer          | Technology                  |
| -------------- | --------------------------- |
| Frontend       | React + Vite + TailwindCSS  |
| Backend        | Flask + Flask-SocketIO      |
| Database       | SQLite + SQLAlchemy         |
| Authentication | JWT                         |
| Real-Time      | Socket.IO                   |
| AI Detection   | OpenCV + MediaPipe + YOLOv8 |
| Charts         | Recharts                    |

---

# 📡 API Endpoints

| Method | Endpoint                 | Description      |
| ------ | ------------------------ | ---------------- |
| POST   | /api/auth/login          | Login            |
| POST   | /api/auth/register       | Register Student |
| GET    | /api/exams               | Get Exams        |
| POST   | /api/exams               | Create Exam      |
| POST   | /api/exams/:id/start     | Start Exam       |
| POST   | /api/exams/:id/submit    | Submit Exam      |
| GET    | /api/admin/dashboard     | Dashboard Stats  |
| GET    | /api/admin/live-sessions | Active Sessions  |
| GET    | /api/reports             | Reports          |

---

# 🎓 Demonstration Flow

1. Login as Admin
2. Create/View Exams
3. Login as Student in another tab
4. Start Exam Session
5. Trigger Violations
6. Monitor Live Activity
7. Submit Exam & Generate Reports

---

# 👥 Team Collaboration

| Area             | Files                                 |
| ---------------- | ------------------------------------- |
| Face AI          | face_detection.py, pose_estimation.py |
| Object Detection | phone_detection.py                    |
| Backend API      | auth.py, exams.py                     |
| WebSocket        | sockets.py                            |
| Student Frontend | StudentDashboard.jsx                  |
| Admin Frontend   | AdminDashboard.jsx                    |

---

# 👨‍💻 Developed By

## TEAM THE CODING CREW

Collaborative college semester project developed for academic purposes.
