from typing import Annotated

from fastapi import Depends, Header
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .config import Settings, get_settings
from .db import get_session
from .errors import Unauthorized
from .models import User
from .telegram_auth import TelegramIdentity, parse_init_data

SessionDep = Annotated[AsyncSession, Depends(get_session)]
SettingsDep = Annotated[Settings, Depends(get_settings)]


def _identity_from_header(authorization: str | None, settings: Settings) -> TelegramIdentity:
    if not authorization or not authorization.startswith("tma "):
        raise Unauthorized("Ожидается заголовок Authorization: tma <initData>")

    payload = authorization[4:].strip()

    # Локальная отладка без бота: включается только явным флагом и не в проде.
    if settings.auth_dev_mode and payload.startswith("dev:"):
        telegram_id = payload[4:]
        if not telegram_id.isdigit():
            raise Unauthorized("Формат dev-токена: tma dev:<telegram_id>")
        return TelegramIdentity(
            telegram_id=int(telegram_id),
            first_name=f"Dev {telegram_id}",
            last_name=None,
            username=f"dev{telegram_id}",
            photo_url=None,
        )

    return parse_init_data(
        payload, bot_token=settings.bot_token, ttl_seconds=settings.auth_ttl_seconds
    )


async def get_current_user(
    session: SessionDep,
    settings: SettingsDep,
    authorization: Annotated[str | None, Header()] = None,
) -> User:
    """Достаёт пользователя по подписанной initData, заводя его при первом входе."""
    identity = _identity_from_header(authorization, settings)

    user = await session.scalar(select(User).where(User.telegram_id == identity.telegram_id))
    if user is None:
        user = User(telegram_id=identity.telegram_id)
        session.add(user)

    # Имя и аватар могли поменяться в Telegram — держим их актуальными.
    user.first_name = identity.first_name
    user.last_name = identity.last_name
    user.username = identity.username
    user.photo_url = identity.photo_url

    await session.commit()
    await session.refresh(user)
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]
