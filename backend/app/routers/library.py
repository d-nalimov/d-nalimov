from fastapi import APIRouter
from sqlalchemy import select

from ..deps import CurrentUser, SessionDep, SettingsDep
from ..errors import NotFound, PaymentRequired
from ..models import Favorite, Lesson, Progress
from ..schemas import FavoriteToggled, LessonOut, ProgressIn, ProgressOut, WatchResult
from ..serializers import lesson_out, progress_out
from ..services.access import can_watch
from ..services.moggs import add_moggs

router = APIRouter(tags=["library"])


@router.get("/progress", response_model=dict[str, ProgressOut])
async def get_progress(session: SessionDep, user: CurrentUser) -> dict[str, ProgressOut]:
    rows = (await session.scalars(select(Progress).where(Progress.user_id == user.id))).all()
    return {row.lesson_id: progress_out(row) for row in rows}


@router.post("/lessons/{lesson_id}/progress", response_model=WatchResult)
async def save_progress(
    lesson_id: str,
    payload: ProgressIn,
    session: SessionDep,
    user: CurrentUser,
    settings: SettingsDep,
) -> WatchResult:
    """Кэш таймкода и начисление моггсов за досмотр.

    Награда считается здесь, а не на клиенте: клиент может прислать любую позицию,
    но заплатим мы один раз и только за урок, который действительно досмотрен.
    """
    lesson = await session.get(Lesson, lesson_id)
    if lesson is None:
        raise NotFound("Урок не найден")
    if not can_watch(user, lesson):
        raise PaymentRequired()

    progress = await session.scalar(
        select(Progress).where(Progress.user_id == user.id, Progress.lesson_id == lesson_id)
    )
    if progress is None:
        progress = Progress(user_id=user.id, lesson_id=lesson_id)
        session.add(progress)

    duration = payload.duration_sec if payload.duration_sec > 0 else lesson.duration_sec
    position = max(0, min(payload.position_sec, duration or payload.position_sec))

    awarded = 0
    completed = duration > 0 and position / duration >= settings.complete_ratio
    if completed and not progress.rewarded:
        awarded = lesson.moggs_reward
        await add_moggs(session, user, awarded, f"Просмотр: {lesson.title}")
        progress.rewarded = True

    progress.position_sec = position
    progress.duration_sec = duration
    progress.completed = progress.completed or completed

    await session.commit()
    return WatchResult(moggs=user.moggs, awarded=awarded)


@router.get("/favorites/ids", response_model=list[str])
async def favorite_ids(session: SessionDep, user: CurrentUser) -> list[str]:
    rows = (
        await session.scalars(
            select(Favorite).where(Favorite.user_id == user.id).order_by(Favorite.created_at.desc())
        )
    ).all()
    return [row.lesson_id for row in rows]


@router.get("/favorites", response_model=list[LessonOut])
async def favorites(session: SessionDep, user: CurrentUser) -> list[LessonOut]:
    rows = (
        await session.execute(
            select(Lesson)
            .join(Favorite, Favorite.lesson_id == Lesson.id)
            .where(Favorite.user_id == user.id)
            .order_by(Favorite.created_at.desc())
        )
    ).scalars().all()
    return [lesson_out(lesson) for lesson in rows]


@router.post("/favorites/{lesson_id}/toggle", response_model=FavoriteToggled)
async def toggle_favorite(lesson_id: str, session: SessionDep, user: CurrentUser) -> FavoriteToggled:
    lesson = await session.get(Lesson, lesson_id)
    if lesson is None:
        raise NotFound("Урок не найден")

    existing = await session.scalar(
        select(Favorite).where(Favorite.user_id == user.id, Favorite.lesson_id == lesson_id)
    )
    if existing is not None:
        await session.delete(existing)
        await session.commit()
        return FavoriteToggled(favorite=False)

    session.add(Favorite(user_id=user.id, lesson_id=lesson_id))
    await session.commit()
    return FavoriteToggled(favorite=True)
