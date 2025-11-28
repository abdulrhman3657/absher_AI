from datetime import datetime, timezone
from typing import Tuple

from langchain_core.prompts import ChatPromptTemplate

from config import notification_llm
from models import User, UserService

# We can reuse the same logic as build_services_status,
# but keep it local here to avoid circular imports.
def build_services_status_for_notifications(user: User) -> str:
    now = datetime.now(timezone.utc)

    if not user.services:
        return "User has no registered services."

    lines = []
    for svc in user.services:
        expiry = svc.expiry_date
        if expiry.tzinfo is None:
            expiry = expiry.replace(tzinfo=timezone.utc)

        days_left = (expiry - now).days

        if days_left < 0:
            status = f"EXPIRED {-days_left} day(s) ago (on {expiry.date()})."
        elif days_left <= 3:
            status = f"EXPIRING in {days_left} day(s), on {expiry.date()}."
        else:
            status = f"VALID, expires in {days_left} day(s) on {expiry.date()}."

        lines.append(f"- {svc.service_name}: {status}")

    return "\n".join(lines)


# -------------------------------------------------
# Prompt 1: Proactive expiry SMS
# -------------------------------------------------
proactive_sms_prompt = ChatPromptTemplate.from_template(
    """
You are an assistant that writes VERY short Arabic/English-friendly SMS messages
for the Absher platform users.

Context:
- User name: {user_name}
- Service: {service_name}
- Current status: {service_status}  (e.g. EXPIRING in X days)
- Days left until expiry: {days_left}

Requirements for the SMS:
- Max ~160 characters.
- Start with "Absher Assistant:".
- Use polite and clear language.
- Mention the service and how many days are left (or that it is expired).
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


async def generate_login_summary_messages(user: User) -> str:
    services_status = build_services_status_for_notifications(user)

    prompt_str = login_summary_prompt.format(
        user_name=user.name,
        services_status=services_status,
    )

    ai_msg = await notification_llm.ainvoke(prompt_str)
    text = ai_msg.content.strip()

    in_app = ""
    sms = ""

    # Very simple parsing based on the fixed format
    if "IN_APP:" in text and "SMS:" in text:
        _, rest = text.split("IN_APP:", 1)
        in_app_part, sms_part = rest.split("SMS:", 1)
        in_app = in_app_part.strip()
        sms = sms_part.strip()
    else:
        # Fallback: if format not perfect, just use whole text as in-app
        in_app = text
        sms = "Absher Assistant: تم تسجيل الدخول. كل شيء على ما يرام حالياً."

    return in_app, sms