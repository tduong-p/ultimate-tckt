---
doc_id: PLAN-POC-002
title: Kế hoạch triển khai — POC Frontend React (Sub-project 2 - API Integration)
version: 1.1
status: deprecated
audience: [dev, ai]
owner: DYC
updated: 2026-10-09
related_code: []
---

# POC Frontend React API Integration Implementation Plan

> **Đã ngừng dùng:** POC này đã được thay bằng module `web/` — xem [2026-10-07-frontend-migration.md](2026-10-07-frontend-migration.md). Giữ lại làm lịch sử, không làm theo.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tích hợp Auth Cookie và cập nhật API `/api/my-tasks-today` để đổ dữ liệu thật vào màn hình My Tasks.

**Architecture:** Sử dụng `withCredentials` trong Axios để trình duyệt tự gửi Session Cookie đã có từ Backend. Nhóm 3 mảng dữ liệu (dueToday, overdue, pendingMyReview) thành 1 danh sách hiển thị với cờ Phân loại.

**Tech Stack:** React 18, @tanstack/react-query, Axios, @atlaskit/lozenge.

**Spec:** `docs/specs/2026-10-05-web-poc-react-atlaskit-design.md`

## Global Constraints

- Mọi UI phải dùng token từ `@atlaskit/tokens`, cấm hardcode mã hex.
- Mã nguồn đặt trong thư mục `cai-tien-frontend/` mới.

## Review Focus

- API trả về mảng rỗng (không có task nào trong cả 3 loại): Bảng phải hiện Empty State.
- Cột "Phân loại" (Category): Phải render đúng loại Lozenge (appearance="new", "removed", "moved") theo nhóm dữ liệu.

---

### Task 1: Cấu hình Auth Cookie cho Axios

**Files:**
- Modify: `cai-tien-frontend/src/shared/utils/api.ts`

**Interfaces:**
- Produces: `apiClient` có khả năng tự động gửi session cookie.

- [ ] **Step 1: Cập nhật cấu hình axios**

```typescript
// cai-tien-frontend/src/shared/utils/api.ts
import axios from 'axios';

export const apiClient = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});
```

- [ ] **Step 2: Commit**

```bash
git add cai-tien-frontend/src/shared/utils/api.ts
git commit -m "feat: enable withCredentials on apiClient for session auth"
```

### Task 2: Cập nhật MyTasks.tsx để gọi API thật

**Files:**
- Modify: `cai-tien-frontend/src/core/features/tasks/MyTasks.tsx`
- Modify: `cai-tien-frontend/src/core/features/tasks/MyTasks.test.tsx`

**Interfaces:**
- Consumes: `apiClient`
- Produces: Màn hình My Tasks hiển thị dữ liệu từ `/api/my-tasks-today`.

- [ ] **Step 1: Viết Test kiểm tra cập nhật component (Mock API trả về rỗng)**

```tsx
// cai-tien-frontend/src/core/features/tasks/MyTasks.test.tsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi } from 'vitest';
import { MyTasks } from './MyTasks';
import { apiClient } from '../../../shared/utils/api';

vi.mock('../../../shared/utils/api', () => ({
  apiClient: {
    get: vi.fn(),
  },
}));

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

describe('MyTasks', () => {
  it('renders loading state initially', () => {
    (apiClient.get as any).mockResolvedValue({ data: { dueToday: [], overdue: [], pendingMyReview: [] } });
    render(
      <QueryClientProvider client={queryClient}>
        <MyTasks />
      </QueryClientProvider>
    );
    expect(screen.getByText('Loading tasks...')).toBeDefined();
  });
});
```

- [ ] **Step 2: Cập nhật MyTasks Component**

```tsx
// cai-tien-frontend/src/core/features/tasks/MyTasks.tsx
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import DynamicTable from '@atlaskit/dynamic-table';
import Spinner from '@atlaskit/spinner';
import Flag from '@atlaskit/flag';
import Lozenge from '@atlaskit/lozenge';
import { apiClient } from '../../../shared/utils/api';

interface Task {
  id: number;
  title: string;
  status: string;
  category: 'dueToday' | 'overdue' | 'pendingMyReview';
}

const fetchTasks = async (): Promise<Task[]> => {
  const { data } = await apiClient.get('/my-tasks-today');
  const allTasks: Task[] = [
    ...(data.overdue || []).map((t: any) => ({ ...t, category: 'overdue' as const })),
    ...(data.dueToday || []).map((t: any) => ({ ...t, category: 'dueToday' as const })),
    ...(data.pendingMyReview || []).map((t: any) => ({ ...t, category: 'pendingMyReview' as const })),
  ];
  return allTasks;
};

const renderCategory = (category: string) => {
  switch (category) {
    case 'overdue': return <Lozenge appearance="removed">Quá hạn</Lozenge>;
    case 'dueToday': return <Lozenge appearance="new">Hôm nay</Lozenge>;
    case 'pendingMyReview': return <Lozenge appearance="moved">Chờ duyệt</Lozenge>;
    default: return null;
  }
};

export const MyTasks: React.FC = () => {
  const { data, isLoading, isError } = useQuery({ queryKey: ['myTasks'], queryFn: fetchTasks });

  if (isLoading) return <div><Spinner size="large" /> <span>Loading tasks...</span></div>;
  if (isError) return <Flag appearance="error" id="error" title="Lỗi kết nối" description="Không thể tải danh sách công việc. Vui lòng đăng nhập ở backend (port 3000)." />;

  const head = {
    cells: [
      { key: 'category', content: 'Phân loại', isSortable: true },
      { key: 'title', content: 'Tên công việc', isSortable: true },
      { key: 'status', content: 'Trạng thái', isSortable: false },
    ],
  };

  const rows = (data || []).map((task) => ({
    key: task.id.toString(),
    cells: [
      { key: `${task.id}-cat`, content: renderCategory(task.category) },
      { key: `${task.id}-title`, content: task.title },
      { key: `${task.id}-status`, content: task.status },
    ],
  }));

  return (
    <div>
      <h3>Công việc của tôi</h3>
      <DynamicTable head={head} rows={rows} rowsPerPage={10} defaultPage={1} loadingSpinnerSize="large" emptyView={<div>Không có công việc nào</div>} />
    </div>
  );
};
```

- [ ] **Step 3: Chạy test thành công**

```bash
cd cai-tien-frontend && npx vitest run src/core/features/tasks/MyTasks.test.tsx
```
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add cai-tien-frontend/src/core/features/tasks/ cai-tien-frontend/src/shared/utils/api.ts
git commit -m "feat: integrate real my-tasks-today API and display categories"
```

## Lịch sử phiên bản

| Version | Ngày | Thay đổi | Người |
|---|---|---|---|
| 1.0 | 2026-10-05 | Kế hoạch tích hợp API Sub-project 2 | DYC |
| 1.1 | 2026-10-09 | Đánh dấu deprecated: POC đã được thay bằng module `web/` | DYC |
