# Zylo Web Deployment Plan

## Render + Flask + OpenRouter + PostgreSQL + Hybrid AI Routing

**Version 1.6.1 — Antigravity Tracking Edition**

---

## Overview

This document defines the full, production-grade deployment plan for Zylo. It covers
every phase from project structure to security hardening, database migration, and AI
provider routing. All phases are tracked for Antigravity long-term maintenance.

Stack at a glance:

- Flask + Flask-SocketIO backend
- Static frontend assets served via Flask
- OpenRouter for cloud AI (Diszi & Zily personas)
- Render (free tier) for hosting
- PostgreSQL (Render managed) replacing JSON / SQLite storage
- bcrypt password hashing, JWT sessions, rate limiting, input sanitisation
- Hybrid AI provider system (Local Ollama + Bring Your Own Key)

This version ensures zero mandatory AI billing while remaining scalable for future
paid upgrades.

---

## Phase 0 — Goals & Constraints

### Goals

- Turn Zylo into a public website
- Keep the current project structure intact
- Avoid breaking existing assets (images, audio, icons, paths)
- Support realtime chat via Socket.IO
- Use cloud AI via OpenRouter (Not yet decided)
- Stay free / low-cost
- Persist user data reliably across Render cold starts
- Protect user passwords and sessions
- Allow users to bring their own AI API key (Zero developer billing - they'll pay for their own API key)
- Provide all the endpoints of AI API key that they want to use, each in there own category :
   - **Major Providers (Commercial)** : OpenAI, Anthropic, Google (Gemini), Cohere, Groq, Microsoft Azure OpenAI, AI21 Labs, Mistral AI, xAi, Meta.
   - **Fast Providers (Dev-Focused)** : Together AI, Fireworks AI, DeepInfra, Anyscale, Perplexity, OctoAI
   - **Open-Model Hostings** : Hugging Face Interfence, Replicate, Modal, RunPod, Vast.ai
   - **Multi-Model Hostings** : OpenRouter, Together AI, Fireworks AI, DeepInfra
   - **Other** : IBM Watsonx, Amazon Bedrock, Oracle Cloud AI, NVIDIA NIM
- Allow users to use their own Ollama local models (Cloud & Installed)

### Constraints

- Maybe Ollama available on Render web hosting *(Check if they have Ollama install then run their models)*
- Free tier cold starts — in-memory sessions are wiped on restart
- Single backend entry point
- Developer must not be required to pay for AI API usage

---

## Phase 1 — Project Structure *(Final)*

```
Zylo/                           # Same app folder, like still in the current Beta folder
├─ backend/
│  ├─ app.py                    # Main Flask + Socket.IO server
│  ├─ database.py               # PostgreSQL ORM layer (rewritten)
│  ├─ security.py               # Auth helpers: JWT, bcrypt, rate limit (NEW)
│  ├─ migrate_json_to_pg.py     # One-time data migration script (NEW)
│  └─ ai/
│     ├─ model_manager.py       # Hybrid provider router
│     ├─ persona.py             # Diszi & Zily personalities
│     └─ ollama_client.py       # Local Ollama wrapper (optional)
│
├─ frontend/
│  ├─ css/
│  ├─ js/
│  ├─ images/
│  ├─ files/
│  ├─ service-worker.js
│  ├─ manifest.webmanifest
│  └─ mainapp.html (and login.html, signup.html, forgot.html, reset.html, loading.html, offline.html)
│
├─ requirements.txt
├─ README.md
└─ .env                         # Local only — never committed
```

---

## Phase 2 — Backend Changes *(Required)*

### 2.1 Flask Static Serving

Backend serves all frontend assets directly.

- `static_folder` → `../frontend`
- `static_url_path` → `""`
- Main route `/` → `mainapp.html` *(If no account data is loaded → `login.html`)*
- When first enter route `/login.html` → `login.html`

### 2.2 Socket.IO Setup

- Use `flask-socketio` + `eventlet`
- Enable CORS (restrict origins in production via `ALLOWED_ORIGINS` env var)

### 2.3 Render-Compatible Run Command

- Bind to `0.0.0.0`
- Read `PORT` from environment variable

```python
if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    socketio.run(app, host="0.0.0.0", port=port)
```

---

## Phase 3 — AI Provider Strategy

### 3.1 Hybrid AI Architecture *(Zero-Cost Safe Mode)*

To avoid mandatory billing, Zylo uses a provider selection system. When a user
enters AI Chat for the first time, they choose how their AI requests are routed.
After selecting, if the users don't want to see the modal of selecting which AI provider they want to use again,
they can simply tick the box under the providers that said *"Don't show again"*.
But if they want to change the AI api provider, they can also go into `Settings` → `General` → `API Provider`.

#### Provider Options

**Option A — Local Ollama (Fully Free)**

- Runs entirely on the user's machine
- Requires Ollama to be installed locally
- No external API usage
- No billing required

**Option B — Bring Your Own Key (Cloud Mode)**

- User selects their preferred provider *(Look at Goals for all of the API Provides)*
- User pastes their own API key
- Backend uses that key for all AI calls
- Zylo stores no global billing key
- Developer incurs zero AI cost

**Option C — Offline Lite Mode (Fallback)**

- Activated when Ollama is not installed and no API key is provided
- Uses a lightweight rule-based chatbot
- Prevents UI breakage and maintains minimal functionality

### 3.2 First-Time Setup Flow

When a user enters AI Chat for the first time:

1. Show the AI Provider Selection modal
2. Store provider preference in the database (per user)
3. If cloud is selected:
   - Encrypt the API key using the server-side encryption key
   - Store the encrypted key in the `users` table
4. Route all future AI requests according to the stored provider preference

### 3.3 Backend Routing Logic

```python
def query_ai(user, prompt):
    provider = user.ai_provider

    if provider == "ollama":
        return query_ollama_local(prompt)

    elif provider == "openai":
        return query_openai(prompt, decrypt(user.api_key))

    elif provider == "openrouter":
        return query_openrouter(prompt, decrypt(user.api_key))

    elif provider == "anthropic":
        return query_anthropic(prompt, decrypt(user.api_key))

    elif provider == [PROVIDER_NAME]:
        return query_[PROVIDER_NAME](prompt, decrypt(user.api_key))

    else:
        return query_rule_based(prompt)
```

### 3.4 Personas

- **Diszi** (coding assistant) → Qwen Coder via OpenRouter, or local Ollama
- **Zily** (chat companion) → LLaMA / GPT-mini via OpenRouter, or local Ollama

### 3.5 Fallback Chain

```
User's chosen provider
    → Offline Lite Mode (rule-based)
    → Error message with retry guidance
```

---

## Phase 4 — OpenRouter Integration *(Near-Future)*

### 4.1 Environment Variables

```
OPENROUTER_API_KEY=sk-or-xxxx     # Optional — only if developer hosts a shared key
AI_PROVIDER=openrouter
API_KEY_ENCRYPTION_SECRET=<hex>   # Used to encrypt user BYOK keys at rest
```

### 4.2 model_manager Responsibilities

- Detect which provider the user has selected
- Decrypt the user's API key at request time (never stored in plaintext)
- Build the correct HTTP request per provider
- Inject the correct persona system prompt
- Handle errors and timeouts gracefully
- Return plain-text response to the caller

### 4.3 Security Requirements for BYOK

- Never expose API keys in frontend JavaScript
- Encrypt API keys before storing in the database
- Decrypt only at request time, in memory, never logged
- Apply strict per-user rate limiting
- Enforce maximum prompt length
- Enforce per-request token caps

---

## Phase 5 — Frontend Adjustments

### 5.1 Socket.IO Connection

Use dynamic origin — no hardcoded URL:

```javascript
const socket = io();
```

### 5.2 API Calls

- All API calls use relative paths only
- No `localhost` or hardcoded IP references anywhere in JS

### 5.3 Assets

- All assets loaded via relative paths
- No backend path injection needed

### 5.4 AI Provider Modal (NEW)

On first AI Chat launch, show a provider selection screen:

```
┌─────────────────────────────────────┐
│  Choose your AI provider            │
│                                     │
│  ○ Local Ollama (Free)              │
│  ○ OpenAI  [___API Key___]          │
│  ○ OpenRouter  [___API Key___]      │
│  ○ Anthropic  [___API Key___]       │
│                                     │
│            [ Continue ]             │
└─────────────────────────────────────┘
```

Save the choice and encrypted key via `/api/user/ai-provider` (POST).

---

## Phase 6 — Render Deployment

### Render Configuration

| Setting        | Value                                             |
|----------------|---------------------------------------------------|
| Service Type   | Web Service                                       |
| Environment    | Python                                            |
| Build Command  | `pip install -r requirements.txt`                 |
| Start Command  | `python backend/app.py`                           |
| Database       | Render PostgreSQL add-on (Free tier)              |

### Environment Variables to Set on Render

```
DATABASE_URL              (auto-set by Render PostgreSQL add-on)
JWT_SECRET                (generate: python -c "import secrets; print(secrets.token_hex(32))")
API_KEY_ENCRYPTION_SECRET (generate same way)
FLASK_ENV                 production
ALLOWED_ORIGINS           https://your-app.onrender.com
```

### Notes

- Free tier sleeps when idle — first request after sleep may be slow (cold start)
- PostgreSQL data persists across cold starts (unlike in-memory dicts)

---

## Phase 7 — Testing Checklist

### Functional

- [ ] Homepage loads correctly
- [ ] CSS, JS, images, and audio all load
- [ ] Chat sends and receives messages in real time
- [ ] AI replies correctly for both Diszi and Zily
- [ ] AI Provider modal appears on first AI Chat launch
- [ ] BYOK key is saved and used correctly per user
- [ ] Ollama routing works when selected
- [ ] Offline Lite Mode activates when no provider is configured
- [ ] User registration, login, and logout work end-to-end
- [ ] Password hashing verified — no plaintext visible in DB

### Network

- [ ] HTTPS active on Render URL
- [ ] No mixed-content errors in browser console
- [ ] Socket.IO connects and maintains connection
- [ ] Rate limiting blocks abusive request bursts

---

## Phase 8A — PostgreSQL Migration & Security Hardening (NEW)

### Why This Phase Is Critical

| Severity | Issue                                                                                     |
|----------|-------------------------------------------------------------------------------------------|
| CRITICAL | Passwords currently stored in plaintext in `users.json` — immediate fix required          |
| HIGH     | In-memory `active_sessions` dict is wiped on every Render cold start                     |
| HIGH     | JSON files are not atomic — concurrent writes cause silent data corruption                |
| MEDIUM   | No rate limiting — all API endpoints are open to brute-force and abuse                   |
| MEDIUM   | No input sanitisation — unsafe strings can reach the database                            |

---

### 8A.1 — New Dependencies

Add to the current `requirements.txt`:

```
psycopg2-binary>=2.9       # PostgreSQL driver
SQLAlchemy>=2.0            # ORM and connection pooling
Flask-SQLAlchemy>=3.1      # Flask integration
Flask-Migrate>=4.0         # Alembic-based schema migrations
bcrypt>=4.1                # Password hashing
PyJWT>=2.8                 # Stateless JWT session tokens
Flask-Limiter>=3.5         # Per-endpoint rate limiting
bleach>=6.1                # HTML and input sanitisation
python-dotenv>=1.0         # .env loading
```

---

### 8A.2 — Environment Variables

Add to `.env` (local) and the Render dashboard (production):

```
DATABASE_URL=postgresql://user:pass@host:5432/zylo
JWT_SECRET=<random 64-char hex string>
JWT_EXPIRY_HOURS=24
BCRYPT_ROUNDS=12
RATE_LIMIT_DEFAULT=200 per hour
API_KEY_ENCRYPTION_SECRET=<random 64-char hex string>
FLASK_ENV=production
```

---

### 8A.3 — PostgreSQL Schema

All tables are defined via SQLAlchemy ORM in `database.py`:

| Table      | Key Columns                                                       | Replaces        | Notes                             |
|------------|-------------------------------------------------------------------|-----------------|-----------------------------------|
| `users`    | id, username, email, password_hash, avatar, banner, about_me, ai_provider, api_key_enc, created_at, last_active | `users.json` + `users.db` | bcrypt hash only — no plaintext   |
| `messages` | id, room, sender, content, timestamp, reactions (JSON)            | `messages.json` | Indexed on room + timestamp       |
| `dms`      | id, sender, recipient, content, timestamp, reactions (JSON)       | `dms.json`      | Indexed on sender + recipient     |
| `groups`   | id, name, owner, members (JSON), messages (JSON), created_at     | `groups.json`   | Members stored as JSON array      |
| `moments`  | id, username, content, image_url, likes (JSON), timestamp        | `moments.json`  | Paginated via OFFSET              |
| `sessions` | token (PK), username, created_at, expires_at                     | `active_sessions` dict | Survives cold starts         |

---

### 8A.4 — Migration Steps

**Step 1:** Install new dependencies
```bash
pip install -r requirements.txt
```

**Step 2:** Provision Render PostgreSQL
- Attach the free-tier PostgreSQL add-on in Render dashboard
- Copy the auto-generated `DATABASE_URL` into environment variables

**Step 3:** Initialise the schema
```bash
flask db init
flask db migrate -m "initial schema"
flask db upgrade
```

**Step 4:** Run the one-time data migration
```bash
cd backend
python migrate_json_to_pg.py
```
This reads all `.json` files, hashes any plaintext passwords with bcrypt, and inserts
all records into PostgreSQL. Existing DB rows are not overwritten. Supports
`DRY_RUN=1` to preview without writing. 
After migration is done, can either delete or move to a locally folder that is in the `.gitignore`.

**Step 5:** Update `app.py`
- Replace all `load_*()` / `save_*()` JSON calls with SQLAlchemy helpers from `database.py`
- Replace `active_sessions` dict with JWT-based session helpers from `security.py`

**Step 6:** Deploy to Render
- Push to Git, let the Render build run
- Confirm `DATABASE_URL` and all secrets are set
- Verify tables are created on first startup

**Step 7:** Smoke test all endpoints
- Register, login, logout
- Send a message, open a DM
- Create a Moment, like it
- Confirm password is hashed in the DB

---

### 8A.5 — Security Hardening Details

#### Password Hashing (`security.py`)

All passwords are hashed with bcrypt at a work factor of 12 before insertion.
The plaintext password is never stored anywhere. Existing JSON passwords are
re-hashed during migration Step 4.

```python
from security import hash_password, verify_password

# On register
password_hash = hash_password(plain_password)
save_user({"username": "alice", "password_hash": password_hash})

# On login
user = get_user_with_hash("alice")
if verify_password(plain_password, user["password_hash"]):
    token = create_jwt("alice")
```

#### JWT Session Tokens (`security.py`)

The in-memory `active_sessions` dict is replaced with stateless JWTs signed
with `JWT_SECRET`. Sessions survive cold starts. Token format:

```
eyJhbGciOiJIUzI1NiJ9.<payload>.<signature>
```

Claims included: `sub` (username), `jti` (unique ID), `iat` (issued at), `exp` (expires at).
The `jti` is stored in the `sessions` table to enable forced logout.

```python
from security import create_jwt, validate_jwt, get_username_from_request

# Create session on login
result = create_jwt(username)
token = result["token"]

# Validate on protected routes
username = get_username_from_request(request)
if not username:
    return jsonify({"error": "Unauthorized"}), 401
```

#### Rate Limiting (`security.py` + `app.py`)

Flask-Limiter protects all sensitive endpoints:

| Endpoint         | Limit           | Reason                    |
|------------------|-----------------|---------------------------|
| `/api/register`  | 5 per minute    | Prevent account flooding  |
| `/api/login`     | 10 per minute   | Brute-force protection    |
| `/api/ai/chat`   | 30 per minute   | Token cost control        |
| `/api/moments`   | 20 per minute   | Spam prevention           |
| All others       | 200 per hour    | General abuse prevention  |

```python
from security import limiter, LOGIN_LIMIT, REGISTER_LIMIT, AI_CHAT_LIMIT

limiter.init_app(app)

@app.route("/api/login", methods=["POST"])
@limiter.limit(LOGIN_LIMIT)
def login():
    ...
```

#### Input Sanitisation (`security.py`)

All user-supplied strings are passed through `bleach.clean()` before persistence.
Maximum field lengths are enforced at the API layer before hitting the database.

```python
from security import sanitise, sanitise_dict

data = sanitise_dict(request.json, ["username", "content", "about_me"])
```

| Field       | Max Length |
|-------------|------------|
| username    | 64         |
| email       | 256        |
| password    | 128        |
| about_me    | 500        |
| content     | 4000       |
| group_name  | 128        |

#### CORS Hardening

```python
CORS(app, origins=os.getenv("ALLOWED_ORIGINS", "*").split(","))
```

In production, `ALLOWED_ORIGINS` is set to the Render app URL only.

#### BYOK API Key Encryption

User-provided API keys are encrypted with `API_KEY_ENCRYPTION_SECRET` before
being stored in the database, and decrypted in-memory only at request time.
Keys are never logged or exposed to the frontend.

---

### 8A.6 — New & Modified Files

| File                             | Status     | Description                                                    |
|----------------------------------|------------|----------------------------------------------------------------|
| `backend/database.py`            | REWRITTEN  | Full PostgreSQL ORM via SQLAlchemy; all CRUD helpers; no JSON fallback |
| `backend/security.py`            | NEW        | bcrypt hashing, JWT helpers, bleach sanitisation, rate limiter |
| `backend/migrate_json_to_pg.py`  | NEW        | One-time migration: reads JSON, hashes passwords, inserts to PG |
| `backend/app.py`                 | MODIFIED   | Import security.py; swap active_sessions for JWT; add rate limiting |
| `requirements.txt`               | MODIFIED   | 9 new packages added                                           |
| `.env`                           | MODIFIED   | Add DATABASE_URL, JWT_SECRET, API_KEY_ENCRYPTION_SECRET        |

---

### 8A.7 — Rollback Strategy

The original JSON files under `backend/data/` are not deleted during migration —
they remain as read-only backups. If the PostgreSQL connection fails, the app logs
a critical error and returns `503 Service Unavailable` rather than silently
falling back to JSON (which caused silent data divergence in the old design).

---

## Phase 8B — Remaining Future Improvements

- User account management UI (change password, delete account)
- Usage tracking dashboard per user
- Paid plan / per-user token quota system
- Custom domain via Render
- S3 or Cloudflare R2 for file and media uploads instead of local disk
- Redis for rate-limiter storage and Socket.IO adapter (multi-instance scaling)
- Admin dashboard for user management and abuse monitoring (Only `Admin`/`Developer` role users can access)

---

## Phase 9 — Risk Mitigation

| Risk                   | Mitigation                                                                          |
|------------------------|-------------------------------------------------------------------------------------|
| Cold starts            | User loading screen; PostgreSQL keeps data persistent across restarts               |
| API outage             | Fallback AI chain (rule-based Offline Lite Mode)                                    |
| High AI cost           | BYOK model — developer pays nothing; users control their own keys                  |
| Abuse / spam           | Flask-Limiter on all endpoints; bleach sanitisation on all inputs                  |
| Password breach        | bcrypt hashing at work factor 12; no plaintext ever stored                         |
| Session hijack         | JWT signed with strong secret; 24h expiry; HTTPS enforced on Render               |
| DB connection drop     | SQLAlchemy connection pooling with `pool_pre_ping=True`                            |
| BYOK key exposure      | Keys encrypted at rest; decrypted in-memory only; never logged or sent to frontend |
| Concurrent JSON writes | Eliminated — PostgreSQL handles concurrency natively                               |

---

## Phase 10 — Success Criteria

Zylo is considered production-ready when all of the following are true:

1. Public HTTPS URL is accessible on Render
2. Users can chat with Diszi and Zily via their chosen AI provider
3. No local setup is required by end users
4. App remains stable across Render free-tier cold starts
5. All user data is persisted in PostgreSQL — no JSON files in the hot path
6. Zero plaintext passwords exist anywhere in the database
7. Rate limiting is active on all sensitive endpoints
8. Users can select their AI provider on first launch (Ollama, BYOK, or Offline)
9. Developer incurs zero mandatory AI billing

---

*End of Plan — v1.6.1 — Antigravity Tracking Edition*
