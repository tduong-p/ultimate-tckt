---
doc_id: PLAN-ACTMODAL-001
title: Kế hoạch triển khai — Create Activity Modal UI
version: 1.1
status: active
audience: [dev, ai]
owner: DYC
updated: 2026-10-08
related_code: [web/src/core/features/dashboard/CreateActivityModal.tsx]
---

# Create Activity Modal Implementation Plan

## Task 1: Create Modal Component Structure
- **File**: web/src/core/features/dashboard/CreateActivityModal.tsx
- **Actions**:
  - Implement the CreateActivityModal component using @atlaskit/modal-dialog.
  - Add the header with title and subtitle.
  - Setup the form grid layout.
- **Tests**: web/src/core/features/dashboard/CreateActivityModal.test.tsx (renders without crashing, shows title).

## Task 2: Implement Form Fields
- **File**: web/src/core/features/dashboard/CreateActivityModal.tsx
- **Actions**:
  - Add all form fields as per the spec using @atlaskit/textfield, @atlaskit/select, @atlaskit/checkbox, and @atlaskit/textarea.
  - Layout the fields in rows (1 column for full width, 2 columns for half width).
  - Add the full-width "Tạo đề xuất" button in the footer.
- **Tests**: Verify presence of key field labels (Tiêu đề, Loại hoạt động, Tổ chủ trì, v.v.).

## Task 3: Integrate with Dashboard
- **File**: web/src/core/features/dashboard/Dashboard.tsx
- **Actions**:
  - Add state isModalOpen to Dashboard component.
  - Wire up the + Đề xuất hoạt động button to open the modal.
  - Render <CreateActivityModal onClose={() => setIsModalOpen(false)} /> when isModalOpen is true.
- **Tests**: Update Dashboard.test.tsx to verify clicking the button opens the modal.

## Lịch sử phiên bản
| Version | Ngày | Thay đổi | Người |
|---|---|---|---|
| 1.0 | 2026-10-08 | Khởi tạo kế hoạch modal Đề xuất hoạt động | DYC |
| 1.1 | 2026-10-08 | Tích hợp mutation tạo hoạt động với API POST /api/activities | DYC |
