---
doc_id: PLAN-WEBP1-001
title: Kế hoạch triển khai — web/ đợt 1 (Hoạt động: tạo đề xuất, trang chi tiết, vòng duyệt, sửa, xoá, tham gia, cập nhật)
version: 1.1
status: active
audience: [dev, ai]
owner: DYC
updated: 2026-10-09
related_code: []
---

# web/ đợt 1 — Hoạt động Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Đưa phần "Hoạt động" của `web/` ngang UI cũ và hơn nó theo SPEC-WEB-003 mục 4.1: form tạo đề xuất đủ trường, trang chi tiết `#activity/:id`, vòng duyệt (duyệt / yêu cầu sửa / từ chối / nộp lại), sửa (cả người quản lý không phải admin), xoá, đăng ký tham gia, thêm người tham gia, đăng cập nhật có gắn thẻ `@`; thẻ hoạt động ở danh sách và lịch bấm được; gỡ `ActivityDetailModal`.

**Architecture:** Trang `ActivityDetailView` (route `/activity/:id`) lấy `GET /api/activities/:id` qua React Query (khoá `['core-activity', id]`) rồi chia thành các thành phần nhỏ trong `web/src/core/features/activities/`: thông tin (`ActivityInfoSections`), kế hoạch theo giai đoạn (`ActivityPlanSection`), dòng thời gian (`ActivityUpdatesSection`), thanh hành động (`ActivityActions`) và hai hộp thoại (`EditActivityModal`, `AddParticipantsModal`). Điều kiện hiện/ẩn nút nằm trong một hàm thuần `deriveActivityActions` (bắt chước server). Mọi thao tác ghi đi qua hook `useActivityMutation` (toast, `invalidateQueries`, xử lý hoạt động bị xoá). Link giữa các màn dùng `<a href="#/activity/:id">` và `window.location.hash` (helper `core/navigation.ts`) nên danh sách, lịch, Tổng quan không cần bọc `Router` trong test.

**Tech Stack:** React 18, TypeScript (`noUnusedLocals`), Vite, Vitest + jsdom + @testing-library/react 14, @tanstack/react-query 5, react-router-dom 6.30, Atlaskit (`modal-dialog`, `button/new`, `textfield`, `textarea`, `lozenge`, `form`, `select`, `checkbox`, `flag`).

**Spec:** `docs/specs/2026-10-09-web-hoan-thien-thay-the-design.md` (SPEC-WEB-003, mục 2, 3, 4.1, 6, 7). Đợt 0 đã xong (`PLAN-WEBP0-001`): dùng `useCapabilities`, `useToast`, `ConfirmDialog`, `ReasonDialog`, `PeoplePicker`, `LinkField`, `QuotaBar`, `apiErrorMessage`, `SESSION_KEY`/`BOOTSTRAP_KEY`, `AppRoutes`.

## Global Constraints

- Chỉ tiếng Việt; chỉ dùng link cho tài liệu/minh chứng (không có ô tải tệp). Tệp đã có trên server thì mở bằng `GET /api/task-attachments/:id/content`.
- Không chạm `core/` (đợt này không cần backend mới). Endpoint đang dùng: `GET/POST /api/activities`, `GET/PATCH/DELETE /api/activities/:id`, `POST …/approve|request-changes|reject|submit|volunteer|participants|updates`, `GET /api/people`, `GET /api/teams`.
- Điều kiện hiện/ẩn nút bắt chước `core/src/routes/activities.js`, `core/src/policies/access.js`, `core/src/middleware/auth.js` (server vẫn là nơi chặn cuối):

  | Thao tác | Điều kiện hiện nút | Server chặn bằng |
  |---|---|---|
  | Duyệt / Yêu cầu sửa / Từ chối | `isWriteExec` và `status === 'proposed'` | `admin`; 409 nếu không còn `proposed` |
  | Nộp lại | `canManageWrite` và `status === 'changes_requested'` | `managerOrEventLead` + `canManageActivity` |
  | Sửa | `canManageWrite` (admin ghi luôn quản lý) | `managerOrEventLead` + `canManageActivity` |
  | Sửa Tổ, trạng thái, Trưởng BTC | `isWriteExec` | 403 "Only administrators can change involved teams."; `status`/`event_lead_id` bị bỏ qua nếu không phải admin |
  | Xoá | `isWriteExec`, gõ lại đúng tiêu đề | `admin` |
  | Đăng ký tham gia | `canWriteActivities` và (chưa có dòng `participants` của mình hoặc `state === 'declined'`) | `auth` + hoạt động xem được |
  | Thêm người tham gia | `canManageWrite` | `managerOrEventLead` + `canManageActivity` |
  | Đăng cập nhật | `canWriteActivities` | `auth` + hoạt động xem được |

- Quyền ghi hiện hành (đính chính cho các đoạn mã ví dụ lịch sử bên dưới): `legacyGate` cho DYC chỉ đọc; `session.user.role` và `detail.canManage` của GET có thể phản ánh `admin` giả cho DYC. Dùng membership TCKT để xác định `canWriteActivities`, vai trò TCKT cùng vai trò đơn vị hiện tại để xác định `isWriteExec`; với DYC+TCKT, xác định `canManageWrite` bằng quyền ghi admin, người tạo, Trưởng BTC hoặc Tổ đang lãnh đạo. Form cập nhật chỉ hiện khi được ghi. Nếu Tổ đã lưu trữ còn gắn với hoạt động, form sửa hiện Tổ đó để admin gỡ hoặc thay (server vẫn chặn gỡ Tổ có việc). Trách nhiệm mặc định tiếng Anh do server tạo được dịch khi hiển thị.
- Hai trường hợp server **xoá hẳn** hoạt động: từ chối đề án và chuyển trạng thái sang `cancelled` (response `{ok:true, deleted:true}`). Sau cả hai: bỏ cache chi tiết, về `#/activities`.
- `PATCH /api/activities/:id` có ba handler nối nhau: gửi `is_public` thì **phải** gửi kèm `public_image_url` (thiếu nó server xoá ảnh), gửi `proposal_document_url` rỗng sẽ xoá link. Form sửa luôn gửi đủ ba trường này.
- Người quản lý không phải admin gửi `team_id`/`team_ids` sẽ bị 403 → payload của họ không bao giờ có hai trường đó.
- Ngày hiển thị/so sánh theo giờ VN: dùng `formatVnDate`, `toVnDateKey` (`web/src/shared/utils/date.ts`), không cắt chuỗi ISO (bất biến #7).
- Chỉ render link khi `isHttpUrl(url)` (chặn `javascript:`).
- Test mỗi thao tác ghi: đúng endpoint + body, ẩn/hiện theo quyền (≥ một ca cho phép, một ca bị chặn), lỗi server hiện tiếng Việt, cache được làm mới.
- Kiểm tra trước khi báo xong: `cd web && npm test && npm run build` xanh; sau khi commit: `npm run docs:index && npm run docs:check -- --base origin/staging` xanh.
- Commit kết thúc bằng `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

- Người quản lý **không phải admin** sửa hoạt động: payload không chứa `status`, `event_lead_id`, `team_id`, `team_ids` (Task 9).
- Gửi `is_public` luôn kèm `public_image_url`, `proposal_document_url` luôn có mặt (Task 9, tránh xoá nhầm ảnh/link).
- Đổi trạng thái sang `cancelled`, từ chối đề án và xoá đều xác nhận trước, rồi bỏ cache chi tiết và về danh sách (Task 9, 11).
- Nút Duyệt/Từ chối/Yêu cầu sửa không hiện với Tổ trưởng; nút Xoá chỉ admin; nút Nộp lại chỉ khi `changes_requested` và `canManage` (Task 11).
- Gắn thẻ `@` chỉ ở loại "Bình luận" và chỉ chọn từ `taggablePeople` (Task 8).
- Việc đã huỷ không hiện trong kế hoạch; hoạt động `assigned` chỉ có giai đoạn "Chung" (Task 7).
- Link tài liệu/đề án không phải `http(s)` không bao giờ thành thẻ `<a>` (Task 6, 7).
- Hoạt động của đơn vị khác (dòng tóm tắt trên lịch/danh sách) bấm vào sẽ nhận 404 từ server → trang hiện "Không tìm thấy hoạt động hoặc bạn không có quyền xem." (Task 6). Đây là hành vi đúng, không phải lỗi.

## Quyết định (spec để ngỏ hoặc cần làm rõ)

- **Phần việc trên trang chi tiết là chỉ-đọc.** Nút "Giao việc", "Tự ghi nhận việc", link Kanban, mở chi tiết công việc `#task/:id` thuộc đợt 2 (mục 4.2). `ActivityActions` nhận `children` để đợt 2 gắn thêm nút vào cùng thanh; `ActivityPlanSection` nhận cùng danh sách `tasks` đợt 2 sẽ làm cho bấm được.
- **Điều hướng không dùng `useNavigate` ở danh sách/lịch/Tổng quan**: dùng `<a href="#/activity/:id">` và `goToActivity(id)` (đặt `window.location.hash`). Lý do: các màn này đang được test không bọc `Router`; `HashRouter` nhận thay đổi hash bình thường.
- **Tạo đề xuất không bật toast** (chuyển sang trang chi tiết là phản hồi), để `CreateActivityModal` không cần `ToastProvider` và test cũ không phải bọc lại.
- **Danh sách người cho "Trưởng BTC"** lấy từ `GET /api/people` (`fetchMembers`, khoá `['core-members']` dùng chung với màn Thành viên), bỏ người `is_active` = 0. Server không kiểm `event_lead_id` ngoài việc ép số.
- **Bộ lọc Tổ ở hộp "Thêm người tham gia"** lấy từ `activityTeams` của hoạt động (không dùng `people[].team_names`, vì `team_ids` sắp theo id còn `team_names` sắp theo tên nên không ghép cặp được).
- **Câu lỗi động** `"{tên} cannot view this activity."` (khi gắn thẻ người không xem được hoạt động) không nằm trong bảng dịch (bảng chỉ khớp nguyên câu); hiện nguyên văn.
- **Sửa nhiều trường cùng lúc với `cancelled`**: server chỉ xoá, bỏ qua các trường khác — form vẫn xác nhận trước rồi gửi payload đầy đủ.
- **Trạng thái `changes_requested`** có trong ô chọn trạng thái của form sửa (admin) theo mục 2 của spec.

---

## File Structure

| File | Trách nhiệm |
|---|---|
| `web/src/core/api/errorMessages.ts` (sửa) | Thêm câu lỗi tiếng Anh của route hoạt động |
| `web/src/core/api/activities.ts` (sửa) | Kiểu chi tiết hoạt động + `fetchActivityDetail`, `updateActivity`, `deleteActivity`, `approveActivity`, `requestActivityChanges`, `rejectActivity`, `submitActivity`, `volunteerForActivity`, `addActivityParticipants`, `postActivityUpdate` |
| `web/src/core/navigation.ts` (mới) | `activityPath`, `activityHref`, `goToActivity` |
| `web/src/core/features/activities/activityKeys.ts` (mới) | Khoá cache + `invalidateActivity`, `forgetActivity` |
| `web/src/core/features/activities/activityPermissions.ts` (mới) | `deriveActivityActions` (hàm thuần) |
| `web/src/core/features/activities/planStages.ts` (mới) | `groupTasksByStage` |
| `web/src/core/features/activities/editPayload.ts` (mới) | `initialEditForm`, `validateEditForm`, `buildUpdatePayload` |
| `web/src/core/features/activities/useActivityMutation.ts` (mới) | Hook ghi dùng chung (toast, làm mới cache, xử lý xoá) |
| `web/src/core/features/activities/formBits.tsx` (mới) | `FieldRow`, `NativeSelect`, `DateInput`, `ErrorText` |
| `web/src/core/features/activities/ActivityInfoSections.tsx` (mới) | `Card`, hero, thông tin chung, Tổ, người tham gia, chi tiết, lịch sử đề án |
| `web/src/core/features/activities/ActivityPlanSection.tsx` (mới) | Kế hoạch theo giai đoạn + tài liệu theo việc |
| `web/src/core/features/activities/ActivityUpdatesSection.tsx` (mới) | Dòng thời gian + form đăng cập nhật |
| `web/src/core/features/activities/EditActivityModal.tsx` (mới) | Sửa hoạt động (admin: mọi trường; quản lý: tập con) |
| `web/src/core/features/activities/AddParticipantsModal.tsx` (mới) | Thêm người tham gia |
| `web/src/core/features/activities/ActivityActions.tsx` (mới) | Thanh hành động + hộp lý do/xác nhận |
| `web/src/core/features/activities/ActivityDetailView.tsx` (mới) | Trang `#activity/:id` |
| `web/src/core/features/activities/testUtils.tsx` (mới) | `renderInApp`, `makeDetail` cho test |
| `web/src/core/features/dashboard/CreateActivityModal.tsx` (sửa) | Thêm Trưởng BTC, kiểm link, `onCreated` |
| `web/src/core/features/activities/ActivitiesView.tsx` (sửa) | Thẻ bấm được, link đề án, chuyển tới chi tiết sau khi tạo |
| `web/src/core/features/dashboard/Dashboard.tsx` (sửa) | Chuyển tới chi tiết sau khi tạo |
| `web/src/core/features/calendar/CalendarView.tsx` (sửa) | Bấm hoạt động → trang chi tiết |
| `web/src/core/features/calendar/ActivityDetailModal.tsx` (xoá) | Thay bằng trang chi tiết |
| `web/src/core/AppRoutes.tsx` (sửa) | Route `/activity/:id` |

Mọi lệnh chạy trong `web/`. Một file: `npx vitest run <đường dẫn>`.

---

### Task 1: Câu lỗi tiếng Việt cho API hoạt động

**Files:**
- Modify: `web/src/core/api/errorMessages.ts`
- Test: `web/src/core/api/errorMessages.activities.test.ts`

**Interfaces:**
- Consumes: `translateServerError(message)` (`web/src/core/api/errors.ts`).
- Produces: 18 câu mới trong `VI_ERROR_MESSAGES`.

- [ ] **Step 1: Viết test hỏng**

```ts
// web/src/core/api/errorMessages.activities.test.ts
import { describe, it, expect } from 'vitest';
import { translateServerError } from './errors';

const CASES: Array<[string, string]> = [
  ['You cannot manage this activity.', 'Bạn không có quyền quản lý hoạt động này.'],
  ['Activity not found.', 'Không tìm thấy hoạt động.'],
  ['Only administrators can change involved teams.', 'Chỉ quản trị viên được đổi các Tổ tham gia.'],
  ['Title, description and deadline cannot be empty.', 'Tiêu đề, mô tả và hạn chót không được để trống.'],
  ['Select involved teams and a coordinating team.', 'Hãy chọn các Tổ tham gia và một Tổ chủ trì.'],
  ['One or more selected teams are unavailable.', 'Có Tổ được chọn không còn khả dụng.'],
  [
    'A team with existing tasks cannot be removed. Reassign those tasks first.',
    'Không thể gỡ Tổ đang có công việc. Hãy chuyển các công việc đó trước.',
  ],
  ['A valid activity ID is required.', 'Mã hoạt động không hợp lệ.'],
  ['You cannot manage participants for this activity.', 'Bạn không có quyền quản lý người tham gia của hoạt động này.'],
  ['Select at least one member.', 'Hãy chọn ít nhất một thành viên.'],
  [
    'You may only add active members from teams you lead or teams on this activity.',
    'Bạn chỉ được thêm thành viên đang hoạt động thuộc Tổ bạn phụ trách hoặc Tổ của hoạt động này.',
  ],
  ['Invalid update type.', 'Loại cập nhật không hợp lệ.'],
  ['You cannot post this type of update.', 'Bạn không được đăng loại cập nhật này.'],
  ['The attachment must be a valid http:// or https:// link.', 'Liên kết đính kèm phải bắt đầu bằng http:// hoặc https://.'],
  ['The task does not belong to this activity.', 'Công việc không thuộc hoạt động này.'],
  ['Write an update first.', 'Hãy nhập nội dung cập nhật.'],
  ['You cannot tag yourself.', 'Bạn không thể gắn thẻ chính mình.'],
  ['One or more tagged people are unavailable.', 'Có người được gắn thẻ không còn khả dụng.'],
];

describe('bảng dịch lỗi của route hoạt động', () => {
  it.each(CASES)('%s', (english, vietnamese) => {
    expect(translateServerError(english)).toBe(vietnamese);
  });

  it('câu server đã trả tiếng Việt giữ nguyên', () => {
    expect(translateServerError('Đề án không ở trạng thái chờ duyệt.')).toBe('Đề án không ở trạng thái chờ duyệt.');
  });
});
```

- [ ] **Step 2: Chạy, xác nhận hỏng**

Run: `npx vitest run src/core/api/errorMessages.activities.test.ts`
Expected: FAIL (18 ca trả lại nguyên câu tiếng Anh).

- [ ] **Step 3: Thêm câu dịch**

Trong `web/src/core/api/errorMessages.ts`, chèn **ngay sau** nhóm `// Tạo đề xuất hoạt động` (trước `// Onboarding HUST`) để hạn chế xung đột với đợt khác cùng thêm vào bảng:

```ts
  // Hoạt động: chi tiết, sửa, người tham gia, cập nhật (đợt 1)
  'You cannot manage this activity.': 'Bạn không có quyền quản lý hoạt động này.',
  'Activity not found.': 'Không tìm thấy hoạt động.',
  'Only administrators can change involved teams.': 'Chỉ quản trị viên được đổi các Tổ tham gia.',
  'Title, description and deadline cannot be empty.': 'Tiêu đề, mô tả và hạn chót không được để trống.',
  'Select involved teams and a coordinating team.': 'Hãy chọn các Tổ tham gia và một Tổ chủ trì.',
  'One or more selected teams are unavailable.': 'Có Tổ được chọn không còn khả dụng.',
  'A team with existing tasks cannot be removed. Reassign those tasks first.':
    'Không thể gỡ Tổ đang có công việc. Hãy chuyển các công việc đó trước.',
  'A valid activity ID is required.': 'Mã hoạt động không hợp lệ.',
  'You cannot manage participants for this activity.': 'Bạn không có quyền quản lý người tham gia của hoạt động này.',
  'Select at least one member.': 'Hãy chọn ít nhất một thành viên.',
  'You may only add active members from teams you lead or teams on this activity.':
    'Bạn chỉ được thêm thành viên đang hoạt động thuộc Tổ bạn phụ trách hoặc Tổ của hoạt động này.',
  'Invalid update type.': 'Loại cập nhật không hợp lệ.',
  'You cannot post this type of update.': 'Bạn không được đăng loại cập nhật này.',
  'The attachment must be a valid http:// or https:// link.': 'Liên kết đính kèm phải bắt đầu bằng http:// hoặc https://.',
  'The task does not belong to this activity.': 'Công việc không thuộc hoạt động này.',
  'Write an update first.': 'Hãy nhập nội dung cập nhật.',
  'You cannot tag yourself.': 'Bạn không thể gắn thẻ chính mình.',
  'One or more tagged people are unavailable.': 'Có người được gắn thẻ không còn khả dụng.',
```

Nếu `grep -c "Activity not found" web/src/core/api/errorMessages.ts` ra > 1 (đợt khác đã thêm trước), xoá dòng trùng ở nhóm của mình.

- [ ] **Step 4: Chạy test, xác nhận xanh**

Run: `npx vitest run src/core/api/errorMessages.activities.test.ts src/core/api/errors.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add web/src/core/api/errorMessages.ts web/src/core/api/errorMessages.activities.test.ts
git commit -m "feat(web): dịch lỗi tiếng Anh của route hoạt động

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Kiểu chi tiết hoạt động và hàm API

**Files:**
- Modify: `web/src/core/api/activities.ts` (chỉ thêm, `index.ts` đã `export *` nên không sửa)
- Test: `web/src/core/api/activities.detail.test.ts`

**Interfaces:**
- Consumes: `apiClient` (axios, `baseURL: '/api'`), `ActivityItem` (`./types`).
- Produces (xuất từ `activities.ts`, tự có trong `index.ts`):
  - kiểu `ActivityTeamRow`, `ActivityTaskRow`, `ActivityParticipant`, `ActivityUpdateTag`, `ActivityUpdate`, `ActivityPerson`, `TaggablePerson`, `ActivityAttachment`, `ProposalHistoryItem`, `ActivityDetail`, `UpdateActivityPayload`, `ActivityUpdateKind`, `PostUpdatePayload`
  - `fetchActivityDetail(id): Promise<ActivityDetail>` — `GET /activities/:id`
  - `updateActivity(id, payload): Promise<{ ok: boolean; deleted?: boolean }>` — `PATCH /activities/:id`
  - `deleteActivity(id): Promise<{ ok: boolean; id: number; title: string }>` — `DELETE /activities/:id`
  - `approveActivity(id)`, `submitActivity(id)`, `volunteerForActivity(id)`: `Promise<{ ok: boolean }>`
  - `requestActivityChanges(id, feedback)`: `Promise<{ ok: boolean }>`; `rejectActivity(id, feedback)`: `Promise<{ ok: boolean; deleted?: boolean }>`
  - `addActivityParticipants(id, { user_ids, responsibility })`: `Promise<void>` (server trả 201)
  - `postActivityUpdate(id, payload)`: `Promise<{ ok: boolean; id: number }>`

- [ ] **Step 1: Viết test hỏng**

```ts
// web/src/core/api/activities.detail.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiClient } from '../../shared/utils/api';
import {
  addActivityParticipants,
  approveActivity,
  deleteActivity,
  fetchActivityDetail,
  postActivityUpdate,
  rejectActivity,
  requestActivityChanges,
  submitActivity,
  updateActivity,
  volunteerForActivity,
} from './activities';

vi.mock('../../shared/utils/api', () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

describe('API chi tiết hoạt động', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetchActivityDetail gọi GET /activities/:id', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: { activity: { id: 5 }, canManage: true } });
    await expect(fetchActivityDetail(5)).resolves.toEqual({ activity: { id: 5 }, canManage: true });
    expect(apiClient.get).toHaveBeenCalledWith('/activities/5');
  });

  it('updateActivity gọi PATCH /activities/:id với đúng body', async () => {
    vi.mocked(apiClient.patch).mockResolvedValueOnce({ data: { ok: true } });
    await expect(updateActivity(5, { title: 'Mới', is_public: true, public_image_url: '' })).resolves.toEqual({ ok: true });
    expect(apiClient.patch).toHaveBeenCalledWith('/activities/5', { title: 'Mới', is_public: true, public_image_url: '' });
  });

  it('deleteActivity gọi DELETE /activities/:id', async () => {
    vi.mocked(apiClient.delete).mockResolvedValueOnce({ data: { ok: true, id: 5, title: 'X' } });
    await expect(deleteActivity(5)).resolves.toEqual({ ok: true, id: 5, title: 'X' });
    expect(apiClient.delete).toHaveBeenCalledWith('/activities/5');
  });

  it('duyệt, nộp lại, đăng ký tham gia gọi POST không body', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { ok: true } });
    await approveActivity(5);
    await submitActivity(5);
    await volunteerForActivity(5);
    expect(apiClient.post).toHaveBeenNthCalledWith(1, '/activities/5/approve');
    expect(apiClient.post).toHaveBeenNthCalledWith(2, '/activities/5/submit');
    expect(apiClient.post).toHaveBeenNthCalledWith(3, '/activities/5/volunteer');
  });

  it('yêu cầu sửa và từ chối gửi feedback', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { ok: true } });
    await requestActivityChanges(5, 'Thiếu dự toán');
    await rejectActivity(5, 'Trùng lịch');
    expect(apiClient.post).toHaveBeenNthCalledWith(1, '/activities/5/request-changes', { feedback: 'Thiếu dự toán' });
    expect(apiClient.post).toHaveBeenNthCalledWith(2, '/activities/5/reject', { feedback: 'Trùng lịch' });
  });

  it('addActivityParticipants gửi user_ids và responsibility', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: undefined });
    await addActivityParticipants(5, { user_ids: [11, 12], responsibility: 'Hậu cần' });
    expect(apiClient.post).toHaveBeenCalledWith('/activities/5/participants', { user_ids: [11, 12], responsibility: 'Hậu cần' });
  });

  it('postActivityUpdate gửi kind, body, attachment_url, tagged_user_ids', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { ok: true, id: 9 } });
    const payload = { kind: 'comment' as const, body: 'Ổn rồi @A', attachment_url: 'https://x.vn/a', tagged_user_ids: [3] };
    await expect(postActivityUpdate(5, payload)).resolves.toEqual({ ok: true, id: 9 });
    expect(apiClient.post).toHaveBeenCalledWith('/activities/5/updates', payload);
  });
});
```

- [ ] **Step 2: Chạy, xác nhận hỏng**

Run: `npx vitest run src/core/api/activities.detail.test.ts`
Expected: FAIL (các hàm chưa tồn tại).

- [ ] **Step 3: Thêm vào `web/src/core/api/activities.ts`**

Cuối file thêm:

```ts
export interface ActivityTeamRow {
  activity_id?: number;
  team_id: number;
  role: 'primary' | 'supporting' | string;
  responsibility?: string | null;
  contact_user_id?: number | null;
  contact_name?: string | null;
  name: string;
  color?: string;
}

/** Dòng công việc trong `GET /api/activities/:id` (server đã chuẩn hoá `stage`). */
export interface ActivityTaskRow {
  id: number;
  activity_id: number;
  team_id: number;
  title: string;
  description?: string | null;
  stage?: 'before' | 'during' | 'after' | 'general' | string;
  recorded_stage?: string;
  priority: string;
  status: string;
  start_date?: string | null;
  deadline: string;
  deliverable?: string | null;
  team_name?: string;
  primary_assignee_id?: number | null;
  primary_assignee_name?: string | null;
  assignee_name?: string | null;
  assignee_ids?: string | null;
  checklist_total?: number;
  checklist_done?: number;
}

export interface ActivityParticipant {
  activity_id?: number;
  user_id: number;
  state: 'confirmed' | 'volunteered' | 'declined' | string;
  responsibility?: string | null;
  name: string;
  role?: string;
  avatar_color?: string;
}

export interface ActivityUpdateTag {
  id: number;
  name: string;
}

export type ActivityUpdateKind = 'comment' | 'progress' | 'issue' | 'evidence';

export interface ActivityUpdate {
  id: number;
  activity_id?: number;
  task_id?: number | null;
  user_id?: number;
  kind: ActivityUpdateKind | 'review_note' | string;
  body: string;
  attachment_url?: string | null;
  created_at: string;
  user_name: string;
  avatar_color?: string;
  tagged_users: ActivityUpdateTag[];
}

/** Người có thể thêm vào hoạt động (`people` của `GET /api/activities/:id`). */
export interface ActivityPerson {
  id: number;
  name: string;
  role?: string;
  team_id?: number | null;
  team_ids: number[];
  team_names: string[];
}

export interface TaggablePerson {
  id: number;
  name: string;
  role?: string;
}

export interface ActivityAttachment {
  id: number;
  task_id: number;
  kind: 'clarification' | 'evidence' | 'issue' | 'deliverable' | string;
  label?: string | null;
  link_url?: string | null;
  original_name?: string | null;
  mime_type?: string | null;
  size_bytes?: number | null;
  created_at?: string;
  user_name?: string;
}

export interface ProposalHistoryItem {
  id: number;
  activity_id?: number;
  action: 'submit' | 'approve' | 'reject' | 'request_changes' | string;
  submitter_name?: string;
  reviewer_name?: string | null;
  feedback_notes?: string | null;
  created_at: string;
}

export interface ActivityDetail {
  activity: ActivityItem;
  activityTeams: ActivityTeamRow[];
  tasks: ActivityTaskRow[];
  participants: ActivityParticipant[];
  updates: ActivityUpdate[];
  people: ActivityPerson[];
  taggablePeople: TaggablePerson[];
  attachments: ActivityAttachment[];
  proposalHistory: ProposalHistoryItem[];
  canManage: boolean;
}

/** Trường `PATCH /api/activities/:id` chấp nhận. Người không phải admin không được gửi `status`, `event_lead_id`, `team_id`, `team_ids`. */
export interface UpdateActivityPayload {
  title?: string;
  description?: string;
  type?: string;
  priority?: string;
  start_date?: string | null;
  deadline?: string;
  location?: string | null;
  requested_by?: string | null;
  result_summary?: string | null;
  proposal_document_url?: string;
  is_public?: boolean;
  public_image_url?: string;
  status?: string;
  event_lead_id?: number | null;
  team_id?: number;
  team_ids?: number[];
}

export interface PostUpdatePayload {
  kind: ActivityUpdateKind;
  body: string;
  attachment_url?: string;
  tagged_user_ids?: number[];
  task_id?: number;
}

/** Endpoint: GET /api/activities/:id */
export async function fetchActivityDetail(id: number): Promise<ActivityDetail> {
  const response = await apiClient.get<ActivityDetail>(`/activities/${id}`);
  return response.data;
}

/** Endpoint: PATCH /api/activities/:id. `deleted: true` khi admin chuyển sang `cancelled` (server xoá hẳn). */
export async function updateActivity(id: number, payload: UpdateActivityPayload): Promise<{ ok: boolean; deleted?: boolean }> {
  const response = await apiClient.patch<{ ok: boolean; deleted?: boolean }>(`/activities/${id}`, payload);
  return response.data;
}

/** Endpoint: DELETE /api/activities/:id (chỉ admin, xoá hẳn). */
export async function deleteActivity(id: number): Promise<{ ok: boolean; id: number; title: string }> {
  const response = await apiClient.delete<{ ok: boolean; id: number; title: string }>(`/activities/${id}`);
  return response.data;
}

/** Endpoint: POST /api/activities/:id/approve */
export async function approveActivity(id: number): Promise<{ ok: boolean }> {
  const response = await apiClient.post<{ ok: boolean }>(`/activities/${id}/approve`);
  return response.data;
}

/** Endpoint: POST /api/activities/:id/request-changes (bắt buộc feedback). */
export async function requestActivityChanges(id: number, feedback: string): Promise<{ ok: boolean }> {
  const response = await apiClient.post<{ ok: boolean }>(`/activities/${id}/request-changes`, { feedback });
  return response.data;
}

/** Endpoint: POST /api/activities/:id/reject (bắt buộc feedback; server xoá hẳn hoạt động). */
export async function rejectActivity(id: number, feedback: string): Promise<{ ok: boolean; deleted?: boolean }> {
  const response = await apiClient.post<{ ok: boolean; deleted?: boolean }>(`/activities/${id}/reject`, { feedback });
  return response.data;
}

/** Endpoint: POST /api/activities/:id/submit (nộp lại đề án). */
export async function submitActivity(id: number): Promise<{ ok: boolean }> {
  const response = await apiClient.post<{ ok: boolean }>(`/activities/${id}/submit`);
  return response.data;
}

/** Endpoint: POST /api/activities/:id/volunteer */
export async function volunteerForActivity(id: number): Promise<{ ok: boolean }> {
  const response = await apiClient.post<{ ok: boolean }>(`/activities/${id}/volunteer`);
  return response.data;
}

/** Endpoint: POST /api/activities/:id/participants */
export async function addActivityParticipants(id: number, payload: { user_ids: number[]; responsibility: string }): Promise<void> {
  await apiClient.post(`/activities/${id}/participants`, payload);
}

/** Endpoint: POST /api/activities/:id/updates */
export async function postActivityUpdate(id: number, payload: PostUpdatePayload): Promise<{ ok: boolean; id: number }> {
  const response = await apiClient.post<{ ok: boolean; id: number }>(`/activities/${id}/updates`, payload);
  return response.data;
}
```

- [ ] **Step 4: Chạy test và kiểm kiểu**

Run: `npx vitest run src/core/api && npx tsc --noEmit`
Expected: PASS, `tsc` không lỗi.

- [ ] **Step 5: Commit**

```bash
git add web/src/core/api/activities.ts web/src/core/api/activities.detail.test.ts
git commit -m "feat(web): hàm API chi tiết, sửa, xoá, duyệt, tham gia, cập nhật hoạt động

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Khoá cache, quyền hiện nút, gom giai đoạn, helper điều hướng và tiện ích test

**Files:**
- Create: `web/src/core/navigation.ts`, `web/src/core/features/activities/activityKeys.ts`, `web/src/core/features/activities/activityPermissions.ts`, `web/src/core/features/activities/planStages.ts`, `web/src/core/features/activities/testUtils.tsx`
- Test: `web/src/core/navigation.test.ts`, `web/src/core/features/activities/activityKeys.test.ts`, `web/src/core/features/activities/activityPermissions.test.ts`, `web/src/core/features/activities/planStages.test.ts`

**Interfaces:**
- Consumes: `ActivityDetail`, `ActivityTaskRow` (Task 2); `BOOTSTRAP_KEY` (`core/queryKeys.ts`); `SESSION_KEY`; `ToastProvider`.
- Produces:
  - `activityPath(id): string` → `/activity/5`; `activityHref(id)` → `#/activity/5`; `goToActivity(id): void` (đặt `window.location.hash`).
  - `ACTIVITIES_KEY = ['core-activities']`, `activityDetailKey(id) = ['core-activity', Number(id)]`, `invalidateActivity(qc, id): Promise<unknown>`, `forgetActivity(qc, id): void`.
  - `interface ActivityActionFlags { canApprove, canResubmit, canEdit, canEditAdminFields, canDelete, canVolunteer, canAddParticipants }`, `deriveActivityActions({ isExec, userId, detail })`.
  - `groupTasksByStage(tasks, activityType): StageGroup<T>[]`, `STAGE_LABELS`.
  - Test: `renderInApp(ui, opts)`, `makeDetail(overrides)`, `Probe`.

- [ ] **Step 1: Viết test hỏng**

```ts
// web/src/core/navigation.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { activityHref, activityPath, goToActivity } from './navigation';

describe('navigation', () => {
  beforeEach(() => {
    window.location.hash = '';
  });

  it('tạo đường dẫn và href tới chi tiết hoạt động', () => {
    expect(activityPath(5)).toBe('/activity/5');
    expect(activityHref('12')).toBe('#/activity/12');
  });

  it('goToActivity đặt hash để HashRouter chuyển trang', () => {
    goToActivity(7);
    expect(window.location.hash).toBe('#/activity/7');
  });
});
```

```ts
// web/src/core/features/activities/activityKeys.test.ts
import { describe, it, expect, vi } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import { ACTIVITIES_KEY, activityDetailKey, forgetActivity, invalidateActivity } from './activityKeys';
import { BOOTSTRAP_KEY } from '../../queryKeys';

describe('activityKeys', () => {
  it('khoá chi tiết theo số', () => {
    expect(activityDetailKey('5')).toEqual(['core-activity', 5]);
  });

  it('invalidateActivity làm mới chi tiết, danh sách và bootstrap', async () => {
    const qc = new QueryClient();
    const spy = vi.spyOn(qc, 'invalidateQueries');
    await invalidateActivity(qc, 5);
    expect(spy).toHaveBeenCalledWith({ queryKey: ['core-activity', 5] });
    expect(spy).toHaveBeenCalledWith({ queryKey: ACTIVITIES_KEY });
    expect(spy).toHaveBeenCalledWith({ queryKey: BOOTSTRAP_KEY });
  });

  it('forgetActivity bỏ cache chi tiết và làm mới mọi khoá core-*', () => {
    const qc = new QueryClient();
    qc.setQueryData(['core-activity', 5], { activity: { id: 5 } });
    qc.setQueryData(['core-my-tasks'], []);
    forgetActivity(qc, 5);
    expect(qc.getQueryData(['core-activity', 5])).toBeUndefined();
    expect(qc.getQueryState(['core-my-tasks'])?.isInvalidated).toBe(true);
  });
});
```

```ts
// web/src/core/features/activities/activityPermissions.test.ts
import { describe, it, expect } from 'vitest';
import { deriveActivityActions } from './activityPermissions';
import { makeDetail } from './testUtils';

const detail = (status: string, canManage: boolean, participants = makeDetail().participants) =>
  makeDetail({ activity: { status }, canManage, participants });

describe('deriveActivityActions', () => {
  it('admin duyệt/xoá/sửa khi đề án chờ duyệt', () => {
    const a = deriveActivityActions({ isExec: true, userId: 1, detail: detail('proposed', true) });
    expect(a).toMatchObject({ canApprove: true, canEdit: true, canEditAdminFields: true, canDelete: true, canAddParticipants: true });
    expect(a.canResubmit).toBe(false);
  });

  it('admin không duyệt khi không còn ở trạng thái proposed', () => {
    expect(deriveActivityActions({ isExec: true, userId: 1, detail: detail('approved', true) }).canApprove).toBe(false);
  });

  it('Tổ trưởng (canManage, không admin): sửa được, không duyệt/xoá/sửa trường admin', () => {
    const a = deriveActivityActions({ isExec: false, userId: 2, detail: detail('proposed', true) });
    expect(a).toMatchObject({ canApprove: false, canDelete: false, canEditAdminFields: false, canEdit: true, canAddParticipants: true });
  });

  it('nộp lại chỉ khi changes_requested và canManage', () => {
    expect(deriveActivityActions({ isExec: false, userId: 2, detail: detail('changes_requested', true) }).canResubmit).toBe(true);
    expect(deriveActivityActions({ isExec: false, userId: 2, detail: detail('changes_requested', false) }).canResubmit).toBe(false);
    expect(deriveActivityActions({ isExec: false, userId: 2, detail: detail('proposed', true) }).canResubmit).toBe(false);
  });

  it('thành viên thường không sửa, không thêm người', () => {
    const a = deriveActivityActions({ isExec: false, userId: 3, detail: detail('active', false) });
    expect(a).toMatchObject({ canEdit: false, canAddParticipants: false, canApprove: false, canDelete: false });
  });

  it('đăng ký tham gia: hiện khi chưa có dòng hoặc đã từ chối, ẩn khi đã đăng ký/xác nhận', () => {
    const row = (state: string) => [{ user_id: 3, state, name: 'A' }];
    expect(deriveActivityActions({ isExec: false, userId: 3, detail: detail('active', false, []) }).canVolunteer).toBe(true);
    expect(deriveActivityActions({ isExec: false, userId: 3, detail: detail('active', false, row('declined')) }).canVolunteer).toBe(true);
    expect(deriveActivityActions({ isExec: false, userId: 3, detail: detail('active', false, row('volunteered')) }).canVolunteer).toBe(false);
    expect(deriveActivityActions({ isExec: false, userId: 3, detail: detail('active', false, row('confirmed')) }).canVolunteer).toBe(false);
    expect(deriveActivityActions({ isExec: false, userId: null, detail: detail('active', false, []) }).canVolunteer).toBe(false);
  });
});
```

```ts
// web/src/core/features/activities/planStages.test.ts
import { describe, it, expect } from 'vitest';
import { groupTasksByStage } from './planStages';

const task = (id: number, stage: string, status = 'in_progress') => ({ id, stage, status });

describe('groupTasksByStage', () => {
  it('sự kiện có Trước, Trong, Sau và ẩn việc đã huỷ', () => {
    const groups = groupTasksByStage(
      [task(1, 'before'), task(2, 'during'), task(3, 'after'), task(4, 'before', 'cancelled')],
      'event'
    );
    expect(groups.map((g) => [g.label, g.tasks.map((t) => t.id)])).toEqual([
      ['Trước', [1]],
      ['Trong', [2]],
      ['Sau', [3]],
    ]);
  });

  it('stage general hoặc thiếu của sự kiện rơi về Trước', () => {
    const groups = groupTasksByStage([task(1, 'general'), { id: 2, status: 'open' }], 'event');
    expect(groups[0].tasks.map((t) => t.id)).toEqual([1, 2]);
  });

  it('việc được giao chỉ có giai đoạn Chung', () => {
    const groups = groupTasksByStage([task(1, 'before'), task(2, 'general'), task(3, 'after', 'cancelled')], 'assigned');
    expect(groups).toHaveLength(1);
    expect(groups[0].label).toBe('Chung');
    expect(groups[0].tasks.map((t) => t.id)).toEqual([1, 2]);
  });

  it('giai đoạn trống vẫn có mặt với danh sách rỗng', () => {
    expect(groupTasksByStage([], 'event').map((g) => g.tasks.length)).toEqual([0, 0, 0]);
  });
});
```

- [ ] **Step 2: Chạy, xác nhận hỏng**

Run: `npx vitest run src/core/navigation.test.ts src/core/features/activities/activityKeys.test.ts src/core/features/activities/activityPermissions.test.ts src/core/features/activities/planStages.test.ts`
Expected: FAIL (module chưa có).

- [ ] **Step 3: Viết mã**

```ts
// web/src/core/navigation.ts
/** Đường dẫn trong router (không có `#`). */
export const activityPath = (id: number | string): string => `/activity/${id}`;

/** Giá trị `href` cho thẻ `<a>`; dùng được ngoài ngữ cảnh Router (HashRouter nhận hash). */
export const activityHref = (id: number | string): string => `#${activityPath(id)}`;

/** Chuyển tới chi tiết hoạt động mà không cần `useNavigate`. */
export function goToActivity(id: number | string): void {
  window.location.hash = activityPath(id);
}
```

```ts
// web/src/core/features/activities/activityKeys.ts
import type { QueryClient } from '@tanstack/react-query';
import { BOOTSTRAP_KEY } from '../../queryKeys';

export const ACTIVITIES_KEY = ['core-activities'] as const;
export const activityDetailKey = (id: number | string) => ['core-activity', Number(id)] as const;

/** Sau thao tác ghi thành công: làm mới chi tiết, danh sách và số liệu Tổng quan. */
export function invalidateActivity(qc: QueryClient, id: number | string): Promise<unknown> {
  return Promise.all([
    qc.invalidateQueries({ queryKey: activityDetailKey(id) }),
    qc.invalidateQueries({ queryKey: ACTIVITIES_KEY }),
    qc.invalidateQueries({ queryKey: BOOTSTRAP_KEY }),
  ]);
}

/** Hoạt động bị xoá hẳn (từ chối, huỷ, xoá): bỏ cache chi tiết, làm mới mọi danh sách `core-*` (việc của hoạt động cũng mất). */
export function forgetActivity(qc: QueryClient, id: number | string): void {
  qc.removeQueries({ queryKey: activityDetailKey(id) });
  void qc.invalidateQueries({ predicate: (query) => String(query.queryKey[0]).startsWith('core-') });
}
```

```ts
// web/src/core/features/activities/activityPermissions.ts
import type { ActivityDetail } from '../../api';

export interface ActivityActionFlags {
  /** Duyệt / Yêu cầu sửa / Từ chối. */
  canApprove: boolean;
  canResubmit: boolean;
  canEdit: boolean;
  /** Sửa Tổ, trạng thái, Trưởng BTC (chỉ admin). */
  canEditAdminFields: boolean;
  canDelete: boolean;
  canVolunteer: boolean;
  canAddParticipants: boolean;
}

export interface ActivityActionInput {
  isExec: boolean;
  userId: number | null;
  detail: Pick<ActivityDetail, 'activity' | 'participants' | 'canManage'>;
}

/** Bắt chước điều kiện server (core/src/routes/activities.js). Server vẫn là nơi chặn cuối. */
export function deriveActivityActions({ isExec, userId, detail }: ActivityActionInput): ActivityActionFlags {
  const status = detail.activity.status;
  const canManage = detail.canManage || isExec;
  const mine = userId === null ? undefined : detail.participants.find((p) => Number(p.user_id) === userId);
  return {
    canApprove: isExec && status === 'proposed',
    canResubmit: canManage && status === 'changes_requested',
    canEdit: canManage,
    canEditAdminFields: isExec,
    canDelete: isExec,
    canVolunteer: userId !== null && (!mine || mine.state === 'declined'),
    canAddParticipants: canManage,
  };
}
```

```ts
// web/src/core/features/activities/planStages.ts
export type StageKey = 'before' | 'during' | 'after' | 'general';

export const STAGE_LABELS: Record<StageKey, string> = {
  before: 'Trước',
  during: 'Trong',
  after: 'Sau',
  general: 'Chung',
};

export interface StageGroup<T> {
  key: StageKey;
  label: string;
  tasks: T[];
}

const EVENT_STAGES: StageKey[] = ['before', 'during', 'after'];

function eventStage(stage?: string | null): StageKey {
  return stage === 'during' || stage === 'after' ? stage : 'before';
}

/** Hoạt động sự kiện: Trước/Trong/Sau (giai đoạn lạ hoặc `general` → Trước). Việc được giao: chỉ "Chung". Ẩn việc đã huỷ. */
export function groupTasksByStage<T extends { stage?: string | null; status: string }>(
  tasks: T[],
  activityType?: string | null
): StageGroup<T>[] {
  const visible = tasks.filter((t) => t.status !== 'cancelled');
  if (activityType === 'assigned') return [{ key: 'general', label: STAGE_LABELS.general, tasks: visible }];
  return EVENT_STAGES.map((key) => ({
    key,
    label: STAGE_LABELS[key],
    tasks: visible.filter((t) => eventStage(t.stage) === key),
  }));
}
```

```tsx
// web/src/core/features/activities/testUtils.tsx
// Chỉ dùng trong test: dựng ứng dụng tối giản (React Query + Toast + MemoryRouter) và dữ liệu mẫu.
import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastProvider } from '../../../shared/components/Toast';
import { BOOTSTRAP_KEY, SESSION_KEY } from '../../queryKeys';
import type { ActivityDetail, ActivityItem, TeamItem } from '../../api';

/** Hiện đường dẫn hiện tại để test kiểm tra điều hướng. */
export const Probe = () => <div data-testid="path">{useLocation().pathname}</div>;

export interface AppOptions {
  path?: string;
  routePath?: string;
  role?: string;
  userId?: number;
  teams?: TeamItem[];
}

export function renderInApp(ui: React.ReactElement, opts: AppOptions = {}) {
  const { path = '/activity/5', routePath = '/activity/:id', role = 'member', userId = 3, teams = [] } = opts;
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity }, mutations: { retry: false } } });
  qc.setQueryData(SESSION_KEY, {
    user: { id: userId, name: 'Người dùng thử', email: 't@x.vn', role },
    units: { current: null, memberships: [] },
  });
  qc.setQueryData(BOOTSTRAP_KEY, {
    stats: { activeActivities: 0, openTasks: 0, overdueTasks: 0, completedMonth: 0 },
    upcoming: [],
    tasks: [],
    activity: [],
    teams,
    capabilities: { canCreateActivity: true, canCreateAccount: role === 'admin' },
  });
  const utils = render(
    <QueryClientProvider client={qc}>
      <ToastProvider>
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route path={routePath} element={ui} />
            <Route path="*" element={<Probe />} />
          </Routes>
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>
  );
  return { qc, ...utils };
}

type DetailOverrides = Partial<Omit<ActivityDetail, 'activity'>> & { activity?: Partial<ActivityItem> };

export function makeDetail(over: DetailOverrides = {}): ActivityDetail {
  const base: ActivityDetail = {
    activity: {
      id: 5,
      title: 'Ngày hội Kỹ thuật',
      description: 'Ngày hội giới thiệu các câu lạc bộ kỹ thuật.',
      type: 'event',
      status: 'proposed',
      priority: 'high',
      team_id: 2,
      creator_id: 9,
      start_date: '2026-11-01',
      deadline: '2026-11-30',
      location: 'Hội trường A',
      requested_by: null,
      event_lead_id: 7,
      event_lead_name: 'Lê Trưởng BTC',
      creator_name: 'Trần Người Tạo',
      team_name: 'Tuyên huấn',
      proposal_document_url: 'https://drive.example/de-an',
      is_public: 0,
      public_image_url: null,
      result_summary: null,
      created_at: '2026-10-01T03:00:00.000Z',
      updated_at: '2026-10-02T03:00:00.000Z',
    },
    activityTeams: [
      { activity_id: 5, team_id: 2, role: 'primary', responsibility: 'Điều phối hoạt động', name: 'Tuyên huấn', color: '#00875A' },
      { activity_id: 5, team_id: 3, role: 'supporting', responsibility: 'Hỗ trợ truyền thông', name: 'Truyền thông', color: '#0052CC' },
    ],
    tasks: [],
    participants: [],
    updates: [],
    people: [],
    taggablePeople: [],
    attachments: [],
    proposalHistory: [],
    canManage: false,
  };
  return { ...base, ...over, activity: { ...base.activity, ...(over.activity ?? {}) } };
}
```

- [ ] **Step 4: Chạy test xanh và kiểm kiểu**

Run: `npx vitest run src/core/navigation.test.ts src/core/features/activities && npx tsc --noEmit`
Expected: PASS (các test cũ của `activities/` vẫn xanh), `tsc` sạch.

- [ ] **Step 5: Commit**

```bash
git add web/src/core/navigation.ts web/src/core/navigation.test.ts web/src/core/features/activities
git commit -m "feat(web): khoá cache, quyền hiện nút, gom giai đoạn và tiện ích test cho hoạt động

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Form tạo đề xuất đủ trường (Trưởng BTC, kiểm link, `onCreated`)

**Files:**
- Modify: `web/src/core/features/dashboard/CreateActivityModal.tsx`
- Modify: `web/src/core/features/dashboard/CreateActivityModal.test.tsx`

**Interfaces:**
- Consumes: `fetchMembers` (`['core-members']`), `LinkField`, `LINK_ERROR_MESSAGE`, `isHttpUrl`, `createActivity` trả `{ id }`.
- Produces: `CreateActivityModal` nhận thêm `onCreated?: (id: number) => void` (gọi sau khi đóng modal); payload có thêm `event_lead_id: number | null`; lỗi link http(s) chặn gửi.

Form đã có sẵn: `type`, `team_ids[]` (Tổ chủ trì + Tổ tham gia), `priority`, `location`, `requested_by`, `proposal_document_url`, `is_public`, `public_image_url`. Còn thiếu: `event_lead_id`, kiểm link phía client, hiện Tổ chủ trì là đã gồm sẵn, `onCreated`.

- [ ] **Step 1: Viết test hỏng**

Trong `CreateActivityModal.test.tsx`:

(a) Thêm `fetchMembers: vi.fn(),` vào `vi.mock('../../api', …)` (cạnh `createActivity: vi.fn()`), và trong `beforeEach` thêm:

```tsx
    vi.mocked(api.fetchMembers).mockResolvedValue(mockMembers);
```

(b) Thêm sau `mockTeams`:

```tsx
const mockMembers: api.MemberItem[] = [
  { id: 7, name: 'Lê Trưởng BTC', email: 'le@x.vn', role: 'member', is_active: 1 },
  { id: 8, name: 'Nghỉ Việc', email: 'nv@x.vn', role: 'member', is_active: 0 },
];
```

(c) Thêm helper cạnh `chooseLeadTeam`:

```tsx
  const chooseOption = async (label: RegExp, name: string) => {
    const input = screen.getByLabelText(label);
    fireEvent.focus(input);
    fireEvent.keyDown(input, { key: 'ArrowDown', keyCode: 40 });
    fireEvent.click(await screen.findByRole('option', { name }));
  };
```

(d) Thêm các test mới trước dấu `});` cuối của `describe`:

```tsx
  it('gửi đủ các trường mở rộng của UI cũ, gồm Trưởng BTC', async () => {
    renderWithClient(<CreateActivityModal isOpen={true} onClose={() => {}} />);
    await screen.findByText('Tuyên huấn và Sự kiện');
    fillRequiredFields();
    await chooseLeadTeam('Tuyên huấn và Sự kiện');
    await chooseOption(/Trưởng Ban Tổ chức/i, 'Lê Trưởng BTC');
    fireEvent.change(screen.getByLabelText('Địa điểm'), { target: { value: 'Hội trường A' } });
    fireEvent.change(screen.getByLabelText('Được yêu cầu bởi'), { target: { value: 'Ban Thường vụ' } });
    fireEvent.change(screen.getByLabelText(/Hồ sơ hoạt động/), { target: { value: 'https://drive.example/de-an' } });
    fireEvent.click(screen.getByLabelText(/Hiển thị hoạt động này trên trang công khai/));
    fireEvent.change(screen.getByLabelText(/Liên kết ảnh công khai/), { target: { value: 'https://img.example/a.jpg' } });

    fireEvent.click(screen.getByRole('button', { name: /Tạo đề xuất/i }));

    await waitFor(() =>
      expect(api.createActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          event_lead_id: 7,
          location: 'Hội trường A',
          requested_by: 'Ban Thường vụ',
          proposal_document_url: 'https://drive.example/de-an',
          public_image_url: 'https://img.example/a.jpg',
          is_public: true,
          priority: 'medium',
          type: 'event',
          team_id: 2,
          team_ids: [2],
        })
      )
    );
  });

  it('không chọn Trưởng BTC thì gửi event_lead_id null; người đã nghỉ không có trong danh sách', async () => {
    renderWithClient(<CreateActivityModal isOpen={true} onClose={() => {}} />);
    await screen.findByText('Tuyên huấn và Sự kiện');
    fillRequiredFields();
    await chooseLeadTeam('Tuyên huấn và Sự kiện');
    const input = screen.getByLabelText(/Trưởng Ban Tổ chức/i);
    fireEvent.focus(input);
    fireEvent.keyDown(input, { key: 'ArrowDown', keyCode: 40 });
    expect(await screen.findByRole('option', { name: 'Lê Trưởng BTC' })).toBeDefined();
    expect(screen.queryByRole('option', { name: 'Nghỉ Việc' })).toBeNull();
    fireEvent.keyDown(input, { key: 'Escape' });

    fireEvent.click(screen.getByRole('button', { name: /Tạo đề xuất/i }));
    await waitFor(() => expect(api.createActivity).toHaveBeenCalledWith(expect.objectContaining({ event_lead_id: null })));
  });

  it('Tổ chủ trì tự được đánh dấu và khoá trong danh sách Tổ tham gia', async () => {
    renderWithClient(<CreateActivityModal isOpen={true} onClose={() => {}} />);
    await screen.findByText('Tuyên huấn và Sự kiện');
    await chooseLeadTeam('Tuyên huấn và Sự kiện');
    const checkbox = screen.getByRole('checkbox', { name: 'Tuyên huấn và Sự kiện' }) as HTMLInputElement;
    expect(checkbox.checked).toBe(true);
    expect(checkbox.disabled).toBe(true);
  });

  it('link không phải http(s) thì báo lỗi và không gửi', async () => {
    renderWithClient(<CreateActivityModal isOpen={true} onClose={() => {}} />);
    await screen.findByText('Tuyên huấn và Sự kiện');
    fillRequiredFields();
    await chooseLeadTeam('Tuyên huấn và Sự kiện');
    fireEvent.change(screen.getByLabelText(/Hồ sơ hoạt động/), { target: { value: 'ftp://may-chu/de-an' } });
    fireEvent.click(screen.getByRole('button', { name: /Tạo đề xuất/i }));

    expect((await screen.findAllByText('Liên kết phải bắt đầu bằng http:// hoặc https://.')).length).toBeGreaterThan(0);
    expect(api.createActivity).not.toHaveBeenCalled();
  });

  it('tạo xong gọi onCreated với id mới sau khi đóng modal', async () => {
    const onClose = vi.fn();
    const onCreated = vi.fn();
    renderWithClient(<CreateActivityModal isOpen={true} onClose={onClose} onCreated={onCreated} />);
    await screen.findByText('Tuyên huấn và Sự kiện');
    fillRequiredFields();
    await chooseLeadTeam('Tuyên huấn và Sự kiện');
    fireEvent.click(screen.getByRole('button', { name: /Tạo đề xuất/i }));

    await waitFor(() => expect(onCreated).toHaveBeenCalledWith(101));
    expect(onClose).toHaveBeenCalled();
  });
```

- [ ] **Step 2: Chạy, xác nhận hỏng**

Run: `npx vitest run src/core/features/dashboard/CreateActivityModal.test.tsx`
Expected: FAIL (5 test mới: chưa có ô Trưởng BTC, `onCreated`, kiểm link).

- [ ] **Step 3: Sửa `CreateActivityModal.tsx`**

(1) Import: đổi dòng import api và thêm hai import:

```tsx
import { fetchTeams, fetchBootstrap, fetchMembers, createActivity, apiErrorMessage, type CreateActivityPayload } from '../../api';
import { LinkField, LINK_ERROR_MESSAGE } from '../../../shared/components/LinkField';
import { isHttpUrl } from '../../../shared/utils/url';
```

(2) Props và chữ ký:

```tsx
interface Props {
  isOpen: boolean;
  onClose: () => void;
  /** Gọi với id hoạt động mới sau khi đóng modal (nơi gọi quyết định chuyển trang). */
  onCreated?: (id: number) => void;
}

export const CreateActivityModal: React.FC<Props> = ({ isOpen, onClose, onCreated }) => {
```

(3) Sau truy vấn `bootstrap` (trước `const createMutation`) thêm:

```tsx
  const { data: members = [] } = useQuery({
    queryKey: ['core-members'],
    queryFn: fetchMembers,
    enabled: isOpen,
  });
  // Tổ chủ trì luôn nằm trong các Tổ tham gia: form hiện nó đã đánh dấu và khoá.
  const [leadTeamId, setLeadTeamId] = useState<number | null>(null);
```

(4) Thay `onSuccess` của `createMutation`:

```tsx
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['core-activities'] });
      queryClient.invalidateQueries({ queryKey: ['core-bootstrap'] });
      onClose();
      onCreated?.(data.id);
    },
```

(5) Trong `useEffect` reset, thêm `setLeadTeamId(null);` ngay sau `setFormError(null);`.

(6) Sau khai báo `teamOptions` thêm:

```tsx
  const eventLeadOptions = members
    .filter((m) => m.is_active !== 0 && m.is_active !== false)
    .map((m) => ({ label: m.name, value: m.id }));
```

(7) Trong `handleSubmit`, ngay sau khối kiểm `startDate > deadline` (trước `setFormError(null);`) thêm:

```tsx
    const proposalUrl = String(formData.activityProfile || '').trim();
    const publicImageUrl = String(formData.publicImageUrl || '').trim();
    if ((proposalUrl && !isHttpUrl(proposalUrl)) || (publicImageUrl && !isHttpUrl(publicImageUrl))) {
      setFormError(LINK_ERROR_MESSAGE);
      return;
    }
```

và trong `payload` thay hai khối `proposal_document_url`/`public_image_url` cũ bằng:

```tsx
      event_lead_id: formData.eventLead?.value ?? null,
      proposal_document_url: proposalUrl || null,
      public_image_url: publicImageUrl || null,
```

(8) Ô Tổ chủ trì: thay `<Select {...fieldProps} placeholder="Chọn một Tổ" options={teamOptions} isLoading={isLoadingList} />` (giữ nguyên các prop, chỉ thêm `onChange`) bằng:

```tsx
                          <Select
                            {...fieldProps}
                            onChange={(option) => {
                              fieldProps.onChange(option);
                              setLeadTeamId((option as SelectOption<number> | null)?.value ?? null);
                            }}
                            placeholder="Chọn một Tổ"
                            options={teamOptions}
                            isLoading={isLoadingList}
                          />
```

(9) Checkbox Tổ tham gia: đổi `isChecked={selectedIds.includes(t.value)}` thành

```tsx
                                isChecked={selectedIds.includes(t.value) || t.value === leadTeamId}
                                isDisabled={t.value === leadTeamId}
```

(10) Ngay **sau** thẻ đóng `</Field>` của `participatingTeams` (trước `<div style={{ display: 'flex', gap: '16px' }}>` chứa ngày) thêm ô Trưởng BTC:

```tsx
                  <Field<SelectOption<number> | null>
                    name="eventLead"
                    label="Trưởng Ban Tổ chức (không bắt buộc)"
                    defaultValue={null}
                  >
                    {({ fieldProps }) => (
                      <Select {...fieldProps} isClearable placeholder="Chọn một người" options={eventLeadOptions} />
                    )}
                  </Field>
```

(11) Thay hai `Field` link: khối `name="activityProfile"` (từ `<Field` đến `</Field>`) thành

```tsx
                  <Field name="activityProfile" label="" defaultValue="">
                    {({ fieldProps }) => (
                      <LinkField
                        label="Hồ sơ hoạt động (đề án, không bắt buộc)"
                        value={String(fieldProps.value ?? '')}
                        onChange={(value) => fieldProps.onChange(value)}
                      />
                    )}
                  </Field>
```

và khối `name="publicImageUrl"` thành

```tsx
                  <Field name="publicImageUrl" label="" defaultValue="">
                    {({ fieldProps }) => (
                      <LinkField
                        label="Liên kết ảnh công khai (không bắt buộc)"
                        value={String(fieldProps.value ?? '')}
                        onChange={(value) => fieldProps.onChange(value)}
                        placeholder="https://example.com/activity.jpg"
                      />
                    )}
                  </Field>
```

- [ ] **Step 4: Chạy test xanh**

Run: `npx vitest run src/core/features/dashboard && npx tsc --noEmit`
Expected: PASS (cả test cũ và 5 test mới), `tsc` sạch.

- [ ] **Step 5: Commit**

```bash
git add web/src/core/features/dashboard/CreateActivityModal.tsx web/src/core/features/dashboard/CreateActivityModal.test.tsx
git commit -m "feat(web): form tạo đề xuất có Trưởng BTC, kiểm link, onCreated

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Danh sách hoạt động bấm được và chuyển tới chi tiết sau khi tạo

**Files:**
- Modify: `web/src/core/features/activities/ActivitiesView.tsx`, `web/src/core/features/dashboard/Dashboard.tsx`
- Modify (test): `web/src/core/features/activities/ActivitiesView.test.tsx`

**Interfaces:**
- Consumes: `activityHref`, `goToActivity` (Task 3), `CreateActivityModal.onCreated` (Task 4), `isHttpUrl`.
- Produces: thẻ hoạt động có `data-testid="activity-card-<id>"`, tiêu đề là link `#/activity/<id>`, link đề án khi có `proposal_document_url` hợp lệ.

- [ ] **Step 1: Viết test hỏng** (thêm vào `describe('ActivitiesView')` trong `ActivitiesView.test.tsx`; thêm `import { beforeEach … }` đã có)

```tsx
  it('tiêu đề hoạt động là link tới trang chi tiết', async () => {
    renderWithClient(<ActivitiesView />);
    const link = await screen.findByRole('link', { name: 'Chiến dịch Mùa hè xanh 2026' });
    expect(link.getAttribute('href')).toBe('#/activity/1');
  });

  it('bấm vào thẻ hoạt động mở trang chi tiết', async () => {
    window.location.hash = '';
    renderWithClient(<ActivitiesView />);
    fireEvent.click(await screen.findByTestId('activity-card-2'));
    expect(window.location.hash).toBe('#/activity/2');
  });

  it('hiện link đề án khi có, và bấm link đó không mở trang chi tiết', async () => {
    window.location.hash = '';
    vi.mocked(api.fetchActivities).mockResolvedValue([
      { ...mockActivities[0], proposal_document_url: 'https://drive.example/de-an' },
      { ...mockActivities[1], proposal_document_url: 'javascript:alert(1)' },
    ]);
    renderWithClient(<ActivitiesView />);
    await screen.findByText('Chiến dịch Mùa hè xanh 2026');
    const links = screen.getAllByRole('link', { name: 'Hồ sơ đề án' });
    expect(links).toHaveLength(1);
    expect(links[0].getAttribute('href')).toBe('https://drive.example/de-an');
    fireEvent.click(links[0]);
    expect(window.location.hash).toBe('');
  });
```

- [ ] **Step 2: Chạy, xác nhận hỏng**

Run: `npx vitest run src/core/features/activities/ActivitiesView.test.tsx`
Expected: FAIL (3 test mới).

- [ ] **Step 3: Sửa mã**

`ActivitiesView.tsx`:

(1) Import:

```tsx
import { activityHref, goToActivity } from '../../navigation';
import { isHttpUrl } from '../../../shared/utils/url';
```

(2) Thẻ: thay `key={activity.id}` bằng

```tsx
                key={activity.id}
                data-testid={`activity-card-${activity.id}`}
                onClick={(e) => {
                  if ((e.target as HTMLElement).closest('a')) return;
                  goToActivity(activity.id);
                }}
```

và thay `position: 'relative',` (duy nhất, trong style của thẻ) bằng `position: 'relative',\n                  cursor: 'pointer',`.

(3) Tiêu đề: thay `{activity.title}` (duy nhất) bằng

```tsx
                    <a href={activityHref(activity.id)} style={{ color: 'inherit', textDecoration: 'none' }}>
                      {activity.title}
                    </a>
```

(4) Ngay trước dòng `{/* Footer Metadata */}` chèn:

```tsx
                  {activity.proposal_document_url && isHttpUrl(activity.proposal_document_url) && (
                    <a
                      href={activity.proposal_document_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: '13px', color: token('color.link', '#0052CC'), marginBottom: '8px' }}
                    >
                      Hồ sơ đề án
                    </a>
                  )}

```

(5) Chuyển trang sau khi tạo: thay `onClose={() => setIsModalOpen(false)}` (chỗ `<CreateActivityModal …/>` cuối file) bằng

```tsx
        onClose={() => setIsModalOpen(false)}
        onCreated={goToActivity}
```

`Dashboard.tsx`: thay `<CreateActivityModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />` bằng

```tsx
        <CreateActivityModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onCreated={(id) => onNavigate?.(`activity/${id}`)}
        />
```

(`onNavigate` của `AppRoutes` gọi `navigate('/activity/<id>')`; route đó có ở Task 6.)

- [ ] **Step 4: Chạy test xanh**

Run: `npx vitest run src/core/features/activities src/core/features/dashboard && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add web/src/core/features/activities/ActivitiesView.tsx web/src/core/features/activities/ActivitiesView.test.tsx web/src/core/features/dashboard/Dashboard.tsx
git commit -m "feat(web): thẻ hoạt động bấm được, tạo xong chuyển tới chi tiết

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Trang chi tiết — route, khung và các phần thông tin

**Files:**
- Create: `web/src/core/features/activities/ActivityInfoSections.tsx`, `web/src/core/features/activities/ActivityDetailView.tsx`
- Modify: `web/src/core/AppRoutes.tsx`, `web/src/core/AppRoutes.test.tsx`
- Test: `web/src/core/features/activities/ActivityDetailView.test.tsx`

**Interfaces:**
- Consumes: `fetchActivityDetail`, `ActivityDetail` (Task 2); `activityDetailKey` (Task 3); `getActivityStatusMeta`, `getActivityTypeLabel` (`activityLabels.ts`); `getTaskPriorityLabel`, `getTaskPriorityAppearance` (`features/tasks/taskLabels.ts`); `formatVnDate`; `isHttpUrl`; `LottieLoading`.
- Produces:
  - `Card({ title, testId, children })`, `ActivityHero({ activity })`, `ActivityGeneralInfo({ activity, teams })`, `ActivityTeamsCard({ teams })`, `ActivityParticipantsCard({ participants })`, `ActivityDetailsCard({ activity })`, `ProposalHistoryCard({ history })`.
  - `ActivityDetailView` (không prop; đọc `:id` từ route). Có ba mốc chèn `{/* PLAN */}`, `{/* UPDATES */}`, `{/* ACTIONS */}` cho Task 7, 8, 11.
  - `data-testid`: `section-info`, `section-teams`, `section-participants`, `section-details`, `section-history`.

- [ ] **Step 1: Viết test hỏng**

```tsx
// web/src/core/features/activities/ActivityDetailView.test.tsx
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { cleanup, screen, within } from '@testing-library/react';
import { ActivityDetailView } from './ActivityDetailView';
import { makeDetail, renderInApp } from './testUtils';
import * as api from '../../api';

vi.mock('../../api', async () => {
  const actual = await vi.importActual<typeof import('../../api')>('../../api');
  return { ...actual, fetchActivityDetail: vi.fn() };
});

const show = () => renderInApp(<ActivityDetailView />, { path: '/activity/5', routePath: '/activity/:id' });

describe('ActivityDetailView — thông tin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(cleanup);

  it('hiện phần đầu, thông tin chung, Tổ, người tham gia, chi tiết và lịch sử đề án', async () => {
    vi.mocked(api.fetchActivityDetail).mockResolvedValue(
      makeDetail({
        participants: [{ activity_id: 5, user_id: 21, state: 'confirmed', responsibility: 'Hậu cần', name: 'Phạm Hậu Cần', role: 'member' }],
        proposalHistory: [
          {
            id: 1,
            action: 'request_changes',
            submitter_name: 'Trần Người Tạo',
            reviewer_name: 'Quản trị A',
            feedback_notes: 'Bổ sung dự toán',
            created_at: '2026-10-02T03:00:00.000Z',
          },
        ],
      })
    );
    show();

    expect(await screen.findByRole('heading', { level: 1, name: 'Ngày hội Kỹ thuật' })).toBeDefined();
    expect(screen.getByText('Ngày hội giới thiệu các câu lạc bộ kỹ thuật.')).toBeDefined();
    expect(screen.getByText('Đề xuất')).toBeDefined();
    expect(screen.getByText('Ưu tiên: Cao')).toBeDefined();

    const info = within(screen.getByTestId('section-info'));
    expect(info.getByText('Tuyên huấn, Truyền thông')).toBeDefined();
    expect(info.getByText('01/11/2026 – 30/11/2026')).toBeDefined();
    expect(info.getByText('Hội trường A')).toBeDefined();
    expect(info.getByText('Trần Người Tạo')).toBeDefined();
    expect(info.getByText('Lê Trưởng BTC')).toBeDefined();
    expect(info.getByRole('link', { name: 'Mở link đề án' }).getAttribute('href')).toBe('https://drive.example/de-an');

    const teams = within(screen.getByTestId('section-teams'));
    expect(teams.getByText('Chủ trì')).toBeDefined();
    expect(teams.getByText('Hỗ trợ truyền thông')).toBeDefined();

    const people = within(screen.getByTestId('section-participants'));
    expect(people.getByText('Phạm Hậu Cần')).toBeDefined();
    expect(people.getByText('Đã xác nhận')).toBeDefined();
    expect(people.getByText('Hậu cần')).toBeDefined();

    const history = within(screen.getByTestId('section-history'));
    expect(history.getByText('Yêu cầu sửa')).toBeDefined();
    expect(history.getByText('Bổ sung dự toán')).toBeDefined();
    expect(history.getByText(/Quản trị A/)).toBeDefined();
  });

  it('link đề án không phải http(s) thì không thành thẻ a', async () => {
    vi.mocked(api.fetchActivityDetail).mockResolvedValue(makeDetail({ activity: { proposal_document_url: 'javascript:alert(1)' } }));
    show();
    await screen.findByRole('heading', { level: 1 });
    expect(screen.queryByRole('link', { name: 'Mở link đề án' })).toBeNull();
  });

  it('"Yêu cầu bởi" chỉ hiện với hoạt động chỉ đạo (assigned)', async () => {
    vi.mocked(api.fetchActivityDetail).mockResolvedValue(makeDetail({ activity: { type: 'assigned', requested_by: 'Ban Thường vụ' } }));
    show();
    await screen.findByRole('heading', { level: 1 });
    expect(within(screen.getByTestId('section-details')).getByText('Ban Thường vụ')).toBeDefined();
    cleanup();

    vi.mocked(api.fetchActivityDetail).mockResolvedValue(makeDetail({ activity: { type: 'event', requested_by: 'Ban Thường vụ' } }));
    show();
    await screen.findByRole('heading', { level: 1 });
    expect(within(screen.getByTestId('section-details')).queryByText('Ban Thường vụ')).toBeNull();
  });

  it('404 từ server hiện "Không tìm thấy hoạt động hoặc bạn không có quyền xem."', async () => {
    vi.mocked(api.fetchActivityDetail).mockRejectedValue({ response: { status: 404, data: { error: 'Activity not found.' } } });
    show();
    expect(await screen.findByText('Không tìm thấy hoạt động hoặc bạn không có quyền xem.')).toBeDefined();
    expect(screen.getByRole('link', { name: /Danh sách hoạt động/ }).getAttribute('href')).toBe('#/activities');
  });

  it('lỗi khác hiện câu lỗi tiếng Việt, mất mạng hiện "Không kết nối được máy chủ"', async () => {
    vi.mocked(api.fetchActivityDetail).mockRejectedValue(new Error('Network Error'));
    show();
    expect(await screen.findByText('Không kết nối được máy chủ. Vui lòng thử lại.')).toBeDefined();
  });

  it('id không hợp lệ không gọi API', async () => {
    renderInApp(<ActivityDetailView />, { path: '/activity/abc', routePath: '/activity/:id' });
    expect(await screen.findByText('Không tìm thấy hoạt động hoặc bạn không có quyền xem.')).toBeDefined();
    expect(api.fetchActivityDetail).not.toHaveBeenCalled();
  });
});
```

Trong `AppRoutes.test.tsx` thêm mock và test:

```tsx
vi.mock('./features/activities/ActivityDetailView', () => ({ ActivityDetailView: () => <div>màn-chi-tiết-hoạt-động</div> }));
```

```tsx
  it('mở trang chi tiết hoạt động theo #/activity/:id', () => {
    renderAt('/activity/12', 'member');
    expect(screen.getByText('màn-chi-tiết-hoạt-động')).toBeDefined();
  });
```

- [ ] **Step 2: Chạy, xác nhận hỏng**

Run: `npx vitest run src/core/features/activities/ActivityDetailView.test.tsx src/core/AppRoutes.test.tsx`
Expected: FAIL (thiếu module / route).

- [ ] **Step 3: Viết mã**

```tsx
// web/src/core/features/activities/ActivityInfoSections.tsx
import React from 'react';
import Lozenge from '@atlaskit/lozenge';
import { token } from '@atlaskit/tokens';
import type { ActivityItem, ActivityParticipant, ActivityTeamRow, ProposalHistoryItem } from '../../api';
import { getActivityStatusMeta, getActivityTypeLabel } from './activityLabels';
import { getTaskPriorityAppearance, getTaskPriorityLabel } from '../tasks/taskLabels';
import { formatVnDate } from '../../../shared/utils/date';
import { isHttpUrl } from '../../../shared/utils/url';

export const Card: React.FC<{ title: string; testId: string; children: React.ReactNode }> = ({ title, testId, children }) => (
  <section
    data-testid={testId}
    style={{
      border: `1px solid ${token('color.border', '#DFE1E6')}`,
      borderRadius: 6,
      padding: 16,
      marginBottom: 16,
      background: token('elevation.surface.raised', '#FFFFFF'),
    }}
  >
    <h2 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 600 }}>{title}</h2>
    {children}
  </section>
);

const Row: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div style={{ display: 'flex', gap: 8, padding: '4px 0', flexWrap: 'wrap' }}>
    <dt style={{ width: 130, flexShrink: 0, color: token('color.text.subtle', '#5E6C84') }}>{label}</dt>
    <dd style={{ margin: 0, minWidth: 0, overflowWrap: 'anywhere' }}>{children}</dd>
  </div>
);

const dateRange = (activity: ActivityItem): string => {
  const start = formatVnDate(activity.start_date);
  const end = formatVnDate(activity.deadline);
  return start ? `${start} – ${end}` : end;
};

export const ActivityHero: React.FC<{ activity: ActivityItem }> = ({ activity }) => {
  const status = getActivityStatusMeta(activity.status);
  return (
    <header style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
        <Lozenge appearance={status.appearance}>{status.label}</Lozenge>
        <Lozenge appearance={getTaskPriorityAppearance(activity.priority)}>{`Ưu tiên: ${getTaskPriorityLabel(activity.priority)}`}</Lozenge>
      </div>
      <h1 style={{ margin: '0 0 8px', fontSize: 24, fontWeight: 600, overflowWrap: 'anywhere' }}>{activity.title}</h1>
      {activity.description && <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{activity.description}</p>}
    </header>
  );
};

export const ActivityGeneralInfo: React.FC<{ activity: ActivityItem; teams: ActivityTeamRow[] }> = ({ activity, teams }) => (
  <Card title="Thông tin chung" testId="section-info">
    <dl style={{ margin: 0 }}>
      <Row label="Các Tổ">{teams.map((t) => t.name).join(', ') || activity.team_name || '—'}</Row>
      <Row label="Thời gian">{dateRange(activity)}</Row>
      <Row label="Địa điểm">{activity.location || '—'}</Row>
      <Row label="Người tạo">{activity.creator_name || '—'}</Row>
      <Row label="Trưởng BTC">{activity.event_lead_name || '—'}</Row>
      <Row label="Đề án">
        {activity.proposal_document_url && isHttpUrl(activity.proposal_document_url) ? (
          <a href={activity.proposal_document_url} target="_blank" rel="noopener noreferrer">
            Mở link đề án
          </a>
        ) : (
          '—'
        )}
      </Row>
    </dl>
  </Card>
);

const TEAM_ROLE_LABELS: Record<string, string> = { primary: 'Chủ trì', supporting: 'Phối hợp' };

export const ActivityTeamsCard: React.FC<{ teams: ActivityTeamRow[] }> = ({ teams }) => (
  <Card title="Tổ tham gia" testId="section-teams">
    {teams.length === 0 ? (
      <p style={{ margin: 0 }}>Chưa có Tổ nào.</p>
    ) : (
      <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
        {teams.map((t) => (
          <li key={t.team_id} style={{ padding: '4px 0' }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <strong>{t.name}</strong>
              <Lozenge appearance={t.role === 'primary' ? 'inprogress' : 'default'}>{TEAM_ROLE_LABELS[t.role] ?? t.role}</Lozenge>
            </div>
            {t.responsibility && <div style={{ color: token('color.text.subtle', '#5E6C84') }}>{t.responsibility}</div>}
          </li>
        ))}
      </ul>
    )}
  </Card>
);

const PARTICIPANT_STATE_LABELS: Record<string, string> = {
  confirmed: 'Đã xác nhận',
  volunteered: 'Tình nguyện',
  declined: 'Từ chối',
};

export const ActivityParticipantsCard: React.FC<{ participants: ActivityParticipant[] }> = ({ participants }) => (
  <Card title="Người tham gia" testId="section-participants">
    {participants.length === 0 ? (
      <p style={{ margin: 0 }}>Chưa có người tham gia.</p>
    ) : (
      <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
        {participants.map((p) => (
          <li key={p.user_id} style={{ padding: '4px 0' }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <strong>{p.name}</strong>
              <Lozenge appearance={p.state === 'confirmed' ? 'success' : 'default'}>{PARTICIPANT_STATE_LABELS[p.state] ?? p.state}</Lozenge>
            </div>
            {p.responsibility && <div style={{ color: token('color.text.subtle', '#5E6C84') }}>{p.responsibility}</div>}
          </li>
        ))}
      </ul>
    )}
  </Card>
);

export const ActivityDetailsCard: React.FC<{ activity: ActivityItem }> = ({ activity }) => (
  <Card title="Chi tiết hoạt động" testId="section-details">
    <dl style={{ margin: 0 }}>
      <Row label="Loại">{getActivityTypeLabel(activity.type) ?? '—'}</Row>
      {activity.type === 'assigned' && <Row label="Yêu cầu bởi">{activity.requested_by || '—'}</Row>}
      <Row label="Ngày tạo">{formatVnDate(activity.created_at) || '—'}</Row>
      <Row label="Cập nhật lần cuối">{formatVnDate(activity.updated_at) || '—'}</Row>
      {activity.result_summary && <Row label="Kết quả">{activity.result_summary}</Row>}
    </dl>
  </Card>
);

const PROPOSAL_ACTION_LABELS: Record<string, string> = {
  submit: 'Nộp đề án',
  approve: 'Duyệt',
  reject: 'Từ chối',
  request_changes: 'Yêu cầu sửa',
};

export const ProposalHistoryCard: React.FC<{ history: ProposalHistoryItem[] }> = ({ history }) => (
  <Card title="Lịch sử đề án" testId="section-history">
    {history.length === 0 ? (
      <p style={{ margin: 0 }}>Chưa có lịch sử.</p>
    ) : (
      <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
        {history.map((h) => (
          <li key={h.id} style={{ padding: '6px 0' }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <Lozenge appearance={h.action === 'approve' ? 'success' : h.action === 'reject' ? 'removed' : 'default'}>
                {PROPOSAL_ACTION_LABELS[h.action] ?? h.action}
              </Lozenge>
              <span>{h.reviewer_name ? `${h.submitter_name ?? ''} → ${h.reviewer_name}` : h.submitter_name}</span>
              <span style={{ color: token('color.text.subtle', '#5E6C84') }}>{formatVnDate(h.created_at)}</span>
            </div>
            {h.feedback_notes && <div style={{ whiteSpace: 'pre-wrap' }}>{h.feedback_notes}</div>}
          </li>
        ))}
      </ul>
    )}
  </Card>
);
```

```tsx
// web/src/core/features/activities/ActivityDetailView.tsx
import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { token } from '@atlaskit/tokens';
import { LottieLoading } from '../../../shared/components/LottieLoading';
import { apiErrorMessage, fetchActivityDetail } from '../../api';
import { activityDetailKey } from './activityKeys';
import {
  ActivityDetailsCard,
  ActivityGeneralInfo,
  ActivityHero,
  ActivityParticipantsCard,
  ActivityTeamsCard,
  ProposalHistoryCard,
} from './ActivityInfoSections';

const BackLink: React.FC = () => (
  <a href="#/activities" style={{ display: 'inline-block', marginBottom: 12, color: token('color.link', '#0052CC') }}>
    ← Danh sách hoạt động
  </a>
);

const NOT_FOUND_MESSAGE = 'Không tìm thấy hoạt động hoặc bạn không có quyền xem.';

/** Trang `#activity/:id`. Hoạt động của đơn vị khác server trả 404, trang hiện thông báo thay vì lỗi. */
export const ActivityDetailView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const activityId = Number(id);
  const validId = Number.isInteger(activityId) && activityId > 0;
  const { data, isLoading, error } = useQuery({
    queryKey: activityDetailKey(activityId),
    queryFn: () => fetchActivityDetail(activityId),
    enabled: validId,
  });

  if (validId && isLoading) return <LottieLoading message="Đang tải hoạt động..." size={140} />;

  if (!validId || !data) {
    const notFound = !validId || (error as { response?: { status?: number } } | null)?.response?.status === 404;
    return (
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <BackLink />
        <div role="alert" style={{ padding: 16, color: token('color.text.danger', '#AE2E24') }}>
          {notFound ? NOT_FOUND_MESSAGE : apiErrorMessage(error, 'Không tải được hoạt động. Vui lòng thử lại.')}
        </div>
      </div>
    );
  }

  const { activity } = data;
  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', paddingTop: 4 }}>
      <BackLink />
      <ActivityHero activity={activity} />
      {/* ACTIONS */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <div style={{ flex: '2 1 480px', minWidth: 0 }}>
          <ActivityGeneralInfo activity={activity} teams={data.activityTeams} />
          {/* PLAN */}
          {/* UPDATES */}
        </div>
        <aside style={{ flex: '1 1 280px', minWidth: 0 }}>
          <ActivityTeamsCard teams={data.activityTeams} />
          <ActivityParticipantsCard participants={data.participants} />
          <ActivityDetailsCard activity={activity} />
          <ProposalHistoryCard history={data.proposalHistory} />
        </aside>
      </div>
    </div>
  );
};
```

`AppRoutes.tsx`: thêm import `import { ActivityDetailView } from './features/activities/ActivityDetailView';` và route (ngay sau route `/activities`):

```tsx
      <Route path="/activity/:id" element={<ActivityDetailView />} />
```

- [ ] **Step 4: Chạy test xanh**

Run: `npx vitest run src/core/features/activities/ActivityDetailView.test.tsx src/core/AppRoutes.test.tsx && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add web/src/core/features/activities web/src/core/AppRoutes.tsx web/src/core/AppRoutes.test.tsx
git commit -m "feat(web): trang chi tiết hoạt động #activity/:id — thông tin chung, Tổ, người tham gia, lịch sử

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Kế hoạch công việc theo giai đoạn và tài liệu theo việc (chỉ đọc)

**Files:**
- Create: `web/src/core/features/activities/ActivityPlanSection.tsx`
- Modify: `web/src/core/features/activities/ActivityDetailView.tsx` (thay mốc `{/* PLAN */}`)
- Test: `web/src/core/features/activities/ActivityPlanSection.test.tsx`

**Interfaces:**
- Consumes: `groupTasksByStage` (Task 3), `Card` (Task 6), `QuotaBar`, `isHttpUrl`, `formatVnDate`, `getTaskStatusLabel/Appearance`, `getTaskPriorityLabel`, `ActivityTaskRow`, `ActivityAttachment`.
- Produces: `ActivityPlanSection({ tasks, attachments, activityType })`, `attachmentHref(a): string | null`, `data-testid="section-plan"`, mỗi dòng `data-testid="plan-task-<id>"`.

Quyết định: dòng việc chưa bấm được (đợt 2 thêm chi tiết công việc). Tệp có sẵn trên server (không có `link_url`) mở bằng `/api/task-attachments/:id/content`; link không phải `http(s)` hiện chữ thường, không thành thẻ `<a>`.

- [ ] **Step 1: Viết test hỏng**

```tsx
// web/src/core/features/activities/ActivityPlanSection.test.tsx
import { describe, it, expect, afterEach } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { ActivityPlanSection, attachmentHref } from './ActivityPlanSection';
import type { ActivityAttachment, ActivityTaskRow } from '../../api';

const task = (over: Partial<ActivityTaskRow>): ActivityTaskRow => ({
  id: 1,
  activity_id: 5,
  team_id: 2,
  title: 'Dựng sân khấu',
  stage: 'before',
  priority: 'high',
  status: 'in_progress',
  start_date: '2026-11-01',
  deadline: '2026-11-10',
  deliverable: 'Ảnh sân khấu',
  team_name: 'Tuyên huấn',
  primary_assignee_name: 'Nguyễn Văn A',
  checklist_total: 4,
  checklist_done: 1,
  ...over,
});

describe('ActivityPlanSection', () => {
  afterEach(cleanup);

  it('sự kiện: nhóm Trước/Trong/Sau, ẩn việc đã huỷ, hiện chi tiết từng việc', () => {
    render(
      <ActivityPlanSection
        activityType="event"
        attachments={[]}
        tasks={[
          task({ id: 1 }),
          task({ id: 2, title: 'Chạy chương trình', stage: 'during', status: 'open', primary_assignee_name: null, assignee_name: 'Trần B, Lê C' }),
          task({ id: 3, title: 'Việc đã huỷ', status: 'cancelled' }),
        ]}
      />
    );
    const plan = within(screen.getByTestId('section-plan'));
    expect(plan.getByRole('heading', { name: 'Trước' })).toBeDefined();
    expect(plan.getByRole('heading', { name: 'Trong' })).toBeDefined();
    expect(plan.getByRole('heading', { name: 'Sau' })).toBeDefined();
    expect(plan.queryByText('Việc đã huỷ')).toBeNull();

    const row = within(screen.getByTestId('plan-task-1'));
    expect(row.getByText('Dựng sân khấu')).toBeDefined();
    expect(row.getByText('Đang làm')).toBeDefined();
    expect(row.getByText('Nguyễn Văn A')).toBeDefined();
    expect(row.getByText('01/11/2026 – 10/11/2026')).toBeDefined();
    expect(row.getByText('Ảnh sân khấu')).toBeDefined();
    expect(row.getByText('1/4 mục')).toBeDefined();
    expect(within(screen.getByTestId('plan-task-2')).getByText('Trần B, Lê C')).toBeDefined();
    expect(plan.getAllByText('Chưa có công việc')).toHaveLength(1);
  });

  it('hoạt động được giao: chỉ có giai đoạn Chung', () => {
    render(<ActivityPlanSection activityType="assigned" attachments={[]} tasks={[task({ stage: 'general' })]} />);
    expect(screen.getByRole('heading', { name: 'Chung' })).toBeDefined();
    expect(screen.queryByRole('heading', { name: 'Trước' })).toBeNull();
  });

  it('tài liệu theo việc: link http mở được, tệp có sẵn mở qua API, link lạ là chữ thường; có thanh dung lượng', () => {
    const attachments: ActivityAttachment[] = [
      { id: 10, task_id: 1, kind: 'evidence', label: 'Ảnh hiện trường', link_url: 'https://drive.example/anh', size_bytes: null },
      { id: 11, task_id: 1, kind: 'deliverable', label: null, link_url: null, original_name: 'bao-cao.pdf', size_bytes: 2 * 1024 * 1024 },
      { id: 12, task_id: 1, kind: 'clarification', label: 'Link xấu', link_url: 'javascript:alert(1)', size_bytes: null },
      { id: 13, task_id: 99, kind: 'evidence', label: 'Của việc khác', link_url: 'https://x.vn', size_bytes: null },
    ];
    render(<ActivityPlanSection activityType="event" attachments={attachments} tasks={[task({})]} />);
    const row = within(screen.getByTestId('plan-task-1'));
    expect(row.getByRole('link', { name: 'Ảnh hiện trường' }).getAttribute('href')).toBe('https://drive.example/anh');
    expect(row.getByRole('link', { name: 'bao-cao.pdf' }).getAttribute('href')).toBe('/api/task-attachments/11/content');
    expect(row.queryByRole('link', { name: 'Link xấu' })).toBeNull();
    expect(row.getByText('Link xấu')).toBeDefined();
    expect(row.queryByText('Của việc khác')).toBeNull();
    expect(row.getByText('Đã dùng 2 MB / 50 MB')).toBeDefined();
  });

  it('attachmentHref', () => {
    expect(attachmentHref({ id: 1, link_url: 'http://a.vn' })).toBe('http://a.vn');
    expect(attachmentHref({ id: 2, link_url: null })).toBe('/api/task-attachments/2/content');
    expect(attachmentHref({ id: 3, link_url: 'ftp://a' })).toBeNull();
  });
});
```

- [ ] **Step 2: Chạy, xác nhận hỏng**

Run: `npx vitest run src/core/features/activities/ActivityPlanSection.test.tsx`
Expected: FAIL (module chưa có).

- [ ] **Step 3: Viết mã**

```tsx
// web/src/core/features/activities/ActivityPlanSection.tsx
import React from 'react';
import Lozenge from '@atlaskit/lozenge';
import { token } from '@atlaskit/tokens';
import type { ActivityAttachment, ActivityTaskRow } from '../../api';
import { Card } from './ActivityInfoSections';
import { groupTasksByStage } from './planStages';
import { getTaskPriorityLabel, getTaskStatusAppearance, getTaskStatusLabel } from '../tasks/taskLabels';
import { QuotaBar } from '../../../shared/components/QuotaBar';
import { formatVnDate } from '../../../shared/utils/date';
import { isHttpUrl } from '../../../shared/utils/url';

/** Link mở tài liệu: link http(s) → chính nó; tệp trên server (không có link) → API nội dung; link lạ → null. */
export function attachmentHref(a: Pick<ActivityAttachment, 'id' | 'link_url'>): string | null {
  if (a.link_url) return isHttpUrl(a.link_url) ? a.link_url : null;
  return `/api/task-attachments/${a.id}/content`;
}

const attachmentLabel = (a: ActivityAttachment): string => a.label || a.original_name || a.link_url || `Tài liệu #${a.id}`;

const TaskAttachments: React.FC<{ items: ActivityAttachment[] }> = ({ items }) => {
  if (items.length === 0) return null;
  const used = items.reduce((sum, a) => sum + (a.size_bytes ?? 0), 0);
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: token('color.text.subtle', '#5E6C84') }}>Tài liệu và link liên quan</div>
      <ul style={{ margin: '4px 0', paddingLeft: 18 }}>
        {items.map((a) => {
          const href = attachmentHref(a);
          return (
            <li key={a.id}>
              {href ? (
                <a href={href} target="_blank" rel="noopener noreferrer">
                  {attachmentLabel(a)}
                </a>
              ) : (
                <span>{attachmentLabel(a)}</span>
              )}
            </li>
          );
        })}
      </ul>
      <QuotaBar usedBytes={used} />
    </div>
  );
};

const TaskRow: React.FC<{ task: ActivityTaskRow; attachments: ActivityAttachment[] }> = ({ task, attachments }) => {
  const start = formatVnDate(task.start_date);
  const range = start ? `${start} – ${formatVnDate(task.deadline)}` : formatVnDate(task.deadline);
  return (
    <li data-testid={`plan-task-${task.id}`} style={{ padding: '10px 0', borderTop: `1px solid ${token('color.border', '#DFE1E6')}` }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <strong style={{ overflowWrap: 'anywhere' }}>{task.title}</strong>
        <Lozenge appearance={getTaskStatusAppearance(task.status)}>{getTaskStatusLabel(task.status)}</Lozenge>
        <span style={{ color: token('color.text.subtle', '#5E6C84') }}>Ưu tiên: {getTaskPriorityLabel(task.priority)}</span>
      </div>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', color: token('color.text.subtle', '#5E6C84'), marginTop: 4 }}>
        {task.team_name && <span>{task.team_name}</span>}
        <span>{task.primary_assignee_name || task.assignee_name || 'Chưa phân công'}</span>
        <span>{range}</span>
        {task.checklist_total ? <span>{`${task.checklist_done ?? 0}/${task.checklist_total} mục`}</span> : null}
      </div>
      {task.deliverable && <div style={{ marginTop: 4 }}>{task.deliverable}</div>}
      <TaskAttachments items={attachments} />
    </li>
  );
};

export const ActivityPlanSection: React.FC<{
  tasks: ActivityTaskRow[];
  attachments: ActivityAttachment[];
  activityType?: string | null;
}> = ({ tasks, attachments, activityType }) => {
  const groups = groupTasksByStage(tasks, activityType);
  return (
    <Card title="Kế hoạch công việc" testId="section-plan">
      {groups.map((group) => (
        <div key={group.key} style={{ marginBottom: 12 }}>
          <h3 style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 600 }}>{group.label}</h3>
          {group.tasks.length === 0 ? (
            <p style={{ margin: 0, color: token('color.text.subtle', '#5E6C84') }}>Chưa có công việc</p>
          ) : (
            <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
              {group.tasks.map((t) => (
                <TaskRow key={t.id} task={t} attachments={attachments.filter((a) => a.task_id === t.id)} />
              ))}
            </ul>
          )}
        </div>
      ))}
    </Card>
  );
};
```

Trong `ActivityDetailView.tsx`: thêm `import { ActivityPlanSection } from './ActivityPlanSection';` và thay `{/* PLAN */}` bằng

```tsx
          <ActivityPlanSection tasks={data.tasks} attachments={data.attachments} activityType={activity.type} />
```

- [ ] **Step 4: Chạy test xanh**

Run: `npx vitest run src/core/features/activities && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add web/src/core/features/activities
git commit -m "feat(web): kế hoạch công việc theo giai đoạn và tài liệu theo việc trên trang hoạt động

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Hook ghi dùng chung, thành phần form và dòng thời gian cập nhật (có gắn thẻ `@`)

**Files:**
- Create: `web/src/core/features/activities/useActivityMutation.ts`, `web/src/core/features/activities/formBits.tsx`, `web/src/core/features/activities/ActivityUpdatesSection.tsx`
- Modify: `web/src/core/features/activities/ActivityDetailView.tsx` (thay mốc `{/* UPDATES */}`)
- Test: `web/src/core/features/activities/ActivityUpdatesSection.test.tsx`; thêm một test vào `ActivityDetailView.test.tsx`

**Interfaces:**
- Consumes: `postActivityUpdate`, `ActivityUpdate`, `TaggablePerson` (Task 2); `invalidateActivity`, `forgetActivity` (Task 3); `Card` (Task 6); `PeoplePicker`, `LinkField`, `useToast`, `apiErrorMessage`.
- Produces:
  - `useActivityMutation<V, R>(activityId, fn, { message, removedMessage?, removed?, onDone? })` → mutation của React Query. Thành công: nếu `removed(result, vars)` thì chuyển `/activities`, bỏ cache hoạt động (`forgetActivity`), toast; ngược lại làm mới cache (`invalidateActivity`), toast `message`, gọi `onDone`. Lỗi: `toast.error(apiErrorMessage(err))`.
  - `formBits.tsx`: `ErrorText`, `FieldRow({label, htmlFor, children})`, `NativeSelect({id, value, onChange, options})`, `DateInput({id, value, onChange})`.
  - `ActivityUpdatesSection({ activityId, updates, taggablePeople })`, `data-testid="section-updates"`.

Quyết định: bốn loại cập nhật như UI cũ (Bình luận, Tiến độ, Vướng mắc, Minh chứng). Ô gắn thẻ `@` chỉ hiện ở "Bình luận" và chỉ chọn từ `taggablePeople` (server ngoài ra còn chặn tự gắn thẻ mình và người không xem được hoạt động). Ghi chú duyệt (`review_note`) do server tự tạo khi duyệt/từ chối; hiện ở dòng thời gian nhưng không đăng tay được.

- [ ] **Step 1: Viết test hỏng**

```tsx
// web/src/core/features/activities/ActivityUpdatesSection.test.tsx
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { ActivityUpdatesSection } from './ActivityUpdatesSection';
import { renderInApp } from './testUtils';
import * as api from '../../api';
import type { ActivityUpdate, TaggablePerson } from '../../api';

vi.mock('../../api', async () => {
  const actual = await vi.importActual<typeof import('../../api')>('../../api');
  return { ...actual, postActivityUpdate: vi.fn() };
});

const people: TaggablePerson[] = [
  { id: 7, name: 'Phạm Hùng', role: 'member' },
  { id: 8, name: 'Vũ Lan', role: 'leader' },
];

const updates: ActivityUpdate[] = [
  {
    id: 1,
    kind: 'comment',
    body: 'Đã chốt địa điểm',
    created_at: '2026-10-05T03:00:00.000Z',
    user_name: 'Trần Người Tạo',
    attachment_url: 'https://drive.example/dia-diem',
    tagged_users: [{ id: 7, name: 'Phạm Hùng' }],
  },
  { id: 2, kind: 'review_note', body: 'Duyệt đề án', created_at: '2026-10-04T03:00:00.000Z', user_name: 'Quản trị A', attachment_url: 'javascript:alert(1)', tagged_users: [] },
];

const show = (list: ActivityUpdate[] = []) =>
  renderInApp(<ActivityUpdatesSection activityId={5} updates={list} taggablePeople={people} />, { path: '/activity/5' });

const type = (label: string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });

describe('ActivityUpdatesSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.postActivityUpdate).mockResolvedValue({ ok: true, id: 9 });
  });
  afterEach(cleanup);

  it('dòng thời gian: loại, người đăng, thẻ @, link http; link lạ không thành thẻ a; rỗng thì có chữ', () => {
    show(updates);
    const section = within(screen.getByTestId('section-updates'));
    expect(section.getByText('Đã chốt địa điểm')).toBeDefined();
    expect(section.getByText('Bình luận')).toBeDefined();
    expect(section.getByText('Ghi chú duyệt')).toBeDefined();
    expect(section.getByText('@Phạm Hùng')).toBeDefined();
    expect(section.getAllByRole('link', { name: 'Mở link đính kèm' })).toHaveLength(1);
    expect(section.getByRole('link', { name: 'Mở link đính kèm' }).getAttribute('href')).toBe('https://drive.example/dia-diem');
    cleanup();
    show([]);
    expect(screen.getByText('Chưa có cập nhật nào.')).toBeDefined();
  });

  it('đăng bình luận có gắn thẻ: đúng endpoint và body, xoá form, toast, làm mới cache', async () => {
    const { qc } = show();
    const spy = vi.spyOn(qc, 'invalidateQueries');
    type('Nội dung cập nhật', 'Ổn rồi @Hùng');
    fireEvent.change(screen.getByLabelText('Gắn thẻ @'), { target: { value: 'hung' } });
    fireEvent.click(await screen.findByRole('option', { name: 'Phạm Hùng' }));
    fireEvent.click(screen.getByRole('button', { name: 'Đăng cập nhật' }));

    await waitFor(() => expect(api.postActivityUpdate).toHaveBeenCalledWith(5, { kind: 'comment', body: 'Ổn rồi @Hùng', tagged_user_ids: [7] }));
    expect(await screen.findByText('Đã đăng cập nhật.')).toBeDefined();
    expect((screen.getByLabelText('Nội dung cập nhật') as HTMLTextAreaElement).value).toBe('');
    expect(spy).toHaveBeenCalledWith({ queryKey: ['core-activity', 5] });
  });

  it('chọn loại khác thì ẩn ô gắn thẻ và gửi kèm link, không gửi tagged_user_ids', async () => {
    show();
    fireEvent.change(screen.getByLabelText('Loại cập nhật'), { target: { value: 'evidence' } });
    expect(screen.queryByLabelText('Gắn thẻ @')).toBeNull();
    type('Nội dung cập nhật', 'Ảnh hiện trường');
    type('Link đính kèm (không bắt buộc)', 'https://drive.example/anh');
    fireEvent.click(screen.getByRole('button', { name: 'Đăng cập nhật' }));
    await waitFor(() =>
      expect(api.postActivityUpdate).toHaveBeenCalledWith(5, { kind: 'evidence', body: 'Ảnh hiện trường', attachment_url: 'https://drive.example/anh' })
    );
  });

  it('nội dung rỗng hoặc link không hợp lệ thì chặn, không gọi API', () => {
    show();
    fireEvent.click(screen.getByRole('button', { name: 'Đăng cập nhật' }));
    expect(screen.getByText('Hãy nhập nội dung cập nhật.')).toBeDefined();
    type('Nội dung cập nhật', 'Có nội dung');
    type('Link đính kèm (không bắt buộc)', 'ftp://may-chu/tep');
    fireEvent.click(screen.getByRole('button', { name: 'Đăng cập nhật' }));
    expect(screen.getByText('Hãy sửa link đính kèm trước khi đăng.')).toBeDefined();
    expect(api.postActivityUpdate).not.toHaveBeenCalled();
  });

  it('lỗi tiếng Anh của server hiện bằng tiếng Việt và giữ nguyên nội dung đã gõ', async () => {
    vi.mocked(api.postActivityUpdate).mockRejectedValue({ response: { status: 400, data: { error: 'You cannot tag yourself.' } } });
    show();
    type('Nội dung cập nhật', 'Gắn nhầm chính mình');
    fireEvent.click(screen.getByRole('button', { name: 'Đăng cập nhật' }));
    expect(await screen.findByText('Bạn không thể gắn thẻ chính mình.')).toBeDefined();
    expect((screen.getByLabelText('Nội dung cập nhật') as HTMLTextAreaElement).value).toBe('Gắn nhầm chính mình');
  });
});
```

Thêm vào `ActivityDetailView.test.tsx` (trong `describe`):

```tsx
  it('hiện dòng thời gian cập nhật và form đăng cập nhật', async () => {
    vi.mocked(api.fetchActivityDetail).mockResolvedValue(
      makeDetail({
        updates: [{ id: 1, kind: 'progress', body: 'Đã in xong tờ rơi', created_at: '2026-10-05T03:00:00.000Z', user_name: 'Trần Người Tạo', tagged_users: [] }],
      })
    );
    show();
    expect(await screen.findByText('Đã in xong tờ rơi')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Đăng cập nhật' })).toBeDefined();
  });
```

- [ ] **Step 2: Chạy, xác nhận hỏng**

Run: `npx vitest run src/core/features/activities/ActivityUpdatesSection.test.tsx`
Expected: FAIL (module chưa có).

- [ ] **Step 3: Viết mã**

```ts
// web/src/core/features/activities/useActivityMutation.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { apiErrorMessage } from '../../api';
import { useToast } from '../../../shared/components/Toast';
import { forgetActivity, invalidateActivity } from './activityKeys';

export interface ActivityMutationOptions<V, R> {
  message: string | ((result: R, vars: V) => string);
  /** Thông báo khi hoạt động bị xoá hẳn (mặc định dùng `message`). */
  removedMessage?: string;
  /** Trả true khi server đã xoá hoạt động (từ chối, huỷ, xoá): chuyển về danh sách thay vì làm mới. */
  removed?: (result: R, vars: V) => boolean;
  onDone?: (result: R, vars: V) => void;
}

/** Mọi thao tác ghi của trang hoạt động: toast tiếng Việt, làm mới cache, xử lý hoạt động bị xoá. */
export function useActivityMutation<V = void, R = unknown>(
  activityId: number,
  fn: (vars: V) => Promise<R>,
  options: ActivityMutationOptions<V, R>
) {
  const qc = useQueryClient();
  const toast = useToast();
  const navigate = useNavigate();
  return useMutation<R, unknown, V>({
    mutationFn: fn,
    onSuccess: (result, vars) => {
      const text = typeof options.message === 'function' ? options.message(result, vars) : options.message;
      if (options.removed?.(result, vars)) {
        navigate('/activities');
        forgetActivity(qc, activityId);
        toast.success(options.removedMessage ?? text);
        return;
      }
      void invalidateActivity(qc, activityId);
      toast.success(text);
      options.onDone?.(result, vars);
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });
}
```

```tsx
// web/src/core/features/activities/formBits.tsx
import React from 'react';
import { token } from '@atlaskit/tokens';

export const ErrorText: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p role="alert" style={{ margin: '4px 0 0', color: token('color.text.danger', '#AE2E24') }}>
    {children}
  </p>
);

export const FieldRow: React.FC<{ label: string; htmlFor: string; children: React.ReactNode }> = ({ label, htmlFor, children }) => (
  <div style={{ marginBottom: 12 }}>
    <label htmlFor={htmlFor} style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>
      {label}
    </label>
    {children}
  </div>
);

const controlStyle: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '8px',
  font: 'inherit',
  borderRadius: 3,
  border: `1px solid ${token('color.border.input', '#8590A2')}`,
  background: token('color.background.input', '#FFFFFF'),
  color: token('color.text', '#172B4D'),
};

export interface SelectOption {
  value: string;
  label: string;
}

export const NativeSelect: React.FC<{ id: string; value: string; onChange: (value: string) => void; options: SelectOption[] }> = ({
  id,
  value,
  onChange,
  options,
}) => (
  <select id={id} value={value} onChange={(e) => onChange(e.target.value)} style={controlStyle}>
    {options.map((o) => (
      <option key={o.value} value={o.value}>
        {o.label}
      </option>
    ))}
  </select>
);

export const DateInput: React.FC<{ id: string; value: string; onChange: (value: string) => void }> = ({ id, value, onChange }) => (
  <input id={id} type="date" value={value} onChange={(e) => onChange(e.target.value)} style={controlStyle} />
);
```

```tsx
// web/src/core/features/activities/ActivityUpdatesSection.tsx
import React, { useId, useState } from 'react';
import Button from '@atlaskit/button/new';
import TextArea from '@atlaskit/textarea';
import Lozenge from '@atlaskit/lozenge';
import { token } from '@atlaskit/tokens';
import { postActivityUpdate, type ActivityUpdate, type ActivityUpdateKind, type PostUpdatePayload, type TaggablePerson } from '../../api';
import { Card } from './ActivityInfoSections';
import { ErrorText, FieldRow, NativeSelect } from './formBits';
import { useActivityMutation } from './useActivityMutation';
import { PeoplePicker } from '../../../shared/components/PeoplePicker';
import { LinkField } from '../../../shared/components/LinkField';
import { formatVnDate } from '../../../shared/utils/date';
import { isHttpUrl } from '../../../shared/utils/url';

const KIND_OPTIONS: Array<{ value: ActivityUpdateKind; label: string }> = [
  { value: 'comment', label: 'Bình luận' },
  { value: 'progress', label: 'Tiến độ' },
  { value: 'issue', label: 'Vướng mắc' },
  { value: 'evidence', label: 'Minh chứng' },
];

const KIND_LABELS: Record<string, string> = {
  ...Object.fromEntries(KIND_OPTIONS.map((o) => [o.value, o.label])),
  review_note: 'Ghi chú duyệt',
};

const Timeline: React.FC<{ updates: ActivityUpdate[] }> = ({ updates }) => {
  if (updates.length === 0) return <p style={{ margin: '0 0 12px' }}>Chưa có cập nhật nào.</p>;
  return (
    <ul style={{ margin: '0 0 16px', padding: 0, listStyle: 'none' }}>
      {updates.map((u) => (
        <li key={u.id} style={{ padding: '8px 0', borderTop: `1px solid ${token('color.border', '#DFE1E6')}` }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <strong>{u.user_name}</strong>
            <Lozenge appearance={u.kind === 'issue' ? 'removed' : u.kind === 'evidence' ? 'success' : 'default'}>{KIND_LABELS[u.kind] ?? u.kind}</Lozenge>
            <span style={{ color: token('color.text.subtle', '#5E6C84') }}>{formatVnDate(u.created_at)}</span>
          </div>
          <div style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', marginTop: 4 }}>{u.body}</div>
          {u.tagged_users.length > 0 && (
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
              {u.tagged_users.map((t) => (
                <span key={t.id} style={{ padding: '0 6px', borderRadius: 10, background: token('color.background.accent.blue.subtler', '#CCE0FF') }}>
                  {`@${t.name}`}
                </span>
              ))}
            </div>
          )}
          {u.attachment_url && isHttpUrl(u.attachment_url) && (
            <a href={u.attachment_url} target="_blank" rel="noopener noreferrer">
              Mở link đính kèm
            </a>
          )}
        </li>
      ))}
    </ul>
  );
};

export const ActivityUpdatesSection: React.FC<{ activityId: number; updates: ActivityUpdate[]; taggablePeople: TaggablePerson[] }> = ({
  activityId,
  updates,
  taggablePeople,
}) => {
  const kindId = useId();
  const bodyId = useId();
  const [kind, setKind] = useState<ActivityUpdateKind>('comment');
  const [body, setBody] = useState('');
  const [link, setLink] = useState('');
  const [tagged, setTagged] = useState<number[]>([]);
  const [error, setError] = useState('');

  const post = useActivityMutation(activityId, (payload: PostUpdatePayload) => postActivityUpdate(activityId, payload), {
    message: 'Đã đăng cập nhật.',
    onDone: () => {
      setBody('');
      setLink('');
      setTagged([]);
      setError('');
    },
  });

  const submit = () => {
    if (!body.trim()) {
      setError('Hãy nhập nội dung cập nhật.');
      return;
    }
    if (link.trim() && !isHttpUrl(link)) {
      setError('Hãy sửa link đính kèm trước khi đăng.');
      return;
    }
    setError('');
    post.mutate({
      kind,
      body: body.trim(),
      ...(link.trim() ? { attachment_url: link.trim() } : {}),
      ...(kind === 'comment' && tagged.length > 0 ? { tagged_user_ids: tagged } : {}),
    });
  };

  return (
    <Card title="Cập nhật" testId="section-updates">
      <Timeline updates={updates} />
      <FieldRow label="Loại cập nhật" htmlFor={kindId}>
        <NativeSelect
          id={kindId}
          value={kind}
          options={KIND_OPTIONS}
          onChange={(v) => {
            setKind(v as ActivityUpdateKind);
            if (v !== 'comment') setTagged([]);
          }}
        />
      </FieldRow>
      <FieldRow label="Nội dung cập nhật" htmlFor={bodyId}>
        <TextArea id={bodyId} minimumRows={3} value={body} onChange={(e) => setBody((e.target as HTMLTextAreaElement).value)} />
      </FieldRow>
      <LinkField label="Link đính kèm (không bắt buộc)" value={link} onChange={setLink} />
      {kind === 'comment' && (
        <div style={{ marginTop: 12 }}>
          <PeoplePicker label="Gắn thẻ @" people={taggablePeople} value={tagged} onChange={setTagged} />
        </div>
      )}
      {error && <ErrorText>{error}</ErrorText>}
      <div style={{ marginTop: 12 }}>
        <Button appearance="primary" isLoading={post.isPending} onClick={submit}>
          Đăng cập nhật
        </Button>
      </div>
    </Card>
  );
};
```

Trong `ActivityDetailView.tsx`: thêm `import { ActivityUpdatesSection } from './ActivityUpdatesSection';` và thay `{/* UPDATES */}` bằng

```tsx
          <ActivityUpdatesSection activityId={activity.id} updates={data.updates} taggablePeople={data.taggablePeople} />
```

- [ ] **Step 4: Chạy test xanh**

Run: `npx vitest run src/core/features/activities && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add web/src/core/features/activities
git commit -m "feat(web): dòng thời gian và form đăng cập nhật có gắn thẻ @, hook ghi dùng chung

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Sửa hoạt động (admin: mọi trường; người quản lý: tập con)

**Files:**
- Create: `web/src/core/features/activities/editPayload.ts`, `web/src/core/features/activities/EditActivityModal.tsx`
- Test: `web/src/core/features/activities/editPayload.test.ts`, `web/src/core/features/activities/EditActivityModal.test.tsx`

**Interfaces:**
- Consumes: `ActivityDetail`, `UpdateActivityPayload`, `updateActivity`, `fetchTeams`, `fetchMembers`; `useActivityMutation`, `formBits` (Task 8); `ConfirmDialog`, `LinkField`, `LINK_ERROR_MESSAGE`, `isHttpUrl`, `toVnDateKey`.
- Produces:
  - `EditForm`, `initialEditForm(detail)`, `validateEditForm(form, isAdmin): string | null`, `buildUpdatePayload(form, initial, isAdmin): UpdateActivityPayload`, `effectiveTeamIds(form)`, `EDIT_TYPE_OPTIONS`, `EDIT_PRIORITY_OPTIONS`, `EDIT_STATUS_OPTIONS`.
  - `EditActivityModal({ isOpen, onClose, detail, isAdmin })`.

Quyết định: (1) `isAdmin` = `isExec`; chỉ admin thấy và gửi `status`, `event_lead_id`, `team_id`, `team_ids`, và chỉ khi giá trị **đổi** so với lúc mở (tránh 403 và tránh ghi đè khi hai người cùng sửa). (2) Luôn gửi `is_public` kèm `public_image_url` và `proposal_document_url` (xem Global Constraints). (3) Chọn trạng thái "Đã hủy" phải xác nhận vì server xoá hẳn hoạt động; sau đó về danh sách. (4) "Yêu cầu bởi" chỉ hiện với hoạt động chỉ đạo (`assigned`), nhưng vẫn gửi giá trị đang có.

- [ ] **Step 1: Viết test hỏng**

```ts
// web/src/core/features/activities/editPayload.test.ts
import { describe, it, expect } from 'vitest';
import { buildUpdatePayload, effectiveTeamIds, initialEditForm, validateEditForm } from './editPayload';
import { makeDetail } from './testUtils';

const detail = makeDetail({
  activity: { status: 'approved', is_public: 1, public_image_url: 'https://img.example/a.jpg', event_lead_id: 7 },
});

describe('initialEditForm', () => {
  it('lấy giá trị từ hoạt động và danh sách Tổ', () => {
    expect(initialEditForm(detail)).toMatchObject({
      title: 'Ngày hội Kỹ thuật',
      type: 'event',
      priority: 'high',
      startDate: '2026-11-01',
      deadline: '2026-11-30',
      location: 'Hội trường A',
      requestedBy: '',
      proposalUrl: 'https://drive.example/de-an',
      isPublic: true,
      publicImageUrl: 'https://img.example/a.jpg',
      status: 'approved',
      eventLeadId: '7',
      leadTeamId: '2',
      teamIds: [2, 3],
    });
  });
});

describe('validateEditForm', () => {
  const base = initialEditForm(detail);
  it('hợp lệ thì trả null', () => expect(validateEditForm(base, true)).toBeNull());
  it('thiếu tiêu đề, mô tả hoặc hạn chót', () => {
    const msg = 'Vui lòng nhập tiêu đề, mô tả và hạn chót.';
    expect(validateEditForm({ ...base, title: '  ' }, false)).toBe(msg);
    expect(validateEditForm({ ...base, description: '' }, false)).toBe(msg);
    expect(validateEditForm({ ...base, deadline: '' }, false)).toBe(msg);
  });
  it('ngày bắt đầu sau hạn chót', () => {
    expect(validateEditForm({ ...base, startDate: '2026-12-15' }, false)).toBe('Ngày bắt đầu phải trước hoặc bằng hạn chót.');
  });
  it('link không phải http(s)', () => {
    expect(validateEditForm({ ...base, proposalUrl: 'ftp://x' }, false)).toBe('Liên kết phải bắt đầu bằng http:// hoặc https://.');
    expect(validateEditForm({ ...base, publicImageUrl: 'javascript:alert(1)' }, false)).toBe('Liên kết phải bắt đầu bằng http:// hoặc https://.');
  });
  it('admin phải có Tổ chủ trì, người quản lý thì không bị kiểm', () => {
    expect(validateEditForm({ ...base, leadTeamId: '' }, true)).toBe('Vui lòng chọn Tổ chủ trì.');
    expect(validateEditForm({ ...base, leadTeamId: '' }, false)).toBeNull();
  });
});

describe('buildUpdatePayload', () => {
  const initial = initialEditForm(detail);
  const common = {
    title: 'Ngày hội Kỹ thuật',
    description: 'Ngày hội giới thiệu các câu lạc bộ kỹ thuật.',
    type: 'event',
    priority: 'high',
    start_date: '2026-11-01',
    deadline: '2026-11-30',
    location: 'Hội trường A',
    requested_by: '',
    result_summary: '',
    proposal_document_url: 'https://drive.example/de-an',
    is_public: true,
    public_image_url: 'https://img.example/a.jpg',
  };

  it('không phải admin: chỉ tập con, không bao giờ có status/event_lead_id/team_id/team_ids', () => {
    const form = { ...initial, title: '  Tên mới  ', status: 'cancelled', eventLeadId: '', leadTeamId: '3', teamIds: [3] };
    const payload = buildUpdatePayload(form, initial, false);
    expect(payload).toEqual({ ...common, title: 'Tên mới' });
    for (const key of ['status', 'event_lead_id', 'team_id', 'team_ids']) expect(payload).not.toHaveProperty(key);
  });

  it('admin không đổi gì thì cũng không gửi trường admin', () => {
    expect(buildUpdatePayload(initial, initial, true)).toEqual(common);
  });

  it('admin đổi trạng thái, Trưởng BTC và Tổ thì gửi đúng các trường đó', () => {
    const form = { ...initial, status: 'active', eventLeadId: '', leadTeamId: '3', teamIds: [2, 3] };
    expect(buildUpdatePayload(form, initial, true)).toEqual({ ...common, status: 'active', event_lead_id: null, team_id: 3, team_ids: [3, 2] });
  });

  it('luôn gửi ảnh công khai và link đề án (rỗng để xoá) cùng is_public', () => {
    const payload = buildUpdatePayload({ ...initial, isPublic: false, publicImageUrl: '', proposalUrl: '' }, initial, false);
    expect(payload).toMatchObject({ is_public: false, public_image_url: '', proposal_document_url: '' });
  });

  it('effectiveTeamIds luôn gồm Tổ chủ trì, không trùng', () => {
    expect(effectiveTeamIds({ ...initial, leadTeamId: '3', teamIds: [2] })).toEqual([3, 2]);
    expect(effectiveTeamIds({ ...initial, leadTeamId: '2', teamIds: [2, 3] })).toEqual([2, 3]);
  });
});
```

```tsx
// web/src/core/features/activities/EditActivityModal.test.tsx
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { EditActivityModal } from './EditActivityModal';
import { makeDetail, renderInApp } from './testUtils';
import * as api from '../../api';

vi.mock('../../api', async () => {
  const actual = await vi.importActual<typeof import('../../api')>('../../api');
  return { ...actual, updateActivity: vi.fn(), fetchTeams: vi.fn(), fetchMembers: vi.fn() };
});

const teams: api.TeamItem[] = [
  { id: 2, name: 'Tuyên huấn', is_active: 1 },
  { id: 3, name: 'Truyền thông', is_active: 1 },
  { id: 4, name: 'Hậu cần', is_active: 1 },
];
const members: api.MemberItem[] = [
  { id: 7, name: 'Lê Trưởng BTC', email: 'le@x.vn', role: 'member', is_active: 1 },
  { id: 8, name: 'Nguyễn Khác', email: 'k@x.vn', role: 'member', is_active: 1 },
];

const detail = makeDetail({ canManage: true });

const show = (isAdmin: boolean, onClose = vi.fn()) => {
  const utils = renderInApp(<EditActivityModal isOpen onClose={onClose} detail={detail} isAdmin={isAdmin} />, { role: isAdmin ? 'admin' : 'leader' });
  return { ...utils, onClose };
};
const lastPayload = () => vi.mocked(api.updateActivity).mock.calls[0][1];

describe('EditActivityModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.updateActivity).mockResolvedValue({ ok: true });
    vi.mocked(api.fetchTeams).mockResolvedValue(teams);
    vi.mocked(api.fetchMembers).mockResolvedValue(members);
  });
  afterEach(cleanup);

  it('người quản lý: sửa tiêu đề, gửi tập con (không có trường admin), toast, đóng, làm mới cache', async () => {
    const { qc, onClose } = show(false);
    const spy = vi.spyOn(qc, 'invalidateQueries');
    expect(screen.queryByLabelText('Trạng thái')).toBeNull();
    expect(screen.queryByLabelText('Tổ chủ trì')).toBeNull();
    expect((screen.getByLabelText('Tiêu đề') as HTMLInputElement).value).toBe('Ngày hội Kỹ thuật');

    fireEvent.change(screen.getByLabelText('Tiêu đề'), { target: { value: 'Ngày hội Kỹ thuật 2026' } });
    fireEvent.change(screen.getByLabelText('Địa điểm'), { target: { value: 'Sân A' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));

    await waitFor(() => expect(api.updateActivity).toHaveBeenCalledTimes(1));
    expect(api.updateActivity).toHaveBeenCalledWith(5, expect.objectContaining({ title: 'Ngày hội Kỹ thuật 2026', location: 'Sân A', is_public: false, public_image_url: '', proposal_document_url: 'https://drive.example/de-an' }));
    for (const key of ['status', 'event_lead_id', 'team_id', 'team_ids']) expect(lastPayload()).not.toHaveProperty(key);
    expect(await screen.findByText('Đã lưu thay đổi.')).toBeDefined();
    expect(onClose).toHaveBeenCalled();
    expect(spy).toHaveBeenCalledWith({ queryKey: ['core-activity', 5] });
  });

  it('thiếu tiêu đề thì báo lỗi và không gửi', () => {
    show(false);
    fireEvent.change(screen.getByLabelText('Tiêu đề'), { target: { value: '   ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));
    expect(screen.getByText('Vui lòng nhập tiêu đề, mô tả và hạn chót.')).toBeDefined();
    expect(api.updateActivity).not.toHaveBeenCalled();
  });

  it('link đề án sai thì chặn gửi', () => {
    show(false);
    fireEvent.change(screen.getByLabelText(/Link đề án/), { target: { value: 'ftp://x' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));
    expect(api.updateActivity).not.toHaveBeenCalled();
    expect(screen.getAllByText('Liên kết phải bắt đầu bằng http:// hoặc https://.').length).toBeGreaterThan(0);
  });

  it('lỗi 403 của server hiện tiếng Việt, modal vẫn mở', async () => {
    vi.mocked(api.updateActivity).mockRejectedValue({ response: { status: 403, data: { error: 'Only administrators can change involved teams.' } } });
    const { onClose } = show(false);
    fireEvent.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));
    expect(await screen.findByText('Chỉ quản trị viên được đổi các Tổ tham gia.')).toBeDefined();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('admin: đổi trạng thái thì chỉ gửi status, không gửi Tổ hay Trưởng BTC khi không đổi', async () => {
    show(true);
    await screen.findByRole('option', { name: 'Hậu cần' });
    fireEvent.change(screen.getByLabelText('Trạng thái'), { target: { value: 'approved' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));
    await waitFor(() => expect(api.updateActivity).toHaveBeenCalled());
    expect(lastPayload()).toMatchObject({ status: 'approved' });
    for (const key of ['event_lead_id', 'team_id', 'team_ids']) expect(lastPayload()).not.toHaveProperty(key);
  });

  it('admin: đổi Tổ chủ trì và Trưởng BTC; Tổ chủ trì tự đánh dấu và khoá trong danh sách Tổ', async () => {
    show(true);
    await screen.findByRole('option', { name: 'Hậu cần' });
    fireEvent.change(screen.getByLabelText('Tổ chủ trì'), { target: { value: '4' } });
    const lead = screen.getByRole('checkbox', { name: 'Hậu cần' }) as HTMLInputElement;
    expect(lead.checked).toBe(true);
    expect(lead.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText('Trưởng Ban Tổ chức'), { target: { value: '8' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));
    await waitFor(() => expect(api.updateActivity).toHaveBeenCalled());
    expect(lastPayload()).toMatchObject({ team_id: 4, event_lead_id: 8 });
    expect((lastPayload().team_ids ?? []).slice().sort()).toEqual([2, 3, 4]);
  });

  it('admin: chuyển sang Đã hủy phải xác nhận, rồi về danh sách khi server xoá hẳn', async () => {
    vi.mocked(api.updateActivity).mockResolvedValue({ ok: true, deleted: true });
    show(true);
    await screen.findByRole('option', { name: 'Hậu cần' });
    fireEvent.change(screen.getByLabelText('Trạng thái'), { target: { value: 'cancelled' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));
    expect(api.updateActivity).not.toHaveBeenCalled();
    fireEvent.click(await screen.findByRole('button', { name: 'Huỷ và xoá hoạt động' }));

    await waitFor(() => expect(api.updateActivity).toHaveBeenCalledWith(5, expect.objectContaining({ status: 'cancelled' })));
    await waitFor(() => expect(screen.getByTestId('path').textContent).toBe('/activities'));
  });
});
```

- [ ] **Step 2: Chạy, xác nhận hỏng**

Run: `npx vitest run src/core/features/activities/editPayload.test.ts src/core/features/activities/EditActivityModal.test.tsx`
Expected: FAIL (module chưa có).

- [ ] **Step 3: Viết mã**

```ts
// web/src/core/features/activities/editPayload.ts
import type { ActivityDetail, UpdateActivityPayload } from '../../api';
import { LINK_ERROR_MESSAGE } from '../../../shared/components/LinkField';
import { isHttpUrl } from '../../../shared/utils/url';
import { toVnDateKey } from '../../../shared/utils/date';

export interface EditForm {
  title: string;
  description: string;
  type: string;
  priority: string;
  startDate: string;
  deadline: string;
  location: string;
  requestedBy: string;
  resultSummary: string;
  proposalUrl: string;
  isPublic: boolean;
  publicImageUrl: string;
  status: string;
  /** '' = không có. */
  eventLeadId: string;
  leadTeamId: string;
  teamIds: number[];
}

export const EDIT_TYPE_OPTIONS = [
  { value: 'event', label: 'Sự kiện đơn vị' },
  { value: 'assigned', label: 'Chỉ đạo cấp trên' },
];

export const EDIT_PRIORITY_OPTIONS = [
  { value: 'low', label: 'Thấp' },
  { value: 'medium', label: 'Trung bình' },
  { value: 'high', label: 'Cao' },
  { value: 'urgent', label: 'Khẩn cấp' },
];

export const EDIT_STATUS_OPTIONS = [
  { value: 'proposed', label: 'Đề xuất' },
  { value: 'changes_requested', label: 'Cần chỉnh sửa' },
  { value: 'approved', label: 'Đã duyệt' },
  { value: 'active', label: 'Đang diễn ra' },
  { value: 'completed', label: 'Hoàn thành' },
  { value: 'cancelled', label: 'Đã hủy (xoá hoạt động)' },
];

export function initialEditForm(detail: ActivityDetail): EditForm {
  const a = detail.activity;
  const primary = detail.activityTeams.find((t) => t.role === 'primary');
  const lead = primary?.team_id ?? a.team_id ?? 0;
  return {
    title: a.title ?? '',
    description: a.description ?? '',
    type: a.type ?? 'event',
    priority: a.priority ?? 'medium',
    startDate: toVnDateKey(a.start_date),
    deadline: toVnDateKey(a.deadline),
    location: a.location ?? '',
    requestedBy: a.requested_by ?? '',
    resultSummary: a.result_summary ?? '',
    proposalUrl: a.proposal_document_url ?? '',
    isPublic: Boolean(a.is_public),
    publicImageUrl: a.public_image_url ?? '',
    status: a.status,
    eventLeadId: a.event_lead_id ? String(a.event_lead_id) : '',
    leadTeamId: lead ? String(lead) : '',
    teamIds: detail.activityTeams.map((t) => t.team_id),
  };
}

/** Tổ chủ trì luôn nằm trong các Tổ tham gia (server yêu cầu `team_ids` gồm `team_id`). */
export function effectiveTeamIds(form: EditForm): number[] {
  const lead = Number(form.leadTeamId);
  return Array.from(new Set([...(lead ? [lead] : []), ...form.teamIds]));
}

export function validateEditForm(form: EditForm, isAdmin: boolean): string | null {
  if (!form.title.trim() || !form.description.trim() || !form.deadline) return 'Vui lòng nhập tiêu đề, mô tả và hạn chót.';
  if (form.startDate && form.startDate > form.deadline) return 'Ngày bắt đầu phải trước hoặc bằng hạn chót.';
  const proposal = form.proposalUrl.trim();
  const image = form.publicImageUrl.trim();
  if ((proposal && !isHttpUrl(proposal)) || (image && !isHttpUrl(image))) return LINK_ERROR_MESSAGE;
  if (isAdmin && !form.leadTeamId) return 'Vui lòng chọn Tổ chủ trì.';
  return null;
}

const sameSet = (a: number[], b: number[]) => a.length === b.length && a.every((x) => b.includes(x));

/** Người không phải admin KHÔNG BAO GIỜ gửi status/event_lead_id/team_id/team_ids (server trả 403 hoặc bỏ qua). */
export function buildUpdatePayload(form: EditForm, initial: EditForm, isAdmin: boolean): UpdateActivityPayload {
  const payload: UpdateActivityPayload = {
    title: form.title.trim(),
    description: form.description.trim(),
    type: form.type,
    priority: form.priority,
    start_date: form.startDate,
    deadline: form.deadline,
    location: form.location.trim(),
    requested_by: form.requestedBy.trim(),
    result_summary: form.resultSummary.trim(),
    // Ba trường này luôn có mặt: server xoá ảnh nếu thiếu public_image_url khi gửi is_public, và '' xoá link đề án.
    proposal_document_url: form.proposalUrl.trim(),
    is_public: form.isPublic,
    public_image_url: form.publicImageUrl.trim(),
  };
  if (!isAdmin) return payload;
  if (form.status !== initial.status) payload.status = form.status;
  if (form.eventLeadId !== initial.eventLeadId) payload.event_lead_id = form.eventLeadId ? Number(form.eventLeadId) : null;
  const teams = effectiveTeamIds(form);
  if (form.leadTeamId !== initial.leadTeamId || !sameSet(teams, effectiveTeamIds(initial))) {
    payload.team_id = Number(form.leadTeamId);
    payload.team_ids = teams;
  }
  return payload;
}
```

```tsx
// web/src/core/features/activities/EditActivityModal.tsx
import React, { useEffect, useMemo, useState } from 'react';
import Modal, { ModalBody, ModalFooter, ModalHeader, ModalTitle, ModalTransition } from '@atlaskit/modal-dialog';
import Button from '@atlaskit/button/new';
import Textfield from '@atlaskit/textfield';
import TextArea from '@atlaskit/textarea';
import { useQuery } from '@tanstack/react-query';
import { fetchMembers, fetchTeams, updateActivity, type ActivityDetail, type UpdateActivityPayload } from '../../api';
import { ConfirmDialog } from '../../../shared/components/ConfirmDialog';
import { LinkField } from '../../../shared/components/LinkField';
import { DateInput, ErrorText, FieldRow, NativeSelect } from './formBits';
import {
  EDIT_PRIORITY_OPTIONS,
  EDIT_STATUS_OPTIONS,
  EDIT_TYPE_OPTIONS,
  buildUpdatePayload,
  effectiveTeamIds,
  initialEditForm,
  validateEditForm,
  type EditForm,
} from './editPayload';
import { useActivityMutation } from './useActivityMutation';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  detail: ActivityDetail;
  /** isExec: được sửa trạng thái, Trưởng BTC, Tổ. */
  isAdmin: boolean;
}

export const EditActivityModal: React.FC<Props> = ({ isOpen, onClose, detail, isAdmin }) => {
  const initial = useMemo(() => initialEditForm(detail), [detail]);
  const [form, setForm] = useState<EditForm>(initial);
  const [error, setError] = useState('');
  const [pendingCancel, setPendingCancel] = useState<UpdateActivityPayload | null>(null);

  // Chỉ nạp lại form khi mở modal; dữ liệu tải lại nền không được ghi đè phần đang sửa.
  useEffect(() => {
    if (isOpen) {
      setForm(initial);
      setError('');
      setPendingCancel(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const teamsQuery = useQuery({ queryKey: ['core-teams'], queryFn: fetchTeams, enabled: isOpen && isAdmin });
  const membersQuery = useQuery({ queryKey: ['core-members'], queryFn: fetchMembers, enabled: isOpen && isAdmin });

  const teamOptions = (
    teamsQuery.data?.filter((t) => t.is_active !== 0 && t.is_active !== false).map((t) => ({ id: t.id, name: t.name })) ??
    detail.activityTeams.map((t) => ({ id: t.team_id, name: t.name }))
  );
  const leadOptions = [{ value: '', label: 'Không có' }].concat(
    (membersQuery.data ?? []).filter((m) => m.is_active !== 0 && m.is_active !== false).map((m) => ({ value: String(m.id), label: m.name }))
  );
  if (form.eventLeadId && !leadOptions.some((o) => o.value === form.eventLeadId)) {
    leadOptions.push({ value: form.eventLeadId, label: detail.activity.event_lead_name ?? `Người dùng #${form.eventLeadId}` });
  }

  const set = <K extends keyof EditForm>(key: K, value: EditForm[K]) => setForm((f) => ({ ...f, [key]: value }));
  const toggleTeam = (id: number) =>
    set('teamIds', form.teamIds.includes(id) ? form.teamIds.filter((x) => x !== id) : [...form.teamIds, id]);

  const save = useActivityMutation(
    detail.activity.id,
    (payload: UpdateActivityPayload) => updateActivity(detail.activity.id, payload),
    {
      message: 'Đã lưu thay đổi.',
      removedMessage: 'Đã huỷ hoạt động và xoá khỏi hệ thống.',
      removed: (result) => Boolean(result.deleted),
      onDone: onClose,
    }
  );

  const submit = () => {
    const message = validateEditForm(form, isAdmin);
    if (message) {
      setError(message);
      return;
    }
    setError('');
    const payload = buildUpdatePayload(form, initial, isAdmin);
    if (payload.status === 'cancelled') {
      setPendingCancel(payload);
      return;
    }
    save.mutate(payload);
  };

  const leadId = Number(form.leadTeamId);
  const activeTeamIds = effectiveTeamIds(form);

  return (
    <>
      <ModalTransition>
        {isOpen && (
          <Modal onClose={onClose} width="large">
            <ModalHeader>
              <ModalTitle>Sửa hoạt động</ModalTitle>
            </ModalHeader>
            <ModalBody>
              <FieldRow label="Tiêu đề" htmlFor="edit-activity-title">
                <Textfield id="edit-activity-title" value={form.title} onChange={(e) => set('title', (e.target as HTMLInputElement).value)} />
              </FieldRow>
              <FieldRow label="Mô tả" htmlFor="edit-activity-description">
                <TextArea id="edit-activity-description" minimumRows={3} value={form.description} onChange={(e) => set('description', (e.target as HTMLTextAreaElement).value)} />
              </FieldRow>
              <FieldRow label="Loại hoạt động" htmlFor="edit-activity-type">
                <NativeSelect id="edit-activity-type" value={form.type} options={EDIT_TYPE_OPTIONS} onChange={(v) => set('type', v)} />
              </FieldRow>
              <FieldRow label="Mức ưu tiên" htmlFor="edit-activity-priority">
                <NativeSelect id="edit-activity-priority" value={form.priority} options={EDIT_PRIORITY_OPTIONS} onChange={(v) => set('priority', v)} />
              </FieldRow>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 200px' }}>
                  <FieldRow label="Ngày bắt đầu" htmlFor="edit-activity-start">
                    <DateInput id="edit-activity-start" value={form.startDate} onChange={(v) => set('startDate', v)} />
                  </FieldRow>
                </div>
                <div style={{ flex: '1 1 200px' }}>
                  <FieldRow label="Hạn chót" htmlFor="edit-activity-deadline">
                    <DateInput id="edit-activity-deadline" value={form.deadline} onChange={(v) => set('deadline', v)} />
                  </FieldRow>
                </div>
              </div>
              <FieldRow label="Địa điểm" htmlFor="edit-activity-location">
                <Textfield id="edit-activity-location" value={form.location} onChange={(e) => set('location', (e.target as HTMLInputElement).value)} />
              </FieldRow>
              {form.type === 'assigned' && (
                <FieldRow label="Yêu cầu bởi" htmlFor="edit-activity-requested">
                  <Textfield id="edit-activity-requested" value={form.requestedBy} onChange={(e) => set('requestedBy', (e.target as HTMLInputElement).value)} />
                </FieldRow>
              )}
              <FieldRow label="Kết quả" htmlFor="edit-activity-result">
                <TextArea id="edit-activity-result" minimumRows={2} value={form.resultSummary} onChange={(e) => set('resultSummary', (e.target as HTMLTextAreaElement).value)} />
              </FieldRow>
              <LinkField label="Link đề án (không bắt buộc)" value={form.proposalUrl} onChange={(v) => set('proposalUrl', v)} />
              <div style={{ margin: '12px 0' }}>
                <label>
                  <input type="checkbox" checked={form.isPublic} onChange={(e) => set('isPublic', e.target.checked)} /> Hiển thị trên trang công khai
                </label>
              </div>
              {form.isPublic && <LinkField label="Link ảnh công khai (không bắt buộc)" value={form.publicImageUrl} onChange={(v) => set('publicImageUrl', v)} />}

              {isAdmin && (
                <div style={{ marginTop: 16 }}>
                  <FieldRow label="Trạng thái" htmlFor="edit-activity-status">
                    <NativeSelect id="edit-activity-status" value={form.status} options={EDIT_STATUS_OPTIONS} onChange={(v) => set('status', v)} />
                  </FieldRow>
                  <FieldRow label="Trưởng Ban Tổ chức" htmlFor="edit-activity-lead">
                    <NativeSelect id="edit-activity-lead" value={form.eventLeadId} options={leadOptions} onChange={(v) => set('eventLeadId', v)} />
                  </FieldRow>
                  <FieldRow label="Tổ chủ trì" htmlFor="edit-activity-lead-team">
                    <NativeSelect
                      id="edit-activity-lead-team"
                      value={form.leadTeamId}
                      options={[{ value: '', label: 'Chọn Tổ chủ trì' }, ...teamOptions.map((t) => ({ value: String(t.id), label: t.name }))]}
                      onChange={(v) => set('leadTeamId', v)}
                    />
                  </FieldRow>
                  <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
                    <legend style={{ fontWeight: 600, marginBottom: 4 }}>Các Tổ tham gia</legend>
                    {teamOptions.map((t) => (
                      <label key={t.id} style={{ display: 'block', padding: '2px 0' }}>
                        <input type="checkbox" checked={activeTeamIds.includes(t.id)} disabled={t.id === leadId} onChange={() => toggleTeam(t.id)} /> {t.name}
                      </label>
                    ))}
                  </fieldset>
                </div>
              )}
              {error && <ErrorText>{error}</ErrorText>}
            </ModalBody>
            <ModalFooter>
              <Button appearance="subtle" onClick={onClose}>
                Huỷ
              </Button>
              <Button appearance="primary" isLoading={save.isPending} onClick={submit}>
                Lưu thay đổi
              </Button>
            </ModalFooter>
          </Modal>
        )}
      </ModalTransition>
      <ConfirmDialog
        isOpen={pendingCancel !== null}
        title="Huỷ và xoá hoạt động?"
        appearance="danger"
        confirmLabel="Huỷ và xoá hoạt động"
        isLoading={save.isPending}
        onCancel={() => setPendingCancel(null)}
        onConfirm={() => {
          if (pendingCancel) save.mutate(pendingCancel, { onSettled: () => setPendingCancel(null) });
        }}
      >
        Chuyển sang "Đã hủy" sẽ xoá vĩnh viễn hoạt động cùng các công việc của nó. Không thể hoàn tác.
      </ConfirmDialog>
    </>
  );
};
```

- [ ] **Step 4: Chạy test xanh**

Run: `npx vitest run src/core/features/activities && npx tsc --noEmit`
Expected: PASS. Nếu `getByLabelText('Tổ chủ trì')` trùng với nhãn khác trong test, đổi test sang `getByLabelText('Tổ chủ trì', { selector: 'select' })`.

- [ ] **Step 5: Commit**

```bash
git add web/src/core/features/activities
git commit -m "feat(web): sửa hoạt động — admin mọi trường, người quản lý tập con, xác nhận khi huỷ

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Thêm người tham gia

**Files:**
- Create: `web/src/core/features/activities/AddParticipantsModal.tsx`
- Test: `web/src/core/features/activities/AddParticipantsModal.test.tsx`

**Interfaces:**
- Consumes: `ActivityDetail`, `addActivityParticipants` (Task 2); `useActivityMutation`, `formBits` (Task 8); `PeoplePicker`.
- Produces: `AddParticipantsModal({ isOpen, onClose, detail })`, `DEFAULT_RESPONSIBILITY = 'Người tham gia hoạt động'`.

Quyết định: danh sách ứng viên là `detail.people` (server đã giới hạn theo vai trò). Bộ lọc Tổ dựng từ `detail.activityTeams` (không dùng `people[].team_names` vì không ghép cặp được với `team_ids`). Người đã tham gia (trừ trạng thái `declined`) không hiện trong gợi ý; người đã chọn không biến mất khi đổi bộ lọc.

- [ ] **Step 1: Viết test hỏng**

```tsx
// web/src/core/features/activities/AddParticipantsModal.test.tsx
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { AddParticipantsModal } from './AddParticipantsModal';
import { makeDetail, renderInApp } from './testUtils';
import * as api from '../../api';

vi.mock('../../api', async () => {
  const actual = await vi.importActual<typeof import('../../api')>('../../api');
  return { ...actual, addActivityParticipants: vi.fn() };
});

const detail = makeDetail({
  canManage: true,
  people: [
    { id: 7, name: 'Phạm Hùng', team_id: 2, team_ids: [2], team_names: ['Tuyên huấn'] },
    { id: 8, name: 'Vũ Lan', team_id: 3, team_ids: [3], team_names: ['Truyền thông'] },
    { id: 21, name: 'Đã Có Mặt', team_id: 2, team_ids: [2], team_names: ['Tuyên huấn'] },
    { id: 22, name: 'Từng Từ Chối', team_id: 2, team_ids: [2], team_names: ['Tuyên huấn'] },
  ],
  participants: [
    { user_id: 21, state: 'confirmed', name: 'Đã Có Mặt' },
    { user_id: 22, state: 'declined', name: 'Từng Từ Chối' },
  ],
});

const show = (onClose = vi.fn()) => {
  const utils = renderInApp(<AddParticipantsModal isOpen onClose={onClose} detail={detail} />, { role: 'leader' });
  return { ...utils, onClose };
};
const search = (text: string) => fireEvent.change(screen.getByLabelText('Chọn người tham gia'), { target: { value: text } });

describe('AddParticipantsModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.addActivityParticipants).mockResolvedValue(undefined);
  });
  afterEach(cleanup);

  it('chọn người, gửi user_ids và vai trò mặc định, toast, đóng, làm mới cache', async () => {
    const { qc, onClose } = show();
    const spy = vi.spyOn(qc, 'invalidateQueries');
    search('hung');
    fireEvent.click(await screen.findByRole('option', { name: 'Phạm Hùng' }));
    search('lan');
    fireEvent.click(await screen.findByRole('option', { name: 'Vũ Lan' }));
    fireEvent.click(screen.getByRole('button', { name: 'Thêm' }));

    await waitFor(() => expect(api.addActivityParticipants).toHaveBeenCalledWith(5, { user_ids: [7, 8], responsibility: 'Người tham gia hoạt động' }));
    expect(await screen.findByText('Đã thêm người tham gia.')).toBeDefined();
    expect(onClose).toHaveBeenCalled();
    expect(spy).toHaveBeenCalledWith({ queryKey: ['core-activity', 5] });
  });

  it('gửi vai trò tự nhập (đã cắt khoảng trắng)', async () => {
    show();
    search('hung');
    fireEvent.click(await screen.findByRole('option', { name: 'Phạm Hùng' }));
    fireEvent.change(screen.getByLabelText('Vai trò'), { target: { value: '  Hậu cần  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Thêm' }));
    await waitFor(() => expect(api.addActivityParticipants).toHaveBeenCalledWith(5, { user_ids: [7], responsibility: 'Hậu cần' }));
  });

  it('người đã tham gia không được gợi ý, người từng từ chối thì được', async () => {
    show();
    search('co mat');
    await waitFor(() => expect(screen.queryByRole('option', { name: 'Đã Có Mặt' })).toBeNull());
    search('tung');
    expect(await screen.findByRole('option', { name: 'Từng Từ Chối' })).toBeDefined();
  });

  it('lọc theo Tổ lấy từ các Tổ của hoạt động', async () => {
    show();
    fireEvent.change(screen.getByLabelText('Lọc theo Tổ'), { target: { value: '3' } });
    search('hung');
    await waitFor(() => expect(screen.queryByRole('option', { name: 'Phạm Hùng' })).toBeNull());
    search('lan');
    expect(await screen.findByRole('option', { name: 'Vũ Lan' })).toBeDefined();
  });

  it('chưa chọn ai thì báo lỗi và không gọi API', () => {
    show();
    fireEvent.click(screen.getByRole('button', { name: 'Thêm' }));
    expect(screen.getByText('Hãy chọn ít nhất một thành viên.')).toBeDefined();
    expect(api.addActivityParticipants).not.toHaveBeenCalled();
  });

  it('lỗi tiếng Anh của server hiện bằng tiếng Việt, modal vẫn mở', async () => {
    vi.mocked(api.addActivityParticipants).mockRejectedValue({
      response: { status: 403, data: { error: 'You may only add active members from teams you lead or teams on this activity.' } },
    });
    const { onClose } = show();
    search('hung');
    fireEvent.click(await screen.findByRole('option', { name: 'Phạm Hùng' }));
    fireEvent.click(screen.getByRole('button', { name: 'Thêm' }));
    expect(await screen.findByText('Bạn chỉ được thêm thành viên đang hoạt động thuộc Tổ bạn phụ trách hoặc Tổ của hoạt động này.')).toBeDefined();
    expect(onClose).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Chạy, xác nhận hỏng**

Run: `npx vitest run src/core/features/activities/AddParticipantsModal.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Viết mã**

```tsx
// web/src/core/features/activities/AddParticipantsModal.tsx
import React, { useEffect, useMemo, useState } from 'react';
import Modal, { ModalBody, ModalFooter, ModalHeader, ModalTitle, ModalTransition } from '@atlaskit/modal-dialog';
import Button from '@atlaskit/button/new';
import Textfield from '@atlaskit/textfield';
import { addActivityParticipants, type ActivityDetail } from '../../api';
import { PeoplePicker } from '../../../shared/components/PeoplePicker';
import { ErrorText, FieldRow, NativeSelect } from './formBits';
import { useActivityMutation } from './useActivityMutation';

export const DEFAULT_RESPONSIBILITY = 'Người tham gia hoạt động';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  detail: ActivityDetail;
}

export const AddParticipantsModal: React.FC<Props> = ({ isOpen, onClose, detail }) => {
  const [selected, setSelected] = useState<number[]>([]);
  const [teamFilter, setTeamFilter] = useState('');
  const [responsibility, setResponsibility] = useState(DEFAULT_RESPONSIBILITY);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setSelected([]);
      setTeamFilter('');
      setResponsibility(DEFAULT_RESPONSIBILITY);
      setError('');
    }
  }, [isOpen]);

  const taken = useMemo(
    () => detail.participants.filter((p) => p.state !== 'declined').map((p) => Number(p.user_id)),
    [detail.participants]
  );
  const candidates = useMemo(() => {
    const team = Number(teamFilter);
    return detail.people
      .filter((p) => !team || p.team_ids.includes(team) || selected.includes(p.id))
      .map((p) => ({ id: p.id, name: p.name }));
  }, [detail.people, teamFilter, selected]);

  const add = useActivityMutation(
    detail.activity.id,
    (payload: { user_ids: number[]; responsibility: string }) => addActivityParticipants(detail.activity.id, payload),
    { message: 'Đã thêm người tham gia.', onDone: onClose }
  );

  const submit = () => {
    if (selected.length === 0) {
      setError('Hãy chọn ít nhất một thành viên.');
      return;
    }
    setError('');
    add.mutate({ user_ids: selected, responsibility: responsibility.trim() || DEFAULT_RESPONSIBILITY });
  };

  return (
    <ModalTransition>
      {isOpen && (
        <Modal onClose={onClose} width="medium">
          <ModalHeader>
            <ModalTitle>Thêm người tham gia</ModalTitle>
          </ModalHeader>
          <ModalBody>
            <FieldRow label="Lọc theo Tổ" htmlFor="add-participants-team">
              <NativeSelect
                id="add-participants-team"
                value={teamFilter}
                options={[{ value: '', label: 'Tất cả các Tổ' }, ...detail.activityTeams.map((t) => ({ value: String(t.team_id), label: t.name }))]}
                onChange={setTeamFilter}
              />
            </FieldRow>
            <PeoplePicker label="Chọn người tham gia" people={candidates} value={selected} onChange={setSelected} excludeIds={taken} />
            <div style={{ marginTop: 12 }}>
              <FieldRow label="Vai trò" htmlFor="add-participants-role">
                <Textfield id="add-participants-role" value={responsibility} onChange={(e) => setResponsibility((e.target as HTMLInputElement).value)} />
              </FieldRow>
            </div>
            {error && <ErrorText>{error}</ErrorText>}
          </ModalBody>
          <ModalFooter>
            <Button appearance="subtle" onClick={onClose}>
              Huỷ
            </Button>
            <Button appearance="primary" isLoading={add.isPending} onClick={submit}>
              Thêm
            </Button>
          </ModalFooter>
        </Modal>
      )}
    </ModalTransition>
  );
};
```

- [ ] **Step 4: Chạy test xanh**

Run: `npx vitest run src/core/features/activities && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add web/src/core/features/activities
git commit -m "feat(web): thêm người tham gia hoạt động

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: Thanh hành động — duyệt, yêu cầu sửa, từ chối, nộp lại, sửa, xoá, đăng ký, thêm người

**Files:**
- Create: `web/src/core/features/activities/ActivityActions.tsx`
- Modify: `web/src/core/features/activities/ActivityDetailView.tsx` (thay mốc `{/* ACTIONS */}`)
- Test: `web/src/core/features/activities/ActivityActions.test.tsx`; thêm một test vào `ActivityDetailView.test.tsx`

**Interfaces:**
- Consumes: `deriveActivityActions` (Task 3); `useActivityMutation` (Task 8); `EditActivityModal` (Task 9); `AddParticipantsModal` (Task 10); `ReasonDialog`, `ConfirmDialog`; các hàm API của Task 2; `useCapabilities`, `fetchSession`, `SESSION_KEY`.
- Produces: `ActivityActions({ detail, children? })`, `data-testid="activity-actions"`. `children` là chỗ đợt 2 gắn nút việc ("Giao việc", "Tự ghi nhận việc").

Tên nút và nhãn xác nhận của hộp thoại cố ý khác nhau ("Từ chối" mở hộp thoại, nút xác nhận là "Từ chối và xoá") để test và người dùng không nhầm.

- [ ] **Step 1: Viết test hỏng**

```tsx
// web/src/core/features/activities/ActivityActions.test.tsx
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { ActivityActions } from './ActivityActions';
import { makeDetail, renderInApp } from './testUtils';
import * as api from '../../api';

vi.mock('../../api', async () => {
  const actual = await vi.importActual<typeof import('../../api')>('../../api');
  return {
    ...actual,
    approveActivity: vi.fn(),
    requestActivityChanges: vi.fn(),
    rejectActivity: vi.fn(),
    submitActivity: vi.fn(),
    deleteActivity: vi.fn(),
    volunteerForActivity: vi.fn(),
    fetchTeams: vi.fn(),
    fetchMembers: vi.fn(),
  };
});

const show = (role: string, detail = makeDetail({ canManage: true }), children?: React.ReactNode) =>
  renderInApp(<ActivityActions detail={detail}>{children}</ActivityActions>, { role, userId: 3 });

const buttons = () => screen.queryAllByRole('button').map((b) => b.textContent);

describe('ActivityActions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.approveActivity).mockResolvedValue({ ok: true });
    vi.mocked(api.requestActivityChanges).mockResolvedValue({ ok: true });
    vi.mocked(api.rejectActivity).mockResolvedValue({ ok: true, deleted: true });
    vi.mocked(api.submitActivity).mockResolvedValue({ ok: true });
    vi.mocked(api.deleteActivity).mockResolvedValue({ ok: true, id: 5, title: 'Ngày hội Kỹ thuật' });
    vi.mocked(api.volunteerForActivity).mockResolvedValue({ ok: true });
    vi.mocked(api.fetchTeams).mockResolvedValue([]);
    vi.mocked(api.fetchMembers).mockResolvedValue([]);
  });
  afterEach(cleanup);

  describe('hiện/ẩn theo quyền', () => {
    it('admin, đề án chờ duyệt: đủ nút, không có Nộp lại', () => {
      show('admin');
      expect(buttons()).toEqual(['Duyệt', 'Yêu cầu sửa', 'Từ chối', 'Sửa', 'Xoá hoạt động', 'Đăng ký tham gia', 'Thêm người tham gia']);
    });

    it('Tổ trưởng quản lý hoạt động: chỉ Sửa, Đăng ký, Thêm người; không Duyệt/Từ chối/Xoá', () => {
      show('leader');
      expect(buttons()).toEqual(['Sửa', 'Đăng ký tham gia', 'Thêm người tham gia']);
    });

    it('Tổ trưởng + changes_requested: có Nộp lại', () => {
      show('leader', makeDetail({ canManage: true, activity: { status: 'changes_requested' } }));
      expect(screen.getByRole('button', { name: 'Nộp lại' })).toBeDefined();
    });

    it('thành viên thường: chỉ Đăng ký tham gia', () => {
      show('member', makeDetail({ canManage: false }));
      expect(buttons()).toEqual(['Đăng ký tham gia']);
    });

    it('đã đăng ký thì ẩn Đăng ký; từng từ chối thì hiện lại', () => {
      show('member', makeDetail({ canManage: false, participants: [{ user_id: 3, state: 'volunteered', name: 'Tôi' }] }));
      expect(buttons()).toEqual([]);
      cleanup();
      show('member', makeDetail({ canManage: false, participants: [{ user_id: 3, state: 'declined', name: 'Tôi' }] }));
      expect(buttons()).toEqual(['Đăng ký tham gia']);
    });

    it('children được hiển thị trong thanh (chỗ đợt 2 gắn nút việc)', () => {
      show('member', makeDetail({ canManage: false }), <button type="button">Giao việc</button>);
      expect(within(screen.getByTestId('activity-actions')).getByRole('button', { name: 'Giao việc' })).toBeDefined();
    });
  });

  describe('thao tác', () => {
    it('Duyệt: POST approve, toast, làm mới cache', async () => {
      const { qc } = show('admin');
      const spy = vi.spyOn(qc, 'invalidateQueries');
      fireEvent.click(screen.getByRole('button', { name: 'Duyệt' }));
      await waitFor(() => expect(api.approveActivity).toHaveBeenCalledWith(5));
      expect(await screen.findByText('Đã duyệt hoạt động.')).toBeDefined();
      expect(spy).toHaveBeenCalledWith({ queryKey: ['core-activity', 5] });
    });

    it('Duyệt lỗi 409 hiện câu của server', async () => {
      vi.mocked(api.approveActivity).mockRejectedValue({ response: { status: 409, data: { error: 'Đề án không ở trạng thái chờ duyệt.' } } });
      show('admin');
      fireEvent.click(screen.getByRole('button', { name: 'Duyệt' }));
      expect(await screen.findByText('Đề án không ở trạng thái chờ duyệt.')).toBeDefined();
    });

    it('Yêu cầu sửa: bắt buộc ghi chú, rồi POST request-changes', async () => {
      show('admin');
      fireEvent.click(screen.getByRole('button', { name: 'Yêu cầu sửa' }));
      const dialog = await screen.findByRole('dialog');
      fireEvent.click(within(dialog).getByRole('button', { name: 'Gửi yêu cầu' }));
      expect(within(dialog).getByText('Vui lòng nhập lý do.')).toBeDefined();
      expect(api.requestActivityChanges).not.toHaveBeenCalled();

      fireEvent.change(within(dialog).getByRole('textbox'), { target: { value: 'Thiếu dự toán' } });
      fireEvent.click(within(dialog).getByRole('button', { name: 'Gửi yêu cầu' }));
      await waitFor(() => expect(api.requestActivityChanges).toHaveBeenCalledWith(5, 'Thiếu dự toán'));
      expect(await screen.findByText('Đã gửi yêu cầu chỉnh sửa.')).toBeDefined();
      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    });

    it('Từ chối: gửi lý do, server xoá hẳn nên bỏ cache và về danh sách', async () => {
      const { qc } = show('admin');
      qc.setQueryData(['core-activity', 5], makeDetail());
      fireEvent.click(screen.getByRole('button', { name: 'Từ chối' }));
      const dialog = await screen.findByRole('dialog');
      fireEvent.change(within(dialog).getByRole('textbox'), { target: { value: 'Trùng lịch' } });
      fireEvent.click(within(dialog).getByRole('button', { name: 'Từ chối và xoá' }));

      await waitFor(() => expect(api.rejectActivity).toHaveBeenCalledWith(5, 'Trùng lịch'));
      await waitFor(() => expect(screen.getByTestId('path').textContent).toBe('/activities'));
      expect(qc.getQueryData(['core-activity', 5])).toBeUndefined();
    });

    it('Nộp lại: POST submit', async () => {
      show('leader', makeDetail({ canManage: true, activity: { status: 'changes_requested' } }));
      fireEvent.click(screen.getByRole('button', { name: 'Nộp lại' }));
      await waitFor(() => expect(api.submitActivity).toHaveBeenCalledWith(5));
      expect(await screen.findByText('Đã nộp lại đề án.')).toBeDefined();
    });

    it('Đăng ký tham gia: POST volunteer', async () => {
      show('member', makeDetail({ canManage: false }));
      fireEvent.click(screen.getByRole('button', { name: 'Đăng ký tham gia' }));
      await waitFor(() => expect(api.volunteerForActivity).toHaveBeenCalledWith(5));
      expect(await screen.findByText('Đã đăng ký tham gia.')).toBeDefined();
    });

    it('Xoá: phải gõ đúng tiêu đề, rồi DELETE và về danh sách', async () => {
      const { qc } = show('admin');
      qc.setQueryData(['core-activity', 5], makeDetail());
      fireEvent.click(screen.getByRole('button', { name: 'Xoá hoạt động' }));
      const dialog = await screen.findByRole('dialog');
      const confirm = within(dialog).getByRole('button', { name: 'Xoá vĩnh viễn' }) as HTMLButtonElement;
      expect(confirm.disabled).toBe(true);

      fireEvent.change(within(dialog).getByLabelText(/Gõ lại/), { target: { value: 'Ngày hội Kỹ thuật' } });
      expect((within(dialog).getByRole('button', { name: 'Xoá vĩnh viễn' }) as HTMLButtonElement).disabled).toBe(false);
      fireEvent.click(within(dialog).getByRole('button', { name: 'Xoá vĩnh viễn' }));

      await waitFor(() => expect(api.deleteActivity).toHaveBeenCalledWith(5));
      await waitFor(() => expect(screen.getByTestId('path').textContent).toBe('/activities'));
      expect(qc.getQueryData(['core-activity', 5])).toBeUndefined();
    });

    it('Sửa và Thêm người tham gia mở hộp thoại tương ứng', async () => {
      show('admin');
      fireEvent.click(screen.getByRole('button', { name: 'Sửa' }));
      expect(await screen.findByText('Sửa hoạt động')).toBeDefined();
      fireEvent.click(screen.getByRole('button', { name: 'Huỷ' }));
      await waitFor(() => expect(screen.queryByText('Sửa hoạt động')).toBeNull());

      fireEvent.click(screen.getByRole('button', { name: 'Thêm người tham gia' }));
      expect(await screen.findByLabelText('Chọn người tham gia')).toBeDefined();
    });
  });
});
```

Thêm vào `ActivityDetailView.test.tsx`:

```tsx
  it('admin thấy thanh hành động, thành viên thường chỉ thấy Đăng ký tham gia', async () => {
    vi.mocked(api.fetchActivityDetail).mockResolvedValue(makeDetail({ canManage: true }));
    renderInApp(<ActivityDetailView />, { path: '/activity/5', routePath: '/activity/:id', role: 'admin' });
    expect(await screen.findByRole('button', { name: 'Duyệt' })).toBeDefined();
    cleanup();

    vi.mocked(api.fetchActivityDetail).mockResolvedValue(makeDetail({ canManage: false }));
    renderInApp(<ActivityDetailView />, { path: '/activity/5', routePath: '/activity/:id', role: 'member' });
    expect(await screen.findByRole('button', { name: 'Đăng ký tham gia' })).toBeDefined();
    expect(screen.queryByRole('button', { name: 'Duyệt' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Xoá hoạt động' })).toBeNull();
  });
```

- [ ] **Step 2: Chạy, xác nhận hỏng**

Run: `npx vitest run src/core/features/activities/ActivityActions.test.tsx`
Expected: FAIL (module chưa có).

- [ ] **Step 3: Viết mã**

```tsx
// web/src/core/features/activities/ActivityActions.tsx
import React, { useState } from 'react';
import Button from '@atlaskit/button/new';
import { useQuery } from '@tanstack/react-query';
import {
  approveActivity,
  deleteActivity,
  fetchSession,
  rejectActivity,
  requestActivityChanges,
  submitActivity,
  volunteerForActivity,
  type ActivityDetail,
} from '../../api';
import { useCapabilities } from '../../capabilities';
import { SESSION_KEY } from '../../queryKeys';
import { ConfirmDialog } from '../../../shared/components/ConfirmDialog';
import { ReasonDialog } from '../../../shared/components/ReasonDialog';
import { deriveActivityActions } from './activityPermissions';
import { useActivityMutation } from './useActivityMutation';
import { EditActivityModal } from './EditActivityModal';
import { AddParticipantsModal } from './AddParticipantsModal';

type Dialog = 'changes' | 'reject' | 'delete' | 'edit' | 'participants' | null;

/** Thanh hành động của trang hoạt động. `children` để đợt 2 gắn thêm nút việc. */
export const ActivityActions: React.FC<{ detail: ActivityDetail; children?: React.ReactNode }> = ({ detail, children }) => {
  const { isExec } = useCapabilities();
  const { data: session } = useQuery({ queryKey: SESSION_KEY, queryFn: fetchSession });
  const id = detail.activity.id;
  const flags = deriveActivityActions({ isExec, userId: session?.user?.id ?? null, detail });
  const [dialog, setDialog] = useState<Dialog>(null);
  const close = () => setDialog(null);

  const approve = useActivityMutation(id, () => approveActivity(id), { message: 'Đã duyệt hoạt động.' });
  const requestChanges = useActivityMutation(id, (feedback: string) => requestActivityChanges(id, feedback), {
    message: 'Đã gửi yêu cầu chỉnh sửa.',
    onDone: close,
  });
  const reject = useActivityMutation(id, (feedback: string) => rejectActivity(id, feedback), {
    message: 'Đã từ chối và xoá đề án.',
    removed: (result) => Boolean(result.deleted),
  });
  const resubmit = useActivityMutation(id, () => submitActivity(id), { message: 'Đã nộp lại đề án.' });
  const volunteer = useActivityMutation(id, () => volunteerForActivity(id), { message: 'Đã đăng ký tham gia.' });
  const remove = useActivityMutation(id, () => deleteActivity(id), { message: 'Đã xoá hoạt động.', removed: () => true });

  return (
    <div data-testid="activity-actions" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '0 0 16px' }}>
      {flags.canApprove && (
        <>
          <Button appearance="primary" isLoading={approve.isPending} onClick={() => approve.mutate()}>
            Duyệt
          </Button>
          <Button onClick={() => setDialog('changes')}>Yêu cầu sửa</Button>
          <Button appearance="danger" onClick={() => setDialog('reject')}>
            Từ chối
          </Button>
        </>
      )}
      {flags.canResubmit && (
        <Button appearance="primary" isLoading={resubmit.isPending} onClick={() => resubmit.mutate()}>
          Nộp lại
        </Button>
      )}
      {flags.canEdit && <Button onClick={() => setDialog('edit')}>Sửa</Button>}
      {flags.canDelete && (
        <Button appearance="danger" onClick={() => setDialog('delete')}>
          Xoá hoạt động
        </Button>
      )}
      {flags.canVolunteer && (
        <Button isLoading={volunteer.isPending} onClick={() => volunteer.mutate()}>
          Đăng ký tham gia
        </Button>
      )}
      {flags.canAddParticipants && <Button onClick={() => setDialog('participants')}>Thêm người tham gia</Button>}
      {children}

      <ReasonDialog
        isOpen={dialog === 'changes'}
        title="Yêu cầu chỉnh sửa đề án"
        label="Nội dung cần sửa"
        confirmLabel="Gửi yêu cầu"
        isLoading={requestChanges.isPending}
        onSubmit={(reason) => requestChanges.mutate(reason)}
        onCancel={close}
      />
      <ReasonDialog
        isOpen={dialog === 'reject'}
        title="Từ chối đề án"
        label="Lý do"
        appearance="danger"
        confirmLabel="Từ chối và xoá"
        isLoading={reject.isPending}
        onSubmit={(reason) => reject.mutate(reason)}
        onCancel={close}
      />
      <ConfirmDialog
        isOpen={dialog === 'delete'}
        title="Xoá hoạt động?"
        appearance="danger"
        confirmLabel="Xoá vĩnh viễn"
        confirmText={detail.activity.title}
        isLoading={remove.isPending}
        onConfirm={() => remove.mutate()}
        onCancel={close}
      >
        Hoạt động cùng toàn bộ công việc, tài liệu và cập nhật của nó sẽ bị xoá vĩnh viễn. Không thể hoàn tác.
      </ConfirmDialog>
      <EditActivityModal isOpen={dialog === 'edit'} onClose={close} detail={detail} isAdmin={flags.canEditAdminFields} />
      <AddParticipantsModal isOpen={dialog === 'participants'} onClose={close} detail={detail} />
    </div>
  );
};
```

Trong `ActivityDetailView.tsx`: thêm `import { ActivityActions } from './ActivityActions';` và thay `{/* ACTIONS */}` bằng

```tsx
      <ActivityActions detail={data} />
```

- [ ] **Step 4: Chạy test xanh**

Run: `npx vitest run src/core/features/activities && npx tsc --noEmit`
Expected: PASS. Nếu test thứ tự nút (`toEqual([...])`) lệch vì Atlaskit `Button` thêm text ẩn, đổi `buttons()` thành `b.textContent?.trim()`.

- [ ] **Step 5: Commit**

```bash
git add web/src/core/features/activities
git commit -m "feat(web): thanh hành động hoạt động — duyệt, yêu cầu sửa, từ chối, nộp lại, sửa, xoá, đăng ký, thêm người

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12: Lịch bấm hoạt động mở trang chi tiết, gỡ `ActivityDetailModal`

**Files:**
- Modify: `web/src/core/features/calendar/CalendarView.tsx`, `web/src/core/features/calendar/CalendarView.test.tsx`
- Delete: `web/src/core/features/calendar/ActivityDetailModal.tsx` (và test của nó nếu có)

**Interfaces:**
- Consumes: `goToActivity` (Task 3).
- Produces: bấm hoạt động trên lịch (tháng, danh sách, Gantt) đặt `window.location.hash = '#/activity/<id>'`.

Quyết định: spec nói gỡ `ActivityDetailModal`; modal này cũng đang được `CalendarView` dùng, nên lịch chuyển sang trang chi tiết (cùng hành vi với danh sách hoạt động). Hoạt động của đơn vị khác (dòng tóm tắt) sẽ nhận 404 và hiện thông báo của Task 6.

- [ ] **Step 1: Viết lại test lịch (hỏng trước)**

Dùng script để thay khối ba test mở modal (từ `it('opens activity detail modal when clicking an activity pill` đến ngay trước `it('mở tháng hiện tại theo ngày hệ thống`) bằng khối mới:

```bash
python3 - <<'PY'
import re, pathlib
p = pathlib.Path('src/core/features/calendar/CalendarView.test.tsx')
s = p.read_text()
start = s.index("  it('opens activity detail modal when clicking an activity pill in month view and closes it'")
end = s.index("  it('mở tháng hiện tại theo ngày hệ thống")
new = """  it('bấm hoạt động ở lịch tháng mở trang chi tiết', async () => {
    window.location.hash = '';
    renderWithClient(<CalendarView />);
    fireEvent.click(await screen.findByTestId('activity-pill-1'));
    expect(window.location.hash).toBe('#/activity/1');
    expect(screen.queryByTestId('activity-detail-modal')).toBeNull();
  });

  it('bấm hoạt động ở dạng danh sách mở trang chi tiết', async () => {
    window.location.hash = '';
    renderWithClient(<CalendarView />);
    fireEvent.click(screen.getByText('Danh sách'));
    fireEvent.click(await screen.findByTestId('list-activity-2'));
    expect(window.location.hash).toBe('#/activity/2');
  });

  it('bấm thanh hoạt động ở Gantt mở trang chi tiết', async () => {
    window.location.hash = '';
    renderWithClient(<CalendarView />);
    fireEvent.click(screen.getByText('Biểu đồ Gantt'));
    fireEvent.click(await screen.findByTestId('gantt-bar-1'));
    expect(window.location.hash).toBe('#/activity/1');
  });

"""
p.write_text(s[:start] + new + s[end:])
PY
```

Rồi dùng Edit sửa test cuối (dòng tóm tắt thiếu type): thay

```tsx
    fireEvent.click(screen.getByText('Hoạt động đơn vị khác'));
    const modal = await screen.findByTestId('activity-detail-modal');
    expect(within(modal).queryByText('Chỉ đạo')).toBeNull();
    expect(within(modal).queryByText('Sự kiện')).toBeNull();
    expect(within(modal).queryByText('Chưa phân công')).toBeNull();
```

bằng

```tsx
    window.location.hash = '';
    fireEvent.click(screen.getByText('Hoạt động đơn vị khác'));
    expect(window.location.hash).toBe('#/activity/7');
```

Nếu `within(` không còn dùng trong file test, bỏ `within` khỏi dòng import `@testing-library/react` (`noUnusedLocals`). Kiểm: `grep -c "within(" src/core/features/calendar/CalendarView.test.tsx`.

- [ ] **Step 2: Chạy, xác nhận hỏng**

Run: `npx vitest run src/core/features/calendar/CalendarView.test.tsx`
Expected: FAIL (hash không đổi, modal còn mở).

- [ ] **Step 3: Sửa `CalendarView.tsx` và xoá modal**

```bash
sed -i '' "s/onClick={() => setSelectedActivity(act)}/onClick={() => goToActivity(act.id)}/" src/core/features/calendar/CalendarView.tsx
grep -c "goToActivity(act.id)" src/core/features/calendar/CalendarView.tsx   # Expected: 4
```

Dùng Edit trong `CalendarView.tsx`:
- thay `import { ActivityDetailModal } from './ActivityDetailModal';` bằng `import { goToActivity } from '../../navigation';`
- xoá dòng `  const [selectedActivity, setSelectedActivity] = useState<ActivityItem | null>(null);`
- xoá khối cuối:

```tsx

      {/* Activity Detail Modal */}
      <ActivityDetailModal
        activity={selectedActivity}
        isOpen={Boolean(selectedActivity)}
        onClose={() => setSelectedActivity(null)}
      />
```

Xoá file modal và kiểm không còn tham chiếu:

```bash
git rm src/core/features/calendar/ActivityDetailModal.tsx
ls src/core/features/calendar | grep ActivityDetailModal || true      # nếu còn *.test.tsx thì git rm nốt
grep -rn "ActivityDetailModal\|activity-detail-modal" src || echo "không còn tham chiếu"
```

- [ ] **Step 4: Chạy toàn bộ**

Run: `npm test && npx tsc --noEmit && npm run build`
Expected: xanh. Nếu `tsc` báo `ActivityItem` hoặc `useState` không dùng trong `CalendarView.tsx`, bỏ khỏi import (cả hai hiện còn được dùng ở chỗ khác nên thường không cần).

- [ ] **Step 5: Commit**

```bash
git add -A web/src/core/features/calendar
git commit -m "feat(web): lịch mở trang chi tiết hoạt động, gỡ ActivityDetailModal

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 13: Tài liệu, kiểm tra và PR

**Files (kiểm lại bằng `docs:check`, chỉ sửa tài liệu nó yêu cầu):**
- Modify: `docs/specs/2026-10-09-web-hoan-thien-thay-the-design.md` (SPEC-WEB-003): ghi đợt 1 xong, đóng mục 4.1.
- Modify: `docs/dev/frontend.md` (DEV-FE-001): mô tả trang chi tiết hoạt động, `navigation.ts`, `useActivityMutation`, `activityPermissions`.
- Modify: `docs/dev/test.md` (DEV-TEST-001): `testUtils.tsx` (`renderInApp`, `makeDetail`).
- Modify: `docs/planning/ke-hoach-hub-core-operations.md` (PLAN-HUB-001): một dòng lịch sử.
- Modify (đang `related_code` trùng): `docs/specs/2026-10-08-activities-ui-design.md` và `...-plan.md`, `docs/specs/2026-10-08-calendar-ui-design.md` và `...-plan.md`, `docs/specs/2026-10-08-create-activity-modal-design.md` và `...-plan.md`, `docs/specs/2026-10-08-dashboard-ui-design.md` và `...-plan.md`.

Lưu ý: cây làm việc có thể đang chứa sửa chưa commit của người khác ở các tài liệu `2026-10-08-*` (đợt khác hoặc đợt 0 đang hoàn tất). Đọc từng file ngay trước khi sửa, chỉ cộng thêm phần của đợt 1, không ghi đè.

- [ ] **Step 1: Chạy kiểm tra để biết chính xác tài liệu nào bị yêu cầu**

```bash
cd web && npm test && npx tsc --noEmit && npm run build && cd ..
git status --short   # code của các Task 1-12 đã commit; nếu còn thay đổi code chưa commit thì commit trước khi chạy docs:check
npm run docs:index
npm run docs:check -- --base origin/staging
```

`docs:check` phải chạy sau khi code đã commit. Với mỗi dòng lỗi "tài liệu X khớp `related_code` nhưng chưa đổi", làm Step 2.

- [ ] **Step 2: Sửa tài liệu theo quy tắc chung (mỗi tài liệu)**

Với mỗi tài liệu bị yêu cầu: tăng `version` MINOR (ví dụ 1.2 → 1.3), đặt `updated: 2026-10-09`, thêm một dòng cuối bảng `## Lịch sử phiên bản` có đúng version mới. Nội dung từng nhóm:

1. **SPEC-WEB-003** — trong `## Lịch sử phiên bản` thêm dòng: `| 1.2 | 2026-10-09 | Đợt 1 (Hoạt động) xong: form tạo đủ trường, trang chi tiết #activity/:id, vòng duyệt, sửa, xoá, đăng ký, thêm người, cập nhật có gắn thẻ; lịch mở trang chi tiết, gỡ ActivityDetailModal; việc trong trang hoạt động chỉ đọc đến hết đợt 2 | DYC |` (đánh số đúng theo version hiện có). Ở mục 4.1 thêm một dòng ghi chú: "Đã làm ở đợt 1; phần việc (giao việc, tự ghi nhận, chi tiết việc) thuộc đợt 2."
2. **DEV-FE-001 (`docs/dev/frontend.md`)** — trong mục `web/`, thêm đoạn "Trang chi tiết hoạt động": route `#/activity/:id` (`ActivityDetailView`); thanh hành động `ActivityActions` lấy điều kiện từ `deriveActivityActions` (bắt chước server); mọi thao tác ghi qua `useActivityMutation` (toast tiếng Việt, làm mới `['core-activity', id]`, hoạt động bị xoá thì `forgetActivity` + về `#/activities`); màn không bọc Router (danh sách, lịch, Tổng quan) chuyển trang bằng `<a href="#/activity/ID">` hoặc `goToActivity(id)` (`web/src/core/navigation.ts`).
3. **DEV-TEST-001 (`docs/dev/test.md`)** — trong phần test `web/`, thêm: "Test trang hoạt động dùng `renderInApp` và `makeDetail` (`web/src/core/features/activities/testUtils.tsx`): đã có QueryClient (seed `SESSION_KEY`, `BOOTSTRAP_KEY`), `ToastProvider`, `MemoryRouter`; `Probe` hiện đường dẫn hiện tại để kiểm tra điều hướng. Mock API bằng `vi.mock('../../api', async () => ({ ...actual, fn: vi.fn() }))`."
4. **Spec của màn cũ** (`activities-ui-design`, `calendar-ui-design`, `create-activity-modal-design`, `dashboard-ui-design`) — thêm đoạn cuối trước `## Lịch sử phiên bản`: "Cập nhật 2026-10-09 (đợt 1 SPEC-WEB-003): …" với nội dung tương ứng: danh sách — thẻ bấm được tới `#/activity/:id`, có link đề án; lịch — bấm hoạt động mở trang chi tiết, `ActivityDetailModal` đã gỡ; form tạo — thêm Trưởng BTC, kiểm link http(s), `onCreated`; Tổng quan — tạo xong chuyển tới trang chi tiết. Dòng lịch sử: `Đợt 1 SPEC-WEB-003: <nội dung ngắn>`. Nếu spec cũ có chỗ mô tả `ActivityDetailModal` thì sửa/xoá chỗ đó (không để hai bản mâu thuẫn).
5. **Plan của màn cũ** (`...-plan.md`) — chỉ tăng version MINOR, `updated`, thêm dòng lịch sử: `Đợt 1 SPEC-WEB-003 đổi code liên quan; nội dung kế hoạch không đổi, xem spec tương ứng và SPEC-WEB-003 mục 4.1`.
6. **PLAN-HUB-001** — bump (ví dụ 2.10 → 2.11) và thêm dòng: `| 2.11 | 2026-10-09 | Đợt 1 của web/ (SPEC-WEB-003): Hoạt động | DYC |`.

Nếu tài liệu nào của màn cũ vừa được người khác chuyển sang `deprecated` hoặc thu hẹp `related_code` (không còn khớp), `docs:check` sẽ không đòi nữa: bỏ qua tài liệu đó.

- [ ] **Step 3: Cập nhật chỉ mục, commit, kiểm tra lần cuối**

```bash
npm run docs:index
git add -A docs
git commit -m "docs: web/ đợt 1 — Hoạt động

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
npm run test:tools
npm run docs:check -- --base origin/staging
```
Expected: xanh. Nếu `docs:check` đỏ, sửa đúng tài liệu nó nêu rồi commit bổ sung (không `--amend` commit đã push).

- [ ] **Step 4: Chạy bộ kiểm tra cuối của web/**

Run: `cd web && npm test && npx tsc --noEmit && npm run build`
Expected: xanh.

- [ ] **Step 5: Push và mở PR vào `staging`**

```bash
git push -u origin HEAD
gh pr create --base staging --title "web/: đợt 1 — Hoạt động (chi tiết, vòng duyệt, sửa, xoá, tham gia, cập nhật)" --body "$(cat <<'EOF'
## Tóm tắt
- Form tạo đề xuất đủ trường (thêm Trưởng BTC, kiểm link http/https), tạo xong chuyển tới trang chi tiết.
- Trang chi tiết `#/activity/:id`: thông tin chung, kế hoạch theo giai đoạn (Trước/Trong/Sau, "Chung" cho việc được giao), tài liệu theo việc, dòng thời gian cập nhật có gắn thẻ @, Tổ, người tham gia, chi tiết, lịch sử đề án.
- Vòng duyệt (duyệt, yêu cầu sửa, từ chối, nộp lại), sửa (admin mọi trường; người quản lý tập con), xoá (gõ lại tiêu đề), đăng ký tham gia, thêm người tham gia.
- Thẻ hoạt động ở danh sách và lịch bấm được; gỡ `ActivityDetailModal`.
- Phần việc trên trang hoạt động chỉ đọc; thao tác việc thuộc đợt 2.

## Kiểm tra
- `cd web && npm test && npx tsc --noEmit && npm run build`
- `npm run test:tools && npm run docs:check -- --base origin/staging`

Docs: đã cập nhật SPEC-WEB-003, DEV-FE-001, DEV-TEST-001, PLAN-HUB-001 và các tài liệu màn hình liên quan.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Lịch sử phiên bản

| Version | Ngày | Thay đổi | Người |
|---|---|---|---|
| 1.0 | 2026-10-09 | Bản đầu: kế hoạch đợt 1 (Hoạt động) của SPEC-WEB-003 | DYC |
| 1.1 | 2026-10-09 | Đính chính ma trận quyền ghi DYC/TCKT, Tổ lưu trữ và nhãn trách nhiệm mặc định | DYC |
