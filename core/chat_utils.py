from __future__ import annotations

import hashlib
from urllib.parse import unquote

PUBLIC_ROOM_KEY = 'public'
PRIVATE_ROOM_PREFIX = 'dm:'


def clean_username(value: str | None) -> str:
    return str(value or '').strip()


def make_public_room_key() -> str:
    return PUBLIC_ROOM_KEY


def make_private_room_key(username_a: str | None, username_b: str | None) -> str:
    names = [clean_username(username_a), clean_username(username_b)]
    names = sorted({name for name in names if name})
    if len(names) < 2:
        return PUBLIC_ROOM_KEY
    return f"{PRIVATE_ROOM_PREFIX}{'|'.join(names)}"


def is_private_room(room_key: str | None) -> bool:
    return bool(room_key) and str(room_key).startswith(PRIVATE_ROOM_PREFIX)


def room_participants_from_key(room_key: str | None) -> list[str]:
    key = clean_username(room_key)
    if not key:
        return []
    if key == PUBLIC_ROOM_KEY:
        return []
    if not key.startswith(PRIVATE_ROOM_PREFIX):
        return []
    raw = key[len(PRIVATE_ROOM_PREFIX):]
    if not raw:
        return []
    return [unquote(part) for part in raw.split('|') if part]


def safe_group_name(room_key: str | None) -> str:
    key = clean_username(room_key) or PUBLIC_ROOM_KEY
    digest = hashlib.sha1(key.encode('utf-8')).hexdigest()
    return f'chat_{digest}'
