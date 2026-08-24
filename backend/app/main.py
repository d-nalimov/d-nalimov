import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .db import create_all
from .errors import AppError, app_error_handler
from .routers import auth, bonuses, catalog, curators, library, payments

logger = logging.getLogger("cashyou")


@asynccontextmanager
async def lifespan(_: FastAPI):
    settings = get_settings()
    settings.validate_runtime()
    if settings.auth_dev_mode:
        logger.warning("AUTH_DEV_MODE включён: подпись initData не проверяется")
    await create_all()
    yield


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title="Кэш`ю API", version="1.0.0", lifespan=lifespan)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.origins,
        allow_credentials=False,
        allow_methods=["GET", "POST", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type"],
    )

    app.add_exception_handler(AppError, app_error_handler)

    for module in (auth, catalog, library, curators, bonuses, payments):
        app.include_router(module.router)

    @app.get("/health", include_in_schema=False)
    async def health() -> dict:
        return {"status": "ok"}

    return app


app = create_app()
