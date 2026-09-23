---
doc_id: DEV-TEST-001
title: Test
version: 1.0
status: active
audience: [dev, ai]
owner: DYC
updated: 2026-09-24
related_code: [core/tests/**, services/ctd-api/backend/tests/**, tools/tests/**]
---

# Test

Tài liệu này giúp dev biết chạy test ở đâu, viết test kiểu gì, và khi nào cần thêm test tay ngoài tự động.

## Core — `node --test`

25 file test tại `core/tests/*.test.js`, cần MySQL local (biến `TEST_DB_HOST/PORT/USER/PASSWORD`, mặc định rơi
về `DB_*` rồi `root@localhost`; user DB cần quyền `CREATE`/`DROP DATABASE` vì test tự tạo/xoá DB tạm). Chạy:

```bash
cd core && npm test
```

Helper dùng chung ở `core/tests/helpers/`: `db.js` (`createTestDatabase` — dựng DB tạm từ `db.sql` + migrate),
`server.js` (`startTestServer` — dựng Express app thật, trả về client HTTP giả lập session), `fixtures.js`
(`createTeam`, `createUser`, `createActivity`… tạo dữ liệu mẫu tối thiểu). Mỗi test nên tự dựng dữ liệu qua
fixture, không phụ thuộc dữ liệu test khác hoặc thứ tự chạy.

Các nhóm test đáng chú ý: `policies.roles.test.js` (ma trận quyền theo 5 role), `activities.status-patch-guard.test.js`,
`tasks.review.test.js` (Anti-Self-Review), `weight-presets.test.js`, `frontend.contract.test.js` (hợp đồng giữa
frontend cũ và API), `migrate.test.js` (migration idempotent).

## CTD — `pytest`

18 file test tại `services/ctd-api/backend/tests/test_*.py`, cần Postgres local. Chạy:

```bash
cd services/ctd-api/backend
TEST_DATABASE_URL=postgresql+psycopg://postgres:postgres@localhost:5432/ctd_test .venv/bin/pytest
```

Fixture dùng chung ở `tests/conftest.py`. Nhóm test đáng chú ý: `test_quyen_thao_tac.py` (khớp với danh sách
trắng quyền ở `app/services/permissions.py`), `test_workflow_engine.py`/`test_workflow_matrix.py` (chuyển trạng
thái hồ sơ), `test_scope.py` (phạm vi dữ liệu theo đơn vị), `test_migrations.py`.

## Test hạ tầng và tooling — `tools/tests/`

Script bash (`infra/scripts/*.sh`) được test bằng `node --test` với các lệnh hệ thống (`docker`, `git`, `sudo`,
`nginx`, `curl`…) thay bằng stub ghi log, không đụng máy thật. Helper: `tools/tests/helpers/sandbox.js`
(`makeSandbox`). Chạy toàn bộ tooling + docs-check:

```bash
npm run test:tools
```

## Khi nào cần test tay

Test tự động không phủ được: giao diện thật trên trình duyệt (responsive mobile, thao tác kéo-thả Kanban), luồng
SSO Microsoft thật, gửi email SMTP thật (dev chỉ test qua `console`/mock), và hành vi trên VM thật (nginx, certbot,
health check qua domain thật). Với các phần này, kiểm tay trên staging trước khi coi một tính năng lớn là xong,
theo tài khoản/role cần test ghi trong `docs/dev/phan-quyen.md` — không ghi mật khẩu tài khoản test vào tài liệu
nào, kể cả mật khẩu mặc định.

## Nguyên tắc chung

- Viết test trước khi sửa code khi có thể (TDD) — đặc biệt với bug: tái hiện bằng một test đỏ trước, xem
  `docs/playbooks/sua-loi.md`.
- Test đỏ thì không merge, không tắt test để né lỗi.
- Thêm bug mới phát hiện lặp lại → cân nhắc thêm dòng vào `docs/ai/bay-da-gap.md`.

## Lịch sử phiên bản

| Version | Ngày | Thay đổi | Người |
|---|---|---|---|
| 1.0 | 2026-09-24 | Bản đầu (viết lại từ tài liệu cũ khi gộp monorepo) | DYC |
