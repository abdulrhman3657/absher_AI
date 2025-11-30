import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

from absher_agent import build_absher_agent
from models import ChatResponse, Notification, ProposedAction, User
from pricing import get_service_fee


# Simple in-memory cache of agents per session user (for demo)
# Keyed by session_id (the user_id used by the frontend/backend APIs)
_AGENTS: Dict[str, Any] = {}


def _get_agent_for_user(session_id: str):
    """
    Return a cached agent for the session_id, building it on first use.
    """
    agent = _AGENTS.get(session_id)
    if agent is None:
        agent = build_absher_agent()
        _AGENTS[session_id] = agent
    return agent


def build_notifications_context(notifs: List[Notification]) -> str:
    """
    Convert a list of notifications into a concise context string.
    """
    if not notifs:
        return "No proactive notifications were sent yet."

    lines: List[str] = []
    for n in sorted(notifs, key=lambda x: x.created_at, reverse=True):
        lines.append(f"- [{n.created_at.isoformat()}] via {n.channel.upper()}: {n.message}")
    return "\n".join(lines)


def _add_service_status_line(
    lines: List[str],
    label: str,
    expiry: Optional[datetime],
    now: datetime,
) -> None:
    """
    Helper to format a single service status line.
    """
    if expiry is None:
        return

    expiry_aware = expiry.replace(tzinfo=timezone.utc) if expiry.tzinfo is None else expiry
    days_left = (expiry_aware - now).days

    if days_left < 0:
        status = f"EXPIRED {-days_left} day(s) ago (on {expiry_aware.date()})."
    elif days_left <= 3:
        status = f"EXPIRING in {days_left} day(s), on {expiry_aware.date()}."
    else:
        status = f"VALID, expires in {days_left} day(s) on {expiry_aware.date()}."

    lines.append(f"- {label}: {status}")


def build_services_status(user: User) -> str:
    """
    Build a human-readable description of all user services
    and their expiries. This is the "source of truth" for the agent.
    """
    now = datetime.now(timezone.utc)
    services = user.services

    if not services:
        return "User has no registered services."

    lines: List[str] = []

    _add_service_status_line(lines, "National ID", services.national_id_expire_date, now)
    _add_service_status_line(lines, "Driver License", services.driver_license_expire_date, now)
    _add_service_status_line(
        lines,
        "Vehicle Registration",
        services.vehicle_registration_expire_date,
        now,
    )
    _add_service_status_line(lines, "Passport", services.passport_expire_date, now)

    return "\n".join(lines) if lines else "User has no registered services."


def _proposed_action_from_tool_input(tool_input: dict) -> ProposedAction:
    """
    Convert submit_renewal_request tool_input into ProposedAction.
    Tool no longer contains payment fields; we compute them here
    using the official pricing API.
    """
    service_type = tool_input.get("service_type")
    reason = tool_input.get("reason", "Renew the selected service.")

    amount = get_service_fee(service_type)
    currency = "SAR"
    action_type = f"renew_{service_type}" if service_type else "renew_unknown"

    return ProposedAction(
        id=str(uuid.uuid4()),
        type=action_type,
        description=f"{reason} (الرسوم {amount} {currency})",
        data={
            "service_type": service_type,
            "amount": amount,
            "currency": currency,
        },
    )


async def handle_chat(
    user: User,
    session_id: str,
    message: str,
    notifications: List[Notification],
) -> ChatResponse:
    """
    Main chat handler using the AbsherAgent (AgentType.OPENAI_FUNCTIONS).

    It:
    - Builds a structured input containing user data, service status, and notifications.
    - Calls the agent synchronously (LangChain AgentExecutor).
    - Extracts any submit_renewal_request tool call as a ProposedAction
      for the UI popup.
    """
    notifications_context = build_notifications_context(notifications)
    services_status = build_services_status(user)

    agent_input = f"""
Internal user_id (for tools): {session_id}
National ID: {user.national_id}
User name: {user.name}

Current services status (SOURCE OF TRUTH):
{services_status}

Recent proactive notifications (historical only):
{notifications_context}

User message:
{message}
""".strip()

    agent = _get_agent_for_user(session_id)
    result = agent({"input": agent_input})

    reply_text: str = result.get("output", "")
    proposed_action: Optional[ProposedAction] = None

    # intermediate_steps: List[Tuple[AgentAction, Any]]
    intermediate_steps: List[Tuple[Any, Any]] = result.get("intermediate_steps", [])

    for action, _tool_result in intermediate_steps:
        # For AgentType.OPENAI_FUNCTIONS, action.tool is the tool name
        if getattr(action, "tool", None) == "submit_renewal_request":
            tool_input = getattr(action, "tool_input", {}) or {}
            if isinstance(tool_input, dict):
                proposed_action = _proposed_action_from_tool_input(tool_input)
                break

    return ChatResponse(
        reply=reply_text,
        proposed_action=proposed_action,
    )
