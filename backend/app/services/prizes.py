import secrets
import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from ..models import Prize, User

#: Без похожих символов — код диктуют менеджеру и вводят руками.
ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"


def generate_code() -> str:
    body = "".join(secrets.choice(ALPHABET) for _ in range(8))
    return f"CY-{body[:4]}-{body[4:]}"


async def issue_prize(
    session: AsyncSession,
    user: User,
    *,
    title: str,
    source: str,
    ttl_days: int,
    contact_url: str | None = None,
) -> Prize:
    """Выдаёт одноразовый промокод со сроком жизни ttl_days."""
    now = datetime.now(timezone.utc)
    prize = Prize(
        id=uuid.uuid4().hex,
        user_id=user.id,
        title=title,
        code=generate_code(),
        source=source,
        contact_url=contact_url,
        created_at=now,
        expires_at=now + timedelta(days=ttl_days),
    )
    session.add(prize)
    return prize
