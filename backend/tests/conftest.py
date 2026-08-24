import os
import tempfile
from pathlib import Path

TEST_BOT_TOKEN = "123456:TEST-TOKEN"
_DB_PATH = Path(tempfile.mkdtemp()) / "test.db"

# Переменные ставим до импорта приложения: движок создаётся на импорте.
os.environ.update(
    BOT_TOKEN=TEST_BOT_TOKEN,
    DATABASE_URL=f"sqlite+aiosqlite:///{_DB_PATH}",
    ENV="development",
    AUTH_DEV_MODE="false",
    ALLOWED_ORIGINS="*",
    YOOKASSA_SHOP_ID="test-shop",
    YOOKASSA_SECRET_KEY="test-secret",
    YOOKASSA_RETURN_URL="https://t.me/test_bot/app",
)

import pytest  # noqa: E402
from httpx import ASGITransport, AsyncClient  # noqa: E402

from app.db import SessionMaker, create_all  # noqa: E402
from app.main import app  # noqa: E402
from app.seed import seed  # noqa: E402
from app.telegram_auth import build_init_data  # noqa: E402


@pytest.fixture(scope="session", autouse=True)
async def _database():
    await create_all()
    async with SessionMaker() as session:
        await seed(session)
    yield
    _DB_PATH.unlink(missing_ok=True)


@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as http_client:
        yield http_client


def auth_header(telegram_id: int = 777001, **extra) -> dict[str, str]:
    user = {"id": telegram_id, "first_name": "Тест", "username": f"user{telegram_id}", **extra}
    return {"Authorization": f"tma {build_init_data(TEST_BOT_TOKEN, user)}"}


@pytest.fixture
def headers() -> dict[str, str]:
    return auth_header()


async def grant(telegram_id: int, *, moggs: int = 0, member: bool = False) -> None:
    """Правит состояние пользователя напрямую — короче, чем прогонять оплату."""
    from sqlalchemy import select

    from app.models import User

    async with SessionMaker() as session:
        user = await session.scalar(select(User).where(User.telegram_id == telegram_id))
        assert user is not None, "пользователь ещё не заходил в приложение"
        if moggs:
            user.moggs = moggs
        if member:
            user.status = "member"
            user.access_until = None
        await session.commit()
