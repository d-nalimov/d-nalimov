"""Наполнение каталога.

Запуск: `python -m app.seed`. Повторный запуск безопасен — записи обновляются
по id, пользовательские данные не трогаются.
"""

import asyncio

from sqlalchemy.ext.asyncio import AsyncSession

from .db import SessionMaker, create_all
from .models import Category, Curator, Lesson, ShopItem, WheelSector

MATERIALS_URL = "https://t.me/cashyou_club"

CATEGORIES = [
    ("start", "Старт: база моггинга", "Бесплатный вводный блок", "#2a2a2a", True),
    ("skin", "Идеальная кожа", "Уход, который реально работает", "#3d3d3d", False),
    ("jawline", "Формула выраженной челюсти", "Мьюинг, отёки, осанка", "#2e2e2e", False),
    ("hair", "Волосы и линия роста", "Профилактика и восстановление", "#454545", False),
    ("body", "Тело и композиция", "Сушка без потери лица", "#353535", False),
    ("style", "Стиль и образ", "Подача, гардероб, фото", "#404040", False),
]

# (id категории, порядок, заголовок, описание, бесплатный, длительность, награда)
LESSONS = [
    ("start", 1, "Что такое моггинг и с чего начать", "Как устроена система клуба и что даст результат за 30 дней.", True, 605, 40),
    ("start", 2, "Разбор внешности: находим точки роста", "Учимся смотреть на себя как эксперт, а не как критик.", True, 670, 25),
    ("start", 3, "План на первый месяц", "Собираем персональную дорожную карту из уроков клуба.", True, 735, 25),
    ("skin", 1, "Урок 1. Типы кожи и базовый уход", "Определяем тип кожи и собираем минимальную рабочую рутину.", True, 605, 25),
    ("skin", 2, "Урок 2. Кислоты и ретинол без вреда", "Как вводить активы, чтобы не сжечь барьер.", False, 670, 25),
    ("skin", 3, "Урок 3. Акне: причины и протокол", "Разбираем питание, гормоны и уход.", False, 735, 25),
    ("skin", 4, "Урок 4. Постакне и текстура", "Пилинги, лазер и домашние методы.", False, 800, 25),
    ("skin", 5, "Урок 5. Солнце и старение", "SPF, который не забудешь наносить.", False, 865, 25),
    ("skin", 6, "Урок 6. Косметолог: что делать, что нет", "Список процедур с реальной пользой.", False, 930, 25),
    ("jawline", 1, "Урок 1. Анатомия линии челюсти", "Что можно изменить, а что — миф.", True, 605, 25),
    ("jawline", 2, "Урок 2. Мьюинг: техника", "Положение языка, ошибки новичков, сроки.", False, 670, 25),
    ("jawline", 3, "Урок 3. Отёки и лимфа", "Сон, соль, алкоголь и утреннее лицо.", False, 735, 25),
    ("jawline", 4, "Урок 4. Осанка и шея", "Как положение головы ломает профиль.", False, 800, 25),
    ("jawline", 5, "Урок 5. Жир на лице", "Дефицит калорий и порядок «ухода» жира.", False, 865, 25),
    ("hair", 1, "Урок 1. Диагностика выпадения", "Норма, сезонность и тревожные признаки.", True, 605, 25),
    ("hair", 2, "Урок 2. Доказанные средства", "Что имеет исследования, а что — маркетинг.", False, 670, 25),
    ("hair", 3, "Урок 3. Стрижка под форму головы", "Как объяснить барберу задачу.", False, 735, 25),
    ("hair", 4, "Урок 4. Борода и линии", "Оформление, которое усиливает челюсть.", False, 800, 25),
    ("body", 1, "Урок 1. Композиция тела", "Процент жира и как его считать без ошибок.", True, 605, 25),
    ("body", 2, "Урок 2. Питание на дефиците", "Рацион, который выдержишь дольше недели.", False, 670, 25),
    ("body", 3, "Урок 3. Силовая база", "Три движения, которые меняют силуэт.", False, 735, 25),
    ("body", 4, "Урок 4. Сон и восстановление", "Почему без сна не работает ничего.", False, 800, 25),
    ("body", 5, "Урок 5. Добавки", "Короткий список того, что имеет смысл.", False, 865, 25),
    ("style", 1, "Урок 1. Базовый гардероб", "Капсула, которая закрывает 90% ситуаций.", True, 605, 25),
    ("style", 2, "Урок 2. Посадка и пропорции", "Как одежда меняет рост и плечи.", False, 670, 25),
    ("style", 3, "Урок 3. Фото для соцсетей", "Свет, ракурс, поза.", False, 735, 25),
    ("style", 4, "Урок 4. Подача и голос", "Невербалика в кадре и в жизни.", False, 800, 25),
]

CURATORS = [
    ("c1", "Алина Ким", "alina_curator", "Куратор по уходу за кожей",
     "Косметолог-эстетист, 7 лет практики. Ведёт разборы рутины и подбирает уход под задачу.", "Топ-куратор"),
    ("c2", "Никита Бельков", "nikita_curator", "Куратор по телу и питанию",
     "Тренер, специализация — рекомпозиция. Собирает планы питания и тренировок под уровень.", None),
    ("c3", "Тимофей Луга", "timofey_curator", "Куратор по стилю",
     "Стилист, работает с личным брендом. Разбирает гардероб и подачу в кадре.", None),
    ("c4", "Даниил Нал", "daniil_curator", "Куратор по мьюингу",
     "Ортодонт-консультант. Ведёт блок про челюсть, осанку и дыхание.", "Топ-куратор"),
]

# Цвета секторов — шкала редкости: серый обычный → зелёный → синий → фиолетовый
# → оранжевый легендарный. Чем ниже вес (шанс), тем выше редкость.
# Тона приглушены: клиент рисует из каждого градиент, чистые цвета в нём кричат.
COMMON, UNCOMMON, RARE, EPIC, LEGENDARY = (
    "#4a4f57",
    "#3b6537",
    "#2d5279",
    "#583b76",
    "#8d5327",
)

# (id, подпись, цвет, пустой, что выдаём, моггсы, вес)
# Вес = шанс в процентах, сумма по всем секторам 100.
# Порядок подобран так, чтобы соседние сектора не совпадали по цвету.
WHEEL = [
    ("w1", "150 моггсов", UNCOMMON, False, "moggs", 150, 22),
    ("w2", "GHK-Cu курс", LEGENDARY, False, "promo", 0, 2),
    ("w3", "В другой раз", COMMON, True, "none", 0, 24),
    ("w4", "Консультация Налимова", RARE, False, "promo", 0, 10),
    ("w5", "Пенка для умывания", EPIC, False, "promo", 0, 6),
    ("w6", "Перкуссионный массажёр", LEGENDARY, False, "promo", 0, 1),
    ("w7", "В другой раз", COMMON, True, "none", 0, 24),
    ("w8", "Разбор у куратора", RARE, False, "promo", 0, 11),
]

SHOP = [
    ("s1", "Личный разбор куратора", "20 минут в личке: смотрим фото и собираем план.", 500),
    ("s2", "Гайд «Отёки за 7 дней»", "PDF-протокол на неделю с чек-листом.", 250),
    ("s3", "Скидка 20% на мерч", "Промокод на любой товар в магазине клуба.", 300),
    ("s4", "Доступ в закрытый чат", "Чат по городам и нетворкинг участников.", 700),
]


async def seed(session: AsyncSession) -> None:
    for order, (cid, title, subtitle, tint, free) in enumerate(CATEGORIES):
        category = await session.get(Category, cid) or Category(id=cid)
        category.title, category.subtitle, category.tint = title, subtitle, tint
        category.free, category.sort_order = free, order
        session.add(category)

    for category_id, order, title, description, free, duration, reward in LESSONS:
        lesson_id = f"{category_id}-{order}"
        lesson = await session.get(Lesson, lesson_id) or Lesson(id=lesson_id)
        lesson.category_id, lesson.sort_order = category_id, order
        lesson.title, lesson.description = title, description
        lesson.free, lesson.duration_sec, lesson.moggs_reward = free, duration, reward
        lesson.materials_url = MATERIALS_URL
        session.add(lesson)

    for order, (cid, name, username, role, about, tag) in enumerate(CURATORS):
        curator = await session.get(Curator, cid) or Curator(id=cid)
        curator.name, curator.username, curator.role = name, username, role
        curator.about, curator.tag, curator.sort_order = about, tag, order
        session.add(curator)

    for order, (sid, label, color, blank, kind, moggs, weight) in enumerate(WHEEL):
        sector = await session.get(WheelSector, sid) or WheelSector(id=sid)
        sector.label, sector.color, sector.blank = label, color, blank
        sector.reward_kind, sector.reward_moggs = kind, moggs
        sector.weight, sector.sort_order = weight, order
        session.add(sector)

    for order, (sid, title, description, price) in enumerate(SHOP):
        item = await session.get(ShopItem, sid) or ShopItem(id=sid)
        item.title, item.description, item.price, item.sort_order = title, description, price, order
        session.add(item)

    await session.commit()


async def main() -> None:
    await create_all()
    async with SessionMaker() as session:
        await seed(session)
    print(f"Каталог загружен: {len(CATEGORIES)} категорий, {len(LESSONS)} уроков")


if __name__ == "__main__":
    asyncio.run(main())
