Luật chung: xem `AGENTS.md` ở gốc repo. Bản đồ tài liệu: `docs/README.md`.
Spec hiệu lực của Kiro: `.kiro/specs/nen-tang-da-don-vi/` (bản sao đọc được có frontmatter ở `docs/specs/`).

- `core/`: Node 22, Express 5, MySQL 8. Test `cd core && npm test` (node --test, cần MySQL local).
- `services/ctd-api/`: FastAPI, Python 3.12, SQLAlchemy 2.0, Alembic, Postgres 16. Test `pytest` (cần Postgres local).
- Hạ tầng: 1 VM Oracle ARM, hai môi trường (`staging`, `production`), mỗi môi trường một Docker Compose
  project `ultimate-tckt-<env>`. Chi tiết: `docs/dev/kien-truc.md`, `docs/ops/moi-truong.md`.
