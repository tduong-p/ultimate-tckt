---
doc_id: SPEC-MEMBERS-001
title: Design — Members Screen UI (Thành viên)
version: 1.4
status: active
audience: [dev, ai]
owner: DYC
updated: 2026-10-10
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
- Responsive card grid (`repeat(auto-fill, minmax(min(100%, 300px), 1fr))` để tự co vừa màn hình di động `360px`):
  - Avatar with initials and background color
  - Name, Role badge (`Tổ Trưởng`, `Tổ Phó`, `Thành Viên`), Team name
  - Completed task count (`X công việc đã hoàn thành`)
  - Email link
- Management actions: `Sửa`, `Xóa`

Giao diện hiện có thêm tạo/sửa/xoá tài khoản theo quyền server. Tổ trưởng chỉ sửa thông tin giới hạn của tài khoản mình quản lý, không được sửa email/mật khẩu hoặc tự xoá; quyền chọn Tổ cũng giới hạn theo các Tổ đang quản lý. Xem contract đầy đủ ở SPEC-WEB-003 §4.4.

## Lịch sử phiên bản
| Version | Ngày | Thay đổi | Người |
|---|---|---|---|
| 1.0 | 2026-10-08 | Khởi tạo tài liệu thiết kế giao diện Thành viên | DYC |
| 1.1 | 2026-10-08 | Tích hợp React Query với API /api/people và /api/teams, xóa mock | DYC |
| 1.2 | 2026-10-09 | Bỏ nút "+ Tạo tài khoản" (chưa có chức năng); chữ tiếng Anh còn sót đổi sang tiếng Việt | DYC |
| 1.3 | 2026-10-09 | Cập nhật giao diện Thành viên theo luồng tạo, sửa và xoá tài khoản đã triển khai | DYC |
| 1.4 | 2026-10-10 | Lưới thẻ thành viên và thanh lọc tự co theo màn hình di động (`360px+`) không tràn ngang | DYC |
