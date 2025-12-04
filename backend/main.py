# backend/main.py
import asyncio
import io
import uuid
from typing import Dict, List

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response

from config import audio_client
from llm_chat import handle_chat
from models import (
    ChatRequest,
    ChatResponse,
    ConfirmActionRequest,
    ConfirmActionResponse,
    LoginRequest,
    LoginResponse,
    NotificationOut,
    PaymentRequest,
    PaymentResponse,
    TextToSpeechRequest,
)
from notification_ai import generate_login_summary_messages
from proactive import run_proactive_engine, start_scheduler
from store import (
    USERS,
    add_notification,
    create_session_user_from_template,
    get_user_by_username,
    get_user_notifications,
    renew_expiring_services_for_user,
    search_notifications,
    renew_specific_service_for_user
)

SERVICE_NAME_AR: Dict[str, str] = {
    "National ID": "الهوية الوطنية",
    "Driver License": "رخصة القيادة",
    "Vehicle Registration": "استمارة المركبة",
    "Passport": "جواز السفر",
}

app = FastAPI(title="Absher Proactive Agent Backend")

# allow your Vite frontend in dev
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://absher-ai-1.onrender.com",
    # "http://localhost" etc. can be added if needed
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def on_startup() -> None:
    """
    Start background scheduler for proactive notifications.
    """
    start_scheduler()


# -------------------------------------------------------------------
# Utility helpers
# -------------------------------------------------------------------


def _get_session_user_or_404(user_id: str):
    user = USERS.get(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


def _notification_to_out(n) -> NotificationOut:
    return NotificationOut(
        id=n.id,
        channel=n.channel,
        message=n.message,
        created_at=n.created_at,
        meta=n.meta,
    )


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

    session_id = create_session_user_from_template(template_user)

    async def _create_login_notification(session_user_id: str):
        try:
            user_obj = USERS.get(session_user_id)
            if not user_obj:
                return

            in_app_msg, sms_msg = await generate_login_summary_messages(user_obj)

            add_notification(
                user_id=session_user_id,
                channel="in_app",
                message=in_app_msg,
                meta={"source": "login_summary"},
            )
            # SMS text (sms_msg) can be used in a real system to send an SMS.
        except Exception as exc:  # noqa: BLE001
            print(f"[LOGIN] Failed to generate login summary notification: {exc}")

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
    user = _get_session_user_or_404(payload.user_id)

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
    _get_session_user_or_404(user_id)

    notifs = get_user_notifications(user_id)
    notifs_sorted = sorted(notifs, key=lambda x: x.created_at, reverse=True)

    return [_notification_to_out(n) for n in notifs_sorted]


@app.post("/confirm-action", response_model=ConfirmActionResponse)
async def confirm_action(payload: ConfirmActionRequest) -> ConfirmActionResponse:
    """
    Confirm or reject an action proposed by the agent.

    Only renews the specific service the user confirmed, instead of
    all expiring services.
    """
    user = _get_session_user_or_404(payload.user_id)

    if payload.accepted:
        renewed = renew_specific_service_for_user(
            user_id=payload.user_id,
            service_type=payload.service_type,
        )

        if renewed:
            # renewed is a single UserService
            name_en = renewed.service_name
            name_ar = SERVICE_NAME_AR.get(name_en, name_en)
            date_str = renewed.expiry_date.date().isoformat()
            services_str = f"{name_ar} (تاريخ الانتهاء الجديد {date_str})"
            detail = f"تم الدفع وتجديد الخدمة التالية بنجاح: {services_str}."
        else:
            detail = (
                "تم تأكيد الطلب، ولكن لا توجد خدمة منتهية أو قريبة الانتهاء "
                "من النوع المحدد ليتم تجديدها حالياً."
            )
        status = "accepted"
    else:
        detail = "تم إلغاء طلب تجديد الخدمة بناءً على اختيارك."
        status = "rejected"

    print(f"[ACTION] {status.upper()} for user {user.national_id}: {detail}")

    return ConfirmActionResponse(status=status, detail=detail)


@app.post("/run_proactive", response_model=List[NotificationOut])
async def run_proactive_endpoint() -> List[NotificationOut]:
    """
    Manual trigger for the proactive engine.
    Frontend uses this button in the SMS mock panel.
    """
    created = await run_proactive_engine()
    return [_notification_to_out(n) for n in created]


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

        file_obj = io.BytesIO(raw_bytes)
        file_obj.name = audio.filename or "recording.webm"

        transcript = audio_client.audio.transcriptions.create(
            model="gpt-4o-mini-transcribe",
            file=file_obj,
            response_format="json",
        )

        return {"text": transcript.text}
    except Exception as exc:  # noqa: BLE001
        print("[VOICE] Transcription error:", exc)
        raise HTTPException(status_code=500, detail="Transcription failed") from exc


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

    except Exception as exc:  # noqa: BLE001
        print("[VOICE] TTS error:", exc)
        raise HTTPException(status_code=500, detail="TTS failed") from exc


@app.post("/payment/charge", response_model=PaymentResponse)
async def charge_payment(payload: PaymentRequest) -> PaymentResponse:
    """
    Demo payment endpoint.
    Always returns success — no validation, no failures.
    """
    tx_id = str(uuid.uuid4())

    print(
        f"[PAYMENT] Demo success: user={payload.user_id}, "
        f"action={payload.action_id}, amount={payload.amount} "
        f"{payload.currency}, tx={tx_id}"
    )

    return PaymentResponse(
        status="success",
        transaction_id=tx_id,
        amount=payload.amount,
        currency=payload.currency,
    )


if __name__ == "__main__":
    import os

    import uvicorn

    port = int(os.getenv("PORT", "8000"))  # Render sets PORT
    uvicorn.run("main:app", host="0.0.0.0", port=port)
