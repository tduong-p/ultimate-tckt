from fastapi import Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse


class NotiError(Exception):
    def __init__(self, status: int, code: str, details: list | None = None, extra: dict | None = None):
        self.status = status
        self.code = code
        self.details = details or []
        self.extra = extra or {}
        super().__init__(code)


async def noti_error_handler(request: Request, exc: NotiError) -> JSONResponse:
    content = {"error": exc.code}
    if exc.details:
        content["details"] = exc.details
    if exc.extra:
        content.update(exc.extra)
    return JSONResponse(status_code=exc.status, content=content)


async def validation_error_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    details = []
    for err in exc.errors():
        loc = ".".join(str(x) for x in err.get("loc", []) if x not in ("body",))
        msg = err.get("msg", "")
        details.append(f"{loc}: {msg}" if loc else msg)
    return JSONResponse(
        status_code=400,
        content={"error": "validation_error", "details": details},
    )
