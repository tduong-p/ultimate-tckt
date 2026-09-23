class BusinessError(Exception):
    """Lỗi nghiệp vụ — trả về 400 cho người dùng, không phải lỗi hệ thống."""

    status_code = 400

    def __init__(self, message: str) -> None:
        super().__init__(message)
        self.message = message


class PermissionDenied(BusinessError):
    status_code = 403


class InvalidTransition(BusinessError):
    status_code = 409


class ReasonRequired(BusinessError):
    status_code = 400
