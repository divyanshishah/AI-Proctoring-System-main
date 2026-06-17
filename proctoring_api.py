from flask import Flask, jsonify
from flask_cors import CORS
import cv2
import numpy as np
import threading
import time

app = Flask(__name__)
CORS(app)

class FaceDetector:
    def __init__(self):
        # Load Haar Cascade classifier
        self.face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
        self.cap = cv2.VideoCapture(0)
        
        # Check if camera opened
        if not self.cap.isOpened():
            raise Exception("❌ Could not open webcam")
        
        # Set camera properties for better quality
        self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
        self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
        self.cap.set(cv2.CAP_PROP_FPS, 30)
    
    def detect_faces(self):
        """Capture single frame and detect faces"""
        ret, frame = self.cap.read()
        if not ret:
            return {"face_count": 0, "status": "Camera error"}
        
        # Convert to grayscale
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        
        # Detect faces
        faces = self.face_cascade.detectMultiScale(
            gray,
            scaleFactor=1.1,
            minNeighbors=5,
            minSize=(30, 30)
        )
        
        face_count = len(faces)
        print("Faces detected:", face_count)
        
        # Determine status
        if face_count == 0:
            status = "No face detected"
        elif face_count == 1:
            status = "One face detected ✓"
        else:
            status = f"Multiple faces detected ({face_count}) ⚠️"
        
        return {
            "face_count": face_count,
            "status": status,
            "timestamp": time.time()
        }
    
    def __del__(self):
        """Cleanup camera"""
        if self.cap:
            self.cap.release()

# Initialize global detector (thread-safe for single requests)
detector = None

@app.route("/", methods=['GET'])
def health_check():
    return jsonify({
        "message": "AI Proctoring API - Face Detection Ready",
        "endpoints": ["/", "/detect"]
    }), 200

@app.route("/detect", methods=['GET'])
def detect_face():
    """Single frame face detection endpoint"""
    global detector
    
    try:
        if detector is None:
            detector = FaceDetector()
        
        result = detector.detect_faces()
        return jsonify(result), 200
        
    except Exception as e:
        return jsonify({
            "face_count": 0,
            "status": f"Error: {str(e)}",
            "timestamp": time.time()
        }), 500

@app.route("/status", methods=['GET'])
def status():
    return jsonify({
        "status": "active",
        "service": "AI Proctoring Face Detection",
        "camera": "ready" if detector else "initializing"
    }), 200

if __name__ == "__main__":
    print("🚀 Starting AI Proctoring Face Detection API...")
    print("📡 Endpoints:")
    print("   GET /          - Health check")
    print("   GET /detect    - Single frame face detection")
    print("   GET /status    - API status")
    print("\n🎥 Make sure webcam is connected and not in use!")
    
    app.run(
        host="0.0.0.0",
        port=5000,
        debug=True
    )