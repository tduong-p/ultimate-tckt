---
doc_id: SPEC-CALENDAR-001
title: Design — Calendar Screen UI (Lịch chung)
version: 1.2
status: active
audience: [dev, ai]
owner: DYC
updated: 2026-10-08
related_code: [web/src/core/features/calendar/**]
---

# Calendar Screen UI Design (Lịch chung)

## 1. Overview
The "Lịch chung" screen allows users to view scheduled activities and deadlines for teams across a monthly grid calendar, list format, or an interactive Gantt chart timeline.

## 2. Layout & Structure

### Header
- **Title**: "Lịch chung"
- **Subtitle**: "Lịch hoạt động và hạn chót công việc của các Tổ."

### Toolbar Controls
- **Date Navigation**:
  - Previous (`<`) and Next (`>`) buttons (tháng/năm tùy theo chế độ xem).
  - Current period label: "Tháng 10 năm 2026" (hoặc "Năm 2026" ở chế độ Gantt).
  - Quick action button: "Hôm nay" (Today).
- **Filters & View Modes**:
  - Filter by team dropdown: "Tất cả các Tổ" (All teams).
  - View switcher: "Tháng" (Month) | "Danh sách" (List) | "Biểu đồ Gantt" (Gantt chart).

### Monthly Grid
- 7 columns: T2, T3, T4, T5, T6, T7, CN (Monday to Sunday).
- Days from previous/next month with subtle muted background styling.
- Today indicator: Day 8 highlighted with a blue circular badge and tinted background cell.
- Clean white card layout with border and subtle elevation.

### Gantt Chart Timeline (Biểu đồ Gantt)
- **Left Column**: Danh sách hoạt động (tiêu đề, tên Tổ, hạn chót).
- **Timeline Grid**: Trục thời gian 12 tháng (Thg 1 - Thg 12) với vạch chia tháng và đường mốc "Hôm nay".
- **Color-Coded Activity Bars**: Mỗi hoạt động được gán một màu sắc riêng biệt từ bảng 16 màu tương phản cao (GANTT_COLORS) để người dùng dễ phân biệt trực quan.
- **Loading State**: Sử dụng `LottieLoading` đồng bộ toàn hệ thống thay thế spinner tròn cũ.

## Lịch sử phiên bản
| Version | Ngày | Thay đổi | Người |
|---|---|---|---|
| 1.0 | 2026-10-08 | Khởi tạo tài liệu thiết kế giao diện Lịch chung | DYC |
| 1.1 | 2026-10-08 | Tích hợp React Query với API /api/activities và /api/teams, xóa mock | DYC |
| 1.2 | 2026-10-08 | Bổ sung chế độ xem Biểu đồ Gantt phân màu riêng cho từng hoạt động và tích hợp Lottie loading | DYC |
