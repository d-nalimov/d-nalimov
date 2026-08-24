# Кэш`ю — Telegram Mini App

Клубное мини-приложение: база видеоуроков, избранное, внутренняя валюта «моггсы»,
колесо призов с промокодами и кураторы. React + Vite + TypeScript, чёрно-белая тема.

## Оформление

Монохром: чёрный фон, белый как акцент (им заливаются активные элементы — главная
кнопка, активный таб и переключатель, кнопка play), светлые карточки для уроков и
товаров. Токены — `src/styles/tokens.css`, ничего не берётся из темы клиента: у клуба
свой вид в любом Telegram.

Заголовки — Oswald, файлы лежат в `public/fonts` (кириллица + латиница, 33 КБ):
в мини-приложении лишний поход на CDN заметен на первом экране. Текст — системный
шрифт устройства.

Картинок в интерфейсе пока нет, под них готовы слоты: `Category.cover`,
`Lesson.poster`, `ShopItem.image`, `Curator.photoUrl`. Пока поле пустое, рисуется
ровная подложка — без эмодзи и заглушек-иконок.

## Запуск

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # сборка в dist/
npm run typecheck
```

Без переменной `VITE_API_BASE_URL` приложение работает на **встроенном mock-бэкенде**
(`src/api/mockApi.ts`, состояние в `localStorage`): проходится весь сценарий —
просмотр урока → начисление моггсов → прокрут колеса → промокод → оплата доступа.
Это режим разработки и демо. Переменные — в `.env.example`.

## Что реализовано

| Раздел | Экран | Файл |
|---|---|---|
| Авторизация через Telegram | — | `src/telegram/sdk.ts`, `src/api/httpApi.ts` |
| База материалов, категории | Главная | `src/pages/HomePage.tsx` |
| Список уроков, поиск | Категория | `src/pages/CategoryPage.tsx` |
| Плеер, таймкод, материалы | Урок | `src/pages/LessonPage.tsx`, `src/components/LessonPlayer.tsx` |
| Избранные уроки | Избранное | `src/pages/FavoritesPage.tsx` |
| Моггсы, колесо, магазин, призы | Мои бонусы | `src/pages/BonusesPage.tsx` |
| Список кураторов → личка в TG | Кураторы | `src/pages/CuratorsPage.tsx` |
| Разовая оплата (ЮKassa) | Пейволл | `src/components/PaywallSheet.tsx` |

Ключевые правила вынесены в один слой и не размазаны по экранам:

- **Доступ.** Пока `user.status !== 'member'`, открыты только уроки с `free: true`
  (прогрев). Клик по закрытому уроку поднимает пейволл.
- **Таймкод.** Позиция просмотра кэшируется на бэкенде и локально; урок открывается
  с последней секунды, прогресс уходит раз в 5 секунд и досохраняется при выходе.
- **Моггсы.** Начисляются один раз за урок при досмотре ≥ 90 % (`COMPLETE_RATIO`).
- **Промокоды.** Любой приз (колесо или магазин) — одноразовый промокод со сроком
  30 дней (`config.promoTtlDays`); использовать — написать менеджеру.

## Авторизация

Клиент не решает, кто он: в каждый запрос уходит заголовок

```
Authorization: tma <Telegram.WebApp.initData>
```

Бэкенд обязан проверить подпись `initData` (HMAC-SHA256 с ключом
`HMAC-SHA256("WebAppData", <bot_token>)`), проверить `auth_date` на свежесть и уже из
неё брать `user.id`. Всё, что приходит из `initDataUnsafe`, используется только для
отрисовки аватара и имени.

## Контракт бэкенда

Реализация лежит в `../backend` (FastAPI + SQLAlchemy). Базовый URL задаётся
`VITE_API_BASE_URL`. Все ответы — JSON, ошибки: HTTP-код плюс
`{ "message": "...", "code": "..." }` (`payment_required`, `insufficient_funds`,
`already_used`, `expired`). Типы — `src/api/types.ts`.

| Метод | Путь | Назначение |
|---|---|---|
| POST | `/auth` | `{ user, config }` — профиль и настройки клуба |
| GET | `/categories` | список категорий |
| GET | `/categories/:id/lessons` | уроки категории |
| GET | `/lessons/:id` | урок; `403 payment_required`, если нет доступа |
| GET | `/progress` | карта прогресса по всем урокам |
| POST | `/lessons/:id/progress` | `{ positionSec, durationSec }` → `{ moggs, awarded }` |
| GET/POST | `/favorites`, `/favorites/ids`, `/favorites/:id/toggle` | избранное |
| GET | `/curators` | кураторы |
| GET | `/wheel`, POST `/wheel/spin` | сектора и прокрут (приз выбирает сервер) |
| GET | `/shop`, POST `/shop/:id/buy` | магазин за моггсы |
| GET | `/prizes`, POST `/prizes/:id/use` | промокоды пользователя |
| GET | `/moggs/history` | история начислений |
| POST | `/payments` | `{ paymentId, confirmationUrl }` от ЮKassa |
| GET | `/payments/:id` | `{ status: pending \| succeeded \| canceled }` |

Начисление моггсов, выбор сектора колеса, выпуск промокодов и выдачу доступа
считает сервер — клиент только показывает результат.

### Оплата

Разовый платёж: `POST /payments` создаёт платёж в ЮKassa и возвращает
`confirmation_url`; приложение открывает его через `WebApp.openLink`, затем опрашивает
`GET /payments/:id`. Доступ выдаётся **только по вебхуку** `payment.succeeded` от
ЮKassa, а не по ответу клиента.

### Видео

`lesson.kinescopeId` встраивается как `https://kinescope.io/embed/<id>`; управление и
события (`ready`, `timeupdate`, `ended`, промотка `setCurrentTime`) идут по протоколу
player.js через `postMessage`. Если `kinescopeId` пуст, включается демо-плеер с той же
логикой позиции и начисления — удобно для разработки без аккаунта Kinescope.

## Деплой

Статика из `dist/`. Для раздачи с подпути (GitHub Pages) задать `VITE_BASE_PATH=/<repo>/`.
Роутинг — `HashRouter`, поэтому отдельная серверная настройка не нужна. Готовый URL
указывается боту через BotFather (`/newapp` или кнопка меню).
