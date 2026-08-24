import uuid

from fastapi import APIRouter, Request
from sqlalchemy import select

from ..config import Settings
from ..deps import CurrentUser, SessionDep, SettingsDep
from ..errors import AppError, NotFound
from ..models import Payment, User
from ..schemas import PaymentIntentOut, PaymentStatusOut
from ..services import yookassa
from ..services.moggs import add_moggs

router = APIRouter(tags=["payments"])

#: Статусы ЮKassa приводим к трём, которые понимает клиент.
STATUS_MAP = {
    "pending": "pending",
    "waiting_for_capture": "pending",
    "succeeded": "succeeded",
    "canceled": "canceled",
}


@router.post("/payments", response_model=PaymentIntentOut)
async def create_payment(
    session: SessionDep, user: CurrentUser, settings: SettingsDep
) -> PaymentIntentOut:
    """Создаёт разовый платёж и возвращает ссылку на оплату."""
    if not settings.payments_enabled:
        raise AppError("Приём оплаты не настроен", code="payments_disabled", status_code=503)

    payment = Payment(
        id=uuid.uuid4().hex,
        user_id=user.id,
        amount=settings.price_amount,
        currency=settings.price_currency,
        status="pending",
    )
    session.add(payment)
    await session.commit()

    data = await yookassa.create_payment(
        settings,
        local_payment_id=payment.id,
        telegram_id=user.telegram_id,
        description="Доступ к клубу Кэш`ю",
    )

    payment.provider_payment_id = data.get("id")
    payment.status = STATUS_MAP.get(data.get("status", ""), "pending")
    payment.confirmation_url = (data.get("confirmation") or {}).get("confirmation_url")
    await session.commit()

    if not payment.confirmation_url:
        raise AppError("ЮKassa не вернула ссылку на оплату", code="payment_provider_error", status_code=502)

    return PaymentIntentOut(payment_id=payment.id, confirmation_url=payment.confirmation_url)


@router.get("/payments/{payment_id}", response_model=PaymentStatusOut)
async def payment_status(
    payment_id: str, session: SessionDep, user: CurrentUser, settings: SettingsDep
) -> PaymentStatusOut:
    payment = await session.get(Payment, payment_id)
    if payment is None or payment.user_id != user.id:
        raise NotFound("Платёж не найден")

    # Вебхук мог не дойти — при опросе сверяемся с ЮKassa напрямую.
    if payment.status == "pending" and payment.provider_payment_id and settings.payments_enabled:
        data = await yookassa.fetch_payment(settings, payment.provider_payment_id)
        await _sync_payment(session, payment, data, settings)

    return PaymentStatusOut(status=payment.status)


@router.post("/payments/webhook", include_in_schema=False)
async def webhook(request: Request, session: SessionDep, settings: SettingsDep) -> dict:
    """Уведомление ЮKassa.

    Тело уведомления не подписано, поэтому оно служит только триггером:
    настоящий статус мы запрашиваем у ЮKassa сами.
    """
    body = await request.json()
    provider_payment_id = ((body or {}).get("object") or {}).get("id")
    if not provider_payment_id:
        return {"ok": True}

    payment = await session.scalar(
        select(Payment).where(Payment.provider_payment_id == provider_payment_id)
    )
    if payment is None:
        return {"ok": True}

    if settings.payments_enabled:
        data = await yookassa.fetch_payment(settings, provider_payment_id)
        await _sync_payment(session, payment, data, settings)

    return {"ok": True}


async def _sync_payment(
    session: SessionDep, payment: Payment, data: dict, settings: Settings
) -> None:
    payment.status = STATUS_MAP.get(data.get("status", ""), payment.status)

    if payment.status == "succeeded" and not payment.access_granted:
        user = await session.get(User, payment.user_id)
        if user is not None:
            user.status = "member"
            # Оплата разовая: доступ бессрочный.
            user.access_until = None
            if settings.purchase_bonus_moggs:
                await add_moggs(
                    session, user, settings.purchase_bonus_moggs, "Бонус за покупку доступа"
                )
        # Флаг защищает от повторной выдачи: вебхук приходит не один раз.
        payment.access_granted = True

    await session.commit()
