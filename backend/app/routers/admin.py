"""Гашение промокодов на стороне менеджера.

Пользователь свой приз погасить не может: иначе отметка «использован» держится
на честном слове и ничего не значит. Код гасит тот, кто выдаёт приз, — по токену
из ADMIN_TOKEN.
"""

import hmac
from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Header
from sqlalchemy import select

from ..config import Settings
from ..deps import SessionDep, SettingsDep
from ..errors import AppError, NotFound, Unauthorized
from ..models import Prize, User
from ..schemas import CodeIn, PrizeCheckOut, PrizeOut, PrizeOwnerOut

router = APIRouter(prefix="/admin", tags=["admin"])

AdminToken = Annotated[str | None, Header(alias="X-Admin-Token")]


def _authorize(settings: Settings, token: str | None) -> None:
    if not settings.admin_enabled:
        raise AppError("Гашение промокодов не настроено", code="admin_disabled", status_code=503)
    if not token or not hmac.compare_digest(token, settings.admin_token):
        raise Unauthorized("Неверный токен менеджера")


def _normalize(code: str) -> str:
    return code.strip().upper().replace(" ", "")


def _status(prize: Prize) -> str:
    if prize.used_at is not None:
        return "used"
    expires_at = prize.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    return "expired" if expires_at < datetime.now(timezone.utc) else "active"


async def _find(session: SessionDep, code: str) -> tuple[Prize, User]:
    prize = await session.scalar(select(Prize).where(Prize.code == _normalize(code)))
    if prize is None:
        raise NotFound("Промокод не найден")
    owner = await session.get(User, prize.user_id)
    if owner is None:
        raise NotFound("Владелец промокода не найден")
    return prize, owner


def _result(prize: Prize, owner: User) -> PrizeCheckOut:
    return PrizeCheckOut(
        status=_status(prize),
        prize=PrizeOut.model_validate(prize),
        owner=PrizeOwnerOut(
            telegram_id=owner.telegram_id,
            first_name=owner.first_name,
            username=owner.username,
        ),
    )


@router.post("/prizes/lookup", response_model=PrizeCheckOut)
async def lookup(
    payload: CodeIn, session: SessionDep, settings: SettingsDep, x_admin_token: AdminToken = None
) -> PrizeCheckOut:
    """Проверить код, ничего не меняя: что за приз, чей и можно ли его гасить."""
    _authorize(settings, x_admin_token)
    prize, owner = await _find(session, payload.code)
    return _result(prize, owner)


@router.post("/prizes/redeem", response_model=PrizeCheckOut)
async def redeem(
    payload: CodeIn, session: SessionDep, settings: SettingsDep, x_admin_token: AdminToken = None
) -> PrizeCheckOut:
    """Погасить код. Повторное гашение и просроченный код отбиваются здесь."""
    _authorize(settings, x_admin_token)
    prize, owner = await _find(session, payload.code)

    status = _status(prize)
    if status == "used":
        raise AppError("Промокод уже погашен", code="already_used")
    if status == "expired":
        raise AppError("Срок действия промокода истёк", code="expired")

    prize.used_at = datetime.now(timezone.utc)
    await session.commit()
    return _result(prize, owner)
