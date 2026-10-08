---
doc_id: SPEC-MEMBERS-001
title: Design — Members Screen UI (Thành viên)
version: 1.2
status: active
audience: [dev, ai]
owner: DYC
updated: 2026-10-09
related_code: [web/src/core/features/members/MembersView.tsx]
---

# Members Screen UI Design (Thành viên)

## 1. Overview
The "Thành viên" screen recognizes and manages members, their roles, team affiliations, and activity contribution statistics.

## 2. Layout & Structure

### Header
- **Title**: "Thành viên"
- **Subtitle**: "Recognize every member's participation."

### Search & Filters Toolbar
- **Search Bar**: "Tìm thành viên..."
- **Team Filter**: "Tất cả các Tổ"
- **Role Filter**: "Tất cả vai trò"

### Members Grid
- 3-column card grid:
  - Avatar with initials and background color
  - Name, Role badge (`Tổ Trưởng`, `Tổ Phó`, `Thành Viên`), Team name
  - Completed task count (`X công việc đã hoàn thành`)
  - Email link
  - Management actions: `Sửa`, `Xóa`

## Lịch sử phiên bản
| Version | Ngày | Thay đổi | Người |
|---|---|---|---|
| 1.0 | 2026-10-08 | Khởi tạo tài liệu thiết kế giao diện Thành viên | DYC |
| 1.1 | 2026-10-08 | Tích hợp React Query với API /api/people và /api/teams, xóa mock | DYC |
| 1.2 | 2026-10-09 | Bỏ nút "+ Tạo tài khoản" (chưa có chức năng); chữ tiếng Anh còn sót đổi sang tiếng Việt | DYC |
