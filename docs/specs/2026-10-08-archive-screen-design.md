---
doc_id: SPEC-ARCHIVE-001
title: Design — Archive Screen UI (Kho lưu trữ hoạt động)
version: 1.0
status: active
audience: [dev, ai]
owner: DYC
updated: 2026-10-08
related_code: [web/src/core/features/archive/ArchiveView.tsx]
---

# Archive Screen UI Design (Kho lưu trữ hoạt động)

## 1. Overview
The "Lưu trữ" (Archive) screen serves as the knowledge repository of completed organization activities, past outcomes, and lessons learned.

## 2. Layout & Structure

### Header
- **Title**: "Kho lưu trữ hoạt động" (24px, font-weight: 600, token `color.text`).
- **Subtitle**: "Tìm kiếm kho tri thức chung của tổ chức." (14px, token `color.text.subtle`).

### Search Bar
- Prominent full-width search input with placeholder: "Tìm hoạt động, kết quả và bài học trước đây...".
- Responsive text input with subtle border and elevation styling.

### Empty State Container
- Raised card with subtle border and shadow:
  - Left icon: `InboxIcon` (@atlaskit/icon/core/inbox).
  - Title: "Không tìm thấy hoạt động lưu trữ" (15px, semi-bold).
  - Subtitle: "Hoạt động hoàn thành sẽ được đưa vào kho lưu trữ." (13px, subtle text).

## Lịch sử phiên bản
- 1.0 (2026-10-08): Khởi tạo tài liệu thiết kế giao diện Kho lưu trữ hoạt động.
