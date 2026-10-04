---
doc_id: SPEC-REL-001
title: Design — phát hành đợt 1 (staging → main) và các bản sửa sau rà soát
version: 1.3
status: active
audience: [dev, ops, ai]
owner: DYC
updated: 2026-10-05
related_code: []
---

# Design — phát hành đợt 1 (staging → main) và các bản sửa sau rà soát

Tài liệu này ghi kết quả rà soát `origin/staging` (`e781aab`) ngày 2026-10-03, trước PR `staging → main` đầu tiên
theo SPEC-PILOT-001 §3. Nó nêu **cổng phát hành** (điều kiện tối thiểu để merge) và gom mọi phát hiện vào ba plan
sửa (PLAN-REL-001, PLAN-REL-002, PLAN-REL-003).

Quy trình họp team cho đợt này được thay thế bằng **quyết định bằng văn bản** ngày 2026-10-03, đã được ghi trực tiếp
vào mục "Quyết định" của các issue #48, #49, và #50.

## 1. Bối cảnh

- Merge vào `main` là production tự deploy (`DEPLOY_ENABLED` và `PROD_DEPLOY_ENABLED` đều `true`, không có người
  duyệt environment). Ruleset `protect-main` đòi check `changes`, `test-core`, `test-ctd`, `docs` và một PR.
- `main` là tổ tiên của `staging` (177 commit phía trước, 0 commit phía sau). Đợt này mang migration đa đơn vị
  (PR #28) lên production lần đầu.
- Đã kiểm chứng, **không** phải sửa:
  - migration đa đơn vị an toàn và chạy lại được với dữ liệu production;
  - production thiếu Noti thì `notifier` chỉ ghi log, không lỗi (từ 2026-10-05 compose production có Noti, mặc định chưa nối vì `CORE_NOTI_API_KEY` trống; xem SPEC-MAIL-001);
  - chứng chỉ TLS có SAN cho cả bốn tên miền; `/api/health` production trả 200;
  - `npm run test:tools` 55/55; CI trên `staging` xanh.

## 2. Các vấn đề an ninh ưu tiên (#54 & #55)

Hai vấn đề an ninh khẩn đã được tách thành issue riêng và phải được giải quyết song song hoặc trước khi phát hành production:

1. **Issue #54 (CTD Admin Seed & Mật khẩu mặc định)**:
   - Tài khoản quản trị cao nhất của CTD production (`tckt.dtn@hust.edu.vn`) có nguy cơ bị gán mật khẩu mặc định công khai mỗi khi container khởi động lại, đồng thời seed ép `is_active = True` đảo ngược việc khóa tài khoản.
   - Giải pháp: Thực hiện hotfix CTD (`services/ctd-api/backend/app/seeds/admin_seed.py` và `set_password.py`), viết test ngăn chặn và mở PR hotfix theo `docs/playbooks/hotfix-production.md`.
   - Ngay sau deploy hotfix, thực hiện chạy lệnh đổi mật khẩu an toàn (`python -m app.seeds.set_password`) trước khi coi production là sẵn sàng hoạt động.
   - Nghiệm thu (O2) bằng bằng chứng vận hành, không bằng việc merge PR: đăng nhập bằng mật khẩu mới được, mật khẩu mặc định bị từ chối, và vẫn đúng sau khi khởi động lại container (OPS-DEPLOY-001 §7.2 bước 4c). PR hotfix dùng `Refs #54`, không `Closes #54`.
   - Rollback `ctd-api` về image trước #54 không có `set_password` và đặt lại mật khẩu mặc định ở mỗi lần khởi động: xem OPS-DEPLOY-001 §7.6.

2. **Issue #55 (Dump DB Production trên main & Lịch sử git)**:
   - Nhánh `main` chứa file dump MySQL cũ `tools/test-fixtures/sql/mysql/backup_current.sql` gồm 65 email và bcrypt hash.
   - Giải pháp: Gỡ bỏ file dump khỏi cây thư mục `main` qua luồng PR phát hành đợt 1.
   - Chuẩn bị phương án khóa/đặt lại mật khẩu cho các tài khoản bị ảnh hưởng, và xoay `CORE_SESSION_SECRET` trên VM production để hủy toàn bộ phiên làm việc cũ.
   - Nghiệm thu (O1) bằng bằng chứng vận hành (OPS-DEPLOY-001 §7.2 bước 4b): Core khởi động lại sau khi xoay secret, session cũ mất hiệu lực, và không tài khoản đang hoạt động nào còn hash trong dump (đếm bằng truy vấn, kết quả `0`). PR gỡ dump dùng `Refs #55`, không `Closes #55`; chỉ đóng issue khi có comment bằng chứng.
   - Ghi nhận rõ: Dữ liệu dump vẫn tồn tại trong lịch sử commit public của git; theo quyết định kiến trúc, **không rewrite lịch sử git** và **không tự ý thay đổi visibility** của repository để tránh gián đoạn các thiết lập CI/CD và rulesets.

## 3. Cổng phát hành đợt 1

Chỉ mở PR `staging → main` khi **mọi** điều kiện dưới đây đã được nghiệm thu:

| # | Điều kiện | Loại | Ở đâu & Tiêu chí nghiệm thu |
|---|---|---|---|
| G1 | R1 đã sửa và merge vào `staging` | Code | PLAN-REL-001 Task 1: Bộ test tự động kiểm tra đầy đủ cả 4 route team (`/teams`, `/teams/:id`, `/teams/:id/members`, `/teams/:id/members/:userId`), xác nhận đồng bộ hai chiều `users.role` và `unit_memberships`. |
| G2 | `npm run docs:check -- --base origin/main` xanh | Tài liệu | PLAN-REL-003 Task 1: Cập nhật PB-DEP-001 phản ánh việc gỡ `nodemailer` khỏi `core/package.json`. |
| G3 | Production **giữ `CORE_DEVOPS_EMAILS` rỗng** và **không tạo membership ngoài TCKT** | Vận hành | Giảm thiểu rủi ro vận hành tạm thời trong lúc các task nhóm B/C chưa lên production. Lưu ý: G3 chỉ là chốt chặn vận hành, không được xem là bằng chứng các lỗi phân quyền đã được sửa trong code. |
| G4 | Runbook phát hành hoàn thiện | Vận hành | PLAN-REL-003 Task 3 (`docs/ops/deploy-va-nhanh.md` §7): Các lệnh và điều kiện dừng đã được đối chiếu chính xác với script thực tế (`deploy.sh`, `lib.sh`, `backup.sh`). Lệnh restore có `DROP DATABASE` chỉ là phương án khắc phục sự cố khẩn cấp cuối cùng, cấm chạy như bước kiểm thử. |
| G5 | Checklist smoke chạy xanh trên `staging` | Vận hành | PLAN-REL-003 Task 3: Chạy smoke test trên môi trường staging theo đúng quy trình. |
| G6 | PR `staging → main` merge bằng **merge commit** | Vận hành | Sử dụng merge commit (không squash, không rebase). Sau khi merge `staging → main`, bắt buộc mở PR đồng bộ ngược `main → staging` để bảo đảm đồng nhất cây lịch sử. |

## 4. Phát hiện và Phân loại

Mức: **Chặn** = bắt buộc trước đợt 1. **Pilot** = bắt buộc trước khi mở pilot cho người dùng thật hoặc gỡ G3. **Sau** = backlog sau pilot.

### 4.1 Core — Phân quyền và Dữ liệu (PLAN-REL-001)

| ID | Phát hiện | Chỗ code | Mức | Quyết định đã chốt (#48) |
|---|---|---|---|---|
| R1 | Bốn route đổi `users.role` mà không đồng bộ membership TCKT. | `core/src/routes/teams.js:13-16` | **Chặn (G1)** | Đồng bộ hai chiều `users.role` ↔ `unit_memberships` (TCKT), gồm cả cờ leader/vice-leader trên cả 4 route. |
| R2 | Admin TCKT quản lý/sửa tài khoản DYC/BTV qua `PATCH`/`DELETE /api/users/:id`; `/api/people` liệt kê mọi user. | `core/src/policies/access.js:10`, `core/src/routes/users.js` | Pilot | Admin TCKT chỉ quản lý tài khoản TCKT, không có quyền platform owner. Tài khoản DYC chỉ sửa qua `routes/units.js`. |
| R3 | Sửa user gọi `syncTcktMembershipFromRole` tự tạo lại membership TCKT đã gỡ. | `core/src/units/memberships.js:102`, `core/src/routes/users.js` | Pilot | Sửa hồ sơ không tự ý tái tạo membership TCKT đã chủ động gỡ. |
| R4 | `PATCH /api/account` cho phép tự đổi email định danh. | `core/src/routes/system.js:40,44` | Pilot | Cấm tự đổi email: server trả 403 Forbidden, frontend hiển thị email ở chế độ chỉ đọc. |
| R5 | Directives/submissions dở dang nhưng đã nối route. | `core/src/routes/{directives,submissions}.js`, `index.js` | Pilot | Ngắt mount router directives/submissions (trả 404 cho client) theo SPEC-PILOT-001 §9.1. Giữ file source và test unit. |
| R6 | Khóa/hạ quyền không có hiệu lực phiên; login không regenerate session; phân quyền đọc `req.session.user`. | `core/src/middleware/{auth,unit-context}.js`, `routes/system.js` | Pilot | Quyền đọc qua `req.actor` và membership (INV-AUTH-001); khóa/hạ quyền có hiệu lực ngay request kế tiếp; regenerate session khi login. |
| R7 | Điều hành rò rỉ đa đơn vị; `/api/documents`, `/api/bootstrap` không lọc đơn vị. | `core/src/policies/access.js`, `routes/documents.js`, `catalog.js` | Pilot | Pilot Điều hành chỉ dành riêng cho TCKT. Đóng module Điều hành ở đơn vị khác. DYC chỉ đọc; `/api/session` báo đúng quyền ghi thực tế. |
| R8 | `GET /api/units/:id/members` trả email cho cả member thường. | `core/src/routes/units.js:78-103` | Pilot | Ẩn email đối với member thường, chỉ trả trường email cho vai trò quản trị được phép. |
| R9 | `dyc_engineer` có thể tự cấp admin TCKT. | `core/src/routes/units.js:14-31` | Pilot | Chỉ `dyc_admin` mới được quản trị membership đơn vị khác; `dyc_engineer` không được tự cấp/nâng quyền. |
| R10 | Thao tác nhạy cảm Điều hành chưa ghi audit log. | `core/src/routes/{users,teams}.js` | Pilot | Ghi audit log cho thao tác ghi nhạy cảm (tạo/sửa/khóa user, đổi role) và đọc chéo đơn vị. Tránh log thừa cho polling; không log secret. |
| R11 | Dọn lỗi mã hóa, seed `weight_presets`, BOM file. | `core/src/units/catalog.js`, `config/migrate.js` | Sau | Dọn sạch mã hóa và BOM, giữ nguyên hành vi hệ thống. |
| R12 | Scheduler nhắc hạn gửi thông báo lặp lại vô hạn mỗi 15 phút. | `core/src/services/deadline-notifications.js` | Sau (#49) | Idempotent scheduler dựa trên `sourceKey` ổn định; chuẩn hóa múi giờ VN; loại trừ trạng thái `review`/`done`/`cancelled`; retry có giới hạn. |

### 4.2 Hạ tầng và CI (PLAN-REL-002)

| ID | Phát hiện | Chỗ code | Mức | Quyết định đã chốt (#50) |
|---|---|---|---|---|
| R13 | nginx chặn upload > 1 MB. | `infra/nginx/*/core.conf`, `ctd.conf` | Pilot | Đặt `client_max_body_size 55m` cho Core và `8m` cho CTD trên cả staging và production. |
| R14 | Job `infra` deploy production không phụ thuộc test. | `.github/workflows/deploy.yml` | Pilot | Thêm cổng phụ thuộc vào `test-tools` (và các test liên quan); chặn deploy nếu test đỏ. |
| R15 | Script tạo user lộ mật khẩu qua `-p` trên host; thiếu membership TCKT. | `infra/scripts/create-core-admin.sh`, `create-core-readonly-user.sh` | Pilot | Chạy `mysql` trong container qua biến môi trường container (bất biến #10); tạo kèm membership TCKT. |
| R16 | `ghcr-cleanup` chỉ giữ theo số lượng bản mới, nguy cơ xóa tag đang chạy / rollback. | `.github/workflows/ghcr-cleanup.yml` | Pilot | **Thiết kế lại Task 4**: Truy vấn bảo vệ bằng định danh cụ thể image/tag đang chạy và ít nhất 1 bản rollback của staging/production. Dừng xóa nếu thiếu deploy state. Hỗ trợ dry-run và test nhiều build thành công deploy lỗi. |
| R17 | `deploy.sh` hỏng health check không tự rollback. | `infra/scripts/deploy.sh` | Pilot | Lưu tag cũ trước deploy; tự động rollback về tag cũ nếu health check hỏng và thoát mã khác 0. Kiểm thử cả trường hợp mất tag cũ, rollback thất bại, và lần deploy đầu tiên. |
| R18 | Compose thiếu chuyển biến `CORE_AZURE_*` vào container Core. | `infra/compose/docker-compose.*.yml` | Sau | Truyền `CORE_AZURE_*` để hỗ trợ Microsoft SSO. |
| R19 | Biến env thừa hoặc không dùng. | compose, `.env.example` | Sau | **Giữ `SETTINGS_ENCRYPTION_KEY`** cho tới khi kiểm tra code, dữ liệu đã lưu và bất biến #3. Nếu gỡ cần ADR và docs trong cùng PR. |
| R20 | Chưa có rate limit đăng nhập. | `infra/nginx/*/core.conf` | Pilot | Cấu hình `limit_req_zone` và `limit_req` 429 trên nginx cho `/api/login`. |

### 4.3 Tài liệu, Dọn dẹp, Runbook (PLAN-REL-003)

| ID | Phát hiện | Chỗ | Mức |
|---|---|---|---|
| R21 | `docs:check --base origin/main` đỏ do PB-DEP-001 chưa cập nhật. | `docs/playbooks/nang-dependency.md` | **Chặn (G2)** |
| R22 | Lỗi mã hóa ("C?p nh?t…") chèn nhầm vào bảng đầu của 8 tài liệu. | các file tài liệu liên quan | Sau |
| R23 | `core/test-output.txt` bị commit nhầm. | `core/test-output.txt` | Sau |
| R24 | Runbook phát hành §7 có lệnh sai đường dẫn backup, thiếu gunzip, sai env-file/DB name, reset hard. | `docs/ops/deploy-va-nhanh.md` | **Chặn (G4)** |
| R25 | Các sai lệch tài liệu vận hành (`rollback.md`, `hotfix-production.md`, `moi-truong.md`, `db-migration.md`). | các file tài liệu liên quan | Sau |
| R26 | PR #43 cũ và xung đột trên GitHub. | GitHub PR #43 | Sau |

## 5. Quyết định bằng văn bản đã chốt (Thay thế họp team — 2026-10-03)

Các quyết định chính thức đã được ghi trực tiếp vào GitHub issues:

1. **Issue #48**:
   - Pilot Điều hành chỉ dành riêng cho TCKT; không bật cho đơn vị khác.
   - Admin TCKT chỉ quản lý tài khoản TCKT, không can thiệp platform owner hay DYC.
   - Cấm người dùng tự đổi email định danh qua `PATCH /api/account` (HTTP 403, UI read-only).
   - Quyền đọc từ `req.actor` và membership (INV-AUTH-001); khóa/hạ quyền có hiệu lực ngay request kế tiếp; regenerate session khi đăng nhập.
   - Đồng bộ hai chiều role tổ và membership TCKT; không tự tạo lại membership đã gỡ khi sửa hồ sơ.
   - Chỉ `dyc_admin` được quản trị membership đơn vị khác; `dyc_engineer` không được tự cấp quyền.
   - DYC chỉ đọc Điều hành; `/api/session` phản ánh đúng quyền ghi thực tế.
   - Ngắt mount router directives/submissions (trả 404).
   - Giới hạn hiển thị email thành viên đơn vị cho vai trò quản lý.
   - Audit thao tác ghi nhạy cảm và đọc chéo đơn vị; không ghi polling thừa, không ghi secret vào metadata.

2. **Issue #49**:
   - Production chưa bật gửi email Noti thật trong phát hành đợt 1 (`NOTI_API_KEY` trống hoặc driver `console`).
   - Sửa R12: Scheduler idempotent (dedupe theo `sourceKey` ổn định, không gọi notifier vô hạn mỗi 15 phút); chuẩn hóa múi giờ VN; lọc trạng thái task; retry có giới hạn cho lỗi tạm thời.
   - Lập danh sách kiểm kê độc lập cho các mục còn lại của #49 (cửa sổ nhắc hạn, người nhận, format email, outbox, timeout Graph/SMTP); không tuyên bố #49 hoàn tất khi mới sửa R12.
   - Xử lý triệt để lỗi gửi sai người/mất thư trước khi bật gửi email thật trên production.

3. **Issue #50**:
   - nginx giới hạn upload: 55m cho Core, 8m cho CTD.
   - Job `infra` deploy có cổng kiểm tra phụ thuộc `test-tools`.
   - Script tạo user chạy `mysql` trong container, không truyền mật khẩu qua cờ `-p` trên host.
   - Health check và rollback tự động trong `deploy.sh` (xử lý cả mất tag cũ, rollback fail, lần đầu deploy).
   - Truyền biến `CORE_AZURE_*` vào compose cho SSO.
   - Rate limit đăng nhập nginx 429 cho `/api/login`.
   - **Thiết kế lại GHCR retention**: bảo vệ bằng định danh cụ thể image/tag đang chạy thực tế trên VM và ít nhất 1 bản rollback của cả staging và production; ngừng xóa nếu thiếu deploy state; có dry-run và test kịch bản multi-build fail deploy.
   - **Giữ `SETTINGS_ENCRYPTION_KEY`** cho tới khi kiểm tra toàn diện mã nguồn, cấu hình đã lưu và bất biến #3.
   - Kiểm kê phân định các mục còn lại của #50: phân rõ điều kiện pilot vs backlog sau phát hành.

## Lịch sử phiên bản

| Version | Ngày | Thay đổi | Người |
|---|---|---|---|
| 1.0 | 2026-10-03 | Bản đầu: kết quả rà soát trước đợt 1, cổng phát hành, 26 phát hiện, ánh xạ sang PLAN-REL-001/002/003 | DYC |
| 1.1 | 2026-10-03 | Cập nhật theo quyết định văn bản chốt cho #48, #49, #50, #54, #55; siết chặt điều kiện nghiệm thu G1-G6; thiết kế lại Task 4 GHCR; giữ SETTINGS_ENCRYPTION_KEY; phân định rõ pilot vs backlog | DYC |
| 1.2 | 2026-10-03 | Thêm điều kiện nghiệm thu vận hành O1 (#55) và O2 (#54); PR hotfix dùng `Refs`, không tự đóng issue; cảnh báo rollback `ctd-api` về image trước #54 | DYC |
| 1.3 | 2026-10-05 | Ghi chú: production đã có Noti trong compose theo SPEC-MAIL-001 | DYC |
