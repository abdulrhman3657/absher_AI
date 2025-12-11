# backend/main.py
import os
import io
import uuid
from typing import Dict, List
from pathlib import Path

import requests
from PIL import Image

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from fastapi.staticfiles import StaticFiles

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
    UploadMediaResponse,
)
from notification_ai import generate_login_summary_messages
from proactive import run_proactive_for_user
from store import (
    USERS,
    add_notification,
    add_user_media,
    create_session_user_from_template,
    get_user_by_username,
    get_user_notifications,
    renew_specific_service_for_user,
    search_notifications,
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
    # add more if needed
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = Path(__file__).with_name("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

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
# Image upload / ID photo processing
# -------------------------------------------------------------------


@app.post("/upload/id-photo", response_model=UploadMediaResponse)
async def upload_id_photo(
    user_id: str = Form(...),
    file: UploadFile = File(...),
) -> UploadMediaResponse:
    """
    Upload a user photo to be used for National ID renewal (demo only).

    Steps:
    - Validate it's an image
    - Call remove.bg to remove the background and replace with white
    - Center-crop the result to 6x8 (3:4 aspect ratio), always
    - Resize to a fixed ID-friendly resolution (600x800)
    - Save to disk and register via add_user_media
    """
    _get_session_user_or_404(user_id)

    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=400,
            detail="الملف يجب أن يكون صورة (image/*).",
        )

    contents = await file.read()
    if not contents:
        raise HTTPException(status_code=400, detail="الملف فارغ.")

    # Get remove.bg API key from environment
    removebg_api_key = os.getenv("REMOVEBG_API_KEY")
    if not removebg_api_key:
        raise HTTPException(
            status_code=500,
            detail="خدمة إزالة الخلفية غير مفعلة (REMOVEBG_API_KEY مفقود).",
        )

    # --- Call remove.bg API ---
    # - bg_color=ffffff: white background
    # - crop=true + crop_margin: trim empty space but keep some margin around subject
    try:
        response = requests.post(
            "https://api.remove.bg/v1.0/removebg",
            headers={"X-Api-Key": removebg_api_key},
            files={"image_file": ("upload", contents, file.content_type)},
            data={
                "size": "auto",
                "crop": "true",
                "crop_margin": "10%",
                "bg_color": "ffffff",
                # You can tune scale to zoom in/out globally if needed:
                # "scale": "80%",
            },
            timeout=30,
        )
    except requests.RequestException as exc:
        print("[UPLOAD] remove.bg request error:", exc)
        raise HTTPException(
            status_code=502,
            detail="تعذر الاتصال بخدمة إزالة الخلفية.",
        ) from exc

    if response.status_code != 200:
        print("[UPLOAD] remove.bg error:", response.status_code, response.text)
        raise HTTPException(
            status_code=502,
            detail="فشل في إزالة خلفية الصورة. الرجاء المحاولة لاحقاً.",
        )

    processed_bytes = response.content
    if not processed_bytes:
        raise HTTPException(
            status_code=502,
            detail="خدمة إزالة الخلفية لم ترجع صورة صالحة.",
        )

    # --- Open processed image with Pillow ---
    try:
        img = Image.open(io.BytesIO(processed_bytes))
    except Exception as exc:  # noqa: BLE001
        print("[UPLOAD] Failed to open processed image:", exc)
        raise HTTPException(
            status_code=502,
            detail="فشل في قراءة الصورة بعد إزالة الخلفية.",
        ) from exc

    # Ensure RGB (remove.bg may return PNG with alpha)
    if img.mode not in ("RGB", "L"):
        img = img.convert("RGB")

    # --- Center crop to 6x8 (3:4 aspect ratio), always ---
    # 6x8 => aspect ratio width/height = 3/4 = 0.75
    target_ratio = 3 / 4  # width / height

    width, height = img.size
    if height == 0 or width == 0:
        raise HTTPException(
            status_code=500,
            detail="الصورة الناتجة غير صالحة (أبعاد صفرية).",
        )

    current_ratio = width / height

    if current_ratio > target_ratio:
        # Image is too wide -> crop width
        new_width = int(height * target_ratio)
        left = (width - new_width) // 2
        right = left + new_width
        top = 0
        bottom = height
    elif current_ratio < target_ratio:
        # Image is too tall -> crop height
        new_height = int(width / target_ratio)
        top = (height - new_height) // 2
        bottom = top + new_height
        left = 0
        right = width
    else:
        # Already exactly 3:4 -> we still crop a bit to "zoom" slightly
        zoom_factor = 0.9  # keep 90% of width/height
        new_width = int(width * zoom_factor)
        new_height = int(height * zoom_factor)
        left = (width - new_width) // 2
        top = (height - new_height) // 2
        right = left + new_width
        bottom = top + new_height

    img = img.crop((left, top, right, bottom))

    # --- Resize to fixed ID-style dimensions (still 3:4) ---
    target_size = (600, 800)  # (width, height)
    img = img.resize(target_size, Image.LANCZOS)

    # --- Save final image to disk as JPEG ---
    filename = f"{user_id}_{uuid.uuid4().hex}.jpg"
    out_path = UPLOAD_DIR / filename

    try:
        img.save(out_path, format="JPEG", quality=90)
    except Exception as exc:  # noqa: BLE001
        print("[UPLOAD] Failed to save processed image:", exc)
        raise HTTPException(
            status_code=500,
            detail="فشل حفظ الصورة بعد المعالجة.",
        ) from exc

    media = add_user_media(user_id=user_id, kind="id_photo", filename=filename)

    return UploadMediaResponse(media_id=media.id, kind=media.kind)


# -------------------------------------------------------------------
# Health, login, chat, notifications, proactive, voice, payment
# -------------------------------------------------------------------


@app.get("/health")
async def health() -> Dict[str, str]:
    return {"status": "ok"}


@app.post("/login", response_model=LoginResponse)
async def login(payload: LoginRequest) -> LoginResponse:
    template_user = get_user_by_username(payload.username)
    if not template_user or template_user.password != payload.password:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    session_id = create_session_user_from_template(template_user)

    # 1) In-app login summary (synchronous)
    try:
        user_obj = USERS.get(session_id)
        if user_obj:
            in_app_msg, sms_msg = await generate_login_summary_messages(user_obj)

            add_notification(
                user_id=session_id,
                channel="in_app",
                message=in_app_msg,
                meta={"source": "login_summary"},
            )
    except Exception as exc:  # noqa: BLE001
        print(f"[LOGIN] Failed to generate login summary notification: {exc}")

    # 2) Proactive SMS for THIS user only
    try:
        await run_proactive_for_user(session_id)
    except Exception as exc:  # noqa: BLE001
        print(f"[LOGIN] Failed to run proactive engine for user {session_id}: {exc}")

    return LoginResponse(
        user_id=session_id,
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

    Now it renews ONLY the specific service type included in the payload,
    instead of all expiring services.
    """
    user = _get_session_user_or_404(payload.user_id)

    if payload.accepted:
        renewed = renew_specific_service_for_user(
            user_id=payload.user_id,
            service_type=payload.service_type,
        )

        if renewed:
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
async def run_proactive_endpoint(user_id: str) -> List[NotificationOut]:
    """
    Manual trigger for the proactive engine for a SINGLE user.
    Frontend uses this button in the SMS mock panel.
    """
    _get_session_user_or_404(user_id)

    created = await run_proactive_for_user(user_id)
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
    import uvicorn

    port = int(os.getenv("PORT", "8000"))  # Render sets PORT
    uvicorn.run("main:app", host="0.0.0.0", port=port)
