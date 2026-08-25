"""Гашение промокодов менеджером."""

from datetime import datetime, timedelta, timezone

from sqlalchemy import select

from app.db import SessionMaker
from app.models import Prize

from .conftest import auth_header, grant

ADMIN = {"X-Admin-Token": "test-admin-token"}


async def _buy_prize(client, telegram_id: int) -> dict:
    headers = auth_header(telegram_id)
    await client.post("/auth", headers=headers)
    await grant(telegram_id, moggs=300)
    return (await client.post("/shop/s2/buy", headers=headers)).json()["prize"]


async def test_redeem_requires_token(client):
    prize = await _buy_prize(client, 700500)

    without = await client.post("/admin/prizes/redeem", json={"code": prize["code"]})
    wrong = await client.post(
        "/admin/prizes/redeem", json={"code": prize["code"]}, headers={"X-Admin-Token": "wrong-token"}
    )

    assert without.status_code == 401
    assert wrong.status_code == 401
    assert wrong.json()["code"] == "unauthorized"


async def test_user_cannot_redeem_own_prize(client):
    """Пользовательского гашения больше нет — отметка «использован» ничего не стоила."""
    tg = 700501
    prize = await _buy_prize(client, tg)

    response = await client.post(f"/prizes/{prize['id']}/use", headers=auth_header(tg))

    assert response.status_code == 404


async def test_lookup_shows_owner_and_does_not_change_status(client):
    prize = await _buy_prize(client, 700502)

    first = await client.post("/admin/prizes/lookup", json={"code": prize["code"]}, headers=ADMIN)
    second = await client.post("/admin/prizes/lookup", json={"code": prize["code"]}, headers=ADMIN)

    assert first.json()["status"] == "active"
    assert first.json()["owner"]["telegramId"] == 700502
    assert first.json()["prize"]["title"] == "Гайд «Отёки за 7 дней»"
    assert second.json()["status"] == "active"


async def test_redeem_marks_used_once(client):
    tg = 700503
    prize = await _buy_prize(client, tg)

    redeemed = await client.post("/admin/prizes/redeem", json={"code": prize["code"]}, headers=ADMIN)
    again = await client.post("/admin/prizes/redeem", json={"code": prize["code"]}, headers=ADMIN)

    assert redeemed.json()["status"] == "used"
    assert redeemed.json()["prize"]["usedAt"] is not None
    assert again.status_code == 400
    assert again.json()["code"] == "already_used"

    # Пользователь видит приз погашенным.
    prizes = (await client.get("/prizes", headers=auth_header(tg))).json()
    assert prizes[0]["usedAt"] is not None


async def test_code_is_case_and_space_insensitive(client):
    prize = await _buy_prize(client, 700504)
    messy = f"  {prize['code'].lower()} "

    response = await client.post("/admin/prizes/lookup", json={"code": messy}, headers=ADMIN)

    assert response.json()["prize"]["code"] == prize["code"]


async def test_expired_code_cannot_be_redeemed(client):
    prize = await _buy_prize(client, 700505)

    async with SessionMaker() as session:
        row = await session.scalar(select(Prize).where(Prize.id == prize["id"]))
        row.expires_at = datetime.now(timezone.utc) - timedelta(days=1)
        await session.commit()

    lookup = await client.post("/admin/prizes/lookup", json={"code": prize["code"]}, headers=ADMIN)
    redeem = await client.post("/admin/prizes/redeem", json={"code": prize["code"]}, headers=ADMIN)

    assert lookup.json()["status"] == "expired"
    assert redeem.status_code == 400
    assert redeem.json()["code"] == "expired"


async def test_unknown_code(client):
    response = await client.post("/admin/prizes/lookup", json={"code": "CY-XXXX-XXXX"}, headers=ADMIN)

    assert response.status_code == 404
