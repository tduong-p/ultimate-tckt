---
doc_id: SPEC-REPORTS-001
title: Design — Reports Screen UI (Báo cáo)
version: 1.5
status: active
audience: [dev, ai]
owner: DYC
updated: 2026-10-10
related_code: [web/src/core/features/reports/ReportsView.tsx]
---

# Reports Screen UI Design (Báo cáo)

## 1. Overview
The "Báo cáo" screen allows leaders to export activities, tasks, and member participation metrics into Excel spreadsheets over a customizable date range.

## 2. Layout & Structure

### Header
- **Title**: "Báo cáo"
- **Subtitle**: "Xuất dữ liệu hoạt động, công việc của Tổ và mức độ tham gia trong một khoảng thời gian."

### Export Card Form
- Form container with subtle border and elevation:
  - **Date range fields**: "Ngày bắt đầu" and "Ngày kết thúc"
  - **Team filter field**: "Tổ" ("Tất cả các Tổ có thể xem")
  - **Description**: Note detailing report contents
  - **Export Action**: Button "Xuất báo cáo Excel" (Primary button)

### Hành vi
- Mặc định "Ngày bắt đầu" = ngày 1 của tháng hiện tại, "Ngày kết thúc" = hôm nay (giờ Việt Nam, `DD/MM/YYYY`).
- Nút xuất gọi `downloadReportExport` (GET `/api/reports/export`, `responseType: 'blob'`) rồi mới tải tệp; trong lúc chờ hiện "Đang tạo tệp Excel...", xong hiện "Đã tải tệp Excel.".
- Menu "Báo cáo" và route `#/reports` chỉ dành cho `useCapabilities().isManager` (khớp middleware `manager` của route xuất); người khác vào `#/reports` bị chuyển về dashboard.
- Xuất chạy bằng `useMutation`, nên lỗi 401 đi qua `MutationCache` của App và đưa về màn đăng nhập.
- Máy chủ từ chối (400 khoảng ngày sai, 403 không quản lý Tổ) → hiện thông điệp lỗi (`role="alert"`), không tải tệp JSON lỗi về máy và không báo thành công. Các câu lỗi tiếng Anh đã biết của Core được dịch sang tiếng Việt.

## Lịch sử phiên bản
| Version | Ngày | Thay đổi | Người |
|---|---|---|---|
| 1.0 | 2026-10-08 | Khởi tạo tài liệu thiết kế giao diện Báo cáo | DYC |
| 1.1 | 2026-10-08 | Tích hợp React Query với API /api/teams và URL download export Excel | DYC |
| 1.2 | 2026-10-08 | Khoảng thời gian mặc định là tháng hiện tại (giờ VN); xuất qua `downloadReportExport` (blob) và hiện lỗi máy chủ; bỏ link "Tải trực tiếp" | DYC |
| 1.3 | 2026-10-09 | Xuất qua `useMutation` (401 về màn đăng nhập); lỗi Core dịch tiếng Việt; menu Báo cáo chỉ hiện khi `canCreateActivity`; thu hồi URL tệp sau lượt tải | DYC |
| 1.4 | 2026-10-09 | Sửa mô tả quyền: menu và route Báo cáo theo `isManager` (không phải `canCreateActivity`), chặn route chuyển về dashboard | DYC |
| 1.5 | 2026-10-10 | Hai ô ngày bắt đầu/kết thúc tự xếp thành 1 cột trên màn hình di động (`<= 768px`) | DYC |
