# Развёртывание на looksmaxx.ru

Инструкция написана для случая, когда **на сервере уже работает основная
платформа**. Всё новое ставится рядом и не трогает существующий сайт: свой
каталог, свой пользователь, своя база, свой файл конфигурации nginx.

## Что и куда ставится

| Адрес | Что это | Где лежит |
|---|---|---|
| `https://looksmaxx.ru/` | основная платформа | **не трогаем** |
| `https://looksmaxx.ru/web/` | мини-приложение (статика) | `/var/www/cashyou` |
| `https://looksmaxx.ru/api/` | API мини-приложения | процесс на `127.0.0.1:8000` |

Фронт и API на одном домене, поэтому межсайтовых запросов нет и CORS в этой
схеме не участвует вовсе.

| Ресурс | Значение |
|---|---|
| Код | `/srv/cashyou` |
| Системный пользователь | `cashyou` |
| Порт API | `8000`, только на `127.0.0.1` |
| База | PostgreSQL, отдельная база `cashyou` |
| Служба | `cashyou-api.service` |

---

## 0. Проверка сервера

Выполнить до установки. Каждая команда отвечает на вопрос, от которого зависит
дальнейшее.

```bash
# Какой веб-сервер принимает 80/443 — от этого зависит раздел 7
sudo ss -tlnp | grep -E ':80|:443'

# Порт 8000 должен быть свободен
sudo ss -tlnp | grep ':8000' || echo "порт 8000 свободен"

# Python 3.11 или новее
python3 -V

# Есть ли PostgreSQL
psql --version 2>/dev/null || echo "postgres не установлен — см. шаг 4"

# Память и диск: API с базой просят около 512 МБ сверх текущего
free -m && df -h /
```

Если 80/443 держит **Apache**, а не nginx — раздел 7 читать в варианте «Apache».
Если платформа работает в Docker и порты заняты контейнером — раздел 7 в
варианте «Docker».

> **Правило на всю установку:** конфигурацию существующего сайта не редактируем.
> Все изменения — в отдельном файле, который подключается к его конфигу. Перед
> каждой перезагрузкой веб-сервера — проверка синтаксиса. Так откат всегда
> сводится к удалению одного файла.

---

## 1. Пользователь и каталоги

Отдельный системный пользователь без оболочки: если API скомпрометируют, доступа
к файлам платформы у него не будет.

```bash
sudo useradd -r -s /usr/sbin/nologin cashyou
sudo mkdir -p /srv/cashyou /var/www/cashyou
sudo chown -R $USER /srv/cashyou
```

## 2. Код

```bash
git clone <адрес репозитория> /srv/cashyou
cd /srv/cashyou
```

В репозитории три каталога: `twa` (мини-приложение), `backend` (API),
`deploy` (эта инструкция и конфиги).

## 3. Python-окружение

```bash
cd /srv/cashyou/backend
python3 -m venv .venv
.venv/bin/pip install --upgrade pip
.venv/bin/pip install -r requirements.txt
```

## 4. База данных

Отдельные роль и база. Это важно: в таблицах лежат балансы моггсов и промокоды,
то есть фактически деньги, и миграции основной платформы не должны иметь к ним
доступа.

```bash
sudo -u postgres createuser cashyou --pwprompt      # придумать пароль
sudo -u postgres createdb cashyou --owner=cashyou
```

Если PostgreSQL на сервере нет и ставить его сейчас не хочется, для старта
подойдёт SQLite — строка подключения в шаге 5. Перейти на PostgreSQL можно
позже, но данные при переезде придётся переносить вручную.

## 5. Настройки

```bash
cd /srv/cashyou/backend
cp .env.example .env
chmod 600 .env          # в файле токен бота и ключи платежей
nano .env
```

**Обязательные:**

| Переменная | Что писать |
|---|---|
| `BOT_TOKEN` | токен бота из @BotFather. Им проверяется подпись Telegram — без него приложение не стартует |
| `DATABASE_URL` | `postgresql+asyncpg://cashyou:пароль@localhost/cashyou`<br>или `sqlite+aiosqlite:////srv/cashyou/backend/cashyou.db` |
| `ROOT_PATH` | `/api` — путь срезает nginx, приложению он нужен для `/docs` и схемы |
| `ENV` | `production` |
| `ALLOWED_ORIGINS` | `https://looksmaxx.ru` |
| `ADMIN_TOKEN` | токен для гашения промокодов. Сгенерировать: `openssl rand -hex 24`. Пока пуст — гашение отключено |

**Платежи** (без них приложение работает, но оплата отвечает `503`):

| Переменная | Что писать |
|---|---|
| `YOOKASSA_SHOP_ID` | идентификатор магазина из кабинета ЮKassa |
| `YOOKASSA_SECRET_KEY` | секретный ключ оттуда же |
| `YOOKASSA_RETURN_URL` | `https://t.me/<имя_бота>/app` — куда вернуть человека после оплаты |

**Экономика и контакты** — можно оставить по умолчанию:

| Переменная | По умолчанию | Смысл |
|---|---|---|
| `PRICE_AMOUNT` | `299000` | цена доступа в копейках (2 990 ₽) |
| `PRICE_CURRENCY` | `RUB` | валюта |
| `SPIN_COST` | `100` | стоимость прокрута колеса в моггсах |
| `PROMO_TTL_DAYS` | `30` | срок жизни промокода |
| `PURCHASE_BONUS_MOGGS` | `100` | бонус за покупку доступа |
| `MANAGER_USERNAME` | `ceo_trauma` | общий менеджер: к нему ведут призы без своей ссылки |
| `COMMUNITY_URL` | ссылка на канал | плитка «Сообщество» |
| `COMPLETE_RATIO` | `0.9` | доля урока, после которой засчитывается просмотр |
| `MAX_PLAYBACK_SPEED` | `2.5` | во сколько раз быстрее реального времени можно засчитывать просмотр |

`AUTH_DEV_MODE` оставить `false`. Он разрешает вход без подписи и при
`ENV=production` не даст приложению запуститься — это защита от случайной
выкатки с ним.

## 6. Каталог уроков

```bash
cd /srv/cashyou/backend
.venv/bin/python -m app.seed
```

Создаёт таблицы и заполняет категории, уроки, кураторов, сектора колеса и
магазин. Запускать можно повторно: записи обновляются по id, пользовательские
данные не трогаются, а кураторы, которых убрали из списка, скрываются.

Реальные `kinescope_id`, обложки, постеры и ссылки на переписку правятся в
`backend/app/seed.py`, после чего команда запускается снова.

## 7. Служба API

```bash
sudo chown -R cashyou:cashyou /srv/cashyou
sudo cp /srv/cashyou/deploy/cashyou-api.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now cashyou-api

# Проверка
sudo systemctl status cashyou-api --no-pager
curl -s localhost:8000/health          # {"status":"ok"}
```

Служба слушает только `127.0.0.1`, снаружи порт недоступен — наружу её выпускает
веб-сервер.

## 8. Фронт

Сборку удобнее делать на своей машине и заливать готовое: на сервере не нужен
Node.

```bash
# локально, в каталоге twa
npm ci
npm run build

rsync -a --delete dist/ user@looksmaxx.ru:/tmp/cashyou-web/
```

На сервере:

```bash
sudo rsync -a --delete /tmp/cashyou-web/ /var/www/cashyou/
sudo chown -R www-data:www-data /var/www/cashyou
```

Настройки боевой сборки лежат в `twa/.env.production` и подхватываются обычным
`npm run build` — задавать переменные в командной строке не нужно:

| Переменная | Значение | Зачем |
|---|---|---|
| `VITE_BASE_PATH` | `/web/` | подпуть попадает в ссылки на скрипты, стили и шрифты |
| `VITE_API_BASE_URL` | `/api` | относительный путь: приложение ходит на тот же домен, с которого открыто |

Это не выданные кем-то ключи, а описание того, по каким путям на вашем домене
лежат приложение и API. Меняете размещение — меняете эти две строки.

> **Демо без бэкенда:** `npm run build:demo` (настройки в `twa/.env.demo`).
> Такая сборка не обращается к API и держит всё в `localStorage` браузера:
> у каждого, кто откроет, свои 9999 моггсов и ненастоящие промокоды.
> Она для показа — на боевой домен её заливать нельзя.

## 9. Веб-сервер

### Вариант nginx

Существующий конфиг сайта **не редактируем**, кладём отдельный файл и
подключаем его одной строкой.

```bash
sudo cp /srv/cashyou/deploy/nginx.conf.example /etc/nginx/snippets/cashyou.conf
```

В конфиг сайта (`/etc/nginx/sites-enabled/looksmaxx.ru`), внутрь блока
`server { ... }`, который слушает 443, добавить одну строку:

```nginx
include /etc/nginx/snippets/cashyou.conf;
```

Содержимое сниппета — в `deploy/nginx.conf.example`; ключевые строки:

```nginx
location /web/ {
    alias /var/www/cashyou/;
    index index.html;
    try_files $uri $uri/ /web/index.html;
}

location /api/ {
    proxy_pass http://127.0.0.1:8000/;   # слеш в конце срезает префикс /api
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

Слеш в конце `proxy_pass` обязателен: без него запрос `/api/auth` уйдёт в
приложение как `/api/auth` и вернёт 404, потому что маршрут называется `/auth`.

```bash
sudo nginx -t && sudo systemctl reload nginx
```

`nginx -t` проверяет весь конфиг целиком: если сниппет сломан, сайт не
перезагрузится и продолжит работать на старой конфигурации.

### Вариант Apache

```apache
Alias /web/ /var/www/cashyou/
<Directory /var/www/cashyou>
    Require all granted
    FallbackResource /web/index.html
</Directory>

ProxyPreserveHost On
ProxyPass        /api/ http://127.0.0.1:8000/
ProxyPassReverse /api/ http://127.0.0.1:8000/
```

```bash
sudo a2enmod proxy proxy_http
sudo apachectl configtest && sudo systemctl reload apache2
```

### Вариант «платформа в Docker и держит порты»

API поднимается тем же способом на `127.0.0.1:8000`, а проксирование
добавляется в тот контейнер или конфиг, который сейчас принимает 443. Если это
Traefik или Caddy — правило то же: `/web/` на каталог со статикой, `/api/` на
`host.docker.internal:8000` или на IP хоста, со срезанием префикса.

## 10. Регистрация в сервисах

| Где | Что указать |
|---|---|
| @BotFather → `/newapp` | Web App URL: `https://looksmaxx.ru/web/` |
| @BotFather → `/mybots` → Bot Settings → Menu Button | тот же адрес |
| ЮKassa → уведомления | `https://looksmaxx.ru/api/payments/webhook` |
| Kinescope → разрешённые домены | `looksmaxx.ru` |

Без последнего пункта видео не проиграется: плеер отказывается работать на
чужом домене.

---

## Проверка после установки

```bash
# API отвечает и знает про префикс
curl -s https://looksmaxx.ru/api/health                    # {"status":"ok"}

# Без подписи Telegram доступа нет — так и должно быть
curl -s -o /dev/null -w '%{http_code}\n' https://looksmaxx.ru/api/categories   # 401

# Статика отдаётся
curl -s -o /dev/null -w '%{http_code}\n' https://looksmaxx.ru/web/             # 200

# Основная платформа цела
curl -s -o /dev/null -w '%{http_code}\n' https://looksmaxx.ru/                 # 200
```

Затем открыть мини-приложение в Telegram и пройти сценарий: экран загрузился,
видно категории, урок открывается, сердечко сохраняется после перезахода.

---

## Обновление

**Фронт:**

```bash
# локально
npm run build
rsync -a --delete dist/ user@looksmaxx.ru:/tmp/cashyou-web/
# на сервере
sudo rsync -a --delete /tmp/cashyou-web/ /var/www/cashyou/
```

Перезагружать nginx не нужно. Имена файлов содержат хеш сборки, а `index.html`
отдаётся с `no-store`, поэтому люди получат новую версию сразу и без залипшего
кэша.

**Бэкенд:**

```bash
cd /srv/cashyou && sudo -u cashyou git pull
sudo -u cashyou backend/.venv/bin/pip install -r backend/requirements.txt
sudo -u cashyou backend/.venv/bin/python -m app.seed     # если менялся каталог
sudo systemctl restart cashyou-api
```

Перезапуск занимает секунду, соединения в этот момент оборвутся — выкатывать
лучше не в час пик.

## Резервные копии

В базе лежат балансы моггсов и выданные промокоды. Потеря такой базы — это
разбирательства с людьми, у которых «был приз».

```bash
sudo -u postgres sh -c 'pg_dump cashyou | gzip > /var/backups/cashyou-$(date +%F).sql.gz'
```

В `crontab -e` у пользователя `postgres`:

```
0 4 * * * pg_dump cashyou | gzip > /var/backups/cashyou-$(date +\%F).sql.gz
0 5 * * 0 find /var/backups -name 'cashyou-*.sql.gz' -mtime +30 -delete
```

Восстановление:

```bash
gunzip -c /var/backups/cashyou-2026-08-25.sql.gz | sudo -u postgres psql cashyou
```

## Диагностика

```bash
sudo journalctl -u cashyou-api -f          # живой лог API
sudo journalctl -u cashyou-api -n 100      # последние сто строк
sudo tail -f /var/log/nginx/error.log      # ошибки веб-сервера
```

| Симптом | Причина | Что делать |
|---|---|---|
| `502 Bad Gateway` на `/api/` | служба не запущена или упала на старте | `systemctl status cashyou-api`, смотреть журнал |
| `404` на всех вызовах API | забыт слеш в конце `proxy_pass` | вернуть `proxy_pass http://127.0.0.1:8000/;` |
| Белый экран на `/web/` | сборка без `VITE_BASE_PATH=/web/` | пересобрать `npm run build` и залить заново |
| У всех сразу 9999 моггсов | залита демо-сборка (`build:demo`), приложение работает на моке | пересобрать `npm run build` и залить заново |
| `401` в приложении | не совпал `BOT_TOKEN` либо приложение открыто вне Telegram | сверить токен бота |
| `403 payment_required` | урок платный, доступ не выдан | так и задумано; проверить оплату |
| `503 admin_disabled` при гашении кода | пуст `ADMIN_TOKEN` | заполнить и перезапустить службу |
| Служба не стартует, в журнале про `AUTH_DEV_MODE` | включён отладочный вход при `ENV=production` | поставить `AUTH_DEV_MODE=false` |
| Видео не играет | домен не внесён в Kinescope | добавить `looksmaxx.ru` в разрешённые |

## Откат

```bash
# Отключить мини-приложение, не трогая платформу
sudo sed -i '/snippets\/cashyou.conf/d' /etc/nginx/sites-enabled/looksmaxx.ru
sudo nginx -t && sudo systemctl reload nginx
sudo systemctl stop cashyou-api
```

Основной сайт при этом не затрагивается: у него отдельный конфиг, отдельные
каталоги и отдельная база.

## Безопасность

- `.env` с правами `600` и владельцем `cashyou`: там токен бота, ключи платежей
  и админский токен.
- `ADMIN_TOKEN` не передавать в переписке и не хранить в репозитории. Гашение
  промокодов по нему — это выдача призов.
- Порт `8000` слушает только `127.0.0.1`; в firewall наружу открывать не нужно.
- `AUTH_DEV_MODE=false` на проде. При `ENV=production` приложение с включённым
  флагом просто не стартует, но лучше не проверять.
- Подпись Telegram проверяется на каждом запросе, `user_id` берётся только из
  неё — данным, присланным клиентом, приложение не верит.
