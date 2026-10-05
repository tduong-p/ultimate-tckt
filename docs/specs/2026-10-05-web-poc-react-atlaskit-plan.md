---
doc_id: PLAN-POC-001
title: Kế hoạch triển khai — POC Frontend React + Atlaskit
version: 1.0
status: active
audience: [dev, ai]
owner: DYC
updated: 2026-10-05
related_code: []
---

# POC Frontend React + Atlaskit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Khởi tạo dự án đa ứng dụng (Multi-page app) bằng Vite tại thư mục `cai-tien-frontend`, cấu hình Atlassian Design System, và xây dựng màn hình "My Tasks" thử nghiệm.

**Architecture:** Sử dụng Vite multi-page cấu hình 2 HTML entry (`core.html`, `ctd.html`). Cả hai chia sẻ mã nguồn trong `src/shared/`. Giao tiếp với API qua Proxy Vite và `@tanstack/react-query`. Styling bằng `@atlaskit/tokens` và `@compiled/react`.

**Tech Stack:** React 18, TypeScript, Vite, @atlaskit/css-reset, @atlaskit/tokens, @atlaskit/dynamic-table, @tanstack/react-query, Vitest (cho testing).

**Spec:** `docs/specs/2026-10-05-web-poc-react-atlaskit-design.md`

## Global Constraints

- Mọi UI phải dùng token từ `@atlaskit/tokens`, cấm hardcode mã hex.
- Gọi API phải qua cấu hình Axios dùng chung.
- Mã nguồn đặt trong thư mục `cai-tien-frontend/` mới, không sửa mã nguồn gốc.
- Các component render không được crash khi dữ liệu API trả về rỗng hoặc lỗi.

## Review Focus

- API trả về mảng rỗng: Bảng phải hiện Empty State hợp lý.
- API trả về 500 hoặc mất kết nối mạng: React Query phải bắt được lỗi và giao diện phải hiển thị thông báo lỗi thân thiện (Flag/Banner) thay vì sập (White screen).
- Proxy Vite không khớp port thực tế: Đảm bảo proxy URL được ghi rõ hoặc đọc từ env để dev có thể đổi port nếu hệ Core chạy ở port khác.
- CSS Reset chưa được mount: Giao diện sẽ bị lệch font. Phải chắc chắn `css-reset` được import ở entry cao nhất.

---

### Task 1: Khởi tạo Project Vite & Vitest

**Files:**
- Create: `cai-tien-frontend/package.json`
- Create: `cai-tien-frontend/vite.config.ts`
- Create: `cai-tien-frontend/tsconfig.json`
- Create: `cai-tien-frontend/vitest.setup.ts`

**Interfaces:**
- Produces: Cấu trúc thư mục Node.js hợp lệ, lệnh `npm run dev` và `npm run test` hoạt động.

- [ ] **Step 1: Write the failing test** (Kiểm tra script chạy test có báo lỗi khi chưa có file config)

```bash
cd cai-tien-frontend && npx vitest run
```
Expected: FAIL (No config or files)

- [ ] **Step 2: Khởi tạo file cấu hình và package.json**

```json
// cai-tien-frontend/package.json
{
  "name": "cai-tien-frontend",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "test": "vitest run"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.20.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@vitejs/plugin-react": "^4.2.0",
    "typescript": "^5.2.2",
    "vite": "^5.0.0",
    "vitest": "^1.0.0",
    "jsdom": "^23.0.0",
    "@testing-library/react": "^14.0.0"
  }
}
```

- [ ] **Step 3: Cấu hình Vite & Vitest**

```typescript
// cai-tien-frontend/vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      input: {
        core: resolve(__dirname, 'core.html'),
        ctd: resolve(__dirname, 'ctd.html'),
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
  },
});
```

```typescript
// cai-tien-frontend/tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src", "vite.config.ts"]
}
```

```typescript
// cai-tien-frontend/vitest.setup.ts
import '@testing-library/react';
```

- [ ] **Step 4: Cài đặt packages và chạy test**

```bash
cd cai-tien-frontend
npm install
npm run test
```
Expected: PASS (No test files found, but vitest runs without config error)

- [ ] **Step 5: Commit**

```bash
git add cai-tien-frontend/
git commit -m "chore: setup vite and vitest for multi-page poc"
```

### Task 2: Cài đặt Atlassian Design System & React Query

**Files:**
- Modify: `cai-tien-frontend/package.json`
- Create: `cai-tien-frontend/src/shared/utils/api.ts`

**Interfaces:**
- Produces: Môi trường có sẵn các token của Atlassian và React Query.

- [ ] **Step 1: Cài đặt các gói Atlaskit**

```bash
cd cai-tien-frontend
npm install @atlaskit/css-reset @atlaskit/tokens @compiled/react @atlaskit/dynamic-table @atlaskit/lozenge @atlaskit/spinner @atlaskit/flag @tanstack/react-query axios
```

- [ ] **Step 2: Viết cấu hình API dùng chung**

```typescript
// cai-tien-frontend/src/shared/utils/api.ts
import axios from 'axios';

export const apiClient = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});
```

- [ ] **Step 3: Commit**

```bash
git add cai-tien-frontend/package.json cai-tien-frontend/package-lock.json cai-tien-frontend/src/shared/utils/api.ts
git commit -m "chore: install atlaskit, compiled/react and tanstack query"
```

### Task 3: Xây dựng Layout dùng chung và Entry Points

**Files:**
- Create: `cai-tien-frontend/src/shared/layouts/PageLayout.tsx`
- Create: `cai-tien-frontend/src/core/main.tsx`
- Create: `cai-tien-frontend/core.html`

**Interfaces:**
- Consumes: Cấu hình Vite.
- Produces: Điểm vào `core.html` chạy được trên trình duyệt với CSS Reset.

- [ ] **Step 1: Tạo PageLayout bọc CSS Reset**

```tsx
// cai-tien-frontend/src/shared/layouts/PageLayout.tsx
import React from 'react';
import '@atlaskit/css-reset';
import { token } from '@atlaskit/tokens';

export const PageLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div style={{ padding: token('space.200', '16px'), backgroundColor: token('color.background.default', '#FFF'), minHeight: '100vh' }}>
      <header style={{ marginBottom: token('space.300', '24px') }}>
        <h1 style={{ color: token('color.text', '#172B4D') }}>Ultimate TCKT</h1>
      </header>
      <main>{children}</main>
    </div>
  );
};
```

- [ ] **Step 2: Tạo HTML và Main file cho Core**

```html
<!-- cai-tien-frontend/core.html -->
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Core - Ultimate TCKT</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/core/main.tsx"></script>
  </body>
</html>
```

```tsx
// cai-tien-frontend/src/core/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PageLayout } from '../shared/layouts/PageLayout';

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <PageLayout>
        <h2>Core Dashboard (Placeholder)</h2>
      </PageLayout>
    </QueryClientProvider>
  </React.StrictMode>
);
```

- [ ] **Step 3: Commit**

```bash
git add cai-tien-frontend/src/shared/layouts/PageLayout.tsx cai-tien-frontend/src/core/main.tsx cai-tien-frontend/core.html
git commit -m "feat: setup core entry point and shared page layout"
```

### Task 4: Xây dựng màn hình "My Tasks"

**Files:**
- Create: `cai-tien-frontend/src/core/features/tasks/MyTasks.tsx`
- Create: `cai-tien-frontend/src/core/features/tasks/MyTasks.test.tsx`
- Modify: `cai-tien-frontend/src/core/main.tsx`

**Interfaces:**
- Consumes: `@tanstack/react-query`, `api.ts`, các component `@atlaskit`.
- Produces: Màn hình hoàn chỉnh hiển thị danh sách task từ API.

- [ ] **Step 1: Viết Test hiển thị State**

```tsx
// cai-tien-frontend/src/core/features/tasks/MyTasks.test.tsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MyTasks } from './MyTasks';

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

describe('MyTasks', () => {
  it('renders loading state initially', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MyTasks />
      </QueryClientProvider>
    );
    expect(screen.getByText('Loading tasks...')).toBeDefined();
  });
});
```

- [ ] **Step 2: Chạy test thất bại**

```bash
cd cai-tien-frontend && npx vitest run src/core/features/tasks/MyTasks.test.tsx
```
Expected: FAIL (Cannot find module './MyTasks')

- [ ] **Step 3: Cài đặt MyTasks với Atlaskit**

```tsx
// cai-tien-frontend/src/core/features/tasks/MyTasks.tsx
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import DynamicTable from '@atlaskit/dynamic-table';
import Spinner from '@atlaskit/spinner';
import Flag from '@atlaskit/flag';
import { apiClient } from '../../../shared/utils/api';

interface Task {
  id: number;
  title: string;
  status: string;
}

const fetchTasks = async (): Promise<Task[]> => {
  const { data } = await apiClient.get('/tasks/my-tasks');
  return data;
};

export const MyTasks: React.FC = () => {
  const { data, isLoading, isError } = useQuery({ queryKey: ['myTasks'], queryFn: fetchTasks });

  if (isLoading) return <div><Spinner size="large" /> <span>Loading tasks...</span></div>;

  if (isError) return <Flag appearance="error" id="error" title="Lỗi kết nối" description="Không thể tải danh sách công việc." />;

  const head = {
    cells: [
      { key: 'title', content: 'Tên công việc', isSortable: true },
      { key: 'status', content: 'Trạng thái', isSortable: false },
    ],
  };

  const rows = (data || []).map((task) => ({
    key: task.id.toString(),
    cells: [
      { key: task.id.toString(), content: task.title },
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

- [ ] **Step 4: Chạy test thành công**

```bash
cd cai-tien-frontend && npx vitest run src/core/features/tasks/MyTasks.test.tsx
```
Expected: PASS

- [ ] **Step 5: Nhúng MyTasks vào Core Main**

Thay đoạn `<h2>Core Dashboard (Placeholder)</h2>` trong `cai-tien-frontend/src/core/main.tsx` bằng `<MyTasks />`:

```tsx
// cai-tien-frontend/src/core/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PageLayout } from '../shared/layouts/PageLayout';
import { MyTasks } from './features/tasks/MyTasks';

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <PageLayout>
        <MyTasks />
      </PageLayout>
    </QueryClientProvider>
  </React.StrictMode>
);
```

- [ ] **Step 6: Commit**

```bash
git add cai-tien-frontend/src/core/features/tasks/ cai-tien-frontend/src/core/main.tsx
git commit -m "feat: build My Tasks screen using atlaskit dynamic table"
```
