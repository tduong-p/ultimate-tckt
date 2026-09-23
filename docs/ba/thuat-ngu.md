---
doc_id: BA-GLOS-001
title: Thuật ngữ
version: 1.0
status: active
audience: [ba, dev, ai]
owner: DYC
updated: 2026-09-24
related_code: []
---

# Thuật ngữ

Tài liệu này giúp người mới (BA, dev, AI agent) tra nhanh nghĩa của các từ viết tắt và khái niệm nghiệp vụ dùng xuyên suốt các tài liệu khác trong `docs/`, tránh mỗi nơi hiểu một kiểu. Định nghĩa lấy từ `.kiro/specs/nen-tang-da-don-vi/{requirements,design}.md` và code thật; phần nào còn là kế hoạch (chưa có code) được ghi rõ.

## Đơn vị và vai trò

- **DYC** — Văn phòng Đoàn trường, chủ quản nền tảng: xây dựng và vận hành hệ thống, độc lập với cây tổ chức Đoàn. Là admin toàn cục (đọc mọi dữ liệu nghiệp vụ, kèm ghi vết truy cập/audit) — xem [`co-cau-don-vi-va-role.md`](co-cau-don-vi-va-role.md) mục 2.
- **BTV** — Ban Thường vụ Đoàn Đại học: giám sát, giao việc (directive) và nhận báo cáo từ TCKT theo mức xem cấu hình được, không phải toàn quyền như DYC.
- **TCKT** — Ban Tổ chức – Kiểm tra: đơn vị vận hành hoạt động/công việc chính đã có code chạy thật (`core/`). 5 vai trò trên cột `users.role`: `admin`, `vice_admin`, `leader`, `vice_lead` (đúng tên cột là `vice_leader`), `member`.
- **ĐT/LCĐ** — Đoàn trường / Liên chi đoàn: đơn vị cấp dưới, vai trò `officer`. **Trong GĐ1, danh sách ĐT/LCĐ và cán bộ phụ trách trong module Điều hành là dữ liệu giả/placeholder** — chỉ dữ liệu dùng trong module CTD (vai trò `can_bo_don_vi`) là thật. Xem [`co-cau-don-vi-va-role.md`](co-cau-don-vi-va-role.md) mục 4.
- **Chi bộ** — cấp tổ chức Đảng nhận hồ sơ sau khi VP Đoàn rà soát xong (trạng thái `forwarded` trong CTD); vai trò CTD `chi_bo`, chỉ thấy hồ sơ đã ở trạng thái này.
- **Chi đoàn** — cấp tổ chức Đoàn cơ sở (dưới ĐT/LCĐ), nơi tổ chức "họp xét cấp Chi đoàn" cho hồ sơ Đảng theo tài liệu nghiệp vụ gốc. Chưa xuất hiện như một khái niệm riêng trong code/spec hiện tại (không có bảng hay vai trò `chi_doan`) — khi cần hiện thực hoá, đối chiếu lại với BA trước.
- **Tổ / Tổ trưởng / Tổ phó** — đơn vị nhỏ nhất trong TCKT (bảng `teams`, `user_teams`), phụ trách một nhóm hoạt động/task. Tổ trưởng (`is_lead`) và Tổ phó (`is_vice_lead`) được tính vai trò `leader`/`vice_leader` tự động khi thay đổi trong `user_teams` (xem `core/src/routes/teams.js`). Từ **tổ phó trở lên** (`vice_leader`, `leader`, `vice_admin`, `admin`) mới có quyền vào tab CTD.
- **Trình (submission)** — hành động một đơn vị chủ động gửi một bản ghi (hoạt động, nhật ký trực ban, báo cáo) lên đơn vị khác để xem/phản hồi. Rút lại được khi chưa có phản hồi, không rút lại được sau khi đã có phản hồi. **Kế hoạch, chưa có code** — xem [`dieu-hanh-use-case.md`](dieu-hanh-use-case.md) mục 7.
- **Giao việc (directive)** — luồng BTV giao việc cho TCKT, đi qua các trạng thái `sent` → `acknowledged` → `in_progress` → `submitted` → `accepted`/`revision_requested`. Tiến độ tính theo tỷ lệ task `done`/không-`cancelled` của các hoạt động gắn `directive_id`. **Kế hoạch, chưa có code**.

## Nghiệp vụ Điều hành (TCKT)

- **Hoạt động (activity)** — đơn vị công việc lớn nhất TCKT quản lý (đề án): có loại (`event`/`assigned`), Tổ chủ trì/phối hợp, vòng đời `proposed → approved → …`. Bảng `activities`.
- **Task** — công việc con trong một hoạt động, có Primary Assignee + co-assignee, đi qua 4 cột `todo → in_progress → review → done`. Xem luồng đầy đủ ở [`dieu-hanh-use-case.md`](dieu-hanh-use-case.md).
- **Weight preset** — danh mục điểm trọng số (0–10) dùng khi tự ghi nhận việc phát sinh (Self-Log Work) không thuộc kế hoạch ban đầu; bảng `weight_presets`, quản lý qua `core/src/routes/system.js`. Lưu ý tên field API (`name`) khác tên cột DB (`label`).
- **ops_log** — nhật ký trực ban/họp ban, tạo bởi `leader` trở lên, kèm điểm danh. Đơn vị ngoài chỉ thấy khi mức xem `full_readonly` hoặc log đã được Trình. **Kế hoạch, chưa có code** (bảng `ops_logs`, `ops_log_attendance`).

## Công tác Đảng (CTD)

- **CTD** — Công tác Đảng: module/dịch vụ riêng (FastAPI + PostgreSQL, `services/ctd-api/`) xử lý quy trình xét duyệt hồ sơ kết nạp/chuyển Đảng, từ lúc sinh viên nộp đến khi chuyển Chi bộ. Xem [`ctd-use-case.md`](ctd-use-case.md).
- **Hồ sơ Đảng** — bản ghi (`case`) theo dõi một sinh viên qua toàn bộ quy trình xét duyệt, đi qua 9 trạng thái (`draft` → … → `forwarded`/`cancelled`). Mỗi hồ sơ có một danh sách giấy tờ (`document`) được chụp ảnh từ danh mục chuẩn tại thời điểm tạo — xem [`danh-muc-giay-to-ctd.md`](danh-muc-giay-to-ctd.md).
- **Cảm tình Đảng** — thuật ngữ nghiệp vụ chung (ngoài hệ thống): người đang được bồi dưỡng, xem xét để giới thiệu kết nạp Đảng nhưng chưa nộp hồ sơ chính thức. Hệ thống CTD hiện tại **chỉ bắt đầu theo dõi từ khi hồ sơ được tạo** (trạng thái `draft` trở đi) — giai đoạn "cảm tình" trước đó không có bản ghi tương ứng trong `services/ctd-api`.
- **CTD (vai trò trong RBAC Core)** — ở Core, "quyền CTD" nghĩa là nhóm TCKT từ tổ phó trở lên được cấp vai trò `tckt` phía CTD để vào tab Công tác Đảng — không nhầm với "CTD" (tên module) ở trên dù viết tắt trùng nhau.

## Kiến trúc/kỹ thuật

- **Module loại A** — module dùng chung database/phiên đăng nhập với Core, nằm trong `core/src/modules/` (kế hoạch — thư mục này chưa tồn tại, module Điều hành hiện đang nằm trực tiếp ở `core/src/routes/` chứ chưa tách theo cấu trúc module). Tiêu chí phân loại: [`../playbooks/them-module.md`](../playbooks/them-module.md).
- **Module loại B** — module là dịch vụ riêng (`services/<id>/`), nối vào cổng chung qua JWT bridge + gateway. Ví dụ thật: `services/ctd-api/`.
- **JWT bridge** — token HS256 do Core ký (secret `HUB_BRIDGE_SECRET`, TTL 60 giây) để module loại B xác thực người dùng mà không cần luồng đăng nhập riêng. **Kế hoạch, chưa có code** — CTD hiện vẫn có đăng nhập độc lập riêng (`app/api/auth.py`).
- **`unit_modules`** — bảng (kế hoạch) khai báo module nào được bật cho đơn vị nào; shell chỉ hiện mục menu khi cả membership lẫn `unit_modules` đều cho phép.

## Lịch sử phiên bản

| Version | Ngày | Thay đổi | Người |
|---|---|---|---|
| 1.0 | 2026-09-24 | Bản đầu (viết lại từ tài liệu cũ khi gộp monorepo) | DYC |
