from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from app.api import auth, cases, documents
from app.errors import BusinessError
from app.services import notifications

app = FastAPI(title="Hệ thống xét duyệt hồ sơ Đảng")
app.include_router(auth.router)
app.include_router(cases.router)
app.include_router(documents.router)

notifications.register()


@app.exception_handler(BusinessError)
def business_error_handler(request: Request, exc: BusinessError) -> JSONResponse:
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.message})


# Thông báo tiếng Việt cho các loại lỗi validation built-in của Pydantic mà
# Task 15 dùng (GPA, ĐRL, độ dài địa chỉ, email). Người dùng cuối là sinh
# viên nên KHÔNG được để lọt thông báo mặc định tiếng Anh của Pydantic.
_MAU_LOI_VI = {
    "greater_than_equal": "Giá trị phải lớn hơn hoặc bằng {ge}.",
    "less_than_equal": "Giá trị phải nhỏ hơn hoặc bằng {le}.",
    "string_too_short": "Chuỗi phải có ít nhất {min_length} ký tự.",
    "string_too_long": "Chuỗi không được vượt quá {max_length} ký tự.",
    "missing": "Trường này là bắt buộc.",
}


def _dich_loi_pydantic(err: dict) -> str:
    loai = err["type"]
    msg = err["msg"]
    if loai == "value_error":
        # Validator tự viết (SĐT, CCCD, SĐT khẩn cấp...) đã ném ValueError với
        # thông báo tiếng Việt sẵn — Pydantic chỉ thêm tiền tố "Value error, ".
        # Giữ nguyên thông báo đó, chỉ dịch trường hợp còn lại (EmailStr).
        if msg.startswith("Value error, "):
            return msg.removeprefix("Value error, ")
        return "Địa chỉ email không hợp lệ."
    mau = _MAU_LOI_VI.get(loai)
    if mau is not None:
        try:
            return mau.format(**err.get("ctx", {}))
        except (KeyError, IndexError):
            return mau
    if loai.endswith(("_parsing", "_type")):
        # Đường người dùng thật hay đi nhất: gõ chữ vào ô số (GPA, ĐRL...).
        # Xử lý theo hậu tố cho bền hơn liệt kê từng loại
        # (float_parsing, int_parsing, string_type, float_type, int_type...).
        return "Giá trị nhập không đúng kiểu dữ liệu."
    return msg


@app.exception_handler(RequestValidationError)
def validation_error_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    errors = [
        {"loc": list(err["loc"]), "type": err["type"], "msg": _dich_loi_pydantic(err)}
        for err in exc.errors()
    ]
    return JSONResponse(status_code=422, content={"detail": errors})


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


STATIC_DIR = Path(__file__).resolve().parent.parent / "static"
if STATIC_DIR.is_dir():
    # Đặt CUỐI cùng để không nuốt mất các route /api.
    app.mount("/", StaticFiles(directory=STATIC_DIR, html=True), name="static")
