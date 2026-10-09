---
doc_id: PLAN-DOCS-001
title: Plan — Documents Screen UI Implementation
version: 1.3
status: active
audience: [dev, ai]
owner: DYC
updated: 2026-10-10
related_code: [web/src/core/features/documents/DocumentsView.tsx]
---

# Documents Screen Implementation Plan

## Tasks

### Task 1: Create DocumentsView Component
- Create `web/src/core/features/documents/DocumentsView.tsx`.
- Header: "Văn bản", subtitle, and "+ Thêm văn bản" button.
- Toolbar: Search input and 2 Select filters ("Tất cả các năm", "Tất cả các Tổ").
- Empty state container with clean typography.

### Task 2: Unit Testing
- Create `web/src/core/features/documents/DocumentsView.test.tsx`.
- Test header rendering, search bar, and empty state.

### Task 3: Navigation Integration
- Update `web/src/shared/layouts/PageLayout.tsx` for "Tài liệu" (`documents`).
- Update `web/src/core/main.tsx` to mount `DocumentsView` when `currentView === 'documents'`.
- Run full test suite.

### Task 4: Add and Edit Documents
- Add a shared `DocumentFormModal` for creating and editing documents using link URLs only.
- Show the add action to signed-in users. Show the edit action only when the document row's API-provided `can_edit` is true.
- Use `issueTeams` from the documents API for issuing-team selection and refresh the document query after a successful save.
- Test form validation, unavailable team membership, create/edit payloads, and action visibility.

## Lịch sử phiên bản
| Version | Ngày | Thay đổi | Người |
|---|---|---|---|
| 1.0 | 2026-10-08 | Khởi tạo kế hoạch triển khai giao diện Tài liệu / Văn bản | DYC |
| 1.1 | 2026-10-08 | Tích hợp React Query với API /api/documents và /api/teams, xóa mock | DYC |
| 1.2 | 2026-10-09 | Bổ sung Task 4: hộp thêm/sửa tài liệu bằng liên kết và quyền sửa theo `can_edit` từ API | DYC |
| 1.3 | 2026-10-10 | Ghi nhận tích hợp đợt 4 với điều hướng và quản trị đợt 3 | DYC |
