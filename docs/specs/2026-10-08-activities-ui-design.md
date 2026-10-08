---
doc_id: SPEC-ACTIVITIES-001
title: Design — Activities & Projects Screen UI (Hoạt động & Dự án)
version: 1.0
status: active
audience: [dev, ai]
owner: DYC
updated: 2026-10-08
related_code: [web/src/core/features/activities/**]
---

# Activities & Projects Screen UI Design (Hoạt động & Dự án)

## 1. Overview
The "Hoạt động & Dự án" screen enables members and leaders to view, plan, coordinate, and track all department activities and projects. It also includes the "+ Đề xuất hoạt động" action button that opens the proposal creation modal.

## 2. Layout & Structure

### Header
- **Title**: "Hoạt động"
- **Subtitle**: "Lập kế hoạch, phối hợp và theo dõi mọi hoạt động."
- **Action Button**: "+ Đề xuất hoạt động" (Primary button, opens `CreateActivityModal`).

### Filter & Search Bar
- **Search Input**: "Tìm kiếm hoạt động..."
- **Status Filter**: Dropdown "Tất cả trạng thái" (All statuses)
- **Type Filter**: Dropdown "Tất cả loại" (All types)

### Activity Cards Grid
- Card with subtle border, shadow, and rounded corners:
  - Top colored accent indicator
  - Participating teams tag list
  - Status Lozenge (e.g. `Đã Duyệt` - Success)
  - Activity Title & Description snippet
  - Bottom metadata: Event type, participant count, date
  - Visual progress bar indicator

## Lịch sử phiên bản
- 1.0 (2026-10-08): Khởi tạo tài liệu thiết kế giao diện Hoạt động & Dự án.
