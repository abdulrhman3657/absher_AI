# backend/proactive.py
import threading
import time
from datetime import datetime, timezone
from typing import List

import schedule

from models import Notification, UserService
from store import USERS, add_notification, get_user_notifications
from notification_ai import generate_proactive_sms_for_service

EXPIRY_SMS_THRESHOLD_DAYS = 3  # send SMS if expiry <= 3 days


def _describe_service_status(svc: UserService, now: datetime) -> str:
    days_left = (svc.expiry_date - now).days
    if days_left < 0:
        return f"EXPIRED {-days_left} day(s) ago (on {svc.expiry_date.date()})."
    elif days_left <= EXPIRY_SMS_THRESHOLD_DAYS:
        return f"EXPIRING in {days_left} day(s) on {svc.expiry_date.date()}."
    else:
        return f"VALID, expires in {days_left} day(s) on {svc.expiry_date.date()}."


# ------------ ASYNC VERSION (used by FastAPI endpoint) ------------

async def run_proactive_engine() -> List[Notification]:
    """
    Scan users and generate proactive SMS notifications using the notification LLM.
    This is async because it awaits the OpenAI LLM.
    """
    created: List[Notification] = []
    now = datetime.now(timezone.utc)

    for user in USERS.values():
        for svc in user.services:
            days_left = (svc.expiry_date - now).days

            if days_left <= EXPIRY_SMS_THRESHOLD_DAYS:
                # Check if we already sent an SMS recently for this service
                existing = [
                    n
                    for n in get_user_notifications(user.national_id)
                    if n.channel == "sms"
                    and n.meta.get("service_type") == svc.service_type
                    and (now - n.created_at).days < 7
                ]
                if existing:
                    continue

                service_status = _describe_service_status(svc, now)

                # 🔹 Use LLM 2 to craft SMS text
                sms_text = await generate_proactive_sms_for_service(
                    user=user,
                    service=svc,
                    days_left=days_left,
                    service_status=service_status,
                )

                notif = add_notification(
                    user_id=user.national_id,
                    channel="sms",
                    message=sms_text,
                    meta={
                        "service_type": svc.service_type,
                        "expiry_date": svc.expiry_date.isoformat(),
                        "days_left": days_left,
                        "source": "proactive_engine",
                    },
                )
                # In a real system: send actual SMS here.
                print(f"[PROACTIVE] Sending SMS to {user.phone_number}: {sms_text}")
                created.append(notif)

    return created


# ------------ SYNC WRAPPER (used only by scheduler thread) ------------

def _run_proactive_engine_sync() -> List[Notification]:
    """
    Sync wrapper around the async run_proactive_engine, safe to call
    from the separate scheduler thread (no running event loop there).
    """
    import asyncio

    return asyncio.run(run_proactive_engine())


def _schedule_loop() -> None:
    """Background thread to run schedule pending jobs."""
    while True:
        schedule.run_pending()
        time.sleep(1)


def start_scheduler() -> None:
    """
    Run the proactive engine periodically (every 30 days).
    This will only send SMS every 30 days, as per your requirement.
    """
    # 🔁 Auto SMS every 30 days
    schedule.every(30).days.do(_run_proactive_engine_sync)

    t = threading.Thread(target=_schedule_loop, daemon=True)
    t.start()
