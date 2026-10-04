---
doc_id: AI-INV-001
title: Bất biến — điều không được phá
version: 4.5
status: active
audience: [ai, dev]
owner: DYC
updated: 2026-10-05
related_code: [core/src/policies/**, core/src/middleware/auth.js, core/src/middleware/legacy-gate.js, core/src/services/audit.js, core/tests/units.leak.test.js, infra/**, core/src/config/database.js]
---

# Bất biến — điều không được phá

Danh sách này liệt kê các ràng buộc mà nếu vi phạm sẽ gây rò rỉ dữ liệu, mất khả năng vận hành, hoặc phá dữ liệu
thật trên VM. Đọc trước khi sửa code liên quan đến quyền, hạ tầng, hoặc bảo mật.

1. **Phạm vi dữ liệu (scope).** Mọi truy vấn đọc dữ liệu nghiệp vụ liên đơn vị/liên team ở Core phải đi qua
   `activityScope`/`scopeFor` trong `core/src/policies/access.js` (GĐ1 bổ sung `scopeFor` đa đơn vị). Không tự viết
   điều kiện quyền rải rác trong route, và không lấy dữ liệu rộng rồi lọc lại ở phía client — dữ liệu ngoài phạm vi
   không được rời khỏi server.
2. **Secret chỉ ở hai chỗ.** `.env` thật trên VM (`/opt/ultimate-tckt/<env>/infra/.env`, quyền 600) và GitHub
   Secrets/Environments. Không commit secret vào repo, không ghi giá trị secret vào tài liệu.
3. **`SETTINGS_ENCRYPTION_KEY` không được mất.** Đây là khoá mã hoá cấu hình SMTP đã lưu trong DB Core
   (`core/src/config/settings-crypto.js`). Mất khoá này = mất khả năng đọc lại cấu hình SMTP đã lưu (không phục
   hồi được), phải nhập lại từ đầu.
4. **Không đổi tên compose project sau khi đã chạy.** Đổi `ultimate-tckt-<env>` sang tên khác làm Docker tạo
   volume mới trống — dữ liệu MySQL/Postgres cũ coi như mất với stack mới cho tới khi chạy lại
   `infra/scripts/migrate-volumes.sh`.
5. **DB container chỉ được restart qua `apply-infra.sh <env> true`.** Gọi trực tiếp `docker compose up -d` với
   service `core-db`/`ctd-db` ngoài quy trình này bỏ qua lock file (`ut_lock`) và có thể đụng độ với một deploy
   khác đang chạy. Ở staging và production, `ctd-db` còn chứa database `noti` của Noti: restart `ctd-db` làm Noti mất kết nối tạm thời.
   Noti chết hay sai key không được làm lỗi Core: `NOTI_API_KEY` trống chỉ tắt gửi, lỗi gửi chỉ ghi log
   (`core/src/notifier.js`). Production: `NOTI_RECIPIENT_ALLOWLIST` luôn khác rỗng (compose bắt buộc). `CORE_NOTI_API_KEY` chỉ nằm trong `.env` trên VM.
6. **Migration phải idempotent.** Core: `npm run migrate` (`core/src/config/migrate.js`) — mỗi thay đổi schema
   kiểm tồn tại trước khi `ALTER`/`CREATE`, chạy lại nhiều lần không lỗi. CTD: Alembic
   (`services/ctd-api/backend/alembic/`) — mỗi thay đổi là một revision mới, không sửa tay DB.
7. **So sánh ngày theo lịch địa phương, không cắt chuỗi ISO/UTC.** Nhiều lỗi cũ (xem `docs/ai/bay-da-gap.md`)
   đến từ việc lấy 10 ký tự đầu của chuỗi UTC rồi coi là "ngày local". Luôn quy đổi múi giờ trước khi so ngày.
8. **Không dùng lại tên hạ tầng cũ `seee`/`tckt-app`/`ctd-app`** trong code hoặc cấu hình mới — chỉ còn ở
   `infra/scripts/migrate-volumes.sh` (script chuyển dữ liệu, cần biết tên cũ để chép đúng volume nguồn) và
   `docs/adr/` (ghi lại quyết định đổi tên).
9. **Không để cấu hình nginx hỏng nằm trong `sites-enabled`.** nginx phục vụ cả hai môi trường; một file lỗi làm
   lần reload/khởi động lại sau đó chết cả staging lẫn production. `apply-infra.sh` gỡ/khôi phục site mới khi `nginx -t` lỗi.
10. **Mật khẩu DB không bao giờ đi qua dòng lệnh trên host** (`ps` thấy được): dump/restore chạy `sh -c '…$MYSQL_…/$POSTGRES_…'`
   trong container (xem `infra/scripts/backup.sh`). Dump Postgres luôn có `--clean --if-exists` để restore đè được.
11. **INV-AUTH-001: Quyền hạn phải đọc qua `req.actor`/`req.unitRole`, cấm dùng `users.role`.** Từ GĐ1-A Task 5, 
   route Điều hành cũ đọc `req.actor` (không `req.session.user`) để tính quyền theo membership. Route mới (module 
   loại A) phải dùng `req.unitRole` + `req.unit`. Đọc trực tiếp `users.role` hoặc `req.session.user.role` bỏ qua 
   logic membership và gây lỗ hổng bảo mật.
12. **INV-AUDIT-001: Mọi thao tác DYC đọc dữ liệu TCKT phải có bản ghi trong `audit_logs`.** Legacy Gate 
   (`core/src/middleware/legacy-gate.js`) tự động ghi audit khi DYC GET/HEAD route Điều hành. Khi thêm route mới 
   cho phép DYC đọc dữ liệu đơn vị khác, phải gọi `recordAudit(db, {...})` (`core/src/services/audit.js`) với 
   `action='cross_unit_read'`. Không audit = vi phạm yêu cầu truy xuất nguồn.
13. **INV-LEAK-001: Route GET nghiệp vụ phải pass test `units.leak.test.js`.** Mọi route GET trả về dữ liệu 
   nghiệp vụ (không nằm trong whitelist `OUTSIDER_ALLOW` của test) phải thỏa mãn: (1) người thuộc đơn vị ngoài 
   (BTV) nhận 403; (2) DYC (platform admin) không bị chặn 403 (nhưng có audit). Test chạy tự động trong CI và 
   chặn merge khi phát hiện rò rỉ. Không được bỏ qua test này bằng cách thêm route mới vào whitelist trừ khi 
   route đó thực sự là public (như `/api/health`, `/api/session`).

## Lịch sử phiên bản

| Version | Ngày | Thay đổi | Người |
|---|---|---|---|
| 1.0 | 2026-09-24 | Bản đầu (viết lại từ tài liệu cũ khi gộp monorepo) | DYC |
| 1.1 | 2026-09-24 | Thêm bất biến 9 (nginx hỏng) và 10 (mật khẩu DB không qua dòng lệnh host) | DYC |
| 2.0 | 2026-09-27 | Đồng bộ `main` = `staging`: nội dung theo bản `main` (chưa có code đa đơn vị GĐ1-A). Bản 1.3 trên `staging` mô tả GĐ1-A, lưu ở nhánh `archive/gd1a-staging` — NTMT làm lại ở PR sau | DYC |
| 3.0 | 2026-09-29 | Thêm INV-AUTH-001 (quyền qua req.actor/req.unitRole) và INV-AUDIT-001 (audit DYC cross-unit read). Thêm `legacy-gate.js` và `audit.js` vào `related_code`. | DYC |
| 4.0 | 2026-09-30 | Thêm INV-LEAK-001: bất biến test rò rỉ units.leak.test.js — route GET nghiệp vụ phải 403 với outsider, không 403 với DYC | DYC |
| 2.1 | 2026-09-30 | Phạm vi xem hoạt động và ranh giới quản lý tài khoản đổi theo pilot PR 4 (không đổi bất biến) | DYC |
| 4.1 | 2026-10-01 | Xử lý conflict merge staging và cập nhật tài liệu | DYC |
| 4.2 | 2026-10-02 | Ghi chú `ctd-db` staging chứa database `noti` | DYC |
| 4.3 | 2026-10-02 | Thông báo không được làm lỗi request; `CORE_NOTI_API_KEY` chỉ ở `.env` VM | DYC |
| 4.4 | 2026-10-04 | Thêm core/src/config/database.js vào related_code - cấu hình timezone | DYC |
| 4.5 | 2026-10-05 | Production cũng có Noti trên `ctd-db`; allowlist production bắt buộc khác rỗng | DYC |
