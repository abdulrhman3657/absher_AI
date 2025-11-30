from datetime import datetime, timezone
from typing import Optional, Tuple

from langchain_core.prompts import ChatPromptTemplate

from config import notification_llm
from models import User, UserService


def _build_services_status_for_notifications(user: User) -> str:
    """
    Summarize the user's service status for login summaries.
    """
    now = datetime.now(timezone.utc)
    s = user.services

    if not s:
        return "User has no registered services."

    lines: list[str] = []

    def add_status(label: str, expiry: Optional[datetime]) -> None:
        if expiry is None:
            return

        expiry_aware = (
            expiry.replace(tzinfo=timezone.utc) if expiry.tzinfo is None else expiry
        )
        days_left = (expiry_aware - now).days

        if days_left < 0:
            status = f"EXPIRED {-days_left} day(s) ago (on {expiry_aware.date()})."
        elif days_left <= 3:
            status = f"EXPIRING in {days_left} day(s), on {expiry_aware.date()}."
        else:
            status = f"VALID, expires in {days_left} day(s) on {expiry_aware.date()}."

        lines.append(f"- {label}: {status}")

    add_status("National ID", s.national_id_expire_date)
    add_status("Driver License", s.driver_license_expire_date)
    add_status("Vehicle Registration", s.vehicle_registration_expire_date)
    add_status("Passport", s.passport_expire_date)

    return "\n".join(lines) if lines else "User has no registered services."


# -------------------------------------------------
# Prompt 1: Proactive expiry SMS
# -------------------------------------------------
proactive_sms_prompt = ChatPromptTemplate.from_template(
    """
You are an assistant that writes VERY short SMS messages in Arabic only
for Absher platform users.
All output must be in Arabic.

Context:
- User name: {user_name}
- Service: {service_name}
- Current status: {service_status}
- Days left until expiry: {days_left}

Requirements for the SMS:
- Max ~160 characters.
- Start with "مساعد أبشر:".
- Use polite and clear Arabic.
- Mention the service and expiry status.
- Invite the user to log in or reply to renew.
- Do NOT include any links.
- Return ONLY the SMS text, no explanations.
"""
)


async def generate_proactive_sms_for_service(
    user: User,
    service: UserService,
    days_left: int,
    service_status: str,
) -> str:
    """
    Generate a short Arabic SMS about an expiring/expired service.
    """
    prompt_str = proactive_sms_prompt.format(
        user_name=user.name,
        service_name=service.service_name,
        service_status=service_status,
        days_left=days_left,
    )
    ai_msg = await notification_llm.ainvoke(prompt_str)
    return ai_msg.content.strip()


# -------------------------------------------------
# Prompt 2: Login summary (in-app + SMS)
# -------------------------------------------------
login_summary_prompt = ChatPromptTemplate.from_template(
    """
You are an assistant that summarizes a user's Absher services status.

User:
- Name: {user_name}

Current services status:
{services_status}

You must speak in Arabic.

You must produce two messages:

1) IN_APP message:
- Slightly more detailed and friendly.
- Can be 2-4 short sentences.
- Mention if there are any services expiring soon or expired.
- If everything is fine, reassure the user.

2) SMS message:
- Very short (~160 characters).
- Start with "Absher Assistant:".
- Brief summary of whether everything is OK or which service is expiring soon.
- Invite user to renew if needed.

Return your answer in the following format exactly:

IN_APP:
<in-app message here>

SMS:
<sms message here>
"""
)


async def generate_login_summary_messages(user: User) -> Tuple[str, str]:
    """
    Generate an in-app and SMS login summary (Arabic only).
    """
    services_status = _build_services_status_for_notifications(user)

    prompt_str = login_summary_prompt.format(
        user_name=user.name,
        services_status=services_status,
    )

    ai_msg = await notification_llm.ainvoke(prompt_str)
    text = ai_msg.content.strip()

    in_app = ""
    sms = ""

    if "IN_APP:" in text and "SMS:" in text:
        _, rest = text.split("IN_APP:", 1)
        in_app_part, sms_part = rest.split("SMS:", 1)
        in_app = in_app_part.strip()
        sms = sms_part.strip()
    else:
        # Fallback: if format not perfect, just use whole text as in-app
        in_app = text
        sms = "Absher Assistant:Login completed. Everything is fine at the moment."

    return in_app, sms
