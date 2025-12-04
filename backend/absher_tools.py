# backend/absher_tools.py
from typing import Any, Dict, Literal

from pydantic import BaseModel, Field

from absher_rag import search_absher_docs
from models import ServiceType, User
from store import USERS


# ---------- Tool 1: RAG over Absher docs ----------


class SearchAbsherDocsInput(BaseModel):
    query: str = Field(
        ...,
        description="User question about how Absher services work.",
    )
    k: int = Field(
        4,
        ge=1,
        le=20,
        description="Number of snippets to retrieve from the Absher documentation.",
    )


def search_absher_docs_tool(query: str, k: int = 4) -> str:
    """
    Simple wrapper around the RAG search function.
    """
    return search_absher_docs(query=query, k=int(k))


# ---------- Tool 2: submit_renewal_request (popup trigger) ----------


class SubmitRenewalInput(BaseModel):
    user_id: str = Field(
        ...,
        description="Absher internal user id (e.g., 'user123').",
    )
    service_type: Literal[
        "national_id",
        "driver_license",
        "passport",
        "vehicle_registration",
    ] = Field(..., description="Which service to renew.")
    reason: str = Field(
        ...,
        description="Short explanation for the UI (what will happen and why).",
    )


def submit_renewal_request_tool(
    user_id: str,
    service_type: str,
    reason: str,
) -> Dict[str, Any]:
    """
    SAFE TOOL: only signals intent to renew a service.

    It does NOT:
    - choose amounts
    - handle payment
    - mark anything as renewed

    The backend and UI will:
    - look up the official price for this service
    - ask the user for payment details
    - then, if successful, call /confirm-action.
    """
    user: User | None = USERS.get(user_id)
    if not user:
        return {
            "ok": False,
            "reason": "unknown_user",
            "message": f"User {user_id} not found.",
        }

    return {
        "ok": True,
        "user_id": user_id,
        "service_type": service_type,
        "reason": reason,
    }
