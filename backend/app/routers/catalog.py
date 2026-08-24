from fastapi import APIRouter
from sqlalchemy import func, select

from ..deps import CurrentUser, SessionDep
from ..errors import NotFound, PaymentRequired
from ..models import Category, Lesson
from ..schemas import CategoryOut, LessonOut
from ..serializers import category_out, lesson_out
from ..services.access import can_watch

router = APIRouter(tags=["catalog"])


@router.get("/categories", response_model=list[CategoryOut])
async def list_categories(session: SessionDep, _: CurrentUser) -> list[CategoryOut]:
    counts = dict(
        (await session.execute(select(Lesson.category_id, func.count()).group_by(Lesson.category_id))).all()
    )
    categories = (await session.scalars(select(Category).order_by(Category.sort_order))).all()
    return [category_out(category, counts.get(category.id, 0)) for category in categories]


@router.get("/categories/{category_id}/lessons", response_model=list[LessonOut])
async def list_lessons(category_id: str, session: SessionDep, _: CurrentUser) -> list[LessonOut]:
    category = await session.get(Category, category_id)
    if category is None:
        raise NotFound("Категория не найдена")

    lessons = (
        await session.scalars(
            select(Lesson).where(Lesson.category_id == category_id).order_by(Lesson.sort_order)
        )
    ).all()
    return [lesson_out(lesson) for lesson in lessons]


@router.get("/lessons/{lesson_id}", response_model=LessonOut)
async def get_lesson(lesson_id: str, session: SessionDep, user: CurrentUser) -> LessonOut:
    lesson = await session.get(Lesson, lesson_id)
    if lesson is None:
        raise NotFound("Урок не найден")
    # Платный урок не отдаём даже частично: kinescopeId — это ключ к видео.
    if not can_watch(user, lesson):
        raise PaymentRequired()
    return lesson_out(lesson)
