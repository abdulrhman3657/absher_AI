# store.py
import json
import uuid
from datetime import datetime, timezone, timedelta
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional

from langchain_community.vectorstores import FAISS

from models import Notification, User, UserService

from config import embeddings
from models import Notification, User


# In-memory users + notifications
USERS: Dict[str, User] = {}
NOTIFICATIONS: List[Notification] = []

# FAISS index per user (for fuzzy notification search)
USER_NOTIFICATION_INDEX: Dict[str, FAISS] = {}

USERS_JSON_PATH = Path(__file__).with_name("users.json")


def _load_users_from_json() -> None:
    """Load users from backend/users.json at startup."""
    global USERS

    with USERS_JSON_PATH.open("r", encoding="utf-8") as f:
        raw_users = json.load(f)

    loaded: Dict[str, User] = {}
    for u in raw_users:
        user_obj = User(**u)
        loaded[user_obj.national_id] = user_obj

    USERS = loaded
    print(f"[STORE] Loaded {len(USERS)} users from {USERS_JSON_PATH}")



_load_users_from_json()


def get_user_by_username(username: str) -> Optional[User]:
    """Find user by username (for login)."""
    for u in USERS.values():
        if u.username == username:
            return u
    return None


# ---------------- Notifications ----------------

def add_notification(
    user_id: str,
    channel: str,
    message: str,
    meta: Optional[Dict] = None,
) -> Notification:
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
    return [n for n in NOTIFICATIONS if n.user_id == user_id]


def _update_user_notification_index(user_id: str) -> None:
    """Rebuild vector index for a user's notifications."""
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

# Fuzzy notification search
def search_notifications(user_id: str, query: str, k: int = 3) -> List[Notification]:
    index = USER_NOTIFICATION_INDEX.get(user_id)
    if index is None:
        return []

    docs = index.similarity_search(query, k=k)
    notif_ids = {doc.metadata.get("notif_id") for doc in docs}
    return [n for n in NOTIFICATIONS if n.id in notif_ids]

def _save_users_to_json() -> None:
    """Persist current USERS dict back to users.json."""
    data = []

    for user in USERS.values():
        u = user.model_dump()
        # ensure datetime -> ISO strings
        services = u.get("services") or {}
        for key, value in services.items():
            if isinstance(value, datetime):
                services[key] = (
                    value.astimezone(timezone.utc)
                    .isoformat()
                    .replace("+00:00", "Z")
                )
        u["services"] = services
        data.append(u)

    with USERS_JSON_PATH.open("w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)

    print(f"[STORE] Saved {len(USERS)} users to {USERS_JSON_PATH}")


def renew_expiring_services_for_user(
    user_id: str,
    threshold_days: int = 3,
) -> List[UserService]:
    """
    Renew all services for this user that are expiring in <= threshold_days.
    For demo we extend each by 1 year from the later of now/expiry.
    """
    user = USERS.get(user_id)
    if not user:
        return []

    now = datetime.now(timezone.utc)
    renewed: List[UserService] = []

    for svc in user.services:
        days_left = (svc.expiry_date - now).days
        if days_left <= threshold_days:
            base = max(now, svc.expiry_date)
            svc.expiry_date = base + timedelta(days=365)
            renewed.append(svc)

    if renewed:
        _save_users_to_json()

    return renewed