from sqlalchemy.ext.asyncio import AsyncSession

from ..errors import InsufficientFunds
from ..models import MoggsEntry, User


async def add_moggs(session: AsyncSession, user: User, amount: int, reason: str) -> None:
    """Единственная точка, где меняется баланс: любое движение попадает в историю."""
    if amount < 0 and user.moggs + amount < 0:
        raise InsufficientFunds()

    user.moggs += amount
    session.add(MoggsEntry(user_id=user.id, amount=amount, reason=reason))
