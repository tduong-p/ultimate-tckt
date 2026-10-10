---
doc_id: DEV-FE-001
title: Frontend
version: 1.20
status: active
audience: [dev, ai]
owner: DYC
updated: 2026-10-10
related_code: [core/public/**, core/src/app.js, core/Dockerfile, .dockerignore, web/**, services/ctd-api/frontend/src/**]
---

# Frontend

Repo có các frontend riêng biệt: Core `web/` thay UI cũ tại `/`, UI cũ được giữ tại `/legacy/` trong thời gian chuyển tiếp, và CTD có frontend riêng. `web/` dùng React + Vite + Atlaskit (xem `docs/dev/kien-truc.md` và `docs/specs/2026-10-07-frontend-migration.md`). Test `web/`: `cd web && npm test && npm run build`
(job CI `test-web`, xem `docs/dev/test.md`).

## Core cũ — `core/public/` (JavaScript thuần, chỉ vá lỗi tới khi gỡ, ADR-0016)

Không có build step, không framework: `app.js` (logic chính, SPA điều hướng bằng tay), `index.html`,
`styles.css` + `components.css`, `notifications.js` (chuông thông báo trong ứng dụng). Core phục vụ thư mục này tại `/legacy/` qua `express.static` (`core/src/app.js`); các asset trong `index.html` cũng dùng tiền tố `/legacy/`.

Đây là frontend **cũ**, không thêm tính năng mới vào đây — chỉ sửa lỗi hoặc theo kịp thay đổi API bắt buộc.
`core/tests/frontend.contract.test.js` kiểm hợp đồng giữa `app.js` và API — sửa API mà làm test này đỏ nghĩa là
đã phá tương thích ngược với frontend cũ. Test này cũng chặn biến cục bộ che khuất helper cùng tên và việc
`app.js` gọi nhầm helper chỉ tồn tại phía server.

Không dùng phần tử render có điều kiện (nút chỉ hiện với một số người xem) làm mốc để tra phần tử khác: nó vắng
thì `$()` trả `null` và cả trang hỏng. Gắn `id` riêng cho phần tử cần tra, hoặc dùng `?.` khi phần tử thật sự có thể
vắng (bẫy đã gặp: `#volunteer` ở trang chi tiết hoạt động).

**Màn hình "Đang phát triển"** (SPEC-SOON-001, `docs/specs/2026-10-03-core-coming-soon-design.md`): chỗ nào người
dùng bấm được mà tính năng chưa có thì hiện màn hình chặn thay vì lỗi. Nội dung nằm trong bảng `COMING_SOON` ở
`app.js` (mỗi key có `icon`, `vi`/`en` gồm `name`, `line`).
- Thêm một chỗ chặn: thêm key vào `COMING_SOON`, rồi dùng link `#soon/<key>` (trang) hoặc thuộc tính
  `data-soon="<key>"` trên nút (modal; thêm `data-soon-task="<id>"` để đóng xong quay lại chi tiết công việc).
- Gỡ khi tính năng xong: xoá key, link/nút tương ứng và test trong `frontend.contract.test.js`. Riêng SSO: đặt
  `SSO_READY=true` khi đã cấu hình Azure.
- Hash không thuộc `KNOWN_PAGES` hiện trang "Lạc đoàn"; trang có thật mà không đủ quyền vẫn chuyển về dashboard.
- Sau khi sửa asset legacy, tăng `?v=` trong `core/public/index.html` để trình duyệt tải lại.

## Core — `web/` (React 18 + TypeScript + Vite + Atlaskit)

Nguồn mô tả duy nhất của `web/`: SPEC-WEB-003 (`docs/specs/2026-10-09-web-hoan-thien-thay-the-design.md`) và mục này.

- Entrypoint Core là `web/index.html`; `web/core.html` đã được bỏ. `web/ctd.html` vẫn là entrypoint riêng cho CTD.
- Chạy: `cd web && npm run dev` (API/auth proxy tới Core ở :3000), test `npm test`, build `npm run build`.
- Core production phục vụ `web/dist` tại `/`, gồm fallback SPA cho GET frontend; `/api/*` trả JSON 404 khi không có route, còn `/auth/*` và `/legacy/*` không đi qua fallback.
- `core/Dockerfile` build Vite ở stage đầu và cài Core production ở stage runtime. Build image từ root repo (`docker build -f core/Dockerfile .`); `.dockerignore` gốc giữ `web/` và `core/public/`. CI cũng build `linux/arm64` trên PR nhưng không publish.
- Định tuyến: `HashRouter`, đường dẫn trùng UI cũ; bảng route ở `web/src/core/AppRoutes.tsx`; route không có quyền về `#/dashboard`.
- Tầng API: `web/src/core/api/<miền>.ts`, `index.ts` chỉ re-export; lỗi hiện bằng `apiErrorMessage`; câu tiếng Anh mới của Core thì thêm vào `web/src/core/api/errorMessages.ts`.
- Quyền: chỉ dùng `useCapabilities()` (`web/src/core/capabilities.ts`) cho hoạt động/tài khoản và `taskPermissions.ts` cho công việc; không tự viết điều kiện vai trò trong màn.
- `UnitSwitcher` (`web/src/core/features/session/`) hiện ở header khi người dùng thuộc từ 2 đơn vị trở lên; đổi đơn vị thì xoá/tải lại mọi query trừ `session` và về Tổng quan.
- Thành phần dùng chung trong `web/src/shared/components/`: `Toast`, `ConfirmDialog`, `ReasonDialog`, `PeoplePicker`, `LinkField`, `QuotaBar`.

Quyền ghi Hoạt động: GET có thể trả `admin` và `canManage=true` cho DYC chỉ đọc. `ActivityActions` dùng membership TCKT và vai trò actor khi ghi; với DYC+TCKT, quyền quản lý còn xét người tạo, Trưởng BTC, Tổ đang lãnh đạo. DYC chỉ đọc thấy nội dung và dòng thời gian nhưng không thấy nút ghi hay form cập nhật.

### Giao việc và Trình (web/)

Đợt 5 (SPEC-WEB-003 §4.7): `directives/` và `submissions/` gọi API Core tương ứng; quyền hiển thị nút tập trung ở
`web/src/core/features/dieuhanh/permissions.ts`. Route `#/directives`, `#/directive/:id`, `#/submissions` và
`#/submission/:id` cùng mục menu chỉ dùng được khi đơn vị hiện tại có module `dieu-hanh` (DYC cũng qua cổng đọc của
server). `PageLayout` nhận `canViewDieuHanh`, và `alsoPaths` giúp menu giữ trạng thái đang chọn ở trang chi tiết.
Các thao tác ghi dùng mutation, toast lỗi từ `apiErrorMessage` và làm mới query tương ứng. Nút tạo trình dùng chung
`CreateSubmissionButton` để các nguồn như nhật ký trực ban gắn vào ở đợt 6.

### Công việc và Kanban (web/)

Đợt 2 (SPEC-WEB-003 §4.2, `web/src/core/features/tasks/`):
- Hộp chi tiết công việc: `useTaskModal().open(id, { focusSubmit })` từ mọi danh sách (Tổng quan, Việc hôm nay, Chi tiết hoạt động, Việc của tôi); route `#task/:id` mở hộp trên nền Tổng quan.
- Quyền ẩn/hiện nằm ở `web/src/core/features/tasks/taskPermissions.ts` (bắt chước `core/src/routes/tasks.js` và `policies/access.js`); màn không tự viết điều kiện vai trò:
  - Sửa công việc: chỉ `canManageTeam(task.team_id)`; sửa 4 trường `deadline`, `start_date`, `priority`, `deliverable`.
  - Checklist thêm/tích/xoá và thêm tài liệu: `canUpdate` (`canTouchTask`).
  - Đổi trạng thái: được giao hoặc quản lý Tổ, chỉ khi `todo`/`in_progress`.
  - Nộp nghiệm thu: người được giao và `todo`/`in_progress`.
  - Duyệt: trạng thái `review` và (admin, quản lý Tổ của công việc, hoặc Trưởng BTC của hoạt động).
  - Tự ghi nhận: hoạt động `approved` hoặc `active`. Rút lại: việc tự ghi nhận của mình, chưa xong hoặc huỷ.
- Thao tác ghi dùng `useMutation` + `useInvalidateTaskCaches()`; hằng `ACTIVITY_PREFIX` trong `queryKeys.ts` là nơi duy nhất khai báo prefix cache chi tiết hoạt động.
- Nộp nghiệm thu, tài liệu, tự ghi nhận gửi multipart không có tệp (chỉ link).
- Kanban (`#/board/:id`): hiển thị 4 cột theo giai đoạn; chỉ chuyển trực tiếp `todo ↔ in_progress`; thả vào Chờ duyệt/Hoàn thành mở hộp nộp/duyệt; kéo-thả chỉ kích hoạt khi `(pointer: fine)`.
- Trang chi tiết hoạt động (`#/activity/:id`): gắn `ActivityTaskActions` (Bảng Kanban, Giao việc, Tự ghi nhận việc), tiêu đề việc mở hộp chi tiết qua `TaskTitleButton`, và nút Thêm tài liệu theo việc khi có quyền.

Nhiệm vụ (`web/src/core/features/tasks/`): `TaskActionButtons` (Nhận việc, Bắt đầu làm, Nộp nghiệm thu, Tạm dừng; người duyệt thêm Duyệt đạt, Yêu cầu làm lại, Bác bỏ) nằm trong thẻ việc của `MyTasksToday` và `MyTasksView`. Mọi thao tác ghi qua `useTaskMutation` (toast tiếng Việt, lỗi qua `apiErrorMessage`, làm mới cache bằng `invalidateTasks` trong `taskKeys.ts`). `SubmitReviewModal` và `ReviewDecisionModal` mở từ các nút đó. `CreateTaskModal` mở từ nút "Tạo nhiệm vụ" trên `ActivityActions`; nút chỉ hiện khi cờ `canCreateTask` của `deriveActivityActions` bằng `canManage`. API nhiệm vụ nằm ở `api/tasks.ts`.

Trang chi tiết hoạt động: route `#/activity/:id` dựng `ActivityDetailView`. Thanh hành động `ActivityActions` lấy điều kiện hiện nút từ `deriveActivityActions` trong `activityPermissions.ts` để bắt chước quyền server; server vẫn kiểm quyền khi nhận request. Mọi thao tác ghi qua `useActivityMutation`: hiện toast tiếng Việt, làm mới cache `['core-activity', id]`; khi hoạt động bị xoá thì gọi `forgetActivity` và về `#/activities`. Các màn không bọc Router (danh sách, lịch, Tổng quan) mở chi tiết bằng `<a href="#/activity/ID">` hoặc `goToActivity(id)` trong `web/src/core/navigation.ts`.

### Tổ, thành viên và tài khoản (web/ đợt 3)

- Trang `#/team/:id` tải overview; route để server phân quyền, khi bị 403 thì về Tổng quan kèm thông báo vì quyền quản lý Tổ chỉ có sau khi bootstrap tải.
- `#/accounts` chỉ dành cho quản trị viên; menu "Quản trị tài khoản" nhận `canViewAccounts` từ `PageLayout`.
- Tổ, tài khoản và preset dùng mutation cùng `invalidatePeople(queryClient)`; hộp nhập dùng `FormDialog`. `renderWithApp` trong `web/src/core/testing/peopleHarness.tsx` dựng session, bootstrap, router và toast cho test.
- Tổ trưởng không gửi email/mật khẩu khi sửa tài khoản, chỉ tạo `member` trong Tổ mình quản lý và không thể tự xoá. Các câu lỗi API tiếng Anh mới nằm trong `web/src/core/api/errorMessages.ts`.
- Bộ trọng số dùng `/api/admin/weight-presets`; lỗi khoá DYC hiển thị lý do và người khoá qua `settingErrorMessage`. Điểm preset là số nguyên từ 0 đến 10.
- Tài khoản của tôi mở từ chip tên người dùng; người dùng tự sửa email, điện thoại, màu đại diện và mật khẩu, không sửa tên hoặc vai trò.
### Văn bản và Thông báo (web/)

Đợt 4 (SPEC-WEB-003 §4.6, §3.2, §3.4):
- **Văn bản** (`web/src/core/features/documents/`): nút "Thêm văn bản" cho mọi người dùng đã đăng nhập; nút "Sửa" chỉ hiện khi `can_edit` của dòng đó là true (server tính: admin/vice_admin, người tạo, hoặc thành viên Tổ ban hành). Hộp `DocumentFormModal` dùng chung cho thêm và sửa, chỉ nhận link (`link_url`), không tải tệp; danh sách Tổ ban hành lấy từ `issueTeams` của `GET /api/documents` (nếu sửa mà Tổ cũ không nằm trong danh sách thì tự thêm vào options để tránh trống ô); sau khi lưu thành công làm mới `['core-documents']`.
- **Thông báo** (`web/src/core/features/notifications/`): `NotificationCenter` (ghép chuông `NotificationBell` và popup `NotificationPopups`) được đặt vào `headerExtras` của `PageLayout`. Query `['core-notifications']` tải lại mỗi 60 giây ở duy nhất một nơi (`useNotifications`, chỉ `NotificationBell` kích hoạt; `NotificationPopups` dùng `enabled: false` để đọc cache, tránh poll đôi).
- **Điều hướng thông báo**: `notificationRoute()` đổi `url` của thông báo (`/#activity/12`, `#activity/12`, `#/activity/12`) thành đường dẫn router (`/activity/12`); không có hash thì về `/dashboard`. Bấm một mục đánh dấu đã xem lạc quan trong cache và gửi `PATCH /api/notifications/:id/seen` nếu chưa xem, rồi điều hướng.
- **Việt hoá**: tiêu đề và nội dung tiếng Anh do Core lưu (`core/src/routes/activities.js`) được Việt hoá qua `notificationTitle` và `notificationBody` trong `notificationText.ts`; trạng thái gửi email/push được hiển thị qua `deliveryLabel`.
- **Popup**: tối đa 3 thông báo mới chưa xem gần nhất, cũ nhất ở trên, tự tắt sau 7 giây; bấm popup gỡ popup và mở thông báo.

## CTD — `services/ctd-api/frontend/` (React 18 + TypeScript + Vite)


Chia theo tính năng dưới `src/features/`: `auth/` (đăng nhập), `hoso/` (nộp/theo dõi hồ sơ — tối ưu mobile,
người dùng là sinh viên), `canbo/` (Inbox + xử lý hồ sơ — tối ưu desktop, mật độ thông tin cao cho xử lý hàng
loạt), `baocao/` (dashboard báo cáo). Dùng chung: `src/lib/api.ts` (gọi API, gắn JWT), `src/lib/auth.tsx` (context
đăng nhập), `src/components/ui.tsx`, `src/theme/tokens.ts`. Build ra `backend/static`, FastAPI phục vụ tĩnh
(không chạy Vite dev server ở production).

Nguyên tắc thiết kế của module CTD (từ bản thiết kế gốc): hồ sơ đi qua 4–5 cấp duyệt kéo dài nhiều tháng, người
dùng quan tâm nhất "hồ sơ đang ở đâu, ai đang giữ, còn thiếu gì" — màn hình sinh viên tối ưu cho **mobile**, màn
hình cán bộ tối ưu cho **mật độ thông tin trên desktop** vì họ xử lý hàng chục hồ sơ một lúc theo đợt. Mọi lần
"trả về" một cấp bắt buộc có lý do, và lý do đó phải hiển thị nổi bật ở phía người nhận.

## Design token dùng chung (tham khảo khi cần một hệ màu/typography nhất quán)

Bộ token phong cách "Notion-inspired" (nền giấy ấm, chữ gần đen, một màu xanh chủ đạo, điểm nhấn màu đa sắc cho
badge/sticker) từng được soạn cho hệ thống frontend production của Core: màu chủ đạo `primary #0075de`, nền
`canvas #ffffff` / `canvas-soft #f6f5f4`, chữ `ink #000000` / `ink-secondary #31302e`, bo góc từ `xs 4px` đến
`full 9999px`, spacing từ `xxs 4px` đến `xxl 32px`. Đây là token tham khảo cho hướng thiết kế, không phải file
cấu hình được import trực tiếp — khi cần dựng lại theme cho `web/` (frontend chung GĐ1), lấy cảm hứng từ bộ giá
trị này thay vì tạo từ đầu, nhưng kiểm lại độ tương phản/accessibility trước khi dùng.

## Nguyên tắc chung

- Giao diện 100% tiếng Việt (mọi frontend, mọi module).
- Mobile web bắt buộc với màn hình dành cho thành viên/sinh viên (người dùng cuối phổ thông); màn hình quản trị/
  cán bộ có thể ưu tiên desktop.
- Sửa `web/` khi được tạo: mỗi nhóm chỉ sửa `src/modules/<module>/` của mình; sửa `shell/` hoặc `ui/` dùng chung
  phải qua review của nhóm Core (xem `.kiro/specs/nen-tang-da-don-vi/design.md` §3).

## UI kit mới — `web/src/ui/` (Radix + CSS tuỳ biến, kiểu Linear)

Bộ component dùng chung cho giao diện mới, chạy song song Atlaskit cho tới khi cutover (chưa gỡ phụ thuộc `@atlaskit`).
Export qua `web/src/ui/index.ts`: `Button`, `Menu`, `Dialog`, `Tabs`, `Select` (native `<select>`), `ToastProvider`/`useToast`,
`Avatar`, `StatusIcon`, `PriorityIcon`, `Badge`, `Field`. Menu/Dialog/Tabs dựa trên Radix (`react-popover`, `react-dialog`, `react-tabs`).
- Token màu/khoảng cách ở `tokens.css` (dark qua `[data-theme='dark']` hoặc `prefers-color-scheme`); kiểu ở `ui.css`.
  Mọi class có tiền tố `ui-`; CSS chỉ được import bởi component trong `web/src/ui/`, không đụng `html/body` hay phần tử toàn cục.
- Test cạnh từng component (`*.test.tsx`) import `./test-setup` (jest-dom + dọn DOM sau mỗi test). Truy vấn theo role/label.
- Không thêm Tailwind/shadcn. Component mới thêm vào đây, không thêm vào `web/src/prototype/` (chỉ tham chiếu, không import).

## Lịch sử phiên bản

| Version | Ngày | Thay đổi | Người |
|---|---|---|---|
| 1.0 | 2026-09-24 | Bản đầu (viết lại từ tài liệu cũ khi gộp monorepo) | DYC |
| 1.1 | 2026-09-27 | Đồng bộ `main` = `staging`: code frontend theo bản `main` (bỏ phần GĐ1-A, lưu ở nhánh `archive/gd1a-staging`); nội dung tài liệu vẫn đúng | DYC |
| 1.2 | 2026-09-30 | Bổ sung contract test chặn shadow helper và helper chỉ có phía server | DYC |
| 1.3 | 2026-09-30 | Ẩn nút "Tình nguyện" với người đã tham gia (pilot PR 4) | DYC |
| 1.4 | 2026-09-30 | Ngày mặc định của báo cáo theo giờ Việt Nam (pilot PR 6) | DYC |
| 1.5 | 2026-09-30 | PR 8: nút Đề xuất hoạt động chỉ hiện cho quản lý; tên team chỉ là link khi có quyền xem tổng quan; bảng cuộn ngang và lịch co được trên 375px | DYC |
| 1.6 | 2026-10-02 | `notifications.js` là chuông trong ứng dụng; bỏ OneSignal và trang Setting email | DYC |
| 1.7 | 2026-10-03 | Màn hình "Đang phát triển" (`COMING_SOON`): cách thêm/gỡ chỗ chặn, trang "Lạc đoàn" | DYC |
| 1.8 | 2026-10-08 | Thêm quy tắc: không tra phần tử qua phần tử render có điều kiện (hotfix PR #81, `#volunteer`) | DYC |
| 1.9 | 2026-10-09 | `web/` đã có (PR 83); trỏ tới cách test và job CI `test-web` | DYC |
| 1.10 | 2026-10-09 | Thêm mục `web/` (chạy, router, tầng API, quyền, thành phần dùng chung); `core/public/` chỉ vá lỗi tới khi gỡ (ADR-0016) | DYC |
| 1.11 | 2026-10-09 | Đợt 1 `web/`: bổ sung trang chi tiết hoạt động, điều hướng và quy tắc mutation | DYC |
| 1.12 | 2026-10-09 | Phân biệt quyền đọc DYC và quyền ghi TCKT trên trang hoạt động | DYC |
| 1.13 | 2026-10-09 | Mô tả tính năng nhiệm vụ trong `web/` (nút thao tác, tạo nhiệm vụ, `useTaskMutation`, cờ `canCreateTask`) | DYC |
| 1.14 | 2026-10-09 | Đợt 2 `web/`: bổ sung mục Công việc và Kanban (hộp chi tiết, quyền, Kanban kéo-thả, kết nối trang hoạt động) | DYC |
| 1.15 | 2026-10-09 | Đợt 3 `web/`: Tổ, thành viên, tài khoản, nhập hàng loạt, trọng số và tài khoản cá nhân | DYC |
| 1.16 | 2026-10-09 | Đợt 4 `web/`: thêm/sửa Văn bản, chuông thông báo, popup và điều hướng thông báo | DYC |
| 1.17 | 2026-10-10 | Ghi nhận luồng Giao việc/Trình đợt 5 tích hợp cùng Tổ, tài khoản và thông báo | DYC |
| 1.18 | 2026-10-10 | Ghi cách cutover Core web tại `/`, legacy tại `/legacy/`, Vite entrypoint và Docker multi-stage từ root context | DYC |
| 1.19 | 2026-10-10 | Giữ ổn định profile callback và header extras để thao tác mở hồ sơ không remount thông báo | DYC |
| 1.20 | 2026-10-10 | Thêm UI kit mới `web/src/ui/` (Radix + CSS tuỳ biến) | DYC |
