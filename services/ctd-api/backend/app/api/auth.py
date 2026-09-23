from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import create_token, current_user
from app.infra.mailer import get_mailer
from app.infra.otp import issue_code, verify_code
from app.infra.password import verify_password
from app.models.identity import User
from app.schemas.auth import RequestCodeIn, TokenOut, VerifyIn

router = APIRouter(prefix="/api", tags=["auth"])


@router.post("/auth/request-code", status_code=204, response_class=Response)
def request_code(payload: RequestCodeIn, db: Session = Depends(get_db)) -> Response:
    user = db.scalars(select(User).where(User.email == payload.email)).first()
    # Luôn trả 204 dù email không tồn tại — tránh để người ngoài dò danh sách người dùng.
    if user is not None and user.is_active:
        code = issue_code(db, payload.email)
        get_mailer().send(
            to=[payload.email],
            cc=[],
            subject="Mã đăng nhập hệ thống xét duyệt hồ sơ Đảng",
            body=f"Mã đăng nhập của bạn, có hiệu lực 10 phút: {code}",
        )
    return Response(status_code=204)


@router.post("/auth/verify", response_model=TokenOut)
def verify(payload: VerifyIn, db: Session = Depends(get_db)) -> TokenOut:
    user = db.scalars(select(User).where(User.email == payload.email)).first()
    if user is None or not user.is_active:
        raise HTTPException(status_code=401, detail="Tài khoản không tồn tại hoặc đã bị khoá.")

    # Cho phép xác thực bằng MẬT KHẨU (nếu tài khoản có mật khẩu) HOẶC bằng MÃ OTP
    is_valid = False
    if user.password_hash and verify_password(payload.code, user.password_hash):
        is_valid = True
    elif verify_code(db, payload.email, payload.code):
        is_valid = True

    if not is_valid:
        raise HTTPException(status_code=401, detail="Mật khẩu hoặc mã đăng nhập không đúng.")
    return TokenOut(access_token=create_token(user), role=user.role.value, full_name=user.full_name)


@router.get("/me", response_model=TokenOut)
def me(user: User = Depends(current_user)) -> TokenOut:
    return TokenOut(access_token="", role=user.role.value, full_name=user.full_name)
