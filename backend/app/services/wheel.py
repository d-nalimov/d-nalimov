import secrets

from ..models import WheelSector


def pick_sector(sectors: list[WheelSector]) -> WheelSector:
    """Сектор выбирает сервер по весам: клиент только доигрывает анимацию.

    secrets, а не random: результат стоит денег, предсказуемый генератор здесь
    не нужен.
    """
    total = sum(max(sector.weight, 0) for sector in sectors)
    if total <= 0:
        return secrets.choice(sectors)

    point = secrets.randbelow(total)
    for sector in sectors:
        weight = max(sector.weight, 0)
        if point < weight:
            return sector
        point -= weight
    return sectors[-1]
