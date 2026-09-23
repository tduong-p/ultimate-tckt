---
doc_id: AI-PIT-001
title: Bẫy đã gặp
version: 1.1
status: active
audience: [ai, dev]
owner: DYC
updated: 2026-09-24
related_code: []
---

# Bẫy đã gặp

Danh sách lỗi/hiểu lầm đã xảy ra thật trong lịch sử dự án, để không lặp lại. Nguồn: lịch sử git của repo cũ
`tckt-activity-hub` (nay là `deployment-package`, các SHA dưới đây tra được bằng `git log --oneline` trong repo đó).

- **Lệch ngày UTC/local khi cắt chuỗi ISO.** Nhiều màn (lịch, dashboard) từng lấy 10 ký tự đầu của chuỗi
  timestamp UTC và coi đó là ngày hiển thị, sai lệch với ngày theo giờ Việt Nam gần nửa đêm. Sửa qua nhiều đợt:
  `e4d0bb7` (so hạn chót theo ngày lịch, không theo timestamp), `5f06c19` và `88fc946` (sửa tiếp các chỗ cắt
  chuỗi UTC/local còn sót trong lịch và dashboard). Bài học: luôn quy đổi múi giờ trước khi lấy phần ngày, không
  bao giờ dùng `slice`/`substring` trên chuỗi ISO để suy ra "ngày hôm nay" của người dùng.
- **Task/activity `cancelled` lọt vào thống kê hoặc kế hoạch việc.** `b552065`: loại task đã huỷ khỏi số liệu
  tổng quan/bootstrap. `6c80165`: ẩn task đã huỷ khỏi kế hoạch công việc của hoạt động. Bài học: mọi query đếm/
  liệt kê task phải lọc rõ trạng thái, không mặc định "mọi bản ghi còn tồn tại = còn hiệu lực".
- **Activity bị hard-delete khi chuyển sang `cancelled`.** `8b3342f` cố tình xoá cứng activity khi trạng thái
  thành huỷ (thay vì chỉ đổi cờ). Đây là quyết định có chủ đích tại thời điểm đó, không phải lỗi — nhưng vì hệ quả
  không đảo ngược được (mất luôn dữ liệu, không phải soft-delete), bất kỳ ai định "dọn" activity huỷ đều phải biết
  hành vi này trước khi đổi logic tương tự ở nơi khác.
- **Tính năng upload file đang tắt, chỉ nhận link.** `1b32165` tạm tắt các trường upload file, chỉ giữ minh chứng
  dạng link. Đừng giả định trường upload file trong UI cũ đang hoạt động — kiểm code thực tế trước khi dựa vào nó.
- **`emailEvents.emit` chạy sau khi pool DB đã đóng trong test** → log nhiễu `Pool is closed`. Xảy ra khi test kết
  thúc và teardown pool trước khi một callback bất đồng bộ (gửi email) kịp chạy xong. Bài học: test nào kích hoạt
  side-effect bất đồng bộ (email, cron) phải đợi nó hoàn tất trước khi teardown, hoặc mock hẳn phần gửi.
- **Test `weight-presets` gửi sai tên field.** Test cũ gửi `body: { label: … }` trong khi route
  `POST/PATCH /api/admin/weight-presets` đọc field `name` (cột DB vẫn là `label` — API và schema DB không cùng
  tên). Sửa ở `core/tests/weight-presets.test.js` khi dựng monorepo (Task 2 của plan monorepo). Bài học: tên field
  API và tên cột DB không nhất thiết trùng nhau, đừng suy đoán từ tên cột.
- **Image phải build cho arm64.** VM chạy Oracle Ampere (ARM), không phải x86_64. Build Docker image không dùng
  buildx/QEMU cho arm64 sẽ tạo image không chạy được trên VM dù CI xanh trên máy build x86.
- **`ctd@staging` từng cũ hơn `ctd@main` 8 commit.** Lúc dựng monorepo (2026-09-23), nhánh `staging` của repo `ctd`
  cũ hơn `main` — nếu lấy nhầm `staging` làm nguồn thì PR `staging → main` của monorepo mới sẽ kéo lùi phiên bản
  CTD production. Bài học: trước khi import nguồn, luôn so `git log` giữa các nhánh của từng repo nguồn, đừng mặc
  định `staging` luôn mới hơn `main`.
- **OTP dev cố định `123456` từng chạy trên môi trường thật.** Trước khi có `APP_ENV=staging|production`, CTD
  chạy với `app_env=dev` ở mọi nơi kể cả môi trường thật, nghĩa là ai biết email người dùng cũng đăng nhập được
  bằng mã `123456` (xem `services/ctd-api/backend/app/infra/otp.py`). Đã đóng bằng cách bắt buộc set `APP_ENV`
  đúng môi trường khi deploy — kiểm lại giá trị này mỗi khi thấy đăng nhập CTD "quá dễ" trên staging/production.
- **`dorny/paths-filter` trên PR cần quyền `pull-requests: read`.** Token mặc định của repo mới không có quyền
  này → job `changes` lỗi "Resource not accessible by integration" và mọi job sau bị skip. Job `changes` trong
  `deploy.yml` khai báo `permissions: { contents: read, pull-requests: read }`; đừng xoá.
- **Push nhiều nhánh cùng lúc vào repo vừa tạo có thể không kích hoạt workflow** cho một trong các nhánh
  (gặp với `staging` ngày 2026-09-24). Nếu thiếu run, đẩy thêm một commit (qua PR) để kích hoạt lại.

## Lịch sử phiên bản

| Version | Ngày | Thay đổi | Người |
|---|---|---|---|
| 1.0 | 2026-09-24 | Bản đầu (viết lại từ tài liệu cũ khi gộp monorepo) | DYC |
| 1.1 | 2026-09-24 | Thêm bẫy quyền `paths-filter` và push nhiều nhánh vào repo mới | DYC |
