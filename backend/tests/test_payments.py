import pytest

from app.config import get_settings
from app.services import yookassa

from .conftest import auth_header

class FakeYooKassa:
    """Подменяет сеть: тестируем свою логику, а не доступность ЮKassa."""

    def __init__(self) -> None:
        self.statuses: dict[str, str] = {}
        self.last_id: str | None = None

    async def create_payment(self, _settings, *, local_payment_id, telegram_id, description):
        assert local_payment_id and telegram_id and description
        provider_id = f"yk-{local_payment_id[:12]}"
        self.statuses[provider_id] = "pending"
        self.last_id = provider_id
        return {
            "id": provider_id,
            "status": "pending",
            "confirmation": {"confirmation_url": "https://yookassa.test/checkout"},
        }

    async def fetch_payment(self, _settings, provider_payment_id):
        return {"id": provider_payment_id, "status": self.statuses.get(provider_payment_id, "pending")}

    def succeed(self, provider_id: str | None = None) -> None:
        self.statuses[provider_id or self.last_id] = "succeeded"


@pytest.fixture
def fake_yookassa(monkeypatch):
    fake = FakeYooKassa()
    monkeypatch.setattr(yookassa, "create_payment", fake.create_payment)
    monkeypatch.setattr(yookassa, "fetch_payment", fake.fetch_payment)
    return fake


async def test_payment_flow_grants_access_after_confirmation(client, fake_yookassa):
    headers = auth_header(700400)
    await client.post("/auth", headers=headers)

    intent = (await client.post("/payments", headers=headers)).json()
    assert intent["confirmationUrl"] == "https://yookassa.test/checkout"

    pending = await client.get(f"/payments/{intent['paymentId']}", headers=headers)
    assert pending.json() == {"status": "pending"}

    session = (await client.post("/auth", headers=headers)).json()
    assert session["user"]["status"] == "free"

    # ЮKassa подтвердила оплату.
    fake_yookassa.succeed()
    confirmed = await client.get(f"/payments/{intent['paymentId']}", headers=headers)
    assert confirmed.json() == {"status": "succeeded"}

    session = (await client.post("/auth", headers=headers)).json()
    assert session["user"]["status"] == "member"
    assert session["user"]["accessUntil"] is None
    assert session["user"]["moggs"] == 100  # бонус за покупку

    # Платный урок открылся.
    lesson = await client.get("/lessons/skin-3", headers=headers)
    assert lesson.status_code == 200


async def test_webhook_grants_access_once(client, fake_yookassa):
    headers = auth_header(700401)
    await client.post("/auth", headers=headers)
    await client.post("/payments", headers=headers)

    fake_yookassa.succeed()
    body = {"event": "payment.succeeded", "object": {"id": fake_yookassa.last_id}}

    first = await client.post("/payments/webhook", json=body)
    second = await client.post("/payments/webhook", json=body)

    assert first.json() == {"ok": True}
    assert second.json() == {"ok": True}

    session = (await client.post("/auth", headers=headers)).json()
    # Бонус начислен ровно один раз, сколько бы вебхуков ни пришло.
    assert session["user"]["moggs"] == 100
    assert session["user"]["status"] == "member"


async def test_webhook_ignores_unknown_payment(client, fake_yookassa):
    response = await client.post(
        "/payments/webhook", json={"event": "payment.succeeded", "object": {"id": "unknown"}}
    )

    assert response.json() == {"ok": True}


async def test_foreign_payment_is_not_visible(client, fake_yookassa):
    owner, stranger = auth_header(700402), auth_header(700403)
    await client.post("/auth", headers=owner)
    await client.post("/auth", headers=stranger)

    intent = (await client.post("/payments", headers=owner)).json()

    response = await client.get(f"/payments/{intent['paymentId']}", headers=stranger)

    assert response.status_code == 404


async def test_payments_disabled_without_credentials(client, monkeypatch):
    settings = get_settings()
    monkeypatch.setattr(settings, "yookassa_shop_id", "")
    headers = auth_header(700404)
    await client.post("/auth", headers=headers)

    response = await client.post("/payments", headers=headers)

    assert response.status_code == 503
    assert response.json()["code"] == "payments_disabled"
