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

# Simple in-memory cache of agents per user (for demo)
_AGENTS: Dict[str, Any] = {}


def _get_agent_for_user(user_id: str):
    agent = _AGENTS.get(user_id)
    if agent is None:
        agent = build_absher_agent()
        _AGENTS[user_id] = agent
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


# ==========================================================
# TOOL -> ProposedAction mapping
# ==========================================================

def _proposed_action_from_tool_input(tool_input: dict) -> ProposedAction:
    """
    Convert submit_renewal_request tool_input into ProposedAction.
    tool_input will look like:
      {
        "user_id": "user123",
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
    message: str,
    notifications: List[Notification],
) -> ChatResponse:
    """
    Use the AbsherAgent (AgentType.OPENAI_FUNCTIONS) with tools + memory.
    Extract any submit_renewal_request tool call as a ProposedAction for the UI popup.
    """
    notifications_context = build_notifications_context(notifications)
    services_status = build_services_status(user)

    # This is the text the agent sees as "input"
    # The SYSTEM_PROMPT in absher_agent.py explains how to interpret this.
    agent_input = f"""
User id: {user.id}
User name: {user.name}

Current services status (SOURCE OF TRUTH):
{services_status}

Recent proactive notifications (historical only):
{notifications_context}

User message:
{message}
""".strip()

    agent = _get_agent_for_user(user.id)

    # AgentExecutor from initialize_agent (with return_intermediate_steps=True)
    # is synchronous; we wrap it in a thread if we want true async later,
    # but for now we call it directly (FastAPI will handle the async boundary).
    # If you want to avoid blocking, you can use run_in_threadpool.
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
