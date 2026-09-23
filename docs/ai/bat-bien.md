---
doc_id: AI-INV-001
title: Bất biến — điều không được phá
version: 1.0
status: active
audience: [ai, dev]
owner: DYC
updated: 2026-09-24
related_code: [core/src/policies/**, core/src/middleware/auth.js, infra/**]
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
   khác đang chạy.
6. **Migration phải idempotent.** Core: `npm run migrate` (`core/src/config/migrate.js`) — mỗi thay đổi schema
   kiểm tồn tại trước khi `ALTER`/`CREATE`, chạy lại nhiều lần không lỗi. CTD: Alembic
   (`services/ctd-api/backend/alembic/`) — mỗi thay đổi là một revision mới, không sửa tay DB.
7. **So sánh ngày theo lịch địa phương, không cắt chuỗi ISO/UTC.** Nhiều lỗi cũ (xem `docs/ai/bay-da-gap.md`)
   đến từ việc lấy 10 ký tự đầu của chuỗi UTC rồi coi là "ngày local". Luôn quy đổi múi giờ trước khi so ngày.
8. **Không dùng lại tên hạ tầng cũ `seee`/`tckt-app`/`ctd-app`** trong code hoặc cấu hình mới — chỉ còn ở
   `infra/scripts/migrate-volumes.sh` (script chuyển dữ liệu, cần biết tên cũ để chép đúng volume nguồn) và
   `docs/adr/` (ghi lại quyết định đổi tên).

## Lịch sử phiên bản

| Version | Ngày | Thay đổi | Người |
|---|---|---|---|
| 1.0 | 2026-09-24 | Bản đầu (viết lại từ tài liệu cũ khi gộp monorepo) | DYC |
