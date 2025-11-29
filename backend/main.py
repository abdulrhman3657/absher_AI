# backend/main.py
from typing import Dict, List

from config import audio_client
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
import io
import asyncio

from llm_chat import handle_chat
from models import (
    ChatRequest,
    ChatResponse,
    ConfirmActionRequest,
    ConfirmActionResponse,
    NotificationOut,
    LoginRequest,
    LoginResponse,
    TextToSpeechRequest,
)
from proactive import run_proactive_engine, start_scheduler
from notification_ai import generate_login_summary_messages

from store import (
    USERS,
    get_user_notifications,
    search_notifications,
    get_user_by_username,
    renew_expiring_services_for_user,
    add_notification,
    create_session_user_from_template,
)


# -------------------------------------------------------------------
# FastAPI app + CORS
# -------------------------------------------------------------------

app = FastAPI(title="Absher Proactive Agent Backend")

# allow your Vite frontend in dev
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://absher-ai-1.onrender.com",
]
# origins = ["*"]


app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# -------------------------------------------------------------------
# Startup: start proactive scheduler
# -------------------------------------------------------------------

@app.on_event("startup")
async def on_startup() -> None:
    start_scheduler()


# -------------------------------------------------------------------
# Endpoints
# -------------------------------------------------------------------

@app.get("/health")
async def health() -> Dict[str, str]:
    return {"status": "ok"}


@app.post("/login", response_model=LoginResponse)
async def login(payload: LoginRequest) -> LoginResponse:
    """
    Login using template users from users.json, then create a
    per-session user clone so multiple people can safely use the
    same demo accounts in parallel.
    """
    template_user = get_user_by_username(payload.username)
    if not template_user or template_user.password != payload.password:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    # Create a new in-memory session user based on the template
    session_id = create_session_user_from_template(template_user)

    async def _create_login_notification(session_user_id: str):
        try:
            user_obj = USERS.get(session_user_id)
            if not user_obj:
                return
            in_app_msg, sms_msg = await generate_login_summary_messages(user_obj)

            # Attach notification to this specific session user
            add_notification(
                user_id=session_user_id,
                channel="in_app",
                message=in_app_msg,
                meta={"source": "login_summary"},
            )
        except Exception as e:
            print(f"[LOGIN] Failed to generate login summary notification: {e}")

    asyncio.create_task(_create_login_notification(session_id))

    return LoginResponse(
        user_id=session_id,  # frontend stores this as user_id
        name=template_user.name,
    )


@app.post("/chat", response_model=ChatResponse)
async def chat_endpoint(payload: ChatRequest) -> ChatResponse:
    """
    Main chat endpoint. Uses LangChain LLM and passes in
    recent notifications for 'did you send me this?' questions.

    payload.user_id is the session_id for this browser/user.
    """
    user = USERS.get(payload.user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Try fuzzy notifications first; if nothing, fall back to all
    similar_notifs = search_notifications(payload.user_id, payload.message, k=3)
    if not similar_notifs:
        similar_notifs = get_user_notifications(payload.user_id)

    return await handle_chat(
        user=user,
        session_id=payload.user_id,
        message=payload.message,
        notifications=similar_notifs,
    )


@app.get("/notifications/{user_id}", response_model=List[NotificationOut])
async def list_notifications(user_id: str) -> List[NotificationOut]:
    """
    List all notifications for a given session user.
    Used by the frontend to show SMS + in-app history.
    """
    user = USERS.get(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    notifs = get_user_notifications(user_id)
    notifs_sorted = sorted(notifs, key=lambda x: x.created_at, reverse=True)

    return [
        NotificationOut(
            id=n.id,
            channel=n.channel,
            message=n.message,
            created_at=n.created_at,
            meta=n.meta,
        )
        for n in notifs_sorted
    ]


@app.post("/confirm-action", response_model=ConfirmActionResponse)
async def confirm_action(payload: ConfirmActionRequest) -> ConfirmActionResponse:
    """
    Confirm or reject an action proposed by the agent.
    Now it actually renews expiring services for the *session* user.
    """
    user = USERS.get(payload.user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if payload.accepted:
        renewed = renew_expiring_services_for_user(payload.user_id)

        if renewed:
            services_str = ", ".join(
                f"{svc.service_name} (new expiry {svc.expiry_date.date()})"
                for svc in renewed
            )
            detail = (
                f"Action {payload.action_id} accepted. "
                f"The following services were renewed: {services_str}."
            )
        else:
            detail = (
                f"Action {payload.action_id} accepted, "
                "but no expiring services were found to renew."
            )
        status = "accepted"
    else:
        detail = f"Action {payload.action_id} rejected by user."
        status = "rejected"

    print(f"[ACTION] {status.upper()}: {detail}")
    return ConfirmActionResponse(status=status, detail=detail)


@app.post("/run_proactive", response_model=List[NotificationOut])
async def run_proactive_endpoint() -> List[NotificationOut]:
    """
    Manual trigger for the proactive engine.
    Frontend uses this button in the SMS mock panel.
    """
    created = await run_proactive_engine()

    return [
        NotificationOut(
            id=n.id,
            channel=n.channel,
            message=n.message,
            created_at=n.created_at,
            meta=n.meta,
        )
        for n in created
    ]


# ================================
# Voice: speech-to-text
# ================================
@app.post("/voice/transcribe")
async def transcribe_audio(audio: UploadFile = File(...)):
    """
    Accepts an audio file (e.g. webm/ogg/mp3) and returns a transcription
    using OpenAI gpt-4o-mini-transcribe.
    """
    try:
        raw_bytes = await audio.read()
        if not raw_bytes:
            raise HTTPException(status_code=400, detail="Empty audio file")

        # Wrap bytes in a file-like object for the OpenAI client
        file_obj = io.BytesIO(raw_bytes)
        file_obj.name = audio.filename or "recording.webm"

        transcript = audio_client.audio.transcriptions.create(
            model="gpt-4o-mini-transcribe",
            file=file_obj,
            # Let the model auto-detect language (Arabic/English)
            response_format="json",
        )

        return {"text": transcript.text}
    except Exception as e:
        print("[VOICE] Transcription error:", e)
        raise HTTPException(status_code=500, detail="Transcription failed")


# ================================
# Voice: text-to-speech
# ================================
@app.post("/voice/tts")
async def text_to_speech(payload: TextToSpeechRequest):
    """
    Accepts text and returns an MP3 audio blob using gpt-4o-mini-tts.
    """
    try:
        tts_response = audio_client.audio.speech.create(
            model="gpt-4o-mini-tts",
            voice="alloy",
            input=payload.text,
        )

        audio_bytes = tts_response.read()

        return Response(content=audio_bytes, media_type="audio/mpeg")

    except Exception as e:
        print("[VOICE] TTS error:", e)
        raise HTTPException(status_code=500, detail="TTS failed")


# -------------------------------------------------------------------
# Uvicorn entrypoint
# -------------------------------------------------------------------

if __name__ == "__main__":
    import uvicorn
    import os

    port = int(os.getenv("PORT", "8000"))  # Render sets PORT

    uvicorn.run("main:app", host="0.0.0.0", port=port)
