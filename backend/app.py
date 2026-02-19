from flask import Flask, request, jsonify, send_from_directory, render_template
from flask_socketio import SocketIO, emit, join_room, leave_room
from flask_cors import CORS
import base64
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import json, ssl
import socket
import os
import shutil
import random
import urllib.request
import urllib.error
import requests
import ssl
import uuid
from typing import List, Dict
import chat_handler


# Initialize Flask app and SocketIO
app = Flask(__name__, static_folder='frontend')
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*")
host_ip = socket.gethostbyname(socket.gethostname())

@socketio.on('connect')
def handle_connect():
    print(f"Client connected: {request.sid}")

@socketio.on('disconnect')
def handle_disconnect():
    print(f"Client disconnected: {request.sid}")
    # Find and remove user from online_users
    username_to_remove = None
    for uname, sid in online_users.items():
        if sid == request.sid:
            username_to_remove = uname
            break
    if username_to_remove:
        del online_users[username_to_remove]
        
        # Update last_active in persistent storage
        try:
            users = load_users()
            for u in users:
                if u['username'] == username_to_remove:
                    u['last_active'] = int(__import__('time').time())
                    break
            save_users(users)
        except Exception as e:
            print(f"Error updating last_active: {e}")

        # Broadcast offline status
        socketio.emit('user_status_change', {
            'username': username_to_remove, 
            'status': 'offline',
            'last_active': int(__import__('time').time())
        })

@socketio.on('update_status')
def handle_update_status(data):
    username = data.get('username')
    status = data.get('status') # 'online', 'away'
    
    if username and username in online_users:
        socketio.emit('user_status_change', {
            'username': username,
            'status': status
        })

# In-memory online users: { username: sid }
online_users = {}

# Session management: { token: { username, created_at, expires_at } }
active_sessions = {}
SESSION_EXPIRY_HOURS = 24

import time as _time

def create_session(username):
    """Create a new session token for a user."""
    token = str(uuid.uuid4())
    now = int(_time.time())
    active_sessions[token] = {
        "username": username,
        "created_at": now,
        "expires_at": now + (SESSION_EXPIRY_HOURS * 3600)
    }
    return token

def validate_session(token):
    """Validate a session token. Returns username if valid, None otherwise."""
    if not token or token not in active_sessions:
        return None
    session = active_sessions[token]
    if int(_time.time()) > session["expires_at"]:
        # Session expired, remove it
        del active_sessions[token]
        return None
    return session["username"]

def invalidate_session(token):
    """Invalidate/logout a session."""
    if token in active_sessions:
        del active_sessions[token]
        return True
    return False

def cleanup_expired_sessions():
    """Remove all expired sessions."""
    now = int(_time.time())
    expired = [t for t, s in active_sessions.items() if now > s["expires_at"]]
    for t in expired:
        del active_sessions[t]

@socketio.on('register_status')
def on_register_status(data):
    username = (data or {}).get('username')
    if username:
        online_users[username] = request.sid
        join_room(f"user_{username}")
        socketio.emit('user_status_change', {'username': username, 'status': 'online'})
        print(f"User {username} is now online")

@socketio.on('join')
def on_join(data):
    room = data.get('room')
    if room:
        join_room(room)
        print(f"Client {request.sid} joined room: {room}")

@socketio.on('leave')
def on_leave(data):
    room = data.get('room')
    if room:
        leave_room(room)
        print(f"Client {request.sid} left room: {room}")

# File paths and user data
BASE_DIR = os.path.abspath(os.path.dirname(__file__))

# Persisted app data (JSON, SQLite, etc.) should live under backend/ now
DATA_DIR = os.path.join(BASE_DIR, 'data')
UPLOADS_DIR = os.path.join(BASE_DIR, 'uploads')
USER_DATA_FILE = os.path.join(DATA_DIR, 'users.json')
FRONTEND_DIR = os.path.join(BASE_DIR, '../frontend')
MESSAGES_FILE = os.path.join(DATA_DIR, "messages.json")
DMS_FILE = os.path.join(DATA_DIR, "dms.json")
GROUPS_FILE = os.path.join(DATA_DIR, 'groups.json')
EXPLORE_FILE = os.path.join(DATA_DIR, 'explore.json')
os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(UPLOADS_DIR, exist_ok=True)

# ---- AI modules (personas, memory, learner) ----
try:
    from ai.personas import list_personas as ai_list_personas, pick_persona
    from ai.memory import (
        get_user_memory,
        append_conversation as memory_append_conversation,
        upsert_fact as memory_upsert_fact,
        set_preference as memory_set_preference,
        clear_user_memory as memory_clear_user,
    )
    from ai.learner import PersonaLearner
    from ai.model_manager import model_manager
except Exception:
    ai_list_personas = lambda: [
        {"key": "helper", "name": "Helper AI", "style": "helpful, structured"},
        {"key": "friend", "name": "Friend AI", "style": "friendly, empathetic"},
        {"key": "supporter", "name": "Supporter AI", "style": "encouraging, motivational"},
    ]
    def pick_persona(key: str | None, mode: str | None = None):
        class _P:
            def __init__(self, key: str):
                self.key = key or 'helper'
                self.name = 'Helper AI'
                self.style = 'helpful, structured'
                self.system_prompt = (
                    "You are Helper AI. Provide step-by-step guidance with numbered lists,"
                    " call out assumptions, and propose next actions."
                )
        return _P(key)
    def get_user_memory(username: str):
        return {"facts": [], "preferences": {}, "conversations": []}
    def memory_append_conversation(username: str, messages: List[Dict[str, str]], max_keep: int = 50):
        return None
    def memory_upsert_fact(username: str, fact: str):
        return None
    def memory_set_preference(username: str, key: str, value):
        return None
    def memory_clear_user(username: str):
        return None
    class PersonaLearner:  # type: ignore
        def __init__(self, base_dir: str):
            self.base_dir = base_dir
        def train_on_feedback(self, persona: str, user: str, prompt: str, target_phrase: str, epochs: int = 8):
            return None
        def suggest_phrase(self, persona: str, user: str, prompt: str):
            return None

# Instance to persist learned tiny models (if torch available)
AI_LEARN_DIR = os.path.join(DATA_DIR, 'ai_learn')
persona_learner = PersonaLearner(AI_LEARN_DIR)

# One-time migration for older deployments that stored folders at repo root
def _migrate_storage_dirs():
    try:
        old_uploads = os.path.join(BASE_DIR, '..', 'uploads')
        if os.path.isdir(old_uploads):
            # Move children to new uploads directory
            for name in os.listdir(old_uploads):
                src = os.path.join(old_uploads, name)
                dst = os.path.join(UPLOADS_DIR, name)
                if not os.path.exists(dst):
                    try:
                        shutil.move(src, dst)
                    except Exception:
                        pass
            try:
                os.rmdir(old_uploads)
            except Exception:
                pass

        old_data = os.path.join(BASE_DIR, '..', 'data')
        if os.path.isdir(old_data):
            for name in ("users.json", "messages.json", "groups.json", "explore.json"):
                src = os.path.join(old_data, name)
                dst = os.path.join(DATA_DIR, name)
                if os.path.exists(src) and not os.path.exists(dst):
                    try:
                        shutil.move(src, dst)
                    except Exception:
                        pass
            try:
                # If directory is empty after moving, remove it
                if not os.listdir(old_data):
                    os.rmdir(old_data)
            except Exception:
                pass
    except Exception:
        # Never block startup on migration
        pass

_migrate_storage_dirs()

# Helper functions
def load_users():
    if not os.path.exists(USER_DATA_FILE):
        return []
    with open(USER_DATA_FILE, "r") as file:
        return json.load(file)

def save_users(users):
    with open(USER_DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(users, f, indent=2)

def save_user(username, email, password):
    users = load_users()
    for user in users:
        if user["username"] == username or user.get("email") == email:
            return False  # Username already exists
    users.append({"username": username, "email": email, "password": password})
    
    with open(USER_DATA_FILE, "w") as file:
        json.dump(users, file, indent=2)
    return True

def load_messages():
    if not os.path.exists(MESSAGES_FILE):
        return []
    with open(MESSAGES_FILE, "r", encoding="utf-8") as f:
        return json.load(f)

def save_messages(messages):
    with open(MESSAGES_FILE, "w", encoding="utf-8") as f:
        json.dump(messages, f, indent=2)

# ---- Direct Messages (DMs) helpers ----
def load_dms():
    """Load direct messages from persistent storage."""
    if not os.path.exists(DMS_FILE):
        # Initialize empty file for first-time startup
        with open(DMS_FILE, 'w', encoding='utf-8') as f:
            json.dump([], f)
        return []
    try:
        with open(DMS_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception:
        return []

def save_dms(dms_list):
    """Persist direct messages to disk."""
    with open(DMS_FILE, 'w', encoding='utf-8') as f:
        json.dump(dms_list, f, indent=2)

# Group storage helpers
def load_groups():
    if not os.path.exists(GROUPS_FILE):
        with open(GROUPS_FILE, 'w', encoding='utf-8') as f:
            json.dump([], f)
        return []
    try:
        with open(GROUPS_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception:
        return []

def save_groups(groups):
    with open(GROUPS_FILE, 'w', encoding='utf-8') as f:
        json.dump(groups, f, indent=2)

# Explore storage helpers
def load_explore():
    if not os.path.exists(EXPLORE_FILE):
        with open(EXPLORE_FILE, 'w', encoding='utf-8') as f:
            json.dump([], f)
        return []
    try:
        with open(EXPLORE_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception:
        return []

def save_explore(posts):
    with open(EXPLORE_FILE, 'w', encoding='utf-8') as f:
        json.dump(posts, f, indent=2)


def http_post_json(url: str, payload: dict, timeout: int = 30) -> dict:
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})

    # Only use SSL context for HTTPS
    if url.startswith("https://"):
        context = ssl.create_default_context()
        resp = urllib.request.urlopen(req, timeout=timeout, context=context)
    else:
        resp = urllib.request.urlopen(req, timeout=timeout)

    with resp:
        raw = resp.read()
        return json.loads(raw.decode("utf-8"))

def http_get_json(url: str, timeout: int = 10) -> dict:
    req = urllib.request.Request(url)
    if url.startswith("https://"):
        context = ssl.create_default_context()
        resp = urllib.request.urlopen(req, timeout=timeout, context=context)
    else:
        resp = urllib.request.urlopen(req, timeout=timeout)  # no SSL context for plain HTTP

    with resp:
        raw = resp.read()
        return json.loads(raw.decode("utf-8"))

def send_reset_email(to_email, reset_link):
    from_email = os.getenv("Zylo_SMTP_FROM", "zylosupp0rt@gmail.com")
    password = os.getenv("Zylo_SMTP_PASSWORD", "kgawzxrfthcytgfu")

    subject = "🔐 Reset Your Zylo Password"

    html_body = f"""
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
           body {{ font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f3f4f6; color: #1f2937; margin: 0; padding: 0; }}
           .container {{ max-width: 500px; margin: 40px auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05); }}
           .header {{ background: linear-gradient(135deg, #2563eb, #7c3aed); padding: 30px 20px; text-align: center; color: white; }}
           .header h1 {{ margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px; }}
           .content {{ padding: 30px; line-height: 1.6; }}
           .btn {{ display: block; width: fit-content; margin: 30px auto; background: #2563eb; color: #ffffff !important; padding: 12px 30px; border-radius: 8px; font-weight: 600; text-decoration: none; text-align: center; transition: background 0.2s; }}
           .btn:hover {{ background: #1d4ed8; }}
           .footer {{ background: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; border-top: 1px solid #e5e7eb; }}
           .link-fallback {{ font-size: 12px; color: #6b7280; word-break: break-all; margin-top: 20px; }}
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Zylo Security</h1>
          </div>
          <div class="content">
            <h2 style="margin-top: 0; color: #111827;">Password Reset Request</h2>
            <p>Hello,</p>
            <p>We received a request to reset the password for your Zylo account. If you didn't make this request, you can safely ignore this email.</p>
            
            <a href="{reset_link}" class="btn">Reset My Password</a>
            
            <p>For your security, this link expires in 30 minutes.</p>
            
            <div class="link-fallback">
              <p>Button not working? Copy and paste this link:</p>
              <a href="{reset_link}" style="color: #2563eb;">{reset_link}</a>
            </div>
          </div>
          <div class="footer">
            &copy; {int(__import__('datetime').datetime.now().year)} Zylo Inc. All rights reserved.<br>
            If you need help, reply to this email.
          </div>
        </div>
      </body>
    </html>
    """

    message = MIMEMultipart("alternative")
    message["Subject"] = subject
    message["From"] = from_email
    message["To"] = to_email
    message.attach(MIMEText(html_body, "html"))

    try:
        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
            server.login(from_email, password)
            server.send_message(message)
    except Exception as e:
        print(f"Failed to send reset email: {e}")

def send_verification_email(to_email, code):
    from_email = os.getenv("Zylo_SMTP_FROM", "zylosupp0rt@gmail.com")
    password = os.getenv("Zylo_SMTP_PASSWORD", "kgawzxrfthcytgfu")

    subject = "✨ Verify Your Zylo Account"

    html_body = f"""
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
           body {{ font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f3f4f6; color: #1f2937; margin: 0; padding: 0; }}
           .container {{ max-width: 500px; margin: 40px auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05); }}
           .header {{ background: linear-gradient(135deg, #10b981, #3b82f6); padding: 30px 20px; text-align: center; color: white; }}
           .header h1 {{ margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px; }}
           .content {{ padding: 30px; line-height: 1.6; text-align: center; }}
           .code-box {{ background: #f3f4f6; border: 2px dashed #d1d5db; padding: 20px; font-size: 32px; font-family: 'Courier New', monospace; font-weight: bold; letter-spacing: 5px; color: #111827; margin: 20px 0; border-radius: 8px; }}
           .footer {{ background: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; border-top: 1px solid #e5e7eb; }}
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to Zylo!</h1>
          </div>
          <div class="content">
            <h2 style="margin-top: 0; color: #111827;">Verify Your Email</h2>
            <p>Thanks for joining! To finish setting up your account, please enter the following code in the app:</p>
            
            <div class="code-box">
              {code}
            </div>
            
            <p style="color: #6b7280; font-size: 14px;">This code will expire in 24 hours.</p>
          </div>
          <div class="footer">
            &copy; {int(__import__('datetime').datetime.now().year)} Zylo Inc. All rights reserved.<br>
            Need help? Contact support.
          </div>
        </div>
      </body>
    </html>
    """

    message = MIMEMultipart("alternative")
    message["Subject"] = subject
    message["From"] = from_email
    message["To"] = to_email
    message.attach(MIMEText(html_body, "html"))

    try:
        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
            server.login(from_email, password)
            server.send_message(message)
    except Exception as e:
        print(f"Failed to send verification email: {e}")
        
# Load existing messages and groups
messages = load_messages()
groups = load_groups()
dms = load_dms()

# API Endpoints
@app.route("/api/signup", methods=["POST"])
def signup():
    data = request.get_json()

    username = data.get("username")
    email = data.get("email")
    password = data.get("password")
    dob = data.get("dob", "")
    gender = data.get("gender", "")
    phone = data.get("phone", "")
    avatar_data = data.get("avatar")
    banner_data = data.get("banner")
    
    raw_tag = (data.get("usertag") or "").strip()
    if raw_tag:
        usertag = "@" + raw_tag.lstrip("@")
    else:
        usertag = f"@{username.lower()}{random.randint(1000, 9999)}"

    if not username or not email or not password:
        return jsonify({"success": False, "error": "Missing required fields."}), 400

    # Load existing users
    if not os.path.exists(USER_DATA_FILE):
        with open(USER_DATA_FILE, "w") as f:
            json.dump([], f)

    with open(USER_DATA_FILE, "r") as f:
        users = json.load(f)

    for user in users:
        if user["username"] == username:
            return jsonify({"success": False, "error": "Username already exists."}), 409
        if user["email"] == email:
            return jsonify({"success": False, "error": "Email already registered."}), 409

    # Process avatar and banner uploads
    avatar_url = "/images/default_avatar.png"
    banner_url = "/images/default_banner.png"
    
    if avatar_data and avatar_data.startswith("data:"):
        # Save avatar to uploads directory
        user_upload_dir = os.path.join(UPLOADS_DIR, username)
        os.makedirs(user_upload_dir, exist_ok=True)
        avatar_url = _save_data_url_for_user(username, avatar_data, "avatar.png")
        if not avatar_url:
            avatar_url = "/images/default_avatar.png"
    
    if banner_data and banner_data.startswith("data:"):
        # Save banner to uploads directory
        user_upload_dir = os.path.join(UPLOADS_DIR, username)
        os.makedirs(user_upload_dir, exist_ok=True)
        banner_url = _save_data_url_for_user(username, banner_data, "banner.png")
        if not banner_url:
            banner_url = "/images/default_banner.png"

    # Generate email verification code
    verification_code = str(random.randint(100000, 999999))
    
    new_user = {
        "username": username,
        "email": email,
        "password": password,
        "usertag": usertag,
        "dob": dob,
        "gender": gender,
        "phone": phone,
        "avatar": avatar_url,
        "banner": banner_url,
        "email_verified": False,
        "verification_code": verification_code
    }

    users.append(new_user)

    with open(USER_DATA_FILE, "w") as f:
        json.dump(users, f, indent=2)

    with open(USER_DATA_FILE, "w") as f:
        json.dump(users, f, indent=2)

    # Send verification email
    send_verification_email(email, verification_code)

    return jsonify({
        "success": True, 
        "message": "Account created! Please verify your email."
    })

@app.route("/api/auth/social", methods=["POST"])
def social_login():
    data = request.json or {}
    provider = data.get("provider")
    
    if not provider:
        return jsonify({"success": False, "error": "Provider required"}), 400
        
    # Simulate network delay
    import time
    time.sleep(1.2)
    
    # Generate a consistent fake user for development
    # In a real app, we'd validate the OAuth token here
    base_name = f"{provider}User"
    demo_email = f"{base_name.lower()}@example.com"
    
    users = load_users()
    target_user = None
    
    # Check if this social user already exists
    for u in users:
        if u.get("email") == demo_email:
            target_user = u
            break
            
    if not target_user:
        # Create new social user
        new_username = f"{base_name}_{random.randint(100, 999)}"
        avatar_map = {
            "Google": "/images/devicons/google-original.svg",
            "GitHub": "/images/devicons/github-original.svg",
            "Discord": "/images/devicons/discordjs-original.svg",
            "Microsoft": "/images/devicons/windows8-original.svg"
        }
        
        target_user = {
            "username": new_username,
            "email": demo_email,
            "password": f"social_login_{uuid.uuid4()}", # Random complex password
            "usertag": f"@{new_username}",
            "avatar": avatar_map.get(provider, "/images/default_avatar.png"),
            "banner": "/images/default_banner.png",
            "provider": provider
        }
        users.append(target_user)
        try:
            with open(USER_DATA_FILE, "w") as f:
                json.dump(users, f, indent=2)
        except Exception as e:
            return jsonify({"success": False, "error": "Database error"}), 500
            
    # Create session token for social login
    token = create_session(target_user["username"])
    return jsonify({
        "success": True, 
        "username": target_user["username"], 
        "usertag": target_user.get("usertag", ""),
        "session_token": token,
        "message": f"Successfully logged in with {provider}"
    })

@app.route("/api/login", methods=["POST"])
def login():
    data = request.json
    identifier = data.get("identifier")
    password = data.get("password")
    users = load_users()
    for user in users:
        if (user["username"] == identifier or user.get("email") == identifier) and user["password"] == password:
            # Check if 2FA is enabled
            if user.get("twofa_enabled"):
                return jsonify({
                    "success": False, 
                    "requires_2fa": True, 
                    "username": user["username"],
                    "message": "2FA verification required"
                })
            # Create session token
            token = create_session(user["username"])
            
            # Refresh badges
            check_badges(user["username"])
            
            return jsonify({
                "success": True, 
                "username": user["username"], 
                "usertag": user.get("usertag", ""),
                "session_token": token
            })
    return jsonify({"success": False, "error": "Invalid credentials"}), 401

@app.route("/api/auth/validate-session", methods=["POST"])
def validate_session_endpoint():
    data = request.json or {}
    token = data.get("token")
    
    if not token:
        return jsonify({"valid": False, "error": "Token required"}), 400
    
    username = validate_session(token)
    if username:
        return jsonify({"valid": True, "username": username})
    else:
        return jsonify({"valid": False, "error": "Invalid or expired session"}), 401

@app.route("/api/auth/logout", methods=["POST"])
def logout():
    data = request.json or {}
    token = data.get("token")
    
    if not token:
        return jsonify({"success": False, "error": "Token required"}), 400
    
    if invalidate_session(token):
        return jsonify({"success": True, "message": "Logged out successfully"})
    else:
        return jsonify({"success": False, "error": "Session not found"}), 404

@app.route("/api/auth/2fa/enable", methods=["POST"])
def enable_2fa():
    data = request.json or {}
    username = data.get("username")
    
    if not username:
        return jsonify({"success": False, "error": "Username required"}), 400
    
    users = load_users()
    updated = False
    
    for user in users:
        if user["username"] == username:
            # Generate a mock secret (in production, use pyotp.random_base32())
            mock_secret = f"ZYLO{random.randint(100000, 999999)}SECRET"
            user["twofa_enabled"] = True
            user["twofa_secret"] = mock_secret
            updated = True
            break
    
    if updated:
        save_users(users)
        return jsonify({
            "success": True, 
            "secret": mock_secret,
            "message": "2FA enabled. Use code 123456 for testing."
        })
    
    return jsonify({"success": False, "error": "User not found"}), 404

@app.route("/api/auth/2fa/disable", methods=["POST"])
def disable_2fa():
    data = request.json or {}
    username = data.get("username")
    
    if not username:
        return jsonify({"success": False, "error": "Username required"}), 400
    
    users = load_users()
    updated = False
    
    for user in users:
        if user["username"] == username:
            user["twofa_enabled"] = False
            user.pop("twofa_secret", None)
            updated = True
            break
    
    if updated:
        save_users(users)
        return jsonify({"success": True, "message": "2FA disabled"})
    
    return jsonify({"success": False, "error": "User not found"}), 404

@app.route("/api/auth/2fa/verify", methods=["POST"])
def verify_2fa():
    data = request.json or {}
    username = data.get("username")
    code = data.get("code", "")
    
    if not username or not code:
        return jsonify({"success": False, "error": "Username and code required"}), 400
    
    users = load_users()
    
    for user in users:
        if user["username"] == username:
            if not user.get("twofa_enabled"):
                return jsonify({"success": False, "error": "2FA not enabled"}), 400
            
            # Simulated verification: accept any 6-digit code or "123456"
            if len(code) == 6 and code.isdigit():
                token = create_session(user["username"])
                return jsonify({
                    "success": True, 
                    "username": user["username"], 
                    "usertag": user.get("usertag", ""),
                    "session_token": token,
                    "message": "2FA verified"
                })
            else:
                return jsonify({"success": False, "error": "Invalid code format"}), 400
    
    return jsonify({"success": False, "error": "User not found"}), 404

@app.route("/api/auth/verify-email", methods=["POST"])
def verify_email():
    data = request.json or {}
    username = data.get("username")
    code = data.get("code", "")
    
    if not username or not code:
        return jsonify({"success": False, "error": "Username and code required"}), 400
    
    users = load_users()
    
    for user in users:
        if user["username"] == username:
            if user.get("email_verified"):
                return jsonify({"success": True, "message": "Email already verified"})
            
            if user.get("verification_code") == code:
                user["email_verified"] = True
                user.pop("verification_code", None)  # Remove code after verification
                save_users(users)
                
                # Grant verified badge
                check_badges(username)
                
                return jsonify({"success": True, "message": "Email verified successfully!"})
            else:
                return jsonify({"success": False, "error": "Invalid verification code"}), 400
    
    return jsonify({"success": False, "error": "User not found"}), 404

@app.route("/api/auth/resend-verification", methods=["POST"])
def resend_verification():
    data = request.json or {}
    email = data.get("email")
    
    if not email:
        return jsonify({"success": False, "error": "Email required"}), 400
        
    users = load_users()
    for user in users:
        if user["email"] == email:
            if user.get("email_verified"):
                return jsonify({"success": False, "error": "Email already verified"}), 400
                
            # Generate new code
            verification_code = str(random.randint(100000, 999999))
            user["verification_code"] = verification_code
            save_users(users)
            
            send_verification_email(email, verification_code)
            return jsonify({"success": True, "message": "Verification code resent."})
            
    return jsonify({"success": False, "error": "Email not found"}), 404



@app.route("/api/forgot", methods=["POST"])
def forgot():
    data = request.get_json()
    identifier = data.get("identifier")

    with open(USER_DATA_FILE, "r") as f:
        users = json.load(f)

    for user in users:
        if user.get("username") == identifier or user.get("email") == identifier:
            reset_link = f"http://{host_ip}:5000/reset.html?user={user['username']}"
            send_reset_email(user.get("email"), reset_link)
            return jsonify({"success": True})

    return jsonify({"success": False, "error": "User not found."}), 404


@app.route("/api/reset", methods=["POST"])
def reset_password():
    data = request.json
    username = data.get("username")
    new_password = data.get("newPassword")
    
    if not username or not new_password:
        return jsonify({"success": False, "error": "Missing username or password"}), 400

    users = load_users()
    updated = False
    for user in users:
        if user["username"] == username:
            user["password"] = new_password
            updated = True
            break

    if updated:
        with open(USER_DATA_FILE, "w") as f:
            json.dump(users, f, indent=2)
        return jsonify({"success": True})
    else:
        return jsonify({"success": False, "error": "Username not found"}), 404
    
@app.route("/api/messages", methods=["GET", "POST"])
def messages_api():
    if request.method == 'GET':
        return jsonify(messages)
    
    # POST - Send community message
    data = request.json or {}
    username = (data.get('username') or '').strip()
    message = data.get('message')
    
    if not username or not message:
        return jsonify({"success": False, "error": "Missing fields"}), 400
        
    msg_entry = {
        "id": data.get('id'),
        "username": username,
        "message": message,
        "replyTo": data.get('replyTo'),
        "type": data.get('type', 'text'),
        "sticker_src": data.get('sticker_src'),
        "timestamp": int(__import__('time').time()),
        "room": "community"
    }
    
    messages.append(msg_entry)
    save_messages(messages)
    
    # Emit to 'community' room
    socketio.emit('message', msg_entry, room='community')
    
    return jsonify({"success": True, "message": msg_entry})

@app.route("/api/messages/delete", methods=["POST"])
def delete_community_message():
    """Delete a community message by ID or timestamp."""
    global messages
    data = request.json or {}
    msg_id = data.get('id')
    username = data.get('username', '')
    timestamp = data.get('timestamp')

    if not msg_id and not timestamp:
        return jsonify({"success": False, "error": "Message ID or timestamp required"}), 400

    original_len = len(messages)
    messages = [m for m in messages if not (
        (msg_id and m.get('id') == msg_id) or
        (timestamp and m.get('timestamp') == timestamp and m.get('username') == username)
    )]

    if len(messages) < original_len:
        save_messages(messages)
        socketio.emit('message_deleted', {'id': msg_id, 'timestamp': timestamp}, room='community')
        return jsonify({"success": True})
    return jsonify({"success": False, "error": "Message not found"}), 404

@app.route("/api/dm/delete", methods=["POST"])
def delete_dm_message():
    """Delete a DM message by ID."""
    global dms
    data = request.json or {}
    msg_id = data.get('id')
    username = data.get('username', '')

    if not msg_id:
        return jsonify({"success": False, "error": "Message ID required"}), 400

    original_len = len(dms)
    dms = [m for m in dms if not (m.get('id') == msg_id and m.get('from') == username)]

    if len(dms) < original_len:
        save_dms(dms)
        return jsonify({"success": True})
    return jsonify({"success": False, "error": "Message not found"}), 404

# Get list of currently online users
@app.route("/api/users/online", methods=["GET"])
def users_online():
    return jsonify({"success": True, "online": list(online_users.keys())})

# Direct Message (DM) endpoint
@app.route("/api/dm", methods=["POST", "GET"])
def dm_messages():
    """Send or retrieve direct messages."""
    global dms
    
    if request.method == "GET":
        # Get DMs between two users
        from_user = request.args.get('from', '').strip()
        to_user = request.args.get('to', '').strip()
        if not from_user or not to_user:
            return jsonify({"success": False, "error": "Missing from/to params"})
        
        # Filter DMs between these users
        relevant = [m for m in dms if 
            (m.get('from') == from_user and m.get('to') == to_user) or
            (m.get('from') == to_user and m.get('to') == from_user)
        ]
        return jsonify({"success": True, "messages": relevant})
    
    # POST - send a new DM
    data = request.get_json(silent=True) or {}
    from_user = (data.get('from') or '').strip()
    to_user = (data.get('to') or '').strip()
    message = data.get('message', '')
    msg_type = data.get('type', 'text')
    sticker_src = data.get('sticker_src')
    
    if not from_user or not to_user:
        return jsonify({"success": False, "error": "Missing from/to"}), 400
    
    dm_entry = {
        'from': from_user,
        'to': to_user,
        'message': message,
        'type': msg_type,
        'ts': __import__('time').time(),
        'id': str(uuid.uuid4()),
        'status': 'sent'
    }
    if sticker_src:
        dm_entry['sticker_src'] = sticker_src
    
    dms.append(dm_entry)
    save_dms(dms)
    
    # Emit via socket for real-time delivery
    try:
        socketio.emit('receive_dm', dm_entry, room=f"dm:{to_user}")
        socketio.emit('receive_dm', dm_entry, room=f"dm:{from_user}")
    except:
        pass
    
    return jsonify({"success": True, "message": dm_entry})

# File Upload Endpoint (New Phase 4)
@app.route("/api/upload", methods=["POST"])
def upload_file():
    if 'file' not in request.files:
        return jsonify({"success": False, "error": "No file part"}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({"success": False, "error": "No selected file"}), 400
    
    if file:
        try:
            filename = file.filename
            # Simple sanitization
            filename = "".join([c for c in filename if c.isalpha() or c.isdigit() or c in (' ','.','_','-')]).strip()
            # Unique prefix
            unique_name = f"{uuid.uuid4().hex[:8]}_{filename}"
            save_path = os.path.join(UPLOADS_DIR, unique_name)
            file.save(save_path)
            
            # Determine file type category
            mime_type = file.content_type
            file_type = "file"
            if mime_type.startswith("image/"):
                file_type = "image"
            elif mime_type.startswith("video/"):
                file_type = "video"
            elif mime_type.startswith("audio/"):
                file_type = "audio"
                
            return jsonify({
                "success": True, 
                "url": f"/uploads/{unique_name}", 
                "filename": filename, 
                "fileType": file_type,
                "originalName": file.filename
            })
        except Exception as e:
            return jsonify({"success": False, "error": str(e)}), 500

@app.route('/uploads/<filename>')
def serve_uploaded_file(filename):
    return send_from_directory(UPLOADS_DIR, filename)

@socketio.on("send_message")
def handle_send_message(data):
    username = data.get("username")
    message = data.get("message")
    attachments = data.get("attachments", []) # List of {url, type, name}

    msg_data = {
        "id": data.get("id") or str(__import__('uuid').uuid4()),
        "username": username, 
        "message": message,
        "attachments": attachments,
        "reactions": {},
        "replyTo": data.get("replyTo"),
        "timestamp": int(_time.time())
    }
    messages.append(msg_data)
    save_messages(messages)
    
    print("Message received from client:", msg_data)
    emit("receive_message", msg_data, broadcast=True)

@socketio.on('register_user')
def register_user(data):
    # Placeholder for per-user rooms in future; currently no-op
    try:
        user = (data or {}).get('username')
        if not user:
            return
        # Could join a personal room like f"user:{user}" if needed
    except Exception:
        pass
    
@socketio.on("send_file")
def handle_send_file(data):
    username = data.get("username")
    file_name = data.get("fileName")
    file_type = data.get("fileType")
    file_data = data.get("fileData")

    msg_data = {
        "type": "file",
        "username": username,
        "fileName": file_name,
        "fileType": file_type,
        "fileData": file_data
    }

    # Save in memory
    print("File message received from client:", msg_data)
    messages.append(msg_data)
    save_messages(messages)

    emit("receive_file", msg_data, broadcast=True)

def _extract_extension_from_data_url(data_url: str) -> str:
    try:
        header = data_url.split(';', 1)[0]  # e.g., data:image/png
        mime = header.split(':', 1)[1]      # image/png
        main, sub = mime.split('/')
        if sub.lower() in ("jpeg", "pjpeg"):
            return "jpg"
        if sub.lower() == "svg+xml":
            return "svg"
        return sub.lower()
    except Exception:
        return "bin"

def _safe_filename(seed: str, ext: str) -> str:
    base = f"{seed}_{random.randint(100000, 999999)}"
    ext = (ext or "").lstrip('.').lower() or "bin"
    return f"{base}.{ext}"

def _save_data_url_for_user(username: str, base64_data: str, filename_hint: str = None) -> str:
    """Save a data URL to backend/uploads/<username>/ and return the public URL path."""
    user_upload_dir = os.path.join(UPLOADS_DIR, username)
    os.makedirs(user_upload_dir, exist_ok=True)
    try:
        header, encoded = base64_data.split(",", 1)
        file_bytes = base64.b64decode(encoded)
        ext = None
        if filename_hint and '.' in filename_hint:
            ext = filename_hint.rsplit('.', 1)[1].lower()
        if not ext:
            ext = _extract_extension_from_data_url(base64_data)
        seed = f"explore_{int(random.random()*1e9)}"
        filename = _safe_filename(seed, ext)
        filepath = os.path.join(user_upload_dir, filename)
        with open(filepath, 'wb') as f:
            f.write(file_bytes)
        return f"/uploads/{username}/{filename}"
    except Exception as e:
        print("Failed to save data URL:", e)
        return None

@socketio.on('join_group')
def handle_join_group(data):
    group_id = (data or {}).get('groupId')
    username = (data or {}).get('username')
    if not group_id or not username:
        return
    for g in load_groups():
        if g.get('id') == group_id and (username in (g.get('members') or []) or username == g.get('owner')):
            join_room(group_id)
            emit('group_joined', { 'groupId': group_id })
            return

@socketio.on('leave_group')
def handle_leave_group(data):
    group_id = (data or {}).get('groupId')
    if not group_id:
        return
    leave_room(group_id)

@socketio.on('send_group_message')
def handle_send_group_message(data):
    group_id = (data or {}).get('groupId')
    username = (data or {}).get('username')
    message = (data or {}).get('message')
    channel = (data or {}).get('channel', 'general')
    msg_id = (data or {}).get('id') or str(uuid.uuid4())
    reply_to = (data or {}).get('replyTo')

    if not group_id or not username or not message:
        return
    all_groups = load_groups()
    for idx, g in enumerate(all_groups):
        if g.get('id') == group_id:
            entry = {
                'id': msg_id,
                'username': username,
                'message': message,
                'channel': channel,
                'replyTo': reply_to,
                'read_by': [username], # Sender has read it
                'ts': int(__import__('time').time())
            }
def handle_send_group_file(data):
    """Handle file sharing within a group room."""
    group_id = (data or {}).get('groupId')
    username = (data or {}).get('username')
    file_name = (data or {}).get('fileName')
    file_type = (data or {}).get('fileType')
    file_data = (data or {}).get('fileData')
    if not group_id or not username or not file_name or not file_data:
        return
    all_groups = load_groups()
    for idx, g in enumerate(all_groups):
        if g.get('id') == group_id:
            entry = {
                'username': username,
                'fileName': file_name,
                'fileType': file_type,
                'fileData': file_data,
            }
            msgs = g.get('messages') or []
            msgs.append(entry)
            all_groups[idx]['messages'] = msgs
            save_groups(all_groups)
            emit('receive_group_file', {
                'groupId': group_id,
                'username': username,
                'fileName': file_name,
                'fileType': file_type,
                'fileData': file_data,
            }, room=group_id)
            return

    
@socketio.on("typing")
def handle_typing(data):
    emit("typing", data, broadcast=True, include_self=False)

@socketio.on('mark_delivered')
def handle_mark_delivered(data):
    msg_id = data.get('id')
    username = data.get('username') # The recipient who received it
    if not msg_id: return
    
    global dms
    updated = False
    target_msg = None
    
    for m in dms:
        if m.get('id') == msg_id:
            # Only update if status is 'sent' (don't downgrade from read)
            if m.get('status') == 'sent':
                m['status'] = 'delivered'
                updated = True
                target_msg = m
            break
            
    if updated and target_msg:
        save_dms(dms)
        # Notify the sender that their message was delivered
        # We need to know who sent it. target_msg['from']
        sender = target_msg.get('from')
        if sender:
            socketio.emit('message_status_update', {
                'id': msg_id,
                'status': 'delivered',
                'peer': username 
            }, room=f"dm:{sender}")

@socketio.on('mark_read')
def handle_mark_read(data):
    # This can mark specific message OR all messages from a user as read
    msg_id = data.get('id')
    reader = data.get('username') # Who is reading
    sender = data.get('sender') # Who sent the messages (if marking all)
    
    global dms
    updated_ids = []
    
    if msg_id:
        for m in dms:
            if m.get('id') == msg_id:
                if m.get('status') != 'read':
                    m['status'] = 'read'
                    updated_ids.append(msg_id)
                    # Notify sender
                    s = m.get('from')
                    if s:
                        socketio.emit('message_status_update', {
                            'id': msg_id,
                            'status': 'read',
                            'peer': reader
                        }, room=f"dm:{s}")
                break
    elif sender and reader:
        # Mark all messages FROM sender TO reader as read
        for m in dms:
            if m.get('from') == sender and m.get('to') == reader and m.get('status') != 'read':
                m['status'] = 'read'
                updated_ids.append(m.get('id'))
                # Notify sender for each or bulk? 
                # Let's emit one bulk update or individual. Individual is safer for existing logic structure.
                socketio.emit('message_status_update', {
                    'id': m.get('id'),
                    'status': 'read',
                    'peer': reader
                }, room=f"dm:{sender}")
    
    if updated_ids:
        save_dms(dms)
    
    
@app.route("/api/stats", methods=["GET"])
def get_stats():
    users = load_users()
    user_count = len(users)
    message_count = len(messages) 
    try:
        current_groups = load_groups()
        # +1 for the public community room
        room_count = (len(current_groups) or 0) + 1
    except Exception:
        room_count = 1

    return jsonify({
        "users": user_count,
        "messages": message_count,
        "rooms": room_count
    })

# Link preview endpoint - fetches OpenGraph metadata
import re as _re
@app.route('/api/link-preview', methods=['GET'])
def link_preview():
    """Fetch OpenGraph metadata from a URL for rich link embeds."""
    url = request.args.get('url', '').strip()
    if not url:
        return jsonify({"success": False, "error": "Missing URL"})
    
    # Security: only allow http/https URLs
    if not url.startswith(('http://', 'https://')):
        return jsonify({"success": False, "error": "Invalid URL scheme"})
    
    try:
        req = urllib.request.Request(url, headers={
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        })
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
        
        with urllib.request.urlopen(req, timeout=5, context=ctx) as response:
            html = response.read(50000).decode('utf-8', errors='ignore')  # Read first 50KB only
        
        # Extract OpenGraph tags using regex
        def get_og_content(tag_name):
            pattern = rf'<meta[^>]*property=["\']og:{tag_name}["\'][^>]*content=["\']([^"\']*)["\']'
            match = _re.search(pattern, html, _re.IGNORECASE)
            if not match:
                # Try alternate format: content before property
                pattern = rf'<meta[^>]*content=["\']([^"\']*)["\'][^>]*property=["\']og:{tag_name}["\']'
                match = _re.search(pattern, html, _re.IGNORECASE)
            return match.group(1) if match else None
        
        title = get_og_content('title')
        description = get_og_content('description')
        image = get_og_content('image')
        site_name = get_og_content('site_name')
        
        # Fallback to regular title if no og:title
        if not title:
            title_match = _re.search(r'<title[^>]*>([^<]*)</title>', html, _re.IGNORECASE)
            if title_match:
                title = title_match.group(1).strip()
        
        # Extract hostname as fallback site_name
        if not site_name:
            try:
                from urllib.parse import urlparse
                site_name = urlparse(url).hostname
            except:
                pass
        
        return jsonify({
            "success": True,
            "url": url,
            "title": title,
            "description": description,
            "image": image,
            "site_name": site_name
        })
        
    except Exception as e:
        print(f"Link preview failed for {url}: {e}")
        return jsonify({"success": False, "error": str(e)})

# AI models from Ollama and for exceptions
@app.route('/api/ai/models', methods=['GET'])
def ai_models():
    provider = os.getenv('Zylo_AI_PROVIDER', 'auto').lower()
    if provider in ('ollama', 'auto'):
        try:
            tags = http_get_json('http://127.0.0.1:11434/api/tags', timeout=30)
            models = [m.get('name') for m in tags.get('models', []) if m.get('name')]
            if models:
                return jsonify({"success": True, "provider": "ollama", "models": models})
        except Exception as e:
            print("Ollama check failed:", e)
            
    # Fallback list (may not be installed; UI can allow selection anyway)
    fallback_models = [
        "llama3.2:1b",
        "llama3.1:8b",
        "tinyllama",
        "phi3:mini",
        "qwen2.5:0.5b",
    ]
    return jsonify({"success": True, "provider": "mock", "models": fallback_models})

# AI personas list
@app.route('/api/ai/personas', methods=['GET'])
def ai_personas():
    return jsonify({"success": True, "personas": ai_list_personas()})

# Mock AI response if gave exceptions
def mock_ai_response(messages: list) -> str:
    last_user = ""
    for m in reversed(messages or []):
        if (m.get('role') or '').lower() == 'user':
            last_user = m.get('content', '')
            break
    if not last_user:
        return "Hello! Ask me anything and I'll do my best to help."
    
    # Friendly reflection with a tiny bit of guidance
    snippet = last_user.strip()
    if len(snippet) > 240:
        snippet = snippet[:240] + "…"
    return (
        "Here's a quick thought: " + snippet + "\n\n"
        "- If you want step-by-step help, tell me your goal and constraints.\n"
        "- For code, paste the snippet and error.\n\n"
        "I can also draft examples or explain trade-offs."
    )



# Chat with an AI assistant. Uses Ollama if available, else mock.
@app.route('/api/ai/chat', methods=['POST'])
def ai_chat():
    data = request.get_json(silent=True) or {}
    messages_in = data.get('messages') or []
    single_message = data.get('message')
    persona_key = (data.get('persona') or '').strip().lower() or None
    mode_key = (data.get('mode') or '').strip().lower() or None
    username = (data.get('username') or '').strip() or 'anonymous'
    
    if not messages_in and single_message:
        messages_in = [{"role": "user", "content": str(single_message)}]
        
    messages_in = messages_in[-6:]
    # Respect user selected model, default to gemma:2b if not set
    model = (data.get('model') or os.getenv('Zylo_AI_MODEL') or 'gemma:2b')
    if model == 'loading': model = 'gemma:2b'
    
    provider = os.getenv('Zylo_AI_PROVIDER', 'auto').lower()
    persona = pick_persona(persona_key, mode_key)

    # Ollama attempt
    if provider in ('ollama', 'auto'):
        try:
            payload = {
                "model": model,
                "messages": [{"role": "system", "content": persona.system_prompt}] + messages_in,
                "stream": False,
                "think": True
            }
            # Add stream: False to ensure we get json back
            resp = http_post_json("http://127.0.0.1:11434/api/chat", payload, timeout=600)
            reply = None

            # === Parse response ===
            if isinstance(resp, dict):
                if "message" in resp and isinstance(resp["message"], dict):
                    reply = resp["message"].get("content")
                    # Extract thinking/reasoning from thinking models
                    thinking = resp["message"].get("thinking", "")
                    if thinking and thinking.strip():
                        reply = f"<think>{thinking.strip()}</think>\n\n{reply}"
                elif "messages" in resp and isinstance(resp["messages"], list):
                     # Handle other formats if any
                    reply = " ".join(
                        m.get("content", "") for m in resp["messages"] if m.get("role") == "assistant"
                    )
                elif "response" in resp:
                    reply = resp["response"]
                elif "error" in resp:
                     # Ollama returned specific error
                     return jsonify({"success": False, "error": f"Ollama Error: {resp['error']}"})
            
            if reply:
                return jsonify({"success": True, "provider": "ollama", "model": model, "reply": reply, "persona": persona.key})
            else:
                print(f"Ollama response parsing failed for model {model}: {resp}")

        except Exception as e:
            print(f"Ollama chat failed for model {model}: {e}")
            err_str = str(e)
            if "404" in err_str:
                return jsonify({"success": False, "error": f"Model '{model}' not found. Please run 'ollama pull {model}' in your terminal."})
                
    # === Fallback: mock ===
    reply = mock_ai_response(messages_in)
    return jsonify({"success": True, "provider": "mock", "model": "mock", "reply": reply, "persona": persona.key})


@app.route('/api/ai/feedback', methods=['POST'])
def ai_feedback():
    """Accept feedback to improve per-user, per-persona phrasing via tiny learner."""
    data = request.get_json(silent=True) or {}
    persona_key = (data.get('persona') or '').strip().lower() or 'helper'
    username = (data.get('username') or '').strip() or 'anonymous'
    prompt = (data.get('prompt') or '')
    target = (data.get('targetPhrase') or data.get('target') or '')
    if not target:
        return jsonify({"success": False, "error": "Missing targetPhrase"}), 400
    try:
        persona_learner.train_on_feedback(persona_key, username, prompt or target, target, epochs=6)
        memory_upsert_fact(username, f"prefers_phrase::{persona_key}::{target}")
    except Exception:
        pass
    return jsonify({"success": True})


@app.route('/api/ai/memory', methods=['GET', 'DELETE'])
def ai_memory():
    username = (request.args.get('username') or request.args.get('user') or '').strip()
    if not username:
        return jsonify({"success": False, "error": "Missing username"}), 400
    if request.method == 'GET':
        try:
            mem = get_user_memory(username)
        except Exception:
            mem = {"facts": [], "preferences": {}, "conversations": []}
        return jsonify({"success": True, "memory": mem})
    else:  # DELETE
        try:
            memory_clear_user(username)
        except Exception:
            pass
        return jsonify({"success": True})


@app.route('/api/explore/posts', methods=['GET', 'POST'])
def explore_posts():
    """List or create Explore/Moments posts."""
    if request.method == 'GET':
        posts = load_explore()
        posts_sorted = sorted(posts, key=lambda p: p.get('createdAt', 0), reverse=True)
        return jsonify({"success": True, "posts": posts_sorted})

    data = request.json or {}
    username = (data.get('username') or '').strip()
    caption = (data.get('caption') or '').strip()
    file_name = data.get('fileName')
    file_data = data.get('fileData')
    if not username or not file_data:
        return jsonify({"success": False, "error": "Missing username/fileData"}), 400

    url = _save_data_url_for_user(username, file_data, file_name)
    if not url:
        return jsonify({"success": False, "error": "Failed to save file"}), 500

    post = {
        'id': f"p{random.randint(100000,999999)}",
        'username': username,
        'caption': caption,
        'fileName': file_name,
        'url': url,
        'createdAt': int(__import__('time').time()),
        'reactions': [],
        'comments': []
    }
    posts = load_explore()
    posts.append(post)
    save_explore(posts)
    return jsonify({"success": True, "post": post})


@app.route('/api/moments/react', methods=['POST'])
def moments_react():
    """Toggle reaction (like) on a Moments post."""
    data = request.json or {}
    post_id = (data.get('postId') or '').strip()
    username = (data.get('username') or '').strip()
    
    if not post_id or not username:
        return jsonify({"success": False, "error": "Missing postId/username"}), 400
    
    posts = load_explore()
    for idx, p in enumerate(posts):
        if p.get('id') == post_id:
            reactions = p.get('reactions', [])
            if username in reactions:
                # Remove reaction (unlike)
                reactions = [r for r in reactions if r != username]
                user_reacted = False
            else:
                # Add reaction (like)
                reactions.append(username)
                user_reacted = True
            posts[idx]['reactions'] = reactions
            save_explore(posts)
            return jsonify({
                "success": True,
                "reactCount": len(reactions),
                "userReacted": user_reacted
            })
    
    return jsonify({"success": False, "error": "Post not found"}), 404


@app.route('/api/moments/comment', methods=['POST'])
def moments_comment():
    """Add a comment to a Moments post."""
    data = request.json or {}
    post_id = (data.get('postId') or '').strip()
    username = (data.get('username') or '').strip()
    comment_text = (data.get('comment') or '').strip()
    
    if not post_id or not username or not comment_text:
        return jsonify({"success": False, "error": "Missing postId/username/comment"}), 400
    
    posts = load_explore()
    for idx, p in enumerate(posts):
        if p.get('id') == post_id:
            comments = p.get('comments', [])
            new_comment = {
                'id': f"c{random.randint(100000,999999)}",
                'username': username,
                'text': comment_text,
                'createdAt': int(__import__('time').time())
            }
            comments.append(new_comment)
            posts[idx]['comments'] = comments
            save_explore(posts)
            return jsonify({
                "success": True,
                "comments": comments
            })
    
    return jsonify({"success": False, "error": "Post not found"}), 404

# --- New RESTful Comment Endpoints ---

@app.route('/api/moments/<post_id>/comments', methods=['GET'])
def get_moment_comments(post_id):
    posts = load_explore()
    for p in posts:
        if p.get('id') == post_id:
            comments = p.get('comments', [])
            return jsonify({"success": True, "comments": comments})
    return jsonify({"success": False, "error": "Post not found"}), 404

@app.route('/api/moments/<post_id>/comments', methods=['POST'])
def add_moment_comment(post_id):
    data = request.json or {}
    username = (data.get('username') or '').strip()
    content = (data.get('content') or '').strip()
    
    if not username or not content:
        return jsonify({"success": False, "error": "Missing fields"}), 400
        
    posts = load_explore()
    for idx, p in enumerate(posts):
        if p.get('id') == post_id:
            comments = p.get('comments', [])
            new_comment = {
                'id': f"c{random.randint(100000,999999)}",
                'username': username,
                'content': content, 
                'timestamp': int(__import__('time').time())
            }
            comments.append(new_comment)
            posts[idx]['comments'] = comments
            save_explore(posts)
            return jsonify({"success": True, "comment": new_comment})
            
    return jsonify({"success": False, "error": "Post not found"}), 404


# ============ Cloud Storage (My Cloud) ============

CLOUD_FILE = os.path.join(DATA_DIR, 'cloud.json')
CLOUD_DIR = os.path.join(UPLOADS_DIR, 'cloud')
os.makedirs(CLOUD_DIR, exist_ok=True)

def load_cloud():
    if not os.path.exists(CLOUD_FILE):
        with open(CLOUD_FILE, 'w', encoding='utf-8') as f:
            json.dump([], f)
        return []
    try:
        with open(CLOUD_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception:
        return []

def save_cloud(files):
    with open(CLOUD_FILE, 'w', encoding='utf-8') as f:
        json.dump(files, f, indent=2)


@app.route('/api/cloud/files', methods=['GET'])
def cloud_files():
    """Get user's personal cloud files."""
    username = (request.args.get('username') or '').strip()
    if not username:
        return jsonify({"success": False, "error": "Missing username"}), 400
    
    all_files = load_cloud()
    user_files = [f for f in all_files if f.get('username') == username]
    user_files.sort(key=lambda x: x.get('createdAt', 0), reverse=True)
    return jsonify({"success": True, "files": user_files})


@app.route('/api/cloud/upload', methods=['POST'])
def cloud_upload():
    """Upload file to personal cloud storage."""
    data = request.json or {}
    username = (data.get('username') or '').strip()
    file_name = data.get('fileName')
    file_data = data.get('fileData')
    file_type = data.get('fileType', '')
    
    if not username or not file_data:
        return jsonify({"success": False, "error": "Missing username/fileData"}), 400
    
    # --- Backend Deduplication Fix ---
    # Check if file with same name/size already exists for user
    try:
        size_bytes = int(len(file_data.split(',')[-1]) * 3 / 4)
    except:
        size_bytes = 0

    all_files = load_cloud()
    for existing in all_files:
        if (existing.get('username') == username and 
            existing.get('fileName') == file_name and 
            abs(existing.get('size', 0) - size_bytes) < 100): # Allow small size variance due to encoding
            
            # Found duplicate! Return existing one instead of creating new.
            return jsonify({"success": True, "file": existing, "message": "File already exists"})

    url = _save_data_url_for_user(username, file_data, file_name)
    if not url:
        return jsonify({"success": False, "error": "Failed to save file"}), 500
    
    cloud_entry = {
        'id': f"cf{random.randint(100000, 999999)}",
        'username': username,
        'fileName': file_name,
        'fileType': file_type,
        'url': url,
        'size': size_bytes,
        'createdAt': int(__import__('time').time())
    }
    
    all_files.append(cloud_entry)
    save_cloud(all_files)
    
    return jsonify({"success": True, "file": cloud_entry})

@app.route('/api/cloud/delete', methods=['POST'])
def cloud_delete():
    """Delete file from personal cloud storage."""
    data = request.json or {}
    username = (data.get('username') or '').strip()
    file_id = (data.get('fileId') or '').strip()
    
    if not username or not file_id:
        return jsonify({"success": False, "error": "Missing username/fileId"}), 400
    
    all_files = load_cloud()
    file_to_delete = None
    
    for f in all_files:
        if f.get('id') == file_id and f.get('username') == username:
            file_to_delete = f
            break
    
    if not file_to_delete:
        return jsonify({"success": False, "error": "File not found"}), 404
    
    all_files = [f for f in all_files if not (f.get('id') == file_id and f.get('username') == username)]
    save_cloud(all_files)
    
    return jsonify({"success": True})


@app.route('/api/cloud/download-all', methods=['GET'])
def cloud_download_all():
    """Create and download a ZIP of all user files."""
    username = (request.args.get('username') or '').strip()
    if not username:
        return jsonify({"success": False, "error": "Missing username"}), 400

    import zipfile
    import io

    all_files = load_cloud()
    user_files = [f for f in all_files if f.get('username') == username]
    
    if not user_files:
         return jsonify({"success": False, "error": "No files to download"}), 404

    # Create in-memory zip
    memory_file = io.BytesIO()
    with zipfile.ZipFile(memory_file, 'w', zipfile.ZIP_DEFLATED) as zf:
        for f in user_files:
            file_name = f.get('fileName')
            file_url = f.get('url')
            
            # Resolve physical path
            # URLs are like /uploads/username/filename or /images/default.png
            # We need to map this to local disk
            if not file_url:
                continue
                
            local_path = None
            if file_url.startswith('/uploads/'):
                # /uploads/username/filename -> UPLOADS_DIR/username/filename
                # app.py defines UPLOADS_DIR
                # Remove '/uploads/' prefix
                rel_path = file_url.replace('/uploads/', '', 1).lstrip('/')
                local_path = os.path.join(UPLOADS_DIR, rel_path)
                
            elif file_url.startswith('/images/'):
                # /images/filename -> FRONTEND_DIR/images/filename
                rel_path = file_url.replace('/images/', '', 1).lstrip('/')
                local_path = os.path.join(FRONTEND_DIR, 'images', rel_path)
            
            if local_path and os.path.exists(local_path):
                # Add to zip, using just the filename to flatten structure or keep it simple
                try:
                    zf.write(local_path, arcname=file_name)
                except Exception as e:
                    print(f"Failed to add {file_name} to zip: {e}")
    
    memory_file.seek(0)
    
    return flask.send_file(
        memory_file,
        mimetype='application/zip',
        as_attachment=True,
        download_name=f'{username}_cloud_files.zip'
    )


@app.route('/api/get-user')
def get_user():
    identifier = request.args.get("identifier")
    if not identifier:
        return jsonify({"success": False, "error": "Missing identifier"}), 400

    if not os.path.exists(USER_DATA_FILE):
        return jsonify({"success": False, "error": "User data not found"}), 404

    with open(USER_DATA_FILE, "r", encoding="utf-8") as f:
        users = json.load(f)

    for user in users:
        if user.get("username") == identifier or user.get("email") == identifier:
            # Inject real-time status
            uname = user.get("username")
            is_online = uname in online_users
            user['is_online'] = is_online
            user['status'] = 'online' if is_online else 'offline'
            return jsonify({"success": True, "user": user})

    return jsonify({"success": False, "error": "User not found"}), 404

@app.route('/api/check-user')
def check_user():
    identifier = request.args.get("identifier", "").strip().lower()
    if not identifier:
        return jsonify({"exists": False})

    if not os.path.exists(USER_DATA_FILE):
        return jsonify({"exists": False})

    with open(USER_DATA_FILE, "r", encoding="utf-8") as f:
        users = json.load(f)

    for user in users:
        if user.get("username", "").lower() == identifier or user.get("email", "").lower() == identifier:
            return jsonify({"exists": True, "username": user["username"]})

    return jsonify({"exists": False})


@app.route('/')
def serve_main():
    return send_from_directory(FRONTEND_DIR, 'login.html')

@app.route('/images/<path:filename>')
def serve_images(filename):
    return send_from_directory(os.path.join(FRONTEND_DIR, 'images'), filename) # Images were relocated under the frontend folder

@app.route('/uploads/<username>/<filename>')
def serve_upload(username, filename):
    return send_from_directory(os.path.join(UPLOADS_DIR, username), filename)

@app.route('/files/<path:filename>')
def serve_files(filename):
    return send_from_directory(os.path.join(FRONTEND_DIR, 'files'), filename)  # Static files (css, vendor, audio, etc.) now live under frontend/files

@app.route('/js/<path:filename>')
def serve_js(filename):
    return send_from_directory(os.path.join(FRONTEND_DIR, 'js'), filename)

@app.route('/api/update-profile', methods=['POST'])
def update_profile():
    data = request.json
    username = data.get("username")
    usertag = data.get("usertag")
    avatar_data = data.get("avatar")
    banner_data = data.get("banner")
    about_short = data.get("about") or data.get("bio") or None
    about_long = data.get("aboutMe") or data.get("about_long") or data.get("description") or None
    level = data.get("level")
    gold = data.get("gold")
    rank = data.get("rank")
    settings = data.get("settings")

    print(f"Incoming update for user: {username}")
    print("Raw data:", data)
    print("Parsed about_short:", about_short, "about_long:", about_long)

    if not username:
        return jsonify({"success": False, "error": "Missing username"}), 400

    if not os.path.exists(USER_DATA_FILE):
        return jsonify({"success": False, "error": "users.json not found"}), 404

    user_upload_dir = os.path.join(UPLOADS_DIR, username)
    os.makedirs(user_upload_dir, exist_ok=True)

    avatar_url = None
    banner_url = None

    def save_image(base64_data, filename):
        if not base64_data:
            return None
        if isinstance(base64_data, str) and (   # If the value is already a URL/path, just keep it (no-op update)
            base64_data.startswith('/uploads/') or
            base64_data.startswith('/images/') or
            base64_data.startswith('http://') or
            base64_data.startswith('https://')
        ):
            return base64_data
        try:
            header, encoded = base64_data.split(",", 1)
            file_data = base64.b64decode(encoded)
            filepath = os.path.join(user_upload_dir, filename)
            with open(filepath, "wb") as f:
                f.write(file_data)
            return f"/uploads/{username}/{filename}"
        except Exception as e:
            print("Failed to save image:", e)
            return None

    avatar_url = save_image(avatar_data, "avatar.png")
    banner_url = save_image(banner_data, "banner.png")

    with open(USER_DATA_FILE, "r", encoding="utf-8") as f:
        users = json.load(f)

    updated = False
    for user in users:
        if user.get("username") == username:

            # Avatar / banner
            if avatar_url:
                user["avatar"] = avatar_url
            if banner_url:
                user["banner"] = banner_url

            # Usertag
            if usertag is not None:
                raw_tag = str(usertag).strip()
                if raw_tag:
                    user["usertag"] = "@" + raw_tag.lstrip("@")

            # Only update if the key exists in the payload
            if "about" in data or "bio" in data:
                user["about"] = str(data.get("about") or data.get("bio") or "").strip()
                print(f"Updated short bio for {username}: '{user['about']}'")

            if "aboutMe" in data or "about_long" in data or "description" in data:
                user["aboutMe"] = str(data.get("aboutMe") or data.get("about_long") or data.get("description") or "").strip()
                print(f"Updated aboutMe for {username}: '{user['aboutMe']}'")

            # Optional fields
            if level is not None:
                user["level"] = level
            if gold is not None:
                user["gold"] = gold
            if rank is not None:
                user["rank"] = rank

            # Update settings
            if settings is not None:
                if "settings" not in user:
                    user["settings"] = {}
                user["settings"].update(settings)
                print(f"✅ Updated settings: {settings}")

            # Badges
            if "badges" in data:
                user["badges"] = data.get("badges")
                print(f"✅ Updated badges for {username}: {user['badges']}")

            if "badges_pinned" in data:
                user["badges_pinned"] = data.get("badges_pinned")
                print(f"✅ Updated pinned badges for {username}: {user['badges_pinned']}")

            updated = True
            print(f"✅ Updated {username}'s profile.")
            break


    if not updated:
        return jsonify({"success": False, "error": "User not found"}), 404

    with open(USER_DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(users, f, indent=2)

    return jsonify({"success": True, "user": user})

def _add_xp(username: str, amount: int = 5):
    """Adds XP to a user and handles leveling up."""
    if not username: 
        return
        
    users = load_users()
    user_idx = -1
    for i, u in enumerate(users):
        if u['username'] == username:
            user_idx = i
            break
            
    if user_idx == -1:
        return

    # Initialize XP/Level if missing
    user = users[user_idx]
    current_xp = int(user.get('xp') or 0)
    current_level = int(user.get('level') or 0)
    
    # Update XP
    new_xp = current_xp + amount
    
    # Calculate Level (Simple formula: 100 XP per level)
    new_level = new_xp // 100
    
    users[user_idx]['xp'] = new_xp
    users[user_idx]['level'] = new_level
    
    save_users(users)
    
    # Notify user of level up
    if new_level > current_level:
        try:
            # Emit to user's personal room (assuming they are in 'user_{username}' room? 
            # DMs join 'user_{username}'.. wait, let's check join logic.
            # handle_join logic: join_room(f"user_{username}")
            from flask_socketio import emit
            emit('level_up', {
                'username': username,
                'level': new_level,
                'xp': new_xp
            }, room=f"user_{username}")
        except Exception as e:
            print(f"Error emitting level up: {e}")

def grant_badge(username, badge_id):
    """Grants a badge to a user if they don't already have it."""
    if not username or not badge_id:
        return False
        
    users = load_users()
    user_idx = -1
    for i, u in enumerate(users):
        if u['username'] == username:
            user_idx = i
            break
            
    if user_idx == -1:
        return False
        
    user = users[user_idx]
    if 'badges' not in user:
        user['badges'] = []
        
    if badge_id in user['badges']:
        return False # Already has it
        
    user['badges'].append(badge_id)
    save_users(users)
    
    # Notify user of badge unlock
    try:
        from flask_socketio import emit
        emit('badge_unlock', {
            'username': username,
            'badge_id': badge_id
        }, room=f"user_{username}")
        print(f"🏆 Granted badge {badge_id} to {username}")
    except Exception as e:
        print(f"Error emitting badge unlock: {e}")
        
    return True

def check_badges(username, context=None):
    """Checks and grants badges based on user state and context."""
    if not username:
        return
        
    users = load_users()
    user = next((u for u in users if u['username'] == username), None)
    if not user:
        return
        
    # 1. Verified Badge (if email is verified)
    if user.get('email_verified'):
        grant_badge(username, 'verified')
        
    # 2. Developer Badge (hardcoded for devs)
    if username in ['Dan', 'Daniel']:
        grant_badge(username, 'developer')
        
    # 3. Supporter (Placeholder for future subscription logic)
    # 4. Thinker/Coder (Context dependent - usually triggered from chat)
    if context == 'ai_thinking_session':
        # This would increment a counter in user metadata and grant if threshold met
        pass

# -------- Settings and Account Management Endpoints -------- #

def _find_user(users, identifier: str):
    """Lookup a user by username, email, or usertag (with or without @).

    Historically we only matched the exact username which caused 404s when
    the client submitted a usertag like "@dan_1234" in friends endpoints.
    To make the APIs more forgiving, accept any of: username, email, or
    usertag (with or without the leading @), case-insensitive.
    """
    query = (identifier or "").strip().lower()
    if not query:
        return -1, None
    # Normalize a potential tag to include @ variant for matching
    query_tag = query if query.startswith('@') else f"@{query}"
    for idx, u in enumerate(users):
        uname = (u.get("username") or "").strip().lower()
        email = (u.get("email") or "").strip().lower()
        utag = (u.get("usertag") or "").strip().lower()
        # Accept both @tag and tag without @
        if (
            uname == query
            or email == query
            or utag == query_tag
        ):
            return idx, u
    return -1, None


@app.route('/api/update-username', methods=['POST'])
def update_username():
    data = request.json or {}
    username = (data.get("username") or "").strip()
    new_username = (data.get("newUsername") or "").strip()
    if not username or not new_username:
        return jsonify({"success": False, "error": "Missing username/newUsername"}), 400

    users = load_users()
    # Ensure new username unique
    for u in users:
        if u.get("username", "").lower() == new_username.lower():
            return jsonify({"success": False, "error": "Username already exists"}), 409

    idx, user = _find_user(users, username)
    if user is None:
        return jsonify({"success": False, "error": "User not found"}), 404

    # Rename uploads dir if exists
    old_dir = os.path.join(UPLOADS_DIR, username)
    new_dir = os.path.join(UPLOADS_DIR, new_username)
    if os.path.exists(old_dir):
        os.makedirs(UPLOADS_DIR, exist_ok=True)
        try:
            shutil.move(old_dir, new_dir)
        except Exception:
            # If move fails for any reason, continue without blocking update
            pass

    # Update user record
    users[idx]["username"] = new_username

    # Update messages author names to keep history aligned
    global messages
    changed = False
    for m in messages:
        if m.get("username") == username:
            m["username"] = new_username
            changed = True
    if changed:
        save_messages(messages)

    save_users(users)
    return jsonify({"success": True, "username": new_username})


@app.route('/api/update-usertag', methods=['POST'])
def update_usertag():
    data = request.json or {}
    username = (data.get("username") or "").strip()
    new_tag = (data.get("newUsertag") or data.get("newTag") or "").strip()
    if not username or not new_tag:
        return jsonify({"success": False, "error": "Missing username/newUsertag"}), 400

    # Normalize to @xxxx (keep other formats too)
    raw = str(new_tag)
    if raw.startswith("@"):  # already with @
        normalized = raw
    else:
        normalized = f"@{raw}"

    # If strictly enforce 4 digits, keep it lenient but validate
    if not any(c.isdigit() for c in raw):
        return jsonify({"success": False, "error": "Usertag must contain digits (e.g., 4 digits)."}), 400

    users = load_users()
    idx, user = _find_user(users, username)
    if user is None:
        return jsonify({"success": False, "error": "User not found"}), 404

    users[idx]["usertag"] = normalized
    save_users(users)
    return jsonify({"success": True, "usertag": normalized})


@app.route('/api/update-email', methods=['POST'])
def update_email():
    data = request.json or {}
    username = (data.get("username") or "").strip()
    new_email = (data.get("newEmail") or "").strip()
    if not username or not new_email:
        return jsonify({"success": False, "error": "Missing username/newEmail"}), 400

    users = load_users()
    # Ensure email unique
    for u in users:
        if u.get("email", "").lower() == new_email.lower():
            return jsonify({"success": False, "error": "Email already in use"}), 409

    idx, user = _find_user(users, username)
    if user is None:
        return jsonify({"success": False, "error": "User not found"}), 404

    users[idx]["email"] = new_email
    save_users(users)
    return jsonify({"success": True, "email": new_email})


@app.route('/api/update-password', methods=['POST'])
def update_password():
    data = request.json or {}
    username = (data.get("username") or "").strip()
    old_password = data.get("oldPassword")
    new_password = data.get("newPassword")
    if not username or not old_password or not new_password:
        return jsonify({"success": False, "error": "Missing fields"}), 400

    users = load_users()
    idx, user = _find_user(users, username)
    if user is None:
        return jsonify({"success": False, "error": "User not found"}), 404

    if user.get("password") != old_password:
        return jsonify({"success": False, "error": "Old password incorrect"}), 401

    users[idx]["password"] = new_password
    save_users(users)
    return jsonify({"success": True})


@app.route('/api/update-settings', methods=['POST'])
def update_settings():
    data = request.json or {}
    username = (data.get("username") or "").strip()
    settings_payload = data.get("settings") or {}
    if not username:
        return jsonify({"success": False, "error": "Missing username"}), 400

    users = load_users()
    idx, user = _find_user(users, username)
    if user is None:
        return jsonify({"success": False, "error": "User not found"}), 404

    user_settings = user.get("settings") or {}
    # Merge shallowly
    user_settings.update(settings_payload)
    users[idx]["settings"] = user_settings
    save_users(users)
    return jsonify({"success": True, "settings": user_settings})


@app.route('/api/delete-account', methods=['POST'])
def delete_account():
    data = request.json or {}
    username = (data.get("username") or "").strip()
    if not username:
        return jsonify({"success": False, "error": "Missing username"}), 400

    users = load_users()
    new_users = [u for u in users if u.get("username") != username]
    if len(new_users) == len(users):
        return jsonify({"success": False, "error": "User not found"}), 404

    save_users(new_users)

    # Remove uploads dir if exists
    user_upload_dir = os.path.join(UPLOADS_DIR, username)
    try:
        if os.path.isdir(user_upload_dir):
            shutil.rmtree(user_upload_dir)
    except Exception:
        pass

    # Remove user's messages
    global messages
    messages = [m for m in messages if m.get("username") != username]
    save_messages(messages)

    return jsonify({"success": True})

# ---------------- Friends APIs ---------------- #

def _ensure_social_fields(user: dict) -> dict:
    if user is None:
        return {}
    if 'friends' not in user or not isinstance(user.get('friends'), list):
        user['friends'] = []
    if 'friendRequests' not in user or not isinstance(user.get('friendRequests'), dict):
        user['friendRequests'] = { 'incoming': [], 'outgoing': [] }
    else:
        fr = user['friendRequests']
        if not isinstance(fr.get('incoming'), list):
            fr['incoming'] = []
        if not isinstance(fr.get('outgoing'), list):
            fr['outgoing'] = []
    return user


@app.route('/api/friends', methods=['GET'])
def friends_get():
    username = (request.args.get('username') or '').strip()
    if not username:
        return jsonify({"success": False, "error": "Missing username"}), 400
    users = load_users()
    _, user = _find_user(users, username)
    if user is None:
        return jsonify({"success": False, "error": "User not found"}), 404
    user = _ensure_social_fields(user)
    return jsonify({
        "success": True,
        "friends": user.get('friends', []),
        "incoming": user.get('friendRequests', {}).get('incoming', []),
        "outgoing": user.get('friendRequests', {}).get('outgoing', []),
    })


@app.route('/api/friends/request', methods=['POST'])
def friends_request():
    data = request.json or {}
    sender = (data.get('from') or '').strip()
    target = (data.get('to') or '').strip()
    if not sender or not target:
        return jsonify({"success": False, "error": "Missing from/to"}), 400
    if sender == target:
        return jsonify({"success": False, "error": "Cannot add yourself"}), 400
    users = load_users()
    si, su = _find_user(users, sender)
    ti, tu = _find_user(users, target)
    if su is None or tu is None:
        return jsonify({"success": False, "error": "User not found"}), 404
    su = _ensure_social_fields(su)
    tu = _ensure_social_fields(tu)

    # Use canonical usernames in social lists
    sender_name = su.get('username')
    target_name = tu.get('username')

    if target_name in su['friends']:
        return jsonify({"success": False, "error": "Already friends"}), 409
    if target_name in su['friendRequests']['outgoing']:
        return jsonify({"success": True, "message": "Already requested"})
    if sender_name in tu['friendRequests']['incoming']:
        return jsonify({"success": True, "message": "Already requested"})

    su['friendRequests']['outgoing'].append(target_name)
    tu['friendRequests']['incoming'].append(sender_name)
    users[si] = su
    users[ti] = tu
    save_users(users)
    return jsonify({"success": True})


@app.route('/api/friends/accept', methods=['POST'])
def friends_accept():
    data = request.json or {}
    username = (data.get('username') or '').strip()
    requester = (data.get('from') or '').strip()
    if not username or not requester:
        return jsonify({"success": False, "error": "Missing fields"}), 400
    users = load_users()
    ui, u = _find_user(users, username)
    ri, r = _find_user(users, requester)
    if u is None or r is None:
        return jsonify({"success": False, "error": "User not found"}), 404
    u = _ensure_social_fields(u)
    r = _ensure_social_fields(r)

    uname = u.get('username')
    rname = r.get('username')

    # Remove pending requests, accepting both canonical and raw provided values
    u['friendRequests']['incoming'] = [x for x in u['friendRequests']['incoming'] if x not in (requester, rname)]
    r['friendRequests']['outgoing'] = [x for x in r['friendRequests']['outgoing'] if x not in (username, uname)]

    if rname not in u['friends']:
        u['friends'].append(rname)
    if uname not in r['friends']:
        r['friends'].append(uname)

    users[ui] = u
    users[ri] = r
    save_users(users)
    return jsonify({"success": True})


@app.route('/api/friends/decline', methods=['POST'])
def friends_decline():
    data = request.json or {}
    username = (data.get('username') or '').strip()
    requester = (data.get('from') or '').strip()
    if not username or not requester:
        return jsonify({"success": False, "error": "Missing fields"}), 400
    users = load_users()
    ui, u = _find_user(users, username)
    ri, r = _find_user(users, requester)
    if u is None or r is None:
        return jsonify({"success": False, "error": "User not found"}), 404
    u = _ensure_social_fields(u)
    r = _ensure_social_fields(r)
    uname = u.get('username')
    rname = r.get('username')
    u['friendRequests']['incoming'] = [x for x in u['friendRequests']['incoming'] if x not in (requester, rname)]
    r['friendRequests']['outgoing'] = [x for x in r['friendRequests']['outgoing'] if x not in (username, uname)]
    users[ui] = u
    users[ri] = r
    save_users(users)
    return jsonify({"success": True})


@app.route('/api/friends/remove', methods=['POST'])
def friends_remove():
    data = request.json or {}
    username = (data.get('username') or '').strip()
    friend = (data.get('friend') or '').strip()
    if not username or not friend:
        return jsonify({"success": False, "error": "Missing fields"}), 400
    users = load_users()
    ui, u = _find_user(users, username)
    fi, fuser = _find_user(users, friend)
    if u is None or fuser is None:
        return jsonify({"success": False, "error": "User not found"}), 404
    u = _ensure_social_fields(u)
    fuser = _ensure_social_fields(fuser)
    uname = u.get('username')
    fname = fuser.get('username')
    # Remove by either raw input or canonical names
    u['friends'] = [x for x in u['friends'] if x not in (friend, fname)]
    fuser['friends'] = [x for x in fuser['friends'] if x not in (username, uname)]
    users[ui] = u
    users[fi] = fuser
    save_users(users)
    return jsonify({"success": True})

@app.route('/api/friends/cancel', methods=['POST'])
def friends_cancel():
    data = request.json or {}
    username = (data.get('username') or '').strip()
    target = (data.get('to') or '').strip()
    if not username or not target:
        return jsonify({"success": False, "error": "Missing fields"}), 400
    users = load_users()
    ui, u = _find_user(users, username)
    ti, t = _find_user(users, target)
    if u is None or t is None:
        return jsonify({"success": False, "error": "User not found"}), 404
    u = _ensure_social_fields(u)
    t = _ensure_social_fields(t)
    uname = u.get('username')
    tname = t.get('username')
    u['friendRequests']['outgoing'] = [x for x in u['friendRequests']['outgoing'] if x not in (target, tname)]
    t['friendRequests']['incoming'] = [x for x in t['friendRequests']['incoming'] if x not in (username, uname)]
    users[ui] = u
    users[ti] = t
    save_users(users)
    return jsonify({"success": True})

# ---------------- Direct Messages APIs + Socket ---------------- #
@app.route('/api/dm/history', methods=['GET'])
def dm_history():
    user_a = (request.args.get('userA') or '').strip()
    user_b = (request.args.get('userB') or '').strip()
    if not user_a or not user_b:
        return jsonify([])
    conv = []
    for m in (load_dms() or []):
        if (m.get('from') == user_a and m.get('to') == user_b) or (m.get('from') == user_b and m.get('to') == user_a):
            conv.append(m)
    return jsonify({"success": True, "messages": conv})

@app.route('/api/dm/media', methods=['GET'])
def dm_media():
    user_a = (request.args.get('userA') or '').strip()
    user_b = (request.args.get('userB') or '').strip()
    if not user_a or not user_b:
        return jsonify({"success": False, "error": "Missing userA/userB"}), 400
    
    media_msgs = []
    # Filter for messages with fileData (images/videos) or sticker_src
    for m in (load_dms() or []):
        if ((m.get('from') == user_a and m.get('to') == user_b) or 
            (m.get('from') == user_b and m.get('to') == user_a)):
            
            # Check for media content
            if m.get('fileData') or m.get('sticker_src') or (m.get('type') == 'image') or (m.get('type') == 'video'):
                media_msgs.append(m)
                
    return jsonify({"success": True, "media": media_msgs})

@app.route('/api/dm/send', methods=['POST'])
def dm_send():
    data = request.json or {}
    frm = (data.get('from') or '').strip()
    to = (data.get('to') or '').strip()
    if not frm or not to:
        return jsonify({"success": False, "error": "Missing from/to"}), 400
    entry = {
        'from': frm,
        'to': to,
        'message': data.get('message'),
        'fileName': data.get('fileName'),
        'fileType': data.get('fileType'),
        'fileData': data.get('fileData'),
        'fileData': data.get('fileData'),
        'replyTo': data.get('replyTo'),
        'createdAt': int(__import__('time').time()),
    }
    all_dms = load_dms()
    all_dms.append(entry)
    save_dms(all_dms)
    # Push live update only to both parties
    try:
        emit('receive_dm', entry, room=f"user_{to}")
        emit('receive_dm', entry, room=f"user_{frm}")
    except Exception:
        pass
    return jsonify({"success": True})

@socketio.on('join_user')
def handle_join_user(data):
    username = (data or {}).get('username')
    if username:
        join_room(f"user_{username}")

@socketio.on('send_dm')
def handle_send_dm(data):
    try:
        frm = (data or {}).get('from')
        to = (data or {}).get('to')
        if not frm or not to:
            return
        entry = {
            'from': frm,
            'to': to,
            'message': (data or {}).get('message'),
            'fileName': (data or {}).get('fileName'),
            'fileType': (data or {}).get('fileType'),
            'fileData': (data or {}).get('fileData'),
            'fileData': (data or {}).get('fileData'),
            'replyTo': (data or {}).get('replyTo'),
            'createdAt': int(__import__('time').time()),
        }
        all_dms = load_dms()
        all_dms.append(entry)
        save_dms(all_dms)
        # Emit only to the recipient (sender handles their own message locally)
        # Emit only to the recipient (sender handles their own message locally)
        emit('receive_dm', entry, room=f"user_{to}")
        
        # Add XP
        _add_xp(frm, 5)
    except Exception:
        pass

# ---------------- Groups APIs ---------------- #

def _gen_group_id() -> str:
    return f"g{random.randint(100000, 999999)}"


@app.route('/api/groups/list', methods=['GET'])
def list_groups():
    username = (request.args.get('username') or '').strip()
    all_groups = load_groups()
    if username:
        filtered = [g for g in all_groups if username in (g.get('members') or []) or username == g.get('owner')]
        return jsonify({"success": True, "groups": filtered})
    return jsonify({"success": True, "groups": all_groups})


@app.route('/api/groups/create', methods=['POST'])
def create_group():
    data = request.json or {}
    username = (data.get('username') or data.get('owner') or '').strip()
    name = (data.get('name') or '').strip()
    description = (data.get('description') or '').strip()
    icon_data = data.get('iconData')

    if not username or not name:
        return jsonify({"success": False, "error": "Missing username/name"}), 400
    
    gid = _gen_group_id()
    icon_url = None
    if icon_data:
        # Save group icon under a 'groups' pseudo-user folder
        icon_url = _save_data_url_for_user("groups", icon_data, f"{gid}_icon.png")

    g = {
        "id": gid,
        "name": name,
        "description": description,
        "owner": username,
        "icon": icon_url,
        "members": [username],
        "channels": [{"id": "general", "name": "general"}],
        "messages": [],
        "createdAt": int(__import__('time').time())
    }
    all_groups = load_groups()
    all_groups.append(g)
    save_groups(all_groups)
    return jsonify({"success": True, "group": g})


@app.route('/api/groups/join', methods=['POST'])
def join_group_api():
    data = request.json or {}
    username = (data.get('username') or '').strip()
    group_id = (data.get('groupId') or '').strip()
    if not username or not group_id:
        return jsonify({"success": False, "error": "Missing username/groupId"}), 400
    all_groups = load_groups()
    for idx, g in enumerate(all_groups):
        if g.get('id') == group_id:
            members = g.get('members') or []
            if username not in members:
                members.append(username)
                all_groups[idx]['members'] = members
                save_groups(all_groups)
            return jsonify({"success": True, "group": all_groups[idx]})
    return jsonify({"success": False, "error": "Group not found"}), 404


@app.route('/api/groups/leave', methods=['POST'])
def leave_group_api():
    data = request.json or {}
    username = (data.get('username') or '').strip()
    group_id = (data.get('groupId') or '').strip()
    if not username or not group_id:
        return jsonify({"success": False, "error": "Missing username/groupId"}), 400
    all_groups = load_groups()
    for idx, g in enumerate(all_groups):
        if g.get('id') == group_id:
            members = [m for m in (g.get('members') or []) if m != username]
            all_groups[idx]['members'] = members
            save_groups(all_groups)
            return jsonify({"success": True})
    return jsonify({"success": False, "error": "Group not found"}), 404


@app.route('/api/groups/update', methods=['POST'])
def update_group_api():
    data = request.json or {}
    username = (data.get('username') or '').strip()
    group_id = (data.get('groupId') or '').strip()
    name = (data.get('name') or '').strip()
    description = (data.get('description') or '').strip()
    icon_data = data.get('iconData')
    
    if not username or not group_id:
        return jsonify({"success": False, "error": "Missing fields"}), 400
        
    all_groups = load_groups()
    for idx, g in enumerate(all_groups):
        if g.get('id') == group_id:
            # Check if user is owner (or admin logic later)
            if g.get('owner') != username:
                return jsonify({"success": False, "error": "Not authorized"}), 403
            
            if name:
                all_groups[idx]['name'] = name
            if description is not None: # Empty description allowed
                all_groups[idx]['description'] = description
            
            if icon_data:
                icon_url = _save_data_url_for_user("groups", icon_data, f"{group_id}_icon.png")
                if icon_url:
                    all_groups[idx]['icon'] = icon_url
            
            save_groups(all_groups)
            return jsonify({"success": True, "group": all_groups[idx]})
            
    return jsonify({"success": False, "error": "Group not found"}), 404


@app.route('/api/groups/delete', methods=['POST'])
def delete_group_api():
    data = request.json or {}
    username = (data.get('username') or '').strip()
    group_id = (data.get('groupId') or '').strip()
    
    if not username or not group_id:
        return jsonify({"success": False, "error": "Missing fields"}), 400
        
    all_groups = load_groups()
    for idx, g in enumerate(all_groups):
        if g.get('id') == group_id:
            if g.get('owner') != username:
                return jsonify({"success": False, "error": "Not authorized"}), 403
            
            del all_groups[idx]
            save_groups(all_groups)
            return jsonify({"success": True})
            
    return jsonify({"success": False, "error": "Group not found"}), 404


@app.route('/api/groups/channels/create', methods=['POST'])
def create_group_channel():
    data = request.json or {}
    group_id = data.get('groupId', '').strip()
    username = data.get('username', '').strip()
    channel_name = data.get('channelName', '').strip()
    channel_type = data.get('type', 'text').strip() # 'text' or 'voice'
    category = data.get('category', 'Text Channels').strip()

    if not group_id or not username or not channel_name:
        return jsonify({"success": False, "error": "Missing required fields"}), 400

    all_groups = load_groups()
    for idx, g in enumerate(all_groups):
        if g.get('id') == group_id:
            # Permission: Owner OR Admin
            roles = g.get('roles', {})
            is_owner = g.get('owner') == username
            is_admin = username in roles.get('admin', [])
            
            if not (is_owner or is_admin):
                return jsonify({"success": False, "error": "Not authorized"}), 403
            
            channels = g.get('channels', [])
            # Check for duplicate names
            if any(c.get('name') == channel_name for c in channels):
                return jsonify({"success": False, "error": "Channel already exists"}), 400
            
            new_channel = {
                "id": str(random.randint(1000, 9999)), # Simplified channel ID
                "name": channel_name,
                "type": channel_type,
                "category": category
            }
            channels.append(new_channel)
            all_groups[idx]['channels'] = channels
            save_groups(all_groups)
            return jsonify({"success": True, "channel": new_channel})
    
    return jsonify({"success": False, "error": "Group not found"}), 404


@app.route('/api/groups/channels/delete', methods=['POST'])
def delete_group_channel():
    data = request.json or {}
    group_id = data.get('groupId', '').strip()
    username = data.get('username', '').strip()
    channel_id = data.get('channelId', '').strip()

    if not group_id or not username or not channel_id:
        return jsonify({"success": False, "error": "Missing required fields"}), 400

    if channel_id == 'general':
        return jsonify({"success": False, "error": "Cannot delete #general"}), 400

    all_groups = load_groups()
    for idx, g in enumerate(all_groups):
        if g.get('id') == group_id:
            if g.get('owner') != username:
                return jsonify({"success": False, "error": "Not authorized"}), 403
            
            channels = [c for c in g.get('channels', []) if c.get('id') != channel_id]
            all_groups[idx]['channels'] = channels
            save_groups(all_groups)
            return jsonify({"success": True})
            
    return jsonify({"success": False, "error": "Group not found"}), 404


@app.route('/api/groups/message', methods=['POST'])
def send_group_message_api():
    """Send a message to a group channel."""
    data = request.json or {}
    group_id = data.get('groupId', '').strip()
    channel = data.get('channel', 'general').strip()
    username = data.get('username', '').strip()
    message = data.get('message', '').strip()
    
    if not group_id or not username or not message:
        return jsonify({"success": False, "error": "Missing required fields"}), 400
    
    all_groups = load_groups()
    
    for idx, group in enumerate(all_groups):
        if group.get('id') == group_id:
            msg_entry = {
                'username': username,
                'message': message,
                'channel': channel,
                'timestamp': int(__import__('time').time()),
                'type': data.get('type', 'text'),
                'sticker_src': data.get('sticker_src'),
                'fileData': data.get('fileData'),
                'fileName': data.get('fileName'),
                'fileName': data.get('fileName'),
                'fileType': data.get('fileType'),
                'replyTo': data.get('replyTo')
            }
            messages = group.get('messages', [])
            messages.append(msg_entry)
            all_groups[idx]['messages'] = messages
            save_groups(all_groups)
            
            # Emit to group room
            socketio.emit('group_message', {
                'groupId': group_id,
                'channel': channel,
                'message': msg_entry
            }, room=group_id)
            
            return jsonify({"success": True, "message": msg_entry})
    
    return jsonify({"success": False, "error": "Group not found"}), 404


@app.route('/api/groups/message/edit', methods=['POST'])
def edit_group_message_api():
    """Edit a message in a group channel."""
    data = request.json or {}
    group_id = data.get('groupId', '').strip()
    channel = data.get('channel', 'general').strip()
    username = data.get('username', '').strip()
    message_timestamp = data.get('timestamp')
    new_message = data.get('newMessage', '').strip()
    
    if not group_id or not username or not new_message or not message_timestamp:
        return jsonify({"success": False, "error": "Missing required fields"}), 400
    
    all_groups = load_groups()
    
    for idx, group in enumerate(all_groups):
        if group.get('id') == group_id:
            messages = group.get('messages', [])
            for msg_idx, msg in enumerate(messages):
                if msg.get('timestamp') == message_timestamp and msg.get('username') == username and msg.get('channel') == channel:
                    # Save history before overwriting
                    if 'history' not in messages[msg_idx]:
                        messages[msg_idx]['history'] = []
                    
                    messages[msg_idx]['history'].append({
                        'content': messages[msg_idx]['message'],
                        'timestamp': messages[msg_idx].get('editedAt') or messages[msg_idx]['timestamp']
                    })

                    messages[msg_idx]['message'] = new_message
                    messages[msg_idx]['edited'] = True
                    messages[msg_idx]['editedAt'] = int(__import__('time').time())
                    
                    all_groups[idx]['messages'] = messages
                    save_groups(all_groups)

                    # Emit update event
                    socketio.emit('group_message_update', {
                        'groupId': group_id,
                        'channel': channel,
                        'message': messages[msg_idx]
                    }, room=group_id)

                    return jsonify({"success": True, "message": messages[msg_idx]})
            return jsonify({"success": False, "error": "Message not found"}), 404
    
    return jsonify({"success": False, "error": "Group not found"}), 404


@app.route('/api/groups/message/react', methods=['POST'])
def react_group_message_api():
    """Add or remove a reaction to a message in a group channel."""
    data = request.json or {}
    group_id = data.get('groupId', '').strip()
    channel = data.get('channel', 'general').strip()
    username = data.get('username', '').strip()
    message_timestamp = data.get('timestamp')
    emoji = data.get('emoji', '').strip()
    action = data.get('action', 'add')  # 'add' or 'remove'
    
    if not group_id or not username or not emoji or not message_timestamp:
        return jsonify({"success": False, "error": "Missing required fields"}), 400
    
    all_groups = load_groups()
    
    for idx, group in enumerate(all_groups):
        if group.get('id') == group_id:
            messages = group.get('messages', [])
            for msg_idx, msg in enumerate(messages):
                if msg.get('timestamp') == message_timestamp and msg.get('channel') == channel:
                    # Initialize reactions dict if not present
                    if 'reactions' not in messages[msg_idx]:
                        messages[msg_idx]['reactions'] = {}
                    
                    reactions = messages[msg_idx]['reactions']
                    
                    if emoji not in reactions:
                        reactions[emoji] = []
                    
                    if action == 'add':
                        if username not in reactions[emoji]:
                            reactions[emoji].append(username)
                    else:  # remove
                        if username in reactions[emoji]:
                            reactions[emoji].remove(username)
                        if len(reactions[emoji]) == 0:
                            del reactions[emoji]
                    
                    messages[msg_idx]['reactions'] = reactions
                    all_groups[idx]['messages'] = messages
                    save_groups(all_groups)
                    
                    # Emit socket update
                    # Use socketio.emit directly if possible, or import if needed
                    # (Assuming socketio is available in this scope or globally)
                    try:
                        socketio.emit('message_reaction_update', {
                            'groupId': group_id,
                            'channelId': channel,
                            'messageId': msg.get('id'), # Use ID if available
                            'timestamp': msg.get('timestamp'),
                            'reactions': reactions
                        }, room=group_id)
                    except Exception as e:
                        print(f"Socket emit error: {e}")

                    return jsonify({"success": True, "reactions": reactions})
            return jsonify({"success": False, "error": "Message not found"}), 404
    
    return jsonify({"success": False, "error": "Group not found"}), 404


@app.route('/api/groups/message/delete', methods=['POST'])
def delete_group_message_api():
    """Delete a message from a group channel."""
    data = request.json or {}
    group_id = data.get('groupId', '').strip()
    channel = data.get('channel', 'general').strip()
    username = data.get('username', '').strip()
    message_timestamp = data.get('timestamp')
    
    if not group_id or not username or not message_timestamp:
        return jsonify({"success": False, "error": "Missing required fields"}), 400
    
    all_groups = load_groups()
    
    for idx, group in enumerate(all_groups):
        if group.get('id') == group_id:
            messages = group.get('messages', [])
            for msg_idx, msg in enumerate(messages):
                if msg.get('timestamp') == message_timestamp and msg.get('channel') == channel:
                    if msg.get('username') != username:
                        return jsonify({"success": False, "error": "Unauthorized"}), 403
                        
                    messages.pop(msg_idx)
                    all_groups[idx]['messages'] = messages
                    save_groups(all_groups)
                    
                    # Emit delete event
                    socketio.emit('group_message_delete', {
                        'groupId': group_id,
                        'channel': channel,
                        'timestamp': message_timestamp
                    }, room=group_id)
                    
                    return jsonify({"success": True})
            return jsonify({"success": False, "error": "Message not found"}), 404
    
    return jsonify({"success": False, "error": "Group not found"}), 404

@app.route('/api/groups/<group_id>/messages', methods=['GET'])
def group_messages_get(group_id):
    channel = request.args.get('channel', 'general').strip()
    all_groups = load_groups()
    for g in all_groups:
        if g.get('id') == group_id:
            all_messages = g.get('messages', [])
            # Filter by channel if specified
            channel_messages = [
                msg for msg in all_messages 
                if msg.get('channel', 'general') == channel
            ]
            return jsonify({"success": True, "messages": channel_messages})
    return jsonify({"success": True, "messages": []})

@app.route('/api/groups/<group_id>/media', methods=['GET'])
def group_media_get(group_id):
    all_groups = load_groups()
    for g in all_groups:
        if g.get('id') == group_id:
            all_messages = g.get('messages', [])
            # Filter for media messages
            media_messages = [
                msg for msg in all_messages 
                if msg.get('fileData') or msg.get('sticker_src') or (msg.get('type') == 'image') or (msg.get('type') == 'video')
            ]
            return jsonify({"success": True, "media": media_messages})
    return jsonify({"success": True, "media": []})

@app.route('/<path:path>')
def serve_static_file(path):
    # Serve frontend files. Map service worker and manifest to root scope from /frontend/js
    if path == 'service-worker.js':
        return send_from_directory(os.path.join(FRONTEND_DIR, 'js'), 'service-worker.js')
    if path == 'manifest.webmanifest':
        return send_from_directory(os.path.join(FRONTEND_DIR, 'js'), 'manifest.webmanifest')
    return send_from_directory(FRONTEND_DIR, path)

@app.route('/api/groups/message/read', methods=['POST'])
def read_group_message_api():
    """Mark a message as read by a user."""
    data = request.json or {}
    group_id = data.get('groupId', '').strip()
    channel = data.get('channel', 'general').strip()
    username = data.get('username', '').strip()
    message_timestamp = data.get('timestamp')
    
    if not group_id or not username or not message_timestamp:
        return jsonify({"success": False, "error": "Missing fields"}), 400
    
    all_groups = load_groups()
    
    for idx, group in enumerate(all_groups):
        if group.get('id') == group_id:
            messages = group.get('messages', [])
            for msg_idx, msg in enumerate(messages):
                if msg.get('timestamp') == message_timestamp and msg.get('channel') == channel:
                    
                    read_by = msg.get('readBy', [])
                    if username not in read_by:
                        read_by.append(username)
                        messages[msg_idx]['readBy'] = read_by
                        all_groups[idx]['messages'] = messages
                        save_groups(all_groups)
                        
                        # Emit read update
                        socketio.emit('group_message_read_update', {
                            'groupId': group_id,
                            'channel': channel,
                            'timestamp': message_timestamp,
                            'readBy': read_by
                        }, room=group_id)
                        
                    return jsonify({"success": True, "readBy": read_by})
            return jsonify({"success": False, "error": "Message not found"}), 404
    
    return jsonify({"success": False, "error": "Group not found"}), 404



@app.route("/api/auth/webauthn/challenge", methods=["POST"])
def webauthn_challenge():
    # Return a random 32-byte challenge encoded in Base64
    challenge = base64.b64encode(os.urandom(32)).decode('utf-8')
    return jsonify({"success": True, "challenge": challenge})

@app.route("/api/auth/webauthn/verify", methods=["POST"])
def webauthn_verify():
    data = request.json or {}
    
    # In a real app, verify signature against stored public key for the user
    # Here we simulate success if the frontend sent a credential
    
    if data.get("mock_success") or data.get("id"):
        users = load_users()
        target_user = None
        if users:
            target_user = users[0] # Pick first user to simulate "Device Owner"
        else:
             # Create one
             target_user = {"username": "BiometricUser", "usertag": "@bio", "password": "bio"}
             users.append(target_user)
             save_users(users)
             
        token = create_session(target_user["username"])
        return jsonify({
            "success": True, 
            "username": target_user["username"], 
            "usertag": target_user.get("usertag", ""),
            "session_token": token
        })
        
    return jsonify({"success": False, "error": "Verification failed"}), 400

@app.route('/api/groups/message/edit', methods=['POST'])
def edit_group_message():
    data = request.json or {}
    group_id = data.get('groupId')
    username = data.get('username')
    new_text = data.get('newMessage')
    timestamp = data.get('timestamp')
    msg_id = data.get('id')
    
    if not group_id or not username or not new_text:
        return jsonify({"success": False, "error": "Missing fields"}), 400

    all_groups = load_groups()
    changed = False
    
    for g in all_groups:
        if g.get('id') == group_id:
            msgs = g.get('messages') or []
            for m in msgs:
                match = False
                if msg_id and m.get('id') == msg_id:
                    match = True
                elif timestamp and (m.get('ts') == timestamp or m.get('timestamp') == timestamp):
                    match = True
                
                if match:
                    if m.get('username') != username:
                        return jsonify({"success": False, "error": "Unauthorized"}), 403
                    
                    if 'history' not in m:
                        m['history'] = []
                    
                    m['history'].append({
                        'message': m.get('message'),
                        'timestamp': int(__import__('time').time())
                    })
                    
                    m['message'] = new_text
                    m['isEdited'] = True
                    changed = True
                    
                    socketio.emit('group_message_updated', {
                        'groupId': group_id,
                        'id': m.get('id'),
                        'timestamp': m.get('ts'),
                        'message': new_text,
                        'isEdited': True
                    }, room=group_id)
                    break
            if changed:
                save_groups(all_groups)
                return jsonify({"success": True})
            
    return jsonify({"success": False, "error": "Message not found"}), 404

@app.route('/api/groups/message/history', methods=['POST'])
def get_message_history():
    data = request.json or {}
    group_id = data.get('groupId')
    msg_id = data.get('id')
    timestamp = data.get('timestamp')
    
    if not group_id:
        return jsonify({"success": False, "error": "Missing groupId"}), 400
        
    all_groups = load_groups()
    for g in all_groups:
        if g.get('id') == group_id:
            msgs = g.get('messages') or []
            for m in msgs:
                match = False
                if msg_id and m.get('id') == msg_id:
                    match = True
                elif timestamp and (m.get('ts') == timestamp or m.get('timestamp') == timestamp):
                    match = True
                    
                if match:
                    return jsonify({
                        "success": True, 
                        "history": m.get('history', []),
                        "currentMessage": m.get('message'),
                        "lastEditedAt": m.get('history')[-1]['timestamp'] if m.get('history') else 0
                    })
                    
    return jsonify({"success": False, "error": "Message not found"}), 404

@app.route('/api/groups/message/delete', methods=['POST'])
def delete_group_message():
    data = request.json or {}
    group_id = data.get('groupId')
    username = data.get('username')
    msg_id = data.get('id')
    timestamp = data.get('timestamp')
    
    if not group_id or not username:
        return jsonify({"success": False, "error": "Missing fields"}), 400

    all_groups = load_groups()
    deleted = False
    
    for idx, g in enumerate(all_groups):
        if g.get('id') == group_id:
            msgs = g.get('messages') or []
            
            # Permission Check
            roles = g.get('roles', {})
            is_owner = g.get('owner') == username
            is_admin = username in roles.get('admin', [])
            is_mod = username in roles.get('moderator', [])
            
            new_msgs = []
            deleted_id = None
            
            for m in msgs:
                match = False
                if msg_id and m.get('id') == msg_id:
                    match = True
                elif timestamp and (m.get('ts') == timestamp or m.get('timestamp') == timestamp):
                    match = True
                
                if match:
                    msg_author = m.get('username')
                    
                    # Logic: 
                    # Owner can delete anyone
                    # Admin can delete anyone except Owner
                    # Mod can delete anyone except Owner/Admin
                    # User can delete their own
                    
                    allowed = False
                    if msg_author == username:
                        allowed = True
                    elif is_owner:
                        allowed = True
                    elif is_admin:
                        author_is_owner = g.get('owner') == msg_author
                        allowed = not author_is_owner
                    elif is_mod:
                        author_is_owner = g.get('owner') == msg_author
                        author_is_admin = msg_author in roles.get('admin', [])
                        allowed = not (author_is_owner or author_is_admin)

                    if allowed:
                        deleted_id = m.get('id')
                        deleted = True
                        continue 
                    else:
                        return jsonify({"success": False, "error": "Unauthorized"}), 403
                new_msgs.append(m)
            
            if deleted:
                all_groups[idx]['messages'] = new_msgs
                save_groups(all_groups)
                
                socketio.emit('group_message_deleted', {
                    'groupId': group_id,
                    'id': deleted_id,
                    'timestamp': timestamp
                }, room=group_id)
                
                return jsonify({"success": True})
                
    return jsonify({"success": False, "error": "Message not found"}), 404

# Role Management Events
@socketio.on('assign_role')
def handle_assign_role(data):
    group_id = (data or {}).get('groupId')
    requester = (data or {}).get('username')
    target_user = (data or {}).get('targetUser')
    role = (data or {}).get('role') # 'admin', 'moderator', 'member' (remove role)
    
    if not group_id or not requester or not target_user or not role:
        return
        
    all_groups = load_groups()
    for idx, g in enumerate(all_groups):
        if g.get('id') == group_id:
            # Only Owner can assign roles currently
            if g.get('owner') != requester:
                return 
            
            if 'roles' not in g:
                all_groups[idx]['roles'] = {'admin': [], 'moderator': []}
            
            # Remove from existing roles first
            if target_user in all_groups[idx]['roles'].get('admin', []):
                all_groups[idx]['roles']['admin'].remove(target_user)
            if target_user in all_groups[idx]['roles'].get('moderator', []):
                all_groups[idx]['roles']['moderator'].remove(target_user)
                
            # Add to new role
            if role == 'admin':
                if 'admin' not in all_groups[idx]['roles']: all_groups[idx]['roles']['admin'] = []
                all_groups[idx]['roles']['admin'].append(target_user)
            elif role == 'moderator':
                if 'moderator' not in all_groups[idx]['roles']: all_groups[idx]['roles']['moderator'] = []
                all_groups[idx]['roles']['moderator'].append(target_user)
            
            save_groups(all_groups)
            
            emit('group_roles_updated', {
                'groupId': group_id,
                'roles': all_groups[idx]['roles']
            }, room=group_id)
            return

@socketio.on('kick_user')
def handle_kick_user(data):
    group_id = (data or {}).get('groupId')
    requester = (data or {}).get('username')
    target_user = (data or {}).get('targetUser')
    
    if not group_id or not requester or not target_user:
        return

    all_groups = load_groups()
    for idx, g in enumerate(all_groups):
        if g.get('id') == group_id:
            roles = g.get('roles', {})
            is_owner = g.get('owner') == requester
            is_admin = requester in roles.get('admin', [])
            is_mod = requester in roles.get('moderator', [])
            
            target_is_owner = g.get('owner') == target_user
            target_is_admin = target_user in roles.get('admin', [])
            target_is_mod = target_user in roles.get('moderator', [])
            
            allowed = False
            if is_owner:
                allowed = True
            elif is_admin:
                allowed = not (target_is_owner or target_is_admin)
            elif is_mod:
                allowed = not (target_is_owner or target_is_admin or target_is_mod)
                
            if allowed and target_user in (g.get('members') or []):
                all_groups[idx]['members'].remove(target_user)
                
                # Also remove from roles if present
                if target_user in roles.get('admin', []): roles['admin'].remove(target_user)
                if target_user in roles.get('moderator', []): roles['moderator'].remove(target_user)
                
                save_groups(all_groups)
                
                emit('user_kicked', {
                    'groupId': group_id,
                    'username': target_user
                }, room=group_id)
            return

@socketio.on('pin_message')
def handle_pin_message(data):
    group_id = (data or {}).get('groupId')
    channel_id = (data or {}).get('channelId')
    msg_id = (data or {}).get('messageId')
    username = (data or {}).get('username')
    action = (data or {}).get('action') # 'pin' or 'unpin'
    
    if not group_id or not channel_id or not msg_id or not username:
        return

    all_groups = load_groups()
    for idx, g in enumerate(all_groups):
        if g.get('id') == group_id:
            # Permissions: Owner, Admin, or Moderator can pin
            roles = g.get('roles', {})
            is_owner = g.get('owner') == username
            is_admin = username in roles.get('admin', [])
            is_mod = username in roles.get('moderator', [])
            
            if not(is_owner or is_admin or is_mod):
                return # unauthorized
            
            channels = g.get('channels', [])
            target_channel = next((c for c in channels if (c.get('id') == channel_id or c == channel_id)), None)
            
            if not target_channel or isinstance(target_channel, str):
                # Basic string channels don't support pins yet, or upgrade them?
                # For v1, let's skip strings or convert them.
                # If it's a string, we can't easily attach pinned_messages without object conversion.
                # Assuming objects for newer channels.
                return 

            if 'pinned_messages' not in target_channel:
                target_channel['pinned_messages'] = []
                
            if action == 'pin':
                if msg_id not in target_channel['pinned_messages']:
                    target_channel['pinned_messages'].append(msg_id)
            elif action == 'unpin':
                 if msg_id in target_channel['pinned_messages']:
                    target_channel['pinned_messages'].remove(msg_id)
            
            # Save
            all_groups[idx]['channels'] = channels # (reference updated, but safe to be explicit)
            save_groups(all_groups)
            
            # Emit update
            emit('message_pinned_update', {
                'groupId': group_id,
                'channelId': channel_id,
                'pinnedMessages': target_channel['pinned_messages']
            }, room=group_id)
            return

@app.route('/api/groups/<group_id>/channels/<channel_id>/pins', methods=['GET'])
def get_pinned_messages(group_id, channel_id):
    all_groups = load_groups()
    group = next((g for g in all_groups if g.get('id') == group_id), None)
    if not group:
        return jsonify({"success": False, "error": "Group not found"}), 404
        
    channels = group.get('channels', [])
    channel = next((c for c in channels if (c.get('id') == channel_id or c == channel_id)), None)
    
    if not channel or isinstance(channel, str):
         return jsonify({"success": True, "messages": []})
         
    pinned_ids = channel.get('pinned_messages', [])
    if not pinned_ids:
        return jsonify({"success": True, "messages": []})
        
    # Fetch actual messages from group['messages']
    all_msgs = group.get('messages', [])
    # Filter by IDs
    found_msgs = [m for m in all_msgs if m.get('id') in pinned_ids]
    
    # Sort by timestamp to keep order? Or keep pin order?
    # Usually pin order (insertion order in list) is preferred, but here we just return them.
    # To preserve pin order:
    ordered_msgs = []
    msg_map = {m['id']: m for m in found_msgs}
    for pid in pinned_ids:
        if pid in msg_map:
            ordered_msgs.append(msg_map.get(pid))
            
    return jsonify({"success": True, "messages": ordered_msgs})

@socketio.on('message_reaction')
def handle_message_reaction(data):
    global messages, dms
    # Unified handler for DMs and Groups
    group_id = (data or {}).get('groupId')
    msg_id = (data or {}).get('messageId')
    username = (data or {}).get('username')
    emoji = (data or {}).get('emoji')
    action = (data or {}).get('action', 'add') # add/remove
    
    if not msg_id or not username or not emoji:
        return
        
    if group_id:
        # handle group reaction logic (reusing or duplicating logic for speed)
        all_groups = load_groups()
        for idx, g in enumerate(all_groups):
            if g.get('id') == group_id:
                group_msgs = g.get('messages', [])
                # Find message by ID
                target_msg = next((m for m in group_msgs if m.get('id') == msg_id), None)
                if target_msg:
                    if 'reactions' not in target_msg: target_msg['reactions'] = {}
                    reactions = target_msg['reactions']
                    
                    if emoji not in reactions: reactions[emoji] = []
                    
                    if action == 'add':
                        if username not in reactions[emoji]: reactions[emoji].append(username)
                    else:
                        if username in reactions[emoji]: reactions[emoji].remove(username)
                        if not reactions[emoji]: del reactions[emoji]
                    
                    all_groups[idx]['messages'] = group_msgs
                    save_groups(all_groups)
                    
                    # Emit (use socketio.emit to include the sender)
                    socketio.emit('message_reaction_update', {
                        'groupId': group_id,
                        'messageId': msg_id,
                        'reactions': reactions
                    }, room=group_id)
                return
    else:
        # Try Community messages first
        target_msg = next((m for m in messages if m.get('id') == msg_id), None)
        if target_msg:
            if 'reactions' not in target_msg: target_msg['reactions'] = {}
            reactions = target_msg['reactions']

            if emoji not in reactions: reactions[emoji] = []

            if action == 'add':
                if username not in reactions[emoji]: reactions[emoji].append(username)
            else:
                if username in reactions[emoji]: reactions[emoji].remove(username)
                if not reactions[emoji]: del reactions[emoji]

            save_messages(messages)

            # Broadcast to all connected clients
            socketio.emit('message_reaction_update', {
                'messageId': msg_id,
                'reactions': reactions
            })
            return

        # DM Reaction
        target_msg = next((m for m in dms if m.get('id') == msg_id), None)
        if target_msg:
            if 'reactions' not in target_msg: target_msg['reactions'] = {}
            reactions = target_msg['reactions']
            
            if emoji not in reactions: reactions[emoji] = []
            
            if action == 'add':
                if username not in reactions[emoji]: reactions[emoji].append(username)
            else:
                if username in reactions[emoji]: reactions[emoji].remove(username)
                if not reactions[emoji]: del reactions[emoji]
            
            save_dms(dms)
            
            # Emit to both sender and recipient
            sender = target_msg.get('from')
            recipient = target_msg.get('to')
            
            payload = {
                'messageId': msg_id,
                'reactions': reactions,
                'peer': username # Who reacted
            }
            
            if sender: socketio.emit('message_reaction_update', payload, room=f"user_{sender}")
            if recipient: socketio.emit('message_reaction_update', payload, room=f"user_{recipient}")

# ==========================================
# MOMENTS IMPLEMENTATION
# ==========================================
MOMENTS_FILE = os.path.join(DATA_DIR, 'moments.json')

def load_moments():
    if not os.path.exists(MOMENTS_FILE):
        return []
    try:
        with open(MOMENTS_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except:
        return []

def save_moments(data):
    try:
        with open(MOMENTS_FILE, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=4)
    except Exception as e:
        print(f"Error saving moments: {e}")

@app.route('/api/moments', methods=['GET'])
def get_moments():
    moments = load_moments()
    # Sort by timestamp desc
    moments.sort(key=lambda x: x.get('timestamp', 0), reverse=True)
    return jsonify({"success": True, "moments": moments})

@app.route('/api/moments', methods=['POST'])
def create_moment():
    data = request.json or {}
    username = data.get('username')
    content = data.get('content')
    image = data.get('image') # Base64 or URL
    
    if not username or (not content and not image):
        return jsonify({"success": False, "error": "Missing content"}), 400
        
    moments = load_moments()
    new_moment = {
        'id': str(__import__('uuid').uuid4()),
        'username': username,
        'content': content,
        'image': image,
        'likes': [],
        'comments': [],
        'timestamp': int(__import__('time').time())
    }
    
    moments.append(new_moment)
    save_moments(moments)
    
    return jsonify({"success": True, "moment": new_moment})

@app.route('/api/moments/like', methods=['POST'])
def like_moment():
    data = request.json or {}
    moment_id = data.get('id')
    username = data.get('username')
    
    if not moment_id or not username:
        return jsonify({"success": False, "error": "Missing fields"}), 400
        
    moments = load_moments()
    moment = next((m for m in moments if m.get('id') == moment_id), None)
    
    if not moment:
        return jsonify({"success": False, "error": "Moment not found"}), 404
        
    if 'likes' not in moment: moment['likes'] = []
    
    if username in moment['likes']:
        moment['likes'].remove(username)
        action = 'unlike'
    else:
        moment['likes'].append(username)
        action = 'like'
        
    save_moments(moments)
    return jsonify({"success": True, "action": action, "likes": moment['likes']})

@app.route('/api/cloud/files', methods=['GET'])
def cloud_list():
    username = request.args.get('username')
    if not username: return jsonify({"success": False, "error": "Username required"}), 400
    
    user_dir = os.path.join(CLOUD_DIR, username)
    if not os.path.exists(user_dir): return jsonify({"success": True, "files": []})
    
    files = []
    try:
        for fname in os.listdir(user_dir):
            fpath = os.path.join(user_dir, fname)
            if os.path.isfile(fpath):
                stat = os.stat(fpath)
                ext = fname.split('.')[-1].lower() if '.' in fname else ''
                ftype = 'application/octet-stream'
                if ext in ['png', 'jpg', 'jpeg', 'gif', 'webp']: ftype = f'image/{ext}'
                
                url = f"/api/cloud/serve/{username}/{fname}"
                files.append({
                    "id": fname,
                    "fileName": fname,
                    "fileType": ftype,
                    "size": stat.st_size,
                    "createdAt": stat.st_ctime,
                    "url": url
                })
        files.sort(key=lambda x: x['createdAt'], reverse=True)
        return jsonify({"success": True, "files": files})
    except Exception as e:
        print("Cloud list error:", e)
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/cloud/serve/<username>/<filename>')
def serve_cloud_file(username, filename):
    user_dir = os.path.join(CLOUD_DIR, username)
    return send_from_directory(user_dir, filename)


# ---------------- AI Chat Endpoints ---------------- #

@app.route('/api/ai/chat', methods=['POST'])
def ai_chat_endpoint():
    data = request.json or {}
    
    # 1. Try to get token from header
    token = None
    auth_header = request.headers.get('Authorization')
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]
    
    # 2. Fallback to body
    if not token:
        token = data.get("token")
        
    # 3. Validate
    username = validate_session(token)
    
    # Allow guest/dev mode if configured, but for now strict
    # For development, if no token, check if we have a global dev user
    if not username:
        # TEMP: Allow if running locally and no auth provided, maybe? 
        # No, better to force auth.
        pass

    return chat_handler.handle_chat_request(data, username)

@app.route('/api/ai/models', methods=['GET'])
def ai_models_endpoint():
    return chat_handler.get_available_models()

@app.route('/api/ai/status', methods=['GET'])
def ai_status_endpoint():
    return chat_handler.check_service_status()

@app.route('/api/proxy/heroicons/<path:filename>')
def serve_heroicon_proxy(filename):
    try:
        url = f"https://unpkg.com/heroicons@2.0.18/24/outline/{filename}"
        resp = requests.get(url, timeout=5)
        if resp.status_code == 200:
            return (resp.content, 200, {'Content-Type': 'image/svg+xml', 'Cache-Control': 'public, max-age=86400'})
        return jsonify({"error": "Icon not found"}), 404
    except Exception as e:
        print(f"Proxy error: {e}")
        return jsonify({"error": str(e)}), 500

# Run the app (IMPORTANT: Use socketio.run to enable Socket.IO support)
if __name__ == "__main__":

    socketio.run(app, host="0.0.0.0", port=5000, debug=True, allow_unsafe_werkzeug=True)
