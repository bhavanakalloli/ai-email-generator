from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, EmailStr
from typing import Optional, List
import openai
import os, uuid, json, re
from datetime import datetime
from dotenv import load_dotenv

from database import init_db, get_db
from auth import (
    hash_password, verify_password,
    create_access_token, get_current_user
)

load_dotenv()
init_db()

app = FastAPI(title="AI Email Generator API", version="3.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "https://ai-email-generator-bhavanakalloli.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Model registry ────────────────────────────────────────────────────────────
MODELS = [
    {"id": "gpt-4o-mini",             "label": "GPT-4o Mini",          "provider": "openai"},
    {"id": "gpt-4o",                  "label": "GPT-4o",               "provider": "openai"},
    {"id": "llama-3.3-70b-versatile", "label": "Llama 3.3 70B (Groq)", "provider": "groq"},
    {"id": "llama-3.1-8b-instant",    "label": "Llama 3.1 8B (Groq)",  "provider": "groq"},
    
]
MODEL_MAP = {m["id"]: m for m in MODELS}

def get_provider(model_id): return MODEL_MAP.get(model_id, {}).get("provider", "openai")

# ── AI clients ────────────────────────────────────────────────────────────────
def get_openai_client():
    key = os.getenv("OPENAI_API_KEY")
    if not key: raise HTTPException(500, "OPENAI_API_KEY not set.")
    return openai.OpenAI(api_key=key)

def get_groq_client():
    from groq import Groq
    key = os.getenv("GROQ_API_KEY")
    if not key: raise HTTPException(500, "GROQ_API_KEY not set.")
    return Groq(api_key=key)

def get_gemini_model(model_id):
    import google.generativeai as genai
    key = os.getenv("GEMINI_API_KEY")
    if not key: raise HTTPException(500, "GEMINI_API_KEY not set.")
    genai.configure(api_key=key)
    return genai.GenerativeModel(model_id)

# ── Tone ──────────────────────────────────────────────────────────────────────
TONE_DESCRIPTIONS = {
    "professional": "professionally and concisely, suitable for business communication",
    "friendly":     "in a warm, friendly manner while remaining appropriate",
    "formal":       "in a very formal, structured manner with proper salutations and sign-offs",
    "casual":       "in a casual, conversational tone as if writing to someone you know well",
}

def build_json_prompt(tone):
    return f"""You are an expert professional email writer. Write {TONE_DESCRIPTIONS[tone]}.
Respond ONLY in this exact JSON format with no extra text or markdown:
{{"subject": "concise subject line", "body": "full email body with greeting and sign-off"}}"""

def build_stream_prompt(tone):
    return f"""You are an expert professional email writer. Write {TONE_DESCRIPTIONS[tone]}.
First line MUST be: SUBJECT: <subject here>
Then a blank line, then the full email body. No JSON, no markdown."""

def parse_json(raw):
    try: return json.loads(raw.strip())
    except:
        m = re.search(r'\{.*\}', raw, re.DOTALL)
        return json.loads(m.group()) if m else {"subject": "Email", "body": raw}

# ── Pydantic schemas ──────────────────────────────────────────────────────────
class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str

class LoginRequest(BaseModel):
    email: str
    password: str

class EmailRequest(BaseModel):
    prompt: str
    tone: str
    model: Optional[str] = "gpt-4o-mini"

class EmailResponse(BaseModel):
    id: str
    subject: str
    body: str
    tone: str
    prompt: str
    provider: str
    created_at: str

class HistoryItem(BaseModel):
    id: str
    prompt: str
    subject: str
    body: str
    tone: str
    model: str
    provider: str
    created_at: str

# ── Auth routes ───────────────────────────────────────────────────────────────
@app.get("/")
def root(): return {"message": "AI Email Generator API v3.0.0"}

@app.get("/health")
def health(): return {"status": "ok"}

@app.post("/api/auth/register")
def register(req: RegisterRequest):
    if not req.name.strip() or not req.email.strip() or not req.password.strip():
        raise HTTPException(400, "Name, email and password are required.")
    if len(req.password) < 6:
        raise HTTPException(400, "Password must be at least 6 characters.")

    db = get_db()
    existing = db.execute("SELECT id FROM users WHERE email = ?", (req.email.lower(),)).fetchone()
    if existing:
        db.close()
        raise HTTPException(400, "An account with this email already exists.")

    user_id = str(uuid.uuid4())
    created_at = datetime.utcnow().isoformat()
    db.execute(
        "INSERT INTO users (id, name, email, password, created_at) VALUES (?,?,?,?,?)",
        (user_id, req.name.strip(), req.email.lower(), hash_password(req.password), created_at)
    )
    db.commit()
    db.close()

    token = create_access_token({"sub": user_id, "email": req.email.lower(), "name": req.name.strip()})
    return {"access_token": token, "token_type": "bearer", "name": req.name.strip(), "email": req.email.lower()}

@app.post("/api/auth/login")
def login(req: LoginRequest):
    db = get_db()
    user = db.execute("SELECT * FROM users WHERE email = ?", (req.email.lower(),)).fetchone()
    db.close()

    if not user or not verify_password(req.password, user["password"]):
        raise HTTPException(401, "Invalid email or password.")

    token = create_access_token({"sub": user["id"], "email": user["email"], "name": user["name"]})
    return {"access_token": token, "token_type": "bearer", "name": user["name"], "email": user["email"]}

@app.get("/api/auth/me")
def me(current_user=Depends(get_current_user)):
    return current_user

# ── Email generate (protected) ────────────────────────────────────────────────
@app.post("/api/generate", response_model=EmailResponse)
async def generate_email(request: EmailRequest, current_user=Depends(get_current_user)):
    if not request.prompt.strip(): raise HTTPException(400, "Prompt cannot be empty")
    tone = request.tone.lower()
    if tone not in TONE_DESCRIPTIONS: raise HTTPException(400, "Invalid tone.")

    model_id = request.model or "gpt-4o-mini"
    provider = get_provider(model_id)

    try:
        system_prompt = build_json_prompt(tone)
        if provider == "openai":
            resp = get_openai_client().chat.completions.create(
                model=model_id,
                messages=[{"role":"system","content":system_prompt},{"role":"user","content":request.prompt}],
                max_tokens=800, temperature=0.7,
            )
            parsed = parse_json(resp.choices[0].message.content.strip())
        elif provider == "groq":
            resp = get_groq_client().chat.completions.create(
                model=model_id,
                messages=[{"role":"system","content":system_prompt},{"role":"user","content":request.prompt}],
                max_tokens=800, temperature=0.7,
            )
            parsed = parse_json(resp.choices[0].message.content.strip())
        elif provider == "gemini":
            resp = get_gemini_model(model_id).generate_content(f"{system_prompt}\n\nUser request: {request.prompt}")
            parsed = parse_json(resp.text.strip())
        else:
            raise HTTPException(400, "Unknown provider")

        record_id = str(uuid.uuid4())
        created_at = datetime.utcnow().isoformat()
        db = get_db()
        db.execute(
            "INSERT INTO email_history (id,user_id,prompt,subject,body,tone,model,provider,created_at) VALUES (?,?,?,?,?,?,?,?,?)",
            (record_id, current_user["id"], request.prompt, parsed.get("subject","Email"), parsed.get("body",""), tone, model_id, provider, created_at)
        )
        db.commit(); db.close()

        return EmailResponse(id=record_id, subject=parsed.get("subject","Email"), body=parsed.get("body",""), tone=tone, prompt=request.prompt, provider=provider, created_at=created_at)

    except openai.AuthenticationError: raise HTTPException(401, "Invalid OpenAI API key")
    except openai.RateLimitError: raise HTTPException(429, "OpenAI rate limit exceeded.")
    except HTTPException: raise
    except Exception as e: raise HTTPException(500, f"Error: {str(e)}")


@app.post("/api/generate/stream")
async def generate_email_stream(request: EmailRequest, current_user=Depends(get_current_user)):
    if not request.prompt.strip(): raise HTTPException(400, "Prompt cannot be empty")
    tone = request.tone.lower()
    if tone not in TONE_DESCRIPTIONS: raise HTTPException(400, "Invalid tone.")

    model_id = request.model or "gpt-4o-mini"
    provider = get_provider(model_id)
    stream_prompt = build_stream_prompt(tone)

    async def event_generator():
        full_text = ""; subject = ""; body_started = False
        try:
            def process_delta(delta):
                nonlocal full_text, subject, body_started
                full_text += delta
                chunks = []
                if not body_started:
                    if "\n\n" in full_text:
                        parts = full_text.split("\n\n", 1)
                        fl = parts[0].strip()
                        subject = fl[8:].strip() if fl.upper().startswith("SUBJECT:") else fl
                        chunks.append(json.dumps({"type":"subject","content":subject}))
                        body_started = True
                        if len(parts) > 1 and parts[1]:
                            chunks.append(json.dumps({"type":"body","content":parts[1]}))
                else:
                    chunks.append(json.dumps({"type":"body","content":delta}))
                return chunks

            if provider == "openai":
                stream = get_openai_client().chat.completions.create(
                    model=model_id,
                    messages=[{"role":"system","content":stream_prompt},{"role":"user","content":request.prompt}],
                    max_tokens=800, temperature=0.7, stream=True,
                )
                for chunk in stream:
                    delta = chunk.choices[0].delta.content or ""
                    if delta:
                        for c in process_delta(delta): yield f"data: {c}\n\n"

            elif provider == "groq":
                stream = get_groq_client().chat.completions.create(
                    model=model_id,
                    messages=[{"role":"system","content":stream_prompt},{"role":"user","content":request.prompt}],
                    max_tokens=800, temperature=0.7, stream=True,
                )
                for chunk in stream:
                    delta = chunk.choices[0].delta.content or ""
                    if delta:
                        for c in process_delta(delta): yield f"data: {c}\n\n"

            elif provider == "gemini":
                stream = get_gemini_model(model_id).generate_content(
                    f"{stream_prompt}\n\nUser request: {request.prompt}", stream=True
                )
                for chunk in stream:
                    delta = chunk.text or ""
                    if delta:
                        for c in process_delta(delta): yield f"data: {c}\n\n"

            # Save to DB
            body_text = full_text.split("\n\n", 1)[1] if "\n\n" in full_text else full_text
            record_id = str(uuid.uuid4())
            created_at = datetime.utcnow().isoformat()
            db = get_db()
            db.execute(
                "INSERT INTO email_history (id,user_id,prompt,subject,body,tone,model,provider,created_at) VALUES (?,?,?,?,?,?,?,?,?)",
                (record_id, current_user["id"], request.prompt, subject, body_text, tone, model_id, provider, created_at)
            )
            db.commit(); db.close()
            yield f"data: {json.dumps({'type':'done','id':record_id,'provider':provider})}\n\n"

        except openai.AuthenticationError:
            yield f"data: {json.dumps({'type':'error','content':'Invalid OpenAI API key'})}\n\n"
        except openai.RateLimitError:
            yield f"data: {json.dumps({'type':'error','content':'Rate limit exceeded.'})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'type':'error','content':str(e)})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream", headers={"Cache-Control":"no-cache","X-Accel-Buffering":"no"})


# ── History (protected, per user) ─────────────────────────────────────────────
@app.get("/api/history", response_model=List[HistoryItem])
def get_history(current_user=Depends(get_current_user)):
    db = get_db()
    rows = db.execute(
        "SELECT * FROM email_history WHERE user_id=? ORDER BY created_at DESC LIMIT 50",
        (current_user["id"],)
    ).fetchall()
    db.close()
    return [dict(r) for r in rows]

@app.delete("/api/history")
def clear_history(current_user=Depends(get_current_user)):
    db = get_db()
    db.execute("DELETE FROM email_history WHERE user_id=?", (current_user["id"],))
    db.commit(); db.close()
    return {"message": "History cleared"}

@app.get("/api/models")
def get_models(): return {"models": MODELS}
