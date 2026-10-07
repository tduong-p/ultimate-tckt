---
doc_id: PLAN-POC-008
title: Kế hoạch triển khai — POC Frontend React (Sub-project 8 - Full Atlassian Design System)
version: 1.0
status: active
audience: [dev, ai]
owner: DYC
updated: 2026-10-06
related_code: []
---

# Full Atlassian Design System Implementation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Chuyển đổi toàn bộ giao diện từ HTML thuần (div, header, ul, li) sang sử dụng bộ components chuẩn 100% của Atlassian.

### Task 1: Cài đặt các Package bổ sung

**Command:**
- [ ] Chạy lệnh `npm --prefix cai-tien-frontend install @atlaskit/page-layout @atlaskit/atlassian-navigation @atlaskit/menu @atlaskit/badge @atlaskit/tabs`
- [ ] Chạy lệnh `npm --prefix cai-tien-frontend install @atlaskit/logo` (nếu cần cho Atlassian Navigation)
- [ ] Commit thay đổi.

### Task 2: Refactor PageLayout.tsx

**Files:**
- Modify: `cai-tien-frontend/src/shared/layouts/PageLayout.tsx`

**Công việc:**
- [ ] Import `PageLayout`, `Main`, `TopNavigation`, `LeftSidebar` từ `@atlaskit/page-layout`.
- [ ] Import `AtlassianNavigation`, `PrimaryButton`, `ProductHome` từ `@atlaskit/atlassian-navigation`.
- [ ] Import `Navigation`, `HeadingItem`, `ButtonItem`, `Section` từ `@atlaskit/menu`.
- [ ] Sử dụng `<AtlassianNavigation>` để thay thế thẻ `<header>`.
- [ ] Sử dụng `<Navigation>` và `<ButtonItem>` để render các mục menu (Tổng quan, Việc hôm nay...) kèm theo Atlassian Icons đã cấu hình từ trước.
- [ ] Khôi phục tính năng Toggle Theme.
- [ ] Cập nhật Responsive CSS nều cần, nhưng cố gắng dùng thuộc tính của `PageLayout`.
- [ ] Commit thay đổi.

### Task 3: Refactor MyTasks.tsx

**Files:**
- Modify: `cai-tien-frontend/src/core/features/tasks/MyTasks.tsx`

**Công việc:**
- [ ] Import `Tabs`, `TabList`, `Tab`, `TabPanel` từ `@atlaskit/tabs`.
- [ ] Thay thế các tab thủ công (My Tasks / My Approvals / Follows) bằng component `Tabs`.
- [ ] Tích hợp `Badge` từ `@atlaskit/badge` vào tiêu đề tab.
- [ ] Đảm bảo test `MyTasks.test.tsx` không bị lỗi do thiếu context.
- [ ] Commit thay đổi.

## Lịch sử phiên bản

| Version | Ngày | Thay đổi | Người |
|---|---|---|---|
| 1.0 | 2026-10-06 | Kế hoạch Full Atlassian Design System Sub-project 8 | DYC |

