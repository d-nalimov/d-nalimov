import time

from app.telegram_auth import build_init_data

from .conftest import TEST_BOT_TOKEN, auth_header


async def test_auth_creates_user_and_returns_config(client):
    response = await client.post("/auth", headers=auth_header(700100))

    assert response.status_code == 200
    body = response.json()
    assert body["user"]["telegramId"] == 700100
    assert body["user"]["status"] == "free"
    assert body["config"]["spinCost"] == 100
    assert body["config"]["promoTtlDays"] == 30


async def test_auth_rejects_tampered_signature(client):
    header = auth_header(700101)["Authorization"]
    tampered = header.replace("first_name", "first_name")[:-1] + ("0" if header[-1] != "0" else "1")

    response = await client.post("/auth", headers={"Authorization": tampered})

    assert response.status_code == 401
    assert response.json()["code"] == "unauthorized"


async def test_auth_rejects_foreign_token(client):
    init_data = build_init_data("999:OTHER-BOT", {"id": 700102, "first_name": "Чужой"})

    response = await client.post("/auth", headers={"Authorization": f"tma {init_data}"})

    assert response.status_code == 401


async def test_auth_rejects_stale_init_data(client):
    stale = build_init_data(
        TEST_BOT_TOKEN,
        {"id": 700103, "first_name": "Старый"},
        auth_date=int(time.time()) - 60 * 60 * 48,
    )

    response = await client.post("/auth", headers={"Authorization": f"tma {stale}"})

    assert response.status_code == 401
    assert "просрочена" in response.json()["message"]


async def test_endpoints_require_header(client):
    response = await client.get("/categories")

    assert response.status_code == 401
