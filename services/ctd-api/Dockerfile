FROM node:20-slim AS frontend-build
WORKDIR /repo
COPY frontend/package.json frontend/package-lock.json ./frontend/
RUN npm ci --prefix frontend
COPY frontend/ ./frontend/
RUN npm run build --prefix frontend
# vite.config.ts sets build.outDir to "../backend/static" (relative to frontend/),
# so the build lands at /repo/backend/static in this stage.

FROM python:3.12-slim AS final
WORKDIR /app
COPY backend/pyproject.toml ./
COPY backend/app ./app
COPY backend/alembic ./alembic
COPY backend/alembic.ini ./
RUN pip install --no-cache-dir .
COPY --from=frontend-build /repo/backend/static ./static
EXPOSE 8000
CMD ["sh", "-c", "alembic upgrade head && python -m app.seeds && uvicorn app.main:app --host 0.0.0.0 --port 8000"]
