---
doc_id: PLAN-WEBP3-001
title: Kế hoạch triển khai — web/ đợt 3 (Tổ, thành viên, tài khoản, quản trị, trọng số, tài khoản của tôi)
version: 1.0
status: active
audience: [dev, ai]
owner: DYC
updated: 2026-10-09
related_code: []
---

# web/ đợt 3 — Tổ, thành viên, tài khoản Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Đưa `web/` ngang UI cũ ở nhóm Tổ (trang Tổ, tạo/sửa/xoá Tổ, thành viên Tổ), thành viên và tài khoản (tạo/sửa/xoá, nhập hàng loạt), màn Quản trị tài khoản `#accounts` kèm bộ trọng số, và hộp "Tài khoản của tôi" — mọi thứ ẩn/hiện theo đúng điều kiện của server.

**Architecture:** Thêm ba file API theo miền (`teams.ts`, `users.ts` mở rộng, `admin.ts` mới) với kiểu khai báo ngay trong file để không đụng `types.ts` (các đợt 1, 2, 4, 5 cũng sửa file đó). Thao tác ghi dùng `useMutation`; thành công thì gọi `invalidatePeople(qc)` (làm mới `core-teams`, `core-members`, mọi `core-team/*`, `core-bootstrap`). Modal dùng chung vỏ `FormDialog` (Atlaskit `Modal` + `<form>`). Quyền đọc qua `useCapabilities()`; chỉ khi cần id người đang đăng nhập mới dùng hook nhỏ `useCurrentUser()` đọc cache `SESSION_KEY`.

**Tech Stack:** React 18, TypeScript (strict, `noUnusedLocals`), Vite, Vitest + jsdom + @testing-library/react 14, @tanstack/react-query 5, react-router-dom 6.30, Atlaskit (`modal-dialog`, `button/new`, `textfield`, `textarea`, `lozenge`, `flag` qua `Toast`).

**Spec:** `docs/specs/2026-10-09-web-hoan-thien-thay-the-design.md` (SPEC-WEB-003, mục 4.3–4.5; mục 3.1, 3.4, 7). Đợt 0 đã xong (`docs/specs/2026-10-09-web-dot-0-nen-plan.md`).

## Global Constraints

- Chỉ tiếng Việt trong giao diện; không có nút đổi ngôn ngữ. Không làm ô tải tệp.
- Không đổi API Core, không chạm `core/` (đợt 3 không có task backend). Chỉ dùng endpoint có thật: `GET/POST /api/teams`, `PATCH/DELETE /api/teams/:id`, `GET /api/teams/:id/overview`, `GET/POST /api/teams/:id/members`, `PATCH/DELETE /api/teams/:id/members/:userId`, `GET /api/people`, `POST /api/users`, `PATCH/DELETE /api/users/:id`, `POST /api/users/bulk-import`, `PATCH /api/account`, `GET/POST /api/admin/weight-presets`, `PATCH/DELETE /api/admin/weight-presets/:id`.
- Điều kiện quyền bắt chước đúng route Core (server vẫn chặn cuối):
  - `admin` middleware = `isExec` (`admin`/`vice_admin` ở `user.role` hoặc vai trò đơn vị). `manager` = `isExec` hoặc `leader`/`vice_leader` (`caps.isManager`).
  - Tạo Tổ / xoá Tổ / đổi vai trò trong Tổ / nhập hàng loạt: chỉ `isExec`. Sửa Tổ: `isExec` sửa tên, mô tả, màu; Tổ trưởng/Tổ phó chỉ sửa màu. Xem `team/:id` và danh sách thành viên Tổ: `isExec` hoặc người quản lý Tổ đó.
  - Thêm thành viên Tổ: Tổ trưởng chỉ thêm tài khoản `role === 'member'`, vai trò Tổ luôn `member`. Xoá thành viên Tổ: `isExec`, hoặc Tổ trưởng với người `role === 'member'` không giữ cờ trưởng/phó; không bao giờ tự xoá mình. Đổi vai trò trong Tổ không áp cho tài khoản `admin`/`vice_admin`.
  - Tạo tài khoản: `caps.isManager`; Tổ trưởng chỉ tạo `member` trong Tổ mình quản lý. Sửa tài khoản: Tổ trưởng **không** gửi `email`/`password` (server trả 403 "Only administrators can change a password or email."). Xoá tài khoản: không có nút trên chính dòng của mình.
  - `#accounts` và bộ trọng số: `caps.isExec` (route khác thì về `#/dashboard`). Server của bộ trọng số còn có `settingGuard('weight_presets')`: 403 "Cấu hình này đang bị DYC khoá." kèm `reason`, `locked_by_name` phải hiện rõ.
- Lỗi API hiện qua `apiErrorMessage(err)`; câu tiếng Anh mới của Core thêm vào `errorMessages.ts` (Task 1). Không có `response` → "Không kết nối được máy chủ. Vui lòng thử lại."
- Thao tác ghi dùng `useMutation`; thành công thì `invalidatePeople(qc)` (đủ các key liên quan) và `useToast()`; test phải kiểm tra endpoint + body, ẩn/hiện theo quyền (một ca được, một ca bị chặn), lỗi tiếng Việt, và cache được làm mới (SPEC-WEB-003 mục 7).
- Trọng số preset là số nguyên 0–10 (cột `weight_presets.points` là `TINYINT UNSIGNED`, và trọng số tự ghi nhận cũng là số nguyên 0–10 — SPEC-WEB-003 mục 2). Không làm ô bước 0.5 như UI cũ.
- Link sang `/activity/:id` và `/task/:id` là route của đợt 1 và đợt 2; đợt 3 chỉ tạo `Link` tới đó. Chưa có route thì rơi vào "Không tìm thấy trang" cho tới khi các đợt kia merge (ghi vào mô tả PR).
- Đợt 3, 4, 5 làm song song trên cùng worktree: chỉ **thêm** vào `AppRoutes.tsx`, `PageLayout.tsx`, `main.tsx`, `errorMessages.ts`, `queryKeys.ts`, `api/index.ts`; không sắp xếp lại. Nếu file đã bị đợt khác sửa thì đọc lại bản hiện tại rồi chèn phần của mình (xung đột chỉ là thêm dòng cạnh nhau).
- Kiểm tra trước khi báo xong: `cd web && npm test && npx tsc --noEmit -p . && npm run build` xanh; `npm run docs:index && npm run docs:check -- --base origin/staging` xanh **sau khi commit**.
- Commit kết thúc bằng `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`. Chạy một file test: `cd web && npx vitest run <đường dẫn>`.

## Review Focus

- Tổ trưởng mở "Quản lý thành viên": không thấy ô đổi vai trò, danh sách thêm chỉ có thành viên thường, không có nút xoá cạnh chính mình, tổ trưởng/tổ phó khác, hay admin — test Task 3.
- Tổ trưởng gõ tay `#/team/<Tổ khác>` (server 403) → về Tổng quan kèm thông báo, không kẹt ở trang trống — test Task 4.
- Xoá Tổ mà server chỉ lưu trữ (`deactivated: true`) → báo "Đã lưu trữ Tổ.", xoá hẳn → "Đã xoá Tổ thành công."; Tổ còn hoạt động/việc → hiện nguyên văn câu lỗi tiếng Việt của server — test Task 2.
- Tổ trưởng sửa tài khoản: body không có `email` và `password` — test Task 5.
- Bộ trọng số bị DYC khoá: hiện banner có lý do và người khoá; điểm ngoài 0–10 hoặc số thập phân bị chặn ngay ở client — test Task 8.
- Gõ "nguyen" tìm ra "Nguyễn" trong bảng Quản trị tài khoản — test Task 6.
- Dán danh sách nhập hàng loạt có dòng trống, khoảng trắng thừa, dấu tab, tên có dấu phẩy — test Task 7.
- "Tài khoản của tôi" để trống mật khẩu: body không có `password`; email sai định dạng bị chặn trước khi gửi — test Task 9.

---

## File Structure

| File | Trách nhiệm |
|---|---|
| `web/src/core/api/errorMessages.ts` (sửa) | Thêm câu lỗi tiếng Anh của route Tổ/tài khoản |
| `web/src/core/api/teams.ts` (sửa) | Thêm overview, thành viên Tổ, tạo/sửa/xoá Tổ + kiểu |
| `web/src/core/api/users.ts` (sửa) | Thêm tạo/sửa/xoá tài khoản, nhập hàng loạt, `updateMyAccount` + kiểu |
| `web/src/core/api/admin.ts` (mới) | Bộ trọng số, `settingLock`, `settingErrorMessage` |
| `web/src/core/api/index.ts` (sửa) | Thêm `export * from './admin'` |
| `web/src/core/queryKeys.ts` (sửa) | `TEAMS_KEY`, `MEMBERS_KEY`, `TEAM_KEY_PREFIX`, `teamOverviewKey`, `teamMembersKey`, `WEIGHT_PRESETS_KEY` |
| `web/src/core/testing/peopleHarness.tsx` (mới) | `renderWithApp`: Query + Toast + MemoryRouter + session/bootstrap giả |
| `web/src/core/features/people/invalidate.ts` (mới) | `invalidatePeople(qc)` |
| `web/src/core/features/people/useCurrentUser.ts` (mới) | Người đang đăng nhập từ cache session |
| `web/src/core/features/people/FormField.tsx` (mới) | `FormField`, `FormError`, `selectStyle` |
| `web/src/core/features/people/FormDialog.tsx` (mới) | Vỏ modal có form, nút Huỷ/Lưu, vùng lỗi |
| `web/src/core/features/people/TeamCheckboxes.tsx` (mới) | Chọn nhiều Tổ bằng checkbox |
| `web/src/core/features/people/roleLabels.ts` (mới) | `getRoleLabel`, `getRoleStyle`, `ROLE_OPTIONS` (chuyển từ `MembersView`) |
| `web/src/core/features/people/bulkImport.ts` (mới) | `parseBulkImport(text)` |
| `web/src/core/features/teams/TeamCard.tsx` (mới) | Thẻ Tổ + nút thao tác |
| `web/src/core/features/teams/TeamFormModal.tsx` (mới) | Tạo/sửa Tổ |
| `web/src/core/features/teams/useDeleteTeam.ts` (mới) | Mutation xoá Tổ + thông báo xoá/lưu trữ |
| `web/src/core/features/teams/TeamMembersModal.tsx` (mới) | Thêm/đổi vai trò/xoá thành viên Tổ |
| `web/src/core/features/teams/TeamPage.tsx` (mới) | Trang Tổ `#team/:id` |
| `web/src/core/features/teams/TeamsView.tsx` (viết lại) | Danh sách Tổ + các thao tác |
| `web/src/core/features/members/CreateAccountModal.tsx` (mới) | Tạo tài khoản (cục bộ/SSO) |
| `web/src/core/features/members/EditAccountModal.tsx` (mới) | Sửa tài khoản |
| `web/src/core/features/members/DeleteAccountDialog.tsx` (mới) | Xác nhận + 3 thông báo kết quả xoá |
| `web/src/core/features/members/MembersView.tsx` (sửa) | Nút Tạo/Sửa/Xoá thật |
| `web/src/core/features/accounts/AccountsView.tsx` (mới) | Quản trị tài khoản `#accounts` |
| `web/src/core/features/accounts/BulkImportModal.tsx` (mới) | Nhập hàng loạt |
| `web/src/core/features/accounts/WeightPresetsPanel.tsx`, `WeightPresetModal.tsx` (mới) | Bộ trọng số |
| `web/src/core/features/session/MyAccountModal.tsx` (mới) | Tài khoản của tôi |
| `web/src/shared/layouts/PageLayout.tsx` (sửa) | Mục "Quản trị tài khoản" (admin), chip người dùng mở hộp tài khoản |
| `web/src/core/AppRoutes.tsx` (sửa) | Route `/team/:id`, `/accounts` |
| `web/src/core/main.tsx` (sửa) | Truyền `canViewAccounts`, `onOpenAccount`, gắn `MyAccountModal` |

---

### Task 1: Tầng API, câu lỗi, query key và khung test

**Files:**
- Modify: `web/src/core/api/errorMessages.ts`, `web/src/core/api/teams.ts`, `web/src/core/api/users.ts`, `web/src/core/api/index.ts`, `web/src/core/queryKeys.ts`
- Create: `web/src/core/api/admin.ts`, `web/src/core/features/people/invalidate.ts`, `web/src/core/features/people/useCurrentUser.ts`, `web/src/core/testing/peopleHarness.tsx`
- Test: `web/src/core/api/errorMessages.dot3.test.ts`, `web/src/core/api/teams.test.ts`, `web/src/core/api/users.test.ts`, `web/src/core/api/admin.test.ts`, `web/src/core/features/people/invalidate.test.ts`

**Interfaces:**
- Consumes: `apiClient` (`web/src/shared/utils/api.ts`), `TeamItem`, `MemberItem`, `SessionUser` (`api/types.ts`), `apiErrorMessage` (`api/errors.ts`), `SESSION_KEY`, `BOOTSTRAP_KEY`, `ToastProvider`.
- Produces (tất cả export qua `api/index.ts`):
  - `teams.ts`: `type TeamRole = 'member'|'vice_leader'|'leader'`; `TeamOverview { team; members; tasks; activities }`; `TeamMembersResponse { members: TeamMemberRow[]; available: TeamAvailableUser[] }`; `fetchTeamOverview(id)`, `fetchTeamMembers(id)`, `createTeam({name,description,color}): {id}`, `updateTeam(id, {name?,description?,color})`, `deleteTeam(id): {ok,deleted,deactivated}`, `addTeamMember(id,{user_id,team_role})`, `setTeamMemberRole(id,userId,team_role): {ok,role}`, `removeTeamMember(id,userId): {ok,role}`.
  - `users.ts`: `createUser(CreateUserPayload): {id}`, `updateUser(id, UpdateUserPayload)`, `deleteUser(id): DeleteUserResult`, `bulkImportUsers(rows): BulkImportResult`, `updateMyAccount(AccountPayload): SessionUser`.
  - `admin.ts`: `WeightPreset`, `WeightPresetPayload`, `fetchWeightPresets()`, `createWeightPreset(p)`, `updateWeightPreset(id,p)`, `deleteWeightPreset(id)`, `settingLock(err): SettingLock|null`, `settingErrorMessage(err): string`.
  - `queryKeys.ts`: `TEAMS_KEY=['core-teams']`, `MEMBERS_KEY=['core-members']`, `TEAM_KEY_PREFIX=['core-team']`, `teamOverviewKey(id)`, `teamMembersKey(id)`, `WEIGHT_PRESETS_KEY`.
  - `invalidatePeople(qc: QueryClient): Promise<unknown>`; `useCurrentUser(): SessionUser | null`.
  - `renderWithApp(ui, opts?)` → `{ qc, ...RenderResult }`; `opts`: `role`, `userId`, `path`, `routePath`, `teams`.

- [ ] **Step 1: Viết test hỏng**

```ts
// web/src/core/api/errorMessages.dot3.test.ts
import { describe, it, expect } from 'vitest';
import { translateServerError } from './errors';

describe('câu lỗi của route Tổ và tài khoản', () => {
  const cases: Array<[string, string]> = [
    ['You cannot manage this team.', 'Bạn không có quyền quản lý Tổ này.'],
    ['You cannot edit this team.', 'Bạn không có quyền sửa Tổ này.'],
    ['You cannot view this team overview.', 'Bạn không có quyền xem Tổ này.'],
    ['Team not found.', 'Không tìm thấy Tổ.'],
    ['Team name is required.', 'Vui lòng nhập tên Tổ.'],
    ['Choose a valid team color.', 'Màu của Tổ không hợp lệ.'],
    ['Choose a valid team role.', 'Vai trò trong Tổ không hợp lệ.'],
    ['Team membership not found.', 'Thành viên không thuộc Tổ này.'],
    ['User not found.', 'Không tìm thấy tài khoản.'],
    ['Team leaders and vice leaders may only add member accounts.', 'Tổ trưởng và Tổ phó chỉ được thêm tài khoản thành viên thường.'],
    ['You cannot edit this account.', 'Bạn không có quyền sửa tài khoản này.'],
    ['Account not found.', 'Không tìm thấy tài khoản.'],
    ['Only administrators can change a password or email.', 'Chỉ quản trị viên được đổi mật khẩu hoặc email.'],
    ['The account must remain in at least one team you lead.', 'Tài khoản phải còn thuộc ít nhất một Tổ do bạn phụ trách.'],
    ['A member must belong to at least one team.', 'Thành viên phải thuộc ít nhất một Tổ.'],
    ['Name, email and a valid avatar color are required.', 'Cần có tên, email và màu đại diện hợp lệ.'],
    ['You cannot delete your own signed-in account.', 'Bạn không thể xoá tài khoản đang đăng nhập.'],
    ['You cannot delete this account.', 'Bạn không có quyền xoá tài khoản này.'],
    ['A valid email and avatar color are required.', 'Cần có email và màu đại diện hợp lệ.'],
    ['Password must contain at least 8 characters.', 'Mật khẩu phải có ít nhất 8 ký tự.'],
  ];
  it.each(cases)('dịch "%s"', (english, vietnamese) => {
    expect(translateServerError(english)).toBe(vietnamese);
  });

  it('câu tiếng Việt server đã trả thì giữ nguyên', () => {
    expect(translateServerError('Cấu hình này đang bị DYC khoá.')).toBe('Cấu hình này đang bị DYC khoá.');
  });
});
```

```ts
// web/src/core/api/teams.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiClient } from '../../shared/utils/api';
import {
  fetchTeamOverview, fetchTeamMembers, createTeam, updateTeam, deleteTeam, addTeamMember, setTeamMemberRole, removeTeamMember,
} from './teams';

vi.mock('../../shared/utils/api', () => ({ apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() } }));

describe('api/teams', () => {
  beforeEach(() => vi.clearAllMocks());

  it('fetchTeamOverview: GET /teams/:id/overview', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: { team: { id: 3 }, members: [], tasks: [], activities: [] } });
    await expect(fetchTeamOverview(3)).resolves.toEqual({ team: { id: 3 }, members: [], tasks: [], activities: [] });
    expect(apiClient.get).toHaveBeenCalledWith('/teams/3/overview');
  });

  it('fetchTeamMembers: GET /teams/:id/members', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: { members: [], available: [] } });
    await fetchTeamMembers(3);
    expect(apiClient.get).toHaveBeenCalledWith('/teams/3/members');
  });

  it('createTeam: POST /teams với name, description, color', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { id: 9 } });
    await expect(createTeam({ name: 'Tổ mới', description: 'mô tả', color: '#1e3a8a' })).resolves.toEqual({ id: 9 });
    expect(apiClient.post).toHaveBeenCalledWith('/teams', { name: 'Tổ mới', description: 'mô tả', color: '#1e3a8a' });
  });

  it('updateTeam: PATCH /teams/:id', async () => {
    vi.mocked(apiClient.patch).mockResolvedValueOnce({ data: { ok: true } });
    await updateTeam(3, { color: '#ff0000' });
    expect(apiClient.patch).toHaveBeenCalledWith('/teams/3', { color: '#ff0000' });
  });

  it('deleteTeam: DELETE /teams/:id và trả cờ deactivated', async () => {
    vi.mocked(apiClient.delete).mockResolvedValueOnce({ data: { ok: true, deleted: false, deactivated: true } });
    await expect(deleteTeam(3)).resolves.toEqual({ ok: true, deleted: false, deactivated: true });
    expect(apiClient.delete).toHaveBeenCalledWith('/teams/3');
  });

  it('addTeamMember / setTeamMemberRole / removeTeamMember', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { ok: true } });
    await addTeamMember(3, { user_id: 7, team_role: 'member' });
    expect(apiClient.post).toHaveBeenCalledWith('/teams/3/members', { user_id: 7, team_role: 'member' });

    vi.mocked(apiClient.patch).mockResolvedValueOnce({ data: { ok: true, role: 'leader' } });
    await expect(setTeamMemberRole(3, 7, 'leader')).resolves.toEqual({ ok: true, role: 'leader' });
    expect(apiClient.patch).toHaveBeenCalledWith('/teams/3/members/7', { team_role: 'leader' });

    vi.mocked(apiClient.delete).mockResolvedValueOnce({ data: { ok: true, role: 'member' } });
    await removeTeamMember(3, 7);
    expect(apiClient.delete).toHaveBeenCalledWith('/teams/3/members/7');
  });
});
```

```ts
// web/src/core/api/users.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiClient } from '../../shared/utils/api';
import { createUser, updateUser, deleteUser, bulkImportUsers, updateMyAccount } from './users';

vi.mock('../../shared/utils/api', () => ({ apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() } }));

describe('api/users', () => {
  beforeEach(() => vi.clearAllMocks());

  it('createUser: POST /users', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { id: 5 } });
    const payload = { name: 'An', email: 'an@x.vn', role: 'member', auth_provider: 'local' as const, password: '12345678', team_ids: [1] };
    await expect(createUser(payload)).resolves.toEqual({ id: 5 });
    expect(apiClient.post).toHaveBeenCalledWith('/users', payload);
  });

  it('updateUser: PATCH /users/:id', async () => {
    vi.mocked(apiClient.patch).mockResolvedValueOnce({ data: { ok: true } });
    const payload = { name: 'An', phone: '', avatar_color: '#0052cc', role: 'member', team_ids: [1] };
    await updateUser(5, payload);
    expect(apiClient.patch).toHaveBeenCalledWith('/users/5', payload);
  });

  it('deleteUser: DELETE /users/:id và trả kết quả', async () => {
    vi.mocked(apiClient.delete).mockResolvedValueOnce({ data: { ok: true, deleted: false, deactivated: true } });
    await expect(deleteUser(5)).resolves.toEqual({ ok: true, deleted: false, deactivated: true });
    expect(apiClient.delete).toHaveBeenCalledWith('/users/5');
  });

  it('bulkImportUsers: POST /users/bulk-import {rows}', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { ok: true, created: 2, skipped: 1 } });
    await expect(bulkImportUsers([{ name: 'A', email: 'a@x.vn' }])).resolves.toEqual({ ok: true, created: 2, skipped: 1 });
    expect(apiClient.post).toHaveBeenCalledWith('/users/bulk-import', { rows: [{ name: 'A', email: 'a@x.vn' }] });
  });

  it('updateMyAccount: PATCH /account, trả user', async () => {
    vi.mocked(apiClient.patch).mockResolvedValueOnce({ data: { user: { id: 1, name: 'A', email: 'n@x.vn', role: 'member' } } });
    const user = await updateMyAccount({ email: 'n@x.vn', phone: '', avatar_color: '#0052cc' });
    expect(user.email).toBe('n@x.vn');
    expect(apiClient.patch).toHaveBeenCalledWith('/account', { email: 'n@x.vn', phone: '', avatar_color: '#0052cc' });
  });
});
```

```ts
// web/src/core/api/admin.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiClient } from '../../shared/utils/api';
import {
  fetchWeightPresets, createWeightPreset, updateWeightPreset, deleteWeightPreset, settingLock, settingErrorMessage,
} from './admin';

vi.mock('../../shared/utils/api', () => ({ apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() } }));

const locked = {
  response: { status: 403, data: { error: 'Cấu hình này đang bị DYC khoá.', locked: true, reason: 'Đang rà soát', locked_by_name: 'Nguyễn DYC' } },
};

describe('api/admin', () => {
  beforeEach(() => vi.clearAllMocks());

  it('gọi đúng endpoint /admin/weight-presets', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: [] });
    await fetchWeightPresets();
    expect(apiClient.get).toHaveBeenCalledWith('/admin/weight-presets');

    const body = { name: 'Cơ bản', points: 3, sort_order: 1, description: 'mô tả' };
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { id: 1, ...body, is_active: 1 } });
    await createWeightPreset(body);
    expect(apiClient.post).toHaveBeenCalledWith('/admin/weight-presets', body);

    vi.mocked(apiClient.patch).mockResolvedValueOnce({ data: { ok: true } });
    await updateWeightPreset(1, { ...body, is_active: false });
    expect(apiClient.patch).toHaveBeenCalledWith('/admin/weight-presets/1', { ...body, is_active: false });

    vi.mocked(apiClient.delete).mockResolvedValueOnce({ data: { ok: true, deleted: true } });
    await deleteWeightPreset(1);
    expect(apiClient.delete).toHaveBeenCalledWith('/admin/weight-presets/1');
  });

  it('settingLock nhận ra 403 bị khoá và lấy lý do, người khoá', () => {
    expect(settingLock(locked)).toEqual({ message: 'Cấu hình này đang bị DYC khoá.', reason: 'Đang rà soát', lockedBy: 'Nguyễn DYC' });
  });

  it('settingLock trả null với lỗi khác', () => {
    expect(settingLock({ response: { status: 403, data: { error: 'Bạn không có quyền với cấu hình này.' } } })).toBeNull();
    expect(settingLock(new Error('x'))).toBeNull();
  });

  it('settingErrorMessage ghép lý do khi bị khoá, còn lại dùng apiErrorMessage', () => {
    expect(settingErrorMessage(locked)).toBe('Cấu hình này đang bị DYC khoá. Lý do: Đang rà soát. Người khoá: Nguyễn DYC.');
    expect(settingErrorMessage({ response: { status: 404, data: { error: 'Preset không tồn tại.' } } })).toBe('Preset không tồn tại.');
    expect(settingErrorMessage(new Error('Network Error'))).toBe('Không kết nối được máy chủ. Vui lòng thử lại.');
  });
});
```

```ts
// web/src/core/features/people/invalidate.test.ts
import { describe, it, expect, vi } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import { invalidatePeople } from './invalidate';

describe('invalidatePeople', () => {
  it('làm mới Tổ, thành viên, mọi trang Tổ và bootstrap', async () => {
    const qc = new QueryClient();
    const spy = vi.spyOn(qc, 'invalidateQueries').mockResolvedValue(undefined);
    await invalidatePeople(qc);
    const keys = spy.mock.calls.map((c) => (c[0] as { queryKey: readonly unknown[] }).queryKey);
    expect(keys).toEqual([['core-teams'], ['core-members'], ['core-team'], ['core-bootstrap']]);
  });
});
```

- [ ] **Step 2: Chạy, xác nhận hỏng**

Run: `cd web && npx vitest run src/core/api src/core/features/people` — Expected: FAIL (thiếu `./admin`, các hàm mới, `./invalidate`).

- [ ] **Step 3: Viết code**

Thêm vào **cuối** object `VI_ERROR_MESSAGES` trong `web/src/core/api/errorMessages.ts` (trước dấu `};` cuối):

```ts
  // Tổ, thành viên Tổ, tài khoản (đợt 3)
  'You cannot manage this team.': 'Bạn không có quyền quản lý Tổ này.',
  'You cannot edit this team.': 'Bạn không có quyền sửa Tổ này.',
  'You cannot view this team overview.': 'Bạn không có quyền xem Tổ này.',
  'Team not found.': 'Không tìm thấy Tổ.',
  'Team name is required.': 'Vui lòng nhập tên Tổ.',
  'Choose a valid team color.': 'Màu của Tổ không hợp lệ.',
  'Choose a valid team role.': 'Vai trò trong Tổ không hợp lệ.',
  'Team membership not found.': 'Thành viên không thuộc Tổ này.',
  'User not found.': 'Không tìm thấy tài khoản.',
  'Team leaders and vice leaders may only add member accounts.':
    'Tổ trưởng và Tổ phó chỉ được thêm tài khoản thành viên thường.',
  'You cannot edit this account.': 'Bạn không có quyền sửa tài khoản này.',
  'Account not found.': 'Không tìm thấy tài khoản.',
  'Only administrators can change a password or email.': 'Chỉ quản trị viên được đổi mật khẩu hoặc email.',
  'The account must remain in at least one team you lead.':
    'Tài khoản phải còn thuộc ít nhất một Tổ do bạn phụ trách.',
  'A member must belong to at least one team.': 'Thành viên phải thuộc ít nhất một Tổ.',
  'Name, email and a valid avatar color are required.': 'Cần có tên, email và màu đại diện hợp lệ.',
  'You cannot delete your own signed-in account.': 'Bạn không thể xoá tài khoản đang đăng nhập.',
  'You cannot delete this account.': 'Bạn không có quyền xoá tài khoản này.',
  'A valid email and avatar color are required.': 'Cần có email và màu đại diện hợp lệ.',
  'Password must contain at least 8 characters.': 'Mật khẩu phải có ít nhất 8 ký tự.',
```

Thay toàn bộ `web/src/core/api/teams.ts`:

```ts
import { apiClient } from '../../shared/utils/api';
import type { TeamItem } from './types';

export type TeamRole = 'member' | 'vice_leader' | 'leader';

export interface TeamOverviewTeam extends TeamItem {
  member_count: number;
  open_tasks: number;
  done_tasks: number;
  overdue_tasks: number;
}

export interface TeamOverviewMember {
  id: number;
  name: string;
  email: string;
  role: string;
  avatar_color?: string;
  is_lead: number | boolean;
  is_vice_lead: number | boolean;
  open_tasks: number;
  done_tasks: number;
}

export interface TeamOverviewTask {
  id: number;
  title: string;
  status: string;
  deadline: string;
  activity_title?: string;
  assignee_name?: string | null;
}

export interface TeamOverviewActivity {
  id: number;
  title: string;
  status: string;
  deadline: string;
  role?: string;
  task_count: number;
  done_count: number;
}

export interface TeamOverview {
  team: TeamOverviewTeam;
  members: TeamOverviewMember[];
  tasks: TeamOverviewTask[];
  activities: TeamOverviewActivity[];
}

export interface TeamMemberRow {
  id: number;
  name: string;
  email: string;
  role: string;
  avatar_color?: string;
  is_lead: number | boolean;
  is_vice_lead: number | boolean;
}

export interface TeamAvailableUser {
  id: number;
  name: string;
  email: string;
  role: string;
}

export interface TeamMembersResponse {
  members: TeamMemberRow[];
  available: TeamAvailableUser[];
}

export interface TeamFormPayload {
  name?: string;
  description?: string;
  color: string;
}

export interface DeleteTeamResult {
  ok: boolean;
  deleted: boolean;
  deactivated: boolean;
}

/**
 * Fetch active teams list with member counts.
 * Endpoint: GET /api/teams
 */
export async function fetchTeams(): Promise<TeamItem[]> {
  const response = await apiClient.get<TeamItem[]>('/teams');
  return response.data;
}

/** Trang Tổ: số liệu, việc, hoạt động, thành viên. Chỉ admin hoặc Tổ trưởng/Tổ phó của Tổ. Endpoint: GET /api/teams/:id/overview */
export async function fetchTeamOverview(teamId: number): Promise<TeamOverview> {
  const response = await apiClient.get<TeamOverview>(`/teams/${teamId}/overview`);
  return response.data;
}

/** Thành viên Tổ và danh sách tài khoản có thể thêm. Endpoint: GET /api/teams/:id/members */
export async function fetchTeamMembers(teamId: number): Promise<TeamMembersResponse> {
  const response = await apiClient.get<TeamMembersResponse>(`/teams/${teamId}/members`);
  return response.data;
}

/** Tạo Tổ (chỉ admin). Endpoint: POST /api/teams */
export async function createTeam(payload: { name: string; description: string; color: string }): Promise<{ id: number }> {
  const response = await apiClient.post<{ id: number }>('/teams', payload);
  return response.data;
}

/** Sửa Tổ: admin sửa tên, mô tả, màu; Tổ trưởng chỉ màu. Endpoint: PATCH /api/teams/:id */
export async function updateTeam(teamId: number, payload: TeamFormPayload): Promise<{ ok: boolean }> {
  const response = await apiClient.patch<{ ok: boolean }>(`/teams/${teamId}`, payload);
  return response.data;
}

/** Xoá Tổ (chỉ admin); server có thể chỉ lưu trữ. Endpoint: DELETE /api/teams/:id */
export async function deleteTeam(teamId: number): Promise<DeleteTeamResult> {
  const response = await apiClient.delete<DeleteTeamResult>(`/teams/${teamId}`);
  return response.data;
}

/** Thêm thành viên vào Tổ. Endpoint: POST /api/teams/:id/members */
export async function addTeamMember(teamId: number, payload: { user_id: number; team_role: TeamRole }): Promise<{ ok: boolean }> {
  const response = await apiClient.post<{ ok: boolean }>(`/teams/${teamId}/members`, payload);
  return response.data;
}

/** Đổi vai trò trong Tổ (chỉ admin). Endpoint: PATCH /api/teams/:id/members/:userId */
export async function setTeamMemberRole(teamId: number, userId: number, teamRole: TeamRole): Promise<{ ok: boolean; role: string }> {
  const response = await apiClient.patch<{ ok: boolean; role: string }>(`/teams/${teamId}/members/${userId}`, { team_role: teamRole });
  return response.data;
}

/** Xoá thành viên khỏi Tổ. Endpoint: DELETE /api/teams/:id/members/:userId */
export async function removeTeamMember(teamId: number, userId: number): Promise<{ ok: boolean; role: string }> {
  const response = await apiClient.delete<{ ok: boolean; role: string }>(`/teams/${teamId}/members/${userId}`);
  return response.data;
}
```

Thay toàn bộ `web/src/core/api/users.ts`:

```ts
import { apiClient } from '../../shared/utils/api';
import type { MemberItem, SessionUser } from './types';

export interface CreateUserPayload {
  name: string;
  email: string;
  role: string;
  phone?: string;
  auth_provider: 'local' | 'microsoft';
  /** Bắt buộc khi `auth_provider === 'local'`; bỏ hẳn khi SSO. */
  password?: string;
  team_ids: number[];
}

export interface UpdateUserPayload {
  name: string;
  phone: string;
  avatar_color: string;
  role: string;
  team_ids: number[];
  /** Chỉ admin được gửi hai field này. */
  email?: string;
  password?: string;
}

export interface DeleteUserResult {
  ok: boolean;
  deleted: boolean;
  deactivated?: boolean;
  removed_from_managed_teams?: boolean;
}

export interface BulkImportRow {
  name: string;
  email: string;
}

export interface BulkImportResult {
  ok: boolean;
  created: number;
  skipped: number;
}

export interface AccountPayload {
  email: string;
  phone: string;
  avatar_color: string;
  password?: string;
}

/**
 * Fetch member directory list within current user's scope.
 * Endpoint: GET /api/people
 */
export async function fetchMembers(): Promise<MemberItem[]> {
  const response = await apiClient.get<MemberItem[]>('/people');
  return response.data;
}

/** Tạo tài khoản (quản lý). Endpoint: POST /api/users */
export async function createUser(payload: CreateUserPayload): Promise<{ id: number }> {
  const response = await apiClient.post<{ id: number }>('/users', payload);
  return response.data;
}

/** Sửa tài khoản. Endpoint: PATCH /api/users/:id */
export async function updateUser(userId: number, payload: UpdateUserPayload): Promise<{ ok: boolean }> {
  const response = await apiClient.patch<{ ok: boolean }>(`/users/${userId}`, payload);
  return response.data;
}

/** Xoá tài khoản: xoá hẳn, vô hiệu hoá hoặc chỉ gỡ khỏi Tổ của mình. Endpoint: DELETE /api/users/:id */
export async function deleteUser(userId: number): Promise<DeleteUserResult> {
  const response = await apiClient.delete<DeleteUserResult>(`/users/${userId}`);
  return response.data;
}

/** Nhập hàng loạt (chỉ admin). Endpoint: POST /api/users/bulk-import */
export async function bulkImportUsers(rows: BulkImportRow[]): Promise<BulkImportResult> {
  const response = await apiClient.post<BulkImportResult>('/users/bulk-import', { rows });
  return response.data;
}

/** Tài khoản của tôi. Mật khẩu để trống = giữ nguyên (đừng gửi `password`). Endpoint: PATCH /api/account */
export async function updateMyAccount(payload: AccountPayload): Promise<SessionUser> {
  const response = await apiClient.patch<{ user: SessionUser }>('/account', payload);
  return response.data.user;
}
```

Tạo `web/src/core/api/admin.ts`:

```ts
import { apiClient } from '../../shared/utils/api';
import { apiErrorMessage } from './errors';

export interface WeightPreset {
  id: number;
  name: string;
  points: number | string;
  description: string | null;
  sort_order: number;
  is_active: number | boolean;
}

export interface WeightPresetPayload {
  name: string;
  points: number;
  sort_order: number;
  description: string;
  /** Chỉ gửi khi sửa. */
  is_active?: boolean;
}

export interface SettingLock {
  message: string;
  reason: string | null;
  lockedBy: string | null;
}

/** Tất cả preset kể cả đã tắt. Endpoint: GET /api/admin/weight-presets (settingGuard) */
export async function fetchWeightPresets(): Promise<WeightPreset[]> {
  const response = await apiClient.get<WeightPreset[]>('/admin/weight-presets');
  return response.data;
}

export async function createWeightPreset(payload: WeightPresetPayload): Promise<WeightPreset> {
  const response = await apiClient.post<WeightPreset>('/admin/weight-presets', payload);
  return response.data;
}

export async function updateWeightPreset(id: number, payload: WeightPresetPayload): Promise<{ ok: boolean }> {
  const response = await apiClient.patch<{ ok: boolean }>(`/admin/weight-presets/${id}`, payload);
  return response.data;
}

export async function deleteWeightPreset(id: number): Promise<{ ok: boolean; deleted: boolean }> {
  const response = await apiClient.delete<{ ok: boolean; deleted: boolean }>(`/admin/weight-presets/${id}`);
  return response.data;
}

/** 403 `locked: true` của `settingGuard` (core/src/middleware/setting-guard.js); lỗi khác trả null. */
export function settingLock(err: unknown): SettingLock | null {
  const response = (err as { response?: { status?: number; data?: Record<string, unknown> } } | null)?.response;
  if (!response || response.status !== 403 || response.data?.locked !== true) return null;
  const error = response.data.error;
  const reason = response.data.reason;
  const lockedBy = response.data.locked_by_name;
  return {
    message: typeof error === 'string' && error ? error : 'Cấu hình này đang bị khoá.',
    reason: typeof reason === 'string' && reason ? reason : null,
    lockedBy: typeof lockedBy === 'string' && lockedBy ? lockedBy : null,
  };
}

/** Câu lỗi cho thao tác trên cấu hình: bị khoá thì kèm lý do và người khoá. */
export function settingErrorMessage(err: unknown): string {
  const lock = settingLock(err);
  if (!lock) return apiErrorMessage(err);
  return `${lock.message}${lock.reason ? ` Lý do: ${lock.reason}.` : ''}${lock.lockedBy ? ` Người khoá: ${lock.lockedBy}.` : ''}`;
}
```

`web/src/core/api/index.ts`: thêm dòng `export * from './admin';` cuối file.

`web/src/core/queryKeys.ts`: thêm (nếu đợt khác đã khai báo cùng tên với cùng giá trị thì giữ một bản):

```ts
export const TEAMS_KEY = ['core-teams'] as const;
export const MEMBERS_KEY = ['core-members'] as const;
export const TEAM_KEY_PREFIX = ['core-team'] as const;
export const teamOverviewKey = (teamId: number) => ['core-team', teamId, 'overview'] as const;
export const teamMembersKey = (teamId: number) => ['core-team', teamId, 'members'] as const;
export const WEIGHT_PRESETS_KEY = ['core-weight-presets'] as const;
```

`web/src/core/features/people/invalidate.ts`:

```ts
import type { QueryClient } from '@tanstack/react-query';
import { BOOTSTRAP_KEY, MEMBERS_KEY, TEAMS_KEY, TEAM_KEY_PREFIX } from '../../queryKeys';

/** Sau mọi thay đổi về Tổ, thành viên, tài khoản: làm mới mọi nơi đang hiện các dữ liệu đó. */
export function invalidatePeople(queryClient: QueryClient): Promise<unknown> {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: TEAMS_KEY }),
    queryClient.invalidateQueries({ queryKey: MEMBERS_KEY }),
    queryClient.invalidateQueries({ queryKey: TEAM_KEY_PREFIX }),
    queryClient.invalidateQueries({ queryKey: BOOTSTRAP_KEY }),
  ]);
}
```

`web/src/core/features/people/useCurrentUser.ts`:

```ts
import { useQuery } from '@tanstack/react-query';
import { fetchSession, type SessionUser } from '../../api';
import { SESSION_KEY } from '../../queryKeys';

/** Người đang đăng nhập (đọc cache session). Dùng để ẩn nút "xoá chính mình". */
export function useCurrentUser(): SessionUser | null {
  const { data } = useQuery({ queryKey: SESSION_KEY, queryFn: fetchSession });
  return data?.user ?? null;
}
```

`web/src/core/testing/peopleHarness.tsx`:

```tsx
import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastProvider } from '../../shared/components/Toast';
import { BOOTSTRAP_KEY, SESSION_KEY } from '../queryKeys';

export interface HarnessTeam {
  id: number;
  name: string;
  can_manage?: boolean;
}

export interface HarnessOptions {
  role?: string;
  userId?: number;
  /** Đường dẫn ban đầu của MemoryRouter. */
  path?: string;
  /** Pattern route để gắn `ui` (vd. '/team/:id'). Mặc định '*'. */
  routePath?: string;
  /** Tổ trong bootstrap (nguồn của `caps.canManageTeam`). */
  teams?: HarnessTeam[];
}

const LocationProbe = () => <div data-testid="path">{useLocation().pathname}</div>;

/** Dựng Query + Toast + Router với session và bootstrap giả để màn hình đọc quyền qua `useCapabilities()`. */
export function renderWithApp(ui: React.ReactElement, options: HarnessOptions = {}) {
  const { role = 'member', userId = 1, path = '/', routePath = '*', teams = [] } = options;
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity }, mutations: { retry: false } },
  });
  qc.setQueryData(SESSION_KEY, {
    user: { id: userId, name: 'Tôi', email: 'toi@x.vn', role, phone: null, avatar_color: '#0052cc' },
    units: { current: null, memberships: [] },
  });
  qc.setQueryData(BOOTSTRAP_KEY, {
    stats: { activeActivities: 0, openTasks: 0, overdueTasks: 0, completedMonth: 0 },
    upcoming: [],
    tasks: [],
    activity: [],
    teams,
    capabilities: { canCreateActivity: false, canCreateAccount: false },
  });
  const utils = render(
    <QueryClientProvider client={qc}>
      <ToastProvider>
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route path={routePath} element={ui} />
          </Routes>
          <LocationProbe />
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>
  );
  return { qc, ...utils };
}
```

- [ ] **Step 4: Chạy**

Run: `cd web && npx vitest run src/core/api src/core/features/people && npx tsc --noEmit -p .` — Expected: PASS, không lỗi kiểu (toàn bộ `src/core/api` test cũ vẫn xanh).

- [ ] **Step 5: Commit**

```bash
git add web/src/core/api web/src/core/queryKeys.ts web/src/core/features/people web/src/core/testing
git commit -m "feat(web): tầng API Tổ, tài khoản, trọng số và khung test đợt 3"
```

---

### Task 2: Tổ — danh sách, tạo, sửa, xoá

**Files:**
- Create: `web/src/core/features/people/FormField.tsx`, `web/src/core/features/people/FormDialog.tsx`, `web/src/core/features/teams/TeamFormModal.tsx`, `web/src/core/features/teams/useDeleteTeam.ts`, `web/src/core/features/teams/TeamCard.tsx`
- Modify (viết lại): `web/src/core/features/teams/TeamsView.tsx`
- Modify (viết lại): `web/src/core/features/teams/TeamsView.test.tsx`

**Interfaces:**
- Consumes: Task 1 (`createTeam`, `updateTeam`, `deleteTeam`, `invalidatePeople`, `TEAMS_KEY`, `renderWithApp`), `useCapabilities`, `useToast`, `ConfirmDialog`.
- Produces: `FormField({label, htmlFor, hint?, children})`, `FormError({message})`, `selectStyle`; `FormDialog({title, submitLabel, isSubmitting, error?, onSubmit, onClose, width?, children})`; `TeamFormModal({isOpen, team?, onClose})`; `useDeleteTeam(onDeleted?)` (trả `UseMutationResult`, `mutate(teamId)`); `TeamCard`; `TeamsView` mới (còn nhận `managing` ở Task 3).

- [ ] **Step 1: Viết test hỏng** — thay toàn bộ `TeamsView.test.tsx`:

```tsx
import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { TeamsView } from './TeamsView';
import * as api from '../../api';
import { renderWithApp } from '../../testing/peopleHarness';

vi.mock('../../api', async () => {
  const actual = await vi.importActual<typeof import('../../api')>('../../api');
  return { ...actual, fetchTeams: vi.fn(), createTeam: vi.fn(), updateTeam: vi.fn(), deleteTeam: vi.fn(), fetchTeamMembers: vi.fn() };
});

const mockTeams: api.TeamItem[] = [
  { id: 1, name: 'Tổ A', description: 'Mô tả A', color: '#0052cc', member_count: 8, active_count: 3, can_manage: true },
  { id: 2, name: 'Tổ B', description: 'Mô tả B', color: '#36b37e', member_count: 12, active_count: 5, can_manage: false },
];
const harnessTeams = [{ id: 1, name: 'Tổ A', can_manage: true }, { id: 2, name: 'Tổ B', can_manage: false }];

describe('TeamsView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.fetchTeams).mockResolvedValue(mockTeams);
  });
  afterEach(cleanup);

  it('hiện tiêu đề và danh sách Tổ từ API', async () => {
    renderWithApp(<TeamsView />);
    expect(screen.getByText('Những con người và đơn vị cùng tạo nên các hoạt động.')).toBeDefined();
    expect(await screen.findByText('Tổ A')).toBeDefined();
    expect(screen.getByText('Tổ B')).toBeDefined();
    expect(screen.getByText('8')).toBeDefined();
  });

  it('thành viên thường: không có nút thao tác nào và tên Tổ không là link', async () => {
    renderWithApp(<TeamsView />, { role: 'member', teams: [] });
    await screen.findByText('Tổ A');
    expect(screen.queryAllByRole('button').length).toBe(0);
    expect(screen.queryAllByRole('link').length).toBe(0);
  });

  it('Tổ trưởng: chỉ Tổ mình quản lý có Sửa, Quản lý thành viên, link tới trang Tổ; không có Tạo Tổ, Xoá', async () => {
    renderWithApp(<TeamsView />, { role: 'leader', teams: harnessTeams });
    await screen.findByText('Tổ A');
    expect(screen.getByRole('button', { name: 'Sửa Tổ A' })).toBeDefined();
    expect(screen.queryByRole('button', { name: 'Sửa Tổ B' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Quản lý thành viên Tổ A' })).toBeDefined();
    expect(screen.getByRole('link', { name: 'Tổ A' }).getAttribute('href')).toBe('/team/1');
    expect(screen.queryByRole('button', { name: 'Tạo Tổ' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Xoá Tổ A' })).toBeNull();
  });

  it('admin tạo Tổ: POST đúng body, làm mới cache, báo thành công', async () => {
    vi.mocked(api.createTeam).mockResolvedValueOnce({ id: 9 });
    const { qc } = renderWithApp(<TeamsView />, { role: 'admin' });
    const spy = vi.spyOn(qc, 'invalidateQueries').mockResolvedValue(undefined);
    await screen.findByText('Tổ A');
    fireEvent.click(screen.getByRole('button', { name: 'Tạo Tổ' }));
    fireEvent.change(await screen.findByLabelText('Tên Tổ'), { target: { value: '  Tổ mới ' } });
    fireEvent.change(screen.getByLabelText('Mô tả'), { target: { value: 'Mô tả mới' } });
    fireEvent.click(screen.getByRole('button', { name: 'Tạo' }));
    await waitFor(() =>
      expect(api.createTeam).toHaveBeenCalledWith({ name: 'Tổ mới', description: 'Mô tả mới', color: '#1e3a8a' })
    );
    await waitFor(() => expect(spy).toHaveBeenCalledWith({ queryKey: ['core-teams'] }));
    expect(spy).toHaveBeenCalledWith({ queryKey: ['core-bootstrap'] });
    expect(await screen.findByText('Đã tạo Tổ.')).toBeDefined();
  });

  it('tạo Tổ thiếu tên: báo lỗi ngay, không gọi API', async () => {
    renderWithApp(<TeamsView />, { role: 'admin' });
    await screen.findByText('Tổ A');
    fireEvent.click(screen.getByRole('button', { name: 'Tạo Tổ' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Tạo' }));
    expect(await screen.findByText('Vui lòng nhập tên Tổ.')).toBeDefined();
    expect(api.createTeam).not.toHaveBeenCalled();
  });

  it('lỗi mất kết nối khi tạo Tổ hiện tiếng Việt trong hộp', async () => {
    vi.mocked(api.createTeam).mockRejectedValueOnce(new Error('Network Error'));
    renderWithApp(<TeamsView />, { role: 'admin' });
    await screen.findByText('Tổ A');
    fireEvent.click(screen.getByRole('button', { name: 'Tạo Tổ' }));
    fireEvent.change(await screen.findByLabelText('Tên Tổ'), { target: { value: 'X' } });
    fireEvent.click(screen.getByRole('button', { name: 'Tạo' }));
    expect(await screen.findByText('Không kết nối được máy chủ. Vui lòng thử lại.')).toBeDefined();
  });

  it('admin sửa Tổ: gửi cả tên, mô tả và màu', async () => {
    vi.mocked(api.updateTeam).mockResolvedValueOnce({ ok: true });
    renderWithApp(<TeamsView />, { role: 'admin' });
    await screen.findByText('Tổ A');
    fireEvent.click(screen.getByRole('button', { name: 'Sửa Tổ A' }));
    const name = await screen.findByLabelText('Tên Tổ');
    expect((name as HTMLInputElement).value).toBe('Tổ A');
    fireEvent.change(name, { target: { value: 'Tổ A mới' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lưu' }));
    await waitFor(() =>
      expect(api.updateTeam).toHaveBeenCalledWith(1, { name: 'Tổ A mới', description: 'Mô tả A', color: '#0052cc' })
    );
    expect(await screen.findByText('Đã cập nhật Tổ.')).toBeDefined();
  });

  it('Tổ trưởng sửa Tổ: chỉ có ô màu, body chỉ có color', async () => {
    vi.mocked(api.updateTeam).mockResolvedValueOnce({ ok: true });
    renderWithApp(<TeamsView />, { role: 'leader', teams: harnessTeams });
    await screen.findByText('Tổ A');
    fireEvent.click(screen.getByRole('button', { name: 'Sửa Tổ A' }));
    const color = await screen.findByLabelText('Màu của Tổ');
    expect(screen.queryByLabelText('Tên Tổ')).toBeNull();
    fireEvent.change(color, { target: { value: '#ff0000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lưu' }));
    await waitFor(() => expect(api.updateTeam).toHaveBeenCalledWith(1, { color: '#ff0000' }));
  });

  it('xoá Tổ phải xác nhận; xoá hẳn báo "Đã xoá Tổ thành công."', async () => {
    vi.mocked(api.deleteTeam).mockResolvedValueOnce({ ok: true, deleted: true, deactivated: false });
    const { qc } = renderWithApp(<TeamsView />, { role: 'admin' });
    const spy = vi.spyOn(qc, 'invalidateQueries').mockResolvedValue(undefined);
    await screen.findByText('Tổ A');
    fireEvent.click(screen.getByRole('button', { name: 'Xoá Tổ A' }));
    expect(api.deleteTeam).not.toHaveBeenCalled();
    fireEvent.click(await screen.findByRole('button', { name: 'Xoá Tổ' }));
    await waitFor(() => expect(api.deleteTeam).toHaveBeenCalledWith(1));
    expect(await screen.findByText('Đã xoá Tổ thành công.')).toBeDefined();
    await waitFor(() => expect(spy).toHaveBeenCalledWith({ queryKey: ['core-teams'] }));
  });

  it('server chỉ lưu trữ Tổ thì báo "Đã lưu trữ Tổ."', async () => {
    vi.mocked(api.deleteTeam).mockResolvedValueOnce({ ok: true, deleted: false, deactivated: true });
    renderWithApp(<TeamsView />, { role: 'admin' });
    await screen.findByText('Tổ A');
    fireEvent.click(screen.getByRole('button', { name: 'Xoá Tổ A' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Xoá Tổ' }));
    expect(await screen.findByText('Đã lưu trữ Tổ.')).toBeDefined();
  });

  it('Tổ còn hoạt động đang diễn ra: hiện nguyên văn câu lỗi tiếng Việt của server', async () => {
    const message = 'Không thể xóa Tổ đang có hoạt động đang diễn ra. Vui lòng kết thúc hoặc chuyển giao hoạt động trước.';
    vi.mocked(api.deleteTeam).mockRejectedValueOnce({ response: { status: 400, data: { error: message } } });
    renderWithApp(<TeamsView />, { role: 'admin' });
    await screen.findByText('Tổ A');
    fireEvent.click(screen.getByRole('button', { name: 'Xoá Tổ A' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Xoá Tổ' }));
    expect(await screen.findByText(message)).toBeDefined();
  });

  it('danh sách rỗng hiện trạng thái trống, không có icon checkbox', async () => {
    vi.mocked(api.fetchTeams).mockResolvedValue([]);
    const { container } = renderWithApp(<TeamsView />);
    expect(await screen.findByText('Chưa có tổ nào')).toBeDefined();
    expect(container.querySelector('input[type="checkbox"]')).toBeNull();
  });
});
```

- [ ] **Step 2: Chạy, xác nhận hỏng**

Run: `cd web && npx vitest run src/core/features/teams/TeamsView.test.tsx` — Expected: FAIL (không có nút/Link mới).

- [ ] **Step 3: Viết code**

`web/src/core/features/people/FormField.tsx`:

```tsx
import React from 'react';
import { token } from '@atlaskit/tokens';

export const selectStyle: React.CSSProperties = {
  width: '100%',
  height: 32,
  padding: '0 8px',
  borderRadius: 3,
  border: `1px solid ${token('color.border', '#DFE1E6')}`,
  background: token('elevation.surface', '#fff'),
  color: token('color.text', '#172B4D'),
};

export const FormField: React.FC<{ label: string; htmlFor: string; hint?: string; children: React.ReactNode }> = ({
  label, htmlFor, hint, children,
}) => (
  <div style={{ marginBottom: 12 }}>
    <label htmlFor={htmlFor} style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: token('color.text.subtle', '#5E6C84') }}>
      {label}
    </label>
    {children}
    {hint && <div style={{ fontSize: 12, marginTop: 4, color: token('color.text.subtle', '#5E6C84') }}>{hint}</div>}
  </div>
);

export const FormError: React.FC<{ message?: string }> = ({ message }) =>
  message ? (
    <p role="alert" style={{ margin: '8px 0 0', color: token('color.text.danger', '#AE2E24') }}>{message}</p>
  ) : null;
```

`web/src/core/features/people/FormDialog.tsx`:

```tsx
import React from 'react';
import Modal, { ModalBody, ModalFooter, ModalHeader, ModalTitle } from '@atlaskit/modal-dialog';
import Button from '@atlaskit/button/new';
import { FormError } from './FormField';

export interface FormDialogProps {
  title: string;
  submitLabel: string;
  isSubmitting?: boolean;
  error?: string;
  onSubmit: () => void;
  onClose: () => void;
  width?: 'small' | 'medium' | 'large';
  children: React.ReactNode;
}

/** Vỏ modal có form: Enter hoặc nút gửi gọi `onSubmit`; lỗi hiện ngay trong hộp để người dùng sửa tiếp. Bọc ngoài bằng `ModalTransition`. */
export const FormDialog: React.FC<FormDialogProps> = ({
  title, submitLabel, isSubmitting = false, error, onSubmit, onClose, width = 'medium', children,
}) => (
  <Modal onClose={onClose} width={width}>
    <form noValidate onSubmit={(e) => { e.preventDefault(); onSubmit(); }}>
      <ModalHeader><ModalTitle>{title}</ModalTitle></ModalHeader>
      <ModalBody>
        {children}
        <FormError message={error} />
      </ModalBody>
      <ModalFooter>
        <Button appearance="subtle" onClick={onClose}>Huỷ</Button>
        <Button appearance="primary" type="submit" isLoading={isSubmitting}>{submitLabel}</Button>
      </ModalFooter>
    </form>
  </Modal>
);
```

`web/src/core/features/teams/useDeleteTeam.ts`:

```ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiErrorMessage, deleteTeam } from '../../api';
import { useToast } from '../../../shared/components/Toast';
import { invalidatePeople } from '../people/invalidate';

/** Xoá Tổ. Server có thể chỉ lưu trữ (còn dữ liệu liên quan) nên báo hai câu khác nhau. */
export function useDeleteTeam(onDeleted?: () => void) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (teamId: number) => deleteTeam(teamId),
    onSuccess: (result) => {
      toast.success(result.deactivated ? 'Đã lưu trữ Tổ.' : 'Đã xoá Tổ thành công.');
      void invalidatePeople(queryClient);
      onDeleted?.();
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Không xoá được Tổ.')),
  });
}
```

`web/src/core/features/teams/TeamFormModal.tsx`:

```tsx
import React, { useId, useState } from 'react';
import { ModalTransition } from '@atlaskit/modal-dialog';
import Textfield from '@atlaskit/textfield';
import TextArea from '@atlaskit/textarea';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiErrorMessage, createTeam, updateTeam, type TeamItem } from '../../api';
import { useCapabilities } from '../../capabilities';
import { useToast } from '../../../shared/components/Toast';
import { FormDialog } from '../people/FormDialog';
import { FormField } from '../people/FormField';
import { invalidatePeople } from '../people/invalidate';

const COLOR_RE = /^#[0-9a-f]{6}$/i;
const DEFAULT_COLOR = '#1e3a8a';

export interface TeamFormModalProps {
  isOpen: boolean;
  /** Có `team` là sửa, không có là tạo. */
  team?: TeamItem | null;
  onClose: () => void;
}

export const TeamFormModal: React.FC<TeamFormModalProps> = ({ isOpen, team, onClose }) => (
  <ModalTransition>{isOpen && <TeamFormDialog team={team ?? null} onClose={onClose} />}</ModalTransition>
);

const TeamFormDialog: React.FC<{ team: TeamItem | null; onClose: () => void }> = ({ team, onClose }) => {
  const ids = { name: useId(), description: useId(), color: useId() };
  const caps = useCapabilities();
  const queryClient = useQueryClient();
  const toast = useToast();
  const isEdit = team !== null;
  // Server: chỉ admin sửa tên và mô tả; Tổ trưởng chỉ sửa màu (PATCH /api/teams/:id).
  const canEditText = caps.isExec;
  const [name, setName] = useState(team?.name ?? '');
  const [description, setDescription] = useState(team?.description ?? '');
  const [color, setColor] = useState(team?.color && COLOR_RE.test(team.color) ? team.color : DEFAULT_COLOR);
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: () => {
      if (!isEdit) return createTeam({ name: name.trim(), description: description.trim(), color });
      return updateTeam(team.id, canEditText ? { name: name.trim(), description: description.trim(), color } : { color });
    },
    onSuccess: () => {
      toast.success(isEdit ? 'Đã cập nhật Tổ.' : 'Đã tạo Tổ.');
      void invalidatePeople(queryClient);
      onClose();
    },
    onError: (err) => setError(apiErrorMessage(err, isEdit ? 'Không cập nhật được Tổ.' : 'Không tạo được Tổ.')),
  });

  const submit = () => {
    if (canEditText && !name.trim()) {
      setError('Vui lòng nhập tên Tổ.');
      return;
    }
    if (!COLOR_RE.test(color)) {
      setError('Màu của Tổ không hợp lệ.');
      return;
    }
    setError('');
    mutation.mutate();
  };

  return (
    <FormDialog
      title={isEdit ? `Sửa Tổ ${team.name}` : 'Tạo Tổ'}
      submitLabel={isEdit ? 'Lưu' : 'Tạo'}
      isSubmitting={mutation.isPending}
      error={error}
      onSubmit={submit}
      onClose={onClose}
    >
      {canEditText && (
        <>
          <FormField label="Tên Tổ" htmlFor={ids.name}>
            <Textfield id={ids.name} value={name} onChange={(e) => setName((e.target as HTMLInputElement).value)} />
          </FormField>
          <FormField label="Mô tả" htmlFor={ids.description}>
            <TextArea id={ids.description} value={description} minimumRows={2} onChange={(e) => setDescription(e.target.value)} />
          </FormField>
        </>
      )}
      <FormField label="Màu của Tổ" htmlFor={ids.color}>
        <input id={ids.color} type="color" value={color} onChange={(e) => setColor(e.target.value)} />
      </FormField>
    </FormDialog>
  );
};
```

`web/src/core/features/teams/TeamCard.tsx`:

```tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { token } from '@atlaskit/tokens';
import type { TeamItem } from '../../api';

export interface TeamCardProps {
  team: TeamItem;
  canManage: boolean;
  canDelete: boolean;
  onEdit: () => void;
  onMembers: () => void;
  onDelete: () => void;
}

const actionStyle: React.CSSProperties = {
  padding: '2px 10px',
  fontSize: 12,
  border: `1px solid ${token('color.border', '#DFE1E6')}`,
  borderRadius: 3,
  background: token('elevation.surface', '#FFFFFF'),
  color: token('color.text', '#172B4D'),
  cursor: 'pointer',
};

const stat = (value: number, label: string) => (
  <div>
    <div style={{ fontSize: 20, fontWeight: 700, color: token('color.text', '#172B4D') }}>{value}</div>
    <div style={{ fontSize: 12, color: token('color.text.subtle', '#5E6C84') }}>{label}</div>
  </div>
);

export const TeamCard: React.FC<TeamCardProps> = ({ team, canManage, canDelete, onEdit, onMembers, onDelete }) => {
  const teamColor = team.color || '#0052CC';
  return (
    <div
      style={{
        backgroundColor: token('elevation.surface.raised', '#FFFFFF'),
        border: `1px solid ${token('color.border', '#DFE1E6')}`,
        borderRadius: 6,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{ height: 4, backgroundColor: teamColor, width: '100%' }} />
      <div style={{ padding: 20, display: 'flex', flexDirection: 'column', flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: token('color.text', '#172B4D') }}>
            {canManage ? (
              <Link to={`/team/${team.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>{team.name}</Link>
            ) : (
              team.name
            )}
          </h2>
          <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: teamColor, display: 'inline-block', flexShrink: 0 }} />
        </div>
        <p style={{ margin: '0 0 20px 0', fontSize: 13, color: token('color.text.subtle', '#5E6C84'), lineHeight: 1.45, flex: 1 }}>
          {team.description || ''}
        </p>
        <div style={{ display: 'flex', gap: 32, paddingTop: 16, borderTop: `1px solid ${token('color.border', '#DFE1E6')}`, marginBottom: canManage ? 16 : 0 }}>
          {stat(team.member_count ?? 0, 'thành viên')}
          {stat(team.active_count ?? 0, 'đang chạy')}
        </div>
        {canManage && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            <Link to={`/team/${team.id}`} style={{ ...actionStyle, textDecoration: 'none' }}>Xem hoạt động</Link>
            <button type="button" style={actionStyle} aria-label={`Quản lý thành viên ${team.name}`} onClick={onMembers}>Quản lý thành viên</button>
            <button type="button" style={actionStyle} aria-label={`Sửa ${team.name}`} onClick={onEdit}>Sửa</button>
            {canDelete && (
              <button type="button" style={{ ...actionStyle, color: token('color.text.danger', '#AE2E24') }} aria-label={`Xoá ${team.name}`} onClick={onDelete}>Xoá</button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
```

Lưu ý test: link tên Tổ có accessible name `Tổ A`; link "Xem hoạt động" có tên khác nên `getByRole('link', { name: 'Tổ A' })` là duy nhất. Nút "Quản lý thành viên" chưa nối modal ở task này (Task 3 nối `managing`); để Task 2 test pass, `TeamsView` để `onMembers` đặt `setManaging(team)` và **chưa** render modal (Task 3 thêm).

`web/src/core/features/teams/TeamsView.tsx` (viết lại):

```tsx
import React, { useState } from 'react';
import { token } from '@atlaskit/tokens';
import Button from '@atlaskit/button/new';
import InboxIcon from '@atlaskit/icon/core/inbox';
import { useQuery } from '@tanstack/react-query';
import { fetchTeams, type TeamItem } from '../../api';
import { useCapabilities } from '../../capabilities';
import { TEAMS_KEY } from '../../queryKeys';
import { LottieLoading } from '../../../shared/components/LottieLoading';
import { ConfirmDialog } from '../../../shared/components/ConfirmDialog';
import { TeamCard } from './TeamCard';
import { TeamFormModal } from './TeamFormModal';
import { useDeleteTeam } from './useDeleteTeam';

export const TeamsView: React.FC = () => {
  const caps = useCapabilities();
  const { data: teams, isLoading, isError } = useQuery({ queryKey: TEAMS_KEY, queryFn: fetchTeams });
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<TeamItem | null>(null);
  const [managing, setManaging] = useState<TeamItem | null>(null);
  const [deleting, setDeleting] = useState<TeamItem | null>(null);
  const deleteMutation = useDeleteTeam(() => setDeleting(null));

  if (isError) {
    return <div style={{ color: token('color.text.danger', '#DE350B'), padding: 16 }}>Lỗi tải dữ liệu Tổ</div>;
  }

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', paddingTop: 4 }}>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 600, color: token('color.text', '#172B4D'), letterSpacing: '-0.2px' }}>Tổ</h1>
          <p style={{ margin: '6px 0 0 0', fontSize: 14, color: token('color.text.subtle', '#5E6C84') }}>
            Những con người và đơn vị cùng tạo nên các hoạt động.
          </p>
        </div>
        {caps.isExec && <Button appearance="primary" onClick={() => setCreating(true)}>Tạo Tổ</Button>}
      </div>

      {isLoading ? (
        <LottieLoading message="Đang tải danh sách tổ..." size={140} />
      ) : !teams || teams.length === 0 ? (
        <div style={{ backgroundColor: token('elevation.surface.raised', '#FFFFFF'), border: `1px solid ${token('color.border', '#DFE1E6')}`, borderRadius: 6, padding: '48px 24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <div style={{ color: token('color.icon.subtle', '#6B778C') }}><InboxIcon label="" /></div>
          <div style={{ fontSize: 16, fontWeight: 600, color: token('color.text', '#172B4D') }}>Chưa có tổ nào</div>
          <p style={{ margin: 0, fontSize: 14, color: token('color.text.subtle', '#5E6C84') }}>Danh sách tổ hiện tại đang trống.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 20 }}>
          {teams.map((team) => (
            <TeamCard
              key={team.id}
              team={team}
              canManage={caps.canManageTeam(team.id) || Boolean(team.can_manage)}
              canDelete={caps.isExec}
              onEdit={() => setEditing(team)}
              onMembers={() => setManaging(team)}
              onDelete={() => setDeleting(team)}
            />
          ))}
        </div>
      )}

      <TeamFormModal isOpen={creating} onClose={() => setCreating(false)} />
      <TeamFormModal isOpen={editing !== null} team={editing} onClose={() => setEditing(null)} />
      <ConfirmDialog
        isOpen={deleting !== null}
        title={`Xoá Tổ ${deleting?.name ?? ''}`}
        appearance="danger"
        confirmLabel="Xoá Tổ"
        isLoading={deleteMutation.isPending}
        onConfirm={() => deleting && deleteMutation.mutate(deleting.id)}
        onCancel={() => setDeleting(null)}
      >
        <p>Tổ sẽ bị xoá nếu không còn dữ liệu liên quan, nếu còn thì được lưu trữ. Không thể hoàn tác.</p>
      </ConfirmDialog>
      {managing && null}
    </div>
  );
};
```

(Dòng `{managing && null}` chỉ để `managing` không bị `noUnusedLocals` báo ở task này; Task 3 thay bằng modal thật.)

Lưu ý: `setEditing(null)` khi đóng làm `team` thành `null` trong lúc modal chạy hiệu ứng thoát — `TeamFormModal` đã nhận `isOpen={editing !== null}` nên không vẽ lại form bị null.

- [ ] **Step 4: Chạy**

Run: `cd web && npx vitest run src/core/features/teams && npx tsc --noEmit -p .` — Expected: PASS. Nếu nút "Tạo"/"Lưu" trong modal không gửi form (Atlaskit không phát `submit`), kiểm `Button type="submit"` nằm trong `<form>` ở `FormDialog` trước khi sửa chỗ khác.

- [ ] **Step 5: Commit**

```bash
git add web/src/core/features/people web/src/core/features/teams
git commit -m "feat(web): tạo, sửa, xoá Tổ"
```

---

### Task 3: Thành viên Tổ (thêm, đổi vai trò, xoá)

**Files:**
- Create: `web/src/core/features/teams/TeamMembersModal.tsx`
- Test: `web/src/core/features/teams/TeamMembersModal.test.tsx`
- Modify: `web/src/core/features/teams/TeamsView.tsx` (nối modal)

**Interfaces:**
- Consumes: `fetchTeamMembers`, `addTeamMember`, `setTeamMemberRole`, `removeTeamMember`, `teamMembersKey`, `invalidatePeople`, `useCapabilities`, `useCurrentUser`, `ConfirmDialog`, `FormField`, `selectStyle`.
- Produces: `TeamMembersModal({ teamId, teamName, onClose })` — luôn mở khi được mount; cha bọc điều kiện.

- [ ] **Step 1: Viết test hỏng**

```tsx
// web/src/core/features/teams/TeamMembersModal.test.tsx
import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { screen, cleanup, fireEvent, waitFor, within } from '@testing-library/react';
import { TeamMembersModal } from './TeamMembersModal';
import * as api from '../../api';
import { renderWithApp } from '../../testing/peopleHarness';

vi.mock('../../api', async () => {
  const actual = await vi.importActual<typeof import('../../api')>('../../api');
  return { ...actual, fetchTeamMembers: vi.fn(), addTeamMember: vi.fn(), setTeamMemberRole: vi.fn(), removeTeamMember: vi.fn() };
});

const data: api.TeamMembersResponse = {
  members: [
    { id: 1, name: 'Tôi Admin', email: 'a@x.vn', role: 'admin', is_lead: 0, is_vice_lead: 0 },
    { id: 5, name: 'An', email: 'an@x.vn', role: 'member', is_lead: 0, is_vice_lead: 0 },
    { id: 6, name: 'Bình', email: 'binh@x.vn', role: 'leader', is_lead: 1, is_vice_lead: 0 },
  ],
  available: [
    { id: 7, name: 'Chi', email: 'chi@x.vn', role: 'member' },
    { id: 8, name: 'Dũng', email: 'dung@x.vn', role: 'vice_leader' },
  ],
};

const open = (role: string, userId: number) =>
  renderWithApp(<TeamMembersModal teamId={3} teamName="Tổ A" onClose={() => {}} />, { role, userId });

describe('TeamMembersModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.fetchTeamMembers).mockResolvedValue(data);
  });
  afterEach(cleanup);

  it('admin: đổi vai trò thành viên thường bằng ô chọn, gọi PATCH đúng', async () => {
    vi.mocked(api.setTeamMemberRole).mockResolvedValueOnce({ ok: true, role: 'vice_leader' });
    const { qc } = open('admin', 1);
    const spy = vi.spyOn(qc, 'invalidateQueries').mockResolvedValue(undefined);
    const select = await screen.findByLabelText('Vai trò của An');
    fireEvent.change(select, { target: { value: 'vice_leader' } });
    await waitFor(() => expect(api.setTeamMemberRole).toHaveBeenCalledWith(3, 5, 'vice_leader'));
    expect(await screen.findByText('Đã cập nhật vai trò.')).toBeDefined();
    await waitFor(() => expect(spy).toHaveBeenCalledWith({ queryKey: ['core-team'] }));
  });

  it('admin: tài khoản admin/vice_admin không có ô đổi vai trò; không có nút xoá cạnh chính mình', async () => {
    open('admin', 1);
    await screen.findByText('Tôi Admin');
    expect(screen.queryByLabelText('Vai trò của Tôi Admin')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Xoá Tôi Admin khỏi Tổ' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Xoá An khỏi Tổ' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Xoá Bình khỏi Tổ' })).toBeDefined();
  });

  it('Tổ trưởng: không có ô đổi vai trò, chỉ xoá được thành viên thường', async () => {
    open('leader', 6);
    await screen.findByText('An');
    expect(screen.queryByLabelText('Vai trò của An')).toBeNull();
    expect(screen.getByRole('button', { name: 'Xoá An khỏi Tổ' })).toBeDefined();
    expect(screen.queryByRole('button', { name: 'Xoá Bình khỏi Tổ' })).toBeNull(); // chính mình
    expect(screen.queryByRole('button', { name: 'Xoá Tôi Admin khỏi Tổ' })).toBeNull(); // admin
  });

  it('xoá thành viên phải xác nhận rồi mới gọi DELETE', async () => {
    vi.mocked(api.removeTeamMember).mockResolvedValueOnce({ ok: true, role: 'member' });
    open('admin', 1);
    fireEvent.click(await screen.findByRole('button', { name: 'Xoá An khỏi Tổ' }));
    expect(api.removeTeamMember).not.toHaveBeenCalled();
    fireEvent.click(await screen.findByRole('button', { name: 'Xoá khỏi Tổ' }));
    await waitFor(() => expect(api.removeTeamMember).toHaveBeenCalledWith(3, 5));
    expect(await screen.findByText('Đã xoá thành viên khỏi Tổ.')).toBeDefined();
  });

  it('admin thêm thành viên với vai trò chọn được', async () => {
    vi.mocked(api.addTeamMember).mockResolvedValueOnce({ ok: true });
    open('admin', 1);
    fireEvent.change(await screen.findByLabelText('Tài khoản'), { target: { value: '8' } });
    fireEvent.change(screen.getByLabelText('Vai trò trong Tổ'), { target: { value: 'vice_leader' } });
    fireEvent.click(screen.getByRole('button', { name: 'Thêm vào Tổ' }));
    await waitFor(() => expect(api.addTeamMember).toHaveBeenCalledWith(3, { user_id: 8, team_role: 'vice_leader' }));
    expect(await screen.findByText('Đã thêm thành viên vào Tổ.')).toBeDefined();
  });

  it('Tổ trưởng thêm thành viên: chỉ thấy tài khoản thường, không có ô vai trò, gửi team_role member', async () => {
    vi.mocked(api.addTeamMember).mockResolvedValueOnce({ ok: true });
    open('leader', 6);
    const select = await screen.findByLabelText('Tài khoản');
    expect(within(select).queryByText(/Dũng/)).toBeNull();
    expect(screen.queryByLabelText('Vai trò trong Tổ')).toBeNull();
    fireEvent.change(select, { target: { value: '7' } });
    fireEvent.click(screen.getByRole('button', { name: 'Thêm vào Tổ' }));
    await waitFor(() => expect(api.addTeamMember).toHaveBeenCalledWith(3, { user_id: 7, team_role: 'member' }));
  });

  it('chưa chọn tài khoản thì không gọi API', async () => {
    open('admin', 1);
    fireEvent.click(await screen.findByRole('button', { name: 'Thêm vào Tổ' }));
    expect(await screen.findByText('Vui lòng chọn tài khoản.')).toBeDefined();
    expect(api.addTeamMember).not.toHaveBeenCalled();
  });

  it('lỗi 403 hiện tiếng Việt', async () => {
    vi.mocked(api.fetchTeamMembers).mockRejectedValue({ response: { status: 403, data: { error: 'You cannot manage this team.' } } });
    open('leader', 6);
    expect(await screen.findByText('Bạn không có quyền quản lý Tổ này.')).toBeDefined();
  });
});
```

- [ ] **Step 2: Chạy, xác nhận hỏng**

Run: `cd web && npx vitest run src/core/features/teams/TeamMembersModal.test.tsx` — Expected: FAIL (không resolve `./TeamMembersModal`).

- [ ] **Step 3: Viết code**

```tsx
// web/src/core/features/teams/TeamMembersModal.tsx
import React, { useId, useState } from 'react';
import Modal, { ModalBody, ModalFooter, ModalHeader, ModalTitle, ModalTransition } from '@atlaskit/modal-dialog';
import Button from '@atlaskit/button/new';
import { token } from '@atlaskit/tokens';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  addTeamMember, apiErrorMessage, fetchTeamMembers, removeTeamMember, setTeamMemberRole,
  type TeamMemberRow, type TeamRole,
} from '../../api';
import { useCapabilities } from '../../capabilities';
import { teamMembersKey } from '../../queryKeys';
import { ConfirmDialog } from '../../../shared/components/ConfirmDialog';
import { useToast } from '../../../shared/components/Toast';
import { FormError, FormField, selectStyle } from '../people/FormField';
import { invalidatePeople } from '../people/invalidate';
import { useCurrentUser } from '../people/useCurrentUser';

const TEAM_ROLE_LABEL: Record<TeamRole, string> = { member: 'Thành viên', vice_leader: 'Tổ phó', leader: 'Tổ trưởng' };
const GLOBAL_ADMIN_ROLES = ['admin', 'vice_admin'];

const teamRoleOf = (m: TeamMemberRow): TeamRole => (m.is_lead ? 'leader' : m.is_vice_lead ? 'vice_leader' : 'member');

export interface TeamMembersModalProps {
  teamId: number;
  teamName: string;
  onClose: () => void;
}

/** Hộp quản lý thành viên của một Tổ. Cha chỉ mount khi người dùng được quản lý Tổ (server vẫn chặn 403). */
export const TeamMembersModal: React.FC<TeamMembersModalProps> = ({ teamId, teamName, onClose }) => {
  const accountId = useId();
  const roleId = useId();
  const caps = useCapabilities();
  const me = useCurrentUser();
  const queryClient = useQueryClient();
  const toast = useToast();
  const { data, isLoading, error } = useQuery({ queryKey: teamMembersKey(teamId), queryFn: () => fetchTeamMembers(teamId) });
  const [userId, setUserId] = useState('');
  const [addRole, setAddRole] = useState<TeamRole>('member');
  const [addError, setAddError] = useState('');
  const [removing, setRemoving] = useState<TeamMemberRow | null>(null);

  const done = (message: string) => { toast.success(message); void invalidatePeople(queryClient); };
  const fail = (fallback: string) => (err: unknown) => toast.error(apiErrorMessage(err, fallback));

  const add = useMutation({
    mutationFn: () => addTeamMember(teamId, { user_id: Number(userId), team_role: caps.isExec ? addRole : 'member' }),
    onSuccess: () => { setUserId(''); setAddRole('member'); done('Đã thêm thành viên vào Tổ.'); },
    onError: (err) => setAddError(apiErrorMessage(err, 'Không thêm được thành viên.')),
  });
  const changeRole = useMutation({
    mutationFn: (v: { userId: number; role: TeamRole }) => setTeamMemberRole(teamId, v.userId, v.role),
    onSuccess: () => done('Đã cập nhật vai trò.'),
    onError: fail('Không cập nhật được vai trò.'),
  });
  const remove = useMutation({
    mutationFn: (uid: number) => removeTeamMember(teamId, uid),
    onSuccess: () => { setRemoving(null); done('Đã xoá thành viên khỏi Tổ.'); },
    onError: (err) => { setRemoving(null); toast.error(apiErrorMessage(err, 'Không xoá được thành viên.')); },
  });

  // Tổ trưởng/Tổ phó chỉ thêm tài khoản `member` (server 403 nếu khác).
  const addable = (data?.available ?? []).filter((u) => caps.isExec || u.role === 'member');
  const canChangeRole = (m: TeamMemberRow) => caps.isExec && !GLOBAL_ADMIN_ROLES.includes(m.role);
  // Admin xoá được mọi người; Tổ trưởng chỉ xoá thành viên thường không giữ cờ trưởng/phó. Không ai tự xoá mình.
  const canRemove = (m: TeamMemberRow) =>
    m.id !== me?.id && (caps.isExec || (m.role === 'member' && !m.is_lead && !m.is_vice_lead));

  const submitAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) { setAddError('Vui lòng chọn tài khoản.'); return; }
    setAddError('');
    add.mutate();
  };

  return (
    <>
      <ModalTransition>
        <Modal onClose={onClose} width="medium">
          <ModalHeader><ModalTitle>Thành viên Tổ {teamName}</ModalTitle></ModalHeader>
          <ModalBody>
            {isLoading && <p>Đang tải...</p>}
            {error != null && <FormError message={apiErrorMessage(error, 'Không tải được thành viên Tổ.')} />}
            {data && (
              <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {data.members.map((m) => (
                  <li key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: `1px solid ${token('color.border', '#DFE1E6')}` }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600 }}>{m.name}</div>
                      <div style={{ fontSize: 12, color: token('color.text.subtle', '#5E6C84') }}>{m.email}</div>
                    </div>
                    {canChangeRole(m) ? (
                      <select
                        aria-label={`Vai trò của ${m.name}`}
                        style={{ ...selectStyle, width: 130 }}
                        value={teamRoleOf(m)}
                        disabled={changeRole.isPending}
                        onChange={(e) => changeRole.mutate({ userId: m.id, role: e.target.value as TeamRole })}
                      >
                        {(Object.keys(TEAM_ROLE_LABEL) as TeamRole[]).map((r) => <option key={r} value={r}>{TEAM_ROLE_LABEL[r]}</option>)}
                      </select>
                    ) : (
                      <span style={{ fontSize: 12 }}>{GLOBAL_ADMIN_ROLES.includes(m.role) ? 'Ban điều hành' : TEAM_ROLE_LABEL[teamRoleOf(m)]}</span>
                    )}
                    {canRemove(m) && (
                      <Button appearance="subtle" aria-label={`Xoá ${m.name} khỏi Tổ`} onClick={() => setRemoving(m)}>Xoá</Button>
                    )}
                  </li>
                ))}
                {data.members.length === 0 && <li>Tổ chưa có thành viên.</li>}
              </ul>
            )}
            {data && (
              <form noValidate onSubmit={submitAdd} style={{ marginTop: 16 }}>
                <h3 style={{ fontSize: 14, margin: '0 0 8px' }}>Thêm thành viên</h3>
                {addable.length === 0 ? (
                  <p style={{ color: token('color.text.subtle', '#5E6C84') }}>Mọi tài khoản phù hợp đều đã thuộc Tổ này.</p>
                ) : (
                  <>
                    <FormField label="Tài khoản" htmlFor={accountId}>
                      <select id={accountId} style={selectStyle} value={userId} onChange={(e) => setUserId(e.target.value)}>
                        <option value="">— Chọn tài khoản —</option>
                        {addable.map((u) => <option key={u.id} value={u.id}>{u.name} · {u.email}</option>)}
                      </select>
                    </FormField>
                    {caps.isExec && (
                      <FormField label="Vai trò trong Tổ" htmlFor={roleId}>
                        <select id={roleId} style={selectStyle} value={addRole} onChange={(e) => setAddRole(e.target.value as TeamRole)}>
                          {(Object.keys(TEAM_ROLE_LABEL) as TeamRole[]).map((r) => <option key={r} value={r}>{TEAM_ROLE_LABEL[r]}</option>)}
                        </select>
                      </FormField>
                    )}
                    <FormError message={addError} />
                    <Button type="submit" appearance="primary" isLoading={add.isPending}>Thêm vào Tổ</Button>
                  </>
                )}
              </form>
            )}
          </ModalBody>
          <ModalFooter><Button appearance="subtle" onClick={onClose}>Đóng</Button></ModalFooter>
        </Modal>
      </ModalTransition>
      <ConfirmDialog
        isOpen={removing !== null}
        title="Xoá thành viên khỏi Tổ"
        appearance="danger"
        confirmLabel="Xoá khỏi Tổ"
        isLoading={remove.isPending}
        onConfirm={() => removing && remove.mutate(removing.id)}
        onCancel={() => setRemoving(null)}
      >
        <p>Xoá <strong>{removing?.name}</strong> khỏi Tổ {teamName}?</p>
      </ConfirmDialog>
    </>
  );
};
```

Nối vào `TeamsView.tsx`: thêm `import { TeamMembersModal } from './TeamMembersModal';` và thay dòng `{managing && null}` bằng:

```tsx
      {managing && <TeamMembersModal teamId={managing.id} teamName={managing.name} onClose={() => setManaging(null)} />}
```

Thêm vào `TeamsView.test.tsx` một ca:

```tsx
  it('"Quản lý thành viên" mở hộp thành viên của đúng Tổ', async () => {
    vi.mocked(api.fetchTeamMembers).mockResolvedValue({ members: [], available: [] });
    renderWithApp(<TeamsView />, { role: 'leader', teams: harnessTeams });
    await screen.findByText('Tổ A');
    fireEvent.click(screen.getByRole('button', { name: 'Quản lý thành viên Tổ A' }));
    expect(await screen.findByText('Thành viên Tổ Tổ A')).toBeDefined();
    expect(api.fetchTeamMembers).toHaveBeenCalledWith(1);
  });
```

- [ ] **Step 4: Chạy**

Run: `cd web && npx vitest run src/core/features/teams && npx tsc --noEmit -p .` — Expected: PASS. (Tiêu đề hộp là "Thành viên Tổ " + tên Tổ nên với tên "Tổ A" ra "Thành viên Tổ Tổ A" — đúng như test; tên thật như "Phát triển Đảng" ra "Thành viên Tổ Phát triển Đảng".)

- [ ] **Step 5: Commit**

```bash
git add web/src/core/features/teams
git commit -m "feat(web): quản lý thành viên Tổ (thêm, đổi vai trò, xoá)"
```

---

### Task 4: Trang Tổ `#team/:id`

**Files:**
- Create: `web/src/core/features/teams/TeamPage.tsx`
- Test: `web/src/core/features/teams/TeamPage.test.tsx`
- Modify: `web/src/core/AppRoutes.tsx`, `web/src/core/AppRoutes.test.tsx`

**Interfaces:**
- Consumes: `fetchTeamOverview`, `teamOverviewKey`, `useDeleteTeam`, `TeamMembersModal`, `ConfirmDialog`, `getTaskStatusLabel`/`getTaskStatusAppearance` (`features/tasks/taskLabels.ts`), `getActivityStatusMeta` (`features/activities/activityLabels.ts`), `formatVnDate`, `toVnDateKey`, `todayVnKey` (`shared/utils/date.ts`).
- Produces: `TeamPage` (đọc `:id` từ `useParams`); route `/team/:id` trong `AppRoutes`.

- [ ] **Step 1: Viết test hỏng**

```tsx
// web/src/core/features/teams/TeamPage.test.tsx
import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { TeamPage } from './TeamPage';
import * as api from '../../api';
import { renderWithApp } from '../../testing/peopleHarness';

vi.mock('../../api', async () => {
  const actual = await vi.importActual<typeof import('../../api')>('../../api');
  return { ...actual, fetchTeamOverview: vi.fn(), deleteTeam: vi.fn(), fetchTeamMembers: vi.fn() };
});

const overview: api.TeamOverview = {
  team: { id: 3, name: 'Tổ Truyền thông', description: 'Làm truyền thông', color: '#6554c0', member_count: 2, open_tasks: 1, done_tasks: 1, overdue_tasks: 1 },
  members: [
    { id: 1, name: 'Lan', email: 'lan@x.vn', role: 'leader', avatar_color: '#0052cc', is_lead: 1, is_vice_lead: 0, open_tasks: 1, done_tasks: 0 },
    { id: 2, name: 'Minh', email: 'minh@x.vn', role: 'member', avatar_color: '#36b37e', is_lead: 0, is_vice_lead: 0, open_tasks: 0, done_tasks: 1 },
  ],
  tasks: [
    { id: 11, title: 'Thiết kế poster', status: 'in_progress', deadline: '2020-01-01', activity_title: 'Hội trại', assignee_name: 'Lan' },
    { id: 12, title: 'Đã xong rồi', status: 'done', deadline: '2020-01-01', activity_title: 'Hội trại', assignee_name: 'Minh' },
  ],
  activities: [{ id: 21, title: 'Hội trại', status: 'active', deadline: '2030-01-01', task_count: 4, done_count: 1 }],
};

const open = (role: string) =>
  renderWithApp(<TeamPage />, { role, userId: 1, path: '/team/3', routePath: '/team/:id', teams: [{ id: 3, name: 'Tổ Truyền thông', can_manage: true }] });

describe('TeamPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.fetchTeamOverview).mockResolvedValue(overview);
  });
  afterEach(cleanup);

  it('hiện số liệu, việc đang mở, hoạt động và thành viên của Tổ', async () => {
    open('leader');
    expect(await screen.findByRole('heading', { name: 'Tổ Truyền thông' })).toBeDefined();
    expect(api.fetchTeamOverview).toHaveBeenCalledWith(3);
    expect(screen.getByText('50%')).toBeDefined(); // 1 xong / (1 mở + 1 xong)
    expect(screen.getByRole('link', { name: /Thiết kế poster/ }).getAttribute('href')).toBe('/task/11');
    expect(screen.queryByText('Đã xong rồi')).toBeNull(); // chỉ việc chưa xong
    expect(screen.getByRole('link', { name: /Hội trại/ }).getAttribute('href')).toBe('/activity/21');
    expect(screen.getByText('1/4 việc')).toBeDefined();
    expect(screen.getByText('Tổ trưởng')).toBeDefined();
    expect(screen.getByRole('link', { name: 'lan@x.vn' }).getAttribute('href')).toBe('mailto:lan@x.vn');
  });

  it('Tổ trưởng không thấy nút "Xoá Tổ"; admin thấy', async () => {
    open('leader');
    await screen.findByRole('heading', { name: 'Tổ Truyền thông' });
    expect(screen.queryByRole('button', { name: 'Xoá Tổ' })).toBeNull();
    cleanup();
    open('admin');
    expect(await screen.findByRole('button', { name: 'Xoá Tổ' })).toBeDefined();
  });

  it('admin xoá Tổ: xác nhận, gọi DELETE rồi về danh sách Tổ', async () => {
    vi.mocked(api.deleteTeam).mockResolvedValueOnce({ ok: true, deleted: true, deactivated: false });
    open('admin');
    fireEvent.click(await screen.findByRole('button', { name: 'Xoá Tổ' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Xoá Tổ vĩnh viễn' }));
    await waitFor(() => expect(api.deleteTeam).toHaveBeenCalledWith(3));
    await waitFor(() => expect(screen.getByTestId('path').textContent).toBe('/teams'));
  });

  it('"Quản lý thành viên" mở hộp thành viên', async () => {
    vi.mocked(api.fetchTeamMembers).mockResolvedValue({ members: [], available: [] });
    open('leader');
    fireEvent.click(await screen.findByRole('button', { name: 'Quản lý thành viên' }));
    await waitFor(() => expect(api.fetchTeamMembers).toHaveBeenCalledWith(3));
  });

  it('403 (Tổ khác): báo lỗi tiếng Việt và về Tổng quan', async () => {
    vi.mocked(api.fetchTeamOverview).mockRejectedValue({ response: { status: 403, data: { error: 'You cannot view this team overview.' } } });
    open('leader');
    expect(await screen.findByText('Bạn không có quyền xem Tổ này.')).toBeDefined();
    await waitFor(() => expect(screen.getByTestId('path').textContent).toBe('/dashboard'));
  });

  it('404 ở lại trang với câu lỗi và link quay lại', async () => {
    vi.mocked(api.fetchTeamOverview).mockRejectedValue({ response: { status: 404, data: { error: 'Team not found.' } } });
    open('admin');
    expect(await screen.findByText('Không tìm thấy Tổ.')).toBeDefined();
    expect(screen.getByRole('link', { name: /Quay lại danh sách Tổ/ }).getAttribute('href')).toBe('/teams');
  });
});
```

Thêm vào `AppRoutes.test.tsx` (đầu file thêm mock, cuối `describe` thêm ca):

```tsx
vi.mock('./features/teams/TeamPage', () => ({ TeamPage: () => <div>màn-trang-tổ</div> }));
vi.mock('./features/accounts/AccountsView', () => ({ AccountsView: () => <div>màn-quản-trị-tài-khoản</div> }));
```

```tsx
  it('mở được trang Tổ theo #team/:id', () => {
    renderAt('/team/3', 'leader');
    expect(screen.getByText('màn-trang-tổ')).toBeDefined();
  });
```

(Mock `AccountsView` thêm sẵn ở đây; module thật có ở Task 6 — nếu chạy Task 4 trước khi có file thì `vi.mock` factory vẫn dùng được vì không import thật; nhưng `AppRoutes.tsx` chỉ import `AccountsView` từ Task 6, nên mock thừa này vô hại.)

- [ ] **Step 2: Chạy, xác nhận hỏng**

Run: `cd web && npx vitest run src/core/features/teams/TeamPage.test.tsx src/core/AppRoutes.test.tsx` — Expected: FAIL.

- [ ] **Step 3: Viết code**

```tsx
// web/src/core/features/teams/TeamPage.tsx
import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { token } from '@atlaskit/tokens';
import Button from '@atlaskit/button/new';
import Lozenge from '@atlaskit/lozenge';
import { useQuery } from '@tanstack/react-query';
import { apiErrorMessage, fetchTeamOverview } from '../../api';
import { useCapabilities } from '../../capabilities';
import { teamOverviewKey } from '../../queryKeys';
import { LottieLoading } from '../../../shared/components/LottieLoading';
import { ConfirmDialog } from '../../../shared/components/ConfirmDialog';
import { useToast } from '../../../shared/components/Toast';
import { formatVnDate, todayVnKey, toVnDateKey } from '../../../shared/utils/date';
import { getActivityStatusMeta } from '../activities/activityLabels';
import { getTaskStatusAppearance, getTaskStatusLabel } from '../tasks/taskLabels';
import { TeamMembersModal } from './TeamMembersModal';
import { useDeleteTeam } from './useDeleteTeam';

const panel: React.CSSProperties = {
  backgroundColor: token('elevation.surface.raised', '#FFFFFF'),
  border: `1px solid ${token('color.border', '#DFE1E6')}`,
  borderRadius: 6,
  padding: 16,
};

const percent = (done: number, total: number) => (total > 0 ? Math.round((done / total) * 100) : 0);

const Stat: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div style={{ ...panel, flex: '1 1 140px' }}>
    <div style={{ fontSize: 12, color: token('color.text.subtle', '#5E6C84') }}>{label}</div>
    <div style={{ fontSize: 24, fontWeight: 700 }}>{value}</div>
  </div>
);

export const TeamPage: React.FC = () => {
  const { id } = useParams();
  const teamId = Number(id);
  const navigate = useNavigate();
  const toast = useToast();
  const caps = useCapabilities();
  const [managing, setManaging] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const deleteMutation = useDeleteTeam(() => { setDeleting(false); navigate('/teams'); });
  const { data, isLoading, error } = useQuery({
    queryKey: teamOverviewKey(teamId),
    queryFn: () => fetchTeamOverview(teamId),
    enabled: Number.isInteger(teamId) && teamId > 0,
  });

  // Server chỉ cho admin hoặc người quản lý Tổ xem trang này; 403 thì về Tổng quan như mọi route không có quyền.
  const status = (error as { response?: { status?: number } } | null)?.response?.status;
  useEffect(() => {
    if (status === 403) {
      toast.error(apiErrorMessage(error));
      navigate('/dashboard', { replace: true });
    }
  }, [status, error, navigate, toast]);

  const back = (
    <Link to="/teams" style={{ color: token('color.link', '#0052CC') }}>← Quay lại danh sách Tổ</Link>
  );

  if (isLoading) return <LottieLoading message="Đang tải trang Tổ..." size={140} />;
  if (error != null) {
    return (
      <div>
        {back}
        <p role="alert" style={{ color: token('color.text.danger', '#AE2E24') }}>{apiErrorMessage(error, 'Không tải được trang Tổ.')}</p>
      </div>
    );
  }
  if (!data) return null;

  const { team, members, tasks, activities } = data;
  const today = todayVnKey();
  const openTasks = tasks.filter((t) => t.status !== 'done');

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      {back}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap', margin: '12px 0 20px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 600 }}>{team.name}</h1>
          <p style={{ margin: '6px 0 0', color: token('color.text.subtle', '#5E6C84') }}>{team.description || 'Chưa có mô tả.'}</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button onClick={() => setManaging(true)}>Quản lý thành viên</Button>
          {caps.isExec && <Button appearance="danger" onClick={() => setDeleting(true)}>Xoá Tổ</Button>}
        </div>
      </header>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
        <Stat label="Thành viên" value={team.member_count} />
        <Stat label="Việc đang mở" value={team.open_tasks} />
        <Stat label="Quá hạn" value={team.overdue_tasks} />
        <Stat label="Tiến độ" value={`${percent(Number(team.done_tasks), Number(team.open_tasks) + Number(team.done_tasks))}%`} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <section style={panel}>
            <h2 style={{ fontSize: 16, margin: '0 0 12px' }}>Công việc hiện tại ({openTasks.length})</h2>
            {openTasks.length === 0 && <p>Chưa có việc nào.</p>}
            {openTasks.map((t) => {
              const late = toVnDateKey(t.deadline) !== '' && toVnDateKey(t.deadline) < today;
              return (
                <Link key={t.id} to={`/task/${t.id}`} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, padding: '8px 0', textDecoration: 'none', color: 'inherit', borderBottom: `1px solid ${token('color.border', '#DFE1E6')}` }}>
                  <span>
                    <strong>{t.title}</strong>
                    <small style={{ display: 'block', color: token('color.text.subtle', '#5E6C84') }}>{t.activity_title} · {t.assignee_name || 'Chưa giao'}</small>
                  </span>
                  <span style={{ textAlign: 'right' }}>
                    <Lozenge appearance={getTaskStatusAppearance(t.status)}>{getTaskStatusLabel(t.status)}</Lozenge>
                    <small style={{ display: 'block', color: late ? token('color.text.danger', '#AE2E24') : token('color.text.subtle', '#5E6C84') }}>{formatVnDate(t.deadline)}</small>
                  </span>
                </Link>
              );
            })}
          </section>

          <section style={panel}>
            <h2 style={{ fontSize: 16, margin: '0 0 12px' }}>Hoạt động của Tổ ({activities.length})</h2>
            {activities.length === 0 && <p>Chưa có hoạt động nào.</p>}
            {activities.map((a) => {
              const meta = getActivityStatusMeta(a.status);
              return (
                <Link key={a.id} to={`/activity/${a.id}`} style={{ display: 'block', padding: '8px 0', textDecoration: 'none', color: 'inherit', borderBottom: `1px solid ${token('color.border', '#DFE1E6')}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                    <strong>{a.title}</strong>
                    <Lozenge appearance={meta.appearance}>{meta.label}</Lozenge>
                  </div>
                  <small style={{ color: token('color.text.subtle', '#5E6C84') }}>{a.done_count}/{a.task_count} việc · {formatVnDate(a.deadline)}</small>
                  <div style={{ height: 4, background: token('color.background.neutral', '#F1F2F4'), borderRadius: 2, marginTop: 4 }}>
                    <div style={{ height: 4, borderRadius: 2, width: `${percent(a.done_count, a.task_count)}%`, background: token('color.background.brand.bold', '#0052CC') }} />
                  </div>
                </Link>
              );
            })}
          </section>
        </div>

        <aside style={panel}>
          <h2 style={{ fontSize: 16, margin: '0 0 12px' }}>Thành viên ({members.length})</h2>
          {members.length === 0 && <p>Chưa có thành viên.</p>}
          {members.map((m) => (
            <div key={m.id} style={{ display: 'flex', gap: 10, padding: '8px 0' }}>
              <div aria-hidden="true" style={{ width: 32, height: 32, borderRadius: '50%', background: m.avatar_color || '#0052CC', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                {m.name.trim().slice(0, 1).toUpperCase()}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 600 }}>
                  {m.name}{' '}
                  {m.is_lead ? <Lozenge appearance="inprogress">Tổ trưởng</Lozenge> : m.is_vice_lead ? <Lozenge appearance="new">Tổ phó</Lozenge> : null}
                </div>
                <small style={{ color: token('color.text.subtle', '#5E6C84') }}>{m.open_tasks} đang mở · {m.done_tasks} đã xong</small>
                <div><a href={`mailto:${m.email}`} style={{ color: token('color.link', '#0052CC') }}>{m.email}</a></div>
              </div>
            </div>
          ))}
        </aside>
      </div>

      {managing && <TeamMembersModal teamId={teamId} teamName={team.name} onClose={() => setManaging(false)} />}
      <ConfirmDialog
        isOpen={deleting}
        title={`Xoá Tổ ${team.name}`}
        appearance="danger"
        confirmLabel="Xoá Tổ vĩnh viễn"
        isLoading={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate(teamId)}
        onCancel={() => setDeleting(false)}
      >
        <p>Tổ sẽ bị xoá nếu không còn dữ liệu liên quan, nếu còn thì được lưu trữ. Không thể hoàn tác.</p>
      </ConfirmDialog>
    </div>
  );
};
```

Lưu ý test: nút "Xoá Tổ" ở header và nút xác nhận "Xoá Tổ vĩnh viễn" khác tên nên không nhập nhằng.

`AppRoutes.tsx`: thêm `import { TeamPage } from './features/teams/TeamPage';` và dòng route trước `path="*"`:

```tsx
      <Route path="/team/:id" element={<TeamPage />} />
```

- [ ] **Step 4: Chạy**

Run: `cd web && npx vitest run src/core/features/teams src/core/AppRoutes.test.tsx && npx tsc --noEmit -p .` — Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add web/src/core/features/teams web/src/core/AppRoutes.tsx web/src/core/AppRoutes.test.tsx
git commit -m "feat(web): trang Tổ #team/:id"
```

---

### Task 5: Tạo, sửa, xoá tài khoản trên màn Thành viên

**Files:**
- Create: `web/src/core/features/people/roleLabels.ts`, `web/src/core/features/people/TeamCheckboxes.tsx`, `web/src/core/features/members/CreateAccountModal.tsx`, `web/src/core/features/members/EditAccountModal.tsx`, `web/src/core/features/members/DeleteAccountDialog.tsx`
- Modify: `web/src/core/features/members/MembersView.tsx`
- Test: `web/src/core/features/members/MembersView.test.tsx` (viết lại)

**Interfaces:**
- Consumes: Task 1/2 (`createUser`, `updateUser`, `deleteUser`, `FormDialog`, `FormField`, `selectStyle`, `invalidatePeople`, `useCurrentUser`, `renderWithApp`), `fetchTeams`, `MEMBERS_KEY`, `TEAMS_KEY`.
- Produces: `getRoleLabel(role)`, `getRoleStyle(role)`, `ROLE_OPTIONS: {value,label}[]` (từ `roleLabels.ts`); `TeamCheckboxes({ teams, value, onChange })`; `CreateAccountModal({ isOpen, onClose })`; `EditAccountModal({ member, onClose })` (`member: MemberItem | null`); `DeleteAccountDialog({ member, onClose })` (`member: MemberItem | null`).

- [ ] **Step 1: Viết test hỏng** — thay toàn bộ `MembersView.test.tsx`:

```tsx
import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { MembersView } from './MembersView';
import * as api from '../../api';
import { renderWithApp } from '../../testing/peopleHarness';

vi.mock('../../api', async () => {
  const actual = await vi.importActual<typeof import('../../api')>('../../api');
  return { ...actual, fetchMembers: vi.fn(), fetchTeams: vi.fn(), createUser: vi.fn(), updateUser: vi.fn(), deleteUser: vi.fn() };
});

const members: api.MemberItem[] = [
  { id: 1, name: 'Phạm Việt Bách', role: 'leader', email: 'bach@x.vn', avatar_color: '#e00000', teams: 'Tổ A', team_ids: '1', completed_tasks: 0, can_manage: false },
  { id: 2, name: 'Cao Hương Quỳnh', role: 'member', email: 'quynh@x.vn', avatar_color: '#006644', teams: 'Tổ A', team_ids: '1', completed_tasks: 2, can_manage: true },
  { id: 3, name: 'Nguyễn Văn Huy', role: 'member', email: 'huy@x.vn', avatar_color: '#006644', teams: 'Tổ B', team_ids: '2', completed_tasks: 1, can_manage: false },
];
const teams: api.TeamItem[] = [{ id: 1, name: 'Tổ A', can_manage: true }, { id: 2, name: 'Tổ B', can_manage: false }];
const harnessTeams = [{ id: 1, name: 'Tổ A', can_manage: true }, { id: 2, name: 'Tổ B', can_manage: false }];

describe('MembersView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.fetchMembers).mockResolvedValue(members);
    vi.mocked(api.fetchTeams).mockResolvedValue(teams);
  });
  afterEach(cleanup);

  it('hiện tiêu đề, danh sách thành viên và lọc theo từ khoá', async () => {
    renderWithApp(<MembersView />);
    expect(screen.getByText('Ghi nhận sự tham gia của từng thành viên.')).toBeDefined();
    expect(await screen.findByText('Phạm Việt Bách')).toBeDefined();
    fireEvent.change(screen.getByPlaceholderText('Tìm thành viên...'), { target: { value: 'Huy' } });
    await waitFor(() => expect(screen.queryByText('Phạm Việt Bách')).toBeNull());
    expect(screen.getByText('Nguyễn Văn Huy')).toBeDefined();
  });

  it('danh sách rỗng hiện trạng thái trống', async () => {
    vi.mocked(api.fetchMembers).mockResolvedValue([]);
    renderWithApp(<MembersView />);
    expect(await screen.findByText('Không tìm thấy thành viên')).toBeDefined();
  });

  it('thành viên thường: không có Tạo tài khoản, Sửa, Xoá', async () => {
    renderWithApp(<MembersView />, { role: 'member', userId: 2 });
    await screen.findByText('Phạm Việt Bách');
    expect(screen.queryByRole('button', { name: 'Tạo tài khoản' })).toBeNull();
    expect(screen.queryByRole('button', { name: /^Sửa / })).toBeNull();
  });

  it('Sửa/Xoá chỉ ở dòng can_manage; dòng của chính mình không có Xoá', async () => {
    renderWithApp(<MembersView />, { role: 'leader', userId: 2, teams: harnessTeams });
    await screen.findByText('Cao Hương Quỳnh');
    expect(screen.getByRole('button', { name: 'Sửa Cao Hương Quỳnh' })).toBeDefined();
    expect(screen.queryByRole('button', { name: 'Xoá Cao Hương Quỳnh' })).toBeNull(); // userId 2 = chính mình
    expect(screen.queryByRole('button', { name: 'Sửa Nguyễn Văn Huy' })).toBeNull();
  });

  it('Tổ trưởng tạo tài khoản cục bộ: chỉ Tổ mình quản lý, không có ô vai trò, role gửi là member', async () => {
    vi.mocked(api.createUser).mockResolvedValueOnce({ id: 50 });
    const { qc } = renderWithApp(<MembersView />, { role: 'leader', userId: 1, teams: harnessTeams });
    const spy = vi.spyOn(qc, 'invalidateQueries').mockResolvedValue(undefined);
    await screen.findByText('Phạm Việt Bách');
    fireEvent.click(screen.getByRole('button', { name: 'Tạo tài khoản' }));
    fireEvent.change(await screen.findByLabelText('Họ và tên'), { target: { value: 'Lê Mới' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: ' Moi@X.vn ' } });
    fireEvent.change(screen.getByLabelText('Mật khẩu'), { target: { value: '12345678' } });
    expect(screen.queryByLabelText('Vai trò')).toBeNull();
    expect(screen.queryByLabelText('Tổ B')).toBeNull();
    fireEvent.click(screen.getByLabelText('Tổ A'));
    fireEvent.click(screen.getByRole('button', { name: 'Tạo' }));
    await waitFor(() =>
      expect(api.createUser).toHaveBeenCalledWith({ name: 'Lê Mới', email: 'Moi@X.vn', role: 'member', auth_provider: 'local', password: '12345678', team_ids: [1] })
    );
    expect(await screen.findByText('Đã tạo tài khoản.')).toBeDefined();
    await waitFor(() => expect(spy).toHaveBeenCalledWith({ queryKey: ['core-members'] }));
  });

  it('admin tạo tài khoản SSO: không có ô mật khẩu, chọn được vai trò, body không có password', async () => {
    vi.mocked(api.createUser).mockResolvedValueOnce({ id: 51 });
    renderWithApp(<MembersView />, { role: 'admin', teams: harnessTeams });
    await screen.findByText('Phạm Việt Bách');
    fireEvent.click(screen.getByRole('button', { name: 'Tạo tài khoản' }));
    fireEvent.change(await screen.findByLabelText('Họ và tên'), { target: { value: 'Sso User' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'sso@hust.edu.vn' } });
    fireEvent.click(screen.getByLabelText('SSO Microsoft'));
    expect(screen.queryByLabelText('Mật khẩu')).toBeNull();
    fireEvent.change(screen.getByLabelText('Vai trò'), { target: { value: 'leader' } });
    fireEvent.click(screen.getByLabelText('Tổ B'));
    fireEvent.click(screen.getByRole('button', { name: 'Tạo' }));
    await waitFor(() =>
      expect(api.createUser).toHaveBeenCalledWith({ name: 'Sso User', email: 'sso@hust.edu.vn', role: 'leader', auth_provider: 'microsoft', team_ids: [2] })
    );
  });

  it('tạo tài khoản cục bộ thiếu mật khẩu hoặc mật khẩu ngắn hoặc thành viên không có Tổ: chặn ở client', async () => {
    renderWithApp(<MembersView />, { role: 'admin', teams: harnessTeams });
    await screen.findByText('Phạm Việt Bách');
    fireEvent.click(screen.getByRole('button', { name: 'Tạo tài khoản' }));
    fireEvent.change(await screen.findByLabelText('Họ và tên'), { target: { value: 'A' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'a@x.vn' } });
    fireEvent.click(screen.getByRole('button', { name: 'Tạo' }));
    expect(await screen.findByText('Mật khẩu là bắt buộc đối với tài khoản đăng nhập cục bộ.')).toBeDefined();
    fireEvent.change(screen.getByLabelText('Mật khẩu'), { target: { value: '123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Tạo' }));
    expect(await screen.findByText('Mật khẩu phải có ít nhất 8 ký tự.')).toBeDefined();
    fireEvent.change(screen.getByLabelText('Mật khẩu'), { target: { value: '12345678' } });
    fireEvent.click(screen.getByRole('button', { name: 'Tạo' }));
    expect(await screen.findByText('Thành viên phải thuộc ít nhất một Tổ.')).toBeDefined();
    expect(api.createUser).not.toHaveBeenCalled();
  });

  it('lỗi server khi tạo hiện nguyên văn câu tiếng Việt trong hộp', async () => {
    vi.mocked(api.createUser).mockRejectedValueOnce({ response: { status: 400, data: { error: 'Email không hợp lệ.' } } });
    renderWithApp(<MembersView />, { role: 'admin', teams: harnessTeams });
    await screen.findByText('Phạm Việt Bách');
    fireEvent.click(screen.getByRole('button', { name: 'Tạo tài khoản' }));
    fireEvent.change(await screen.findByLabelText('Họ và tên'), { target: { value: 'A' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'a@x.vn' } });
    fireEvent.change(screen.getByLabelText('Mật khẩu'), { target: { value: '12345678' } });
    fireEvent.click(screen.getByLabelText('Tổ A'));
    fireEvent.click(screen.getByRole('button', { name: 'Tạo' }));
    expect(await screen.findByText('Email không hợp lệ.')).toBeDefined();
  });

  it('Tổ trưởng sửa tài khoản: không có ô email/mật khẩu/vai trò, body không có email và password', async () => {
    vi.mocked(api.updateUser).mockResolvedValueOnce({ ok: true });
    renderWithApp(<MembersView />, { role: 'leader', userId: 1, teams: harnessTeams });
    await screen.findByText('Cao Hương Quỳnh');
    fireEvent.click(screen.getByRole('button', { name: 'Sửa Cao Hương Quỳnh' }));
    const name = await screen.findByLabelText('Họ và tên');
    expect(screen.queryByLabelText('Email')).toBeNull();
    expect(screen.queryByLabelText('Mật khẩu mới')).toBeNull();
    expect(screen.queryByLabelText('Vai trò')).toBeNull();
    fireEvent.change(name, { target: { value: 'Cao H. Quỳnh' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lưu' }));
    await waitFor(() =>
      expect(api.updateUser).toHaveBeenCalledWith(2, { name: 'Cao H. Quỳnh', phone: '', avatar_color: '#006644', role: 'member', team_ids: [1] })
    );
    const body = vi.mocked(api.updateUser).mock.calls[0][1];
    expect('email' in body).toBe(false);
    expect('password' in body).toBe(false);
    expect(await screen.findByText('Đã cập nhật tài khoản.')).toBeDefined();
  });

  it('admin sửa tài khoản: gửi email; mật khẩu chỉ gửi khi có nhập', async () => {
    vi.mocked(api.updateUser).mockResolvedValue({ ok: true });
    renderWithApp(<MembersView />, { role: 'admin', teams: harnessTeams });
    await screen.findByText('Nguyễn Văn Huy');
    fireEvent.click(screen.getByRole('button', { name: 'Sửa Nguyễn Văn Huy' }));
    fireEvent.change(await screen.findByLabelText('Vai trò'), { target: { value: 'vice_leader' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lưu' }));
    await waitFor(() => expect(api.updateUser).toHaveBeenCalledTimes(1));
    const first = vi.mocked(api.updateUser).mock.calls[0][1];
    expect(first.email).toBe('huy@x.vn');
    expect(first.role).toBe('vice_leader');
    expect('password' in first).toBe(false);
    cleanup();
    renderWithApp(<MembersView />, { role: 'admin', teams: harnessTeams });
    await screen.findByText('Nguyễn Văn Huy');
    fireEvent.click(screen.getByRole('button', { name: 'Sửa Nguyễn Văn Huy' }));
    fireEvent.change(await screen.findByLabelText('Mật khẩu mới'), { target: { value: 'matkhaumoi1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lưu' }));
    await waitFor(() => expect(api.updateUser).toHaveBeenCalledTimes(2));
    expect(vi.mocked(api.updateUser).mock.calls[1][1].password).toBe('matkhaumoi1');
  });

  it('sửa thành viên bỏ hết Tổ: chặn ở client', async () => {
    renderWithApp(<MembersView />, { role: 'admin', teams: harnessTeams });
    await screen.findByText('Nguyễn Văn Huy');
    fireEvent.click(screen.getByRole('button', { name: 'Sửa Nguyễn Văn Huy' }));
    fireEvent.click(await screen.findByLabelText('Tổ B')); // bỏ chọn Tổ duy nhất
    fireEvent.click(screen.getByRole('button', { name: 'Lưu' }));
    expect(await screen.findByText('Thành viên phải thuộc ít nhất một Tổ.')).toBeDefined();
    expect(api.updateUser).not.toHaveBeenCalled();
  });

  it.each([
    [{ ok: true, deleted: true }, 'Đã xoá tài khoản.'],
    [{ ok: true, deleted: false, deactivated: true }, 'Đã vô hiệu hoá tài khoản để giữ lịch sử.'],
    [{ ok: true, deleted: false, removed_from_managed_teams: true }, 'Đã gỡ tài khoản khỏi Tổ của bạn.'],
  ])('xoá tài khoản phải xác nhận, kết quả %j → "%s"', async (result, message) => {
    vi.mocked(api.deleteUser).mockResolvedValueOnce(result);
    renderWithApp(<MembersView />, { role: 'admin', userId: 1, teams: harnessTeams });
    await screen.findByText('Nguyễn Văn Huy');
    fireEvent.click(screen.getByRole('button', { name: 'Xoá Nguyễn Văn Huy' }));
    expect(api.deleteUser).not.toHaveBeenCalled();
    fireEvent.click(await screen.findByRole('button', { name: 'Xoá tài khoản' }));
    await waitFor(() => expect(api.deleteUser).toHaveBeenCalledWith(3));
    expect(await screen.findByText(message)).toBeDefined();
  });

  it('lỗi khi xoá hiện tiếng Việt', async () => {
    vi.mocked(api.deleteUser).mockRejectedValueOnce({ response: { status: 403, data: { error: 'You cannot delete this account.' } } });
    renderWithApp(<MembersView />, { role: 'admin', userId: 1, teams: harnessTeams });
    await screen.findByText('Nguyễn Văn Huy');
    fireEvent.click(screen.getByRole('button', { name: 'Xoá Nguyễn Văn Huy' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Xoá tài khoản' }));
    expect(await screen.findByText('Bạn không có quyền xoá tài khoản này.')).toBeDefined();
  });
});
```

Lưu ý: dòng của chính mình (`userId: 1` trong ca admin) là "Phạm Việt Bách", còn "Nguyễn Văn Huy" (id 3) có thể xoá. Trong harness admin ở các ca trên, `can_manage` của dòng 3 là `false` — với admin server trả `can_manage: true` cho mọi dòng; để test phản ánh đúng, **đổi mock** `members[2].can_manage` thành `true` khi viết test (hoặc admin luôn thấy — xem code: nút hiện khi `member.can_manage`; không tự suy từ `isExec`, vì server đã tính). Giữ `can_manage` như server trả; sửa dữ liệu mẫu: `members[0].can_manage: true`, `members[2].can_manage: true`, `members[1].can_manage: true`, và ca "chỉ dòng can_manage" tự đặt lại dữ liệu bằng `vi.mocked(api.fetchMembers).mockResolvedValue(...)` với `Huy.can_manage=false`.

- [ ] **Step 2: Chạy, xác nhận hỏng**

Run: `cd web && npx vitest run src/core/features/members` — Expected: FAIL.

- [ ] **Step 3: Viết code**

`web/src/core/features/people/roleLabels.ts` (chuyển từ `MembersView`, giữ nguyên hành vi):

```ts
export const getRoleLabel = (role?: string): string => {
  switch (role) {
    case 'admin':
      return 'Trưởng Ban TCKT';
    case 'vice_admin':
      return 'Phó Ban TCKT';
    case 'leader':
    case 'Tổ Trưởng':
      return 'Tổ Trưởng';
    case 'vice_leader':
    case 'Tổ Phó':
      return 'Tổ Phó';
    default:
      return 'Thành Viên';
  }
};

export const getRoleStyle = (role?: string) => {
  switch (role) {
    case 'admin':
    case 'vice_admin':
      return { bg: '#FFE380', color: '#172B4D', dot: '#FF8B00' };
    case 'leader':
    case 'Tổ Trưởng':
      return { bg: '#FFF0B3', color: '#825800', dot: '#FFAB00' };
    case 'vice_leader':
    case 'Tổ Phó':
      return { bg: '#DEEBFF', color: '#0747A6', dot: '#0052CC' };
    default:
      return { bg: '#F4F5F7', color: '#42526E', dot: '#6B778C' };
  }
};

/** Vai trò admin được chọn khi tạo/sửa tài khoản (thứ tự như UI cũ). */
export const ROLE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'member', label: 'Thành Viên' },
  { value: 'leader', label: 'Tổ Trưởng' },
  { value: 'vice_leader', label: 'Tổ Phó' },
  { value: 'vice_admin', label: 'Phó Ban TCKT' },
  { value: 'admin', label: 'Trưởng Ban TCKT' },
];
```

`web/src/core/features/people/TeamCheckboxes.tsx`:

```tsx
import React from 'react';
import { token } from '@atlaskit/tokens';

export interface TeamCheckboxesProps {
  teams: Array<{ id: number; name: string }>;
  value: number[];
  onChange: (ids: number[]) => void;
}

export const TeamCheckboxes: React.FC<TeamCheckboxesProps> = ({ teams, value, onChange }) => (
  <fieldset style={{ border: `1px solid ${token('color.border', '#DFE1E6')}`, borderRadius: 3, padding: '4px 12px 8px', margin: '0 0 12px' }}>
    <legend style={{ fontSize: 12, fontWeight: 600, padding: '0 4px', color: token('color.text.subtle', '#5E6C84') }}>Tổ</legend>
    {teams.length === 0 && <span style={{ fontSize: 13 }}>Chưa có Tổ nào để chọn.</span>}
    {teams.map((t) => {
      const inputId = `team-checkbox-${t.id}`;
      return (
        <div key={t.id}>
          <input
            id={inputId}
            type="checkbox"
            checked={value.includes(t.id)}
            onChange={(e) => onChange(e.target.checked ? [...value, t.id] : value.filter((v) => v !== t.id))}
          />{' '}
          <label htmlFor={inputId}>{t.name}</label>
        </div>
      );
    })}
  </fieldset>
);
```

(Id `team-checkbox-<id>` trùng nếu hai hộp mở cùng lúc; hai modal tạo/sửa không bao giờ mở cùng lúc nên chấp nhận.)

`web/src/core/features/members/CreateAccountModal.tsx`:

```tsx
import React, { useId, useState } from 'react';
import { ModalTransition } from '@atlaskit/modal-dialog';
import Textfield from '@atlaskit/textfield';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiErrorMessage, createUser, fetchTeams } from '../../api';
import { useCapabilities } from '../../capabilities';
import { TEAMS_KEY } from '../../queryKeys';
import { useToast } from '../../../shared/components/Toast';
import { FormDialog } from '../people/FormDialog';
import { FormField, selectStyle } from '../people/FormField';
import { invalidatePeople } from '../people/invalidate';
import { ROLE_OPTIONS } from '../people/roleLabels';
import { TeamCheckboxes } from '../people/TeamCheckboxes';

export const CreateAccountModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => (
  <ModalTransition>{isOpen && <CreateAccountDialog onClose={onClose} />}</ModalTransition>
);

const CreateAccountDialog: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const ids = { name: useId(), email: useId(), password: useId(), role: useId(), phone: useId() };
  const caps = useCapabilities();
  const queryClient = useQueryClient();
  const toast = useToast();
  const { data: teams = [] } = useQuery({ queryKey: TEAMS_KEY, queryFn: fetchTeams });
  // Admin chọn mọi Tổ và mọi vai trò; Tổ trưởng chỉ Tổ mình quản lý và luôn tạo `member`.
  const allowedTeams = caps.isExec ? teams : teams.filter((t) => caps.canManageTeam(t.id));
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [kind, setKind] = useState<'local' | 'microsoft'>('local');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('member');
  const [phone, setPhone] = useState('');
  const [teamIds, setTeamIds] = useState<number[]>([]);
  const [error, setError] = useState('');
  const effectiveRole = caps.isExec ? role : 'member';

  const mutation = useMutation({
    mutationFn: () =>
      createUser({
        name: name.trim(),
        email: email.trim(),
        role: effectiveRole,
        ...(phone.trim() ? { phone: phone.trim() } : {}),
        auth_provider: kind,
        ...(kind === 'local' ? { password } : {}),
        team_ids: teamIds,
      }),
    onSuccess: () => {
      toast.success('Đã tạo tài khoản.');
      void invalidatePeople(queryClient);
      onClose();
    },
    onError: (err) => setError(apiErrorMessage(err, 'Không tạo được tài khoản.')),
  });

  const submit = () => {
    // Các câu dưới trùng câu server trả để người dùng gặp cùng một thông điệp dù chặn ở đâu.
    if (!name.trim() || !email.trim()) return setError('Tên và email là bắt buộc.');
    if (kind === 'local' && !password) return setError('Mật khẩu là bắt buộc đối với tài khoản đăng nhập cục bộ.');
    if (kind === 'local' && password.length < 8) return setError('Mật khẩu phải có ít nhất 8 ký tự.');
    if (effectiveRole === 'member' && teamIds.length === 0) return setError('Thành viên phải thuộc ít nhất một Tổ.');
    setError('');
    mutation.mutate();
  };

  return (
    <FormDialog title="Tạo tài khoản" submitLabel="Tạo" isSubmitting={mutation.isPending} error={error} onSubmit={submit} onClose={onClose}>
      <FormField label="Họ và tên" htmlFor={ids.name}>
        <Textfield id={ids.name} value={name} onChange={(e) => setName((e.target as HTMLInputElement).value)} />
      </FormField>
      <FormField label="Email" htmlFor={ids.email}>
        <Textfield id={ids.email} type="email" value={email} onChange={(e) => setEmail((e.target as HTMLInputElement).value)} />
      </FormField>
      <fieldset style={{ border: 'none', padding: 0, margin: '0 0 12px' }}>
        <legend style={{ fontSize: 12, fontWeight: 600 }}>Kiểu đăng nhập</legend>
        <label><input type="radio" name="auth-kind" checked={kind === 'local'} onChange={() => setKind('local')} /> Cục bộ (mật khẩu)</label>{' '}
        <label><input type="radio" name="auth-kind" checked={kind === 'microsoft'} onChange={() => setKind('microsoft')} /> SSO Microsoft</label>
      </fieldset>
      {kind === 'local' && (
        <FormField label="Mật khẩu" htmlFor={ids.password} hint="Tối thiểu 8 ký tự.">
          <Textfield id={ids.password} type="password" value={password} onChange={(e) => setPassword((e.target as HTMLInputElement).value)} />
        </FormField>
      )}
      {caps.isExec && (
        <FormField label="Vai trò" htmlFor={ids.role}>
          <select id={ids.role} style={selectStyle} value={role} onChange={(e) => setRole(e.target.value)}>
            {ROLE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </FormField>
      )}
      <FormField label="Số điện thoại" htmlFor={ids.phone}>
        <Textfield id={ids.phone} value={phone} onChange={(e) => setPhone((e.target as HTMLInputElement).value)} />
      </FormField>
      <TeamCheckboxes teams={allowedTeams} value={teamIds} onChange={setTeamIds} />
    </FormDialog>
  );
};
```

`web/src/core/features/members/EditAccountModal.tsx`:

```tsx
import React, { useId, useState } from 'react';
import { ModalTransition } from '@atlaskit/modal-dialog';
import Textfield from '@atlaskit/textfield';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiErrorMessage, fetchTeams, updateUser, type MemberItem, type UpdateUserPayload } from '../../api';
import { useCapabilities } from '../../capabilities';
import { TEAMS_KEY } from '../../queryKeys';
import { useToast } from '../../../shared/components/Toast';
import { FormDialog } from '../people/FormDialog';
import { FormField, selectStyle } from '../people/FormField';
import { invalidatePeople } from '../people/invalidate';
import { ROLE_OPTIONS } from '../people/roleLabels';
import { TeamCheckboxes } from '../people/TeamCheckboxes';

const COLOR_RE = /^#[0-9a-f]{6}$/i;

export const EditAccountModal: React.FC<{ member: MemberItem | null; onClose: () => void }> = ({ member, onClose }) => (
  <ModalTransition>{member && <EditAccountDialog member={member} onClose={onClose} />}</ModalTransition>
);

const EditAccountDialog: React.FC<{ member: MemberItem; onClose: () => void }> = ({ member, onClose }) => {
  const ids = { name: useId(), email: useId(), phone: useId(), color: useId(), role: useId(), password: useId() };
  const caps = useCapabilities();
  const queryClient = useQueryClient();
  const toast = useToast();
  const { data: teams = [] } = useQuery({ queryKey: TEAMS_KEY, queryFn: fetchTeams });
  const allowedTeams = caps.isExec ? teams : teams.filter((t) => caps.canManageTeam(t.id));
  const [name, setName] = useState(member.name);
  const [email, setEmail] = useState(member.email);
  const [phone, setPhone] = useState(member.phone ?? '');
  const [color, setColor] = useState(member.avatar_color && COLOR_RE.test(member.avatar_color) ? member.avatar_color : '#0052cc');
  const [role, setRole] = useState(member.role);
  const [password, setPassword] = useState('');
  const [teamIds, setTeamIds] = useState<number[]>(
    String(member.team_ids ?? '').split(',').map((s) => Number(s.trim())).filter((n) => n > 0)
  );
  const [error, setError] = useState('');
  const effectiveRole = caps.isExec ? role : 'member';

  const mutation = useMutation({
    mutationFn: () => {
      const payload: UpdateUserPayload = { name: name.trim(), phone: phone.trim(), avatar_color: color, role: effectiveRole, team_ids: teamIds };
      // Chỉ admin được đổi email và mật khẩu; Tổ trưởng gửi hai field này là bị 403.
      if (caps.isExec) {
        payload.email = email.trim();
        if (password) payload.password = password;
      }
      return updateUser(member.id, payload);
    },
    onSuccess: () => {
      toast.success('Đã cập nhật tài khoản.');
      void invalidatePeople(queryClient);
      onClose();
    },
    onError: (err) => setError(apiErrorMessage(err, 'Không cập nhật được tài khoản.')),
  });

  const submit = () => {
    if (!name.trim() || (caps.isExec && !email.trim())) return setError('Cần có tên và email.');
    if (caps.isExec && password && password.length < 8) return setError('Mật khẩu phải có ít nhất 8 ký tự.');
    if (effectiveRole === 'member' && teamIds.length === 0) return setError('Thành viên phải thuộc ít nhất một Tổ.');
    setError('');
    mutation.mutate();
  };

  return (
    <FormDialog title="Sửa tài khoản" submitLabel="Lưu" isSubmitting={mutation.isPending} error={error} onSubmit={submit} onClose={onClose}>
      <FormField label="Họ và tên" htmlFor={ids.name}>
        <Textfield id={ids.name} value={name} onChange={(e) => setName((e.target as HTMLInputElement).value)} />
      </FormField>
      {caps.isExec && (
        <FormField label="Email" htmlFor={ids.email}>
          <Textfield id={ids.email} type="email" value={email} onChange={(e) => setEmail((e.target as HTMLInputElement).value)} />
        </FormField>
      )}
      <FormField label="Số điện thoại" htmlFor={ids.phone}>
        <Textfield id={ids.phone} value={phone} onChange={(e) => setPhone((e.target as HTMLInputElement).value)} />
      </FormField>
      <FormField label="Màu đại diện" htmlFor={ids.color}>
        <input id={ids.color} type="color" value={color} onChange={(e) => setColor(e.target.value)} />
      </FormField>
      {caps.isExec && (
        <>
          <FormField label="Vai trò" htmlFor={ids.role}>
            <select id={ids.role} style={selectStyle} value={role} onChange={(e) => setRole(e.target.value)}>
              {ROLE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </FormField>
          <FormField label="Mật khẩu mới" htmlFor={ids.password} hint="Để trống để giữ mật khẩu hiện tại.">
            <Textfield id={ids.password} type="password" value={password} onChange={(e) => setPassword((e.target as HTMLInputElement).value)} />
          </FormField>
        </>
      )}
      <TeamCheckboxes teams={allowedTeams} value={teamIds} onChange={setTeamIds} />
    </FormDialog>
  );
};
```

`web/src/core/features/members/DeleteAccountDialog.tsx`:

```tsx
import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiErrorMessage, deleteUser, type DeleteUserResult, type MemberItem } from '../../api';
import { ConfirmDialog } from '../../../shared/components/ConfirmDialog';
import { useToast } from '../../../shared/components/Toast';
import { invalidatePeople } from '../people/invalidate';

function resultMessage(result: DeleteUserResult): string {
  if (result.removed_from_managed_teams) return 'Đã gỡ tài khoản khỏi Tổ của bạn.';
  if (result.deactivated) return 'Đã vô hiệu hoá tài khoản để giữ lịch sử.';
  return 'Đã xoá tài khoản.';
}

export const DeleteAccountDialog: React.FC<{ member: MemberItem | null; onClose: () => void }> = ({ member, onClose }) => {
  const queryClient = useQueryClient();
  const toast = useToast();
  const mutation = useMutation({
    mutationFn: (userId: number) => deleteUser(userId),
    onSuccess: (result) => {
      toast.success(resultMessage(result));
      void invalidatePeople(queryClient);
      onClose();
    },
    onError: (err) => {
      toast.error(apiErrorMessage(err, 'Không xoá được tài khoản.'));
      onClose();
    },
  });
  return (
    <ConfirmDialog
      isOpen={member !== null}
      title="Xoá tài khoản"
      appearance="danger"
      confirmLabel="Xoá tài khoản"
      isLoading={mutation.isPending}
      onConfirm={() => member && mutation.mutate(member.id)}
      onCancel={onClose}
    >
      <p>
        Xoá tài khoản <strong>{member?.name}</strong>? Nếu tài khoản đã có lịch sử công việc, hệ thống chỉ vô hiệu hoá;
        Tổ trưởng chỉ gỡ được tài khoản khỏi Tổ của mình.
      </p>
    </ConfirmDialog>
  );
};
```

Sửa `MembersView.tsx` (đọc file hiện tại rồi áp các thay đổi sau; giữ nguyên phần giao diện còn lại):
1. Xoá hai hàm `getRoleLabel`, `getRoleStyle` ở đầu file; thêm `import { getRoleLabel, getRoleStyle } from '../people/roleLabels';`. Thêm import `CreateAccountModal`, `EditAccountModal`, `DeleteAccountDialog`, `Button from '@atlaskit/button/new'`, `useCapabilities`, `useCurrentUser`, `MEMBERS_KEY`, `TEAMS_KEY`; đổi `queryKey: ['core-members']` → `MEMBERS_KEY`, `['core-teams']` → `TEAMS_KEY`.
2. Trong component thêm: `const caps = useCapabilities(); const me = useCurrentUser(); const [creating,setCreating]=useState(false); const [editing,setEditing]=useState<MemberItem|null>(null); const [deleting,setDeleting]=useState<MemberItem|null>(null);` — đặt **trước** mọi `return`.
3. **Sửa lỗi quy tắc hook sẵn có:** khối `if (isErrorMembers || isErrorTeams) { return (...) }` hiện nằm trước `useMemo(teamOptions)` và `useMemo(filteredMembers)`; cắt khối này và dán ngay trước `return (` chính của component (sau khi hai `useMemo` đã gọi).
4. Trong header, cạnh khối tiêu đề thêm: `{caps.isManager && <Button appearance="primary" onClick={() => setCreating(true)}>Tạo tài khoản</Button>}`.
5. Thay khối `{/* Actions (Sửa, Xóa) */} {canManage && (...)}` bằng:

```tsx
{canManage && (
  <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
    <button type="button" aria-label={`Sửa ${member.name}`} onClick={() => setEditing(member)} style={actionButtonStyle}>Sửa</button>
    {member.id !== me?.id && (
      <button type="button" aria-label={`Xoá ${member.name}`} onClick={() => setDeleting(member)} style={actionButtonStyle}>Xoá</button>
    )}
  </div>
)}
```

với `actionButtonStyle` là hằng cục bộ đặt trên component (copy style hai nút cũ: `padding '2px 10px'`, `fontSize '11px'`, `border 1px solid color.border`, `borderRadius '3px'`, nền `token('elevation.surface','#FFFFFF')`, `cursor 'pointer'`, `color token('color.text','#172B4D')`).
6. Cuối JSX (trong `div` ngoài cùng) thêm:

```tsx
<CreateAccountModal isOpen={creating} onClose={() => setCreating(false)} />
<EditAccountModal member={editing} onClose={() => setEditing(null)} />
<DeleteAccountDialog member={deleting} onClose={() => setDeleting(null)} />
```

- [ ] **Step 4: Chạy**

Run: `cd web && npx vitest run src/core/features/members && npx tsc --noEmit -p .` — Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add web/src/core/features/people web/src/core/features/members
git commit -m "feat(web): tạo, sửa, xoá tài khoản trên màn Thành viên"
```

---

### Task 6: Quản trị tài khoản `#accounts` (bảng, lọc, thêm, xoá) và mục menu

**Files:**
- Create: `web/src/core/features/accounts/AccountsView.tsx`
- Test: `web/src/core/features/accounts/AccountsView.test.tsx`
- Modify: `web/src/core/AppRoutes.tsx`, `web/src/core/AppRoutes.test.tsx`, `web/src/shared/layouts/PageLayout.tsx`, `web/src/shared/layouts/PageLayout.test.tsx`, `web/src/core/main.tsx`

**Interfaces:**
- Consumes: `fetchMembers`, `MEMBERS_KEY`, `CreateAccountModal`, `EditAccountModal`, `DeleteAccountDialog`, `getRoleLabel`, `ROLE_OPTIONS`, `normalizeSearch` (`shared/utils/text.ts`), `useCurrentUser`.
- Produces: `AccountsView` (route `/accounts`, chỉ `isExec`); prop mới `canViewAccounts?: boolean` của `PageLayout`.

- [ ] **Step 1: Viết test hỏng**

```tsx
// web/src/core/features/accounts/AccountsView.test.tsx
import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { AccountsView } from './AccountsView';
import * as api from '../../api';
import { renderWithApp } from '../../testing/peopleHarness';

vi.mock('../../api', async () => {
  const actual = await vi.importActual<typeof import('../../api')>('../../api');
  return {
    ...actual,
    fetchMembers: vi.fn(), fetchTeams: vi.fn(), createUser: vi.fn(), deleteUser: vi.fn(), updateUser: vi.fn(),
    fetchWeightPresets: vi.fn().mockResolvedValue([]),
  };
});

const rows: api.MemberItem[] = [
  { id: 1, name: 'Tôi Admin', email: 'admin@x.vn', role: 'admin', phone: '0900', teams: '', team_ids: '', auth_provider: 'local', can_manage: true },
  { id: 2, name: 'Nguyễn Văn An', email: 'an@hust.edu.vn', role: 'member', phone: null, teams: 'Tổ A', team_ids: '1', auth_provider: 'microsoft', can_manage: true },
  { id: 3, name: 'Lê Bình', email: 'binh@x.vn', role: 'leader', phone: null, teams: 'Tổ B', team_ids: '2', auth_provider: 'local', can_manage: true },
];

const open = () => renderWithApp(<AccountsView />, { role: 'admin', userId: 1, teams: [{ id: 1, name: 'Tổ A' }, { id: 2, name: 'Tổ B' }] });

describe('AccountsView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.fetchMembers).mockResolvedValue(rows);
    vi.mocked(api.fetchTeams).mockResolvedValue([{ id: 1, name: 'Tổ A' }, { id: 2, name: 'Tổ B' }]);
    vi.mocked(api.fetchWeightPresets).mockResolvedValue([]);
  });
  afterEach(cleanup);

  it('liệt kê tài khoản với badge kiểu đăng nhập', async () => {
    open();
    expect(await screen.findByText('Nguyễn Văn An')).toBeDefined();
    expect(screen.getAllByText('SSO').length).toBe(1);
    expect(screen.getAllByText('Cục bộ').length).toBe(2);
    expect(screen.getByText('3 tài khoản')).toBeDefined();
  });

  it('tìm không dấu: gõ "nguyen" ra "Nguyễn"', async () => {
    open();
    await screen.findByText('Nguyễn Văn An');
    fireEvent.change(screen.getByPlaceholderText('Tìm theo tên, email, số điện thoại, Tổ'), { target: { value: 'nguyen' } });
    await waitFor(() => expect(screen.queryByText('Lê Bình')).toBeNull());
    expect(screen.getByText('Nguyễn Văn An')).toBeDefined();
  });

  it('lọc theo vai trò và theo kiểu đăng nhập', async () => {
    open();
    await screen.findByText('Nguyễn Văn An');
    fireEvent.change(screen.getByLabelText('Lọc theo vai trò'), { target: { value: 'leader' } });
    await waitFor(() => expect(screen.queryByText('Nguyễn Văn An')).toBeNull());
    expect(screen.getByText('Lê Bình')).toBeDefined();
    fireEvent.change(screen.getByLabelText('Lọc theo vai trò'), { target: { value: 'all' } });
    fireEvent.change(screen.getByLabelText('Lọc theo kiểu đăng nhập'), { target: { value: 'microsoft' } });
    await waitFor(() => expect(screen.queryByText('Lê Bình')).toBeNull());
    expect(screen.getByText('Nguyễn Văn An')).toBeDefined();
  });

  it('không có nút Xoá ở dòng của chính mình; có Sửa cho mọi dòng', async () => {
    open();
    await screen.findByText('Nguyễn Văn An');
    expect(screen.queryByRole('button', { name: 'Xoá Tôi Admin' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Xoá Lê Bình' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Sửa Tôi Admin' })).toBeDefined();
  });

  it('"Thêm tài khoản" mở hộp tạo tài khoản; xoá phải xác nhận', async () => {
    vi.mocked(api.deleteUser).mockResolvedValueOnce({ ok: true, deleted: true });
    open();
    await screen.findByText('Nguyễn Văn An');
    fireEvent.click(screen.getByRole('button', { name: 'Thêm tài khoản' }));
    expect(await screen.findByLabelText('Họ và tên')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Huỷ' }));
    fireEvent.click(screen.getByRole('button', { name: 'Xoá Lê Bình' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Xoá tài khoản' }));
    await waitFor(() => expect(api.deleteUser).toHaveBeenCalledWith(3));
  });

  it('lỗi tải danh sách hiện thông báo tiếng Việt', async () => {
    vi.mocked(api.fetchMembers).mockRejectedValue(new Error('Network Error'));
    open();
    expect(await screen.findByText('Không kết nối được máy chủ. Vui lòng thử lại.')).toBeDefined();
  });
});
```

Thêm vào `AppRoutes.test.tsx`:

```tsx
  it('admin mở được #/accounts; thành viên và Tổ trưởng bị đưa về Tổng quan', () => {
    renderAt('/accounts', 'admin');
    expect(screen.getByText('màn-quản-trị-tài-khoản')).toBeDefined();
    cleanup();
    renderAt('/accounts', 'leader');
    expect(screen.queryByText('màn-quản-trị-tài-khoản')).toBeNull();
    expect(screen.getByText('màn-tổng-quan')).toBeDefined();
  });
```

Thêm vào `PageLayout.test.tsx`:

```tsx
  it('mục "Quản trị tài khoản" chỉ hiện khi canViewAccounts và đưa tới /accounts', () => {
    const { unmount } = renderLayout(<PageLayout><div>x</div></PageLayout>);
    expect(screen.queryByText('Quản trị tài khoản')).toBeNull();
    unmount();
    renderLayout(<PageLayout canViewAccounts><div>x</div></PageLayout>);
    fireEvent.click(screen.getByText('Quản trị tài khoản'));
    expect(screen.getByTestId('path').textContent).toBe('/accounts');
  });
```

- [ ] **Step 2: Chạy, xác nhận hỏng**

Run: `cd web && npx vitest run src/core/features/accounts src/core/AppRoutes.test.tsx src/shared/layouts` — Expected: FAIL.

- [ ] **Step 3: Viết code**

```tsx
// web/src/core/features/accounts/AccountsView.tsx
import React, { useMemo, useState } from 'react';
import { token } from '@atlaskit/tokens';
import Button from '@atlaskit/button/new';
import Lozenge from '@atlaskit/lozenge';
import { useQuery } from '@tanstack/react-query';
import { apiErrorMessage, fetchMembers, type MemberItem } from '../../api';
import { MEMBERS_KEY } from '../../queryKeys';
import { LottieLoading } from '../../../shared/components/LottieLoading';
import { normalizeSearch } from '../../../shared/utils/text';
import { CreateAccountModal } from '../members/CreateAccountModal';
import { DeleteAccountDialog } from '../members/DeleteAccountDialog';
import { EditAccountModal } from '../members/EditAccountModal';
import { selectStyle } from '../people/FormField';
import { getRoleLabel, ROLE_OPTIONS } from '../people/roleLabels';
import { useCurrentUser } from '../people/useCurrentUser';

const cell: React.CSSProperties = { padding: '8px 10px', textAlign: 'left', borderBottom: `1px solid ${token('color.border', '#DFE1E6')}`, verticalAlign: 'top' };

/** `#accounts`: chỉ admin (AppRoutes chặn). Bộ trọng số và nhập hàng loạt gắn thêm ở Task 7, 8. */
export const AccountsView: React.FC = () => {
  const me = useCurrentUser();
  const { data, isLoading, error } = useQuery({ queryKey: MEMBERS_KEY, queryFn: fetchMembers });
  const [query, setQuery] = useState('');
  const [role, setRole] = useState('all');
  const [auth, setAuth] = useState('all');
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<MemberItem | null>(null);
  const [deleting, setDeleting] = useState<MemberItem | null>(null);

  const filtered = useMemo(() => {
    const q = normalizeSearch(query);
    return (data ?? []).filter((m) => {
      const matchQuery = !q || normalizeSearch(`${m.name} ${m.email} ${m.phone ?? ''} ${m.teams ?? ''}`).includes(q);
      const matchRole = role === 'all' || m.role === role;
      const matchAuth = auth === 'all' || (m.auth_provider || 'local') === auth;
      return matchQuery && matchRole && matchAuth;
    });
  }, [data, query, role, auth]);

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', paddingTop: 4 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 600 }}>Quản trị tài khoản</h1>
          <p style={{ margin: '6px 0 0', fontSize: 14, color: token('color.text.subtle', '#5E6C84') }}>
            Tạo, sửa và xoá tài khoản, nhập danh sách hàng loạt, cấu hình bộ trọng số.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button appearance="primary" onClick={() => setCreating(true)}>Thêm tài khoản</Button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tìm theo tên, email, số điện thoại, Tổ"
          aria-label="Tìm tài khoản"
          style={{ flex: '1 1 280px', height: 32, padding: '0 10px', borderRadius: 3, border: `1px solid ${token('color.border', '#DFE1E6')}`, background: token('elevation.surface', '#fff'), color: token('color.text', '#172B4D') }}
        />
        <select aria-label="Lọc theo vai trò" style={{ ...selectStyle, width: 180 }} value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="all">Tất cả vai trò</option>
          {ROLE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select aria-label="Lọc theo kiểu đăng nhập" style={{ ...selectStyle, width: 180 }} value={auth} onChange={(e) => setAuth(e.target.value)}>
          <option value="all">Mọi kiểu đăng nhập</option>
          <option value="local">Cục bộ</option>
          <option value="microsoft">SSO</option>
        </select>
      </div>

      {isLoading && <LottieLoading message="Đang tải danh sách tài khoản..." size={140} />}
      {error != null && <p role="alert" style={{ color: token('color.text.danger', '#AE2E24') }}>{apiErrorMessage(error, 'Không tải được danh sách tài khoản.')}</p>}
      {data && (
        <>
          <p style={{ fontSize: 13 }}>{filtered.length} tài khoản</p>
          {filtered.length === 0 ? (
            <p>Không tìm thấy tài khoản phù hợp. Thử đổi từ khoá hoặc bộ lọc.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                <thead>
                  <tr>
                    <th style={cell}>Tài khoản</th><th style={cell}>Tổ</th><th style={cell}>Vai trò</th><th style={cell}>Đăng nhập</th><th style={cell}><span style={{ position: 'absolute', left: -9999 }}>Thao tác</span></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((m) => (
                    <tr key={m.id}>
                      <td style={cell}>
                        <strong>{m.name}</strong>
                        <div style={{ fontSize: 12, color: token('color.text.subtle', '#5E6C84') }}>{m.email}{m.phone ? ` · ${m.phone}` : ''}</div>
                      </td>
                      <td style={cell}>{m.teams || 'Chưa có Tổ'}</td>
                      <td style={cell}><Lozenge>{getRoleLabel(m.role)}</Lozenge></td>
                      <td style={cell}><Lozenge appearance={m.auth_provider === 'microsoft' ? 'new' : 'default'}>{m.auth_provider === 'microsoft' ? 'SSO' : 'Cục bộ'}</Lozenge></td>
                      <td style={{ ...cell, whiteSpace: 'nowrap' }}>
                        <Button appearance="subtle" aria-label={`Sửa ${m.name}`} onClick={() => setEditing(m)}>Sửa</Button>
                        {m.id !== me?.id && <Button appearance="subtle" aria-label={`Xoá ${m.name}`} onClick={() => setDeleting(m)}>Xoá</Button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      <CreateAccountModal isOpen={creating} onClose={() => setCreating(false)} />
      <EditAccountModal member={editing} onClose={() => setEditing(null)} />
      <DeleteAccountDialog member={deleting} onClose={() => setDeleting(null)} />
    </div>
  );
};
```

Test "3 tài khoản" dựa vào `<p>{filtered.length} tài khoản</p>` — React tách thành hai text node nhưng `getByText` so khớp theo nội dung văn bản của phần tử nên vẫn khớp "3 tài khoản".

`AppRoutes.tsx`: thêm `import { AccountsView } from './features/accounts/AccountsView';` và route (trước `*`):

```tsx
      <Route path="/accounts" element={caps.isExec ? <AccountsView /> : <ToDashboard />} />
```

`PageLayout.tsx`: thêm `import SettingsIcon from '@atlaskit/icon/core/settings';`; thêm vào `NAV_ITEMS` sau mục Báo cáo:

```tsx
  { path: '/accounts', label: 'Quản trị tài khoản', Icon: SettingsIcon, adminOnly: true },
```

Khai báo kiểu `NAV_ITEMS` cho phép cả `managerOnly?` và `adminOnly?` (nếu TS suy ra union không có thuộc tính, ép kiểu: `const NAV_ITEMS: Array<{ path: string; label: string; Icon: React.ComponentType<{ label: string }>; managerOnly?: boolean; adminOnly?: boolean }> = [...]`). Thêm prop `canViewAccounts?: boolean` (mặc định `false`, JSDoc "Hiện mục 'Quản trị tài khoản' (chỉ admin)") và đổi bộ lọc:

```tsx
{NAV_ITEMS.filter((item) => (!item.managerOnly || canViewReports) && (!item.adminOnly || canViewAccounts)).map(...)}
```

`main.tsx`, trong `SignedInShell`: `<PageLayout ... canViewAccounts={caps.isExec} ...>`.

- [ ] **Step 4: Chạy**

Run: `cd web && npx vitest run src/core src/shared && npx tsc --noEmit -p .` — Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add web/src/core web/src/shared/layouts
git commit -m "feat(web): màn Quản trị tài khoản và mục menu cho admin"
```

---

### Task 7: Nhập tài khoản hàng loạt

**Files:**
- Create: `web/src/core/features/people/bulkImport.ts`, `web/src/core/features/accounts/BulkImportModal.tsx`
- Modify: `web/src/core/features/accounts/AccountsView.tsx`
- Test: `web/src/core/features/people/bulkImport.test.ts`, `web/src/core/features/accounts/BulkImportModal.test.tsx`

**Interfaces:**
- Consumes: `bulkImportUsers`, `BulkImportRow`, `FormDialog`, `invalidatePeople`.
- Produces: `parseBulkImport(text: string): BulkImportRow[]`; `BulkImportModal({ isOpen, onClose })`.

- [ ] **Step 1: Viết test hỏng**

```ts
// web/src/core/features/people/bulkImport.test.ts
import { describe, it, expect } from 'vitest';
import { parseBulkImport } from './bulkImport';

describe('parseBulkImport', () => {
  it('mỗi dòng "Tên,email"; bỏ dòng trống và khoảng trắng thừa', () => {
    expect(parseBulkImport('  Nguyễn Văn A , a@hust.edu.vn \n\n   \nLê B,b@hust.edu.vn\n')).toEqual([
      { name: 'Nguyễn Văn A', email: 'a@hust.edu.vn' },
      { name: 'Lê B', email: 'b@hust.edu.vn' },
    ]);
  });

  it('tách ở dấu phẩy CUỐI nên tên có dấu phẩy vẫn đúng', () => {
    expect(parseBulkImport('Trần, Thị C, c@hust.edu.vn')).toEqual([{ name: 'Trần, Thị C', email: 'c@hust.edu.vn' }]);
  });

  it('chấp nhận dấu tab (dán từ bảng tính) và xuống dòng kiểu Windows', () => {
    expect(parseBulkImport('A\ta@x.vn\r\nB\tb@x.vn')).toEqual([
      { name: 'A', email: 'a@x.vn' },
      { name: 'B', email: 'b@x.vn' },
    ]);
  });

  it('dòng không có dấu phân tách vẫn được gửi (server bỏ qua, tính vào "bỏ qua")', () => {
    expect(parseBulkImport('chỉ có một cột')).toEqual([{ name: 'chỉ có một cột', email: '' }]);
  });

  it('rỗng trả mảng rỗng', () => {
    expect(parseBulkImport('  \n \n')).toEqual([]);
  });
});
```

```tsx
// web/src/core/features/accounts/BulkImportModal.test.tsx
import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { BulkImportModal } from './BulkImportModal';
import * as api from '../../api';
import { renderWithApp } from '../../testing/peopleHarness';

vi.mock('../../api', async () => {
  const actual = await vi.importActual<typeof import('../../api')>('../../api');
  return { ...actual, bulkImportUsers: vi.fn() };
});

describe('BulkImportModal', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(cleanup);

  it('gửi các dòng đã chuẩn hoá, báo đã tạo/bỏ qua và làm mới cache', async () => {
    vi.mocked(api.bulkImportUsers).mockResolvedValueOnce({ ok: true, created: 2, skipped: 1 });
    const onClose = vi.fn();
    const { qc } = renderWithApp(<BulkImportModal isOpen onClose={onClose} />, { role: 'admin' });
    const spy = vi.spyOn(qc, 'invalidateQueries').mockResolvedValue(undefined);
    fireEvent.change(screen.getByLabelText('Danh sách (mỗi dòng: Tên,email)'), { target: { value: ' An , an@x.vn \n\nBình,binh@x.vn\nCường,cuong@x.vn' } });
    fireEvent.click(screen.getByRole('button', { name: 'Nhập' }));
    await waitFor(() =>
      expect(api.bulkImportUsers).toHaveBeenCalledWith([
        { name: 'An', email: 'an@x.vn' },
        { name: 'Bình', email: 'binh@x.vn' },
        { name: 'Cường', email: 'cuong@x.vn' },
      ])
    );
    expect(await screen.findByText('Đã tạo 2, bỏ qua 1.')).toBeDefined();
    await waitFor(() => expect(spy).toHaveBeenCalledWith({ queryKey: ['core-members'] }));
    expect(onClose).toHaveBeenCalled();
  });

  it('danh sách rỗng: báo lỗi, không gọi API', async () => {
    renderWithApp(<BulkImportModal isOpen onClose={() => {}} />, { role: 'admin' });
    fireEvent.change(screen.getByLabelText('Danh sách (mỗi dòng: Tên,email)'), { target: { value: '  \n ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Nhập' }));
    expect(await screen.findByText('Danh sách thành viên trống.')).toBeDefined();
    expect(api.bulkImportUsers).not.toHaveBeenCalled();
  });

  it('lỗi 403 hiện tiếng Việt trong hộp', async () => {
    vi.mocked(api.bulkImportUsers).mockRejectedValueOnce({ response: { status: 403, data: { error: 'Administrator access is required.' } } });
    renderWithApp(<BulkImportModal isOpen onClose={() => {}} />, { role: 'admin' });
    fireEvent.change(screen.getByLabelText('Danh sách (mỗi dòng: Tên,email)'), { target: { value: 'A,a@x.vn' } });
    fireEvent.click(screen.getByRole('button', { name: 'Nhập' }));
    expect(await screen.findByText('Chỉ quản trị viên được thực hiện thao tác này.')).toBeDefined();
  });
});
```

Thêm vào `AccountsView.test.tsx`:

```tsx
  it('"Nhập danh sách hàng loạt" mở hộp nhập', async () => {
    open();
    await screen.findByText('Nguyễn Văn An');
    fireEvent.click(screen.getByRole('button', { name: 'Nhập danh sách hàng loạt' }));
    expect(await screen.findByLabelText('Danh sách (mỗi dòng: Tên,email)')).toBeDefined();
  });
```

- [ ] **Step 2: Chạy, xác nhận hỏng** — `cd web && npx vitest run src/core/features/people/bulkImport.test.ts src/core/features/accounts` — Expected: FAIL.

- [ ] **Step 3: Viết code**

```ts
// web/src/core/features/people/bulkImport.ts
import type { BulkImportRow } from '../../api';

/**
 * Mỗi dòng "Tên,email" (hoặc Tên<tab>email khi dán từ bảng tính). Tách ở dấu phân tách CUỐI nên tên có dấu phẩy vẫn đúng.
 * Bỏ dòng trống. Dòng thiếu email vẫn gửi để server tính vào "bỏ qua".
 */
export function parseBulkImport(text: string): BulkImportRow[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const cut = Math.max(line.lastIndexOf(','), line.lastIndexOf('\t'));
      if (cut < 0) return { name: line, email: '' };
      return { name: line.slice(0, cut).trim(), email: line.slice(cut + 1).trim() };
    });
}
```

```tsx
// web/src/core/features/accounts/BulkImportModal.tsx
import React, { useId, useState } from 'react';
import { ModalTransition } from '@atlaskit/modal-dialog';
import TextArea from '@atlaskit/textarea';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiErrorMessage, bulkImportUsers } from '../../api';
import { useToast } from '../../../shared/components/Toast';
import { parseBulkImport } from '../people/bulkImport';
import { FormDialog } from '../people/FormDialog';
import { FormField } from '../people/FormField';
import { invalidatePeople } from '../people/invalidate';

export const BulkImportModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => (
  <ModalTransition>{isOpen && <BulkImportDialog onClose={onClose} />}</ModalTransition>
);

const BulkImportDialog: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const textId = useId();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [text, setText] = useState('');
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: () => bulkImportUsers(parseBulkImport(text)),
    onSuccess: (result) => {
      toast.success(`Đã tạo ${result.created}, bỏ qua ${result.skipped}.`);
      void invalidatePeople(queryClient);
      onClose();
    },
    onError: (err) => setError(apiErrorMessage(err, 'Không nhập được danh sách.')),
  });

  const submit = () => {
    if (parseBulkImport(text).length === 0) {
      setError('Danh sách thành viên trống.');
      return;
    }
    setError('');
    mutation.mutate();
  };

  return (
    <FormDialog title="Nhập danh sách hàng loạt" submitLabel="Nhập" isSubmitting={mutation.isPending} error={error} onSubmit={submit} onClose={onClose}>
      <FormField
        label="Danh sách (mỗi dòng: Tên,email)"
        htmlFor={textId}
        hint="Tài khoản được tạo là thành viên, đăng nhập SSO, chưa thuộc Tổ nào. Email sai hoặc đã có sẽ bị bỏ qua."
      >
        <TextArea id={textId} value={text} minimumRows={8} onChange={(e) => setText(e.target.value)} />
      </FormField>
    </FormDialog>
  );
};
```

`AccountsView.tsx`: thêm `import { BulkImportModal } from './BulkImportModal';`, state `const [importing, setImporting] = useState(false);`, nút trước "Thêm tài khoản": `<Button onClick={() => setImporting(true)}>Nhập danh sách hàng loạt</Button>`, và cuối JSX `<BulkImportModal isOpen={importing} onClose={() => setImporting(false)} />`.

- [ ] **Step 4: Chạy** — `cd web && npx vitest run src/core/features && npx tsc --noEmit -p .` — Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add web/src/core/features/people web/src/core/features/accounts
git commit -m "feat(web): nhập tài khoản hàng loạt"
```

---

### Task 8: Bộ trọng số (admin)

**Files:**
- Create: `web/src/core/features/accounts/WeightPresetsPanel.tsx`, `web/src/core/features/accounts/WeightPresetModal.tsx`
- Modify: `web/src/core/features/accounts/AccountsView.tsx`
- Test: `web/src/core/features/accounts/WeightPresetsPanel.test.tsx`

**Interfaces:**
- Consumes: `fetchWeightPresets`, `createWeightPreset`, `updateWeightPreset`, `deleteWeightPreset`, `settingLock`, `settingErrorMessage`, `WEIGHT_PRESETS_KEY`, `FormDialog`, `ConfirmDialog`.
- Produces: `WeightPresetsPanel`; `WeightPresetModal({ preset, isOpen, onClose, onSubmit })` với `onSubmit: (payload: WeightPresetPayload) => Promise<void>`.

- [ ] **Step 1: Viết test hỏng**

```tsx
// web/src/core/features/accounts/WeightPresetsPanel.test.tsx
import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { WeightPresetsPanel } from './WeightPresetsPanel';
import * as api from '../../api';
import { renderWithApp } from '../../testing/peopleHarness';

vi.mock('../../api', async () => {
  const actual = await vi.importActual<typeof import('../../api')>('../../api');
  return { ...actual, fetchWeightPresets: vi.fn(), createWeightPreset: vi.fn(), updateWeightPreset: vi.fn(), deleteWeightPreset: vi.fn() };
});

const presets: api.WeightPreset[] = [
  { id: 1, name: 'Việc nhỏ', points: 1, description: 'Dưới 1 giờ', sort_order: 1, is_active: 1 },
  { id: 2, name: 'Việc lớn', points: 8, description: null, sort_order: 2, is_active: 0 },
];
const locked = {
  response: { status: 403, data: { error: 'Cấu hình này đang bị DYC khoá.', locked: true, reason: 'Đang rà soát trọng số', locked_by_name: 'Nguyễn DYC' } },
};

const open = () => renderWithApp(<WeightPresetsPanel />, { role: 'admin' });

describe('WeightPresetsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.fetchWeightPresets).mockResolvedValue(presets);
  });
  afterEach(cleanup);

  it('liệt kê preset, đánh dấu preset đã tắt', async () => {
    open();
    expect(await screen.findByText('Việc nhỏ')).toBeDefined();
    expect(screen.getByText('1 điểm')).toBeDefined();
    expect(screen.getByText('8 điểm')).toBeDefined();
    expect(screen.getByText('Đã tắt')).toBeDefined();
  });

  it('thêm preset: POST đúng body và làm mới danh sách', async () => {
    vi.mocked(api.createWeightPreset).mockResolvedValueOnce({ ...presets[0], id: 3 });
    const { qc } = open();
    const spy = vi.spyOn(qc, 'invalidateQueries').mockResolvedValue(undefined);
    await screen.findByText('Việc nhỏ');
    fireEvent.click(screen.getByRole('button', { name: 'Thêm preset' }));
    fireEvent.change(await screen.findByLabelText('Tên preset'), { target: { value: ' Việc vừa ' } });
    fireEvent.change(screen.getByLabelText('Điểm (0–10)'), { target: { value: '5' } });
    fireEvent.change(screen.getByLabelText('Thứ tự'), { target: { value: '3' } });
    fireEvent.change(screen.getByLabelText('Mô tả'), { target: { value: 'Nửa ngày' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lưu' }));
    await waitFor(() =>
      expect(api.createWeightPreset).toHaveBeenCalledWith({ name: 'Việc vừa', points: 5, sort_order: 3, description: 'Nửa ngày' })
    );
    expect(await screen.findByText('Đã thêm preset.')).toBeDefined();
    await waitFor(() => expect(spy).toHaveBeenCalledWith({ queryKey: ['core-weight-presets'] }));
  });

  it('chặn điểm ngoài 0–10, số thập phân và tên rỗng ở client', async () => {
    open();
    await screen.findByText('Việc nhỏ');
    fireEvent.click(screen.getByRole('button', { name: 'Thêm preset' }));
    const points = await screen.findByLabelText('Điểm (0–10)');
    fireEvent.click(screen.getByRole('button', { name: 'Lưu' }));
    expect(await screen.findByText('Tên preset không được để trống.')).toBeDefined();
    fireEvent.change(screen.getByLabelText('Tên preset'), { target: { value: 'X' } });
    for (const bad of ['11', '-1', '2.5', '']) {
      fireEvent.change(points, { target: { value: bad } });
      fireEvent.click(screen.getByRole('button', { name: 'Lưu' }));
      expect(await screen.findByText('Điểm trọng số phải là số nguyên từ 0 đến 10.')).toBeDefined();
    }
    expect(api.createWeightPreset).not.toHaveBeenCalled();
  });

  it('sửa preset: PATCH kèm is_active', async () => {
    vi.mocked(api.updateWeightPreset).mockResolvedValueOnce({ ok: true });
    open();
    fireEvent.click(await screen.findByRole('button', { name: 'Sửa Việc lớn' }));
    expect((await screen.findByLabelText('Tên preset') as HTMLInputElement).value).toBe('Việc lớn');
    fireEvent.click(screen.getByLabelText('Đang dùng'));
    fireEvent.click(screen.getByRole('button', { name: 'Lưu' }));
    await waitFor(() =>
      expect(api.updateWeightPreset).toHaveBeenCalledWith(2, { name: 'Việc lớn', points: 8, sort_order: 2, description: '', is_active: true })
    );
    expect(await screen.findByText('Đã cập nhật preset.')).toBeDefined();
  });

  it('xoá phải xác nhận: huỷ thì không gọi, đồng ý thì DELETE', async () => {
    vi.mocked(api.deleteWeightPreset).mockResolvedValueOnce({ ok: true, deleted: true });
    open();
    fireEvent.click(await screen.findByRole('button', { name: 'Xoá Việc nhỏ' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Huỷ' }));
    expect(api.deleteWeightPreset).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Xoá Việc nhỏ' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Xoá preset' }));
    await waitFor(() => expect(api.deleteWeightPreset).toHaveBeenCalledWith(1));
    expect(await screen.findByText('Đã xoá preset.')).toBeDefined();
  });

  it('bị DYC khoá khi sửa: banner nêu lý do và người khoá, hộp giữ nguyên để sửa lại', async () => {
    vi.mocked(api.updateWeightPreset).mockRejectedValueOnce(locked);
    open();
    fireEvent.click(await screen.findByRole('button', { name: 'Sửa Việc nhỏ' }));
    await screen.findByLabelText('Tên preset');
    fireEvent.click(screen.getByRole('button', { name: 'Lưu' }));
    const banner = await screen.findAllByText(/Cấu hình này đang bị DYC khoá\./);
    expect(banner.length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Lý do: Đang rà soát trọng số\./).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Người khoá: Nguyễn DYC\./).length).toBeGreaterThan(0);
  });

  it('bị khoá khi xoá: banner trên panel và toast', async () => {
    vi.mocked(api.deleteWeightPreset).mockRejectedValueOnce(locked);
    open();
    fireEvent.click(await screen.findByRole('button', { name: 'Xoá Việc nhỏ' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Xoá preset' }));
    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('Cấu hình này đang bị DYC khoá.');
    expect(alert.textContent).toContain('Đang rà soát trọng số');
  });

  it('lỗi khác (404) hiện nguyên văn tiếng Việt, không có banner khoá', async () => {
    vi.mocked(api.deleteWeightPreset).mockRejectedValueOnce({ response: { status: 404, data: { error: 'Preset không tồn tại.' } } });
    open();
    fireEvent.click(await screen.findByRole('button', { name: 'Xoá Việc nhỏ' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Xoá preset' }));
    expect(await screen.findByText('Preset không tồn tại.')).toBeDefined();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('không có quyền đọc cấu hình: hiện câu lỗi của server', async () => {
    vi.mocked(api.fetchWeightPresets).mockRejectedValue({ response: { status: 403, data: { error: 'Bạn không có quyền với cấu hình này.' } } });
    open();
    expect(await screen.findByText('Bạn không có quyền với cấu hình này.')).toBeDefined();
    expect(screen.queryByRole('button', { name: 'Thêm preset' })).toBeNull();
  });
});
```

Thêm vào `AccountsView.test.tsx` một ca: `open(); expect(await screen.findByRole('heading', { name: 'Bộ trọng số' })).toBeDefined();` (mock `fetchWeightPresets` đã có trong file).

- [ ] **Step 2: Chạy, xác nhận hỏng** — `cd web && npx vitest run src/core/features/accounts` — Expected: FAIL.

- [ ] **Step 3: Viết code**

```tsx
// web/src/core/features/accounts/WeightPresetModal.tsx
import React, { useId, useState } from 'react';
import { ModalTransition } from '@atlaskit/modal-dialog';
import Textfield from '@atlaskit/textfield';
import TextArea from '@atlaskit/textarea';
import { settingErrorMessage, type WeightPreset, type WeightPresetPayload } from '../../api';
import { FormDialog } from '../people/FormDialog';
import { FormField } from '../people/FormField';

export interface WeightPresetModalProps {
  isOpen: boolean;
  /** Có `preset` là sửa, không có là thêm. */
  preset: WeightPreset | null;
  onClose: () => void;
  onSubmit: (payload: WeightPresetPayload) => Promise<void>;
}

export const WeightPresetModal: React.FC<WeightPresetModalProps> = ({ isOpen, preset, onClose, onSubmit }) => (
  <ModalTransition>{isOpen && <WeightPresetDialog preset={preset} onClose={onClose} onSubmit={onSubmit} />}</ModalTransition>
);

const WeightPresetDialog: React.FC<Omit<WeightPresetModalProps, 'isOpen'>> = ({ preset, onClose, onSubmit }) => {
  const ids = { name: useId(), points: useId(), order: useId(), description: useId(), active: useId() };
  const [name, setName] = useState(preset?.name ?? '');
  const [points, setPoints] = useState(preset ? String(preset.points) : '1');
  const [order, setOrder] = useState(preset ? String(preset.sort_order) : '0');
  const [description, setDescription] = useState(preset?.description ?? '');
  const [active, setActive] = useState(preset ? Boolean(Number(preset.is_active)) : true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const trimmed = name.trim();
    if (!trimmed) return setError('Tên preset không được để trống.');
    if (trimmed.length > 100) return setError('Tên preset tối đa 100 ký tự.');
    // Cột `weight_presets.points` là TINYINT và trọng số tự ghi nhận là số nguyên 0–10 (SPEC-WEB-003 mục 2).
    if (!/^\d+$/.test(points.trim()) || Number(points) > 10) return setError('Điểm trọng số phải là số nguyên từ 0 đến 10.');
    if (!/^-?\d+$/.test(order.trim())) return setError('Thứ tự phải là số nguyên.');
    setError('');
    setBusy(true);
    try {
      await onSubmit({
        name: trimmed,
        points: Number(points),
        sort_order: Number(order),
        description: description.trim(),
        ...(preset ? { is_active: active } : {}),
      });
      onClose();
    } catch (err) {
      setError(settingErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <FormDialog title={preset ? 'Sửa preset' : 'Thêm preset'} submitLabel="Lưu" isSubmitting={busy} error={error} onSubmit={() => void submit()} onClose={onClose}>
      <FormField label="Tên preset" htmlFor={ids.name}>
        <Textfield id={ids.name} maxLength={100} value={name} onChange={(e) => setName((e.target as HTMLInputElement).value)} />
      </FormField>
      <FormField label="Điểm (0–10)" htmlFor={ids.points}>
        <Textfield id={ids.points} inputMode="numeric" value={points} onChange={(e) => setPoints((e.target as HTMLInputElement).value)} />
      </FormField>
      <FormField label="Thứ tự" htmlFor={ids.order}>
        <Textfield id={ids.order} inputMode="numeric" value={order} onChange={(e) => setOrder((e.target as HTMLInputElement).value)} />
      </FormField>
      <FormField label="Mô tả" htmlFor={ids.description}>
        <TextArea id={ids.description} value={description} minimumRows={2} maxLength={255} onChange={(e) => setDescription(e.target.value)} />
      </FormField>
      {preset && (
        <div>
          <input id={ids.active} type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />{' '}
          <label htmlFor={ids.active}>Đang dùng</label>
        </div>
      )}
    </FormDialog>
  );
};
```

(Ô điểm dùng văn bản + `inputMode="numeric"` thay vì `type="number"` để tự kiểm "2.5", "-1" và chuỗi rỗng bằng regex, tránh trình duyệt tự chuẩn hoá.)

```tsx
// web/src/core/features/accounts/WeightPresetsPanel.tsx
import React, { useState } from 'react';
import { token } from '@atlaskit/tokens';
import Button from '@atlaskit/button/new';
import Lozenge from '@atlaskit/lozenge';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  apiErrorMessage, createWeightPreset, deleteWeightPreset, fetchWeightPresets, settingErrorMessage, settingLock, updateWeightPreset,
  type SettingLock, type WeightPreset, type WeightPresetPayload,
} from '../../api';
import { WEIGHT_PRESETS_KEY } from '../../queryKeys';
import { ConfirmDialog } from '../../../shared/components/ConfirmDialog';
import { useToast } from '../../../shared/components/Toast';
import { WeightPresetModal } from './WeightPresetModal';

export const WeightPresetsPanel: React.FC = () => {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { data, isLoading, error } = useQuery({ queryKey: WEIGHT_PRESETS_KEY, queryFn: fetchWeightPresets });
  const [modal, setModal] = useState<{ preset: WeightPreset | null } | null>(null);
  const [deleting, setDeleting] = useState<WeightPreset | null>(null);
  const [busy, setBusy] = useState(false);
  const [lock, setLock] = useState<SettingLock | null>(null);

  /** Chạy một thao tác ghi: thành công thì báo + làm mới; bị khoá thì ghi nhớ để hiện banner rồi ném lại cho nơi gọi. */
  const run = async (action: () => Promise<unknown>, okMessage: string) => {
    try {
      await action();
      setLock(null);
      toast.success(okMessage);
      void queryClient.invalidateQueries({ queryKey: WEIGHT_PRESETS_KEY });
    } catch (err) {
      const found = settingLock(err);
      if (found) setLock(found);
      throw err;
    }
  };

  const save = (payload: WeightPresetPayload) => {
    const editing = modal?.preset;
    return run(
      () => (editing ? updateWeightPreset(editing.id, payload) : createWeightPreset(payload)),
      editing ? 'Đã cập nhật preset.' : 'Đã thêm preset.'
    );
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setBusy(true);
    try {
      await run(() => deleteWeightPreset(deleting.id), 'Đã xoá preset.');
    } catch (err) {
      toast.error(settingErrorMessage(err));
    } finally {
      setBusy(false);
      setDeleting(null);
    }
  };

  return (
    <section style={{ marginTop: 32, border: `1px solid ${token('color.border', '#DFE1E6')}`, borderRadius: 6, padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>Bộ trọng số</h2>
        {data && <Button appearance="primary" onClick={() => setModal({ preset: null })}>Thêm preset</Button>}
      </div>
      <p style={{ color: token('color.text.subtle', '#5E6C84') }}>
        Các mức trọng số định sẵn (số nguyên 0–10) để thành viên chọn khi tự ghi nhận công việc.
      </p>
      {lock && (
        <p role="alert" style={{ padding: 8, borderRadius: 3, background: token('color.background.danger', '#FFEDEB'), color: token('color.text.danger', '#AE2E24') }}>
          {lock.message}
          {lock.reason ? ` Lý do: ${lock.reason}.` : ''}
          {lock.lockedBy ? ` Người khoá: ${lock.lockedBy}.` : ''}
        </p>
      )}
      {isLoading && <p>Đang tải...</p>}
      {error != null && <p role="alert" style={{ color: token('color.text.danger', '#AE2E24') }}>{apiErrorMessage(error, 'Không tải được bộ trọng số.')}</p>}
      {data && data.length === 0 && <p>Chưa có preset nào.</p>}
      {data && data.map((p) => (
        <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderTop: `1px solid ${token('color.border', '#DFE1E6')}` }}>
          <strong style={{ width: 64 }}>{Number(p.points)} điểm</strong>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div>{p.name} {!Number(p.is_active) && <Lozenge appearance="removed">Đã tắt</Lozenge>}</div>
            {p.description && <small style={{ color: token('color.text.subtle', '#5E6C84') }}>{p.description}</small>}
          </div>
          <span style={{ fontSize: 12 }}>Thứ tự {p.sort_order}</span>
          <Button appearance="subtle" aria-label={`Sửa ${p.name}`} onClick={() => setModal({ preset: p })}>Sửa</Button>
          <Button appearance="subtle" aria-label={`Xoá ${p.name}`} onClick={() => setDeleting(p)}>Xoá</Button>
        </div>
      ))}

      <WeightPresetModal isOpen={modal !== null} preset={modal?.preset ?? null} onClose={() => setModal(null)} onSubmit={save} />
      <ConfirmDialog
        isOpen={deleting !== null}
        title="Xoá preset trọng số"
        appearance="danger"
        confirmLabel="Xoá preset"
        isLoading={busy}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setDeleting(null)}
      >
        <p>Xoá preset <strong>{deleting?.name}</strong>? Công việc đã dùng trọng số này không bị ảnh hưởng.</p>
      </ConfirmDialog>
    </section>
  );
};
```

Lưu ý về test banner khi sửa: lỗi bị khoá hiện ở **cả** banner của panel và vùng lỗi trong hộp (hộp vẫn mở) nên test dùng `findAllByText`. Lưu ý chữ "Lý do: …" nằm chung một text node với câu "Cấu hình này đang bị DYC khoá." trong banner (`{lock.message}{reason}…` ghép thành nhiều text node trong cùng `<p>`; `getByText` khớp theo nội dung của phần tử nên regex vẫn khớp cả đoạn) — nếu regex không khớp vì tách node, đổi test sang kiểm `alert.textContent` như ca xoá.

`AccountsView.tsx`: thêm `import { WeightPresetsPanel } from './WeightPresetsPanel';` và `<WeightPresetsPanel />` ngay trước ba modal ở cuối JSX.

- [ ] **Step 4: Chạy** — `cd web && npx vitest run src/core/features/accounts && npx tsc --noEmit -p .` — Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add web/src/core/features/accounts
git commit -m "feat(web): bộ trọng số có hiển thị khoá của DYC"
```

---

### Task 9: Tài khoản của tôi

**Files:**
- Create: `web/src/core/features/session/MyAccountModal.tsx`
- Modify: `web/src/shared/layouts/PageLayout.tsx`, `web/src/shared/layouts/PageLayout.test.tsx`, `web/src/core/main.tsx`, `web/src/core/main.test.tsx`
- Test: `web/src/core/features/session/MyAccountModal.test.tsx`

**Interfaces:**
- Consumes: `updateMyAccount`, `AccountPayload`, `SESSION_KEY`, `MEMBERS_KEY`, `useCurrentUser`, `FormDialog`, `FormField`.
- Produces: `MyAccountModal({ isOpen, onClose })`; prop `onOpenAccount?: () => void` của `PageLayout`.

- [ ] **Step 1: Viết test hỏng**

```tsx
// web/src/core/features/session/MyAccountModal.test.tsx
import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { MyAccountModal } from './MyAccountModal';
import * as api from '../../api';
import { SESSION_KEY } from '../../queryKeys';
import { renderWithApp } from '../../testing/peopleHarness';

vi.mock('../../api', async () => {
  const actual = await vi.importActual<typeof import('../../api')>('../../api');
  return { ...actual, updateMyAccount: vi.fn() };
});

const open = (onClose = vi.fn()) => ({ onClose, ...renderWithApp(<MyAccountModal isOpen onClose={onClose} />, { role: 'member', userId: 7 }) });

describe('MyAccountModal', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(cleanup);

  it('điền sẵn thông tin hiện tại và nói rõ tên/vai trò do quản lý đổi', () => {
    open();
    expect((screen.getByLabelText('Email') as HTMLInputElement).value).toBe('toi@x.vn');
    expect((screen.getByLabelText('Màu đại diện') as HTMLInputElement).value).toBe('#0052cc');
    expect(screen.getByText(/chỉ quản lý mới đổi được tên và vai trò/i)).toBeDefined();
  });

  it('lưu: PATCH không có password khi để trống, cập nhật cache session, báo và đóng hộp', async () => {
    vi.mocked(api.updateMyAccount).mockResolvedValueOnce({ id: 7, name: 'Tôi', email: 'moi@x.vn', role: 'member', phone: '0912', avatar_color: '#ff0000' });
    const { onClose, qc } = open();
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: '  moi@x.vn ' } });
    fireEvent.change(screen.getByLabelText('Số điện thoại'), { target: { value: ' 0912 ' } });
    fireEvent.change(screen.getByLabelText('Màu đại diện'), { target: { value: '#ff0000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lưu tài khoản' }));
    await waitFor(() => expect(api.updateMyAccount).toHaveBeenCalledWith({ email: 'moi@x.vn', phone: '0912', avatar_color: '#ff0000' }));
    const body = vi.mocked(api.updateMyAccount).mock.calls[0][0];
    expect('password' in body).toBe(false);
    expect(await screen.findByText('Đã cập nhật tài khoản.')).toBeDefined();
    expect(onClose).toHaveBeenCalled();
    const session = qc.getQueryData(SESSION_KEY) as { user: { email: string; avatar_color: string } };
    expect(session.user.email).toBe('moi@x.vn');
    expect(session.user.avatar_color).toBe('#ff0000');
  });

  it('có nhập mật khẩu mới thì gửi password', async () => {
    vi.mocked(api.updateMyAccount).mockResolvedValueOnce({ id: 7, name: 'Tôi', email: 'toi@x.vn', role: 'member' });
    open();
    fireEvent.change(screen.getByLabelText('Mật khẩu mới'), { target: { value: 'matkhaumoi1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lưu tài khoản' }));
    await waitFor(() => expect(api.updateMyAccount).toHaveBeenCalledWith({ email: 'toi@x.vn', phone: '', avatar_color: '#0052cc', password: 'matkhaumoi1' }));
  });

  it('chặn email sai định dạng và mật khẩu ngắn trước khi gửi', async () => {
    open();
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'khong-phai-email' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lưu tài khoản' }));
    expect(await screen.findByText('Vui lòng nhập email hợp lệ.')).toBeDefined();
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'ok@x.vn' } });
    fireEvent.change(screen.getByLabelText('Mật khẩu mới'), { target: { value: '123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lưu tài khoản' }));
    expect(await screen.findByText('Mật khẩu phải có ít nhất 8 ký tự.')).toBeDefined();
    expect(api.updateMyAccount).not.toHaveBeenCalled();
  });

  it('lỗi server hiện tiếng Việt, hộp không đóng, cache giữ nguyên', async () => {
    vi.mocked(api.updateMyAccount).mockRejectedValueOnce({ response: { status: 400, data: { error: 'A valid email and avatar color are required.' } } });
    const { onClose, qc } = open();
    fireEvent.click(screen.getByRole('button', { name: 'Lưu tài khoản' }));
    expect(await screen.findByText('Cần có email và màu đại diện hợp lệ.')).toBeDefined();
    expect(onClose).not.toHaveBeenCalled();
    expect((qc.getQueryData(SESSION_KEY) as { user: { email: string } }).user.email).toBe('toi@x.vn');
  });
});
```

Thêm vào `PageLayout.test.tsx`:

```tsx
  it('bấm vào tên người dùng gọi onOpenAccount', () => {
    const onOpenAccount = vi.fn();
    renderLayout(<PageLayout user={{ name: 'Nguyễn Văn A' }} onOpenAccount={onOpenAccount}><div>x</div></PageLayout>);
    fireEvent.click(screen.getByRole('button', { name: 'Tài khoản của tôi' }));
    expect(onOpenAccount).toHaveBeenCalledTimes(1);
  });
```

Thêm vào `main.test.tsx` (trong `describe('Core App main entry')`, theo mẫu ca "renders PageLayout and Dashboard…", dùng `mockResolvedValue` thay vì `Once` để các lần refetch vẫn có dữ liệu):

```tsx
  it('admin thấy mục Quản trị tài khoản và mở được hộp Tài khoản của tôi từ chip người dùng', async () => {
    vi.mocked(api.fetchSession).mockResolvedValue({
      user: { id: 1, name: 'Phạm Việt Bách', email: 'bach@x.vn', role: 'admin', avatar_color: '#0052cc' },
      units: { current: null, memberships: [] },
    });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    );
    expect(await screen.findByText('Quản trị tài khoản')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Tài khoản của tôi' }));
    expect(await screen.findByLabelText('Mật khẩu mới')).toBeDefined();
  });
```

- [ ] **Step 2: Chạy, xác nhận hỏng** — `cd web && npx vitest run src/core/features/session src/shared/layouts src/core/main.test.tsx` — Expected: FAIL.

- [ ] **Step 3: Viết code**

```tsx
// web/src/core/features/session/MyAccountModal.tsx
import React, { useId, useState } from 'react';
import { ModalTransition } from '@atlaskit/modal-dialog';
import Textfield from '@atlaskit/textfield';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiErrorMessage, updateMyAccount, type SessionData } from '../../api';
import { MEMBERS_KEY, SESSION_KEY } from '../../queryKeys';
import { useToast } from '../../../shared/components/Toast';
import { FormDialog } from '../people/FormDialog';
import { FormField } from '../people/FormField';
import { useCurrentUser } from '../people/useCurrentUser';

const COLOR_RE = /^#[0-9a-f]{6}$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+$/;

export const MyAccountModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => (
  <ModalTransition>{isOpen && <MyAccountDialog onClose={onClose} />}</ModalTransition>
);

const MyAccountDialog: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const ids = { email: useId(), phone: useId(), color: useId(), password: useId() };
  const user = useCurrentUser();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [email, setEmail] = useState(user?.email ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [color, setColor] = useState(user?.avatar_color && COLOR_RE.test(user.avatar_color) ? user.avatar_color : '#0052cc');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: () =>
      updateMyAccount({ email: email.trim(), phone: phone.trim(), avatar_color: color, ...(password ? { password } : {}) }),
    onSuccess: (updated) => {
      queryClient.setQueryData<SessionData>(SESSION_KEY, (prev) => (prev ? { ...prev, user: { ...prev.user, ...updated } } : prev));
      void queryClient.invalidateQueries({ queryKey: MEMBERS_KEY });
      toast.success('Đã cập nhật tài khoản.');
      onClose();
    },
    onError: (err) => setError(apiErrorMessage(err, 'Không cập nhật được tài khoản.')),
  });

  const submit = () => {
    if (!EMAIL_RE.test(email.trim())) return setError('Vui lòng nhập email hợp lệ.');
    if (password && password.length < 8) return setError('Mật khẩu phải có ít nhất 8 ký tự.');
    setError('');
    mutation.mutate();
  };

  return (
    <FormDialog title="Tài khoản của tôi" submitLabel="Lưu tài khoản" isSubmitting={mutation.isPending} error={error} onSubmit={submit} onClose={onClose}>
      <p style={{ marginTop: 0 }}>
        <strong>{user?.name}</strong> — chỉ quản lý mới đổi được tên và vai trò của tài khoản.
      </p>
      <FormField label="Email" htmlFor={ids.email}>
        <Textfield id={ids.email} type="email" value={email} onChange={(e) => setEmail((e.target as HTMLInputElement).value)} />
      </FormField>
      <FormField label="Số điện thoại" htmlFor={ids.phone}>
        <Textfield id={ids.phone} value={phone} onChange={(e) => setPhone((e.target as HTMLInputElement).value)} />
      </FormField>
      <FormField label="Màu đại diện" htmlFor={ids.color}>
        <input id={ids.color} type="color" value={color} onChange={(e) => setColor(e.target.value)} />
      </FormField>
      <FormField label="Mật khẩu mới" htmlFor={ids.password} hint="Để trống để giữ mật khẩu hiện tại. Tối thiểu 8 ký tự.">
        <Textfield id={ids.password} type="password" value={password} onChange={(e) => setPassword((e.target as HTMLInputElement).value)} />
      </FormField>
    </FormDialog>
  );
};
```

Ghi chú: `{ ...prev.user, ...updated }` hợp lệ vì `prev.user` có thể `null` — nếu `tsc` báo lỗi kiểu, viết `user: prev.user ? { ...prev.user, ...updated } : updated`.

`PageLayout.tsx`: thêm prop `onOpenAccount?: () => void` (JSDoc "Mở hộp 'Tài khoản của tôi' khi bấm vào tên người dùng"). Thay đoạn `<Avatar .../>` + tên bằng:

```tsx
              {user && onOpenAccount ? (
                <button
                  type="button"
                  onClick={onOpenAccount}
                  aria-label="Tài khoản của tôi"
                  title="Tài khoản của tôi"
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px', borderRadius: '4px', color: 'inherit' }}
                >
                  <Avatar size="small" appearance="circle" name={user.name} />
                  <span style={{ fontSize: '12px', fontWeight: 600, color: token('color.text', '#172B4D') }}>{user.name}</span>
                </button>
              ) : (
                <>
                  <Avatar size="small" appearance="circle" name={user?.name || 'User'} />
                  {user && (
                    <span style={{ fontSize: '12px', fontWeight: 600, color: token('color.text', '#172B4D') }}>{user.name}</span>
                  )}
                </>
              )}
```

(Đợt 4 thêm chuông thông báo cạnh `headerExtras`; không xung đột vì chỉ thay khối Avatar+tên.)

`main.tsx`: thêm `import { MyAccountModal } from './features/session/MyAccountModal';`, và sửa `SignedInShell`:

```tsx
const SignedInShell: React.FC<{ userName: string; user: SessionUser; onLogout: () => void }> = ({ userName, user, onLogout }) => {
  const caps = useCapabilities();
  const [accountOpen, setAccountOpen] = React.useState(false);
  return (
    <>
      <PageLayout
        user={user}
        onLogout={onLogout}
        canViewReports={caps.isManager}
        canViewAccounts={caps.isExec}
        onOpenAccount={() => setAccountOpen(true)}
        headerExtras={<UnitSwitcher />}
      >
        <AppRoutes userName={userName} />
      </PageLayout>
      <MyAccountModal isOpen={accountOpen} onClose={() => setAccountOpen(false)} />
    </>
  );
};
```

(Giữ nguyên mọi prop khác mà đợt khác đã thêm vào `PageLayout` ở `SignedInShell`.)

- [ ] **Step 4: Chạy toàn bộ**

Run: `cd web && npm test && npx tsc --noEmit -p . && npm run build` — Expected: xanh.

- [ ] **Step 5: Commit**

```bash
git add web/src
git commit -m "feat(web): hộp Tài khoản của tôi mở từ chip người dùng"
```

---

### Task 10: Tài liệu, kiểm tra và PR

**Files:**
- Modify: `docs/dev/frontend.md` (mục `web/`: thêm route, thành phần, câu lỗi; bump MINOR, `updated`, lịch sử)
- Modify: `docs/specs/2026-10-09-web-hoan-thien-thay-the-design.md` (ghi đợt 3 xong + các quyết định; bump MINOR, lịch sử)
- Modify: `docs/ai/bay-da-gap.md` (thêm bẫy trọng số TINYINT; bump MINOR, lịch sử)
- Không đổi tài liệu `core/` (không đổi API).

- [ ] **Step 1: Cập nhật `docs/dev/frontend.md`** — trong mục `## Core — web/`, thêm các dòng:
  - Route `#/team/:id` (admin hoặc người quản lý Tổ; 403 → về Tổng quan kèm thông báo) và `#/accounts` (chỉ admin) — `web/src/core/AppRoutes.tsx`; mục menu "Quản trị tài khoản" qua `canViewAccounts` của `PageLayout`.
  - Mọi thao tác Tổ/tài khoản/trọng số dùng `useMutation` + `invalidatePeople(qc)` (`web/src/core/features/people/invalidate.ts`); modal form dùng `FormDialog`.
  - Quyền sửa tài khoản: Tổ trưởng không gửi `email`/`password`; Tổ trưởng chỉ thêm tài khoản `member` vào Tổ; không tự xoá mình.
  - Bộ trọng số: `/api/admin/weight-presets`, 403 bị khoá hiện lý do qua `settingErrorMessage` (`web/src/core/api/admin.ts`); điểm preset là số nguyên 0–10.
  - Câu lỗi tiếng Anh của route Tổ/tài khoản nằm trong `web/src/core/api/errorMessages.ts`.
  - Test: `renderWithApp` (`web/src/core/testing/peopleHarness.tsx`) dựng session, bootstrap, router, toast giả.
  Bump `version` MINOR từ giá trị hiện tại, `updated: 2026-10-09`, thêm một dòng `## Lịch sử phiên bản` ("Đợt 3 web/: Tổ, thành viên, tài khoản, quản trị, trọng số, tài khoản của tôi").

- [ ] **Step 2: Cập nhật SPEC-WEB-003** — bump MINOR + dòng lịch sử "Đợt 3 xong". Trong mục 4.4 bổ sung ghi chú ngắn: preset trọng số là số nguyên 0–10 (cột `TINYINT UNSIGNED`; UI cũ cho bước 0.5 là sai); `/team/:id` không chặn route phía client mà dựa vào 403 của server rồi chuyển về Tổng quan (vì quyền Tổ phụ thuộc bootstrap tải sau).

- [ ] **Step 3: Thêm bẫy vào `docs/ai/bay-da-gap.md`** (một mục): "`weight_presets.points` là `TINYINT UNSIGNED` nên chỉ lưu số nguyên 0–255 dù route kiểm 0–10 và nhận số thập phân; UI cũ cho bước 0.5 làm người dùng tưởng nhập được 2.5. Web mới chỉ nhận số nguyên 0–10." Bump MINOR + lịch sử.

- [ ] **Step 4: Chạy kiểm tra**

```bash
cd web && npm test && npx tsc --noEmit -p . && npm run build && cd ..
npm run test:tools
npm run docs:index
git add -A docs && git commit -m "docs: web/ đợt 3 — Tổ, thành viên, tài khoản, trọng số"
npm run docs:check -- --base origin/staging
```
Expected: mọi lệnh xanh. `docs:check` phải chạy **sau** commit (cây sạch). `cd core && npm test` chạy qua CI (đợt này không đổi `core/`).

- [ ] **Step 5: Push và mở PR vào `staging`**

```bash
git push -u origin HEAD
gh pr create --base staging --title "web/: đợt 3 — Tổ, thành viên, tài khoản, quản trị, trọng số" --body "…"
```
Mô tả PR: tóm tắt tính năng theo mục 4.3–4.5; ghi chú "link sang `/activity/:id` và `/task/:id` hoạt động khi đợt 1, 2 đã merge"; ghi các quyết định (preset số nguyên; `/team/:id` dựa vào 403); mục "Kiểm tra" liệt kê lệnh đã chạy và nhắc `Docs:` đã cập nhật; kết thúc bằng `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.

---

## Lịch sử phiên bản

| Version | Ngày | Thay đổi | Người |
|---|---|---|---|
| 1.0 | 2026-10-09 | Bản đầu: kế hoạch đợt 3 của SPEC-WEB-003 (Tổ, thành viên, tài khoản, quản trị, trọng số, tài khoản của tôi) | DYC |
