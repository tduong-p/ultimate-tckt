# ultimate-tckt

Nền tảng đa đơn vị của Đoàn Đại học: quản lý điều hành hoạt động/task (module **Điều hành**, TCKT pilot)
và xét duyệt hồ sơ Đảng (module **Công tác Đảng — CTD**), gộp từ ba repo trước đây (`tckt-activity-hub`,
`ctd`, `infra`) thành một monorepo.

## Thư mục

| Thư mục | Nội dung |
|---|---|
| `core/` | Node 22 / Express 5 / MySQL 8. Core + module Điều hành. Frontend cũ ở `core/public/` (JS thuần). |
| `services/ctd-api/` | FastAPI / SQLAlchemy / Alembic / Postgres 16. Module Công tác Đảng. Frontend React/Vite ở `services/ctd-api/frontend`. |
| `web/` | Frontend chung tương lai (chưa tạo — xem `.kiro/specs/nen-tang-da-don-vi/design.md`). |
| `infra/` | Docker Compose, cấu hình nginx, script vận hành VM. |
| `docs/` | Tài liệu dự án có version, được CI kiểm (`docs:check`). |
| `tools/` | `docs-check` (kiểm tài liệu), `docs-export` (xuất docx/pdf), `tests` (test hạ tầng/tooling). |
| `.kiro/` | Spec đang hiệu lực của Kiro (`specs/nen-tang-da-don-vi/`) + steering. |

## Bắt đầu

Đọc `AGENTS.md` → `docs/onboarding/ngay-1.md`.

## Nhánh và luồng làm việc

`staging` = môi trường staging (push thẳng được, CI bắt buộc xanh) → PR vào `staging` → PR `staging → main`
(`main` = production, chỉ merge qua PR). Hotfix: nhánh từ `main` → PR vào `main` → merge ngược `main → staging`.

## Môi trường

| | staging | production |
|---|---|---|
| Tên miền core | `tckt-hub-staging.duckdns.org` | `tckt-hub.duckdns.org` |
| Tên miền CTD | `ctd-hoso-staging.duckdns.org` | `ctd-hoso.duckdns.org` |
| Cổng core (127.0.0.1) | 3000 | 3001 |
| Cổng ctd-api (127.0.0.1) | 8000 | 8001 |
| Cổng core-db (127.0.0.1) | 3306 | 3307 |
| Compose project | `ultimate-tckt-staging` | `ultimate-tckt-production` |

Chi tiết vận hành: `docs/ops/moi-truong.md`.

## Lệnh test

```bash
cd core && npm test                              # node --test, cần MySQL local (TEST_DB_*)
cd services/ctd-api/backend && .venv/bin/pytest  # cần Postgres local
npm run test:tools                                # test script hạ tầng + docs-check
npm run docs:check                                # kiểm frontmatter + version tài liệu
```
