from datetime import datetime, timezone

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

    Клиент присылает позицию, но верить ей нельзя: одним запросом с позицией
    в конец урока можно было бы забрать награду, не посмотрев ничего. Поэтому
    сервер копит просмотренное время сам и засчитывает за раз не больше, чем
    прошло реального времени с прошлого сохранения (с запасом на ускоренное
    воспроизведение). Промотка вперёд позицию двигает, а просмотр — нет.
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
        # Значения по умолчанию проставляются при вставке, а считаем мы до неё —
        # поэтому задаём их явно.
        progress = Progress(
            user_id=user.id,
            lesson_id=lesson_id,
            position_sec=0,
            duration_sec=0,
            watched_sec=0,
            completed=False,
            rewarded=False,
        )
        session.add(progress)

    # Длительность берём из каталога: иначе клиент прислал бы «урок на 10 секунд»
    # и выполнил условие досмотра одним запросом.
    duration = lesson.duration_sec or payload.duration_sec
    position = max(0, min(payload.position_sec, duration or payload.position_sec))

    now = datetime.now(timezone.utc)
    last_seen = progress.last_seen_at
    if last_seen is not None and last_seen.tzinfo is None:
        last_seen = last_seen.replace(tzinfo=timezone.utc)
    elapsed = (now - last_seen).total_seconds() if last_seen else 0.0

    # Засчитываем только продвижение вперёд и не больше, чем позволяет
    # реально прошедшее время.
    advanced = max(0, position - progress.position_sec)
    credited = min(advanced, elapsed * settings.max_playback_speed)
    progress.watched_sec = min(duration or position, progress.watched_sec + int(credited))

    awarded = 0
    completed = duration > 0 and progress.watched_sec / duration >= settings.complete_ratio
    if completed and not progress.rewarded:
        awarded = lesson.moggs_reward
        await add_moggs(session, user, awarded, f"Просмотр: {lesson.title}")
        progress.rewarded = True

    progress.position_sec = position
    progress.duration_sec = duration
    progress.last_seen_at = now
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
