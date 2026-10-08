---
doc_id: PLAN-CTDUI-001
title: Kế hoạch triển khai — Giao diện Công tác Đảng (CTD) theo Atlassian Design System
version: 1.0
status: active
audience: [dev, ai]
owner: DYC
updated: 2026-10-08
related_code: [web/src/ctd/**, web/ctd.html]
---

# Kế hoạch triển khai — Giao diện Công tác Đảng (CTD) theo Atlassian Design System

## Kế hoạch công việc

### Task 1: Thiết lập Mock Data & Type Definitions
- Tạo `web/src/ctd/data/ctdMockData.ts` kế thừa các models của CTD (Case, Document, Status, KPI).

### Task 2: Cấu hình HTML Entry & Layout
- Tạo `web/ctd.html` và cập nhật `web/vite.config.ts` để build multi-page app.
- Tạo `web/src/ctd/layouts/CtdLayout.tsx` với TopNavigation, Sidebar phân quyền (Cán bộ / Sinh viên), và điều hướng liên kết Core / CTD.

### Task 3: Hiện thực C1 — Hộp xử lý hồ sơ (InboxView)
- Tạo `web/src/ctd/features/inbox/InboxView.tsx`: 4 KPI cards, filter/search bar, bảng dữ liệu hồ sơ với `DynamicTable` và `Lozenge`.
- Viết unit test `web/src/ctd/features/inbox/InboxView.test.tsx`.

### Task 4: Hiện thực C2 — Chi tiết hồ sơ & Thẩm định (ReviewCaseView)
- Tạo `web/src/ctd/features/review/ReviewCaseView.tsx`: Process stepper, thông tin ứng viên, danh mục kiểm tra giấy tờ, nút chuyển trạng thái quy trình.
- Viết unit test `web/src/ctd/features/review/ReviewCaseView.test.tsx`.

### Task 5: Hiện thực C6 — Toàn cảnh đợt xét & Báo cáo (CtdDashboardView)
- Tạo `web/src/ctd/features/dashboard/CtdDashboardView.tsx`: Thống kê KPI, thanh tiến độ phân bổ trạng thái, bảng danh sách tồn đọng SLA, xuất báo cáo.
- Viết unit test `web/src/ctd/features/dashboard/CtdDashboardView.test.tsx`.

### Task 6: Hiện thực S2 & S3 — Phân hệ Sinh viên (StudentCaseView)
- Tạo `web/src/ctd/features/student/StudentCaseView.tsx`: Sinh viên xem trạng thái hồ sơ, phản hồi cần bổ sung, và form nộp/tải tài liệu.
- Viết unit test `web/src/ctd/features/student/StudentCaseView.test.tsx`.

### Task 7: Tích hợp Entry Point `web/src/ctd/main.tsx` & Kiểm thử toàn diện
- Nối các màn hình vào `main.tsx` với router chuyển đổi view và vai trò.
- Chạy toàn bộ test suite của `web`.
- Kiểm tra dev server và merge vào nhánh `staging` local.

## Lịch sử phiên bản
| Version | Ngày | Thay đổi | Người |
|---|---|---|---|
| 1.0 | 2026-10-08 | Khởi tạo kế hoạch triển khai giao diện CTD theo Atlassian Design System | DYC |
