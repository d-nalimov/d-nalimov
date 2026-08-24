from .config import Settings
from .models import Category, Lesson, MoggsEntry, Progress, User
from .schemas import CategoryOut, ConfigOut, LessonOut, MoggsEntryOut, ProgressOut, UserOut


def user_out(user: User) -> UserOut:
    return UserOut(
        id=str(user.id),
        telegram_id=user.telegram_id,
        first_name=user.first_name,
        last_name=user.last_name,
        username=user.username,
        photo_url=user.photo_url,
        status=user.status,
        access_until=user.access_until,
        moggs=user.moggs,
    )


def config_out(settings: Settings) -> ConfigOut:
    return ConfigOut(
        price_amount=settings.price_amount,
        price_currency=settings.price_currency,
        spin_cost=settings.spin_cost,
        promo_ttl_days=settings.promo_ttl_days,
        manager_username=settings.manager_username,
        community_url=settings.community_url,
    )


def category_out(category: Category, lessons_count: int) -> CategoryOut:
    return CategoryOut(
        id=category.id,
        title=category.title,
        subtitle=category.subtitle,
        tint=category.tint,
        cover=category.cover,
        lessons_count=lessons_count,
        free=category.free,
    )


def lesson_out(lesson: Lesson) -> LessonOut:
    return LessonOut(
        id=lesson.id,
        category_id=lesson.category_id,
        title=lesson.title,
        description=lesson.description,
        kinescope_id=lesson.kinescope_id,
        poster=lesson.poster,
        duration_sec=lesson.duration_sec,
        free=lesson.free,
        moggs_reward=lesson.moggs_reward,
        materials_url=lesson.materials_url,
        order=lesson.sort_order,
    )


def progress_out(progress: Progress) -> ProgressOut:
    return ProgressOut(
        lesson_id=progress.lesson_id,
        position_sec=progress.position_sec,
        duration_sec=progress.duration_sec,
        completed=progress.completed,
        rewarded=progress.rewarded,
        updated_at=progress.updated_at,
    )


def moggs_entry_out(entry: MoggsEntry) -> MoggsEntryOut:
    return MoggsEntryOut(
        id=str(entry.id), amount=entry.amount, reason=entry.reason, created_at=entry.created_at
    )
