---
doc_id: DEV-FE-001
title: Frontend
version: 1.13
status: active
audience: [dev, ai]
owner: DYC
updated: 2026-10-09
related_code: [core/public/**, web/**, services/ctd-api/frontend/src/**]
---

# Frontend

Repo có **hai frontend riêng biệt hiện tại**, cộng frontend chung `web/` (React + Vite + Atlaskit, đang thay dần UI Core —
xem `docs/dev/kien-truc.md` và `docs/specs/2026-10-07-frontend-migration.md`). Test `web/`: `cd web && npm test && npm run build`
(job CI `test-web`, xem `docs/dev/test.md`).

## Core — `core/public/` (JavaScript thuần, chỉ vá lỗi tới khi gỡ, ADR-0016)

Không có build step, không framework: `app.js` (logic chính, SPA điều hướng bằng tay), `index.html`,
`styles.css` + `components.css`, `notifications.js` (chuông thông báo trong ứng dụng). Core phục vụ trực tiếp thư mục này qua `express.static`
(`core/src/app.js`).

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
- Sau khi sửa asset, tăng `?v=` trong `index.html` để trình duyệt tải lại.

## Core — `web/` (React 18 + TypeScript + Vite + Atlaskit)

Nguồn mô tả duy nhất của `web/`: SPEC-WEB-003 (`docs/specs/2026-10-09-web-hoan-thien-thay-the-design.md`) và mục này.

- Chạy: `cd web && npm run dev` (Core ở :3000), test `npm test`, build `npm run build`.
- Định tuyến: `HashRouter`, đường dẫn trùng UI cũ; bảng route ở `web/src/core/AppRoutes.tsx`; route không có quyền về `#/dashboard`.
- Tầng API: `web/src/core/api/<miền>.ts`, `index.ts` chỉ re-export; lỗi hiện bằng `apiErrorMessage`; câu tiếng Anh mới của Core thì thêm vào `web/src/core/api/errorMessages.ts`.
- Quyền: chỉ dùng `useCapabilities()` (`web/src/core/capabilities.ts`); không tự viết điều kiện vai trò trong màn.
- `UnitSwitcher` (`web/src/core/features/session/`) hiện ở header khi người dùng thuộc từ 2 đơn vị trở lên; đổi đơn vị thì xoá/tải lại mọi query trừ `session` và về Tổng quan.
- Thành phần dùng chung trong `web/src/shared/components/`: `Toast`, `ConfirmDialog`, `ReasonDialog`, `PeoplePicker`, `LinkField`, `QuotaBar`.

Quyền ghi Hoạt động: GET có thể trả `admin` và `canManage=true` cho DYC chỉ đọc. `ActivityActions` dùng membership TCKT và vai trò actor khi ghi; với DYC+TCKT, quyền quản lý còn xét người tạo, Trưởng BTC, Tổ đang lãnh đạo. DYC chỉ đọc thấy nội dung và dòng thời gian nhưng không thấy nút ghi hay form cập nhật.

Nhiệm vụ (`web/src/core/features/tasks/`): `TaskActionButtons` (Nhận việc, Bắt đầu làm, Nộp nghiệm thu, Tạm dừng; người duyệt thêm Duyệt đạt, Yêu cầu làm lại, Bác bỏ) nằm trong thẻ việc của `MyTasksToday` và `MyTasksView`. Mọi thao tác ghi qua `useTaskMutation` (toast tiếng Việt, lỗi qua `apiErrorMessage`, làm mới cache bằng `invalidateTasks` trong `taskKeys.ts`). `SubmitReviewModal` và `ReviewDecisionModal` mở từ các nút đó. `CreateTaskModal` mở từ nút "Tạo nhiệm vụ" trên `ActivityActions`; nút chỉ hiện khi cờ `canCreateTask` của `deriveActivityActions` bằng `canManage`. API nhiệm vụ nằm ở `api/tasks.ts`; `fetchTaskDetail` và các hàm checklist đã có nhưng chưa có màn dùng.

Trang chi tiết hoạt động: route `#/activity/:id` dựng `ActivityDetailView`. Thanh hành động `ActivityActions` lấy điều kiện hiện nút từ `deriveActivityActions` trong `activityPermissions.ts` để bắt chước quyền server; server vẫn kiểm quyền khi nhận request. Mọi thao tác ghi qua `useActivityMutation`: hiện toast tiếng Việt, làm mới cache `['core-activity', id]`; khi hoạt động bị xoá thì gọi `forgetActivity` và về `#/activities`. Các màn không bọc Router (danh sách, lịch, Tổng quan) mở chi tiết bằng `<a href="#/activity/ID">` hoặc `goToActivity(id)` trong `web/src/core/navigation.ts`.

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
