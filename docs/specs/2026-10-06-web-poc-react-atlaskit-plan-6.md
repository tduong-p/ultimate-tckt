---
doc_id: PLAN-POC-006
title: Kế hoạch triển khai — POC Frontend React (Sub-project 6 - Wireframe Layout)
version: 1.0
status: active
audience: [dev, ai]
owner: DYC
updated: 2026-10-06
related_code: []
---

# POC Frontend React Wireframe Layout Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Chuyển đổi cấu trúc layout của POC sang dạng "Left Rail + Sidebar + Main + Right + Bottom" đúng với wireframe yêu cầu. Bỏ Top Nav.

### Task 1: Tái cấu trúc PageLayout.tsx

**Files:**
- Modify: `cai-tien-frontend/src/shared/layouts/PageLayout.tsx`

- [ ] **Step 1: Xóa Top Navigation**

- [ ] **Step 2: Cấu trúc lại bằng Flexbox theo chuẩn mới**
  - Cột 1 (Left Rail): rộng 64px, chứa các icon (sử dụng SVG inline/text giả lập) và Avatar ở dưới cùng, kéo dài 100vh.
  - Cột 2 (Rest Area): Phần không gian còn lại (flex: 1, column).
    - Hàng 1 (Top Section): flex: 1, row.
      - Sidebar: rộng 240px.
      - Main Content: flex 1 (chứa `children`).
    - Hàng 2 (Bottom Bar): cao 32px, nằm dưới cùng.

- [ ] **Step 3: Commit**

```bash
git add cai-tien-frontend/src/shared/layouts/PageLayout.tsx
git commit -m "feat: implement wireframe layout with left rail and bottom bar"
```

### Task 2: Điều chỉnh lại MyTasks.tsx để tương thích

**Files:**
- Modify: `cai-tien-frontend/src/core/features/tasks/MyTasks.tsx`

- [ ] **Step 1: Gỡ bỏ viền/cách điệu không cần thiết**
Do `PageLayout` đã bọc ngoài, `MyTasks` giờ chỉ cần đảm nhận 2 phần: `Main Content` (trái) và `Right Side bar` (phải). Cần đảm bảo chiều cao 100% và overflow chuẩn xác.
Đảm bảo phần Main Content có Tabs ngang.

- [ ] **Step 2: Sửa Test nếu cần**

- [ ] **Step 3: Commit**

```bash
npm --prefix cai-tien-frontend run test
git add cai-tien-frontend/src/core/features/tasks/MyTasks.tsx
git commit -m "feat: adjust MyTasks layout to fit wireframe slots"
```

## Lịch sử phiên bản

| Version | Ngày | Thay đổi | Người |
|---|---|---|---|
| 1.0 | 2026-10-06 | Kế hoạch Wireframe Layout Sub-project 6 | DYC |

