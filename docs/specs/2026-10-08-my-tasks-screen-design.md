---
doc_id: SPEC-MYTASKS-001
title: Design — My Tasks Screen UI (Công việc của tôi)
version: 1.2
status: active
audience: [dev, ai]
owner: DYC
updated: 2026-10-08
related_code: [web/src/core/features/tasks/MyTasksView.tsx]
---

# My Tasks Screen UI Design (Công việc của tôi)

## 1. Overview
The "Công việc của tôi" screen displays tasks assigned to the current member and their teams.

## 2. Layout & Structure

### Header
- **Title**: "Công việc của tôi"
- **Subtitle**: "Công việc được giao cho bạn và các Tổ của bạn."

### Tasks Card
- Raised surface card matching Atlassian elevation tokens.
- **Card Header**:
  - Title: "Công việc đang mở"
  - Counter pill: "• 0 Công Việc"
- **Empty State Box**:
  - Sunken / neutral subtle background container with icon.
  - Message: "Bạn đã hoàn thành tất cả" (bold).
  - Subtext: "Không có công việc đang mở trong danh sách."

## Lịch sử phiên bản
| Version | Ngày | Thay đổi | Người |
|---|---|---|---|
| 1.0 | 2026-10-08 | Khởi tạo tài liệu thiết kế giao diện Công việc của tôi | DYC |
| 1.1 | 2026-10-08 | Tích hợp React Query với API /api/my-tasks-today thực tế, xóa mock | DYC |
| 1.2 | 2026-10-08 | Trạng thái `open` của Core hiển thị "Cần làm"; hạn chót định dạng theo giờ Việt Nam | DYC |
