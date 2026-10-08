---
doc_id: SPEC-CAPI-001
title: Thiết kế — Tích hợp API Backend và Dọn dẹp dữ liệu rác cho TCKT Activity Hub (Core Web)
version: 1.2
status: active
audience: [dev, ai]
owner: DYC
updated: 2026-10-08
related_code: [web/src/core/**, web/src/shared/**]
---

# Thiết kế — Tích hợp API Backend và Dọn dẹp dữ liệu rác cho TCKT Activity Hub (Core Web)

## 1. Mục tiêu và Phạm vi
- **Mục tiêu**: Kết nối giao diện React/ADS của TCKT Activity Hub (`web/src/core/`) với backend Express của Core (`core/`, cổng 3000 qua Vite proxy `/api`).
- **Phạm vi**: Xóa bỏ toàn bộ dữ liệu mock/giả lập, dọn dẹp các tệp thử nghiệm dư thừa, kết nối dữ liệu thật thông qua React Query và `apiClient`.
- **Ràng buộc bất biến**: Tuyệt đối không thay đổi schema database và không sửa đổi các hợp đồng API đã có của backend Core. Không sử dụng biểu tượng checkbox hoặc TaskIcon trong các empty state.

## 2. Kiến trúc Data Layer (`web/src/core/api/`)
Tạo module quản lý API tách biệt, sử dụng `apiClient` (`axios` với `withCredentials: true`):
- `session.ts`: `fetchSession()` -> `GET /api/session`.
- `bootstrap.ts`: `fetchBootstrap()` -> `GET /api/bootstrap` (chứa `stats`, `upcoming`, `tasks`, `activity`, `teams`, `capabilities`).
- `activities.ts`:
  - `fetchActivities(params)` -> `GET /api/activities?q=&status=&type=`.
  - `createActivity(payload)` -> `POST /api/activities`.
- `tasks.ts`: `fetchMyTasksToday()` -> `GET /api/my-tasks-today`.
- `teams.ts`: `fetchTeams()` -> `GET /api/teams`.
- `members.ts`: `fetchMembers()` -> `GET /api/people`.
- `documents.ts`: `fetchDocuments(params)` -> `GET /api/documents?q=&year=&team_id=`.
- `archive.ts`: `fetchArchive(params)` -> `GET /api/archive?q=`.

## 3. Tích hợp từng màn hình và dọn dẹp dữ liệu rác

### 3.1. Dashboard (`Dashboard.tsx`)
- Thay thế các số liệu cứng (1, 0,...) bằng `stats` từ `GET /api/bootstrap`:
  - Hoạt động đang chạy: `stats.activeActivities`
  - Công việc đang mở: `stats.openTasks`
  - Quá hạn: `stats.overdueTasks`
  - Hoàn thành tháng này: `stats.completedMonth`
- Danh sách công việc gần đây / công việc của tôi: hiển thị từ `tasks` của `bootstrap` hoặc `my-tasks-today`.
- Danh sách cập nhật gần nhất: hiển thị từ mảng `activity` của `bootstrap`.
- Hoạt động sắp tới: hiển thị từ mảng `upcoming` của `bootstrap`.

### 3.2. Hoạt động & Dự án (`ActivitiesView.tsx` & `CreateActivityModal.tsx`)
- Xóa bỏ hoàn toàn thẻ hoạt động mẫu K71 hardcode.
- Sử dụng `useQuery(['activities', searchQuery, statusFilter, typeFilter], () => fetchActivities(...))`.
- Khi rỗng: hiển thị Empty State chuẩn với `InboxIcon` (không dùng TaskIcon hay checkbox).
- `CreateActivityModal`: sử dụng `useMutation` gọi `POST /api/activities`, lấy danh sách Tổ từ `GET /api/teams` để điền dropdown Tổ chủ trì / Tổ tham gia. Khi tạo thành công, tự động đóng modal và invalidate query `activities` + `bootstrap`.

### 3.3. Các Tổ (`TeamsView.tsx`)
- Xóa bỏ mảng `teamsData` 4 tổ hardcode.
- Sử dụng `useQuery(['teams'], fetchTeams)`.
- Render danh sách Tổ thật nhận được từ API (`name`, `description`, `color`, `member_count`, `active_count`). Khi rỗng: hiển thị Empty State.

### 3.4. Thành viên (`MembersView.tsx`)
- Xóa bỏ mảng `membersData` 10 thành viên giả lập.
- Sử dụng `useQuery(['members'], fetchMembers)`.
- Hiển thị danh sách thành viên thật từ `GET /api/people` kèm vai trò, Tổ trực thuộc và số công việc đã xong.

### 3.5. Công việc của tôi (`MyTasksToday.tsx`, `MyTasksView.tsx`, `MyTasks.tsx`)
- Xóa hàm giả lập `fetchTasks` và mock array (TCK-31,...).
- Kết nối `fetchMyTasksToday` (`GET /api/my-tasks-today`).
- Phân loại danh sách `dueToday`, `overdue`, `pendingMyReview`. Nếu không có công việc: hiển thị empty state sạch sẽ (không icon checkbox).

### 3.6. Văn bản (`DocumentsView.tsx`)
- Kết nối `fetchDocuments` (`GET /api/documents`).
- Nạp danh sách năm và Tổ từ API để lọc. Hiển thị danh sách văn bản thật và liên kết mở tài liệu.

### 3.7. Kho lưu trữ (`ArchiveView.tsx`)
- Kết nối `fetchArchive` (`GET /api/archive`).
- Tìm kiếm các hoạt động đã hoàn thành trong quá khứ.

### 3.8. Báo cáo (`ReportsView.tsx`)
- Lấy danh sách Tổ từ `GET /api/teams` cho dropdown chọn Tổ.
- Nút "Xuất báo cáo Excel": kích hoạt tải về từ `GET /api/reports/export?start=&end=&team_id=&lang=vi`.

### 3.9. Lịch chung (`CalendarView.tsx`)
- Lấy danh sách `activities` để gắn sự kiện và hạn chót vào các ngày trên lịch động.

### 3.10. Dọn dẹp rác & Khởi tạo (`main.tsx` & tệp rác)
- Xóa tệp rác thử nghiệm: `web/src/dummy.test.ts`.
- Đặt lại màn hình mặc định khởi động trong `web/src/core/main.tsx` thành `dashboard` (thay vì `archive`).

## 4. Kế hoạch kiểm thử & Đảm bảo chất lượng
- Cập nhật các test file của từng màn hình (`*.test.tsx`) để mock `apiClient` / API layer thay vì test data hardcode.
- Chạy `npm test` trong `web/` đảm bảo 100% test case pass.
- Đảm bảo `npm run docs:index` và `npm run docs:check` pass trước khi hoàn thành.

## Bổ sung 1.2 — phiên, cache, ngày

- `createCoreQueryClient()` (trong `core/main.tsx`) gắn `QueryCache.onError`: lỗi HTTP 401 ở bất kỳ query nào → xoá mọi query trừ `session` và đặt `session.user = null` để quay về màn đăng nhập. Đăng xuất cũng đi qua cùng hàm này nên dữ liệu của người dùng trước không còn trong cache.
- Mọi màn dùng chung `QueryClientProvider` ở `main.tsx`; không tạo QueryClient dự phòng trong component. Query key thống nhất tiền tố `core-` (`core-teams`, `core-members`, `core-my-tasks-today`, …).
- `downloadReportExport(params)` tải báo cáo dạng blob qua `apiClient`; lỗi máy chủ được đọc từ body JSON và ném `Error(message)`.
- Cột DATE từ Core trả về dạng ISO UTC (`2026-10-07T17:00:00.000Z` = 08/10 giờ VN). Mọi chỗ hiển thị/so sánh ngày dùng `toVnDateKey`/`formatVnDate`/`todayVnKey` trong `web/src/shared/utils/date.ts`, không `slice(0, 10)` hay `new Date().toISOString()`.
- Ô tìm kiếm (Hoạt động, Lưu trữ, Văn bản) dùng `useDebouncedValue` (300 ms) + `keepPreviousData`; lọc do máy chủ làm.

## Lịch sử phiên bản

| Version | Ngày | Thay đổi | Người |
|---|---|---|---|
| 1.0 | 2026-10-08 | Khởi tạo tài liệu thiết kế tích hợp API và dọn dẹp dữ liệu rác cho TCKT Activity Hub | DYC |
| 1.1 | 2026-10-08 | Bổ sung API xác thực loginUser/logoutUser và kiểm soát phiên | DYC |
| 1.2 | 2026-10-08 | Thêm `downloadReportExport`, xử lý 401 toàn cục + xoá cache khi đăng xuất, thống nhất query key `core-*`, tiện ích ngày `shared/utils/date` | DYC |
