# backend/absher_tools.py
from typing import Dict, Any, Literal

from pydantic import BaseModel, Field

from absher_rag import search_absher_docs
from store import USERS
from models import ServiceType, User


# ---------- Tool 1: RAG over Absher docs ----------

class SearchAbsherDocsInput(BaseModel):
    query: str = Field(..., description="User question about how Absher services work.")
    k: int = Field(
        4,
        ge=1,
        le=20,
        description="Number of snippets to retrieve from the Absher documentation.",
    )


def search_absher_docs_tool(query: str, k: int = 4) -> str:
    """
    Simple wrapper around the RAG function.
    """
    return search_absher_docs(query=query, k=int(k))


# ---------- Tool 2: submit_renewal_request (popup trigger) ----------

class SubmitRenewalInput(BaseModel):
    user_id: str = Field(
        ...,
        description="Absher internal user id (e.g., 'user123')."
    )
    service_type: Literal[
        "national_id",
        "driver_license",
        "passport",
        "vehicle_registration",
    ] = Field(..., description="Which service to renew.")

    requires_payment: bool = Field(
        True,
        description="True if a payment will be processed with this renewal.",
    )
    amount: float = Field(
        ...,
        description="Payment amount in SAR.",
    )
    currency: str = Field(
        "SAR",
        description="Currency code, usually SAR.",
    )
    reason: str = Field(
        ...,
        description="Short explanation for the UI (what will happen and why).",
    )


def submit_renewal_request_tool(
    user_id: str,
    service_type: str,
    requires_payment: bool,
    amount: float,
    currency: str = "SAR",
    reason: str = "",
) -> Dict[str, Any]:
    """
    This tool DOES NOT actually renew or charge.

    It only packages the renewal intent + payment details so:
    - The agent can reason about success/failure.
    - The backend can later map this call to a ProposedAction + popup.

    The real renewal & payment happen only after /confirm-action.
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
        "requires_payment": requires_payment,
        "amount": amount,
        "currency": currency,
        "reason": reason,
    }
