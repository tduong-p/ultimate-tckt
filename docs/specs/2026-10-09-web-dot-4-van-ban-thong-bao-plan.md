---
doc_id: PLAN-WEBP4-001
title: Kế hoạch triển khai — web/ đợt 4 (Văn bản và chuông thông báo)
version: 1.2
status: active
audience: [dev, ai]
owner: DYC
updated: 2026-10-10
related_code: [web/src/core/api/documents.*, web/src/core/api/notifications.*, web/src/core/features/documents/**, web/src/core/features/notifications/**]
---


# web/ đợt 4 — Văn bản và chuông thông báo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Đưa hai việc của UI cũ còn thiếu ở `web/` (mục 4.6 của SPEC-WEB-003): (1) thêm/sửa văn bản; (2) chuông thông báo trong ứng dụng có huy hiệu, bảng thông báo, đánh dấu đã xem, popup tối đa 3 mục mới và đi tới đúng màn qua `url` của thông báo.

**Architecture:** Không đổi `core/`. Thêm hai hàm ghi vào `api/documents.ts` và file mới `api/notifications.ts`. Văn bản: một hộp `DocumentFormModal` (dùng chung cho thêm và sửa) mở từ `DocumentsView`. Thông báo: một query `['core-notifications']` tải lại mỗi 60 giây (`useNotifications`); `NotificationBell` hiện huy hiệu và bảng; `NotificationPopups` đọc cùng cache để hiện popup; `NotificationCenter` ghép hai phần và được đặt vào `headerExtras` của `PageLayout`. Mọi thao tác ghi dùng `useMutation`. `url` của thông báo (`/#activity/12`) đổi thành đường dẫn router (`/activity/12`) bằng hàm thuần `notificationRoute`.

**Tech Stack:** React 18, TypeScript, Vite, Vitest + jsdom + @testing-library/react 14, @tanstack/react-query 5, react-router-dom 6, Atlaskit (`modal-dialog`, `button/new`, `textfield`, `textarea`, `icon/core/notification`).

**Spec:** `docs/specs/2026-10-09-web-hoan-thien-thay-the-design.md` (SPEC-WEB-003, mục 4.6, 3.2, 3.4, 7). Phụ thuộc: đợt 0 (đã xong): `apiErrorMessage`, `useToast`, `LinkField`, `useCapabilities`, `HashRouter`, `headerExtras`.

## Global Constraints

- Chỉ tiếng Việt trong giao diện. Văn bản chỉ dùng link (`link_url`), không tải tệp.
- Không chạm `core/` (API `documents` và `notifications` đã đủ). Không sửa `web/src/ctd/`.
- Văn bản (theo `core/src/routes/documents.js`):
  - Nút "Thêm văn bản" hiện cho **mọi người dùng đã đăng nhập**. Nút "Sửa" chỉ hiện khi `can_edit` của dòng đó là true (server tính: admin/vice_admin, người tạo, hoặc thành viên Tổ ban hành).
  - Body `POST`/`PATCH`: `{name (≤200), link_url (http/https), description (bắt buộc, ≤4000), applicable_year (số nguyên 1900–2100), issuing_team_id, visibility: 'issuing_team' | 'all_teams'}`.
  - Danh sách Tổ ban hành lấy từ `issueTeams` của `GET /api/documents` (admin: mọi Tổ đang hoạt động; người khác: Tổ của mình). Server vẫn là nơi chặn cuối (403 "You may only issue documents for your teams.").
  - Sau khi lưu thành công: `invalidateQueries(['core-documents'])` (prefix, phủ mọi bộ lọc).
- Thông báo (theo `core/src/routes/notifications.js`): `GET /api/notifications` trả tối đa 20 mục và `unread_count`; `POST /api/notifications/seen` đánh dấu tất cả; `PATCH /api/notifications/:id/seen` đánh dấu một mục (404 "Notification not found." nếu không thuộc người dùng/đã hết hạn). Thông báo giữ 7 ngày.
- Chuông: tải lại mỗi 60 giây; huy hiệu tối đa "99+"; mở bảng thì tải lại rồi, nếu còn mục chưa xem, gọi "đánh dấu tất cả đã xem"; bấm một mục thì đánh dấu mục đó (nếu chưa xem), đóng bảng và đi tới `url` đã chuẩn hoá; popup tối đa 3 mục mới (lấy 3 mục chưa xem mới nhất, bỏ mục đã báo), tự tắt sau 7 giây, bấm popup thì mở thông báo.
- Đường dẫn trong `url` của thông báo có dạng `/#activity/12`; `#activity/12` và `#/activity/12` đều phải đi tới `/activity/12`. Không có hash → `/dashboard`. Route đích có thể chưa tồn tại ở nhánh hiện tại (đợt 1 làm `#activity/:id`): khi đó router hiện trang "Không tìm thấy" — không phải lỗi của đợt này, test chỉ kiểm đường dẫn đích.
- Lỗi API hiện qua `apiErrorMessage`; câu tiếng Anh mới của Core đi vào `web/src/core/api/errorMessages.ts` (bảng duy nhất).
- Ngày hiển thị theo giờ Việt Nam: dùng `formatVnDate`/`todayVnKey` (`web/src/shared/utils/date.ts`), không cắt chuỗi ISO (bất biến #7).
- Kiểm tra trước khi báo xong: `cd web && npm test && npm run build` xanh; `npm run test:tools`; `npm run docs:index && npm run docs:check -- --base origin/staging` xanh **sau khi commit**.
- Commit kết thúc bằng `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
- Các đợt 1, 2, 3, 5, 6 cùng sửa các file dùng chung (`api/index.ts`, `api/types.ts`, `api/errorMessages.ts`, `api/errors.test.ts`, `core/main.tsx`). Đợt này chỉ **thêm** vào cuối/đoạn riêng; khi rebase gặp xung đột, giữ cả hai bên.

## Review Focus

- Mở bảng thông báo khi còn chưa xem → gọi đúng một lần `POST /notifications/seen`, huy hiệu về 0 — Task 5.
- Bấm thông báo `/#activity/12` → đường dẫn `/activity/12`; bấm mục đã xem → **không** gọi PATCH; huy hiệu không trừ hai lần với popup cũ — Task 4, 5, 6.
- Popup: tối đa 3, không lặp lại khi tải lại, tự tắt sau 7 giây — Task 6.
- Nút "Thêm văn bản" có cho người không phải quản lý; nút "Sửa" chỉ có ở dòng `can_edit` — Task 3.
- Lỗi 403/400 của server hiện bằng tiếng Việt trong hộp, hộp không đóng — Task 2.
- Sau lưu văn bản danh sách tải lại — Task 3.
- Người dùng chưa thuộc Tổ nào: hộp thêm văn bản báo rõ, nút Lưu bị khoá (thay vì để gửi rồi nhận 403) — Task 2.

## Quyết định (spec để ngỏ)

- **Giờ tải lại khi tab ẩn:** `refetchIntervalInBackground` mặc định (false): tab ẩn thì tạm dừng, quay lại tab (focus) thì react-query tải bù. UI cũ poll cả lúc ẩn; thay đổi này chấp nhận được vì thông báo chỉ giữ 7 ngày và có focus refetch.
- **Đánh dấu một mục là lạc quan:** cập nhật cache ngay rồi gửi PATCH, điều hướng không chờ PATCH. Lỗi PATCH bị bỏ qua (lần tải sau tự sửa), như UI cũ.
- **Việt hoá nội dung thông báo:** server lưu một số tiêu đề/nội dung tiếng Anh (`You were tagged in a comment`, `New task response`, `<tên> tagged you in “…”.`, `<tên> responded to “…”.`). Plan dịch các câu đó bằng bảng nhỏ trong `notificationText.ts`; câu lạ hiện nguyên văn. Trạng thái gửi `email_status`/`push_status` hiện dạng chip `Email: đã gửi`.
- **Tổ ban hành tự chọn khi chỉ có một Tổ** (thêm mới); nhiều Tổ thì bắt chọn. Khi sửa văn bản mà Tổ hiện tại không nằm trong `issueTeams` (người tạo đã rời Tổ), thêm Tổ đó vào danh sách chọn để ô không bị trống; server vẫn quyết định cho lưu hay 403.
- **Thêm dòng "Bởi {người tạo} · {ngày}"** vào thẻ văn bản (UI cũ có, `web/` chưa có).
- **Không sửa spec/ADR** trong PR này (tránh xung đột giữa các đợt song song); chỉ cập nhật `docs/dev/frontend.md` và `docs/ai/bay-da-gap.md`.

---

## File Structure

| File | Trách nhiệm |
|---|---|
| `web/src/core/api/types.ts` (sửa, thêm cuối) | `DocumentPayload`, `NotificationItem`, `NotificationsResponse` |
| `web/src/core/api/documents.ts` (sửa) | thêm `createDocument`, `updateDocument` |
| `web/src/core/api/notifications.ts` (mới) | `fetchNotifications`, `markNotificationSeen`, `markAllNotificationsSeen` |
| `web/src/core/api/index.ts` (sửa) | thêm `export * from './notifications'` |
| `web/src/core/api/errorMessages.ts` (sửa) | thêm câu lỗi của văn bản và thông báo |
| `web/src/core/features/documents/DocumentFormModal.tsx` (mới) | Hộp thêm/sửa văn bản |
| `web/src/core/features/documents/DocumentsView.tsx` (sửa) | Nút Thêm/Sửa, dòng người tạo, gắn hộp |
| `web/src/core/features/notifications/notificationUrl.ts` (mới) | `notificationRoute(url)` |
| `web/src/core/features/notifications/notificationText.ts` (mới) | Việt hoá tiêu đề/nội dung, nhãn trạng thái gửi |
| `web/src/core/features/notifications/notificationCache.ts` (mới) | Hàm thuần cập nhật cache (đã xem một/tất cả) |
| `web/src/core/features/notifications/useNotifications.ts` (mới) | `NOTIFICATIONS_KEY`, `useNotifications()` (poll 60 giây) |
| `web/src/core/features/notifications/useOpenNotification.ts` (mới) | Mở một thông báo: đánh dấu đã xem + điều hướng |
| `web/src/core/features/notifications/NotificationBell.tsx` (mới) | Nút chuông, huy hiệu, bảng |
| `web/src/core/features/notifications/NotificationPopups.tsx` (mới) | Popup mục mới |
| `web/src/core/features/notifications/NotificationCenter.tsx` (mới) | Ghép chuông + popup |
| `web/src/core/main.tsx` (sửa) | `headerExtras` gồm `NotificationCenter` |
| `web/src/core/main.test.tsx` (sửa) | mock `fetchNotifications` |

Mọi lệnh test chạy trong `web/`. Chạy một file: `npx vitest run <đường dẫn>`.

---

### Task 1: Tầng API văn bản + thông báo, bảng dịch lỗi

**Files:**
- Modify: `web/src/core/api/types.ts`, `web/src/core/api/documents.ts`, `web/src/core/api/index.ts`, `web/src/core/api/errorMessages.ts`
- Create: `web/src/core/api/notifications.ts`
- Test: `web/src/core/api/documents.test.ts`, `web/src/core/api/notifications.test.ts`; sửa `web/src/core/api/errors.test.ts` (thêm ca)

**Interfaces:**
- Produces:
  - `DocumentPayload { name: string; link_url: string; description: string; applicable_year: number; issuing_team_id: number; visibility: 'issuing_team' | 'all_teams' }`
  - `createDocument(payload: DocumentPayload): Promise<{ id: number }>` (`POST /documents`); `updateDocument(id: number, payload: DocumentPayload): Promise<{ ok: boolean }>` (`PATCH /documents/:id`)
  - `NotificationItem { id; kind; title; body; url?; email_status?; push_status?; seen_at?; created_at; expires_at? }`, `NotificationsResponse { notifications: NotificationItem[]; unread_count: number }`
  - `fetchNotifications(): Promise<NotificationsResponse>`; `markNotificationSeen(id: number): Promise<{ ok: boolean }>`; `markAllNotificationsSeen(): Promise<{ ok: boolean; marked_seen: number }>`

- [ ] **Step 1: Viết test hỏng**

```ts
// web/src/core/api/documents.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiClient } from '../../shared/utils/api';
import { createDocument, updateDocument, type DocumentPayload } from './documents';

vi.mock('../../shared/utils/api', () => ({ apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn() } }));

const payload: DocumentPayload = {
  name: 'Quy chế',
  link_url: 'https://example.com/a',
  description: 'Mô tả',
  applicable_year: 2026,
  issuing_team_id: 3,
  visibility: 'all_teams',
};

describe('documents api (ghi)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('createDocument: POST /documents với body đúng, trả {id}', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { id: 9 } });
    await expect(createDocument(payload)).resolves.toEqual({ id: 9 });
    expect(apiClient.post).toHaveBeenCalledWith('/documents', payload);
  });

  it('updateDocument: PATCH /documents/:id với body đúng', async () => {
    vi.mocked(apiClient.patch).mockResolvedValueOnce({ data: { ok: true } });
    await expect(updateDocument(7, payload)).resolves.toEqual({ ok: true });
    expect(apiClient.patch).toHaveBeenCalledWith('/documents/7', payload);
  });
});
```

```ts
// web/src/core/api/notifications.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiClient } from '../../shared/utils/api';
import { fetchNotifications, markAllNotificationsSeen, markNotificationSeen } from './notifications';

vi.mock('../../shared/utils/api', () => ({ apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn() } }));

describe('notifications api', () => {
  beforeEach(() => vi.clearAllMocks());

  it('fetchNotifications: GET /notifications', async () => {
    const data = { notifications: [], unread_count: 0 };
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data });
    await expect(fetchNotifications()).resolves.toEqual(data);
    expect(apiClient.get).toHaveBeenCalledWith('/notifications');
  });

  it('markNotificationSeen: PATCH /notifications/:id/seen', async () => {
    vi.mocked(apiClient.patch).mockResolvedValueOnce({ data: { ok: true } });
    await expect(markNotificationSeen(5)).resolves.toEqual({ ok: true });
    expect(apiClient.patch).toHaveBeenCalledWith('/notifications/5/seen');
  });

  it('markAllNotificationsSeen: POST /notifications/seen', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { ok: true, marked_seen: 3 } });
    await expect(markAllNotificationsSeen()).resolves.toEqual({ ok: true, marked_seen: 3 });
    expect(apiClient.post).toHaveBeenCalledWith('/notifications/seen');
  });
});
```

Thêm vào cuối `describe('apiErrorMessage', …)` trong `web/src/core/api/errors.test.ts` một ca mới (trước dấu `});` đóng describe):

```ts
  it('dịch câu lỗi của văn bản và thông báo', () => {
    expect(translateServerError('Complete every document field with valid information.')).toBe(
      'Vui lòng điền đủ và đúng mọi trường của văn bản.'
    );
    expect(translateServerError('The issuing team is unavailable.')).toBe('Tổ ban hành không còn khả dụng.');
    expect(translateServerError('You may only issue documents for your teams.')).toBe(
      'Bạn chỉ được ban hành văn bản cho các Tổ của mình.'
    );
    expect(translateServerError('Document not found.')).toBe('Không tìm thấy văn bản.');
    expect(translateServerError('You cannot edit this document.')).toBe('Bạn không có quyền sửa văn bản này.');
    expect(translateServerError('Notification not found.')).toBe('Không tìm thấy thông báo.');
  });
```

- [ ] **Step 2: Chạy, xác nhận hỏng**

Run: `npx vitest run src/core/api/documents.test.ts src/core/api/notifications.test.ts src/core/api/errors.test.ts`
Expected: FAIL — `createDocument`/`./notifications` chưa có; ca dịch lỗi trả câu tiếng Anh.

- [ ] **Step 3: Viết code**

Thêm cuối `web/src/core/api/types.ts`:

```ts
export interface DocumentPayload {
  name: string;
  link_url: string;
  description: string;
  applicable_year: number;
  issuing_team_id: number;
  visibility: 'issuing_team' | 'all_teams';
}

export interface NotificationItem {
  id: number;
  kind: string;
  title: string;
  body: string;
  /** Hash cũ của Core, vd. `/#activity/12`. */
  url?: string | null;
  email_status?: string | null;
  push_status?: string | null;
  seen_at?: string | null;
  created_at: string;
  expires_at?: string;
}

export interface NotificationsResponse {
  notifications: NotificationItem[];
  unread_count: number;
}
```

Sửa `web/src/core/api/documents.ts` (giữ `fetchDocuments`, đổi dòng import và thêm hai hàm):

```ts
import { apiClient } from '../../shared/utils/api';
import type { DocumentsResponse, DocumentFilterParams, DocumentPayload } from './types';

/**
 * Fetch documents and available filter options.
 * Endpoint: GET /api/documents
 */
export async function fetchDocuments(params?: DocumentFilterParams): Promise<DocumentsResponse> {
  const response = await apiClient.get<DocumentsResponse>('/documents', { params });
  return response.data;
}

/**
 * Thêm văn bản (chỉ link). Endpoint: POST /api/documents
 */
export async function createDocument(payload: DocumentPayload): Promise<{ id: number }> {
  const response = await apiClient.post<{ id: number }>('/documents', payload);
  return response.data;
}

/**
 * Sửa văn bản. Endpoint: PATCH /api/documents/:id
 */
export async function updateDocument(id: number, payload: DocumentPayload): Promise<{ ok: boolean }> {
  const response = await apiClient.patch<{ ok: boolean }>(`/documents/${id}`, payload);
  return response.data;
}
```

```ts
// web/src/core/api/notifications.ts
import { apiClient } from '../../shared/utils/api';
import type { NotificationsResponse } from './types';

/**
 * Hộp thông báo trong ứng dụng (tối đa 20 mục, giữ 7 ngày).
 * Endpoint: GET /api/notifications
 */
export async function fetchNotifications(): Promise<NotificationsResponse> {
  const response = await apiClient.get<NotificationsResponse>('/notifications');
  return response.data;
}

/**
 * Đánh dấu một thông báo đã xem.
 * Endpoint: PATCH /api/notifications/:id/seen
 */
export async function markNotificationSeen(id: number): Promise<{ ok: boolean }> {
  const response = await apiClient.patch<{ ok: boolean }>(`/notifications/${id}/seen`);
  return response.data;
}

/**
 * Đánh dấu tất cả thông báo đã xem.
 * Endpoint: POST /api/notifications/seen
 */
export async function markAllNotificationsSeen(): Promise<{ ok: boolean; marked_seen: number }> {
  const response = await apiClient.post<{ ok: boolean; marked_seen: number }>('/notifications/seen');
  return response.data;
}
```

Thêm dòng `export * from './notifications';` vào cuối `web/src/core/api/index.ts`.

Trong `web/src/core/api/errorMessages.ts`, thêm vào cuối object `VI_ERROR_MESSAGES` (trước `};`):

```ts
  // Văn bản
  'Complete every document field with valid information.': 'Vui lòng điền đủ và đúng mọi trường của văn bản.',
  'The issuing team is unavailable.': 'Tổ ban hành không còn khả dụng.',
  'You may only issue documents for your teams.': 'Bạn chỉ được ban hành văn bản cho các Tổ của mình.',
  'Document not found.': 'Không tìm thấy văn bản.',
  'You cannot edit this document.': 'Bạn không có quyền sửa văn bản này.',
  // Thông báo
  'Notification not found.': 'Không tìm thấy thông báo.',
```

- [ ] **Step 4: Chạy test**

Run: `npx vitest run src/core/api && npx tsc --noEmit -p .`
Expected: PASS, không lỗi kiểu.

- [ ] **Step 5: Commit**

```bash
git add web/src/core/api
git commit -m "feat(web): API thêm/sửa văn bản và hộp thông báo, dịch lỗi tiếng Việt

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Hộp thêm/sửa văn bản (`DocumentFormModal`)

**Files:**
- Create: `web/src/core/features/documents/DocumentFormModal.tsx`
- Test: `web/src/core/features/documents/DocumentFormModal.test.tsx`

**Interfaces:**
- Consumes: `createDocument`, `updateDocument`, `apiErrorMessage`, `DocumentItem`, `DocumentTeamOption`, `DocumentPayload` (Task 1); `useToast`; `LinkField`, `LINK_ERROR_MESSAGE`; `isHttpUrl`; `todayVnKey`.
- Produces: `DocumentFormModal: React.FC<{ isOpen: boolean; document: DocumentItem | null; issueTeams: DocumentTeamOption[]; onClose: () => void }>`. `document === null` là thêm mới. Thành công: `invalidateQueries(['core-documents'])`, toast `Đã thêm văn bản.` / `Đã cập nhật văn bản.`, gọi `onClose`.

- [ ] **Step 1: Viết test hỏng**

```tsx
// web/src/core/features/documents/DocumentFormModal.test.tsx
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DocumentFormModal } from './DocumentFormModal';
import { ToastProvider } from '../../../shared/components/Toast';
import { LINK_ERROR_MESSAGE } from '../../../shared/components/LinkField';
import { todayVnKey } from '../../../shared/utils/date';
import * as api from '../../api';

vi.mock('../../api', async () => {
  const actual = await vi.importActual<typeof import('../../api')>('../../api');
  return { ...actual, createDocument: vi.fn(), updateDocument: vi.fn() };
});

const teams = [
  { id: 1, name: 'Tổ Tuyên huấn' },
  { id: 2, name: 'Tổ Sự kiện' },
];

const existing: api.DocumentItem = {
  id: 7,
  name: 'Quy chế cũ',
  link_url: 'https://example.com/cu',
  description: 'Mô tả cũ',
  applicable_year: 2025,
  issuing_team_id: 2,
  team_name: 'Tổ Sự kiện',
  visibility: 'all_teams',
};

function setup(props: Partial<React.ComponentProps<typeof DocumentFormModal>> = {}) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const invalidate = vi.spyOn(qc, 'invalidateQueries');
  const onClose = vi.fn();
  render(
    <QueryClientProvider client={qc}>
      <ToastProvider>
        <DocumentFormModal isOpen document={null} issueTeams={teams} onClose={onClose} {...props} />
      </ToastProvider>
    </QueryClientProvider>
  );
  return { onClose, invalidate };
}

const fill = (label: RegExp, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });
const save = () => fireEvent.click(screen.getByRole('button', { name: 'Lưu văn bản' }));

describe('DocumentFormModal', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(cleanup);

  it('thêm mới: gửi đúng body (đã trim), làm mới danh sách, toast và đóng hộp', async () => {
    vi.mocked(api.createDocument).mockResolvedValueOnce({ id: 11 });
    const { onClose, invalidate } = setup();
    fill(/Tên văn bản/, '  Quy chế mới  ');
    fill(/Liên kết văn bản/, 'https://example.com/moi');
    fill(/Năm áp dụng/, '2027');
    fill(/Tổ ban hành/, '1');
    fill(/Phạm vi xem/, 'all_teams');
    fill(/Mô tả/, ' Phạm vi áp dụng ');
    save();
    await waitFor(() =>
      expect(api.createDocument).toHaveBeenCalledWith({
        name: 'Quy chế mới',
        link_url: 'https://example.com/moi',
        description: 'Phạm vi áp dụng',
        applicable_year: 2027,
        issuing_team_id: 1,
        visibility: 'all_teams',
      })
    );
    expect(await screen.findByText('Đã thêm văn bản.')).toBeDefined();
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['core-documents'] });
    expect(onClose).toHaveBeenCalled();
  });

  it('mặc định: năm hiện tại theo giờ VN, phạm vi "Thành viên Tổ ban hành", chưa chọn Tổ khi có nhiều Tổ', () => {
    setup();
    expect((screen.getByLabelText(/Năm áp dụng/) as HTMLInputElement).value).toBe(todayVnKey().slice(0, 4));
    expect((screen.getByLabelText(/Phạm vi xem/) as HTMLSelectElement).value).toBe('issuing_team');
    expect((screen.getByLabelText(/Tổ ban hành/) as HTMLSelectElement).value).toBe('');
  });

  it('chỉ có một Tổ thì tự chọn Tổ đó', () => {
    setup({ issueTeams: [teams[0]] });
    expect((screen.getByLabelText(/Tổ ban hành/) as HTMLSelectElement).value).toBe('1');
  });

  it('sửa: điền sẵn dữ liệu, gửi PATCH tới đúng id', async () => {
    vi.mocked(api.updateDocument).mockResolvedValueOnce({ ok: true });
    setup({ document: existing });
    expect((screen.getByLabelText(/Tên văn bản/) as HTMLInputElement).value).toBe('Quy chế cũ');
    expect((screen.getByLabelText(/Tổ ban hành/) as HTMLSelectElement).value).toBe('2');
    fill(/Tên văn bản/, 'Quy chế sửa');
    save();
    await waitFor(() =>
      expect(api.updateDocument).toHaveBeenCalledWith(7, {
        name: 'Quy chế sửa',
        link_url: 'https://example.com/cu',
        description: 'Mô tả cũ',
        applicable_year: 2025,
        issuing_team_id: 2,
        visibility: 'all_teams',
      })
    );
    expect(await screen.findByText('Đã cập nhật văn bản.')).toBeDefined();
    expect(api.createDocument).not.toHaveBeenCalled();
  });

  it('sửa: Tổ hiện tại không nằm trong issueTeams vẫn có trong danh sách chọn', () => {
    setup({ document: existing, issueTeams: [teams[0]] });
    expect((screen.getByLabelText(/Tổ ban hành/) as HTMLSelectElement).value).toBe('2');
  });

  it('kiểm tra phía client: thiếu tên / link sai / năm sai / chưa chọn Tổ / thiếu mô tả thì không gọi API', () => {
    setup();
    save();
    expect(screen.getByRole('alert').textContent).toBe('Vui lòng nhập tên văn bản.');

    fill(/Tên văn bản/, 'A');
    fill(/Liên kết văn bản/, 'ftp://x');
    save();
    expect(screen.getAllByText(LINK_ERROR_MESSAGE).length).toBeGreaterThan(0);

    fill(/Liên kết văn bản/, 'https://x.vn');
    fill(/Năm áp dụng/, '1800');
    save();
    expect(screen.getByRole('alert').textContent).toBe('Năm áp dụng phải từ 1900 đến 2100.');

    fill(/Năm áp dụng/, '2026');
    save();
    expect(screen.getByRole('alert').textContent).toBe('Vui lòng chọn Tổ ban hành.');

    fill(/Tổ ban hành/, '1');
    save();
    expect(screen.getByRole('alert').textContent).toBe('Vui lòng nhập mô tả văn bản.');

    expect(api.createDocument).not.toHaveBeenCalled();
  });

  it('lỗi 403 của server hiện bằng tiếng Việt, hộp không đóng', async () => {
    vi.mocked(api.createDocument).mockRejectedValueOnce({
      response: { status: 403, data: { error: 'You may only issue documents for your teams.' } },
    });
    const { onClose } = setup({ issueTeams: [teams[0]] });
    fill(/Tên văn bản/, 'A');
    fill(/Liên kết văn bản/, 'https://x.vn');
    fill(/Mô tả/, 'B');
    save();
    expect(await screen.findByText('Bạn chỉ được ban hành văn bản cho các Tổ của mình.')).toBeDefined();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('người chưa thuộc Tổ nào: báo rõ và khoá nút Lưu', () => {
    setup({ issueTeams: [] });
    expect(screen.getByText('Bạn chưa thuộc Tổ nào nên chưa thể ban hành văn bản.')).toBeDefined();
    expect((screen.getByRole('button', { name: 'Lưu văn bản' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('đóng hộp khi bấm Huỷ', () => {
    const { onClose } = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Huỷ' }));
    expect(onClose).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Chạy, xác nhận hỏng**

Run: `npx vitest run src/core/features/documents/DocumentFormModal.test.tsx`
Expected: FAIL — không resolve `./DocumentFormModal`.

- [ ] **Step 3: Viết code**

```tsx
// web/src/core/features/documents/DocumentFormModal.tsx
import React, { useEffect, useId, useMemo, useState } from 'react';
import Modal, { ModalBody, ModalFooter, ModalHeader, ModalTitle, ModalTransition } from '@atlaskit/modal-dialog';
import Button from '@atlaskit/button/new';
import Textfield from '@atlaskit/textfield';
import TextArea from '@atlaskit/textarea';
import { token } from '@atlaskit/tokens';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  apiErrorMessage,
  createDocument,
  updateDocument,
  type DocumentItem,
  type DocumentPayload,
  type DocumentTeamOption,
} from '../../api';
import { useToast } from '../../../shared/components/Toast';
import { LinkField, LINK_ERROR_MESSAGE } from '../../../shared/components/LinkField';
import { isHttpUrl } from '../../../shared/utils/url';
import { todayVnKey } from '../../../shared/utils/date';

export interface DocumentFormModalProps {
  isOpen: boolean;
  /** `null` = thêm mới. */
  document: DocumentItem | null;
  issueTeams: DocumentTeamOption[];
  onClose: () => void;
}

interface FormState {
  name: string;
  link_url: string;
  year: string;
  team: string;
  visibility: 'issuing_team' | 'all_teams';
  description: string;
}

function initialState(document: DocumentItem | null, issueTeams: DocumentTeamOption[]): FormState {
  if (document) {
    return {
      name: document.name,
      link_url: document.link_url,
      year: String(document.applicable_year),
      team: String(document.issuing_team_id),
      visibility: document.visibility === 'all_teams' ? 'all_teams' : 'issuing_team',
      description: document.description ?? '',
    };
  }
  return {
    name: '',
    link_url: '',
    year: todayVnKey().slice(0, 4),
    team: issueTeams.length === 1 ? String(issueTeams[0].id) : '',
    visibility: 'issuing_team',
    description: '',
  };
}

/** Luật của `POST/PATCH /api/documents` (core/src/routes/documents.js); server vẫn kiểm lại. */
function validate(form: FormState): string | null {
  const name = form.name.trim();
  if (!name) return 'Vui lòng nhập tên văn bản.';
  if (name.length > 200) return 'Tên văn bản không quá 200 ký tự.';
  if (!isHttpUrl(form.link_url)) return LINK_ERROR_MESSAGE;
  const year = Number(form.year);
  if (!form.year.trim() || !Number.isInteger(year) || year < 1900 || year > 2100) return 'Năm áp dụng phải từ 1900 đến 2100.';
  if (!form.team) return 'Vui lòng chọn Tổ ban hành.';
  const description = form.description.trim();
  if (!description) return 'Vui lòng nhập mô tả văn bản.';
  if (description.length > 4000) return 'Mô tả không quá 4000 ký tự.';
  return null;
}

const selectStyle: React.CSSProperties = {
  width: '100%',
  height: 40,
  padding: '0 8px',
  borderRadius: 3,
  border: `1px solid ${token('color.border', '#DFE1E6')}`,
  background: token('elevation.surface', '#fff'),
  color: token('color.text', '#172B4D'),
};

const FieldRow: React.FC<{ htmlFor: string; label: string; children: React.ReactNode }> = ({ htmlFor, label, children }) => (
  <div style={{ marginBottom: 12 }}>
    <label htmlFor={htmlFor} style={{ display: 'block', marginBottom: 4, fontSize: 12, fontWeight: 600 }}>{label}</label>
    {children}
  </div>
);

export const DocumentFormModal: React.FC<DocumentFormModalProps> = ({ isOpen, document, issueTeams, onClose }) => {
  const queryClient = useQueryClient();
  const toast = useToast();
  const ids = { name: useId(), year: useId(), team: useId(), visibility: useId(), description: useId() };
  const [form, setForm] = useState<FormState>(() => initialState(document, issueTeams));
  const [error, setError] = useState('');

  // Chỉ nạp lại form khi mở hộp hoặc đổi văn bản; tải lại danh sách giữa chừng không được xoá chữ đang gõ.
  useEffect(() => {
    if (isOpen) {
      setForm(initialState(document, issueTeams));
      setError('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, document?.id]);

  const teamOptions = useMemo(() => {
    if (document && !issueTeams.some((t) => t.id === document.issuing_team_id)) {
      return [...issueTeams, { id: document.issuing_team_id, name: document.team_name ?? `Tổ #${document.issuing_team_id}` }];
    }
    return issueTeams;
  }, [document, issueTeams]);

  const mutation = useMutation({
    mutationFn: (payload: DocumentPayload) => (document ? updateDocument(document.id, payload) : createDocument(payload)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['core-documents'] });
      toast.success(document ? 'Đã cập nhật văn bản.' : 'Đã thêm văn bản.');
      onClose();
    },
    onError: (err) => setError(apiErrorMessage(err, 'Không lưu được văn bản.')),
  });

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((prev) => ({ ...prev, [key]: value }));

  const submit = () => {
    const invalid = validate(form);
    if (invalid) {
      setError(invalid);
      return;
    }
    setError('');
    mutation.mutate({
      name: form.name.trim(),
      link_url: form.link_url.trim(),
      description: form.description.trim(),
      applicable_year: Number(form.year),
      issuing_team_id: Number(form.team),
      visibility: form.visibility,
    });
  };

  const noTeam = teamOptions.length === 0;

  return (
    <ModalTransition>
      {isOpen && (
        <Modal onClose={onClose} width="medium">
          <ModalHeader><ModalTitle>{document ? 'Sửa văn bản' : 'Thêm văn bản'}</ModalTitle></ModalHeader>
          <ModalBody>
            <form noValidate onSubmit={(e) => { e.preventDefault(); submit(); }}>
              <FieldRow htmlFor={ids.name} label="Tên văn bản *">
                <Textfield id={ids.name} value={form.name} maxLength={200} onChange={(e) => set('name', (e.target as HTMLInputElement).value)} />
              </FieldRow>
              <LinkField label="Liên kết văn bản" isRequired value={form.link_url} onChange={(v) => set('link_url', v)} />
              <div style={{ height: 12 }} />
              <FieldRow htmlFor={ids.year} label="Năm áp dụng *">
                <Textfield id={ids.year} type="number" min={1900} max={2100} value={form.year} onChange={(e) => set('year', (e.target as HTMLInputElement).value)} />
              </FieldRow>
              <FieldRow htmlFor={ids.team} label="Tổ ban hành *">
                <select id={ids.team} value={form.team} style={selectStyle} onChange={(e) => set('team', e.target.value)}>
                  <option value="">Chọn Tổ</option>
                  {teamOptions.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </FieldRow>
              {noTeam && (
                <p style={{ color: token('color.text.warning', '#946F00'), marginTop: -4 }}>
                  Bạn chưa thuộc Tổ nào nên chưa thể ban hành văn bản.
                </p>
              )}
              <FieldRow htmlFor={ids.visibility} label="Phạm vi xem *">
                <select id={ids.visibility} value={form.visibility} style={selectStyle} onChange={(e) => set('visibility', e.target.value as FormState['visibility'])}>
                  <option value="issuing_team">Thành viên Tổ ban hành</option>
                  <option value="all_teams">Tất cả các Tổ</option>
                </select>
              </FieldRow>
              <FieldRow htmlFor={ids.description} label="Mô tả *">
                <TextArea id={ids.description} value={form.description} maxLength={4000} minimumRows={3} onChange={(e) => set('description', e.target.value)} />
              </FieldRow>
              {error && <p role="alert" style={{ color: token('color.text.danger', '#AE2E24') }}>{error}</p>}
            </form>
          </ModalBody>
          <ModalFooter>
            <Button appearance="subtle" onClick={onClose}>Huỷ</Button>
            <Button appearance="primary" isLoading={mutation.isPending} isDisabled={noTeam} onClick={submit}>Lưu văn bản</Button>
          </ModalFooter>
        </Modal>
      )}
    </ModalTransition>
  );
};
```

- [ ] **Step 4: Chạy test**

Run: `npx vitest run src/core/features/documents/DocumentFormModal.test.tsx && npx tsc --noEmit -p .`
Expected: PASS. Nếu ca "kiểm tra phía client" lỗi vì `getByRole('alert')` thấy hai phần tử (LinkField cũng có `role="alert"` khi link sai): ở bước `ftp://x` đã dùng `getAllByText`; các bước sau link đã hợp lệ nên chỉ còn một alert.

- [ ] **Step 5: Commit**

```bash
git add web/src/core/features/documents/DocumentFormModal.tsx web/src/core/features/documents/DocumentFormModal.test.tsx
git commit -m "feat(web): hộp thêm/sửa văn bản

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 3: `DocumentsView` — nút Thêm/Sửa, dòng người tạo

**Files:**
- Modify: `web/src/core/features/documents/DocumentsView.tsx`, `web/src/core/features/documents/DocumentsView.test.tsx`

**Interfaces:**
- Consumes: `DocumentFormModal` (Task 2), `formatVnDate`, `DocumentItem.can_edit`/`creator_name`/`created_at`.

- [ ] **Step 1: Sửa test (viết ca mới hỏng + chỉnh ca cũ)**

Trong `DocumentsView.test.tsx`:

1. Thêm import: `import { ToastProvider } from '../../../shared/components/Toast';` và sửa mock thêm `createDocument: vi.fn(), updateDocument: vi.fn(),` cạnh `fetchDocuments: vi.fn(),`.
2. Dữ liệu mẫu: thêm vào văn bản `id: 1`: `can_edit: true, creator_name: 'Nguyễn Văn A', created_at: '2026-03-04T05:00:00.000Z',`; văn bản `id: 2` giữ nguyên (không có `can_edit`).
3. `renderWithClient` bọc thêm `ToastProvider`:

```tsx
  const renderWithClient = (ui: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <ToastProvider>{ui}</ToastProvider>
      </QueryClientProvider>
    );
  };
```
4. Thay ca đầu tiên (`renders header title and subtitle without a dead "Thêm văn bản" button`) bằng:

```tsx
  it('hiện tiêu đề, mô tả và nút "Thêm văn bản" cho mọi người dùng', async () => {
    renderWithClient(<DocumentsView />);
    expect(screen.getByText('Văn bản')).toBeDefined();
    expect(screen.getByText('Danh mục liên kết văn bản do các Tổ TCKT ban hành.')).toBeDefined();
    const add = await screen.findByRole('button', { name: 'Thêm văn bản' });
    await waitFor(() => expect((add as HTMLButtonElement).disabled).toBe(false));
  });
```
5. Thêm các ca cuối `describe`:

```tsx
  it('nút "Sửa" chỉ có ở văn bản can_edit; thẻ có dòng "Bởi … · ngày"', async () => {
    renderWithClient(<DocumentsView />);
    await screen.findByText('Quy chế Tổ chức và Hoạt động TCKT 2026');
    expect(screen.getAllByRole('button', { name: 'Sửa' })).toHaveLength(1);
    expect(screen.getByTestId('document-item-1').textContent).toContain('Bởi Nguyễn Văn A · 04/03/2026');
    expect(screen.getByTestId('document-item-2').textContent).not.toContain('Sửa');
  });

  it('bấm Sửa mở hộp điền sẵn dữ liệu của văn bản', async () => {
    renderWithClient(<DocumentsView />);
    await screen.findByText('Quy chế Tổ chức và Hoạt động TCKT 2026');
    fireEvent.click(screen.getByRole('button', { name: 'Sửa' }));
    expect(await screen.findByRole('heading', { name: 'Sửa văn bản' })).toBeDefined();
    expect((screen.getByLabelText(/Tên văn bản/) as HTMLInputElement).value).toBe('Quy chế Tổ chức và Hoạt động TCKT 2026');
  });

  it('thêm văn bản: gửi đúng body rồi tải lại danh sách', async () => {
    vi.mocked(api.createDocument).mockResolvedValueOnce({ id: 3 });
    renderWithClient(<DocumentsView />);
    const add = await screen.findByRole('button', { name: 'Thêm văn bản' });
    await waitFor(() => expect((add as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(add);
    await screen.findByRole('heading', { name: 'Thêm văn bản' });
    fireEvent.change(screen.getByLabelText(/Tên văn bản/), { target: { value: 'Kế hoạch mới' } });
    fireEvent.change(screen.getByLabelText(/Liên kết văn bản/), { target: { value: 'https://example.com/kh' } });
    fireEvent.change(screen.getByLabelText(/Năm áp dụng/), { target: { value: '2026' } });
    fireEvent.change(screen.getByLabelText(/Tổ ban hành/), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText(/Mô tả/), { target: { value: 'Kế hoạch năm' } });
    const callsBefore = vi.mocked(api.fetchDocuments).mock.calls.length;
    fireEvent.click(screen.getByRole('button', { name: 'Lưu văn bản' }));
    await waitFor(() =>
      expect(api.createDocument).toHaveBeenCalledWith({
        name: 'Kế hoạch mới',
        link_url: 'https://example.com/kh',
        description: 'Kế hoạch năm',
        applicable_year: 2026,
        issuing_team_id: 1,
        visibility: 'issuing_team',
      })
    );
    await waitFor(() => expect(vi.mocked(api.fetchDocuments).mock.calls.length).toBeGreaterThan(callsBefore));
  });
```

- [ ] **Step 2: Chạy, xác nhận hỏng**

Run: `npx vitest run src/core/features/documents/DocumentsView.test.tsx`
Expected: FAIL — chưa có nút "Thêm văn bản"/"Sửa", chưa có dòng "Bởi".

- [ ] **Step 3: Sửa `DocumentsView.tsx`**

(a) Import: thêm
```tsx
import Button from '@atlaskit/button/new';
import { DocumentFormModal } from './DocumentFormModal';
import { formatVnDate } from '../../../shared/utils/date';
```
(b) Trong component, sau dòng `const [teamFilter, setTeamFilter] = useState('all');` thêm:
```tsx
  const [formState, setFormState] = useState<{ open: boolean; doc: DocumentItem | null }>({ open: false, doc: null });
```
(c) Khối header: ngay sau thẻ đóng `</div>` của cụm `<div> <h1>Văn bản</h1> <p>…</p> </div>` (cùng cấp, vẫn trong `div` flex `space-between`) thêm:
```tsx
        <Button appearance="primary" isDisabled={!data} onClick={() => setFormState({ open: true, doc: null })}>
          Thêm văn bản
        </Button>
```
(d) Trong thẻ văn bản, ngay sau khối `{doc.description && (<p …>…</p>)}` thêm:
```tsx
                <div style={{ marginTop: '8px', fontSize: '12px', color: token('color.text.subtle', '#5E6C84') }}>
                  Bởi {doc.creator_name ?? 'không rõ'}
                  {doc.created_at ? ` · ${formatVnDate(doc.created_at)}` : ''}
                </div>
```
(e) Cột phải của thẻ (hiện chỉ có `<div><LinkButton …>Mở liên kết ↗</LinkButton></div>`) đổi thành:
```tsx
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                {doc.can_edit && (
                  <Button appearance="default" onClick={() => setFormState({ open: true, doc })}>Sửa</Button>
                )}
                <LinkButton
                  appearance="subtle"
                  href={doc.link_url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Mở liên kết ↗
                </LinkButton>
              </div>
```
(f) Trước thẻ đóng `</div>` cuối của component (cùng cấp với `{isLoading ? … }`) thêm:
```tsx
      <DocumentFormModal
        isOpen={formState.open}
        document={formState.doc}
        issueTeams={data?.issueTeams ?? []}
        onClose={() => setFormState((s) => ({ ...s, open: false }))}
      />
```

- [ ] **Step 4: Chạy test**

Run: `npx vitest run src/core/features/documents && npx tsc --noEmit -p .`
Expected: PASS (gồm các ca cũ về tìm kiếm, link `<a>`, trạng thái rỗng).

- [ ] **Step 5: Commit**

```bash
git add web/src/core/features/documents
git commit -m "feat(web): thêm/sửa văn bản ngay trên trang Văn bản

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Hàm thuần của thông báo (đường dẫn, Việt hoá, cache)

**Files:**
- Create: `web/src/core/features/notifications/notificationUrl.ts`, `notificationText.ts`, `notificationCache.ts`
- Test: `notificationUrl.test.ts`, `notificationText.test.ts`, `notificationCache.test.ts` (cùng thư mục)

**Interfaces:**
- Produces:
  - `notificationRoute(url?: string | null): string` — đường dẫn router.
  - `notificationTitle(title: string): string`, `notificationBody(body: string): string`, `deliveryLabel(channel: 'email' | 'push', status: string): string`.
  - `markOneSeen(prev: NotificationsResponse, id: number, now?: string): NotificationsResponse`, `markAllSeen(prev: NotificationsResponse, now?: string): NotificationsResponse`.

- [ ] **Step 1: Viết test hỏng**

```ts
// web/src/core/features/notifications/notificationUrl.test.ts
import { describe, it, expect } from 'vitest';
import { notificationRoute } from './notificationUrl';

describe('notificationRoute', () => {
  it('đổi hash cũ của Core thành đường dẫn router', () => {
    expect(notificationRoute('/#activity/12')).toBe('/activity/12');
    expect(notificationRoute('#activity/12')).toBe('/activity/12');
    expect(notificationRoute('#/activity/12')).toBe('/activity/12');
    expect(notificationRoute('/#ops-log/3')).toBe('/ops-log/3');
    expect(notificationRoute('/#my-tasks-today')).toBe('/my-tasks-today');
  });

  it('chấp nhận URL tuyệt đối, chỉ lấy phần hash', () => {
    expect(notificationRoute('https://hub.example.edu.vn/#directive/5')).toBe('/directive/5');
  });

  it('không có hash hoặc rỗng thì về Tổng quan', () => {
    expect(notificationRoute('')).toBe('/dashboard');
    expect(notificationRoute(null)).toBe('/dashboard');
    expect(notificationRoute(undefined)).toBe('/dashboard');
    expect(notificationRoute('/')).toBe('/dashboard');
    expect(notificationRoute('/#')).toBe('/dashboard');
    expect(notificationRoute('/#/')).toBe('/dashboard');
  });
});
```

```ts
// web/src/core/features/notifications/notificationText.test.ts
import { describe, it, expect } from 'vitest';
import { deliveryLabel, notificationBody, notificationTitle } from './notificationText';

describe('notificationText', () => {
  it('dịch tiêu đề tiếng Anh đã biết, giữ nguyên tiêu đề tiếng Việt và câu lạ', () => {
    expect(notificationTitle('You were tagged in a comment')).toBe('Bạn được gắn thẻ trong một bình luận');
    expect(notificationTitle('New task response')).toBe('Phản hồi mới về công việc');
    expect(notificationTitle('Công việc mới')).toBe('Công việc mới');
    expect(notificationTitle('Something else')).toBe('Something else');
  });

  it('dịch nội dung theo mẫu của Core, giữ nguyên nội dung khác', () => {
    expect(notificationBody('Lan tagged you in “Hội nghị”.')).toBe('Lan đã gắn thẻ bạn trong “Hội nghị”.');
    expect(notificationBody('Minh responded to “Soạn kế hoạch”.')).toBe('Minh đã phản hồi về “Soạn kế hoạch”.');
    expect(notificationBody('Bạn được giao: Soạn kế hoạch')).toBe('Bạn được giao: Soạn kế hoạch');
  });

  it('nhãn trạng thái gửi', () => {
    expect(deliveryLabel('email', 'success')).toBe('Email: đã gửi');
    expect(deliveryLabel('email', 'pending')).toBe('Email: đang chờ');
    expect(deliveryLabel('email', 'failed')).toBe('Email: lỗi');
    expect(deliveryLabel('push', 'sent')).toBe('Push: đã gửi');
    expect(deliveryLabel('push', 'weird')).toBe('Push: weird');
  });
});
```

```ts
// web/src/core/features/notifications/notificationCache.test.ts
import { describe, it, expect } from 'vitest';
import { markAllSeen, markOneSeen } from './notificationCache';
import type { NotificationsResponse } from '../../api';

const base = (): NotificationsResponse => ({
  unread_count: 2,
  notifications: [
    { id: 3, kind: 'k', title: 'a', body: 'b', created_at: '2026-10-09T01:00:00Z', seen_at: null },
    { id: 2, kind: 'k', title: 'a', body: 'b', created_at: '2026-10-09T00:30:00Z', seen_at: null },
    { id: 1, kind: 'k', title: 'a', body: 'b', created_at: '2026-10-08T00:00:00Z', seen_at: '2026-10-08T01:00:00Z' },
  ],
});

describe('notificationCache', () => {
  it('markOneSeen: đánh dấu mục chưa xem và trừ 1', () => {
    const next = markOneSeen(base(), 3, '2026-10-09T02:00:00Z');
    expect(next.unread_count).toBe(1);
    expect(next.notifications.find((n) => n.id === 3)?.seen_at).toBe('2026-10-09T02:00:00Z');
    expect(next.notifications.find((n) => n.id === 2)?.seen_at).toBeNull();
  });

  it('markOneSeen: mục đã xem hoặc không có trong cache thì giữ nguyên, không trừ hai lần', () => {
    const prev = base();
    expect(markOneSeen(prev, 1)).toEqual(prev);
    expect(markOneSeen(prev, 99)).toEqual(prev);
  });

  it('markOneSeen: không để unread_count âm', () => {
    const prev = { ...base(), unread_count: 0 };
    expect(markOneSeen(prev, 3).unread_count).toBe(0);
  });

  it('markAllSeen: mọi mục có seen_at và unread_count = 0, giữ seen_at cũ', () => {
    const next = markAllSeen(base(), '2026-10-09T02:00:00Z');
    expect(next.unread_count).toBe(0);
    expect(next.notifications.map((n) => n.seen_at)).toEqual([
      '2026-10-09T02:00:00Z',
      '2026-10-09T02:00:00Z',
      '2026-10-08T01:00:00Z',
    ]);
  });
});
```

- [ ] **Step 2: Chạy, xác nhận hỏng**

Run: `npx vitest run src/core/features/notifications`
Expected: FAIL — không resolve các module.

- [ ] **Step 3: Viết code**

```ts
// web/src/core/features/notifications/notificationUrl.ts
/**
 * `url` của thông báo là hash cũ của Core (`/#activity/12`). Đổi thành đường dẫn của HashRouter (`/activity/12`).
 * Không có hash thì về Tổng quan, như UI cũ (`target.hash || '#dashboard'`).
 */
export function notificationRoute(url?: string | null): string {
  if (!url) return '/dashboard';
  let hash: string;
  try {
    hash = new URL(url, 'http://localhost').hash;
  } catch {
    return '/dashboard';
  }
  const path = hash.replace(/^#\/?/, '');
  return path ? `/${path}` : '/dashboard';
}
```

```ts
// web/src/core/features/notifications/notificationText.ts
// Core lưu một số tiêu đề/nội dung thông báo bằng tiếng Anh (core/src/routes/activities.js). Câu không có trong bảng hiện nguyên văn.
const TITLES: Record<string, string> = {
  'You were tagged in a comment': 'Bạn được gắn thẻ trong một bình luận',
  'New task response': 'Phản hồi mới về công việc',
  'Task due today': 'Công việc đến hạn hôm nay',
};

const BODY_PATTERNS: Array<[RegExp, (m: RegExpMatchArray) => string]> = [
  [/^([\s\S]+) tagged you in (“[\s\S]+”)\.$/, (m) => `${m[1]} đã gắn thẻ bạn trong ${m[2]}.`],
  [/^([\s\S]+) responded to (“[\s\S]+”)\.$/, (m) => `${m[1]} đã phản hồi về ${m[2]}.`],
];

const DELIVERY_STATUS: Record<string, string> = {
  success: 'đã gửi',
  sent: 'đã gửi',
  pending: 'đang chờ',
  failed: 'lỗi',
  skipped: 'bỏ qua',
};

export function notificationTitle(title: string): string {
  return TITLES[title] ?? title;
}

export function notificationBody(body: string): string {
  for (const [pattern, build] of BODY_PATTERNS) {
    const match = body.match(pattern);
    if (match) return build(match);
  }
  return body;
}

export function deliveryLabel(channel: 'email' | 'push', status: string): string {
  return `${channel === 'email' ? 'Email' : 'Push'}: ${DELIVERY_STATUS[status] ?? status}`;
}
```

```ts
// web/src/core/features/notifications/notificationCache.ts
import type { NotificationsResponse } from '../../api';

/** Đánh dấu một mục đã xem trong cache; chỉ trừ huy hiệu nếu mục đó đang chưa xem. */
export function markOneSeen(prev: NotificationsResponse, id: number, now: string = new Date().toISOString()): NotificationsResponse {
  const target = prev.notifications.find((n) => n.id === id);
  if (!target || target.seen_at) return prev;
  return {
    notifications: prev.notifications.map((n) => (n.id === id ? { ...n, seen_at: now } : n)),
    unread_count: Math.max(0, prev.unread_count - 1),
  };
}

/** Đánh dấu mọi mục đã xem trong cache, huy hiệu về 0. */
export function markAllSeen(prev: NotificationsResponse, now: string = new Date().toISOString()): NotificationsResponse {
  return {
    notifications: prev.notifications.map((n) => (n.seen_at ? n : { ...n, seen_at: now })),
    unread_count: 0,
  };
}
```

- [ ] **Step 4: Chạy test**

Run: `npx vitest run src/core/features/notifications && npx tsc --noEmit -p .`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add web/src/core/features/notifications
git commit -m "feat(web): hàm thuần cho thông báo (đường dẫn, Việt hoá, cache đã xem)

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Chuông thông báo — huy hiệu, bảng, đánh dấu đã xem, đi tới `url`

**Files:**
- Create: `web/src/core/features/notifications/useNotifications.ts`, `useOpenNotification.ts`, `NotificationBell.tsx`
- Test: `web/src/core/features/notifications/NotificationBell.test.tsx`

**Interfaces:**
- Consumes: `fetchNotifications`, `markNotificationSeen`, `markAllNotificationsSeen` (Task 1); `notificationRoute`, `notificationTitle`, `notificationBody`, `deliveryLabel`, `markOneSeen`, `markAllSeen` (Task 4); `useToast`.
- Produces:
  - `NOTIFICATIONS_KEY = ['core-notifications'] as const`, `NOTIFICATIONS_POLL_MS = 60_000`, `useNotifications()` (react-query, `refetchInterval` 60 giây).
  - `useOpenNotification(): (item: NotificationItem) => void` — cập nhật lạc quan cache, `PATCH …/seen` (nếu mục chưa xem trong cache), rồi `navigate(notificationRoute(item.url))`.
  - `NotificationBell: React.FC` — cần `QueryClientProvider`, `ToastProvider`, router.

- [ ] **Step 1: Viết test hỏng**

```tsx
// web/src/core/features/notifications/NotificationBell.test.tsx
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { NotificationBell } from './NotificationBell';
import { ToastProvider } from '../../../shared/components/Toast';
import * as api from '../../api';

vi.mock('../../api', async () => {
  const actual = await vi.importActual<typeof import('../../api')>('../../api');
  return { ...actual, fetchNotifications: vi.fn(), markNotificationSeen: vi.fn(), markAllNotificationsSeen: vi.fn() };
});

const item = (id: number, over: Partial<api.NotificationItem> = {}): api.NotificationItem => ({
  id,
  kind: 'comment_tag',
  title: 'You were tagged in a comment',
  body: 'Lan tagged you in “Hội nghị”.',
  url: '/#activity/12',
  email_status: null,
  push_status: null,
  seen_at: null,
  created_at: '2026-10-09T01:00:00.000Z',
  ...over,
});

const Probe = () => <div data-testid="path">{useLocation().pathname}</div>;

function setup(data: api.NotificationsResponse) {
  vi.mocked(api.fetchNotifications).mockResolvedValue(data);
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  render(
    <QueryClientProvider client={qc}>
      <ToastProvider>
        <MemoryRouter initialEntries={['/dashboard']}>
          <div data-testid="outside">ngoài</div>
          <NotificationBell />
          <Routes><Route path="*" element={<Probe />} /></Routes>
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>
  );
  return qc;
}

const bellButton = () => screen.getByRole('button', { name: /^Thông báo/ });
const badge = () => screen.queryByTestId('notification-badge');

describe('NotificationBell', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.markNotificationSeen).mockResolvedValue({ ok: true });
    vi.mocked(api.markAllNotificationsSeen).mockResolvedValue({ ok: true, marked_seen: 2 });
  });
  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  it('huy hiệu hiện số chưa xem, tối đa "99+", ẩn khi 0', async () => {
    setup({ notifications: [item(1)], unread_count: 7 });
    await waitFor(() => expect(badge()?.textContent).toBe('7'));
    cleanup();
    setup({ notifications: [item(1)], unread_count: 120 });
    await waitFor(() => expect(badge()?.textContent).toBe('99+'));
    cleanup();
    setup({ notifications: [item(1, { seen_at: '2026-10-09T02:00:00Z' })], unread_count: 0 });
    await waitFor(() => expect(api.fetchNotifications).toHaveBeenCalled());
    await waitFor(() => expect(badge()).toBeNull());
  });

  it('tải lại mỗi 60 giây', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    setup({ notifications: [], unread_count: 0 });
    await waitFor(() => expect(api.fetchNotifications).toHaveBeenCalledTimes(1));
    await vi.advanceTimersByTimeAsync(60_000);
    await waitFor(() => expect(vi.mocked(api.fetchNotifications).mock.calls.length).toBeGreaterThanOrEqual(2));
  });

  it('mở bảng: tải lại, gọi đánh dấu tất cả đã xem đúng một lần, huy hiệu về 0, hiện mục đã dịch', async () => {
    setup({
      notifications: [item(2, { email_status: 'success' }), item(1)],
      unread_count: 2,
    });
    await waitFor(() => expect(badge()?.textContent).toBe('2'));
    const callsBefore = vi.mocked(api.fetchNotifications).mock.calls.length;

    fireEvent.click(bellButton());

    const dialog = await screen.findByRole('dialog', { name: 'Thông báo' });
    expect(within(dialog).getByText('Lưu trong 7 ngày')).toBeDefined();
    expect(within(dialog).getAllByText('Bạn được gắn thẻ trong một bình luận')).toHaveLength(2);
    expect(within(dialog).getAllByText('Lan đã gắn thẻ bạn trong “Hội nghị”.')).toHaveLength(2);
    expect(within(dialog).getByText('Email: đã gửi')).toBeDefined();
    await waitFor(() => expect(api.markAllNotificationsSeen).toHaveBeenCalledTimes(1));
    expect(vi.mocked(api.fetchNotifications).mock.calls.length).toBeGreaterThan(callsBefore);
    await waitFor(() => expect(badge()).toBeNull());
    expect(within(dialog).getByTestId('notification-2').getAttribute('data-unread')).toBe('false');
  });

  it('mở bảng khi không còn mục chưa xem thì không gọi đánh dấu tất cả', async () => {
    setup({ notifications: [item(1, { seen_at: '2026-10-09T02:00:00Z' })], unread_count: 0 });
    await waitFor(() => expect(api.fetchNotifications).toHaveBeenCalled());
    fireEvent.click(bellButton());
    await screen.findByRole('dialog', { name: 'Thông báo' });
    await waitFor(() => expect(vi.mocked(api.fetchNotifications).mock.calls.length).toBeGreaterThanOrEqual(2));
    expect(api.markAllNotificationsSeen).not.toHaveBeenCalled();
  });

  it('trạng thái rỗng', async () => {
    setup({ notifications: [], unread_count: 0 });
    await waitFor(() => expect(api.fetchNotifications).toHaveBeenCalled());
    fireEvent.click(bellButton());
    expect(await screen.findByText('Chưa có thông báo.')).toBeDefined();
  });

  it('bấm một mục: đánh dấu mục đó, đóng bảng, đi tới đường dẫn đã chuẩn hoá', async () => {
    api.markAllNotificationsSeen && vi.mocked(api.markAllNotificationsSeen).mockImplementation(() => new Promise(() => {}));
    setup({ notifications: [item(5, { url: '/#activity/12' })], unread_count: 1 });
    await waitFor(() => expect(badge()?.textContent).toBe('1'));
    fireEvent.click(bellButton());
    const row = await screen.findByTestId('notification-5');
    fireEvent.click(row);
    await waitFor(() => expect(screen.getByTestId('path').textContent).toBe('/activity/12'));
    expect(api.markNotificationSeen).toHaveBeenCalledWith(5);
    expect(screen.queryByRole('dialog', { name: 'Thông báo' })).toBeNull();
    await waitFor(() => expect(badge()).toBeNull());
  });

  it('bấm mục đã xem: đi tới đường dẫn nhưng không gọi PATCH', async () => {
    setup({ notifications: [item(6, { seen_at: '2026-10-09T02:00:00Z', url: '/#teams' })], unread_count: 0 });
    await waitFor(() => expect(api.fetchNotifications).toHaveBeenCalled());
    fireEvent.click(bellButton());
    fireEvent.click(await screen.findByTestId('notification-6'));
    await waitFor(() => expect(screen.getByTestId('path').textContent).toBe('/teams'));
    expect(api.markNotificationSeen).not.toHaveBeenCalled();
  });

  it('thông báo không có url thì về Tổng quan', async () => {
    setup({ notifications: [item(7, { seen_at: '2026-10-09T02:00:00Z', url: null })], unread_count: 0 });
    await waitFor(() => expect(api.fetchNotifications).toHaveBeenCalled());
    fireEvent.click(bellButton());
    fireEvent.click(await screen.findByTestId('notification-7'));
    await waitFor(() => expect(screen.getByTestId('path').textContent).toBe('/dashboard'));
  });

  it('bấm ra ngoài hoặc nhấn Escape thì đóng bảng', async () => {
    setup({ notifications: [], unread_count: 0 });
    await waitFor(() => expect(api.fetchNotifications).toHaveBeenCalled());
    fireEvent.click(bellButton());
    await screen.findByRole('dialog', { name: 'Thông báo' });
    fireEvent.mouseDown(screen.getByTestId('outside'));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Thông báo' })).toBeNull());

    fireEvent.click(bellButton());
    await screen.findByRole('dialog', { name: 'Thông báo' });
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Thông báo' })).toBeNull());
  });

  it('lỗi khi đánh dấu tất cả hiện toast tiếng Việt', async () => {
    vi.mocked(api.markAllNotificationsSeen).mockRejectedValueOnce({
      response: { status: 500, data: { error: 'Notification not found.' } },
    });
    setup({ notifications: [item(1)], unread_count: 1 });
    await waitFor(() => expect(badge()?.textContent).toBe('1'));
    fireEvent.click(bellButton());
    expect(await screen.findByText('Không tìm thấy thông báo.')).toBeDefined();
  });
});
```

Ghi chú cho người viết: dòng `api.markAllNotificationsSeen && vi.mocked(...)` ở ca "bấm một mục" chỉ để mục chưa xem **không** bị cache của "mở bảng" đánh dấu hết trước khi bấm; viết gọn thành `vi.mocked(api.markAllNotificationsSeen).mockImplementation(() => new Promise(() => {}));` (bỏ phần `api.markAllNotificationsSeen &&`).

- [ ] **Step 2: Chạy, xác nhận hỏng**

Run: `npx vitest run src/core/features/notifications/NotificationBell.test.tsx`
Expected: FAIL — không resolve `./NotificationBell`.

- [ ] **Step 3: Viết code**

```ts
// web/src/core/features/notifications/useNotifications.ts
import { useQuery } from '@tanstack/react-query';
import { fetchNotifications } from '../../api';

export const NOTIFICATIONS_KEY = ['core-notifications'] as const;
export const NOTIFICATIONS_POLL_MS = 60_000;

/** Hộp thông báo của người dùng, tự tải lại mỗi 60 giây. Chỉ dùng ở MỘT nơi (NotificationBell) để không poll đôi. */
export function useNotifications() {
  return useQuery({
    queryKey: NOTIFICATIONS_KEY,
    queryFn: fetchNotifications,
    refetchInterval: NOTIFICATIONS_POLL_MS,
  });
}
```

```ts
// web/src/core/features/notifications/useOpenNotification.ts
import { useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { markNotificationSeen, type NotificationItem, type NotificationsResponse } from '../../api';
import { markOneSeen } from './notificationCache';
import { NOTIFICATIONS_KEY } from './useNotifications';
import { notificationRoute } from './notificationUrl';

/**
 * Mở một thông báo: đánh dấu đã xem (lạc quan, lỗi bỏ qua như UI cũ) rồi đi tới `url` của nó.
 * Dựa vào bản trong cache, không dựa vào `item` truyền vào, để popup cũ không trừ huy hiệu hai lần.
 */
export function useOpenNotification(): (item: NotificationItem) => void {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const mutation = useMutation({ mutationFn: (id: number) => markNotificationSeen(id) });
  const { mutate } = mutation;

  return useCallback(
    (item: NotificationItem) => {
      const cached = queryClient.getQueryData<NotificationsResponse>(NOTIFICATIONS_KEY)?.notifications.find((n) => n.id === item.id);
      const unseen = cached ? !cached.seen_at : !item.seen_at;
      if (unseen) {
        queryClient.setQueryData<NotificationsResponse>(NOTIFICATIONS_KEY, (prev) => (prev ? markOneSeen(prev, item.id) : prev));
        mutate(item.id);
      }
      navigate(notificationRoute(item.url));
    },
    [queryClient, navigate, mutate]
  );
}
```

```tsx
// web/src/core/features/notifications/NotificationBell.tsx
import React, { useEffect, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { token } from '@atlaskit/tokens';
import NotificationIcon from '@atlaskit/icon/core/notification';
import { apiErrorMessage, markAllNotificationsSeen, type NotificationsResponse } from '../../api';
import { useToast } from '../../../shared/components/Toast';
import { formatVnDate } from '../../../shared/utils/date';
import { markAllSeen } from './notificationCache';
import { deliveryLabel, notificationBody, notificationTitle } from './notificationText';
import { NOTIFICATIONS_KEY, useNotifications } from './useNotifications';
import { useOpenNotification } from './useOpenNotification';

/** Nút chuông ở thanh trên: huy hiệu số chưa xem và bảng thông báo (giữ 7 ngày). */
export const NotificationBell: React.FC = () => {
  const queryClient = useQueryClient();
  const toast = useToast();
  const openNotification = useOpenNotification();
  const { data, refetch } = useNotifications();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const items = data?.notifications ?? [];
  const unread = data?.unread_count ?? 0;

  const markAll = useMutation({
    mutationFn: markAllNotificationsSeen,
    onSuccess: () => {
      queryClient.setQueryData<NotificationsResponse>(NOTIFICATIONS_KEY, (prev) => (prev ? markAllSeen(prev) : prev));
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Không đánh dấu được đã xem.')),
  });

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const toggle = async () => {
    const opening = !open;
    setOpen(opening);
    if (!opening) return;
    const result = await refetch();
    if ((result.data?.unread_count ?? 0) > 0) markAll.mutate();
  };

  return (
    <div ref={rootRef} style={{ position: 'relative' }}>
      <button
        type="button"
        aria-label={unread ? `Thông báo, ${unread} chưa xem` : 'Thông báo'}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={toggle}
        style={{ position: 'relative', background: 'none', border: 'none', cursor: 'pointer', padding: 6, borderRadius: 4, display: 'flex', alignItems: 'center', color: token('color.icon', '#42526E') }}
      >
        <NotificationIcon label="" />
        {unread > 0 && (
          <span
            data-testid="notification-badge"
            style={{ position: 'absolute', top: 0, right: 0, minWidth: 16, height: 16, padding: '0 4px', borderRadius: 8, fontSize: 10, lineHeight: '16px', fontWeight: 700, textAlign: 'center', color: '#fff', background: token('color.background.danger.bold', '#C9372C'), boxSizing: 'border-box' }}
          >
            {unread > 99 ? '99+' : String(unread)}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Thông báo"
          style={{ position: 'absolute', right: 0, top: '100%', zIndex: 600, width: 360, maxWidth: 'calc(100vw - 32px)', maxHeight: '70vh', overflowY: 'auto', background: token('elevation.surface.overlay', '#fff'), border: `1px solid ${token('color.border', '#DFE1E6')}`, borderRadius: 6, boxShadow: token('elevation.shadow.overlay', '0 8px 12px rgba(9,30,66,.15)') }}
        >
          <div style={{ padding: '12px 16px', borderBottom: `1px solid ${token('color.border', '#DFE1E6')}` }}>
            <strong>Thông báo</strong>
            <div style={{ fontSize: 12, color: token('color.text.subtle', '#5E6C84') }}>Lưu trong 7 ngày</div>
          </div>
          {items.length === 0 ? (
            <p style={{ padding: 16, margin: 0, color: token('color.text.subtle', '#5E6C84') }}>Chưa có thông báo.</p>
          ) : (
            items.map((n) => (
              <button
                key={n.id}
                type="button"
                data-testid={`notification-${n.id}`}
                data-unread={n.seen_at ? 'false' : 'true'}
                onClick={() => {
                  setOpen(false);
                  openNotification(n);
                }}
                style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 16px', border: 'none', borderBottom: `1px solid ${token('color.border', '#DFE1E6')}`, cursor: 'pointer', background: n.seen_at ? 'transparent' : token('color.background.information', '#E9F2FF'), color: token('color.text', '#172B4D') }}
              >
                <strong style={{ display: 'block' }}>{notificationTitle(n.title)}</strong>
                <span style={{ display: 'block', margin: '2px 0' }}>{notificationBody(n.body)}</span>
                <span style={{ display: 'flex', gap: 6, flexWrap: 'wrap', fontSize: 11 }}>
                  {n.email_status && <span>{deliveryLabel('email', n.email_status)}</span>}
                  {n.push_status && <span>{deliveryLabel('push', n.push_status)}</span>}
                </span>
                <small style={{ color: token('color.text.subtle', '#5E6C84') }}>{formatVnDate(n.created_at)}</small>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};
```

- [ ] **Step 4: Chạy test**

Run: `npx vitest run src/core/features/notifications && npx tsc --noEmit -p .`
Expected: PASS. Nếu `Email: đã gửi` bị coi là nhiều phần tử: ca mở bảng chỉ có một mục có `email_status`, nên là một.

- [ ] **Step 5: Commit**

```bash
git add web/src/core/features/notifications
git commit -m "feat(web): chuông thông báo — huy hiệu, bảng, đánh dấu đã xem, đi tới url

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Popup thông báo mới

**Files:**
- Create: `web/src/core/features/notifications/NotificationPopups.tsx`
- Test: `web/src/core/features/notifications/NotificationPopups.test.tsx`

**Interfaces:**
- Consumes: `NOTIFICATIONS_KEY` (đọc cache, **không** tự tải — `enabled: false`; việc tải do `NotificationBell`), `useOpenNotification`, `notificationTitle`, `notificationBody`.
- Produces: `NotificationPopups: React.FC` — mỗi lần cache đổi, lấy 3 mục **chưa xem mới nhất** (danh sách đã sắp mới nhất trước), bỏ mục đã báo (`Set` giữ id), hiện popup cũ nhất lên trên; mỗi popup tự tắt sau 7 giây; bấm popup gỡ nó và mở thông báo.

- [ ] **Step 1: Viết test hỏng**

```tsx
// web/src/core/features/notifications/NotificationPopups.test.tsx
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, within, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { NotificationPopups } from './NotificationPopups';
import { NOTIFICATIONS_KEY } from './useNotifications';
import * as api from '../../api';

vi.mock('../../api', async () => {
  const actual = await vi.importActual<typeof import('../../api')>('../../api');
  return { ...actual, fetchNotifications: vi.fn(), markNotificationSeen: vi.fn() };
});

const item = (id: number, over: Partial<api.NotificationItem> = {}): api.NotificationItem => ({
  id,
  kind: 'k',
  title: `Tiêu đề ${id}`,
  body: `Nội dung ${id}`,
  url: `/#activity/${id}`,
  seen_at: null,
  created_at: '2026-10-09T01:00:00.000Z',
  ...over,
});

const Probe = () => <div data-testid="path">{useLocation().pathname}</div>;

function setup(initial: api.NotificationsResponse) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  qc.setQueryData(NOTIFICATIONS_KEY, initial);
  render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/dashboard']}>
        <NotificationPopups />
        <Routes><Route path="*" element={<Probe />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
  return qc;
}

const popupTitles = () =>
  within(screen.getByTestId('notification-popups')).queryAllByRole('button').map((b) => b.querySelector('strong')?.textContent);

describe('NotificationPopups', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.markNotificationSeen).mockResolvedValue({ ok: true });
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });
  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  it('chỉ báo tối đa 3 mục chưa xem mới nhất, cũ nhất ở trên', async () => {
    setup({ unread_count: 4, notifications: [item(4), item(3), item(2), item(1)] });
    await waitFor(() => expect(popupTitles()).toEqual(['Tiêu đề 2', 'Tiêu đề 3', 'Tiêu đề 4']));
  });

  it('không báo mục đã xem', async () => {
    setup({ unread_count: 1, notifications: [item(2), item(1, { seen_at: '2026-10-09T02:00:00Z' })] });
    await waitFor(() => expect(popupTitles()).toEqual(['Tiêu đề 2']));
  });

  it('không báo lặp mục đã báo khi tải lại, nhưng báo mục mới', async () => {
    const qc = setup({ unread_count: 1, notifications: [item(1)] });
    await waitFor(() => expect(popupTitles()).toEqual(['Tiêu đề 1']));
    await act(async () => {
      qc.setQueryData(NOTIFICATIONS_KEY, { unread_count: 1, notifications: [item(1)] });
    });
    expect(popupTitles()).toEqual(['Tiêu đề 1']);
    await act(async () => {
      qc.setQueryData(NOTIFICATIONS_KEY, { unread_count: 2, notifications: [item(2), item(1)] });
    });
    await waitFor(() => expect(popupTitles()).toEqual(['Tiêu đề 1', 'Tiêu đề 2']));
  });

  it('popup tự tắt sau 7 giây và không hiện lại', async () => {
    setup({ unread_count: 1, notifications: [item(1)] });
    await waitFor(() => expect(popupTitles()).toEqual(['Tiêu đề 1']));
    await vi.advanceTimersByTimeAsync(7_000);
    await waitFor(() => expect(popupTitles()).toEqual([]));
  });

  it('bấm popup: gỡ popup, đánh dấu đã xem, đi tới đường dẫn đã chuẩn hoá', async () => {
    const qc = setup({ unread_count: 1, notifications: [item(9, { url: '/#activity/12' })] });
    await waitFor(() => expect(popupTitles()).toEqual(['Tiêu đề 9']));
    fireEvent.click(within(screen.getByTestId('notification-popups')).getByRole('button'));
    await waitFor(() => expect(screen.getByTestId('path').textContent).toBe('/activity/12'));
    expect(api.markNotificationSeen).toHaveBeenCalledWith(9);
    expect(popupTitles()).toEqual([]);
    expect((qc.getQueryData(NOTIFICATIONS_KEY) as api.NotificationsResponse).unread_count).toBe(0);
  });

  it('popup của mục đã được đánh dấu xem ở nơi khác thì bấm không trừ huy hiệu hai lần', async () => {
    const qc = setup({ unread_count: 2, notifications: [item(2), item(1)] });
    await waitFor(() => expect(popupTitles()).toHaveLength(2));
    await act(async () => {
      qc.setQueryData(NOTIFICATIONS_KEY, {
        unread_count: 0,
        notifications: [item(2, { seen_at: '2026-10-09T03:00:00Z' }), item(1, { seen_at: '2026-10-09T03:00:00Z' })],
      });
    });
    fireEvent.click(within(screen.getByTestId('notification-popups')).getAllByRole('button')[0]);
    await waitFor(() => expect(screen.getByTestId('path').textContent).toContain('/activity/'));
    expect(api.markNotificationSeen).not.toHaveBeenCalled();
    expect((qc.getQueryData(NOTIFICATIONS_KEY) as api.NotificationsResponse).unread_count).toBe(0);
  });
});
```

- [ ] **Step 2: Chạy, xác nhận hỏng**

Run: `npx vitest run src/core/features/notifications/NotificationPopups.test.tsx`
Expected: FAIL — không resolve `./NotificationPopups`.

- [ ] **Step 3: Viết code**

```tsx
// web/src/core/features/notifications/NotificationPopups.tsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { token } from '@atlaskit/tokens';
import NotificationIcon from '@atlaskit/icon/core/notification';
import { fetchNotifications, type NotificationItem } from '../../api';
import { notificationBody, notificationTitle } from './notificationText';
import { NOTIFICATIONS_KEY } from './useNotifications';
import { useOpenNotification } from './useOpenNotification';

const MAX_POPUPS = 3;
const POPUP_MS = 7000;

const PopupCard: React.FC<{ item: NotificationItem; onOpen: (item: NotificationItem) => void; onExpire: (id: number) => void }> = ({ item, onOpen, onExpire }) => {
  useEffect(() => {
    const timer = setTimeout(() => onExpire(item.id), POPUP_MS);
    return () => clearTimeout(timer);
  }, [item.id, onExpire]);
  return (
    <button
      type="button"
      onClick={() => onOpen(item)}
      style={{ display: 'flex', gap: 10, textAlign: 'left', width: 320, maxWidth: 'calc(100vw - 32px)', padding: '10px 14px', border: `1px solid ${token('color.border', '#DFE1E6')}`, borderRadius: 6, cursor: 'pointer', background: token('elevation.surface.overlay', '#fff'), color: token('color.text', '#172B4D'), boxShadow: token('elevation.shadow.overlay', '0 8px 12px rgba(9,30,66,.15)') }}
    >
      <NotificationIcon label="" />
      <span>
        <strong style={{ display: 'block' }}>{notificationTitle(item.title)}</strong>
        <span>{notificationBody(item.body)}</span>
      </span>
    </button>
  );
};

/**
 * Popup cho tối đa 3 thông báo mới chưa xem. Chỉ đọc cache `core-notifications` (`enabled: false`);
 * việc tải/poll do `NotificationBell` làm.
 */
export const NotificationPopups: React.FC = () => {
  const { data } = useQuery({ queryKey: NOTIFICATIONS_KEY, queryFn: fetchNotifications, enabled: false });
  const openNotification = useOpenNotification();
  const announced = useRef<Set<number>>(new Set());
  const [popups, setPopups] = useState<NotificationItem[]>([]);

  useEffect(() => {
    if (!data) return;
    // Như UI cũ: lấy 3 mục chưa xem mới nhất trước, rồi mới bỏ mục đã báo.
    const fresh = data.notifications
      .filter((n) => !n.seen_at)
      .slice(0, MAX_POPUPS)
      .reverse()
      .filter((n) => !announced.current.has(n.id));
    if (fresh.length === 0) return;
    fresh.forEach((n) => announced.current.add(n.id));
    setPopups((prev) => [...prev, ...fresh]);
  }, [data]);

  const expire = useCallback((id: number) => setPopups((prev) => prev.filter((p) => p.id !== id)), []);
  const open = useCallback(
    (item: NotificationItem) => {
      expire(item.id);
      openNotification(item);
    },
    [expire, openNotification]
  );

  return (
    <div
      data-testid="notification-popups"
      aria-live="polite"
      style={{ position: 'fixed', top: 64, right: 16, zIndex: 700, display: 'flex', flexDirection: 'column', gap: 8, pointerEvents: popups.length ? 'auto' : 'none' }}
    >
      {popups.map((p) => <PopupCard key={p.id} item={p} onOpen={open} onExpire={expire} />)}
    </div>
  );
};
```

- [ ] **Step 4: Chạy test**

Run: `npx vitest run src/core/features/notifications && npx tsc --noEmit -p .`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add web/src/core/features/notifications
git commit -m "feat(web): popup tối đa 3 thông báo mới, tự tắt sau 7 giây

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Gắn chuông vào khung trang

**Files:**
- Create: `web/src/core/features/notifications/NotificationCenter.tsx`
- Modify: `web/src/core/main.tsx`, `web/src/core/main.test.tsx`
- Test: `web/src/core/features/notifications/NotificationCenter.test.tsx`; thêm ca vào `web/src/core/main.test.tsx`

**Interfaces:**
- Produces: `NotificationCenter: React.FC` = `<NotificationBell /><NotificationPopups />`.
- Consumes: `SignedInShell` trong `main.tsx` (đã có `headerExtras={<UnitSwitcher />}`).

- [ ] **Step 1: Viết test hỏng**

```tsx
// web/src/core/features/notifications/NotificationCenter.test.tsx
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { NotificationCenter } from './NotificationCenter';
import { ToastProvider } from '../../../shared/components/Toast';
import * as api from '../../api';

vi.mock('../../api', async () => {
  const actual = await vi.importActual<typeof import('../../api')>('../../api');
  return { ...actual, fetchNotifications: vi.fn(), markNotificationSeen: vi.fn(), markAllNotificationsSeen: vi.fn() };
});

describe('NotificationCenter', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(cleanup);

  it('một lần tải: chuông có huy hiệu và popup hiện mục mới; chỉ gọi API một lần lúc khởi động', async () => {
    vi.mocked(api.fetchNotifications).mockResolvedValue({
      unread_count: 1,
      notifications: [
        { id: 1, kind: 'task_assigned', title: 'Công việc mới', body: 'Bạn được giao: Soạn kế hoạch', url: '/#activity/3', seen_at: null, created_at: '2026-10-09T01:00:00.000Z' },
      ],
    });
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <ToastProvider>
          <MemoryRouter>
            <NotificationCenter />
          </MemoryRouter>
        </ToastProvider>
      </QueryClientProvider>
    );
    await waitFor(() => expect(screen.getByTestId('notification-badge').textContent).toBe('1'));
    const popups = screen.getByTestId('notification-popups');
    await waitFor(() => expect(within(popups).getByText('Công việc mới')).toBeDefined());
    expect(api.fetchNotifications).toHaveBeenCalledTimes(1);
  });
});
```

Thêm vào `web/src/core/main.test.tsx`:
1. Trong `vi.mock('./api', …)` thêm cạnh `fetchMyTasksToday`: `fetchNotifications: vi.fn().mockResolvedValue({ notifications: [], unread_count: 0 }),`
2. Thêm một ca ở cuối `describe` (dùng `authedSession` đã có trong file; nếu biến này nằm trong phạm vi một ca khác, khai báo lại bản sao tại chỗ):

```tsx
  it('thanh trên có chuông thông báo khi đã đăng nhập', async () => {
    vi.mocked(api.fetchSession).mockResolvedValue({
      user: { id: 1, name: 'Phạm Việt Bách', email: 'bach.pv@hust.edu.vn', role: 'admin' },
      units: { current: null, memberships: [] },
    });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    );
    expect(await screen.findByRole('button', { name: /^Thông báo/ })).toBeDefined();
    await waitFor(() => expect(api.fetchNotifications).toHaveBeenCalled());
  });
```

- [ ] **Step 2: Chạy, xác nhận hỏng**

Run: `npx vitest run src/core/features/notifications/NotificationCenter.test.tsx src/core/main.test.tsx`
Expected: FAIL — không resolve `./NotificationCenter`; ca `main.test` không thấy chuông.

- [ ] **Step 3: Viết code**

```tsx
// web/src/core/features/notifications/NotificationCenter.tsx
import React from 'react';
import { NotificationBell } from './NotificationBell';
import { NotificationPopups } from './NotificationPopups';

/** Chuông + popup thông báo; đặt vào `headerExtras` của PageLayout. */
export const NotificationCenter: React.FC = () => (
  <>
    <NotificationBell />
    <NotificationPopups />
  </>
);
```

Trong `web/src/core/main.tsx`: thêm `import { NotificationCenter } from './features/notifications/NotificationCenter';` và đổi `headerExtras={<UnitSwitcher />}` thành
```tsx
headerExtras={<><NotificationCenter /><UnitSwitcher /></>}
```
(nếu đợt khác đã thêm phần tử vào `headerExtras`, giữ chúng và chèn `<NotificationCenter />` đứng trước `UnitSwitcher`).

- [ ] **Step 4: Chạy toàn bộ**

Run: `npm test && npx tsc --noEmit -p . && npm run build`
Expected: xanh. Nếu test khác trong `main.test.tsx` đếm số `button` hoặc `aria-label` của thanh trên và vỡ vì có thêm nút chuông, chỉnh test đó cho đúng (chuông là nút mới có chủ đích) và ghi lý do trong commit.

- [ ] **Step 5: Commit**

```bash
git add web/src/core/features/notifications/NotificationCenter.tsx web/src/core/features/notifications/NotificationCenter.test.tsx web/src/core/main.tsx web/src/core/main.test.tsx
git commit -m "feat(web): đặt chuông thông báo vào thanh trên

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Tài liệu, kiểm tra và PR

**Files:**
- Modify: `docs/dev/frontend.md` (thêm mục Văn bản và Thông báo trong phần `web/`, bump MINOR, `updated: 2026-10-09`, thêm một dòng `## Lịch sử phiên bản`)
- Modify: `docs/ai/bay-da-gap.md` (thêm bẫy, bump MINOR, lịch sử)
- Kiểm: mọi tài liệu có `related_code` trùng `web/**` hoặc `web/src/core/**`

- [ ] **Step 1: Tìm tài liệu liên quan**

```bash
grep -ln "web/" docs/dev/*.md docs/ai/*.md docs/specs/*.md | xargs grep -n "^related_code"
```
Chỉ sửa tài liệu **mô tả hành vi vừa đổi**. Dự kiến: `docs/dev/frontend.md`. Nếu `docs/dev/test.md` liệt kê danh sách test theo màn, thêm các file test mới của đợt này; nếu không thì không sửa. Không sửa SPEC-WEB-003 và ADR trong PR này (xem "Quyết định").

- [ ] **Step 2: Viết nội dung**

Trong `docs/dev/frontend.md`, mục `web/` (do đợt 0 tạo), thêm:
- **Văn bản** (`web/src/core/features/documents/`): nút "Thêm văn bản" cho mọi người; "Sửa" khi `can_edit` của server; hộp `DocumentFormModal` dùng chung thêm/sửa, chỉ link, `issueTeams` quyết định Tổ ban hành; lưu xong làm mới `['core-documents']`.
- **Thông báo** (`web/src/core/features/notifications/`): `NotificationCenter` (chuông + popup) nằm ở `headerExtras`; query `['core-notifications']` poll 60 giây ở **một** nơi (`useNotifications`, chỉ `NotificationBell` gọi); `notificationRoute()` đổi `url` dạng `/#activity/12` thành đường dẫn router; tiêu đề/nội dung tiếng Anh do Core lưu được Việt hoá trong `notificationText.ts` — Core thêm loại thông báo mới thì thêm câu dịch vào đó.
- Dòng lịch sử mới: `| <version mới> | 2026-10-09 | web/ đợt 4: thêm/sửa văn bản, chuông thông báo | DYC |`.

Trong `docs/ai/bay-da-gap.md` thêm bẫy:
- **`url` của thông báo là hash cũ có dấu `/` đầu (`/#activity/12`).** Đưa thẳng vào `navigate()` sẽ ra đường dẫn sai; luôn qua `notificationRoute()`. Tiêu đề/nội dung một số thông báo Core lưu tiếng Anh (`core/src/routes/activities.js`) nên phải dịch phía `web/`.
- **Hai nơi cùng poll một query thì bị gọi đôi.** `NotificationPopups` chỉ đọc cache (`enabled: false`); chỉ `useNotifications` được đặt `refetchInterval`.

- [ ] **Step 3: Chạy kiểm tra**

```bash
cd web && npm test && npm run build && cd ..
npm run test:tools
npm run docs:index
git add -A docs && git commit -m "docs: web/ đợt 4 — văn bản và chuông thông báo

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
npm run docs:check -- --base origin/staging
```
Expected: mọi lệnh xanh. `docs:check` chạy **sau** commit. (Test Core không chạy vì đợt này không chạm `core/`; CI vẫn chạy.)

- [ ] **Step 4: Push và mở PR vào `staging`**

```bash
git push -u origin HEAD
gh pr create --base staging --title "web/: đợt 4 — thêm/sửa văn bản và chuông thông báo" --body "…"
```
Mô tả PR: tóm tắt (thêm/sửa văn bản, chuông + popup + đánh dấu đã xem, chuẩn hoá `url` thông báo, Việt hoá tiêu đề/nội dung tiếng Anh của Core); mục "Kiểm tra" liệt kê lệnh đã chạy; mục "Docs" nêu các tài liệu đã cập nhật; mục "Smoke trên staging": (1) thành viên thường thêm văn bản cho Tổ của mình, sửa văn bản của mình, không thấy "Sửa" ở văn bản của Tổ khác; (2) admin thêm văn bản cho Tổ bất kỳ; (3) gắn thẻ một người trong bình luận hoạt động → người đó thấy huy hiệu và popup trong ≤60 giây, mở bảng thì huy hiệu về 0, bấm mục đi tới trang hoạt động (cần đợt 1 đã merge, nếu chưa thì tới "Không tìm thấy trang"). Kết thúc bằng `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.

---

## Lịch sử phiên bản

| Version | Ngày | Thay đổi | Người |
|---|---|---|---|
| 1.0 | 2026-10-09 | Bản đầu: kế hoạch đợt 4 của SPEC-WEB-003 (Văn bản và chuông thông báo) | DYC |
| 1.1 | 2026-10-09 | Cập nhật trạng thái hoàn thành đợt 4 và khai báo related_code | DYC |
| 1.2 | 2026-10-10 | Ghi nhận tích hợp đợt 4 vào nhánh đã có đợt 3 | DYC |
