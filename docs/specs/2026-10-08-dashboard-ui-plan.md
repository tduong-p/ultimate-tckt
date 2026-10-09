---
doc_id: PLAN-WEB-002
title: Kế hoạch triển khai — Dashboard UI (Atlassian Design System)
version: 1.4
status: active
audience: [dev, ai]
owner: AI
updated: 2026-10-09
related_code: [web/src/core/features/dashboard/Dashboard.tsx]
---

# Dashboard UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the 'Tổng quan' (Dashboard) static UI for the web module using Atlassian Design System.

**Architecture:** We will build a single page `Dashboard.tsx` with mocked data. It consists of a Header, KPI Cards row, and a 2-column main layout (Task widget on the left, Updates widgets on the right). We will hook it into `main.tsx` so it renders on screen.

**Tech Stack:** React, Vite, Vitest, @testing-library/react, @atlaskit components, TypeScript.

**Spec:** `docs/specs/2026-10-08-dashboard-ui-design.md`

## Global Constraints
- Target directory must be exactly `web/`.
- All components must use `@atlaskit/tokens` for colors, spacing, and typography to support Dark Mode natively.
- No real API integration; all data arrays will be hardcoded in the component or a local mock file.
- The large department title is EXPLICITLY REMOVED as requested.

## Review Focus
- **Dark Mode Support:** All hardcoded colors must use `token()` function from `@atlaskit/tokens`.
- **Responsive Layout:** The 2-column layout should use flex/grid to ensure it doesn't break on smaller screens.
- **Missing Atlassian Icons:** If specific icons are missing, fallback to generic Atlassian core icons.

---

### Task 1: Setup Dashboard Page & Header

**Files:**
- Create: `web/src/core/features/dashboard/Dashboard.tsx`
- Create: `web/src/core/features/dashboard/Dashboard.test.tsx`
- Modify: `web/src/core/main.tsx`

**Interfaces:**
- Produces: `<Dashboard />` React component

- [ ] **Step 1: Write the failing test**

```tsx
// web/src/core/features/dashboard/Dashboard.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Dashboard } from './Dashboard';

describe('Dashboard', () => {
  it('renders the greeting and header buttons', () => {
    render(<Dashboard />);
    expect(screen.getByText(/Xin chào Phạm Việt Bách/i)).toBeDefined();
    expect(screen.getByText('Đề xuất hoạt động')).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm --prefix web test`
Expected: FAIL with "Cannot find module './Dashboard'"

- [ ] **Step 3: Write minimal implementation**

Create `Dashboard.tsx` with just the header:
```tsx
import React from 'react';
import Button from '@atlaskit/button/new';
import { token } from '@atlaskit/tokens';

export const Dashboard: React.FC = () => {
  return (
    <div style={{ padding: '0', position: 'relative' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 600, color: token('color.text', '#172B4D') }}>
            Xin chào Phạm Việt Bách! Bạn có 0 nhiệm vụ cần làm.
          </h1>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button appearance="primary">Đề xuất hoạt động</Button>
          <Button appearance="default">Lịch sự kiện</Button>
          <Button appearance="default">Hoạt động</Button>
        </div>
      </div>
    </div>
  );
};
```

- [ ] **Step 4: Hook into main.tsx**
Modify `web/src/core/main.tsx` to render `<Dashboard />` instead of `<MyTasks />`.

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm --prefix web test`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add web/src/core/features/dashboard web/src/core/main.tsx
git commit -m "feat(web): setup Dashboard page and header"
```

### Task 2: Implement KPI Cards

**Files:**
- Modify: `web/src/core/features/dashboard/Dashboard.tsx`
- Modify: `web/src/core/features/dashboard/Dashboard.test.tsx`

- [ ] **Step 1: Write the failing test**

Add to `Dashboard.test.tsx`:
```tsx
  it('renders 4 KPI cards', () => {
    render(<Dashboard />);
    expect(screen.getByText('Hoạt động đang diễn ra')).toBeDefined();
    expect(screen.getByText('Nhiệm vụ đang mở')).toBeDefined();
    expect(screen.getByText('Nhiệm vụ quá hạn')).toBeDefined();
    expect(screen.getByText('Hiệu suất hoàn thành')).toBeDefined();
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm --prefix web test`
Expected: FAIL

- [ ] **Step 3: Write minimal implementation**

Add the KPI cards section below the header in `Dashboard.tsx` using CSS Grid (4 columns). Use `Lozenge` for badges, and placeholder text/icons for now.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm --prefix web test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add web/src/core/features/dashboard/Dashboard.tsx web/src/core/features/dashboard/Dashboard.test.tsx
git commit -m "feat(web): add KPI cards to Dashboard"
```

### Task 3: Implement Left Column (Task Widget)

**Files:**
- Modify: `web/src/core/features/dashboard/Dashboard.tsx`
- Modify: `web/src/core/features/dashboard/Dashboard.test.tsx`

- [ ] **Step 1: Write the failing test**

Add to `Dashboard.test.tsx`:
```tsx
  it('renders left column task widget', () => {
    render(<Dashboard />);
    expect(screen.getByText('Quản lý nhiệm vụ')).toBeDefined();
    expect(screen.getByText('Không tìm thấy công việc nào')).toBeDefined();
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm --prefix web test`
Expected: FAIL

- [ ] **Step 3: Write minimal implementation**

Create a 2-column flex layout below the KPIs. In the left column (flex: 1), add Tabs ('Cần làm', 'Hôm nay', 'Quá hạn', 'Đã xong', 'Tất cả'), a search input mock, and the Empty state message. 

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm --prefix web test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add web/src/core/features/dashboard/Dashboard.tsx web/src/core/features/dashboard/Dashboard.test.tsx
git commit -m "feat(web): add task widget to left column"
```

### Task 4: Implement Right Column (Updates Widgets)

**Files:**
- Modify: `web/src/core/features/dashboard/Dashboard.tsx`
- Modify: `web/src/core/features/dashboard/Dashboard.test.tsx`

- [ ] **Step 1: Write the failing test**

Add to `Dashboard.test.tsx`:
```tsx
  it('renders right column update widgets', () => {
    render(<Dashboard />);
    expect(screen.getByText('Lịch sự kiện & Deadline')).toBeDefined();
    expect(screen.getByText('Hoạt động đang diễn ra')).toBeDefined();
    expect(screen.getByText('Nhật ký hoạt động')).toBeDefined();
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm --prefix web test`
Expected: FAIL

- [ ] **Step 3: Write minimal implementation**

In the right column (width ~350px-400px), stack 3 cards. Implement the Calendar mock, the Ongoing Activities mock (using basic HTML/CSS or Atlassian tokens), and the Activity Stream mock with Avatar components.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm --prefix web test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add web/src/core/features/dashboard/Dashboard.tsx web/src/core/features/dashboard/Dashboard.test.tsx
git commit -m "feat(web): add updates widgets to right column"
```

## Lịch sử phiên bản
| Version | Ngày | Thay đổi | Người |
|---|---|---|---|
| 1.0 | 2026-10-08 | Khởi tạo kế hoạch cho trang Tổng quan | AI |
| 1.1 | 2026-10-08 | Kết nối Dashboard với API GET /api/bootstrap và xóa KPI mock | AI |
| 1.2 | 2026-10-09 | Thu hẹp `related_code` về các tệp thực sự do tài liệu này mô tả; SPEC-WEB-003 mở rộng (tài liệu vẫn active) | DYC |
| 1.3 | 2026-10-09 | Đợt 1 SPEC-WEB-003 đổi code liên quan; nội dung kế hoạch không đổi, xem spec tương ứng và SPEC-WEB-003 mục 4.1 | DYC |
| 1.4 | 2026-10-09 | Đợt 2 SPEC-WEB-003 đổi code liên quan (kết nối chi tiết công việc); xem spec tương ứng | DYC |
