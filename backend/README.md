# Кэш`ю — API

Бэкенд мини-приложения: каталог уроков, прогресс просмотра, избранное, моггсы,
колесо призов с промокодами и разовая оплата доступа через ЮKassa.
FastAPI + SQLAlchemy 2.0 (async), SQLite для разработки и PostgreSQL для прода.

Контракт совпадает с тем, что ждёт клиент в `../twa` (`src/api/httpApi.ts`).

## Запуск

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt
cp .env.example .env          # как минимум BOT_TOKEN

python -m app.seed            # создаёт таблицы и наполняет каталог
uvicorn app.main:app --reload # http://127.0.0.1:8000, документация на /docs

pytest                        # 26 тестов
```

Клиент подключается переменной `VITE_API_BASE_URL=http://127.0.0.1:8000` в `../twa/.env`.

## Авторизация

Каждый запрос приходит с заголовком `Authorization: tma <initData>`.
`app/telegram_auth.py` разбирает строку, собирает `data_check_string`, считает
`HMAC-SHA256` с ключом `HMAC-SHA256("WebAppData", BOT_TOKEN)` и сравнивает с `hash`
через `compare_digest`; отдельно проверяется свежесть `auth_date` (сутки).
`user_id` берётся только оттуда — ничему, что прислал клиент помимо подписи, мы не верим.

Пользователь заводится при первом успешном запросе; имя и аватар обновляются
на каждом входе.

`AUTH_DEV_MODE=true` разрешает `Authorization: tma dev:<telegram_id>` без подписи —
для локальной отладки без бота. При `ENV=production` приложение с таким флагом
не стартует.

## Что считает сервер, а не клиент

| Правило | Где |
|---|---|
| Доступ к платному уроку (`403 payment_required`) | `services/access.py` |
| Начисление моггсов за досмотр ≥ 90 %, ровно один раз | `routers/library.py` |
| Позиция просмотра не больше длительности урока | `routers/library.py` |
| Выбор сектора колеса по весам (веса клиенту не отдаются) | `services/wheel.py` |
| Списание моггсов и выпуск промокода | `services/moggs.py`, `services/prizes.py` |
| Одноразовость и срок жизни промокода | `routers/bonuses.py` |
| Выдача доступа после оплаты | `routers/payments.py` |

Баланс меняется только через `add_moggs`, поэтому у любого движения есть запись
в истории и уход в минус невозможен.

## Эндпоинты

| Метод | Путь | Ответ |
|---|---|---|
| POST | `/auth` | `{ user, config }` |
| GET | `/categories` | список категорий с `lessonsCount` |
| GET | `/categories/{id}/lessons` | уроки категории |
| GET | `/lessons/{id}` | урок; `403 payment_required` без доступа |
| GET | `/progress` | `{ [lessonId]: progress }` |
| POST | `/lessons/{id}/progress` | `{ moggs, awarded }` |
| GET | `/favorites`, `/favorites/ids` | избранные уроки и их id |
| POST | `/favorites/{id}/toggle` | `{ favorite }` |
| GET | `/curators` | кураторы |
| GET | `/wheel` | сектора без весов |
| POST | `/wheel/spin` | `{ sectorId, prize, moggs }` |
| GET | `/shop`, POST `/shop/{id}/buy` | магазин за моггсы |
| GET | `/prizes`, POST `/prizes/{id}/use` | промокоды пользователя |
| GET | `/moggs/history` | последние 100 начислений |
| POST | `/payments` | `{ paymentId, confirmationUrl }` |
| GET | `/payments/{id}` | `{ status }` |
| POST | `/payments/webhook` | уведомление ЮKassa |

Ошибки — HTTP-код и тело `{ "message": ..., "code": ... }`; коды: `unauthorized`,
`not_found`, `payment_required`, `insufficient_funds`, `already_used`, `expired`,
`payments_disabled`, `payment_provider_error`.

## Оплата

`POST /payments` создаёт запись у нас и платёж в ЮKassa; id нашего платежа идёт
`Idempotence-Key`, поэтому повтор запроса не создаст второй платёж. Клиенту уходит
только `confirmation_url`.

Тело вебхука ЮKassa не подписано, поэтому оно используется лишь как сигнал:
статус мы перезапрашиваем у ЮKassa сами (`fetch_payment`) и только потом выдаём
доступ. Флаг `access_granted` защищает от повторной выдачи — вебхук приходит
не один раз. Опрос `GET /payments/{id}` тоже сверяется с ЮKassa, если вебхук не дошёл.

Оплата разовая: `status = member`, `access_until = NULL` (бессрочно).

## Каталог

`python -m app.seed` заполняет категории, уроки, кураторов, сектора колеса и магазин.
Запуск повторяемый: записи обновляются по id, пользовательские данные не трогаются.
Реальные `kinescope_id`, обложки и постеры проставляются в этих же таблицах —
клиент сразу начнёт их показывать.

## Деплой

```bash
docker build -t cashyou-api .
docker run -p 8000:8000 --env-file .env cashyou-api
```

На проде: `ENV=production`, `DATABASE_URL` на PostgreSQL (`postgresql+asyncpg://`),
`ALLOWED_ORIGINS` — домен мини-приложения (звёздочка запрещена), адрес вебхука
`https://<домен>/payments/webhook` указывается в личном кабинете ЮKassa.

Схема сейчас создаётся через `Base.metadata.create_all` на старте. Для боевой
эксплуатации следующий шаг — Alembic: миграции нужны, как только таблицы начнут
меняться на живых данных.
