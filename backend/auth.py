"""
auth.py — Authentication Blueprint
====================================
Handles student & admin registration, login, and profile management.
Uses Werkzeug for password hashing and Flask-JWT-Extended for tokens.

Endpoints:
  POST /api/auth/register  — Register a new student
  POST /api/auth/login     — Login (student or admin)
  GET  /api/auth/me        — Get current user profile
  PUT  /api/auth/me        — Update profile
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import (
    create_access_token, jwt_required, get_jwt_identity, get_jwt
)
from werkzeug.security import generate_password_hash, check_password_hash
from models import db, User

auth_bp = Blueprint("auth", __name__)


# ─────────────────────────────────────────────────────────────────────────────
#  POST /api/auth/register
# ─────────────────────────────────────────────────────────────────────────────

@auth_bp.route("/register", methods=["POST"])
def register():
    """Register a new student account."""
    data = request.get_json(silent=True) or {}

    # Validate required fields
    required = ["username", "email", "password", "full_name"]
    missing  = [f for f in required if not data.get(f)]
    if missing:
        return jsonify({"error": f"Missing fields: {', '.join(missing)}"}), 400

    # Check uniqueness
    if User.query.filter_by(username=data["username"]).first():
        return jsonify({"error": "Username already taken"}), 409
    if User.query.filter_by(email=data["email"]).first():
        return jsonify({"error": "Email already registered"}), 409

    # Create user
    user = User(
        username      = data["username"].strip().lower(),
        full_name     = data["full_name"].strip(),
        email         = data["email"].strip().lower(),
        password_hash = generate_password_hash(data["password"]),
        role          = "student",   # self-registration is always student
        student_id    = data.get("student_id", "").strip() or None,
        department    = data.get("department", "").strip() or None,
    )
    db.session.add(user)
    db.session.commit()

    # Issue token immediately so user lands on dashboard
    token = create_access_token(
        identity=str(user.id),
        additional_claims={"role": user.role}
    )

    return jsonify({
        "message": "Registration successful",
        "token":   token,
        "user":    user.to_dict(),
    }), 201


# ─────────────────────────────────────────────────────────────────────────────
#  POST /api/auth/login
# ─────────────────────────────────────────────────────────────────────────────

@auth_bp.route("/login", methods=["POST"])
def login():
    """Authenticate a user and return a JWT access token."""
    data = request.get_json(silent=True) or {}

    email_or_username = data.get("email", "").strip().lower()
    password          = data.get("password", "")

    if not email_or_username or not password:
        return jsonify({"error": "Email/Username and password are required"}), 400

    # Search by email or username
    user = User.query.filter(
        (User.email == email_or_username) | (User.username == email_or_username)
    ).first()

    if not user or not check_password_hash(user.password_hash, password):
        print(f"❌ LOGIN FAILED: {email_or_username} (User found: {user is not None})")
        return jsonify({"error": "Invalid email or password"}), 401

    if not user.is_active:
        return jsonify({"error": "Account is deactivated. Contact admin."}), 403

    token = create_access_token(
        identity=str(user.id),
        additional_claims={"role": user.role, "username": user.username}
    )

    return jsonify({
        "message": "Login successful",
        "token":   token,
        "user":    user.to_dict(),
    }), 200


# ─────────────────────────────────────────────────────────────────────────────
#  GET /api/auth/me
# ─────────────────────────────────────────────────────────────────────────────

@auth_bp.route("/me", methods=["GET"])
@jwt_required()
def get_me():
    """Return the current authenticated user's profile."""
    user_id = int(get_jwt_identity())
    user    = User.query.get_or_404(user_id)
    return jsonify({"user": user.to_dict()}), 200


# ─────────────────────────────────────────────────────────────────────────────
#  PUT /api/auth/me
# ─────────────────────────────────────────────────────────────────────────────

@auth_bp.route("/me", methods=["PUT"])
@jwt_required()
def update_me():
    """Update the current user's profile (full_name, department, password)."""
    user_id = int(get_jwt_identity())
    user    = User.query.get_or_404(user_id)
    data    = request.get_json(silent=True) or {}

    if "full_name"   in data: user.full_name   = data["full_name"].strip()
    if "department"  in data: user.department   = data["department"].strip()
    if "student_id"  in data: user.student_id   = data["student_id"].strip() or None

    # Password change — require current password
    if "new_password" in data:
        if not data.get("current_password"):
            return jsonify({"error": "current_password required to set a new password"}), 400
        if not check_password_hash(user.password_hash, data["current_password"]):
            return jsonify({"error": "Current password is incorrect"}), 401
        user.password_hash = generate_password_hash(data["new_password"])

    db.session.commit()
    return jsonify({"message": "Profile updated", "user": user.to_dict()}), 200


# ─────────────────────────────────────────────────────────────────────────────
#  GET /api/auth/users  (admin only)
# ─────────────────────────────────────────────────────────────────────────────

@auth_bp.route("/users", methods=["GET"])
@jwt_required()
def list_users():
    """List all users — admin only."""
    claims = get_jwt()
    if claims.get("role") != "admin":
        return jsonify({"error": "Admin access required"}), 403

    users = User.query.order_by(User.created_at.desc()).all()
    return jsonify({"users": [u.to_dict() for u in users]}), 200


# ─────────────────────────────────────────────────────────────────────────────
#  DELETE /api/auth/users/<id>  (admin only)
# ─────────────────────────────────────────────────────────────────────────────

@auth_bp.route("/users/<int:user_id>", methods=["DELETE"])
@jwt_required()
def delete_user(user_id):
    """Deactivate (soft-delete) a student account — admin only."""
    claims = get_jwt()
    if claims.get("role") != "admin":
        return jsonify({"error": "Admin access required"}), 403

    user = User.query.get_or_404(user_id)
    if user.role == "admin":
        return jsonify({"error": "Cannot deactivate an admin account"}), 403

    user.is_active = False
    db.session.commit()
    return jsonify({"message": f"User {user.username} deactivated"}), 200
