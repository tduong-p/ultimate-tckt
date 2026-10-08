---
doc_id: SPEC-TEAMS-001
title: Design — Teams Screen UI (Các Tổ)
version: 1.2
status: active
audience: [dev, ai]
owner: DYC
updated: 2026-10-09
related_code: [web/src/core/features/teams/TeamsView.tsx]
---

# Teams Screen UI Design (Các Tổ)

## 1. Overview
The "Các Tổ" screen presents the units and teams that plan, coordinate, and execute all activities across the organization.

## 2. Layout & Structure

### Header
- **Title**: "Tổ"
- **Subtitle**: "Những con người và đơn vị cùng tạo nên các hoạt động."

### Teams Grid
- Card grid displaying organization teams:
  - Team Name with colored identification dot
  - Team Description
  - Metrics: Member count (`thành viên`) and Active activities count (`đang chạy`)

## Lịch sử phiên bản
| Version | Ngày | Thay đổi | Người |
|---|---|---|---|
| 1.0 | 2026-10-08 | Khởi tạo tài liệu thiết kế giao diện Các Tổ | DYC |
| 1.1 | 2026-10-08 | Tích hợp React Query với API /api/teams thực tế, xóa mock | DYC |
| 1.2 | 2026-10-09 | Bỏ hai nút "Xem hoạt động"/"Quản lý thành viên" (chưa có chức năng) | DYC |
