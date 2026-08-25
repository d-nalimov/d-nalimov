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


async def test_prize_keeps_contact_link(client):
    """Ссылка на переписку копируется в приз при выдаче и переживает правку каталога."""
    from sqlalchemy import select

    from app.db import SessionMaker
    from app.models import User, WheelSector
    from app.services.prizes import issue_prize

    tg = 700310
    headers = auth_header(tg)
    await client.post("/auth", headers=headers)

    async with SessionMaker() as session:
        sector = await session.get(WheelSector, "w6")
        user = await session.scalar(select(User).where(User.telegram_id == tg))
        prize = await issue_prize(
            session,
            user,
            title=sector.label,
            source="wheel",
            ttl_days=30,
            contact_url=sector.contact_url,
        )
        await session.commit()
        issued_link = prize.contact_url

        # Каталог поменяли — у выданного приза ссылка прежняя.
        sector.contact_url = "https://t.me/m/another"
        await session.commit()

    assert issued_link == "https://t.me/m/SA72PWqDZjcy"
    prizes = (await client.get("/prizes", headers=headers)).json()
    assert prizes[0]["contactUrl"] == "https://t.me/m/SA72PWqDZjcy"
