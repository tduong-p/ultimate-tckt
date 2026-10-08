---
doc_id: PLAN-CORE-API-001
title: Kế hoạch triển khai — Tích hợp API Backend và Dọn dẹp dữ liệu rác cho TCKT Activity Hub (Core Web)
version: 1.0
status: active
audience: [dev, ai]
owner: DYC
updated: 2026-10-08
related_code: [web/src/core/**, web/src/shared/**]
---

# Kế hoạch triển khai — Tích hợp API Backend và Dọn dẹp dữ liệu rác cho TCKT Activity Hub (Core Web)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Kết nối toàn diện frontend React/ADS của TCKT Activity Hub (`web/src/core/`) với backend Express (`core/` cổng 3000 qua proxy `/api`), đồng thời xóa bỏ 100% dữ liệu mock, hardcoded và các tệp thử nghiệm dư thừa.

**Architecture:** Tạo tầng API service `web/src/core/api/` dựa trên `apiClient` (`axios` với `withCredentials: true`), sử dụng `@tanstack/react-query` trong các React component để quản lý state và fetching. Thay thế toàn bộ mock arrays bằng API queries, hiển thị Empty State chuẩn (không có checkbox icon) khi danh sách rỗng.

**Tech Stack:** React 18, TypeScript, Atlassian Design System (@atlaskit/*), @tanstack/react-query, Axios, Vite, Vitest.

**Spec:** [`docs/specs/2026-10-08-core-api-integration-design.md`](file:///d:/ultimate-tckt/docs/specs/2026-10-08-core-api-integration-design.md)

## Global Constraints
- Target directory phải nằm hoàn toàn trong `web/**`.
- Tuyệt đối không thay đổi mã nguồn backend `core/` hoặc schema database.
- Không sử dụng biểu tượng checkbox hoặc TaskIcon trong các empty state theo chỉ thị của người dùng.
- Giữ vững toàn bộ các quy tắc bất biến trong `docs/ai/bat-bien.md`.
- Tuyệt đối không chạy `git push` lên bất kỳ remote nào.

## Review Focus
- Trường hợp backend trả về danh sách rỗng `[]`: kiểm tra empty state hiển thị đúng, không lỗi layout, không có icon checkbox.
- Trạng thái loading / error từ React Query: hiển thị Spinner hoặc banner lỗi nhẹ nhàng, không sập component.
- Form đề xuất hoạt động `CreateActivityModal`: gửi đúng payload kiểu JSON lên `POST /api/activities` và làm mới danh sách.
- Xuất báo cáo Excel trong `ReportsView`: tạo URL tải file trực tiếp chính xác từ `GET /api/reports/export`.
- Xóa sạch tệp rác: xác nhận `web/src/dummy.test.ts` đã bị gỡ và test suite vẫn pass 100%.

---

### Task 1: Dọn dẹp tệp rác thử nghiệm & Reset view mặc định trong `main.tsx`

**Files:**
- Modify: `web/src/core/main.tsx`
- Delete: `web/src/dummy.test.ts`
- Test: `web/src/core/main.test.tsx` (tạo mới test kiểm tra default view là dashboard)

**Interfaces:**
- Consumes: `web/src/core/main.tsx`
- Produces: Màn hình mặc định khởi động của Hub là `dashboard`

- [ ] **Step 1: Xóa tệp rác `web/src/dummy.test.ts`**
Xóa tệp `web/src/dummy.test.ts`.

- [ ] **Step 2: Cập nhật `currentView` mặc định trong `web/src/core/main.tsx`**
Đổi `React.useState('archive')` thành `React.useState('dashboard')`.

- [ ] **Step 3: Chạy test để xác nhận**
Chạy `npm test` trong thư mục `web/`.
Expected: Tất cả test pass và không còn `dummy.test.ts`.

- [ ] **Step 4: Commit**
`git add web/src/core/main.tsx && git commit -m "fix(web): reset core default view to dashboard and remove dummy test"`

---

### Task 2: Xây dựng tầng Core API Services (`web/src/core/api/`)

**Files:**
- Create: `web/src/core/api/index.ts`
- Create: `web/src/core/api/types.ts`
- Test: `web/src/core/api/index.test.ts`

**Interfaces:**
- Consumes: `apiClient` từ `web/src/shared/utils/api.ts`
- Produces: Các hàm `fetchSession`, `fetchBootstrap`, `fetchActivities`, `createActivity`, `fetchTeams`, `fetchMembers`, `fetchMyTasksToday`, `fetchDocuments`, `fetchArchive`, `getReportExportUrl`

- [ ] **Step 1: Viết test cho Core API module (`web/src/core/api/index.test.ts`)**
Kiểm tra các hàm gọi đúng endpoint và method của `apiClient`.

- [ ] **Step 2: Tạo `web/src/core/api/types.ts` và `web/src/core/api/index.ts`**
Khai báo đầy đủ TypeScript interfaces (`BootstrapData`, `ActivityItem`, `TeamItem`, `MemberItem`, `TaskItem`, `DocumentItem`) và các hàm gọi API.

- [ ] **Step 3: Chạy test API module**
Chạy: `npm test src/core/api/index.test.ts` trong `web/`.
Expected: PASS.

- [ ] **Step 4: Commit**
`git add web/src/core/api/ && git commit -m "feat(web): add core API services and types"`

---

### Task 3: Tích hợp API & Dọn mock data màn hình Dashboard (`Dashboard.tsx`)

**Files:**
- Modify: `web/src/core/features/dashboard/Dashboard.tsx`
- Test: `web/src/core/features/dashboard/Dashboard.test.tsx`

**Interfaces:**
- Consumes: `fetchBootstrap`, `fetchMyTasksToday` từ `web/src/core/api/index.ts`
- Produces: Dashboard kết nối số liệu thật, không còn số hardcode "1"

- [ ] **Step 1: Cập nhật `Dashboard.test.tsx` với mock API**
Mock `fetchBootstrap` và `fetchMyTasksToday` trong `Dashboard.test.tsx`.

- [ ] **Step 2: Refactor `Dashboard.tsx` dùng `useQuery`**
Thay thế số cứng KPI bằng dữ liệu từ `bootstrapData.stats`. Hiển thị task thật và cập nhật mới nhất thật từ API. Khi rỗng, hiển thị empty state chuẩn.

- [ ] **Step 3: Chạy test `Dashboard.test.tsx`**
Chạy: `npm test src/core/features/dashboard/Dashboard.test.tsx` trong `web/`.
Expected: PASS.

- [ ] **Step 4: Commit**
`git add web/src/core/features/dashboard/Dashboard.tsx web/src/core/features/dashboard/Dashboard.test.tsx && git commit -m "feat(web): connect dashboard to bootstrap API and remove hardcoded KPIs"`

---

### Task 4: Tích hợp API & Xóa thẻ hardcode trong Hoạt động & Đề xuất hoạt động

**Files:**
- Modify: `web/src/core/features/activities/ActivitiesView.tsx`
- Modify: `web/src/core/features/dashboard/CreateActivityModal.tsx`
- Test: `web/src/core/features/activities/ActivitiesView.test.tsx`
- Test: `web/src/core/features/dashboard/CreateActivityModal.test.tsx`

**Interfaces:**
- Consumes: `fetchActivities`, `createActivity`, `fetchTeams` từ `web/src/core/api/index.ts`
- Produces: Danh sách hoạt động động, modal tạo hoạt động thực tế gọi `POST /api/activities`

- [ ] **Step 1: Cập nhật test `ActivitiesView.test.tsx` và `CreateActivityModal.test.tsx`**
Viết test kiểm tra fetch danh sách hoạt động và submit form đề xuất hoạt động.

- [ ] **Step 2: Refactor `ActivitiesView.tsx`**
Xóa bỏ thẻ K71 tĩnh. Dùng `useQuery` lấy danh sách `activities`. Render danh sách thẻ động hoặc empty state nếu rỗng (không checkbox icon).

- [ ] **Step 3: Refactor `CreateActivityModal.tsx`**
Nạp danh sách Tổ từ `fetchTeams` vào dropdown. Dùng `useMutation` gọi `createActivity` khi submit form, đóng modal và làm mới dữ liệu.

- [ ] **Step 4: Chạy test**
Chạy: `npm test src/core/features/activities/ src/core/features/dashboard/CreateActivityModal.test.tsx` trong `web/`.
Expected: PASS.

- [ ] **Step 5: Commit**
`git add web/src/core/features/activities/ web/src/core/features/dashboard/CreateActivityModal.tsx web/src/core/features/dashboard/CreateActivityModal.test.tsx && git commit -m "feat(web): connect activities view and create modal to real API"`

---

### Task 5: Tích hợp API & Xóa mock data trong Các Tổ (`TeamsView.tsx`) và Thành viên (`MembersView.tsx`)

**Files:**
- Modify: `web/src/core/features/teams/TeamsView.tsx`
- Modify: `web/src/core/features/members/MembersView.tsx`
- Test: `web/src/core/features/teams/TeamsView.test.tsx`
- Test: `web/src/core/features/members/MembersView.test.tsx`

**Interfaces:**
- Consumes: `fetchTeams`, `fetchMembers` từ `web/src/core/api/index.ts`
- Produces: Danh sách Tổ và Thành viên lấy thật từ backend

- [ ] **Step 1: Cập nhật test `TeamsView.test.tsx` và `MembersView.test.tsx`**
Mock `fetchTeams` và `fetchMembers`.

- [ ] **Step 2: Refactor `TeamsView.tsx`**
Xóa mảng 4 tổ `teamsData`. Dùng `useQuery(['teams'], fetchTeams)`. Render danh sách Tổ từ database.

- [ ] **Step 3: Refactor `MembersView.tsx`**
Xóa mảng 10 thành viên `membersData`. Dùng `useQuery(['members'], fetchMembers)`. Render danh sách thành viên thật từ database.

- [ ] **Step 4: Chạy test**
Chạy: `npm test src/core/features/teams/ src/core/features/members/` trong `web/`.
Expected: PASS.

- [ ] **Step 5: Commit**
`git add web/src/core/features/teams/ web/src/core/features/members/ && git commit -m "feat(web): connect teams and members views to real API and remove mock datasets"`

---

### Task 6: Tích hợp API & Xóa mock data trong Công việc (`MyTasksToday.tsx`, `MyTasksView.tsx`, `MyTasks.tsx`)

**Files:**
- Modify: `web/src/core/features/tasks/MyTasksToday.tsx`
- Modify: `web/src/core/features/tasks/MyTasksView.tsx`
- Modify: `web/src/core/features/tasks/MyTasks.tsx`
- Test: `web/src/core/features/tasks/MyTasksToday.test.tsx`
- Test: `web/src/core/features/tasks/MyTasksView.test.tsx`
- Test: `web/src/core/features/tasks/MyTasks.test.tsx`

**Interfaces:**
- Consumes: `fetchMyTasksToday` từ `web/src/core/api/index.ts`
- Produces: Danh sách nhiệm vụ thật được phân loại: đến hạn hôm nay, quá hạn, chờ duyệt

- [ ] **Step 1: Cập nhật tests của các màn hình tasks**
Mock `fetchMyTasksToday`.

- [ ] **Step 2: Refactor các component tasks**
Xóa bỏ mock data giả (TCK-31,...). Dùng `useQuery(['my-tasks-today'], fetchMyTasksToday)` để lấy `dueToday`, `overdue`, `pendingMyReview`.

- [ ] **Step 3: Chạy test**
Chạy: `npm test src/core/features/tasks/` trong `web/`.
Expected: PASS.

- [ ] **Step 4: Commit**
`git add web/src/core/features/tasks/ && git commit -m "feat(web): connect tasks views to real API and remove fake task mock data"`

---

### Task 7: Tích hợp API cho Văn bản, Lưu trữ, Báo cáo & Lịch chung

**Files:**
- Modify: `web/src/core/features/documents/DocumentsView.tsx`
- Modify: `web/src/core/features/archive/ArchiveView.tsx`
- Modify: `web/src/core/features/reports/ReportsView.tsx`
- Modify: `web/src/core/features/calendar/CalendarView.tsx`
- Test: `web/src/core/features/documents/DocumentsView.test.tsx`
- Test: `web/src/core/features/archive/ArchiveView.test.tsx`
- Test: `web/src/core/features/reports/ReportsView.test.tsx`
- Test: `web/src/core/features/calendar/CalendarView.test.tsx`

**Interfaces:**
- Consumes: `fetchDocuments`, `fetchArchive`, `fetchTeams`, `fetchActivities`, `getReportExportUrl` từ `web/src/core/api/index.ts`
- Produces: Mọi màn hình còn lại của Hub hoạt động với dữ liệu thật

- [ ] **Step 1: Cập nhật các test liên quan**
Mock API trong các file test.

- [ ] **Step 2: Refactor `DocumentsView.tsx` & `ArchiveView.tsx`**
Kết nối `fetchDocuments` và `fetchArchive`.

- [ ] **Step 3: Refactor `ReportsView.tsx` & `CalendarView.tsx`**
Kết nối danh sách Tổ cho ReportsView và xuất link tải file Excel. Kết nối activities cho CalendarView.

- [ ] **Step 4: Chạy test toàn bộ**
Chạy: `npm test` trong `web/`.
Expected: PASS 100%.

- [ ] **Step 5: Commit**
`git add web/src/core/features/documents/ web/src/core/features/archive/ web/src/core/features/reports/ web/src/core/features/calendar/ && git commit -m "feat(web): connect documents, archive, reports and calendar to real API"`

---

### Task 8: Kiểm tra toàn diện & Hoàn thiện tài liệu

**Files:**
- Modify: `docs/specs/2026-10-08-core-api-integration-plan.md`
- Test: Toàn bộ test suite trong `web/`

- [ ] **Step 1: Chạy toàn bộ test trong `web/`**
Chạy: `npm test` trong `web/`.
Expected: Tất cả test pass.

- [ ] **Step 2: Cập nhật chỉ mục tài liệu**
Chạy: `npm run docs:index && npm run docs:check -- --base origin/staging`.
Expected: Xanh (pass).

- [ ] **Step 3: Commit hoàn thành**
Commit các cập nhật tài liệu.
