---
doc_id: DEV-TEST-001
title: Test
<<<<<<< HEAD
version: 2.9
=======
version: 2.12
>>>>>>> origin/staging
status: active
audience: [dev, ai]
owner: DYC
updated: 2026-10-02
related_code: [core/tests/**, services/ctd-api/backend/tests/**, tools/tests/**, core/tests/helpers/db.js]
---

# Test

Tài liệu này giúp dev biết chạy test ở đâu, viết test kiểu gì, và khi nào cần thêm test tay ngoài tự động.

## Core — `node --test`

25 file test tại `core/tests/*.test.js`, cần MySQL local (biến `TEST_DB_HOST/PORT/USER/PASSWORD`, mặc định rơi
về `DB_*` rồi `root@localhost`; user DB cần quyền `CREATE`/`DROP DATABASE` vì test tự tạo/xoá DB tạm). Chạy:

```bash
cd core && npm test
```

Helper dùng chung ở `core/tests/helpers/`: `db.js` (`createTestDatabase` — dựng DB tạm từ `db.sql` + chạy `migrateDatabase` để tạo các bảng Đa đơn vị; nạp `.env` tự động qua `dotenv` để đọc cấu hình DB test),
`server.js` (`startTestServer` — dựng Express app thật, trả về client HTTP giả lập session), `fixtures.js`
(`createTeam`, `createUser`, `createActivity`… tạo dữ liệu mẫu tối thiểu). Mỗi test nên tự dựng dữ liệu qua
fixture, không phụ thuộc dữ liệu test khác hoặc thứ tự chạy.

Các nhóm test đáng chú ý: `policies.roles.test.js` (ma trận quyền theo 5 role), `activities.status-patch-guard.test.js`,
`tasks.review.test.js` (Anti-Self-Review), `weight-presets.test.js`, `frontend.contract.test.js` (hợp đồng giữa
frontend cũ và API), `migrate.test.js` (migration idempotent), `migrate.units.test.js` (gồm ca `org_units.id` là INT có dấu như DB staging), `units.context.test.js` (ngữ cảnh đơn vị và session view),
`units.legacy-gate.test.js` (cổng Điều hành cũ và kiểm toán đọc liên đơn vị), `noti-sender.test.js` (payload gửi Noti đủ trường
`required` của từng template trong `services/noti-api/templates/`, không cần MySQL).

frontend cũ và API), `migrate.test.js` (migration idempotent), `runtime.startup.test.js` (lỗi migration khi
khởi động phải làm Core thoát).

## CTD — `pytest`

19 file test tại `services/ctd-api/backend/tests/test_*.py`, cần Postgres local. Chạy:

```bash
cd services/ctd-api/backend
TEST_DATABASE_URL=postgresql+psycopg://postgres:postgres@localhost:5432/ctd_test .venv/bin/pytest
```

Fixture dùng chung ở `tests/conftest.py`. Nhóm test đáng chú ý: `test_quyen_thao_tac.py` (khớp với danh sách
trắng quyền ở `app/services/permissions.py`), `test_workflow_engine.py`/`test_workflow_matrix.py` (chuyển trạng
thái hồ sơ), `test_scope.py` (phạm vi dữ liệu theo đơn vị), `test_migrations.py`,
`test_admin_seed.py` (seed theo môi trường và lệnh đặt mật khẩu).

## Noti — `pytest`

Test tại `services/noti-api/tests/`, cần Postgres local (DB `noti_test`). Chạy:

```bash
cd services/noti-api
NOTI_TEST_DATABASE_URL=postgresql+psycopg://postgres:postgres@localhost:5432/noti_test .venv/bin/pytest
```

CI: job `test-noti`. Chi tiết: `docs/dev/noti.md`.

## Test hạ tầng và tooling — `tools/tests/`

Script bash (`infra/scripts/*.sh`) được test bằng `node --test` (gồm `deploy.sh … noti`, compose staging có Noti và env Core → Noti) với các lệnh hệ thống (`docker`, `git`, `sudo`,
`nginx`, `curl`…) thay bằng stub ghi log, không đụng máy thật. Helper: `tools/tests/helpers/sandbox.js`
(`makeSandbox`; tuỳ chọn `curlCode` giả lập health check, `dockerOut` giả lập output docker, `sudoFail` làm một lệnh `sudo` thất bại, vd `'nginx -t'`). Luật của docs-check (frontmatter, bump version, tác động code→tài liệu, link hỏng) có test riêng ở
`tools/tests/docs-check.test.js` — sửa `tools/docs-check/` thì thêm test ở đó trước. Chạy toàn bộ tooling + docs-check:

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
| 2.12 | 2026-10-02 | C?p nh?t mock test directives |
| 1.0 | 2026-09-24 | Bản đầu (viết lại từ tài liệu cũ khi gộp monorepo) | DYC |
| 1.1 | 2026-09-24 | Chỉ chỗ test luật docs-check | DYC |
| 1.2 | 2026-09-24 | Tuỳ chọn `sudoFail` của sandbox | DYC |
| 1.3 | 2026-09-27 | Ghi nhận `db.js` helper nạp `.env` tự động qua dotenv | DYC |
| 2.0 | 2026-09-27 | Đồng bộ `main` = `staging`: nội dung theo bản `main` (chưa có code đa đơn vị GĐ1-A). Bản 1.3 trên `staging` mô tả GĐ1-A, lưu ở nhánh `archive/gd1a-staging` — NTMT làm lại ở PR sau | DYC |
| 2.1 | 2026-09-27 | Cập nhật helper `createTestDatabase` chạy migration đa đơn vị | D2 |
| 2.2 | 2026-09-29 | Thêm mô tả các test ngữ cảnh đa đơn vị (units.context) và cổng điều hành (units.legacy-gate) | AI (Task 5) |
| 2.2 | 2026-09-30 | Thêm nhóm test seed admin CTD và lệnh đặt mật khẩu | DYC |
| 2.3 | 2026-09-30 | Thêm test hành vi khởi động khi auto-migration lỗi | DYC |
| 2.4 | 2026-09-30 | Thêm core/tests/pilot.authz.test.js (pilot PR 4) | DYC |
| 2.5 | 2026-09-30 | Thêm core/tests/pilot.vn-date.test.js (pilot PR 6) | DYC |
| 2.6 | 2026-09-30 | Thêm pilot.ui-numbers.test.js (c26 c27 c29) | DYC |
| 2.7 | 2026-09-30 | Thêm test migrate với org_units.id INT có dấu (DB staging) | DYC |
| 2.8 | 2026-10-01 | Xử lý conflict merge staging và cập nhật tài liệu | DYC |
<<<<<<< HEAD

<!-- updated: 2026-10-02 dev3 routes -->
=======
| 2.9 | 2026-10-02 | Thêm mục test Noti | DYC |
| 2.10 | 2026-10-02 | Thêm `noti-sender.test.js` và test compose Core → Noti | DYC |
| 2.11 | 2026-10-02 | Thêm test migrate với org_units.id INT có dấu (trạng thái staging) | DYC |
>>>>>>> origin/staging
