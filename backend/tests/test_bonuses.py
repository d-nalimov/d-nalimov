from datetime import datetime, timedelta, timezone

from sqlalchemy import select

from app.db import SessionMaker
from app.models import Prize

from .conftest import auth_header, grant


async def test_spin_requires_moggs(client):
    tg = 700300
    headers = auth_header(tg)
    await client.post("/auth", headers=headers)

    response = await client.post("/wheel/spin", headers=headers)

    assert response.status_code == 400
    assert response.json()["code"] == "insufficient_funds"


async def test_spin_charges_and_may_issue_promo(client):
    tg = 700301
    headers = auth_header(tg)
    await client.post("/auth", headers=headers)
    await grant(tg, moggs=100)

    body = (await client.post("/wheel/spin", headers=headers)).json()

    assert body["sectorId"]
    # Списали стоимость прокрута; сектор «150 моггсов» мог начислить сверху.
    assert body["moggs"] in (0, 150)
    if body["prize"]:
        assert body["prize"]["code"].startswith("CY-")
        prizes = (await client.get("/prizes", headers=headers)).json()
        assert prizes[0]["id"] == body["prize"]["id"]


async def test_wheel_hides_weights(client):
    headers = auth_header(700302)
    await client.post("/auth", headers=headers)

    sectors = (await client.get("/wheel", headers=headers)).json()

    assert sectors
    assert set(sectors[0]) == {"id", "label", "color", "blank"}


async def test_buy_deducts_moggs_and_issues_promo(client):
    tg = 700303
    headers = auth_header(tg)
    await client.post("/auth", headers=headers)
    await grant(tg, moggs=600)

    body = (await client.post("/shop/s1/buy", headers=headers)).json()

    assert body["moggs"] == 100
    assert body["prize"]["title"] == "Личный разбор куратора"
    assert body["prize"]["source"] == "shop"

    history = (await client.get("/moggs/history", headers=headers)).json()
    assert history[0]["amount"] == -500


async def test_buy_without_moggs_is_rejected(client):
    tg = 700304
    headers = auth_header(tg)
    await client.post("/auth", headers=headers)

    response = await client.post("/shop/s4/buy", headers=headers)

    assert response.status_code == 400
    assert response.json()["code"] == "insufficient_funds"


async def test_promo_is_single_use(client):
    tg = 700305
    headers = auth_header(tg)
    await client.post("/auth", headers=headers)
    await grant(tg, moggs=300)

    prize = (await client.post("/shop/s2/buy", headers=headers)).json()["prize"]

    used = await client.post(f"/prizes/{prize['id']}/use", headers=headers)
    assert used.status_code == 200
    assert used.json()["usedAt"] is not None

    again = await client.post(f"/prizes/{prize['id']}/use", headers=headers)
    assert again.status_code == 400
    assert again.json()["code"] == "already_used"


async def test_expired_promo_cannot_be_used(client):
    tg = 700306
    headers = auth_header(tg)
    await client.post("/auth", headers=headers)
    await grant(tg, moggs=300)

    prize = (await client.post("/shop/s2/buy", headers=headers)).json()["prize"]

    async with SessionMaker() as session:
        row = await session.scalar(select(Prize).where(Prize.id == prize["id"]))
        row.expires_at = datetime.now(timezone.utc) - timedelta(days=1)
        await session.commit()

    response = await client.post(f"/prizes/{prize['id']}/use", headers=headers)

    assert response.status_code == 400
    assert response.json()["code"] == "expired"


async def test_foreign_promo_is_not_visible(client):
    owner, stranger = 700307, 700308
    owner_headers, stranger_headers = auth_header(owner), auth_header(stranger)
    await client.post("/auth", headers=owner_headers)
    await client.post("/auth", headers=stranger_headers)
    await grant(owner, moggs=300)

    prize = (await client.post("/shop/s2/buy", headers=owner_headers)).json()["prize"]

    response = await client.post(f"/prizes/{prize['id']}/use", headers=stranger_headers)

    assert response.status_code == 404
