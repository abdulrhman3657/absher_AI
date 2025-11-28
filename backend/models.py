# backend/models.py
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field


# ---------- Core domain models ----------

# after
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
    id: str
    username: str          # mock login username
    password: str          # mock login password
    name: str
    phone_number: str
    services: List[UserService]


class Notification(BaseModel):
    id: str
    user_id: str
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
    # NEW: arbitrary structured payload (service_type, amount, currency, etc.)
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
    user_id: str
    name: str
