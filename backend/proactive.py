# backend/proactive.py
from datetime import datetime, timezone
from typing import List

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


async def run_proactive_for_user(user_id: str) -> List[Notification]:
    """
    Run proactive checks ONLY for a single session user.

    - Looks at this user's services.
    - If any are expired / near expiry, generates an SMS notification
      (once per week per service).
    """
    created: List[Notification] = []
    now = datetime.now(timezone.utc)

    user = USERS.get(user_id)
    if not user:
        return created

    for svc in iter_user_services(user):
        days_left = (svc.expiry_date - now).days

        if days_left > EXPIRY_SMS_THRESHOLD_DAYS:
            continue

        # Check if we already sent an SMS recently for this service
        existing = [
            n
            for n in get_user_notifications(user_id)
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
            user_id=user_id,
            channel="sms",
            message=sms_text,
            meta={
                "service_type": svc.service_type,
                "expiry_date": svc.expiry_date.isoformat(),
                "days_left": days_left,
                "source": "proactive_engine_user",
            },
        )
        print(f"[PROACTIVE] Sending SMS to {user.phone_number}: {sms_text}")
        created.append(notif)

    return created