---
doc_id: SPEC-CALENDAR-001
title: Design — Calendar Screen UI (Lịch chung)
version: 1.0
status: active
audience: [dev, ai]
owner: DYC
updated: 2026-10-08
related_code: [web/src/core/features/calendar/**]
---

# Calendar Screen UI Design (Lịch chung)

## 1. Overview
The "Lịch chung" screen allows users to view scheduled activities and deadlines for teams across a monthly grid calendar or list format.

## 2. Layout & Structure

### Header
- **Title**: "Lịch chung"
- **Subtitle**: "Lịch hoạt động và hạn chót công việc của các Tổ."

### Toolbar Controls
- **Date Navigation**:
  - Previous (`<`) and Next (`>`) buttons.
  - Current month/year label: "Tháng 10 năm 2026".
  - Quick action button: "Hôm nay" (Today).
- **Filters & View Modes**:
  - Filter by team dropdown: "Tất cả các Tổ" (All teams).
  - View switcher: "Tháng" (Month - active) | "Danh sách" (List).

### Monthly Grid
- 7 columns: T2, T3, T4, T5, T6, T7, CN (Monday to Sunday).
- Days from previous/next month with subtle muted background styling.
- Today indicator: Day 8 highlighted with a blue circular badge and tinted background cell.
- Clean white card layout with border and subtle elevation.

## Lịch sử phiên bản
- 1.0 (2026-10-08): Khởi tạo tài liệu thiết kế giao diện Lịch chung.
