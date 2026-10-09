---
doc_id: PLAN-WEBP0-001
title: Kế hoạch triển khai — web/ đợt 0 (nền tảng: router, tầng API, thành phần dùng chung)
version: 1.0
status: active
audience: [dev, ai]
owner: DYC
updated: 2026-10-09
related_code: []
---

# web/ đợt 0 — Nền tảng Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dựng nền chung cho mọi đợt sau của SPEC-WEB-003: hash router cùng đường dẫn với UI cũ, tầng API tách theo miền với một hàm dịch lỗi, hook quyền, các thành phần dùng chung và bộ chọn đơn vị.

**Architecture:** `App` bọc `HashRouter` (react-router-dom 6.30, tự thêm `/` cho `#calendar` → `/calendar`). Quyền tính bằng hàm thuần `deriveCapabilities(session, bootstrap)` và hook `useCapabilities()` đọc cache `['session']` và `['core-bootstrap']`. Thành phần dùng chung nằm ở `web/src/shared/components/`, không gọi API. Bộ chọn đơn vị nằm ở `web/src/core/features/session/` vì gọi API Core.

**Tech Stack:** React 18, TypeScript, Vite, Vitest + jsdom + @testing-library/react 14, @tanstack/react-query 5, react-router-dom 6.30, Atlaskit (`flag` 19, `modal-dialog`, `button/new`, `textfield`, `textarea`, `select`, `progress-bar`, `menu`, `icon/core/*`).

**Spec:** `docs/specs/2026-10-09-web-hoan-thien-thay-the-design.md` (SPEC-WEB-003, mục 3). ADR: `docs/adr/0016-web-thay-the-frontend-core.md`.

## Global Constraints

- Chỉ tiếng Việt trong giao diện; không có nút đổi ngôn ngữ.
- Chỉ dùng link cho tài liệu/minh chứng; không làm ô tải tệp.
- Không đổi API Core trong đợt này (đợt 0 không chạm `core/`).
- Ẩn/hiện theo quyền bắt chước điều kiện server: `isExecutive` = vai trò `admin`/`vice_admin` ở `user.role` **hoặc** vai trò đơn vị hiện tại; `isLeadership` = `leader`/`vice_leader` tương tự (`core/src/middleware/auth.js`).
- Route giữ đúng tên UI cũ: `dashboard`, `my-tasks-today`, `calendar`, `activities`, `my-tasks`, `teams`, `people`, `documents`, `reports`, `archive` (đợt 0); các route còn lại thêm ở đợt sau.
- Route không có quyền → chuyển về `#/dashboard`. Route lạ → trang "Không tìm thấy trang".
- Lỗi API hiện qua `apiErrorMessage(err)`; không có `response` → "Không kết nối được máy chủ. Vui lòng thử lại."
- Bộ chọn đơn vị chỉ hiện khi `session.units.memberships.length >= 2`; chọn xong gọi `POST /api/session/unit`, xoá/tải lại mọi query trừ `session`.
- Kiểm tra trước khi báo xong: `cd web && npm test && npm run build` xanh; `npm run docs:index && npm run docs:check -- --base origin/staging` xanh **sau khi commit**.
- Commit kết thúc bằng `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

- Link cũ dạng `#calendar` (không có `/`) mở thẳng đúng màn — pin bằng test trong Task 8.
- Người không phải quản lý gõ tay `#/reports` → về Tổng quan, không thấy màn Báo cáo dù chỉ thoáng qua — test trong Task 8.
- Đổi đơn vị lỗi (403 "Bạn không thuộc đơn vị này.") → hiện toast lỗi, giữ nguyên đơn vị cũ và cache — test trong Task 9.
- Tìm người gõ không dấu ("nguyen") vẫn ra "Nguyễn", gõ "d" ra "Đ" — test trong Task 6.
- Hộp lý do bắt buộc: chỉ gõ khoảng trắng thì không gửi — test trong Task 5.

---

## File Structure

| File | Trách nhiệm |
|---|---|
| `web/src/core/api/errorMessages.ts` (mới) | Bảng duy nhất dịch câu lỗi tiếng Anh của Core |
| `web/src/core/api/errors.ts` (mới) | `ApiError`, `translateServerError`, `apiErrorMessage` |
| `web/src/core/api/session.ts` (mới) | `fetchSession`, `fetchBootstrap`, `loginUser`, `logoutUser`, onboarding, `switchUnit` |
| `web/src/core/api/activities.ts` (mới) | `fetchActivities`, `createActivity`, `fetchArchive` |
| `web/src/core/api/teams.ts` (mới) | `fetchTeams` |
| `web/src/core/api/users.ts` (mới) | `fetchMembers` |
| `web/src/core/api/tasks.ts` (mới) | `fetchMyTasksToday` |
| `web/src/core/api/documents.ts` (mới) | `fetchDocuments` |
| `web/src/core/api/reports.ts` (mới) | `getReportExportUrl`, `downloadReportExport` |
| `web/src/core/api/index.ts` (sửa) | Chỉ re-export |
| `web/src/core/queryKeys.ts` (mới) | `SESSION_KEY`, `BOOTSTRAP_KEY` |
| `web/src/core/capabilities.ts` (mới) | `deriveCapabilities`, `useCapabilities` |
| `web/src/shared/utils/text.ts` (mới) | `normalizeSearch` |
| `web/src/shared/utils/url.ts` (mới) | `isHttpUrl` |
| `web/src/shared/utils/bytes.ts` (mới) | `formatBytes` |
| `web/src/shared/components/Toast.tsx` (mới) | `ToastProvider`, `useToast` |
| `web/src/shared/components/ConfirmDialog.tsx` (mới) | Hộp xác nhận, tuỳ chọn gõ lại để xác nhận |
| `web/src/shared/components/ReasonDialog.tsx` (mới) | Hộp nhập lý do |
| `web/src/shared/components/PeoplePicker.tsx` (mới) | Chọn nhiều người, tìm không dấu, chip |
| `web/src/shared/components/LinkField.tsx` (mới) | Ô link kiểm http(s) |
| `web/src/shared/components/QuotaBar.tsx` (mới) | Thanh dung lượng / 50 MB |
| `web/src/shared/layouts/PageLayout.tsx` (sửa) | Menu dùng router, khe `headerExtras` |
| `web/src/core/AppRoutes.tsx` (mới) | Bảng route + chặn quyền |
| `web/src/core/features/notFound/NotFoundView.tsx` (mới) | Trang "Không tìm thấy trang" |
| `web/src/core/features/session/UnitSwitcher.tsx` (mới) | Bộ chọn đơn vị |
| `web/src/core/main.tsx` (sửa) | `HashRouter`, `ToastProvider`, dùng `AppRoutes` |

Mọi lệnh test chạy trong `web/`. Chạy một file: `npx vitest run <đường dẫn>`.

---

### Task 1: Bảng dịch lỗi và `apiErrorMessage`

**Files:**
- Create: `web/src/core/api/errorMessages.ts`, `web/src/core/api/errors.ts`
- Test: `web/src/core/api/errors.test.ts`
- Modify: `web/src/core/api/index.ts` (bỏ `VI_ERROR_MESSAGES` và `class ApiError`, import từ `./errors`), `web/src/core/features/auth/OnboardingView.tsx` (bỏ `VI_ERRORS`), `web/src/core/features/dashboard/CreateActivityModal.tsx` (bỏ `VI_CREATE_ERRORS`)

**Interfaces:**
- Produces: `VI_ERROR_MESSAGES: Record<string,string>`; `class ApiError extends Error { response: { status?: number } }`; `translateServerError(message: string): string`; `apiErrorMessage(err: unknown, fallback?: string): string`; hằng `NETWORK_ERROR_MESSAGE = 'Không kết nối được máy chủ. Vui lòng thử lại.'`, `DEFAULT_ERROR_MESSAGE = 'Không thực hiện được thao tác. Vui lòng thử lại.'`.

- [ ] **Step 1: Viết test hỏng**

```ts
// web/src/core/api/errors.test.ts
import { describe, it, expect } from 'vitest';
import { ApiError, apiErrorMessage, translateServerError, NETWORK_ERROR_MESSAGE, DEFAULT_ERROR_MESSAGE } from './errors';

const axiosLike = (status: number, error?: unknown) => ({ response: { status, data: error === undefined ? {} : { error } } });

describe('apiErrorMessage', () => {
  it('dịch câu tiếng Anh đã biết của Core', () => {
    expect(apiErrorMessage(axiosLike(403, 'You do not have permission for this action.'))).toBe(
      'Bạn không có quyền thực hiện thao tác này.'
    );
  });

  it('giữ nguyên câu lạ (kể cả câu tiếng Việt server đã trả)', () => {
    expect(apiErrorMessage(axiosLike(403, 'Bạn không thuộc đơn vị này.'))).toBe('Bạn không thuộc đơn vị này.');
  });

  it('không có response thì báo không kết nối được máy chủ', () => {
    expect(apiErrorMessage(new Error('Network Error'))).toBe(NETWORK_ERROR_MESSAGE);
  });

  it('có response nhưng không có error thì dùng fallback', () => {
    expect(apiErrorMessage(axiosLike(500))).toBe(DEFAULT_ERROR_MESSAGE);
    expect(apiErrorMessage(axiosLike(500), 'Không lưu được.')).toBe('Không lưu được.');
  });

  it('ApiError đã dịch sẵn thì trả nguyên message', () => {
    expect(apiErrorMessage(new ApiError('Khoảng thời gian báo cáo không hợp lệ.', 400))).toBe(
      'Khoảng thời gian báo cáo không hợp lệ.'
    );
  });

  it('bảng gộp đủ câu của báo cáo, tạo đề xuất và onboarding', () => {
    expect(translateServerError('Choose a valid report date range.')).toBe('Khoảng thời gian báo cáo không hợp lệ.');
    expect(translateServerError('Complete all required fields and select at least one team.')).toBe(
      'Vui lòng điền đủ các trường bắt buộc và chọn ít nhất một Tổ.'
    );
    expect(translateServerError('Class number is required and must not exceed 100 characters.')).toBe(
      'Số lớp là bắt buộc và không quá 100 ký tự.'
    );
  });
});
```

- [ ] **Step 2: Chạy, xác nhận hỏng**

Run: `npx vitest run src/core/api/errors.test.ts`
Expected: FAIL — `Failed to resolve import "./errors"`.

- [ ] **Step 3: Viết code**

```ts
// web/src/core/api/errorMessages.ts
// Bảng duy nhất dịch các câu lỗi tiếng Anh của Core sang tiếng Việt. Câu không có trong bảng được hiện nguyên văn.
export const VI_ERROR_MESSAGES: Record<string, string> = {
  // Chung
  'You do not have permission for this action.': 'Bạn không có quyền thực hiện thao tác này.',
  'Please sign in to continue.': 'Vui lòng đăng nhập để tiếp tục.',
  'Administrator access is required.': 'Chỉ quản trị viên được thực hiện thao tác này.',
  'No valid fields supplied.': 'Không có thông tin hợp lệ để lưu.',
  // Báo cáo
  'Choose a valid report date range.': 'Khoảng thời gian báo cáo không hợp lệ.',
  'No reportable teams are available.': 'Bạn chưa quản lý Tổ nào để xuất báo cáo.',
  'You cannot export a report for this team.': 'Bạn không có quyền xuất báo cáo của Tổ này.',
  // Tạo đề xuất hoạt động
  'Complete all required fields and select at least one team.':
    'Vui lòng điền đủ các trường bắt buộc và chọn ít nhất một Tổ.',
  'Team leaders and vice leaders may only propose work for teams they lead.':
    'Tổ trưởng/Tổ phó chỉ được đề xuất cho các Tổ mình phụ trách.',
  'The activity proposal document must be a valid http:// or https:// link.':
    'Liên kết văn bản đề xuất phải bắt đầu bằng http:// hoặc https://.',
  'The public image must be a valid http:// or https:// link.':
    'Liên kết ảnh công khai phải bắt đầu bằng http:// hoặc https://.',
  // Onboarding HUST
  'Class number is required and must not exceed 100 characters.': 'Số lớp là bắt buộc và không quá 100 ký tự.',
  'The entrance year could not be inferred from this student email address.':
    'Không xác định được khóa học từ email sinh viên này. Vui lòng liên hệ quản trị viên.',
  'This information is only for HUST student accounts.': 'Thông tin này chỉ dành cho tài khoản sinh viên HUST.',
  'This notice is only for HUST staff and faculty accounts.':
    'Thông báo này chỉ dành cho tài khoản cán bộ, giảng viên HUST.',
};
```

```ts
// web/src/core/api/errors.ts
import { VI_ERROR_MESSAGES } from './errorMessages';

export const NETWORK_ERROR_MESSAGE = 'Không kết nối được máy chủ. Vui lòng thử lại.';
export const DEFAULT_ERROR_MESSAGE = 'Không thực hiện được thao tác. Vui lòng thử lại.';

/** Lỗi API đã có thông điệp tiếng Việt, vẫn giữ `response.status` để lớp phiên nhận ra 401. */
export class ApiError extends Error {
  response: { status?: number };

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'ApiError';
    this.response = { status };
  }
}

export function translateServerError(message: string): string {
  return VI_ERROR_MESSAGES[message] ?? message;
}

/** Câu lỗi tiếng Việt để hiện cho người dùng từ một lỗi axios/ApiError bất kỳ. */
export function apiErrorMessage(err: unknown, fallback: string = DEFAULT_ERROR_MESSAGE): string {
  if (err instanceof ApiError) return err.message;
  const response = (err as { response?: { data?: { error?: unknown } } } | null)?.response;
  if (!response) return NETWORK_ERROR_MESSAGE;
  const serverError = response.data?.error;
  return typeof serverError === 'string' && serverError.trim() ? translateServerError(serverError) : fallback;
}
```

Trong `web/src/core/api/index.ts`: xoá khối `VI_ERROR_MESSAGES` và `class ApiError`; thêm `import { ApiError, translateServerError } from './errors';` và `export * from './errors';`; trong `downloadReportExport` thay `VI_ERROR_MESSAGES[parsed.error] ?? String(parsed.error)` bằng `translateServerError(String(parsed.error))`.

Trong `OnboardingView.tsx`: xoá `VI_ERRORS` và thân hàm `errorMessage` cũ, thay bằng
```ts
import { apiErrorMessage } from '../../api';
function errorMessage(err: unknown): string {
  return apiErrorMessage(err, 'Không lưu được thông tin. Vui lòng thử lại.');
}
```

Trong `CreateActivityModal.tsx`: xoá `VI_CREATE_ERRORS`, thay khối `serverError`/`mutationError` bằng
```ts
const mutationError = apiErrorMessage(createMutation.error, 'Không thể tạo đề xuất. Vui lòng kiểm tra lại thông tin.');
```
(thêm `apiErrorMessage` vào import từ `'../../api'`).

- [ ] **Step 4: Chạy test**

Run: `npx vitest run src/core/api src/core/features/auth src/core/features/dashboard`
Expected: PASS. Nếu một test cũ của `CreateActivityModal`/`OnboardingView` mong câu chung khi lỗi **không có** `response`, sửa test đó mong `NETWORK_ERROR_MESSAGE` (đây là hành vi mới theo spec 3.2) và ghi lý do trong commit.

- [ ] **Step 5: Commit**

```bash
git add web/src/core/api web/src/core/features/auth/OnboardingView.tsx web/src/core/features/dashboard/CreateActivityModal.tsx web/src/core/features/auth/*.test.tsx web/src/core/features/dashboard/*.test.tsx
git commit -m "feat(web): gộp bảng dịch lỗi và thêm apiErrorMessage dùng chung"
```

---

### Task 2: Tách tầng API theo miền, thêm `switchUnit`

**Files:**
- Create: `web/src/core/api/session.ts`, `activities.ts`, `teams.ts`, `users.ts`, `tasks.ts`, `documents.ts`, `reports.ts`
- Test: `web/src/core/api/session.test.ts`
- Modify: `web/src/core/api/index.ts` (chỉ còn re-export)

**Interfaces:**
- Consumes: `ApiError`, `translateServerError` (Task 1).
- Produces: mọi hàm hiện có giữ nguyên tên/chữ ký; thêm `switchUnit(unitId: number): Promise<SessionData>` (`POST /api/session/unit {unit_id}`). `index.ts` = `export * from './types'; export * from './errors'; export * from './session'; …`.

- [ ] **Step 1: Viết test hỏng**

```ts
// web/src/core/api/session.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiClient } from '../../shared/utils/api';
import { switchUnit } from './session';

vi.mock('../../shared/utils/api', () => ({ apiClient: { get: vi.fn(), post: vi.fn() } }));

describe('switchUnit', () => {
  beforeEach(() => vi.clearAllMocks());

  it('gọi POST /session/unit với unit_id và trả session mới', async () => {
    const session = { user: { id: 1, name: 'A', email: 'a@x', role: 'member' }, units: { current: null, memberships: [] } };
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: session });
    await expect(switchUnit(7)).resolves.toEqual(session);
    expect(apiClient.post).toHaveBeenCalledWith('/session/unit', { unit_id: 7 });
  });
});
```

- [ ] **Step 2: Chạy, xác nhận hỏng**

Run: `npx vitest run src/core/api/session.test.ts` — Expected: FAIL (không resolve `./session`).

- [ ] **Step 3: Tách file**

Chuyển **nguyên văn** (kể cả JSDoc) các hàm từ `index.ts` sang file miền:
- `session.ts`: `fetchSession`, `fetchBootstrap`, `loginUser`, `logoutUser`, `submitStudentClass`, `acknowledgeFacultyNotice`, và thêm:
  ```ts
  /**
   * Đổi đơn vị đang làm việc.
   * Endpoint: POST /api/session/unit
   */
  export async function switchUnit(unitId: number): Promise<SessionData> {
    const response = await apiClient.post<SessionData>('/session/unit', { unit_id: unitId });
    return response.data;
  }
  ```
- `activities.ts`: `fetchActivities`, `createActivity`, `fetchArchive`.
- `teams.ts`: `fetchTeams`. `users.ts`: `fetchMembers`. `tasks.ts`: `fetchMyTasksToday`. `documents.ts`: `fetchDocuments`.
- `reports.ts`: `readBlobText` (không export), `reportExportParams` (không export), `getReportExportUrl`, `downloadReportExport` (import `ApiError`, `translateServerError` từ `./errors`).

Mỗi file import `apiClient` từ `'../../shared/utils/api'` và kiểu từ `'./types'`. `index.ts` còn đúng:
```ts
export * from './types';
export * from './errors';
export * from './session';
export * from './activities';
export * from './teams';
export * from './users';
export * from './tasks';
export * from './documents';
export * from './reports';
```

- [ ] **Step 4: Chạy toàn bộ test**

Run: `npm test` — Expected: PASS (gồm `index.test.ts` cũ không sửa, chứng minh re-export đủ). Run `npx tsc --noEmit -p .` — Expected: không lỗi.

- [ ] **Step 5: Commit**

```bash
git add web/src/core/api
git commit -m "refactor(web): tách tầng API Core theo miền, thêm switchUnit"
```

---

### Task 3: Query key dùng chung và `useCapabilities`

**Files:**
- Create: `web/src/core/queryKeys.ts`, `web/src/core/capabilities.ts`
- Test: `web/src/core/capabilities.test.tsx`
- Modify: `web/src/core/main.tsx` (dùng `SESSION_KEY`, `BOOTSTRAP_KEY` từ `./queryKeys` thay cho hằng cục bộ và `['core-bootstrap']`)

**Interfaces:**
- Consumes: `fetchSession`, `fetchBootstrap`, kiểu `SessionData`, `BootstrapData`, `SessionUnit`, `SessionMembership` (Task 2).
- Produces:
  ```ts
  export const SESSION_KEY = ['session'] as const;
  export const BOOTSTRAP_KEY = ['core-bootstrap'] as const;
  export interface Capabilities {
    role: string | null;            // session.user.role
    unit: SessionUnit | null;       // session.units.current
    unitRole: string | null;        // role của membership có unit_id === unit.id
    memberships: SessionMembership[];
    isExec: boolean;                // admin|vice_admin ở role hoặc unitRole
    isManager: boolean;             // isExec || leader|vice_leader ở role hoặc unitRole
    canCreateActivity: boolean;     // bootstrap.capabilities.canCreateActivity
    canCreateAccount: boolean;      // bootstrap.capabilities.canCreateAccount
    canManageTeam: (teamId: number) => boolean; // isExec || bootstrap.teams[i].can_manage
  }
  export function deriveCapabilities(session?: SessionData | null, bootstrap?: BootstrapData | null): Capabilities;
  export function useCapabilities(): Capabilities;
  ```

- [ ] **Step 1: Viết test hỏng**

```tsx
// web/src/core/capabilities.test.tsx
import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { deriveCapabilities, useCapabilities } from './capabilities';
import { SESSION_KEY, BOOTSTRAP_KEY } from './queryKeys';
import type { BootstrapData, SessionData } from './api';

const session = (role: string, unitRole?: string): SessionData => ({
  user: { id: 1, name: 'A', email: 'a@hust.edu.vn', role },
  units: {
    current: { id: 2, code: 'K1', name: 'Khoa 1', kind: 'faculty' },
    memberships: unitRole ? [{ unit_id: 2, code: 'K1', name: 'Khoa 1', kind: 'faculty', role: unitRole }] : [],
  },
});

const bootstrap = (teams: BootstrapData['teams'] = []): BootstrapData => ({
  stats: { activeActivities: 0, openTasks: 0, overdueTasks: 0, completedMonth: 0 } as BootstrapData['stats'],
  upcoming: [], tasks: [], activity: [], teams,
  capabilities: { canCreateActivity: true, canCreateAccount: false },
});

describe('deriveCapabilities', () => {
  it('chưa có dữ liệu thì không có quyền gì', () => {
    const c = deriveCapabilities(undefined, undefined);
    expect(c.isExec).toBe(false);
    expect(c.isManager).toBe(false);
    expect(c.canManageTeam(1)).toBe(false);
    expect(c.memberships).toEqual([]);
  });

  it('admin là exec và manager, quản lý mọi Tổ', () => {
    const c = deriveCapabilities(session('admin'), bootstrap());
    expect(c.isExec).toBe(true);
    expect(c.isManager).toBe(true);
    expect(c.canManageTeam(99)).toBe(true);
  });

  it('vai trò đơn vị hiện tại cũng tính như server (role member nhưng unitRole leader)', () => {
    const c = deriveCapabilities(session('member', 'leader'), bootstrap());
    expect(c.unitRole).toBe('leader');
    expect(c.isManager).toBe(true);
    expect(c.isExec).toBe(false);
  });

  it('Tổ trưởng chỉ quản lý Tổ có can_manage', () => {
    const c = deriveCapabilities(session('leader'), bootstrap([
      { id: 1, name: 'Tổ 1', can_manage: 1 },
      { id: 2, name: 'Tổ 2', can_manage: 0 },
    ]));
    expect(c.canManageTeam(1)).toBe(true);
    expect(c.canManageTeam(2)).toBe(false);
  });

  it('thành viên thường không phải manager', () => {
    const c = deriveCapabilities(session('member'), bootstrap());
    expect(c.isManager).toBe(false);
    expect(c.canCreateActivity).toBe(true); // lấy nguyên từ bootstrap
  });
});

describe('useCapabilities', () => {
  it('đọc session và bootstrap từ cache', () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
    qc.setQueryData(SESSION_KEY, session('vice_admin'));
    qc.setQueryData(BOOTSTRAP_KEY, bootstrap());
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useCapabilities(), { wrapper });
    expect(result.current.isExec).toBe(true);
    expect(result.current.unit?.code).toBe('K1');
  });
});
```

- [ ] **Step 2: Chạy, xác nhận hỏng**

Run: `npx vitest run src/core/capabilities.test.tsx` — Expected: FAIL (không resolve `./capabilities`).

- [ ] **Step 3: Viết code**

```ts
// web/src/core/queryKeys.ts
export const SESSION_KEY = ['session'] as const;
export const BOOTSTRAP_KEY = ['core-bootstrap'] as const;
```

```ts
// web/src/core/capabilities.ts
import { useQuery } from '@tanstack/react-query';
import { fetchBootstrap, fetchSession, type BootstrapData, type SessionData, type SessionMembership, type SessionUnit } from './api';
import { BOOTSTRAP_KEY, SESSION_KEY } from './queryKeys';

const EXECUTIVE_ROLES = ['admin', 'vice_admin'];
const LEADERSHIP_ROLES = ['leader', 'vice_leader'];

export interface Capabilities {
  role: string | null;
  unit: SessionUnit | null;
  unitRole: string | null;
  memberships: SessionMembership[];
  isExec: boolean;
  isManager: boolean;
  canCreateActivity: boolean;
  canCreateAccount: boolean;
  canManageTeam: (teamId: number) => boolean;
}

/** Bắt chước `isExecutive`/`isLeadership` của Core (core/src/middleware/auth.js). Server vẫn là nơi chặn cuối. */
export function deriveCapabilities(session?: SessionData | null, bootstrap?: BootstrapData | null): Capabilities {
  const role = session?.user?.role ?? null;
  const unit = session?.units?.current ?? null;
  const memberships = session?.units?.memberships ?? [];
  const unitRole = unit ? memberships.find((m) => m.unit_id === unit.id)?.role ?? null : null;
  const roles = [role, unitRole];
  const isExec = roles.some((r) => r !== null && EXECUTIVE_ROLES.includes(r));
  const isManager = isExec || roles.some((r) => r !== null && LEADERSHIP_ROLES.includes(r));
  const managedTeams = new Set((bootstrap?.teams ?? []).filter((t) => Boolean(t.can_manage)).map((t) => t.id));
  return {
    role,
    unit,
    unitRole,
    memberships,
    isExec,
    isManager,
    canCreateActivity: Boolean(bootstrap?.capabilities?.canCreateActivity),
    canCreateAccount: Boolean(bootstrap?.capabilities?.canCreateAccount),
    canManageTeam: (teamId: number) => isExec || managedTeams.has(teamId),
  };
}

export function useCapabilities(): Capabilities {
  const { data: session } = useQuery({ queryKey: SESSION_KEY, queryFn: fetchSession });
  const signedIn = Boolean(session?.user) && !session?.user?.onboarding?.required;
  const { data: bootstrap } = useQuery({ queryKey: BOOTSTRAP_KEY, queryFn: fetchBootstrap, enabled: signedIn });
  return deriveCapabilities(session, bootstrap);
}
```

Trong `main.tsx`: xoá `const SESSION_KEY = ['session'];`, import `{ SESSION_KEY, BOOTSTRAP_KEY } from './queryKeys'`, đổi `queryKey: ['core-bootstrap']` thành `queryKey: BOOTSTRAP_KEY`. Trong `resetToLoggedOut` giữ so sánh `query.queryKey[0] !== SESSION_KEY[0]`.

- [ ] **Step 4: Chạy test**

Run: `npm test` — Expected: PASS. Run `npx tsc --noEmit -p .` — Expected: sạch. Nếu `BootstrapStats` có field khác, sửa object `stats` trong test cho khớp `types.ts` (đừng sửa type).

- [ ] **Step 5: Commit**

```bash
git add web/src/core/queryKeys.ts web/src/core/capabilities.ts web/src/core/capabilities.test.tsx web/src/core/main.tsx
git commit -m "feat(web): thêm useCapabilities bắt chước quyền của Core"
```

---

### Task 4: Toast

**Files:**
- Create: `web/src/shared/components/Toast.tsx`
- Test: `web/src/shared/components/Toast.test.tsx`

**Interfaces:**
- Produces: `ToastProvider: React.FC<{ children: React.ReactNode }>`; `useToast(): { success(msg: string): void; error(msg: string): void; info(msg: string): void }`.

- [ ] **Step 1: Viết test hỏng**

```tsx
// web/src/shared/components/Toast.test.tsx
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { ToastProvider, useToast } from './Toast';

const Trigger = () => {
  const toast = useToast();
  return (
    <>
      <button onClick={() => toast.success('Đã lưu')}>ok</button>
      <button onClick={() => toast.error('Không lưu được')}>err</button>
    </>
  );
};

describe('Toast', () => {
  afterEach(cleanup);

  it('hiện thông báo thành công và lỗi', async () => {
    render(<ToastProvider><Trigger /></ToastProvider>);
    fireEvent.click(screen.getByText('ok'));
    expect(await screen.findByText('Đã lưu')).toBeDefined();
    fireEvent.click(screen.getByText('err'));
    expect(await screen.findByText('Không lưu được')).toBeDefined();
  });

  it('dùng ngoài provider thì báo lỗi rõ ràng', () => {
    const Bad = () => { useToast(); return null; };
    expect(() => render(<Bad />)).toThrow(/ToastProvider/);
  });
});
```

- [ ] **Step 2: Chạy, xác nhận hỏng**

Run: `npx vitest run src/shared/components/Toast.test.tsx` — Expected: FAIL (không resolve `./Toast`).

- [ ] **Step 3: Viết code**

```tsx
// web/src/shared/components/Toast.tsx
import React from 'react';
import { FlagsProvider, useFlags } from '@atlaskit/flag';
import { token } from '@atlaskit/tokens';
import SuccessIcon from '@atlaskit/icon/core/status-success';
import ErrorIcon from '@atlaskit/icon/core/status-error';
import InfoIcon from '@atlaskit/icon/core/status-information';

export interface ToastApi {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = React.createContext<ToastApi | null>(null);

const ToastBridge: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { showFlag } = useFlags();
  const api = React.useMemo<ToastApi>(() => ({
    success: (message) => {
      showFlag({ title: message, isAutoDismiss: true, icon: <SuccessIcon label="Thành công" color={token('color.icon.success')} /> });
    },
    error: (message) => {
      showFlag({ title: message, isAutoDismiss: true, icon: <ErrorIcon label="Lỗi" color={token('color.icon.danger')} /> });
    },
    info: (message) => {
      showFlag({ title: message, isAutoDismiss: true, icon: <InfoIcon label="Thông tin" color={token('color.icon.information')} /> });
    },
  }), [showFlag]);
  return <ToastContext.Provider value={api}>{children}</ToastContext.Provider>;
};

/** Thông báo ngắn góc màn hình (Atlaskit flag), tự ẩn. */
export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <FlagsProvider>
    <ToastBridge>{children}</ToastBridge>
  </FlagsProvider>
);

export function useToast(): ToastApi {
  const api = React.useContext(ToastContext);
  if (!api) throw new Error('useToast phải dùng bên trong ToastProvider');
  return api;
}
```

- [ ] **Step 4: Chạy test**

Run: `npx vitest run src/shared/components/Toast.test.tsx` — Expected: PASS. Nếu `tsc` báo `color` không phải prop của icon core, bỏ prop `color` (icon vẫn hiện), không đổi API `ToastApi`.

- [ ] **Step 5: Commit**

```bash
git add web/src/shared/components/Toast.tsx web/src/shared/components/Toast.test.tsx
git commit -m "feat(web): thêm Toast dùng chung (Atlaskit flag)"
```

---

### Task 5: `ConfirmDialog` và `ReasonDialog`

**Files:**
- Create: `web/src/shared/components/ConfirmDialog.tsx`, `web/src/shared/components/ReasonDialog.tsx`
- Test: `web/src/shared/components/ConfirmDialog.test.tsx`, `web/src/shared/components/ReasonDialog.test.tsx`

**Interfaces:**
- Produces:
  ```ts
  interface ConfirmDialogProps {
    isOpen: boolean; title: string; children?: React.ReactNode;
    confirmLabel?: string;      // mặc định 'Xác nhận'
    appearance?: 'primary' | 'danger'; // mặc định 'primary'
    confirmText?: string;       // nếu có: phải gõ đúng chuỗi này mới bấm được nút xác nhận
    isLoading?: boolean;
    onConfirm: () => void; onCancel: () => void;
  }
  interface ReasonDialogProps {
    isOpen: boolean; title: string; label?: string; // mặc định 'Lý do'
    required?: boolean;         // mặc định true
    confirmLabel?: string;      // mặc định 'Gửi'
    appearance?: 'primary' | 'danger';
    isLoading?: boolean;
    onSubmit: (reason: string) => void; // nhận chuỗi đã trim
    onCancel: () => void;
  }
  ```

- [ ] **Step 1: Viết test hỏng**

```tsx
// web/src/shared/components/ConfirmDialog.test.tsx
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { ConfirmDialog } from './ConfirmDialog';

describe('ConfirmDialog', () => {
  afterEach(cleanup);

  it('không hiện khi isOpen=false', () => {
    render(<ConfirmDialog isOpen={false} title="Xoá?" onConfirm={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.queryByText('Xoá?')).toBeNull();
  });

  it('bấm xác nhận và huỷ gọi đúng callback', () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(<ConfirmDialog isOpen title="Xoá việc con?" onConfirm={onConfirm} onCancel={onCancel}>Không hoàn tác được.</ConfirmDialog>);
    expect(screen.getByText('Không hoàn tác được.')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận' }));
    fireEvent.click(screen.getByRole('button', { name: 'Huỷ' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('confirmText: chỉ bật nút khi gõ đúng', () => {
    const onConfirm = vi.fn();
    render(<ConfirmDialog isOpen title="Xoá hoạt động" confirmText="Hội trại 2026" confirmLabel="Xoá vĩnh viễn" appearance="danger" onConfirm={onConfirm} onCancel={vi.fn()} />);
    const button = screen.getByRole('button', { name: 'Xoá vĩnh viễn' }) as HTMLButtonElement;
    fireEvent.click(button);
    expect(onConfirm).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText(/Gõ lại/), { target: { value: 'Hội trại 2026' } });
    fireEvent.click(screen.getByRole('button', { name: 'Xoá vĩnh viễn' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
```

```tsx
// web/src/shared/components/ReasonDialog.test.tsx
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { ReasonDialog } from './ReasonDialog';

describe('ReasonDialog', () => {
  afterEach(cleanup);

  it('bắt buộc: chỉ khoảng trắng thì không gửi và báo lỗi', () => {
    const onSubmit = vi.fn();
    render(<ReasonDialog isOpen title="Yêu cầu sửa" onSubmit={onSubmit} onCancel={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(/Lý do/), { target: { value: '   ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Gửi' }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText('Vui lòng nhập lý do.')).toBeDefined();
  });

  it('gửi lý do đã trim', () => {
    const onSubmit = vi.fn();
    render(<ReasonDialog isOpen title="Từ chối" onSubmit={onSubmit} onCancel={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(/Lý do/), { target: { value: '  Thiếu kinh phí  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Gửi' }));
    expect(onSubmit).toHaveBeenCalledWith('Thiếu kinh phí');
  });

  it('không bắt buộc thì gửi được chuỗi rỗng', () => {
    const onSubmit = vi.fn();
    render(<ReasonDialog isOpen required={false} title="Ghi chú" onSubmit={onSubmit} onCancel={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Gửi' }));
    expect(onSubmit).toHaveBeenCalledWith('');
  });
});
```

- [ ] **Step 2: Chạy, xác nhận hỏng**

Run: `npx vitest run src/shared/components/ConfirmDialog.test.tsx src/shared/components/ReasonDialog.test.tsx` — Expected: FAIL (không resolve module).

- [ ] **Step 3: Viết code**

```tsx
// web/src/shared/components/ConfirmDialog.tsx
import React, { useEffect, useState } from 'react';
import Modal, { ModalBody, ModalFooter, ModalHeader, ModalTitle, ModalTransition } from '@atlaskit/modal-dialog';
import Button from '@atlaskit/button/new';
import Textfield from '@atlaskit/textfield';

export interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  children?: React.ReactNode;
  confirmLabel?: string;
  appearance?: 'primary' | 'danger';
  confirmText?: string;
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen, title, children, confirmLabel = 'Xác nhận', appearance = 'primary', confirmText, isLoading = false, onConfirm, onCancel,
}) => {
  const [typed, setTyped] = useState('');
  useEffect(() => { if (!isOpen) setTyped(''); }, [isOpen]);
  const blocked = confirmText !== undefined && typed.trim() !== confirmText.trim();

  return (
    <ModalTransition>
      {isOpen && (
        <Modal onClose={onCancel} width="small">
          <ModalHeader><ModalTitle appearance={appearance === 'danger' ? 'danger' : undefined}>{title}</ModalTitle></ModalHeader>
          <ModalBody>
            {children}
            {confirmText !== undefined && (
              <div style={{ marginTop: 12 }}>
                <label htmlFor="confirm-dialog-text">Gõ lại "{confirmText}" để xác nhận</label>
                <Textfield id="confirm-dialog-text" value={typed} onChange={(e) => setTyped((e.target as HTMLInputElement).value)} />
              </div>
            )}
          </ModalBody>
          <ModalFooter>
            <Button appearance="subtle" onClick={onCancel}>Huỷ</Button>
            <Button appearance={appearance} isDisabled={blocked} isLoading={isLoading} onClick={() => { if (!blocked) onConfirm(); }}>
              {confirmLabel}
            </Button>
          </ModalFooter>
        </Modal>
      )}
    </ModalTransition>
  );
};
```

```tsx
// web/src/shared/components/ReasonDialog.tsx
import React, { useEffect, useState } from 'react';
import Modal, { ModalBody, ModalFooter, ModalHeader, ModalTitle, ModalTransition } from '@atlaskit/modal-dialog';
import Button from '@atlaskit/button/new';
import TextArea from '@atlaskit/textarea';
import { token } from '@atlaskit/tokens';

export interface ReasonDialogProps {
  isOpen: boolean;
  title: string;
  label?: string;
  required?: boolean;
  confirmLabel?: string;
  appearance?: 'primary' | 'danger';
  isLoading?: boolean;
  onSubmit: (reason: string) => void;
  onCancel: () => void;
}

export const ReasonDialog: React.FC<ReasonDialogProps> = ({
  isOpen, title, label = 'Lý do', required = true, confirmLabel = 'Gửi', appearance = 'primary', isLoading = false, onSubmit, onCancel,
}) => {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  useEffect(() => { if (!isOpen) { setReason(''); setError(''); } }, [isOpen]);

  const submit = () => {
    const value = reason.trim();
    if (required && !value) {
      setError('Vui lòng nhập lý do.');
      return;
    }
    onSubmit(value);
  };

  return (
    <ModalTransition>
      {isOpen && (
        <Modal onClose={onCancel} width="small">
          <ModalHeader><ModalTitle>{title}</ModalTitle></ModalHeader>
          <ModalBody>
            <label htmlFor="reason-dialog-text">{label}{required ? ' *' : ''}</label>
            <TextArea id="reason-dialog-text" value={reason} onChange={(e) => { setReason(e.target.value); setError(''); }} minimumRows={3} />
            {error && <p role="alert" style={{ color: token('color.text.danger', '#AE2E24'), marginTop: 4 }}>{error}</p>}
          </ModalBody>
          <ModalFooter>
            <Button appearance="subtle" onClick={onCancel}>Huỷ</Button>
            <Button appearance={appearance} isLoading={isLoading} onClick={submit}>{confirmLabel}</Button>
          </ModalFooter>
        </Modal>
      )}
    </ModalTransition>
  );
};
```

- [ ] **Step 4: Chạy test**

Run: `npx vitest run src/shared/components/ConfirmDialog.test.tsx src/shared/components/ReasonDialog.test.tsx` — Expected: PASS. Nếu `ModalTitle` không nhận `appearance="danger"` theo kiểu, dùng `appearance={appearance === 'danger' ? 'danger' : undefined}` như trên; nếu vẫn lỗi `tsc`, bỏ prop đó.

- [ ] **Step 5: Commit**

```bash
git add web/src/shared/components/ConfirmDialog.* web/src/shared/components/ReasonDialog.*
git commit -m "feat(web): thêm ConfirmDialog và ReasonDialog dùng chung"
```

---

### Task 6: `PeoplePicker` (tìm không dấu, chọn nhiều, chip)

**Files:**
- Create: `web/src/shared/utils/text.ts`, `web/src/shared/components/PeoplePicker.tsx`
- Test: `web/src/shared/utils/text.test.ts`, `web/src/shared/components/PeoplePicker.test.tsx`

**Interfaces:**
- Produces:
  ```ts
  export function normalizeSearch(value: string): string; // bỏ dấu, đ→d, chữ thường, trim
  export interface PickerPerson { id: number; name: string; email?: string | null }
  interface PeoplePickerProps {
    label: string; people: PickerPerson[]; value: number[];
    onChange: (ids: number[]) => void;
    placeholder?: string;   // mặc định 'Gõ tên hoặc email'
    excludeIds?: number[];  // không hiện trong gợi ý
    maxResults?: number;    // mặc định 8
  }
  ```

- [ ] **Step 1: Viết test hỏng**

```ts
// web/src/shared/utils/text.test.ts
import { describe, it, expect } from 'vitest';
import { normalizeSearch } from './text';

describe('normalizeSearch', () => {
  it('bỏ dấu tiếng Việt, đ→d, chữ thường', () => {
    expect(normalizeSearch('  Nguyễn Đức Ánh ')).toBe('nguyen duc anh');
  });
});
```

```tsx
// web/src/shared/components/PeoplePicker.test.tsx
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { PeoplePicker } from './PeoplePicker';

const people = [
  { id: 1, name: 'Nguyễn Văn An', email: 'an.nv@hust.edu.vn' },
  { id: 2, name: 'Đỗ Thị Bình', email: 'binh.dt@hust.edu.vn' },
  { id: 3, name: 'Trần Cường', email: 'cuong.t@hust.edu.vn' },
];

describe('PeoplePicker', () => {
  afterEach(cleanup);

  it('gõ không dấu vẫn tìm được, bấm gợi ý thì thêm người', () => {
    const onChange = vi.fn();
    render(<PeoplePicker label="Người phụ trách" people={people} value={[]} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('Người phụ trách'), { target: { value: 'nguyen' } });
    fireEvent.click(screen.getByRole('option', { name: /Nguyễn Văn An/ }));
    expect(onChange).toHaveBeenCalledWith([1]);
  });

  it('gõ "do" ra "Đỗ", tìm cả theo email', () => {
    render(<PeoplePicker label="Người" people={people} value={[]} onChange={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Người'), { target: { value: 'do' } });
    expect(screen.getByRole('option', { name: /Đỗ Thị Bình/ })).toBeDefined();
    fireEvent.change(screen.getByLabelText('Người'), { target: { value: 'cuong.t' } });
    expect(screen.getByRole('option', { name: /Trần Cường/ })).toBeDefined();
  });

  it('người đã chọn hiện thành chip, có nút bỏ; không hiện lại trong gợi ý', () => {
    const onChange = vi.fn();
    render(<PeoplePicker label="Người" people={people} value={[1, 3]} onChange={onChange} />);
    expect(screen.getByText('Nguyễn Văn An')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Bỏ Nguyễn Văn An' }));
    expect(onChange).toHaveBeenCalledWith([3]);
    fireEvent.change(screen.getByLabelText('Người'), { target: { value: 'n' } });
    expect(screen.queryByRole('option', { name: /Nguyễn Văn An/ })).toBeNull();
  });

  it('excludeIds không hiện trong gợi ý; ô trống thì không có gợi ý', () => {
    render(<PeoplePicker label="Người" people={people} value={[]} excludeIds={[2]} onChange={vi.fn()} />);
    expect(screen.queryAllByRole('option')).toHaveLength(0);
    fireEvent.change(screen.getByLabelText('Người'), { target: { value: 'binh' } });
    expect(screen.queryAllByRole('option')).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Chạy, xác nhận hỏng**

Run: `npx vitest run src/shared/utils/text.test.ts src/shared/components/PeoplePicker.test.tsx` — Expected: FAIL (không resolve module).

- [ ] **Step 3: Viết code**

```ts
// web/src/shared/utils/text.ts
/** Chuỗi để so khớp tìm kiếm: bỏ dấu tiếng Việt, đ→d, chữ thường. */
export function normalizeSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
}
```

```tsx
// web/src/shared/components/PeoplePicker.tsx
import React, { useId, useMemo, useState } from 'react';
import Textfield from '@atlaskit/textfield';
import { token } from '@atlaskit/tokens';
import { normalizeSearch } from '../utils/text';

export interface PickerPerson { id: number; name: string; email?: string | null }

export interface PeoplePickerProps {
  label: string;
  people: PickerPerson[];
  value: number[];
  onChange: (ids: number[]) => void;
  placeholder?: string;
  excludeIds?: number[];
  maxResults?: number;
}

export const PeoplePicker: React.FC<PeoplePickerProps> = ({
  label, people, value, onChange, placeholder = 'Gõ tên hoặc email', excludeIds = [], maxResults = 8,
}) => {
  const inputId = useId();
  const [query, setQuery] = useState('');
  const selected = value.map((id) => people.find((p) => p.id === id)).filter((p): p is PickerPerson => Boolean(p));

  const matches = useMemo(() => {
    const q = normalizeSearch(query);
    if (!q) return [];
    const hidden = new Set([...value, ...excludeIds]);
    return people
      .filter((p) => !hidden.has(p.id))
      .filter((p) => normalizeSearch(`${p.name} ${p.email ?? ''}`).includes(q))
      .slice(0, maxResults);
  }, [query, people, value, excludeIds, maxResults]);

  const add = (id: number) => { onChange([...value, id]); setQuery(''); };
  const remove = (id: number) => onChange(value.filter((v) => v !== id));

  return (
    <div>
      <label htmlFor={inputId}>{label}</label>
      {selected.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, margin: '4px 0' }}>
          {selected.map((p) => (
            <span key={p.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 12, background: token('color.background.neutral', '#F1F2F4') }}>
              {p.name}
              <button type="button" aria-label={`Bỏ ${p.name}`} onClick={() => remove(p.id)} style={{ border: 'none', background: 'none', cursor: 'pointer' }}>×</button>
            </span>
          ))}
        </div>
      )}
      <Textfield id={inputId} value={query} placeholder={placeholder} onChange={(e) => setQuery((e.target as HTMLInputElement).value)} />
      {matches.length > 0 && (
        <ul role="listbox" aria-label={`Gợi ý ${label}`} style={{ listStyle: 'none', margin: 0, padding: 0, border: `1px solid ${token('color.border', '#DFE1E6')}` }}>
          {matches.map((p) => (
            <li key={p.id} role="option" aria-selected={false} tabIndex={0} onClick={() => add(p.id)} onKeyDown={(e) => { if (e.key === 'Enter') add(p.id); }} style={{ padding: '6px 8px', cursor: 'pointer' }}>
              {p.name}{p.email ? ` · ${p.email}` : ''}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
```

- [ ] **Step 4: Chạy test**

Run: `npx vitest run src/shared/utils/text.test.ts src/shared/components/PeoplePicker.test.tsx` — Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add web/src/shared/utils/text.* web/src/shared/components/PeoplePicker.*
git commit -m "feat(web): thêm PeoplePicker tìm không dấu, chọn nhiều"
```

---

### Task 7: `LinkField` và `QuotaBar`

**Files:**
- Create: `web/src/shared/utils/url.ts`, `web/src/shared/utils/bytes.ts`, `web/src/shared/components/LinkField.tsx`, `web/src/shared/components/QuotaBar.tsx`
- Test: `web/src/shared/utils/url.test.ts`, `web/src/shared/utils/bytes.test.ts`, `web/src/shared/components/LinkField.test.tsx`, `web/src/shared/components/QuotaBar.test.tsx`

**Interfaces:**
- Produces:
  ```ts
  export function isHttpUrl(value: string): boolean;     // http:// hoặc https:// và URL hợp lệ
  export function formatBytes(bytes: number): string;    // '0 B', '512 B', '1,5 KB', '12,5 MB' (dấu phẩy thập phân, 1 chữ số)
  export const LINK_ERROR_MESSAGE = 'Liên kết phải bắt đầu bằng http:// hoặc https://.';
  interface LinkFieldProps { label: string; value: string; onChange: (value: string) => void; isRequired?: boolean; placeholder?: string }
  interface QuotaBarProps { usedBytes: number; limitBytes?: number } // mặc định 50 * 1024 * 1024
  ```

- [ ] **Step 1: Viết test hỏng**

```ts
// web/src/shared/utils/url.test.ts
import { describe, it, expect } from 'vitest';
import { isHttpUrl } from './url';

describe('isHttpUrl', () => {
  it('nhận http/https hợp lệ', () => {
    expect(isHttpUrl('https://drive.google.com/x')).toBe(true);
    expect(isHttpUrl(' http://a.vn ')).toBe(true);
  });
  it('từ chối giao thức khác, chuỗi rỗng, chuỗi không phải URL', () => {
    expect(isHttpUrl('javascript:alert(1)')).toBe(false);
    expect(isHttpUrl('ftp://a.vn')).toBe(false);
    expect(isHttpUrl('')).toBe(false);
    expect(isHttpUrl('drive.google.com')).toBe(false);
  });
});
```

```ts
// web/src/shared/utils/bytes.test.ts
import { describe, it, expect } from 'vitest';
import { formatBytes } from './bytes';

describe('formatBytes', () => {
  it('định dạng kiểu Việt Nam', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(1536)).toBe('1,5 KB');
    expect(formatBytes(50 * 1024 * 1024)).toBe('50 MB');
    expect(formatBytes(13107200)).toBe('12,5 MB');
  });
});
```

```tsx
// web/src/shared/components/LinkField.test.tsx
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { LinkField, LINK_ERROR_MESSAGE } from './LinkField';

describe('LinkField', () => {
  afterEach(cleanup);

  it('báo lỗi khi link không phải http(s), không báo khi trống', () => {
    const { rerender } = render(<LinkField label="Link minh chứng" value="" onChange={vi.fn()} />);
    expect(screen.queryByText(LINK_ERROR_MESSAGE)).toBeNull();
    rerender(<LinkField label="Link minh chứng" value="drive.google.com/x" onChange={vi.fn()} />);
    expect(screen.getByText(LINK_ERROR_MESSAGE)).toBeDefined();
    rerender(<LinkField label="Link minh chứng" value="https://drive.google.com/x" onChange={vi.fn()} />);
    expect(screen.queryByText(LINK_ERROR_MESSAGE)).toBeNull();
  });

  it('gõ thì gọi onChange', () => {
    const onChange = vi.fn();
    render(<LinkField label="Link" value="" onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('Link'), { target: { value: 'https://a.vn' } });
    expect(onChange).toHaveBeenCalledWith('https://a.vn');
  });
});
```

```tsx
// web/src/shared/components/QuotaBar.test.tsx
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { QuotaBar } from './QuotaBar';

describe('QuotaBar', () => {
  afterEach(cleanup);

  it('hiện dung lượng đã dùng trên 50 MB', () => {
    render(<QuotaBar usedBytes={13107200} />);
    expect(screen.getByText('Đã dùng 12,5 MB / 50 MB')).toBeDefined();
  });

  it('vượt hạn mức vẫn không vỡ thanh (giá trị tối đa 1)', () => {
    render(<QuotaBar usedBytes={60 * 1024 * 1024} />);
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('1');
  });
});
```

- [ ] **Step 2: Chạy, xác nhận hỏng**

Run: `npx vitest run src/shared/utils/url.test.ts src/shared/utils/bytes.test.ts src/shared/components/LinkField.test.tsx src/shared/components/QuotaBar.test.tsx` — Expected: FAIL.

- [ ] **Step 3: Viết code**

```ts
// web/src/shared/utils/url.ts
export function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value.trim());
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}
```

```ts
// web/src/shared/utils/bytes.ts
const UNITS = ['B', 'KB', 'MB', 'GB'];

export function formatBytes(bytes: number): string {
  let value = Math.max(0, bytes);
  let unit = 0;
  while (value >= 1024 && unit < UNITS.length - 1) {
    value /= 1024;
    unit += 1;
  }
  const text = unit === 0 ? String(Math.round(value)) : (Math.round(value * 10) / 10).toString().replace('.', ',');
  return `${text} ${UNITS[unit]}`;
}
```

```tsx
// web/src/shared/components/LinkField.tsx
import React, { useId } from 'react';
import Textfield from '@atlaskit/textfield';
import { token } from '@atlaskit/tokens';
import { isHttpUrl } from '../utils/url';

export const LINK_ERROR_MESSAGE = 'Liên kết phải bắt đầu bằng http:// hoặc https://.';

export interface LinkFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  isRequired?: boolean;
  placeholder?: string;
}

/** Ô nhập link; kiểm http(s) phía client, server vẫn kiểm lại. */
export const LinkField: React.FC<LinkFieldProps> = ({ label, value, onChange, isRequired = false, placeholder = 'https://' }) => {
  const id = useId();
  const invalid = value.trim() !== '' && !isHttpUrl(value);
  return (
    <div>
      <label htmlFor={id}>{label}{isRequired ? ' *' : ''}</label>
      <Textfield id={id} type="url" value={value} placeholder={placeholder} isInvalid={invalid} isRequired={isRequired}
        onChange={(e) => onChange((e.target as HTMLInputElement).value)} />
      {invalid && <p role="alert" style={{ color: token('color.text.danger', '#AE2E24'), marginTop: 4 }}>{LINK_ERROR_MESSAGE}</p>}
    </div>
  );
};
```

```tsx
// web/src/shared/components/QuotaBar.tsx
import React from 'react';
import ProgressBar from '@atlaskit/progress-bar';
import { formatBytes } from '../utils/bytes';

export interface QuotaBarProps { usedBytes: number; limitBytes?: number }

export const QuotaBar: React.FC<QuotaBarProps> = ({ usedBytes, limitBytes = 50 * 1024 * 1024 }) => {
  const ratio = limitBytes > 0 ? Math.min(Math.max(usedBytes / limitBytes, 0), 1) : 0;
  return (
    <div>
      <ProgressBar value={ratio} ariaLabel="Dung lượng tài liệu đã dùng" />
      <p style={{ marginTop: 4 }}>Đã dùng {formatBytes(usedBytes)} / {formatBytes(limitBytes)}</p>
    </div>
  );
};
```

- [ ] **Step 4: Chạy test**

Run lại lệnh ở Step 2 — Expected: PASS. Nếu `ProgressBar` của Atlaskit đặt `aria-valuenow` theo thang khác (ví dụ 100), sửa assertion trong test cho đúng thang đó nhưng giữ ý: giá trị bị chặn ở mức tối đa.

- [ ] **Step 5: Commit**

```bash
git add web/src/shared/utils/url.* web/src/shared/utils/bytes.* web/src/shared/components/LinkField.* web/src/shared/components/QuotaBar.*
git commit -m "feat(web): thêm LinkField và QuotaBar dùng chung"
```

---

### Task 8: Hash router, menu theo router, trang "Không tìm thấy"

**Files:**
- Create: `web/src/core/AppRoutes.tsx`, `web/src/core/features/notFound/NotFoundView.tsx`
- Test: `web/src/core/AppRoutes.test.tsx`
- Modify: `web/src/shared/layouts/PageLayout.tsx`, `web/src/shared/layouts/PageLayout.test.tsx`, `web/src/core/main.tsx`, `web/src/core/main.test.tsx`

**Interfaces:**
- Consumes: `useCapabilities()` (Task 3), `ToastProvider` (Task 4).
- Produces:
  - `AppRoutes: React.FC<{ userName: string }>` — đọc quyền bằng `useCapabilities()`.
  - `PageLayout` props mới: `{ children; user?; onLogout?; canViewReports?: boolean; headerExtras?: React.ReactNode }` (bỏ `currentView`, `onNavigate`). Phải nằm trong một Router.
  - `App` tự bọc `HashRouter` và `ToastProvider` cho phần đã đăng nhập.
  - Bảng menu: `{ path: '/dashboard', label: 'Tổng quan' }, '/my-tasks-today' 'Việc hôm nay', '/calendar' 'Lịch hoạt động', '/activities' 'Hoạt động & Dự án', '/my-tasks' 'Công việc của tôi', '/teams' 'Các Tổ', '/people' 'Thành viên', '/documents' 'Tài liệu', '/reports' 'Báo cáo' (chỉ khi canViewReports), '/archive' 'Lưu trữ'`.

- [ ] **Step 1: Viết test hỏng cho route**

```tsx
// web/src/core/AppRoutes.test.tsx
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppRoutes } from './AppRoutes';
import { SESSION_KEY, BOOTSTRAP_KEY } from './queryKeys';

vi.mock('./features/dashboard/Dashboard', () => ({ Dashboard: () => <div>màn-tổng-quan</div> }));
vi.mock('./features/calendar/CalendarView', () => ({ CalendarView: () => <div>màn-lịch</div> }));
vi.mock('./features/reports/ReportsView', () => ({ ReportsView: () => <div>màn-báo-cáo</div> }));
vi.mock('./features/members/MembersView', () => ({ MembersView: () => <div>màn-thành-viên</div> }));

function renderAt(path: string, role: string) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
  qc.setQueryData(SESSION_KEY, { user: { id: 1, name: 'A', email: 'a@x', role }, units: { current: null, memberships: [] } });
  qc.setQueryData(BOOTSTRAP_KEY, { stats: {}, upcoming: [], tasks: [], activity: [], teams: [], capabilities: { canCreateActivity: false, canCreateAccount: false } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[path]}>
        <AppRoutes userName="A" />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('AppRoutes', () => {
  afterEach(cleanup);

  it('"/" về Tổng quan', () => {
    renderAt('/', 'member');
    expect(screen.getByText('màn-tổng-quan')).toBeDefined();
  });

  it('mở đúng màn theo đường dẫn của UI cũ', () => {
    renderAt('/calendar', 'member');
    expect(screen.getByText('màn-lịch')).toBeDefined();
    cleanup();
    renderAt('/people', 'member');
    expect(screen.getByText('màn-thành-viên')).toBeDefined();
  });

  it('không phải quản lý thì #/reports về Tổng quan, không render màn Báo cáo', () => {
    renderAt('/reports', 'member');
    expect(screen.queryByText('màn-báo-cáo')).toBeNull();
    expect(screen.getByText('màn-tổng-quan')).toBeDefined();
  });

  it('quản lý mở được Báo cáo', () => {
    renderAt('/reports', 'leader');
    expect(screen.getByText('màn-báo-cáo')).toBeDefined();
  });

  it('đường dẫn lạ hiện trang Không tìm thấy', () => {
    renderAt('/khong-co', 'member');
    expect(screen.getByText('Không tìm thấy trang')).toBeDefined();
  });
});
```

- [ ] **Step 2: Chạy, xác nhận hỏng**

Run: `npx vitest run src/core/AppRoutes.test.tsx` — Expected: FAIL (không resolve `./AppRoutes`).

- [ ] **Step 3: Viết `NotFoundView` và `AppRoutes`**

```tsx
// web/src/core/features/notFound/NotFoundView.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '@atlaskit/button/new';

export const NotFoundView: React.FC = () => {
  const navigate = useNavigate();
  return (
    <div style={{ textAlign: 'center', padding: '48px 16px' }}>
      <h2>Không tìm thấy trang</h2>
      <p>Đường dẫn này không tồn tại hoặc đã bị đổi.</p>
      <Button appearance="primary" onClick={() => navigate('/dashboard')}>Về Tổng quan</Button>
    </div>
  );
};
```

```tsx
// web/src/core/AppRoutes.tsx
import React from 'react';
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { useCapabilities } from './capabilities';
import { Dashboard } from './features/dashboard/Dashboard';
import { MyTasksToday } from './features/tasks/MyTasksToday';
import { CalendarView } from './features/calendar/CalendarView';
import { ActivitiesView } from './features/activities/ActivitiesView';
import { MyTasksView } from './features/tasks/MyTasksView';
import { TeamsView } from './features/teams/TeamsView';
import { MembersView } from './features/members/MembersView';
import { DocumentsView } from './features/documents/DocumentsView';
import { ReportsView } from './features/reports/ReportsView';
import { ArchiveView } from './features/archive/ArchiveView';
import { NotFoundView } from './features/notFound/NotFoundView';

const ToDashboard = () => <Navigate to="/dashboard" replace />;

/** Bảng route theo đường dẫn của UI cũ (`#dashboard`, `#calendar`…). Route không có quyền về Tổng quan. */
export const AppRoutes: React.FC<{ userName: string }> = ({ userName }) => {
  const caps = useCapabilities();
  const navigate = useNavigate();
  return (
    <Routes>
      <Route path="/" element={<ToDashboard />} />
      <Route path="/dashboard" element={<Dashboard userName={userName} onNavigate={(view) => navigate(`/${view}`)} />} />
      <Route path="/my-tasks-today" element={<MyTasksToday />} />
      <Route path="/calendar" element={<CalendarView />} />
      <Route path="/activities" element={<ActivitiesView />} />
      <Route path="/my-tasks" element={<MyTasksView />} />
      <Route path="/teams" element={<TeamsView />} />
      <Route path="/people" element={<MembersView />} />
      <Route path="/documents" element={<DocumentsView />} />
      <Route path="/reports" element={caps.isManager ? <ReportsView /> : <ToDashboard />} />
      <Route path="/archive" element={<ArchiveView />} />
      <Route path="*" element={<NotFoundView />} />
    </Routes>
  );
};
```

- [ ] **Step 4: Chạy test route**

Run: `npx vitest run src/core/AppRoutes.test.tsx` — Expected: PASS.

- [ ] **Step 5: Sửa `PageLayout` dùng router**

Thay test cũ dùng `onNavigate` trong `PageLayout.test.tsx`: bọc mọi `render(<PageLayout …>)` bằng helper
```tsx
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
const LocationProbe = () => <div data-testid="path">{useLocation().pathname}</div>;
const renderLayout = (ui: React.ReactElement, path = '/dashboard') =>
  render(<MemoryRouter initialEntries={[path]}>{ui}<Routes><Route path="*" element={<LocationProbe />} /></Routes></MemoryRouter>);
```
(dùng `rerender` cũng phải bọc `MemoryRouter`), và thay test "bấm mục Báo cáo chuyển sang màn reports" bằng:
```tsx
it('bấm mục Báo cáo chuyển sang #/reports', () => {
  renderLayout(<PageLayout canViewReports><div>Content</div></PageLayout>);
  fireEvent.click(screen.getByText('Báo cáo'));
  expect(screen.getByTestId('path').textContent).toBe('/reports');
});

it('mục Thành viên trỏ #/people và được đánh dấu khi đang ở đó', () => {
  renderLayout(<PageLayout><div>Content</div></PageLayout>, '/people');
  const item = screen.getByText('Thành viên').closest('button');
  expect(item?.getAttribute('aria-current')).toBe('page');
});

it('headerExtras được hiện trên thanh trên cùng', () => {
  renderLayout(<PageLayout headerExtras={<span>ô-chọn-đơn-vị</span>}><div>Content</div></PageLayout>);
  expect(screen.getByText('ô-chọn-đơn-vị')).toBeDefined();
});
```
Chạy `npx vitest run src/shared/layouts/PageLayout.test.tsx` — Expected: FAIL (props cũ, chưa có `aria-current`, chưa có `headerExtras`).

Sửa `PageLayout.tsx`:
- Bỏ `currentView`, `onNavigate` khỏi props; thêm `headerExtras?: React.ReactNode`.
- `const location = useLocation(); const navigate = useNavigate();` (import từ `react-router-dom`).
- Khai báo mảng menu ở đầu file:
  ```tsx
  const NAV_ITEMS = [
    { path: '/dashboard', label: 'Tổng quan', Icon: DashboardIcon },
    { path: '/my-tasks-today', label: 'Việc hôm nay', Icon: CheckCircleIcon },
    { path: '/calendar', label: 'Lịch hoạt động', Icon: CalendarIcon },
    { path: '/activities', label: 'Hoạt động & Dự án', Icon: FolderClosedIcon },
    { path: '/my-tasks', label: 'Công việc của tôi', Icon: TaskIcon },
    { path: '/teams', label: 'Các Tổ', Icon: PeopleGroupIcon },
    { path: '/people', label: 'Thành viên', Icon: PersonIcon },
    { path: '/documents', label: 'Tài liệu', Icon: FileIcon },
    { path: '/reports', label: 'Báo cáo', Icon: ChartBarIcon, managerOnly: true },
    { path: '/archive', label: 'Lưu trữ', Icon: ArchiveBoxIcon },
  ];
  ```
- Trong `Section` đầu, thay 10 `ButtonItem` bằng:
  ```tsx
  {NAV_ITEMS.filter((item) => !item.managerOnly || canViewReports).map(({ path, label, Icon }) => {
    const selected = location.pathname === path || location.pathname.startsWith(`${path}/`);
    return (
      <ButtonItem key={path} isSelected={selected} aria-current={selected ? 'page' : undefined}
        onClick={() => navigate(path)} iconBefore={<Icon label="" />}>{label}</ButtonItem>
    );
  })}
  ```
- Trong `renderProfile`, đặt `{headerExtras}` trước `Avatar`.
- Giữ nguyên Section "SẮP CÓ" (đợt 5–6 sẽ thay).

Chạy lại test PageLayout — Expected: PASS. Nếu `ButtonItem` không chuyển `aria-current` xuống DOM, bọc nội dung không được; thay vào đó kiểm `isSelected` bằng `aria-current` trên chính `ButtonItem` qua prop `testId` không đủ — khi đó đổi assertion sang `item?.getAttribute('aria-current')` của phần tử `button` mà Atlaskit đặt khi `isSelected` (Atlaskit menu đặt `aria-current="page"` cho mục được chọn); nếu không có thuộc tính nào, giữ test click và bỏ test đánh dấu, ghi rõ trong báo cáo.

- [ ] **Step 6: Nối vào `main.tsx`**

Thêm test vào `main.test.tsx` (cùng `describe`), và `afterEach(() => { window.location.hash = ''; })`:
```tsx
it('link cũ dạng #calendar (không có /) mở thẳng màn Lịch', async () => {
  window.location.hash = '#calendar';
  vi.mocked(api.fetchSession).mockResolvedValueOnce(authedSession);
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={queryClient}><App /></QueryClientProvider>);
  await waitFor(() => expect(screen.getByRole('heading', { name: /Lịch/ })).toBeDefined());
});
```
Thêm `fetchActivities: vi.fn().mockResolvedValue([])` và `fetchTeams: vi.fn().mockResolvedValue([])` vào `vi.mock('./api')` nếu `CalendarView` cần. Nếu heading của `CalendarView` khác, đổi regex theo đúng tiêu đề trong `CalendarView.tsx` (đọc file để lấy).

Sửa test "chỉ hiện menu Báo cáo…": quyền giờ theo vai trò (spec 3.3, giống UI cũ) — lần render thứ hai dùng session `role: 'member'` thay vì đổi `capabilities`:
```tsx
vi.mocked(api.fetchSession).mockResolvedValue({ ...authedSession, user: { ...authedSession.user, role: 'member' } });
renderApp();
await waitFor(() => expect(screen.getByText(/Xin chào Phạm Việt Bách/i)).toBeDefined());
expect(screen.queryByRole('button', { name: /Báo cáo/ })).toBeNull();
```
Đổi tên test thành `'chỉ hiện menu Báo cáo cho quản lý (admin/vice_admin/leader/vice_leader)'`.

Chạy `npx vitest run src/core/main.test.tsx` — Expected: test link cũ FAIL.

Sửa `main.tsx`:
- Bỏ `React.useState('dashboard')`, bỏ import các màn (đã chuyển sang `AppRoutes`).
- Import `{ HashRouter } from 'react-router-dom'`, `{ AppRoutes } from './AppRoutes'`, `{ ToastProvider } from '../shared/components/Toast'`, `{ useCapabilities } from './capabilities'`.
- Phần đã đăng nhập:
  ```tsx
  return (
    <HashRouter>
      <ToastProvider>
        <SignedInShell userName={session.user.name} user={session.user} onLogout={handleLogout} />
      </ToastProvider>
    </HashRouter>
  );
  ```
  với component mới trong cùng file:
  ```tsx
  const SignedInShell: React.FC<{ userName: string; user: SessionUser; onLogout: () => void }> = ({ userName, user, onLogout }) => {
    const caps = useCapabilities();
    return (
      <PageLayout user={user} onLogout={onLogout} canViewReports={caps.isManager}>
        <AppRoutes userName={userName} />
      </PageLayout>
    );
  };
  ```
- Bỏ `useQuery` bootstrap trong `App` (giờ do `useCapabilities` và `Dashboard` đọc).

- [ ] **Step 7: Chạy toàn bộ**

Run: `npm test && npx tsc --noEmit -p . && npm run build` — Expected: tất cả xanh.

- [ ] **Step 8: Commit**

```bash
git add web/src/core web/src/shared/layouts
git commit -m "feat(web): hash router theo đường dẫn UI cũ, menu dùng router, trang Không tìm thấy"
```

---

### Task 9: Bộ chọn đơn vị

**Files:**
- Create: `web/src/core/features/session/UnitSwitcher.tsx`
- Test: `web/src/core/features/session/UnitSwitcher.test.tsx`
- Modify: `web/src/core/main.tsx` (`SignedInShell` truyền `headerExtras={<UnitSwitcher />}`)

**Interfaces:**
- Consumes: `useCapabilities()` (Task 3), `switchUnit` (Task 2), `useToast` (Task 4), `apiErrorMessage` (Task 1), `SESSION_KEY` (Task 3).
- Produces: `UnitSwitcher: React.FC` — không có props; `null` khi `memberships.length < 2`.

- [ ] **Step 1: Viết test hỏng**

```tsx
// web/src/core/features/session/UnitSwitcher.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UnitSwitcher } from './UnitSwitcher';
import { ToastProvider } from '../../../shared/components/Toast';
import { SESSION_KEY } from '../../queryKeys';
import * as api from '../../api';

vi.mock('../../api', async () => {
  const actual = await vi.importActual<typeof import('../../api')>('../../api');
  return { ...actual, switchUnit: vi.fn(), fetchSession: vi.fn(), fetchBootstrap: vi.fn().mockResolvedValue({ teams: [], capabilities: {} }) };
});

const memberships = [
  { unit_id: 1, code: 'TCKT', name: 'Ban TCKT', kind: 'board', role: 'member' },
  { unit_id: 2, code: 'K1', name: 'Khoa 1', kind: 'faculty', role: 'leader' },
];
const sessionAt = (unitId: number, list = memberships) => ({
  user: { id: 1, name: 'A', email: 'a@x', role: 'member' },
  units: { current: { id: unitId, code: '', name: list.find((m) => m.unit_id === unitId)?.name ?? '', kind: '' }, memberships: list },
});

const Probe = () => <div data-testid="path">{useLocation().pathname}</div>;

function setup(session: ReturnType<typeof sessionAt>) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
  qc.setQueryData(SESSION_KEY, session);
  qc.setQueryData(['core-activities'], [{ id: 9 }]);
  render(
    <QueryClientProvider client={qc}>
      <ToastProvider>
        <MemoryRouter initialEntries={['/activities']}>
          <UnitSwitcher />
          <Routes><Route path="*" element={<Probe />} /></Routes>
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>
  );
  return qc;
}

describe('UnitSwitcher', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(cleanup);

  it('ẩn khi chỉ có một đơn vị', () => {
    setup(sessionAt(1, [memberships[0]]));
    expect(screen.queryByLabelText('Đơn vị')).toBeNull();
  });

  it('đổi đơn vị: gọi API, cập nhật session, xoá cache khác, về Tổng quan', async () => {
    vi.mocked(api.switchUnit).mockResolvedValueOnce(sessionAt(2));
    const qc = setup(sessionAt(1));
    fireEvent.change(screen.getByLabelText('Đơn vị'), { target: { value: '2' } });
    await waitFor(() => expect(api.switchUnit).toHaveBeenCalledWith(2));
    await waitFor(() => expect(screen.getByTestId('path').textContent).toBe('/dashboard'));
    expect((qc.getQueryData(SESSION_KEY) as ReturnType<typeof sessionAt>).units.current.id).toBe(2);
    expect(qc.getQueryData(['core-activities'])).toBeUndefined();
  });

  it('lỗi thì báo toast, giữ đơn vị và cache cũ', async () => {
    vi.mocked(api.switchUnit).mockRejectedValueOnce({ response: { status: 403, data: { error: 'Bạn không thuộc đơn vị này.' } } });
    const qc = setup(sessionAt(1));
    fireEvent.change(screen.getByLabelText('Đơn vị'), { target: { value: '2' } });
    expect(await screen.findByText('Bạn không thuộc đơn vị này.')).toBeDefined();
    expect((qc.getQueryData(SESSION_KEY) as ReturnType<typeof sessionAt>).units.current.id).toBe(1);
    expect(qc.getQueryData(['core-activities'])).toEqual([{ id: 9 }]);
    expect(screen.getByTestId('path').textContent).toBe('/activities');
  });
});
```

- [ ] **Step 2: Chạy, xác nhận hỏng**

Run: `npx vitest run src/core/features/session/UnitSwitcher.test.tsx` — Expected: FAIL (không resolve `./UnitSwitcher`).

- [ ] **Step 3: Viết code**

Dùng `<select>` gốc (dễ dùng trên điện thoại, dễ test) với style token Atlaskit.

```tsx
// web/src/core/features/session/UnitSwitcher.tsx
import React, { useId } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { token } from '@atlaskit/tokens';
import { apiErrorMessage, switchUnit, type SessionData } from '../../api';
import { useCapabilities } from '../../capabilities';
import { SESSION_KEY } from '../../queryKeys';
import { useToast } from '../../../shared/components/Toast';

/** Chỉ hiện khi người dùng thuộc từ 2 đơn vị trở lên. Đổi xong thì bỏ mọi dữ liệu của đơn vị cũ. */
export const UnitSwitcher: React.FC = () => {
  const id = useId();
  const { unit, memberships } = useCapabilities();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const toast = useToast();

  const mutation = useMutation({
    mutationFn: switchUnit,
    onSuccess: (session: SessionData) => {
      queryClient.setQueryData(SESSION_KEY, session);
      queryClient.removeQueries({ predicate: (q) => q.queryKey[0] !== SESSION_KEY[0] });
      navigate('/dashboard');
      toast.success(`Đã chuyển sang ${session.units?.current?.name ?? 'đơn vị mới'}`);
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Không đổi được đơn vị.')),
  });

  if (memberships.length < 2) return null;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <label htmlFor={id} style={{ fontSize: 12 }}>Đơn vị</label>
      <select id={id} value={unit?.id ?? ''} disabled={mutation.isPending}
        onChange={(e) => { const next = Number(e.target.value); if (next && next !== unit?.id) mutation.mutate(next); }}
        style={{ padding: '4px 6px', borderRadius: 4, border: `1px solid ${token('color.border', '#DFE1E6')}`, background: token('elevation.surface', '#fff'), color: token('color.text', '#172B4D'), maxWidth: 180 }}>
        {memberships.map((m) => <option key={m.unit_id} value={m.unit_id}>{m.name}</option>)}
      </select>
    </div>
  );
};
```

Ghi chú: `removeQueries` (không phải `resetQueries`) là đủ vì sau `navigate('/dashboard')` các màn mới mount sẽ tự tải lại; query đang hiển thị của màn cũ bị unmount cùng route.

Trong `main.tsx`, `SignedInShell` thêm `headerExtras={<UnitSwitcher />}` cho `PageLayout` và import `UnitSwitcher`.

- [ ] **Step 4: Chạy toàn bộ**

Run: `npm test && npx tsc --noEmit -p . && npm run build` — Expected: xanh.

- [ ] **Step 5: Commit**

```bash
git add web/src/core/features/session web/src/core/main.tsx
git commit -m "feat(web): bộ chọn đơn vị khi thuộc nhiều đơn vị"
```

---

### Task 10: Tài liệu, kiểm tra và PR

**Files:**
- Modify: `docs/dev/frontend.md` (thêm mục `web/`, thêm `web/**` vào `related_code`, bump MINOR, lịch sử)
- Modify: `docs/specs/2026-10-09-web-hoan-thien-thay-the-design.md` (status `active`, bump 1.1, ghi đợt 0 xong; ghi rằng react-router 6.30 tự thêm `/` cho `#activity/12` nên không cần code chuẩn hoá riêng)
- Modify: `docs/planning/ke-hoach-hub-core-operations.md` (bump, một dòng lịch sử: đợt 0 web/)
- Modify (thu hẹp `related_code` về `[]`, `status: deprecated`, bump, lịch sử "thay bằng SPEC-WEB-003"): `docs/specs/2026-10-07-frontend-migration.md` (SPEC-WEB-001), `docs/specs/2026-10-08-core-api-integration-design.md`, `docs/specs/2026-10-08-core-api-integration-plan.md`, `docs/specs/2026-10-08-login-ui-design.md`, `docs/specs/2026-10-08-login-ui-plan.md` — để mỗi PR web/ sau không phải bump 5 tài liệu POC đã xong; SPEC-WEB-003 và `docs/dev/frontend.md` là nơi duy nhất mô tả `web/`.

- [ ] **Step 1: Viết mục `web/` trong `docs/dev/frontend.md`**

Thêm mục `## Core — web/ (React 18 + TypeScript + Vite + Atlaskit)` trước mục CTD, nội dung:
- Chạy: `cd web && npm run dev` (Core ở :3000), test `npm test`, build `npm run build`.
- Định tuyến: `HashRouter`, đường dẫn trùng UI cũ; bảng route ở `web/src/core/AppRoutes.tsx`; route không có quyền về `#/dashboard`.
- Tầng API: `web/src/core/api/<miền>.ts`, `index.ts` chỉ re-export; lỗi hiện bằng `apiErrorMessage`; câu tiếng Anh mới của Core → thêm vào `web/src/core/api/errorMessages.ts`.
- Quyền: chỉ dùng `useCapabilities()` (`web/src/core/capabilities.ts`); không tự viết điều kiện vai trò trong màn.
- Thành phần dùng chung trong `web/src/shared/components/`: `Toast`, `ConfirmDialog`, `ReasonDialog`, `PeoplePicker`, `LinkField`, `QuotaBar`.
- Đổi mục `## Core — core/public/` thành "chỉ vá lỗi tới khi gỡ (ADR-0016)".

- [ ] **Step 2: Sửa các tài liệu còn lại như liệt kê ở trên** (bump version, `updated: 2026-10-09`, thêm dòng `## Lịch sử phiên bản`).

- [ ] **Step 3: Chạy kiểm tra**

```bash
cd web && npm test && npm run build && cd ..
npm run test:tools
npm run docs:index
git add -A docs && git commit -m "docs: web/ đợt 0 — router, tầng API, thành phần dùng chung"
npm run docs:check -- --base origin/staging
```
Expected: mọi lệnh xanh. `docs:check` phải chạy **sau** commit (khi cây sạch).

- [ ] **Step 4: Push và mở PR vào `staging`**

```bash
git push -u origin feature/web-hoan-thien-spec
gh pr create --base staging --title "web/: ADR-0016, SPEC-WEB-003 và đợt 0 (nền tảng)" --body "…"
```
Mô tả PR: tóm tắt ADR-0016 + spec + đợt 0; mục "Kiểm tra" liệt kê lệnh đã chạy; kết thúc bằng `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.

---

## Lịch sử phiên bản

| Version | Ngày | Thay đổi | Người |
|---|---|---|---|
| 1.0 | 2026-10-09 | Bản đầu: kế hoạch đợt 0 của SPEC-WEB-003 | DYC |
