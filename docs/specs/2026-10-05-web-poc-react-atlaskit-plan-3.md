---
doc_id: PLAN-POC-003
title: Kế hoạch triển khai — POC Frontend React (Sub-project 3 - Mock Data)
version: 1.1
status: deprecated
audience: [dev, ai]
owner: DYC
updated: 2026-10-09
related_code: []
---

# POC Frontend React Mock Data Implementation Plan

> **Đã ngừng dùng:** POC này đã được thay bằng module `web/` — xem [2026-10-07-frontend-migration.md](2026-10-07-frontend-migration.md). Giữ lại làm lịch sử, không làm theo.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thay thế gọi API thật bằng Mock Data trong `MyTasks.tsx` để hiển thị POC độc lập không cần Backend.

### Task 1: Thay thế fetchTasks bằng Mock Data

**Files:**
- Modify: `cai-tien-frontend/src/core/features/tasks/MyTasks.tsx`
- Modify: `cai-tien-frontend/src/core/features/tasks/MyTasks.test.tsx`

**Interfaces:**
- Produces: Màn hình My Tasks hiển thị Mock Data ngay lập tức.

- [ ] **Step 1: Cập nhật MyTasks Component**

Sửa hàm `fetchTasks` để trả về mảng dữ liệu giả lập (có setTimeout 500ms) bao gồm cả 3 phân loại. 

- [ ] **Step 2: Sửa Test cho Mock Data**

Đảm bảo `MyTasks.test.tsx` pass khi không còn gọi API thật.

- [ ] **Step 3: Commit**

```bash
git add cai-tien-frontend/src/core/features/tasks/
git commit -m "feat: use mock data for MyTasks to bypass backend auth"
```

## Lịch sử phiên bản

| Version | Ngày | Thay đổi | Người |
|---|---|---|---|
| 1.0 | 2026-10-05 | Kế hoạch tích hợp Mock Data Sub-project 3 | DYC |
| 1.1 | 2026-10-09 | Đánh dấu deprecated: POC đã được thay bằng module `web/` | DYC |
