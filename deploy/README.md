# Выкатка на looksmaxx.ru

Мини-приложение и его API живут на одном домене разными путями:

| Адрес | Что | Откуда |
|---|---|---|
| `https://looksmaxx.ru/web/` | мини-приложение | статика из `twa/dist` в `/var/www/cashyou` |
| `https://looksmaxx.ru/api/` | API | FastAPI на `127.0.0.1:8000` за nginx |

Один origin — межсайтовых запросов нет, поэтому CORS в этой схеме не участвует
вовсе, а `ALLOWED_ORIGINS` остаётся страховкой на случай выноса фронта отдельно.

## Первая установка

```bash
# 1. Код и окружение
sudo mkdir -p /srv/cashyou && sudo chown $USER /srv/cashyou
git clone <репозиторий> /srv/cashyou
cd /srv/cashyou/backend
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
cp .env.example .env      # заполнить BOT_TOKEN, ADMIN_TOKEN, YOOKASSA_*, DATABASE_URL

# 2. База (отдельная от базы сайта)
sudo -u postgres createuser cashyou --pwprompt
sudo -u postgres createdb cashyou --owner=cashyou
# DATABASE_URL=postgresql+asyncpg://cashyou:пароль@localhost/cashyou

# 3. Каталог уроков и кураторов
.venv/bin/python -m app.seed

# 4. Служба
sudo useradd -r -s /usr/sbin/nologin cashyou || true
sudo chown -R cashyou /srv/cashyou
sudo cp /srv/cashyou/deploy/cashyou-api.service /etc/systemd/system/
sudo systemctl enable --now cashyou-api
curl -s localhost:8000/health   # {"status":"ok"}

# 5. nginx
sudo cp /srv/cashyou/deploy/nginx.conf.example /etc/nginx/snippets/cashyou.conf
# перенести блоки location в конфиг существующего сайта, затем
sudo nginx -t && sudo systemctl reload nginx
```

## Выкатка фронта

Сборка знает и о подпути, и о том, где искать API:

```bash
cd twa
VITE_BASE_PATH=/web/ VITE_API_BASE_URL=/api npm run build
rsync -a --delete dist/ user@looksmaxx.ru:/var/www/cashyou/
```

`VITE_API_BASE_URL=/api` — относительный путь, поэтому фронт ходит на тот же
домен, с которого открыт.

## Выкатка бэкенда

```bash
cd /srv/cashyou && git pull
backend/.venv/bin/pip install -r backend/requirements.txt
backend/.venv/bin/python -m app.seed        # если менялся каталог
sudo systemctl restart cashyou-api
```

## Что прописать в сервисах

- **BotFather** → `/newapp` → Web App URL: `https://looksmaxx.ru/web/`
- **ЮKassa** → вебхук: `https://looksmaxx.ru/api/payments/webhook`
- **Kinescope** → в список разрешённых доменов добавить `looksmaxx.ru`

## О чём помнить

- Конфиг сайта и конфиг мини-приложения — разные файлы. Выкатка сайта не должна
  переписывать блоки `/web/` и `/api/`.
- База отдельная от базы сайта: в наших таблицах балансы и промокоды.
  Нужен регулярный дамп — `pg_dump cashyou` по расписанию.
- `index.html` отдаётся с `no-store`, ассеты — с годовым кэшем: имена файлов
  содержат хеш сборки, поэтому старые версии не залипают.
