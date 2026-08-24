from datetime import datetime, timezone

from ..models import Lesson, User


def has_access(user: User) -> bool:
    """Доступ к платной части: разовая оплата (access_until = None) или срок ещё не вышел."""
    if user.status != "member":
        return False
    if user.access_until is None:
        return True
    access_until = user.access_until
    if access_until.tzinfo is None:
        access_until = access_until.replace(tzinfo=timezone.utc)
    return access_until > datetime.now(timezone.utc)


def can_watch(user: User, lesson: Lesson) -> bool:
    return lesson.free or has_access(user)
