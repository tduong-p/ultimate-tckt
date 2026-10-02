FROM python:3.12-slim

WORKDIR /app

COPY pyproject.toml ./
COPY noti ./noti
COPY templates ./templates
COPY alembic ./alembic
COPY alembic.ini ./

RUN pip install --no-cache-dir .

EXPOSE 8000

CMD ["sh", "-c", "alembic upgrade head && uvicorn noti.api:app --host 0.0.0.0 --port 8000"]
# worker: python -m noti.worker
