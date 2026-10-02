from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError

from noti.errors import NotiError, noti_error_handler, validation_error_handler

app = FastAPI(title="Noti", docs_url="/v1/docs", openapi_url="/v1/openapi.json")

app.add_exception_handler(NotiError, noti_error_handler)
app.add_exception_handler(RequestValidationError, validation_error_handler)


@app.get("/v1/health")
def health():
    return {"status": "ok"}
