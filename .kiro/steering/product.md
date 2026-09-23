# Product

TCKT Activity Hub đang được mở rộng thành **nền tảng đa đơn vị của Đoàn Đại học**.

## Đơn vị và người dùng
- **DYC:** chủ quản và vận hành nền tảng, là **admin global**: toàn quyền truy cập mọi dữ liệu nghiệp vụ của mọi đơn vị và mọi module (kể cả hồ sơ CTD). Phân cấp quyền xem trong nội bộ DYC (ví dụ không phải ai trong DYC cũng xem được hồ sơ CTD) sẽ thiết kế sau, chưa chốt ở GĐ1.
- **BTV (Ban Thường vụ):** giám sát, giao việc, xem báo cáo. BTV được coi là một đơn vị khác: chỉ thấy những gì mình giao hoặc được Trình lên, trong phạm vi mức xem đã cấu hình.
- **TCKT (Ban Tổ chức – Kiểm tra):** đơn vị pilot. Có 5 role nội bộ: `admin`, `vice_admin`, `leader`, `vice_leader`, `member`. TCKT theo dõi công việc và trách nhiệm của từng cá nhân.
- **VP Đoàn, Chi bộ, ĐT/LCĐ:** trong GĐ1 chỉ dùng module Công tác Đảng.
- **Sinh viên:** chỉ nộp hồ sơ Đảng ở trang riêng, không vào Hub quản lý.

## Module
- **Điều hành:** hoạt động, đề án, task/Kanban, nghiệm thu, giao việc liên đơn vị, Trình, trực ban/họp ban, KPI.
- **Công tác Đảng (CTD):** xét duyệt hồ sơ Đảng. Backend riêng, repo `ctd`.

## Nguyên tắc sản phẩm
- Giao diện 100% tiếng Việt. Mobile web là bắt buộc với các màn dành cho thành viên.
- Dữ liệu nội bộ mặc định chỉ đơn vị sở hữu xem được. Mở ra ngoài phải qua mức xem đã cấu hình hoặc qua Trình.
- Tách module khi đạt ≥2/3 tiêu chí: có nhóm người dùng riêng, dữ liệu ít JOIN với phần khác, có quy trình riêng.

Chi tiết: `.kiro/specs/nen-tang-da-don-vi/design.md`. Nghiệp vụ gốc của Điều hành: `TCKT_REQUIREMENTS_SPEC.md` (riêng mục B và I đã được design mới thay thế).
