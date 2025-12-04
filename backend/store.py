# backend/store.py
import json
import uuid
from copy import deepcopy
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Dict, List, Optional

from langchain_community.vectorstores import FAISS

from config import embeddings
from models import Notification, ServiceType, User, UserService

# In-memory session users + notifications
# USERS is keyed by a session_id (random UUID per login)
USERS: Dict[str, User] = {}

# Template users loaded from users.json (keyed by national_id)
TEMPLATE_USERS: Dict[str, User] = {}

NOTIFICATIONS: List[Notification] = []

# FAISS index per session user (for fuzzy notification search)
USER_NOTIFICATION_INDEX: Dict[str, FAISS] = {}

USERS_JSON_PATH = Path(__file__).with_name("users.json")


def _load_users_from_json() -> None:
    """
    Load template users from backend/users.json at startup into TEMPLATE_USERS.
    Keyed by national_id.
    """
    global TEMPLATE_USERS

    with USERS_JSON_PATH.open("r", encoding="utf-8") as f:
        raw_users = json.load(f)

    loaded: Dict[str, User] = {}
    for user_data in raw_users:
        user_obj = User(**user_data)
        loaded[user_obj.national_id] = user_obj

    TEMPLATE_USERS = loaded
    print(f"[STORE] Loaded {len(TEMPLATE_USERS)} template users from {USERS_JSON_PATH}")


_load_users_from_json()


def create_session_user_from_template(template: User) -> str:
    """
    Clone a template user into a new in-memory session user.
    Returns the new session_id (used as user_id in APIs).
    """
    session_id = str(uuid.uuid4())
    user_copy = deepcopy(template)
    USERS[session_id] = user_copy
    print(f"[STORE] Created session user {session_id} from template {template.national_id}")
    return session_id


def get_user_by_username(username: str) -> Optional[User]:
    """
    Find template user by username (for login).
    """
    for user in TEMPLATE_USERS.values():
        if user.username == username:
            return user
    return None


# ---------------- Services helper ----------------


def iter_user_services(user: User) -> List[UserService]:
    """
    Convert the user's ServicesExpiry (user.services) into a list of
    UserService objects. This gives a uniform iterable representation
    for proactive checks and renewals.
    """
    s = user.services
    services: List[UserService] = []

    if s.national_id_expire_date:
        services.append(
            UserService(
                service_type=ServiceType.NATIONAL_ID,
                service_name="National ID",
                expiry_date=s.national_id_expire_date,
            )
        )

    if s.driver_license_expire_date:
        services.append(
            UserService(
                service_type=ServiceType.LICENSE,
                service_name="Driver License",
                expiry_date=s.driver_license_expire_date,
            )
        )

    if s.vehicle_registration_expire_date:
        services.append(
            UserService(
                service_type=ServiceType.VEHICLE,
                service_name="Vehicle Registration",
                expiry_date=s.vehicle_registration_expire_date,
            )
        )

    if s.passport_expire_date:
        services.append(
            UserService(
                service_type=ServiceType.PASSPORT,
                service_name="Passport",
                expiry_date=s.passport_expire_date,
            )
        )

    return services


# ---------------- Notifications ----------------


def add_notification(
    user_id: str,
    channel: str,
    message: str,
    meta: Optional[Dict] = None,
) -> Notification:
    """
    Create and store a new notification for a session user.
    """
    notif = Notification(
        id=str(uuid.uuid4()),
        user_id=user_id,
        channel=channel,
        message=message,
        created_at=datetime.now(timezone.utc),
        meta=meta or {},
    )

    NOTIFICATIONS.append(notif)
    _update_user_notification_index(user_id)
    return notif


def get_user_notifications(user_id: str) -> List[Notification]:
    """
    Return all notifications for a specific session user.
    """
    return [n for n in NOTIFICATIONS if n.user_id == user_id]


def _update_user_notification_index(user_id: str) -> None:
    """
    Rebuild vector index for a session user's notifications.
    """
    user_notifs = get_user_notifications(user_id)
    if not user_notifs:
        USER_NOTIFICATION_INDEX.pop(user_id, None)
        return

    texts = [n.message for n in user_notifs]
    metadatas = [{"notif_id": n.id} for n in user_notifs]

    index = FAISS.from_texts(
        texts=texts,
        embedding=embeddings,
        metadatas=metadatas,
    )
    USER_NOTIFICATION_INDEX[user_id] = index


def search_notifications(user_id: str, query: str, k: int = 3) -> List[Notification]:
    """
    Fuzzy semantic search over notifications for a single user.
    """
    index = USER_NOTIFICATION_INDEX.get(user_id)
    if index is None:
        return []

    docs = index.similarity_search(query, k=k)
    notif_ids = {doc.metadata.get("notif_id") for doc in docs}
    return [n for n in NOTIFICATIONS if n.id in notif_ids]


def renew_expiring_services_for_user(
    user_id: str,
    threshold_days: int = 3,
) -> List[UserService]:
    """
    Renew all services for this session user that are expiring in <= threshold_days.
    For demo we extend each by 1 year from the later of now/expiry.

    Returns a list of UserService objects with the NEW expiry dates.
    Changes are in-memory only (not persisted to users.json).
    """
    user = USERS.get(user_id)
    if not user:
        return []

    now = datetime.now(timezone.utc)
    renewed: List[UserService] = []

    for svc in iter_user_services(user):
        days_left = (svc.expiry_date - now).days
        if days_left > threshold_days:
            continue

        base = max(now, svc.expiry_date)
        new_expiry = base + timedelta(days=365)
        svc.expiry_date = new_expiry

        if svc.service_type == ServiceType.NATIONAL_ID:
            user.services.national_id_expire_date = new_expiry
        elif svc.service_type == ServiceType.LICENSE:
            user.services.driver_license_expire_date = new_expiry
        elif svc.service_type == ServiceType.VEHICLE:
            user.services.vehicle_registration_expire_date = new_expiry
        elif svc.service_type == ServiceType.PASSPORT:
            user.services.passport_expire_date = new_expiry

        renewed.append(svc)

    return renewed


def renew_specific_service_for_user(
    user_id: str,
    service_type: ServiceType,
    threshold_days: int = 3,
) -> Optional[UserService]:
    """
    Renew a SINGLE service (by type) for this session user if it is expiring
    in <= threshold_days days.

    Returns the renewed UserService with the NEW expiry date,
    or None if nothing was renewed.
    """
    user = USERS.get(user_id)
    if not user:
        return None

    now = datetime.now(timezone.utc)

    for svc in iter_user_services(user):
        if svc.service_type != service_type:
            continue

        days_left = (svc.expiry_date - now).days
        if days_left > threshold_days:
            # Not close enough to expiry – follow the same business rule
            return None

        base = max(now, svc.expiry_date)
        new_expiry = base + timedelta(days=365)
        svc.expiry_date = new_expiry

        if svc.service_type == ServiceType.NATIONAL_ID:
            user.services.national_id_expire_date = new_expiry
        elif svc.service_type == ServiceType.LICENSE:
            user.services.driver_license_expire_date = new_expiry
        elif svc.service_type == ServiceType.VEHICLE:
            user.services.vehicle_registration_expire_date = new_expiry
        elif svc.service_type == ServiceType.PASSPORT:
            user.services.passport_expire_date = new_expiry

        return svc

    return None
