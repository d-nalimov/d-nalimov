from fastapi import APIRouter

from ..deps import CurrentUser, SettingsDep
from ..schemas import SessionOut
from ..serializers import config_out, user_out

router = APIRouter(tags=["auth"])


@router.post("/auth", response_model=SessionOut)
async def auth(user: CurrentUser, settings: SettingsDep) -> SessionOut:
    """Первый запрос приложения: проверяет подпись, заводит пользователя, отдаёт настройки."""
    return SessionOut(user=user_out(user), config=config_out(settings))
