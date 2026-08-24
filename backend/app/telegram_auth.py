"""Проверка initData из Telegram Mini Apps.

Клиенту не верим ни в чём: user_id берётся только из строки, подпись которой
сошлась с ключом бота.
Схема — https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
"""

import hashlib
import hmac
import json
import time
from dataclasses import dataclass
from urllib.parse import parse_qsl

from .errors import Unauthorized


@dataclass(slots=True)
class TelegramIdentity:
    telegram_id: int
    first_name: str
    last_name: str | None
    username: str | None
    photo_url: str | None


def parse_init_data(init_data: str, *, bot_token: str, ttl_seconds: int) -> TelegramIdentity:
    if not init_data:
        raise Unauthorized("initData пустая")

    pairs = dict(parse_qsl(init_data, keep_blank_values=True))
    received_hash = pairs.pop("hash", None)
    if not received_hash:
        raise Unauthorized("В initData нет hash")

    # Подписывается строка из отсортированных пар key=value, кроме самого hash.
    data_check_string = "\n".join(f"{key}={pairs[key]}" for key in sorted(pairs))
    secret_key = hmac.new(b"WebAppData", bot_token.encode(), hashlib.sha256).digest()
    expected = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()

    if not hmac.compare_digest(expected, received_hash):
        raise Unauthorized("Подпись initData не совпала")

    auth_date = pairs.get("auth_date")
    if not auth_date or not auth_date.isdigit():
        raise Unauthorized("В initData нет auth_date")
    if time.time() - int(auth_date) > ttl_seconds:
        raise Unauthorized("initData просрочена, переоткройте приложение")

    raw_user = pairs.get("user")
    if not raw_user:
        raise Unauthorized("В initData нет пользователя")

    try:
        user = json.loads(raw_user)
        telegram_id = int(user["id"])
    except (ValueError, KeyError, TypeError) as error:
        raise Unauthorized("Не разобрать пользователя из initData") from error

    return TelegramIdentity(
        telegram_id=telegram_id,
        first_name=str(user.get("first_name") or ""),
        last_name=user.get("last_name"),
        username=user.get("username"),
        photo_url=user.get("photo_url"),
    )


def build_init_data(bot_token: str, user: dict, *, auth_date: int | None = None) -> str:
    """Собирает подписанную initData — нужна тестам и локальной отладке."""
    pairs = {
        "auth_date": str(auth_date or int(time.time())),
        "query_id": "AAF_test",
        "user": json.dumps(user, separators=(",", ":"), ensure_ascii=False),
    }
    data_check_string = "\n".join(f"{key}={pairs[key]}" for key in sorted(pairs))
    secret_key = hmac.new(b"WebAppData", bot_token.encode(), hashlib.sha256).digest()
    pairs["hash"] = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()
    from urllib.parse import urlencode

    return urlencode(pairs)
