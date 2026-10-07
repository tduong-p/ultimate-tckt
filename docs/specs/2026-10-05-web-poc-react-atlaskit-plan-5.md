---
doc_id: PLAN-POC-005
title: Kế hoạch triển khai — POC Frontend React (Sub-project 5 - Full Jira UI Clone)
version: 1.0
status: active
audience: [dev, ai]
owner: DYC
updated: 2026-10-05
related_code: []
---

# POC Frontend React Full Jira UI Clone Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Đập đi xây lại layout để giống hệt bản thiết kế Jira-like complex UI (Top Nav trắng, Left Sidebar, Grouped Table, Right Sidebar).

### Task 1: Xây dựng App Shell (Top Nav & Left Sidebar)

**Files:**
- Modify: `cai-tien-frontend/src/shared/layouts/PageLayout.tsx`

- [ ] **Step 1: CSS Grid Layout**

Dùng CSS Grid/Flexbox để dựng khung: Top Nav (h=56px, nền trắng), Left Sidebar (w=240px, nền xám nhạt), Main Content.

- [ ] **Step 2: Top Nav**

Nền trắng, có Logo "TCKT", ô Search ở giữa (nền xám nhạt), nút "Tạo mới" màu xanh. Phía phải là các icon Avatar, Cài đặt.

- [ ] **Step 3: Left Sidebar**

Danh sách menu dọc: "Công việc của tôi", "Giao cho tôi", "Kế hoạch", "Hoạt động" (expandable), "Mục tiêu".

- [ ] **Step 4: Commit**

```bash
git add cai-tien-frontend/src/shared/layouts/PageLayout.tsx
git commit -m "feat: build full Jira-like app shell with top nav and left sidebar"
```

### Task 2: Xây dựng Page Header & Tabs

**Files:**
- Modify: `cai-tien-frontend/src/core/features/tasks/MyTasks.tsx`

- [ ] **Step 1: Project Header**

Thêm icon xanh to "Tiếp sức mùa thi", các thống kê nhỏ (6 hoạt động đang chạy...).

- [ ] **Step 2: Tabs Navigation**

Dòng thời gian, Kế hoạch, Danh sách (active, gạch chân xanh), Bảng...

- [ ] **Step 3: Toolbar**

Ô tìm kiếm nội bộ, cục Avatar những người tham gia, nút "Bộ lọc", "Chia sẻ".

- [ ] **Step 4: Commit**

```bash
git add cai-tien-frontend/src/core/features/tasks/MyTasks.tsx
git commit -m "feat: build project header, tabs, and toolbar in MyTasks"
```

### Task 3: Xây dựng Grouped Task List & Right Sidebar

**Files:**
- Modify: `cai-tien-frontend/src/core/features/tasks/MyTasks.tsx`
- Modify: `cai-tien-frontend/src/core/features/tasks/MyTasks.test.tsx` (cập nhật test)

- [ ] **Step 1: Right Sidebar**

Dựng cột bên phải (w=260px) chứa các khối "BỘ LỌC", "NGƯỜI THỰC HIỆN" (cụm Avatar màu sắc), "MỤC TIÊU".

- [ ] **Step 2: Grouped Task Table**

Bỏ `DynamicTable` mặc định, tự build bảng bằng thẻ `table` hoặc CSS Grid để gom nhóm:
- Nhóm 1: "Cần bạn xử lý (5)" (Icon mũi tên xuống, background xám nhạt)
- Các dòng: Checkbox, Icon vuông (TCK-31), Tên việc, Lozenge Trạng Thái, Lozenge Avatar+Name, Hạn.
- Nút "+ Tạo công việc" cuối nhóm.

- [ ] **Step 3: Fix Test & Commit**

```bash
npm --prefix cai-tien-frontend run test
git add cai-tien-frontend/src/core/features/tasks/
git commit -m "feat: build grouped task list and right filters sidebar"
```

## Lịch sử phiên bản

| Version | Ngày | Thay đổi | Người |
|---|---|---|---|
| 1.0 | 2026-10-05 | Kế hoạch Jira UI Clone Sub-project 5 | DYC |

