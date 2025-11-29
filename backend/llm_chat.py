# backend/llm_chat.py
import uuid
from datetime import datetime, timezone
from typing import Dict, List, Optional, Tuple, Any

from models import (
    ChatResponse,
    Notification,
    ProposedAction,
    User,
)
from absher_agent import build_absher_agent

# Simple in-memory cache of agents per session user (for demo)
# Keyed by session_id (the user_id used by the frontend/backend APIs)
_AGENTS: Dict[str, Any] = {}


def _get_agent_for_user(session_id: str):
    agent = _AGENTS.get(session_id)
    if agent is None:
        agent = build_absher_agent()
        _AGENTS[session_id] = agent
    return agent


# ==========================================================
# UTILITIES: build context strings
# ==========================================================

def build_notifications_context(notifs: List[Notification]) -> str:
    if not notifs:
        return "No proactive notifications were sent yet."

    lines = []
    for n in sorted(notifs, key=lambda x: x.created_at, reverse=True):
        lines.append(
            f"- [{n.created_at.isoformat()}] via {n.channel.upper()}: {n.message}"
        )
    return "\n".join(lines)


def build_services_status(user: User) -> str:
    now = datetime.now(timezone.utc)
    s = user.services

    if not s:
        return "User has no registered services."

    lines = []

    def add_status(label: str, expiry: Optional[datetime]) -> None:
        if expiry is None:
            return

        # make sure it's timezone-aware
        if expiry.tzinfo is None:
            expiry_aware = expiry.replace(tzinfo=timezone.utc)
        else:
            expiry_aware = expiry

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


# ==========================================================
# TOOL -> ProposedAction mapping
# ==========================================================

def _proposed_action_from_tool_input(tool_input: dict) -> ProposedAction:
    """
    Convert submit_renewal_request tool_input into ProposedAction.
    tool_input will look like:
      {
        "user_id": "<session_id>",
        "service_type": "national_id",
        "requires_payment": true,
        "amount": 150.0,
        "currency": "SAR",
        "reason": "Renew iqama with payment of 150 SAR"
      }
    """
    service_type = tool_input.get("service_type")
    requires_payment = bool(tool_input.get("requires_payment", False))
    amount = tool_input.get("amount")
    currency = tool_input.get("currency", "SAR")
    reason = tool_input.get("reason", "Renew the selected service.")

    action_type = f"renew_{service_type}" if service_type else "renew_unknown"

    return ProposedAction(
        id=str(uuid.uuid4()),
        type=action_type,
        description=reason,
        data={
            "service_type": service_type,
            "requires_payment": requires_payment,
            "amount": amount,
            "currency": currency,
        },
    )


# ==========================================================
# MAIN CHAT HANDLER (AgentX-style)
# ==========================================================

async def handle_chat(
    user: User,
    session_id: str,
    message: str,
    notifications: List[Notification],
) -> ChatResponse:
    """
    Use the AbsherAgent (AgentType.OPENAI_FUNCTIONS) with tools + memory.
    Extract any submit_renewal_request tool call as a ProposedAction for the UI popup.

    session_id is the internal user_id used by tools such as submit_renewal_request.
    """
    notifications_context = build_notifications_context(notifications)
    services_status = build_services_status(user)

    # This is the text the agent sees as "input"
    # The SYSTEM_PROMPT in absher_agent.py explains how to interpret this.
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

    # AgentExecutor from initialize_agent (with return_intermediate_steps=True)
    # is synchronous; we call it directly.
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
