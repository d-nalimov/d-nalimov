"""Схемы ответов.

Клиент — TypeScript, поэтому наружу всё уходит в camelCase, а внутри
остаётся привычный snake_case.
"""

from datetime import datetime

from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class Schema(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, from_attributes=True)


class UserOut(Schema):
    id: str
    telegram_id: int
    first_name: str
    last_name: str | None = None
    username: str | None = None
    photo_url: str | None = None
    status: str
    access_until: datetime | None = None
    moggs: int


class ConfigOut(Schema):
    price_amount: int
    price_currency: str
    spin_cost: int
    promo_ttl_days: int
    manager_username: str
    community_url: str


class SessionOut(Schema):
    user: UserOut
    config: ConfigOut


class CategoryOut(Schema):
    id: str
    title: str
    subtitle: str
    tint: str
    cover: str | None = None
    lessons_count: int
    free: bool


class LessonOut(Schema):
    id: str
    category_id: str
    title: str
    description: str
    kinescope_id: str
    poster: str | None = None
    duration_sec: int
    free: bool
    moggs_reward: int
    materials_url: str | None = None
    order: int


class ProgressOut(Schema):
    lesson_id: str
    position_sec: int
    duration_sec: int
    completed: bool
    rewarded: bool
    updated_at: datetime


class ProgressIn(Schema):
    position_sec: int
    duration_sec: int


class WatchResult(Schema):
    moggs: int
    #: Сколько начислено этим вызовом (0 — за урок уже платили).
    awarded: int


class FavoriteToggled(Schema):
    favorite: bool


class CuratorOut(Schema):
    id: str
    name: str
    username: str
    role: str
    about: str
    photo_url: str | None = None
    tag: str | None = None


class WheelSectorOut(Schema):
    id: str
    label: str
    color: str
    blank: bool


class PrizeOut(Schema):
    id: str
    title: str
    code: str
    source: str
    #: Личная ссылка на переписку за этим призом; пусто — общий менеджер.
    contact_url: str | None = None
    created_at: datetime
    expires_at: datetime
    used_at: datetime | None = None


class SpinResult(Schema):
    sector_id: str
    prize: PrizeOut | None = None
    moggs: int


class ShopItemOut(Schema):
    id: str
    title: str
    description: str
    price: int
    image: str | None = None


class PurchaseResult(Schema):
    prize: PrizeOut
    moggs: int


class MoggsEntryOut(Schema):
    id: str
    amount: int
    reason: str
    created_at: datetime


class CodeIn(Schema):
    code: str


class PrizeOwnerOut(Schema):
    telegram_id: int
    first_name: str
    username: str | None = None


class PrizeCheckOut(Schema):
    """Что видит менеджер, когда пробивает промокод."""

    #: active — можно гасить, used — уже погашен, expired — просрочен.
    status: str
    prize: PrizeOut
    owner: PrizeOwnerOut


class PaymentIntentOut(Schema):
    payment_id: str
    confirmation_url: str


class PaymentStatusOut(Schema):
    status: str
