---
doc_id: SPEC-PILOT-001
title: Design — MVP Điều hành dùng thử nội bộ TCKT (pilot)
version: 1.0
status: draft
audience: [dev, ai, ops]
owner: DYC
updated: 2026-09-29
related_code: [core/src/**, core/public/**, services/ctd-api/backend/app/seeds/**, infra/**, tools/test-fixtures/**]
---

# Design — MVP Điều hành dùng thử nội bộ TCKT (pilot)

Tài liệu này chốt phạm vi và thiết kế để đưa module Điều hành (Core) vào dùng thật cho một nhóm nhỏ TCKT
trên production, vừa dùng vừa test và debug, trong khi GĐ1 đa đơn vị vẫn tiếp tục phát triển.

## 1. Bối cảnh và mục tiêu

- Core đã có đủ luồng Điều hành một đơn vị (đề xuất/duyệt hoạt động, giao việc, tự log, checklist, nộp duyệt,
  thông báo, xuất Excel, lưu trữ). GĐ1 đa đơn vị mới có schema + backfill (PR #28) và middleware (PR #29),
  chưa route nào dùng.
- Production có dữ liệu cũ nhưng chưa ai dùng hằng ngày → coi đây là **đợt dùng thử mới**.
- Kế hoạch GĐ1 (`docs/planning/*`, `nen-tang-da-don-vi-*`) chỉ định nghĩa "xong" là đủ 24 task + UAT, không có
  MVP/pilot. Spec này bổ sung mốc trung gian đó, **không thay** kế hoạch GĐ1.

**Mục tiêu:** 20–40 người TCKT dùng Điều hành hằng ngày trên `tckt-hub.duckdns.org`; mỗi lỗi truy được về
commit, người dùng và request.

**Tiêu chí xong MVP:**
1. Phần (a), (b), (c) mục "Phải có" đã lên production qua luồng `staging → main`.
2. Toàn bộ người dùng thử đăng nhập được bằng mật khẩu, nhận thông báo trong app cho mọi sự kiện luồng chính.
3. Có backup tự động hằng ngày và đã thử restore một lần.
4. Checklist smoke (mục 7.3) xanh sau lần phát hành đầu.

## 2. Phạm vi

| Trong phạm vi | Ngoài phạm vi (làm sau) |
|---|---|
| Luồng Điều hành hiện có của TCKT, gia cố + sửa lỗi | Email thật (tạm bỏ — xem mục 8) |
| Lớp debug: log, request id, version, báo lỗi, audit | Microsoft SSO (cần đăng ký app Azure) |
| Chặn lỗ hổng bảo mật, backup, chuẩn bị dữ liệu | Đa đơn vị có UI, BTV, directive/submission/ops_log |
| Quy trình phát hành và vận hành pilot | Registry, gateway, bridge CTD, `web/`, KPI/Gantt |

Đăng nhập trong pilot: **chỉ mật khẩu** do admin cấp. Không có "quên mật khẩu"; admin đặt lại tay.

## 3. Luồng nhánh và phát hành

Production chạy từ `main`, phát hành **theo đợt** (quyết định 2026-09-29). Lịch cụ thể (ngày chốt, tần suất) chốt
sau trong họp team; spec chỉ cố định các bước của một đợt:

| Bước | Việc |
|---|---|
| Trong đợt | Merge PR tính năng vào `staging` như thường; staging tự deploy để kiểm. |
| **Chốt đợt** | Ngừng merge việc mới vào `staging` (chỉ nhận sửa lỗi của chính đợt này). Việc GĐ1 dở dang đang có trên `staging` phải được tắt (chưa nối route/UI hoặc sau cờ tắt) hoặc revert trước khi chốt. |
| Kiểm đợt | Chạy checklist smoke (mục 7.3) trên **staging**. Mở PR `staging → main`, mô tả có mục "Người dùng thử cần biết" (1–3 dòng, tiếng Việt thường) và ghi rõ nếu có migration. |
| Phát hành | Backup production (tự động khi a3 xong; trước đó chạy tay `backup.sh`) → merge PR → smoke trên production → mở lại `staging`. |

- Giữa hai lần chốt, `staging` được phép tạm hỏng; người làm hỏng phải sửa hoặc revert trước khi chốt đợt.
- Lỗi gấp không đợi đợt: `docs/playbooks/hotfix-production.md` (nhánh từ `main`, merge ngược về `staging`).
- Đợt đầu tiên mang migration đa đơn vị (PR #28) lên production — xem mục 11.

## 4. Phần (a) — Bảo mật và dữ liệu

| # | Việc | Module | Loại |
|---|---|---|---|
| a1 | Gỡ `tools/test-fixtures/sql/mysql/backup_current.sql` khỏi cây, thêm rule `.gitignore` cho `tools/test-fixtures/sql/**/*.sql`, sửa `tools/test-fixtures/README.md`, `docs/ai/kiem-tra.md`. **Không** viết lại lịch sử git (quyết định 2026-09-29) — 65 hash bcrypt vẫn còn trong lịch sử, xử lý ở a4. | Tài liệu & tooling | Làm luôn |
| a2 | `seed_admin` CTD: admin đã có → giữ nguyên mật khẩu (chỉ đảm bảo role + `is_active`); tạo mới → mật khẩu mặc định **chỉ** khi `APP_ENV=dev`, môi trường thật để `password_hash=NULL`. Thêm lệnh `python -m app.seeds.set_password <email>` nhập mật khẩu qua `getpass`. Không thêm biến env. | CTD | Làm luôn |
| a3 | Backup tự động hằng ngày (cron/systemd timer trên VM) cho MySQL, Postgres **và** volume `core_uploads`; chép ra ngoài VM; giữ 14 bản. Thử restore một lần. | Hạ tầng & CI | **Liên module** |
| a4 | Checklist chuẩn bị dữ liệu (chạy một lần, sau backup): khoá hoặc đặt lại mật khẩu mọi tài khoản cũ trên production, dọn dữ liệu thử, tạo tài khoản người dùng thử + gán team, kiểm danh sách admin. | Vận hành | Làm luôn (anh/chị chạy) |
| a5 | Mọi chỗ ghi user/role (tạo user, bulk import, sửa user, đổi role qua team, `create-core-admin.sh`) gọi `syncTcktMembershipFromRole` để `unit_memberships` không trôi. | Core (Nền) | **Liên module** — cần người làm GĐ1-A xác nhận |

## 5. Phần (b) — Lớp debug và phản hồi

| # | Việc | Module | Loại |
|---|---|---|---|
| b1 | `logger.js` ghi **JSON một dòng ra stdout** (`ts`, `level`, `msg`, `reqId`, `userId`, chi tiết đã redact) thay cho `core/log.md` trong container. Gỡ `console.*` rải rác ở route sang `logger`. | Core | Làm luôn |
| b1' | Xoay vòng log Docker (`logging: json-file`, `max-size`, `max-file`) trong compose staging + production. | Hạ tầng | **Liên module** |
| b2 | Middleware request id: đọc `X-Request-Id` từ nginx hoặc sinh mới, gắn `res.set('X-Request-Id')`, đưa vào mọi log. Lỗi 500 trả `{error, request_id}`; UI hiện "Mã lỗi: …" trong toast. | Core | Làm luôn |
| b3 | `/api/version` trả SHA thật: Dockerfile `ARG BUILD_SHA` → `ENV`, CI truyền `build-args`. UI hiện version ở chân trang/menu tài khoản. | Core + CI | **Liên module** (phần CI) |
| b4 | Nút "Báo lỗi" trong menu tài khoản: mở hộp thoại gồm mô tả + **khối thông tin tự điền** (version, URL hash, user id, request id gần nhất, thời điểm, user agent) có nút "Sao chép". Kênh nhận: link cấu hình trong frontend tới kênh nhóm pilot (Google Form/nhóm chat do anh/chị chọn). Không thêm bảng, không thêm env. | Core (frontend) | Làm luôn |
| b5 | `services/audit.js` `record(db, {actor, action, targetType, targetId, meta})` ghi vào `audit_logs` (bảng đã có từ PR #28). Gọi ở: duyệt/từ chối/xoá hoạt động, huỷ/duyệt task, tạo/sửa/khoá user, đổi role, thêm/bớt thành viên team, đổi mật khẩu người khác. Chữ ký lấy theo bản `origin/archive/gd1a-staging` để GĐ1 task 4 dùng lại. | Core (Nền) | **Liên module** — thực chất là GĐ1 task 4, cần chốt chữ ký |
| b6 | `/api/health` CTD có `SELECT 1`; compose thêm `healthcheck:` cho DB và app. | CTD + Hạ tầng | Phần compose **liên module** |

## 6. Phần (c) — Lỗ hổng chức năng Điều hành

Nguồn: rà soát code staging 2026-09-29 (email tắt, push tắt, chỉ đăng nhập mật khẩu).

### Phải có trước khi mở pilot

| # | Vấn đề | Sửa tối thiểu | Loại |
|---|---|---|---|
| c1 | Đề xuất, quyết định duyệt, nộp duyệt task, kết quả duyệt, thêm người tham gia **không tạo thông báo trong app** — chỉ gửi email/push (đang tắt) nên người nhận không biết gì (`mailer.js` `notify*`; `activities.js:40,53,90,205`; `tasks.js:106,140`). Đề xuất chỉ báo `role='admin'`, bỏ sót `vice_admin`. | Thêm helper `notifyInApp(db, …)` (INSERT `notifications` như `activities.js:177`, `source_key` chống trùng) và gọi cạnh mọi `mailer.notify*`. Gửi đề xuất cho cả `admin` + `vice_admin`. | Core |
| c2 | nginx không đặt `client_max_body_size` → upload > 1 MB bị 413, trong khi app cho 50 MB. | `client_max_body_size 50m;` ở `infra/nginx/*/core.conf`. | **Liên module** (hạ tầng) |
| c3 | Event lead là `member` thấy nút "Thêm task" nhưng API trả 403 (`activities.js:138` dùng `manager`). | Dùng `managerOrEventLead`, cho phép team thuộc `activity_teams` khi là event lead. | Core |
| c4 | Múi giờ: không đặt TZ; `deadline` là DATE nhưng scheduler so `deadline < now` → task hạn hôm nay bị báo trễ từ 07:00; "hôm nay" đổi lúc 07:00. | So theo chuỗi ngày Việt Nam (`dateInVietnam`), `deadline < ?date`. Không đặt `TZ` container (tránh lệch ngày ở `app.js:1367`). | Core |
| c5 | Admin sửa tài khoản bất kỳ → cờ trưởng/phó team của người đó bị ghi lại sai (`users.js:81`). | Giữ cờ hiện có cho team vẫn được chọn. | Core |
| c6 | `return` sớm sau `beginTransaction` ở `users.js:81` → trả connection còn transaction mở về pool. | Kiểm tra trước khi mở transaction / rollback trước khi return. | Core |
| c7 | Bulk import tạo user `auth_provider='microsoft'`, mật khẩu ngẫu nhiên, không team → không đăng nhập được khi không có SSO. | Nhận cột `password`, `team`; tạo `local`. | Core |
| c8 | Nút "Đăng nhập Microsoft" là nút chính nhưng production trả 503 text. | `/api/session` trả `sso_enabled`; ẩn nút khi tắt. | Core — đổi dạng `/api/session` là **hợp đồng dùng chung**, cần xác nhận (chỉ thêm field) |
| c9 | Khoá tài khoản: `DELETE /api/users/:id` xoá cứng khi không vướng khoá ngoại (mất khỏi task do cascade); user đã khoá không liệt kê/mở lại được. | Luôn khoá mềm (`is_active=0`); thêm lọc "Đã khoá" + nút mở lại. | Core |
| c10 | Upload tệp vào task chỉ kiểm `visibleActivity` → ai thấy hoạt động cũng đính kèm được (`tasks.js:22`). | Yêu cầu `canTouchTask`. | Core |
| c11 | Tự log tạo task trước khi kiểm tra phần mở rộng tệp → 415 để lại task mồ côi (`activities.js:255` vs `285`). | Kiểm tra tệp trước. | Core |

### Nên có trong 2 tuần đầu pilot

| # | Vấn đề | Loại |
|---|---|---|
| c12 | Khoá/hạ quyền không có hiệu lực với phiên đang mở (tối đa 12 giờ). Đọc lại `role`, `is_active` trong `auth`. | **Liên module** (auth/session) |
| c13 | Từ chối đề xuất xoá cứng hoạt động (`activities.js:195`) — người đề xuất không biết lý do. Chuyển sang trạng thái mềm + giữ `activity_proposals`. | Có thể **liên module** nếu thêm giá trị enum |
| c14 | Không có UI sửa hạn/ưu tiên/tiêu đề/người nhận task, xoá mục checklist; `PATCH /api/tasks/:id` 500 khi hạn rỗng. | Core |
| c15 | Hết phiên chỉ hiện toast, không đưa về màn đăng nhập. | Core |
| c16 | Thông báo phản hồi task hiện nhãn "Email: failed / Push: failed" khi hai kênh đang tắt. Ghi `disabled` thay vì `failed`. | Core |

### Để sau pilot

Giới hạn tần suất đăng nhập; đổi email/mật khẩu không hỏi mật khẩu cũ; dropdown trạng thái thiếu
`changes_requested`; tạo task trên hoạt động `proposed`; xoá team bị chặn bởi task đã huỷ; modal onboarding sinh
viên không đóng được; thành viên chỉ thấy chính mình ở trang Người.

### Test phải thêm (TDD, cùng PR với bản sửa)

Đăng nhập (kể cả `is_active=0`), thông báo trong app cho từng sự kiện c1, event lead tạo task, giữ cờ team khi sửa
user, quyền upload tệp, khoá mềm + mở lại, bulk import `local`, múi giờ của scheduler và `my-tasks-today`.

## 7. Phần (d) — Vận hành pilot

### 7.1 Người và nhịp
- Nhóm pilot: danh sách do anh/chị chốt (tên, email, team, role) — nhập bằng bulk import (c7).
- Kênh báo lỗi (b4) và một người trực phân loại mỗi ngày: tạo GitHub issue nhãn `pilot-bug` + mức `P1` (chặn
  công việc, hotfix trong ngày) / `P2` (có cách né, vào bản phát hành kế) / `P3` (góp ý).
- Họp nhanh trước mỗi lần chốt đợt: đọc issue `pilot-bug`, quyết định việc nào vào đợt này, việc nào sang đợt sau.

### 7.2 Staging dùng để làm gì
- Tài khoản test cho từng role (admin, vice_admin, leader, vice_leader, member, event lead) do script seed tạo,
  mật khẩu chỉ nằm trong `.env` của VM/trình quản lý mật khẩu nhóm — không ghi vào repo.
- Không chép dữ liệu production sang staging.

### 7.3 Checklist smoke sau mỗi lần deploy production
1. `/api/health` và `/api/version` (đúng SHA).
2. Đăng nhập bằng một tài khoản member và một tài khoản admin.
3. Tạo đề xuất → admin thấy thông báo → duyệt → người đề xuất thấy thông báo.
4. Giao task → nhận → nộp duyệt kèm ảnh > 1 MB → duyệt.
5. Xuất Excel báo cáo.
6. `docker compose logs core --since 10m` không có `level":"error"` mới.

Checklist này ghi vào `docs/ops/` (tài liệu vận hành pilot) để dùng lại, không để trong spec.

## 8. Email — quyết định tạm

ADR-0004 (Rule Engine) đang `active` nhưng code Rule Engine đã rời staging từ `e91c5b3`. Pilot chạy **không email**
và dựa hoàn toàn vào thông báo trong app (c1). Sau pilot: bật mailer hiện có kèm nhật ký gửi, rồi quay lại Rule
Engine khi làm GĐ1 task 13/24. Việc này cần một ADR mới (`supersedes` hoặc bổ sung ADR-0004) — ghi vào issue liên
module, không viết trong đợt này.

## 9. Điều dev cần lưu ý khi làm tiếp (luật trong thời gian pilot)

1. **Tôn trọng mốc chốt đợt (mục 3).** Đến lúc chốt, mọi thứ trên `staging` sẽ lên production.
   Việc GĐ1 dở dang nên merge ở dạng chưa nối vào route/UI hoặc sau cờ tắt mặc định; nếu không kịp thì revert trước
   giờ chốt. Không merge việc mới từ giờ chốt đến khi phát hành xong.
2. **Chưa chuyển guard sang `req.actor` / chưa chặn 403 khi không có membership** cho đến khi a5 xong và có test.
3. **Migration chỉ bổ sung, idempotent, có marker** như `multi_unit_backfill_v1`; không xoá/đổi tên cột đang dùng;
   ghi rõ trong PR khi có migration để người phát hành backup trước.
4. **Thông báo phải có bản trong app.** Không dựa vào `mailer.notify*` hay push — hai kênh đang tắt.
5. **Ngày giờ theo Việt Nam** qua helper chung (c4); không dùng `CURDATE()`/`NOW()` để so với cột DATE.
6. **Log qua `logger`** (JSON stdout, có `reqId`), không `console.*`. Không log mật khẩu/token.
7. **Thao tác quan trọng ghi `audit_logs`** qua `services/audit.js` (b5).
8. **Không commit dữ liệu thật** (dump, CSV người dùng, ảnh chụp có thông tin cá nhân). Repo là public.
9. Nhánh `feat/dev1-migration-schema` xung đột với PR #28/#29: làm lại trên `staging`, chỉ giữ
   `migrateDevopsToMembership`. Code tái dùng được (units routes, audit, setting-guard, Rule Engine) nằm ở
   `origin/archive/gd1a-staging`.

## 10. Việc liên module cần họp

Gom vào **một** issue theo `.github/ISSUE_TEMPLATE/cross-module.md`: a3, a5, b1', b3 (CI), b5, b6 (compose), c2,
c8 (field mới trong `/api/session`), c12, c13 (nếu thêm enum), việc ghi ADR tạm hoãn email, và lịch phát hành theo đợt (mục 3). Các mục "Làm luôn"
không chờ issue này.

## 11. Rủi ro

| Rủi ro | Giảm thiểu |
|---|---|
| Lần `staging → main` đầu mang migration đa đơn vị lên production | Backup tay trước; kiểm marker `multi_unit_backfill_v1` và số dòng `unit_memberships` sau deploy |
| Hash mật khẩu cũ còn trong lịch sử git public | a4: khoá/đặt lại mọi tài khoản cũ trước khi mở pilot |
| GĐ1 đổi quyền làm vỡ pilot | Luật 9.1–9.2; smoke trên staging trước giờ phát hành; test quyền hiện có chạy trong CI |
| Việc dở dang còn trên `staging` lúc chốt đợt | Revert trước khi chốt; nếu phát hiện muộn thì lùi sang đợt sau, không phát hành bản chưa smoke |
| Không có email → người dùng bỏ sót việc | c1 + chuông thông báo; nhắc người dùng thử mở app mỗi ngày |

## Lịch sử phiên bản

| Version | Ngày | Thay đổi | Người |
|---|---|---|---|
| 1.0 | 2026-09-29 | Bản đầu: phạm vi pilot Điều hành, phần a–d, luật dev trong thời gian pilot; phát hành theo đợt (lịch cụ thể chốt sau) | DYC |
