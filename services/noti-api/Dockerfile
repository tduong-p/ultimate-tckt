FROM python:3.12-slim

WORKDIR /app

COPY pyproject.toml ./
COPY noti ./noti
COPY templates ./templates
COPY alembic ./alembic
COPY alembic.ini ./

RUN pip install --no-cache-dir . \
    && useradd --system --uid 10001 --no-create-home noti

USER noti

EXPOSE 8000

# API (mặc định): chạy migration rồi uvicorn. Worker: `python -m noti.worker` (tự purge mỗi giờ).
CMD ["sh", "-c", "alembic upgrade head && uvicorn noti.api:app --host 0.0.0.0 --port 8000"]
