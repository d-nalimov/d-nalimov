from fastapi import APIRouter
from sqlalchemy import select

from ..deps import CurrentUser, SessionDep, SettingsDep
from ..errors import InsufficientFunds, NotFound
from ..models import MoggsEntry, Prize, ShopItem, WheelSector
from ..schemas import (
    MoggsEntryOut,
    PrizeOut,
    PurchaseResult,
    ShopItemOut,
    SpinResult,
    WheelSectorOut,
)
from ..serializers import moggs_entry_out
from ..services.moggs import add_moggs
from ..services.prizes import issue_prize
from ..services.wheel import pick_sector

router = APIRouter(tags=["bonuses"])


@router.get("/wheel", response_model=list[WheelSectorOut])
async def get_wheel(session: SessionDep, _: CurrentUser) -> list[WheelSectorOut]:
    sectors = await _active_sectors(session)
    # Веса наружу не отдаём — иначе шансы можно посчитать до прокрута.
    return [
        WheelSectorOut(id=s.id, label=s.label, color=s.color, blank=s.blank) for s in sectors
    ]


@router.post("/wheel/spin", response_model=SpinResult)
async def spin(session: SessionDep, user: CurrentUser, settings: SettingsDep) -> SpinResult:
    if user.moggs < settings.spin_cost:
        raise InsufficientFunds("Не хватает моггсов на прокрут")

    sectors = await _active_sectors(session)
    if not sectors:
        raise NotFound("Колесо не настроено")

    await add_moggs(session, user, -settings.spin_cost, "Прокрут колеса")
    sector = pick_sector(sectors)

    prize = None
    if sector.reward_kind == "moggs" and sector.reward_moggs > 0:
        await add_moggs(session, user, sector.reward_moggs, "Выигрыш на колесе")
    elif sector.reward_kind == "promo":
        prize = await issue_prize(
            session, user, title=sector.label, source="wheel", ttl_days=settings.promo_ttl_days
        )

    await session.commit()
    return SpinResult(
        sector_id=sector.id,
        prize=PrizeOut.model_validate(prize) if prize else None,
        moggs=user.moggs,
    )


@router.get("/shop", response_model=list[ShopItemOut])
async def get_shop(session: SessionDep, _: CurrentUser) -> list[ShopItemOut]:
    items = (
        await session.scalars(select(ShopItem).where(ShopItem.active).order_by(ShopItem.sort_order))
    ).all()
    return [ShopItemOut.model_validate(item) for item in items]


@router.post("/shop/{item_id}/buy", response_model=PurchaseResult)
async def buy(
    item_id: str, session: SessionDep, user: CurrentUser, settings: SettingsDep
) -> PurchaseResult:
    item = await session.get(ShopItem, item_id)
    if item is None or not item.active:
        raise NotFound("Товар не найден")
    if user.moggs < item.price:
        raise InsufficientFunds()

    await add_moggs(session, user, -item.price, f"Покупка: {item.title}")
    prize = await issue_prize(
        session, user, title=item.title, source="shop", ttl_days=settings.promo_ttl_days
    )

    await session.commit()
    return PurchaseResult(prize=PrizeOut.model_validate(prize), moggs=user.moggs)


@router.get("/prizes", response_model=list[PrizeOut])
async def list_prizes(session: SessionDep, user: CurrentUser) -> list[PrizeOut]:
    prizes = (
        await session.scalars(
            select(Prize).where(Prize.user_id == user.id).order_by(Prize.created_at.desc())
        )
    ).all()
    return [PrizeOut.model_validate(prize) for prize in prizes]


@router.get("/moggs/history", response_model=list[MoggsEntryOut])
async def moggs_history(session: SessionDep, user: CurrentUser) -> list[MoggsEntryOut]:
    entries = (
        await session.scalars(
            select(MoggsEntry)
            .where(MoggsEntry.user_id == user.id)
            .order_by(MoggsEntry.created_at.desc(), MoggsEntry.id.desc())
            .limit(100)
        )
    ).all()
    return [moggs_entry_out(entry) for entry in entries]


async def _active_sectors(session: SessionDep) -> list[WheelSector]:
    return list(
        (
            await session.scalars(
                select(WheelSector).where(WheelSector.active).order_by(WheelSector.sort_order)
            )
        ).all()
    )
