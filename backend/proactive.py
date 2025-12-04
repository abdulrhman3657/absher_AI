# backend/proactive.py
import threading
import time
from datetime import datetime, timezone
from typing import List

import schedule

from models import Notification, UserService
from notification_ai import generate_proactive_sms_for_service
from store import USERS, add_notification, get_user_notifications, iter_user_services

EXPIRY_SMS_THRESHOLD_DAYS = 3  # send SMS if expiry <= 3 days


def _describe_service_status(svc: UserService, now: datetime) -> str:
    """
    Human-readable description of a service status given the current time.
    """
    days_left = (svc.expiry_date - now).days
    if days_left < 0:
        return f"EXPIRED {-days_left} day(s) ago (on {svc.expiry_date.date()})."
    if days_left <= EXPIRY_SMS_THRESHOLD_DAYS:
        return f"EXPIRING in {days_left} day(s) on {svc.expiry_date.date()}."
    return f"VALID, expires in {days_left} day(s) on {svc.expiry_date.date()}."


async def run_proactive_engine() -> List[Notification]:
    """
    Scan session users and generate proactive SMS notifications using the notification LLM.
    Each logged-in browser session gets its own notifications and SMS messages.
    """
    created: List[Notification] = []
    now = datetime.now(timezone.utc)

    for session_id, user in USERS.items():
        for svc in iter_user_services(user):
            days_left = (svc.expiry_date - now).days

            if days_left > EXPIRY_SMS_THRESHOLD_DAYS:
                continue

            # Check if we already sent an SMS recently for this service
            existing = [
                n
                for n in get_user_notifications(session_id)
                if n.channel == "sms"
                and n.meta.get("service_type") == svc.service_type
                and (now - n.created_at).days < 7
            ]
            if existing:
                continue

            service_status = _describe_service_status(svc, now)

            sms_text = await generate_proactive_sms_for_service(
                user=user,
                service=svc,
                days_left=days_left,
                service_status=service_status,
            )

            notif = add_notification(
                user_id=session_id,
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


def _run_proactive_engine_sync() -> List[Notification]:
    """
    Sync wrapper around the async run_proactive_engine, safe to call
    from the separate scheduler thread (no running event loop there).
    """
    import asyncio

    return asyncio.run(run_proactive_engine())


def _schedule_loop() -> None:
    """
    Background thread to run scheduled jobs.
    """
    while True:
        schedule.run_pending()
        time.sleep(1)


def start_scheduler() -> None:
    """
    Run the proactive engine periodically (every 30 days).
    This will only send SMS every 30 days, as per your requirement.
    """
    schedule.every(30).days.do(_run_proactive_engine_sync)

    thread = threading.Thread(target=_schedule_loop, daemon=True)
    thread.start()
