---
doc_id: SPEC-DOCS-001
title: Design — Documents Screen UI (Văn bản / Tài liệu)
version: 1.1
status: active
audience: [dev, ai]
owner: DYC
updated: 2026-10-08
related_code: [web/src/core/features/documents/DocumentsView.tsx]
---

# Documents Screen UI Design (Văn bản / Tài liệu)

## 1. Overview
The "Tài liệu" (Văn bản) screen provides a catalog of official links, decisions, and guidelines published by teams in TCKT.

## 2. Layout & Structure

### Header
- **Title**: "Văn bản"
- **Subtitle**: "Danh mục liên kết văn bản do các Tổ TCKT ban hành."
- **Action Button**: "+ Thêm văn bản" (Primary button)

### Search & Filters Toolbar
- **Search Bar**: "Tìm văn bản..."
- **Year Filter**: Dropdown "Tất cả các năm"
- **Team Filter**: Dropdown "Tất cả các Tổ"

### Content Area
- Empty state box:
  - Header: "Không tìm thấy văn bản"
  - Subtext: "Hãy thêm văn bản đầu tiên hoặc thay đổi bộ lọc."

## Lịch sử phiên bản
| Version | Ngày | Thay đổi | Người |
|---|---|---|---|
| 1.0 | 2026-10-08 | Khởi tạo tài liệu thiết kế giao diện Tài liệu / Văn bản | DYC |
| 1.1 | 2026-10-08 | Tích hợp React Query với API /api/documents và /api/teams, xóa mock | DYC |
