---
doc_id: SPEC-DOCS-001
title: Design — Documents Screen UI (Văn bản / Tài liệu)
version: 1.3
status: active
audience: [dev, ai]
owner: DYC
updated: 2026-10-09
related_code: [web/src/core/features/documents/DocumentsView.tsx]
---

# Documents Screen UI Design (Văn bản / Tài liệu)

## 1. Overview
The "Tài liệu" (Văn bản) screen provides a catalog of official links, decisions, and guidelines published by teams in TCKT. Signed-in users can add a link; users may edit a row only when its `can_edit` value from the API is true.

## 2. Layout & Structure

### Header
- **Title**: "Văn bản"
- **Subtitle**: "Danh mục liên kết văn bản do các Tổ TCKT ban hành."
- **Add action**: "+ Thêm văn bản" opens the shared add/edit form. A user must select an issuing team and provide a title and URL; the screen reports that a team membership is needed when no team is available.

### Search & Filters Toolbar
- **Search Bar**: "Tìm văn bản..."
- **Year Filter**: Dropdown "Tất cả các năm"
- **Team Filter**: Dropdown "Tất cả các Tổ"

### Content Area
- Empty state box:
  - Header: "Không tìm thấy văn bản"
  - Subtext: "Hãy thêm văn bản đầu tiên hoặc thay đổi bộ lọc."
- Each editable row shows a "Sửa" action. The server-provided `can_edit` field controls this action; the client does not infer edit permission from the current user role.
- The shared form accepts a link URL and does not upload files. After a successful save, the document list is refreshed.

## Lịch sử phiên bản
| Version | Ngày | Thay đổi | Người |
|---|---|---|---|
| 1.0 | 2026-10-08 | Khởi tạo tài liệu thiết kế giao diện Tài liệu / Văn bản | DYC |
| 1.1 | 2026-10-08 | Tích hợp React Query với API /api/documents và /api/teams, xóa mock | DYC |
| 1.2 | 2026-10-09 | Bỏ nút "+ Thêm văn bản" (chưa có chức năng); nút mở liên kết là một `LinkButton`; tìm kiếm debounce | DYC |
| 1.3 | 2026-10-09 | Thêm luồng thêm/sửa văn bản bằng liên kết, theo quyền `can_edit` do API trả về | DYC |
