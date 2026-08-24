from fastapi import Request
from fastapi.responses import JSONResponse


class AppError(Exception):
    """Ошибка бизнес-логики. Код совпадает с тем, что разбирает клиент."""

    def __init__(self, message: str, *, code: str, status_code: int = 400) -> None:
        super().__init__(message)
        self.message = message
        self.code = code
        self.status_code = status_code


class PaymentRequired(AppError):
    def __init__(self, message: str = "Урок доступен после оплаты доступа") -> None:
        super().__init__(message, code="payment_required", status_code=403)


class NotFound(AppError):
    def __init__(self, message: str = "Не найдено") -> None:
        super().__init__(message, code="not_found", status_code=404)


class InsufficientFunds(AppError):
    def __init__(self, message: str = "Недостаточно моггсов") -> None:
        super().__init__(message, code="insufficient_funds", status_code=400)


class Unauthorized(AppError):
    def __init__(self, message: str = "Не удалось подтвердить Telegram-подпись") -> None:
        super().__init__(message, code="unauthorized", status_code=401)


async def app_error_handler(_: Request, exc: AppError) -> JSONResponse:
    return JSONResponse(status_code=exc.status_code, content={"message": exc.message, "code": exc.code})
