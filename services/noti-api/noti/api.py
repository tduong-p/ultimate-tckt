from fastapi import Depends, FastAPI
from fastapi.exceptions import RequestValidationError

from noti.auth import current_client
from noti.errors import NotiError, noti_error_handler, validation_error_handler
from noti.models import ApiClient

app = FastAPI(title="Noti", docs_url="/v1/docs", openapi_url="/v1/openapi.json")

app.add_exception_handler(NotiError, noti_error_handler)
app.add_exception_handler(RequestValidationError, validation_error_handler)


@app.get("/v1/health")
def health():
    return {"status": "ok"}


@app.get("/v1/templates")
def list_templates(client: ApiClient = Depends(current_client)):
    return {"templates": []}
