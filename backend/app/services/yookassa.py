"""Клиент ЮKassa.

Наружу отдаётся только confirmation_url. Решение о выдаче доступа принимается
не по ответу клиента, а по статусу платежа, который мы сами запрашиваем у ЮKassa.
"""

import httpx

from ..config import Settings
from ..errors import AppError

API_URL = "https://api.yookassa.ru/v3/payments"


class YooKassaError(AppError):
    def __init__(self, message: str = "Платёжный сервис недоступен") -> None:
        super().__init__(message, code="payment_provider_error", status_code=502)


def _auth(settings: Settings) -> tuple[str, str]:
    return settings.yookassa_shop_id, settings.yookassa_secret_key


def _amount(minor_units: int, currency: str) -> dict:
    return {"value": f"{minor_units / 100:.2f}", "currency": currency}


async def create_payment(
    settings: Settings, *, local_payment_id: str, telegram_id: int, description: str
) -> dict:
    payload = {
        "amount": _amount(settings.price_amount, settings.price_currency),
        "capture": True,
        "confirmation": {"type": "redirect", "return_url": settings.yookassa_return_url},
        "description": description,
        "metadata": {"payment_id": local_payment_id, "telegram_id": str(telegram_id)},
    }
    try:
        async with httpx.AsyncClient(timeout=20) as client:
            response = await client.post(
                API_URL,
                json=payload,
                auth=_auth(settings),
                # Ключ идемпотентности = наш id платежа: повтор запроса не создаст второй платёж.
                headers={"Idempotence-Key": local_payment_id},
            )
    except httpx.HTTPError as error:
        raise YooKassaError() from error

    if response.status_code >= 400:
        raise YooKassaError(f"ЮKassa вернула {response.status_code}")
    return response.json()


async def fetch_payment(settings: Settings, provider_payment_id: str) -> dict:
    try:
        async with httpx.AsyncClient(timeout=20) as client:
            response = await client.get(f"{API_URL}/{provider_payment_id}", auth=_auth(settings))
    except httpx.HTTPError as error:
        raise YooKassaError() from error

    if response.status_code >= 400:
        raise YooKassaError(f"ЮKassa вернула {response.status_code}")
    return response.json()
