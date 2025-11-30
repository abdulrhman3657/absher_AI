from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field


class ServicesExpiry(BaseModel):
    driver_license_expire_date: Optional[datetime] = None
    vehicle_registration_expire_date: Optional[datetime] = None
    passport_expire_date: Optional[datetime] = None
    national_id_expire_date: Optional[datetime] = None


class ServiceType(str, Enum):
    NATIONAL_ID = "national_id"
    LICENSE = "driver_license"
    PASSPORT = "passport"
    VEHICLE = "vehicle_registration"


class UserService(BaseModel):
    service_type: ServiceType
    service_name: str
    expiry_date: datetime


class User(BaseModel):
    national_id: str           # template primary key
    username: str              # mock login username
    password: str              # mock login password
    name: str
    phone_number: str
    services: ServicesExpiry


class Notification(BaseModel):
    id: str
    user_id: str  # session_id in this demo
    channel: Literal["sms", "in_app"]
    message: str
    created_at: datetime
    meta: Dict[str, Any] = Field(default_factory=dict)


# ---------- Chat API models ----------


class ChatRequest(BaseModel):
    user_id: str
    message: str


class ProposedAction(BaseModel):
    id: str
    type: str
    description: str
    # arbitrary structured payload (service_type, amount, currency, etc.)
    data: Dict[str, Any] = Field(default_factory=dict)


class ChatResponse(BaseModel):
    reply: str
    proposed_action: Optional[ProposedAction] = None


# ---------- Confirm action API models ----------


class ConfirmActionRequest(BaseModel):
    user_id: str
    action_id: str
    accepted: bool


class ConfirmActionResponse(BaseModel):
    status: str
    detail: str


class TextToSpeechRequest(BaseModel):
    text: str


# ---------- Notifications API models ----------


class NotificationOut(BaseModel):
    id: str
    channel: Literal["sms", "in_app"]
    message: str
    created_at: datetime
    meta: Dict[str, Any]


# ---------- Login API models ----------


class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    # This holds the per-session user_id (random UUID),
    # not the static national_id.
    user_id: str
    name: str


# ---------- Payment API models ----------


class PaymentRequest(BaseModel):
    user_id: str
    action_id: str
    amount: float
    currency: str = "SAR"

    card_holder: str
    card_number: str
    expiry_month: str
    expiry_year: str
    cvv: str


class PaymentResponse(BaseModel):
    status: Literal["success", "failed"]
    transaction_id: Optional[str] = None
    failure_reason: Optional[str] = None
    amount: float
    currency: str
