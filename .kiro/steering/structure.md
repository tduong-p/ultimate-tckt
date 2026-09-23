Luật chung: xem `AGENTS.md` ở gốc repo. Bản đồ tài liệu: `docs/README.md`.
Spec hiệu lực của Kiro: `.kiro/specs/nen-tang-da-don-vi/` (bản sao đọc được có frontmatter ở `docs/specs/`).

- `core/` — Node/Express/MySQL (module Điều hành). `services/ctd-api/` — FastAPI/Postgres (module CTD).
  `infra/` — compose, nginx, script VM. `docs/` — tài liệu có version, kiểm bởi `tools/docs-check/`.
- Kiến trúc và quy ước code hiện tại: `docs/dev/kien-truc.md`, `docs/dev/quy-uoc-code.md`.
