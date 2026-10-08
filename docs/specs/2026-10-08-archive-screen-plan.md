---
doc_id: PLAN-ARCHIVE-001
title: Plan — Archive Screen UI Implementation
version: 1.0
status: active
audience: [dev, ai]
owner: DYC
updated: 2026-10-08
related_code: [web/src/core/features/archive/ArchiveView.tsx]
---

# Archive Screen Implementation Plan

## Tasks

### Task 1: Create ArchiveView Component
- Create `web/src/core/features/archive/ArchiveView.tsx`.
- Header: "Kho lưu trữ hoạt động" and subtitle.
- Search input with placeholder "Tìm hoạt động, kết quả và bài học trước đây...".
- Empty state card with `InboxIcon`, title "Không tìm thấy hoạt động lưu trữ", and subtitle note.

### Task 2: Unit Testing
- Create `web/src/core/features/archive/ArchiveView.test.tsx`.
- Test header rendering, search input, and empty state elements.

### Task 3: Navigation Integration
- Update `web/src/shared/layouts/PageLayout.tsx` for "Lưu trữ" (`archive`).
- Update `web/src/core/main.tsx` to mount `ArchiveView` when `currentView === 'archive'`.
- Run full test suite and verify UI in dev server.

## Lịch sử phiên bản
- 1.0 (2026-10-08): Khởi tạo kế hoạch triển khai giao diện Kho lưu trữ hoạt động.
