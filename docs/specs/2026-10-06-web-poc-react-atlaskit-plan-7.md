---
doc_id: PLAN-POC-007
title: Kế hoạch triển khai — POC Frontend React (Sub-project 7 - Dark Mode & Mobile Responsive)
version: 1.0
status: active
audience: [dev, ai]
owner: DYC
updated: 2026-10-06
related_code: []
---

# POC Frontend React Dark Mode & Responsive Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thêm tính năng Dark/Light Mode và tối ưu hóa giao diện hiển thị tốt trên trình duyệt Mobile (Safari, Chrome).

### Task 1: Cấu hình Global CSS cho Responsive

**Files:**
- Create: `cai-tien-frontend/src/shared/styles/responsive.css`
- Modify: `cai-tien-frontend/src/core/main.tsx` (import file css)

- [ ] **Step 1: Viết CSS Media Queries**
Định nghĩa các class như `.desktop-only`, `.mobile-only`, `.mobile-col`, `.mobile-padding` để dễ dàng áp dụng lên các component mà không cần lạm dụng state `window.innerWidth`.
- `<= 768px`: Điện thoại.
- `> 768px`: Desktop.

- [ ] **Step 2: Import vào main.tsx**

- [ ] **Step 3: Commit**

```bash
git add cai-tien-frontend/src/shared/styles/ cai-tien-frontend/src/core/main.tsx
git commit -m "feat: add global responsive css classes"
```

### Task 2: Implement Dark/Light Mode Toggle & Mobile PageLayout

**Files:**
- Modify: `cai-tien-frontend/src/shared/layouts/PageLayout.tsx`

- [ ] **Step 1: Dark Mode State**
Sử dụng `setGlobalTheme` từ `@atlaskit/tokens`. Thêm một state `theme` ('light' | 'dark').
Thêm nút chuyển đổi Giao diện (Mặt trăng/Mặt trời) trên Top Nav.

- [ ] **Step 2: Responsive Top Nav**
- Thêm nút Hamburger menu (chỉ hiện trên Mobile `.mobile-only`) vào Top Nav.
- Ẩn thanh Search lớn trên Mobile (`.desktop-only`).

- [ ] **Step 3: Responsive Sidebar**
- Sidebar mặc định biến mất trên Mobile.
- Khi bấm Hamburger menu, Sidebar trượt ra dạng Overlay (z-index cao, fixed position).

- [ ] **Step 4: Commit**

```bash
git add cai-tien-frontend/src/shared/layouts/PageLayout.tsx
git commit -m "feat: implement dark mode toggle and responsive app shell"
```

### Task 3: Tối ưu hiển thị MyTasks trên Mobile

**Files:**
- Modify: `cai-tien-frontend/src/core/features/tasks/MyTasks.tsx`

- [ ] **Step 1: Sắp xếp lại Main Content & Right Sidebar**
Sử dụng class `.mobile-col` để đổi `flex-direction` từ `row` sang `column` trên Mobile (Right Sidebar sẽ bị đẩy xuống dưới cùng).

- [ ] **Step 2: Responsive Table/Grouped List**
Cho phép cuộn ngang (horizontal scroll) cho danh sách công việc trên màn hình nhỏ để không bị vỡ layout: `overflowX: auto`.

- [ ] **Step 3: Test & Commit**

```bash
npm --prefix cai-tien-frontend run test
git add cai-tien-frontend/src/core/features/tasks/MyTasks.tsx
git commit -m "feat: optimize MyTasks view for mobile screens"
```

## Lịch sử phiên bản

| Version | Ngày | Thay đổi | Người |
|---|---|---|---|
| 1.0 | 2026-10-06 | Kế hoạch Dark Mode & Mobile Responsive Sub-project 7 | DYC |

