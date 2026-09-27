---
doc_id: DEV-MOD-001
title: Ranh giới module và quy tắc thay đổi liên module
version: 1.0
status: active
audience: [dev, ai]
owner: DYC
updated: 2026-09-24
related_code: [.github/CODEOWNERS, .github/ISSUE_TEMPLATE/**, core/src/routes/index.js]
---

# Ranh giới module và quy tắc thay đổi liên module

Tài liệu này giúp dev và AI agent biết một việc có được tự làm luôn hay phải đưa ra họp team: việc chỉ nằm
trong **một module** thì làm luôn; việc chạm **module khác** hoặc **hợp đồng dùng chung** thì dừng lại và raise.

## Bảng module

| Module | Thư mục/file thuộc module | Ghi chú |
|---|---|---|
| **Nền (Core platform)** | `core/src/units/**`, `core/src/middleware/**`, `core/src/settings/**`, `core/src/config/**`, `core/src/auth/**`, `core/src/services/audit.js`, `core/src/routes/{units,platform,index,utils}.js`, phần session/đăng nhập/tài khoản trong `core/src/routes/system.js`, `core/src/app.js`, `core/src/runtime.js`, `core/src/server.js`, `core/db.sql` | Toàn bộ module Nền là **hợp đồng dùng chung** — xem mục dưới. |
| **Điều hành** (TCKT) | `core/src/routes/{activities,tasks,teams,documents,reports,users,notifications}.js`, phần bootstrap/my-tasks/weight-presets trong `core/src/routes/system.js`, `core/src/policies/**`, `core/src/services/{task-attachments,deadline-notifications}.js`, `core/public/**` (frontend cũ) | |
| **Email & Cron** | `core/src/services/{email-events,email-condition-evaluator,email-settings,cron-runner}.js`, `core/src/routes/{settings-email,settings-cron}.js`, `core/public/settings.js` | |
| **CTD** (Công tác Đảng) | `services/ctd-api/**` (backend + frontend) | |
| **Web** (frontend chung) | `web/**` (chưa tạo) | |
| **Hạ tầng & CI** | `infra/**`, `.github/**` | Luôn là hợp đồng dùng chung. |
| **Tài liệu & tooling** | `docs/**`, `tools/**`, `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, `.agents/**`, `.claude/**`, `.kiro/**` | Sửa nội dung tài liệu của module mình: làm luôn. Đổi **quy tắc** tài liệu/tooling: raise. |

Test đi theo module của code nó kiểm (`core/tests/units.*` thuộc Nền, `core/tests/activities.*` thuộc Điều hành…).
Riêng `core/tests/helpers/**` là hợp đồng dùng chung.

## Hợp đồng dùng chung (đổi là phải raise)

- Schema DB và migration: `core/db.sql`, `core/src/config/migrate*.js`, `services/ctd-api/backend/alembic/**`.
- Xác thực, session, đơn vị, membership, role, phân quyền nền: `core/src/units/**`, `core/src/middleware/**`,
  `core/src/auth/**`, `core/src/settings/**`, dạng dữ liệu `/api/session`.
- API mà module khác hoặc frontend khác đang gọi: đổi tên field, bỏ field, đổi mã lỗi, đổi ý nghĩa.
  (Thêm field mới, không phá gì: làm luôn.)
- Biến môi trường, `.env.example`, compose, nginx, script VM, workflow CI.
- Dependency dùng chung (`package.json` gốc, `core/package.json`, `requirements`/`pyproject` của CTD) — nâng major hoặc thêm thư viện mới.
- Test helper dùng chung `core/tests/helpers/**`.
- Bất biến `docs/ai/bat-bien.md`, ADR, quy tắc trong `AGENTS.md`.

## Quy tắc

1. **Một module, không đổi hợp đồng** → làm luôn theo quy trình thường (superpowers + TDD + cập nhật tài liệu).
2. **Chạm module khác hoặc hợp đồng dùng chung** → **dừng, không code phần đó**:
   - Mở GitHub issue bằng mẫu **"Đề xuất thay đổi liên module"** (`.github/ISSUE_TEMPLATE/cross-module.md`), nêu:
     module bị ảnh hưởng, hợp đồng nào đổi, vì sao, phương án, rủi ro, cách rollback.
   - Báo người giao việc / trưởng module; đưa vào **họp team**. Chỉ làm sau khi có quyết định ghi trong issue
     (và ADR nếu là quyết định kiến trúc).
   - AI agent: báo lại cho người dùng đúng câu "Việc này ảnh hưởng module X / hợp đồng Y — cần raise họp team"
     kèm bản nháp issue; không tự mở rộng phạm vi để "làm cho xong".
3. Việc được duyệt liên module: PR ghi số issue, reviewer gồm chủ của mọi module bị chạm (xem `.github/CODEOWNERS`).
4. Không chắc việc có liên module không → coi là liên module và hỏi.

## Lịch sử phiên bản

| Version | Ngày | Thay đổi | Người |
|---|---|---|---|
| 1.0 | 2026-09-24 | Bản đầu: bảng module, hợp đồng dùng chung, quy tắc raise họp team | DYC |
