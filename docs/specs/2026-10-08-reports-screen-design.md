---
doc_id: SPEC-REPORTS-001
title: Design — Reports Screen UI (Báo cáo)
version: 1.0
status: active
audience: [dev, ai]
owner: DYC
updated: 2026-10-08
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

## Lịch sử phiên bản
- 1.0 (2026-10-08): Khởi tạo tài liệu thiết kế giao diện Báo cáo.
