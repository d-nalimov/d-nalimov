from .conftest import auth_header, grant, rewind_progress

TG = 700200


async def test_free_lesson_is_open_and_paid_is_not(client):
    headers = auth_header(TG)
    await client.post("/auth", headers=headers)

    free = await client.get("/lessons/start-1", headers=headers)
    paid = await client.get("/lessons/skin-3", headers=headers)

    assert free.status_code == 200
    assert free.json()["free"] is True
    assert paid.status_code == 403
    assert paid.json()["code"] == "payment_required"


async def test_paid_lesson_opens_for_member(client):
    tg = 700201
    headers = auth_header(tg)
    await client.post("/auth", headers=headers)
    await grant(tg, member=True)

    response = await client.get("/lessons/skin-3", headers=headers)

    assert response.status_code == 200
    assert response.json()["categoryId"] == "skin"


async def test_reward_needs_real_watch_time(client):
    """Одним запросом «я досмотрел» награду не получить."""
    tg = 700202
    headers = auth_header(tg)
    await client.post("/auth", headers=headers)

    instant = await client.post(
        "/lessons/start-1/progress", headers=headers, json={"positionSec": 605, "durationSec": 605}
    )

    assert instant.json() == {"moggs": 0, "awarded": 0}


async def test_short_duration_from_client_is_ignored(client):
    """Клиент присылает «урок на 10 секунд» — длительность берётся из каталога."""
    tg = 700203
    headers = auth_header(tg)
    await client.post("/auth", headers=headers)

    await client.post(
        "/lessons/start-1/progress", headers=headers, json={"positionSec": 1, "durationSec": 10}
    )
    await rewind_progress(tg, "start-1", 60)
    result = await client.post(
        "/lessons/start-1/progress", headers=headers, json={"positionSec": 10, "durationSec": 10}
    )

    assert result.json()["awarded"] == 0
    progress = (await client.get("/progress", headers=headers)).json()
    assert progress["start-1"]["durationSec"] == 605


async def test_moggs_are_paid_once_after_watching(client):
    tg = 700204
    headers = auth_header(tg)
    await client.post("/auth", headers=headers)

    # Смотрим урок кусками: каждый раз отматываем отметку назад, как будто время шло.
    position = 0
    while position < 605:
        position = min(position + 60, 605)
        await client.post(
            "/lessons/start-1/progress",
            headers=headers,
            json={"positionSec": position, "durationSec": 605},
        )
        await rewind_progress(tg, "start-1", 60)

    balance = (await client.post("/auth", headers=headers)).json()["user"]["moggs"]
    assert balance == 40

    # Повторный «досмотр» ничего не начисляет.
    again = await client.post(
        "/lessons/start-1/progress", headers=headers, json={"positionSec": 605, "durationSec": 605}
    )
    assert again.json() == {"moggs": 40, "awarded": 0}

    progress = (await client.get("/progress", headers=headers)).json()
    assert progress["start-1"]["completed"] is True


async def test_seeking_ahead_does_not_count_as_watching(client):
    """Промотка двигает таймкод, но просмотром не считается."""
    tg = 700205
    headers = auth_header(tg)
    await client.post("/auth", headers=headers)

    await client.post(
        "/lessons/start-2/progress", headers=headers, json={"positionSec": 5, "durationSec": 670}
    )
    await rewind_progress(tg, "start-2", 10)
    result = await client.post(
        "/lessons/start-2/progress", headers=headers, json={"positionSec": 660, "durationSec": 670}
    )

    assert result.json()["awarded"] == 0
    progress = (await client.get("/progress", headers=headers)).json()
    # Таймкод сохранён для продолжения, но засчитано только реально просмотренное.
    assert progress["start-2"]["positionSec"] == 660
    assert progress["start-2"]["completed"] is False


async def test_progress_on_paid_lesson_requires_access(client):
    tg = 700206
    headers = auth_header(tg)
    await client.post("/auth", headers=headers)

    response = await client.post(
        "/lessons/skin-3/progress", headers=headers, json={"positionSec": 700, "durationSec": 735}
    )

    assert response.status_code == 403


async def test_position_cannot_exceed_duration(client):
    tg = 700207
    headers = auth_header(tg)
    await client.post("/auth", headers=headers)

    await client.post(
        "/lessons/start-2/progress",
        headers=headers,
        json={"positionSec": 999_999, "durationSec": 670},
    )

    progress = (await client.get("/progress", headers=headers)).json()
    assert progress["start-2"]["positionSec"] == 670


async def test_favorites_toggle(client):
    tg = 700208
    headers = auth_header(tg)
    await client.post("/auth", headers=headers)

    added = await client.post("/favorites/start-1/toggle", headers=headers)
    assert added.json() == {"favorite": True}
    assert (await client.get("/favorites/ids", headers=headers)).json() == ["start-1"]

    lessons = (await client.get("/favorites", headers=headers)).json()
    assert [lesson["id"] for lesson in lessons] == ["start-1"]

    removed = await client.post("/favorites/start-1/toggle", headers=headers)
    assert removed.json() == {"favorite": False}
    assert (await client.get("/favorites/ids", headers=headers)).json() == []


async def test_favorites_are_per_user(client):
    first, second = auth_header(700209), auth_header(700210)
    await client.post("/auth", headers=first)
    await client.post("/auth", headers=second)

    await client.post("/favorites/start-3/toggle", headers=first)

    assert (await client.get("/favorites/ids", headers=second)).json() == []


async def test_categories_carry_lesson_counts(client):
    headers = auth_header(700211)
    await client.post("/auth", headers=headers)

    categories = (await client.get("/categories", headers=headers)).json()
    by_id = {item["id"]: item for item in categories}

    assert by_id["skin"]["lessonsCount"] == 6
    assert by_id["start"]["free"] is True
