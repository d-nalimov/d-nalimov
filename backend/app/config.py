from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Настройки читаются из окружения (и из .env при локальном запуске)."""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    bot_token: str = ""
    allowed_origins: str = "*"
    database_url: str = "sqlite+aiosqlite:///./cashyou.db"

    price_amount: int = 299_000
    price_currency: str = "RUB"

    spin_cost: int = 100
    promo_ttl_days: int = 30
    purchase_bonus_moggs: int = 100

    manager_username: str = "ceo_trauma"
    community_url: str = "https://t.me/cashyou_club"

    yookassa_shop_id: str = ""
    yookassa_secret_key: str = ""
    yookassa_return_url: str = ""

    #: Префикс, под которым приложение видно снаружи (например /api).
    #: Сам путь срезает nginx, здесь он нужен только для /docs и схемы.
    root_path: str = ""

    env: str = "development"
    auth_dev_mode: bool = False

    #: Сколько секунд initData считается свежей.
    auth_ttl_seconds: int = 24 * 60 * 60

    #: Доля просмотра, после которой урок засчитывается и начисляются моггсы.
    complete_ratio: float = 0.9

    #: Во сколько раз быстрее реального времени разрешено засчитывать просмотр.
    #: Запас на ускоренное воспроизведение и задержки сети.
    max_playback_speed: float = 2.5

    #: Токен для гашения промокодов менеджером. Пуст — раздел выключен.
    admin_token: str = ""

    @property
    def is_production(self) -> bool:
        return self.env.lower() in {"production", "prod"}

    @property
    def origins(self) -> list[str]:
        return [item.strip() for item in self.allowed_origins.split(",") if item.strip()]

    @property
    def admin_enabled(self) -> bool:
        return bool(self.admin_token)

    @property
    def payments_enabled(self) -> bool:
        return bool(self.yookassa_shop_id and self.yookassa_secret_key)

    def validate_runtime(self) -> None:
        """Ошибки конфигурации ловим на старте, а не первым запросом пользователя."""
        if not self.bot_token and not self.auth_dev_mode:
            raise RuntimeError("BOT_TOKEN не задан: проверить подпись initData нечем")
        if self.auth_dev_mode and self.is_production:
            raise RuntimeError("AUTH_DEV_MODE недопустим при ENV=production")
        if self.is_production and "*" in self.origins:
            raise RuntimeError("ALLOWED_ORIGINS=* недопустим при ENV=production")


@lru_cache
def get_settings() -> Settings:
    return Settings()
