---
doc_id: SPEC-WEB-004
title: Design — Giao diện web mới (Linear-style) thay Atlaskit
version: 1.0
status: draft
audience: [dev, ai, ops]
owner: DYC
updated: 2026-10-10
related_code: [web/src/core/**, web/src/shared/**, core/src/routes/tasks.js, core/src/routes/activities.js, core/src/routes/notifications.js]
---

# Design — Giao diện web mới (Linear-style) thay Atlaskit

Thay lớp trình bày của `web/` (React 18 + TS + Vite) bằng giao diện gọn, mật độ thông tin cao, kiểu Linear; bỏ Atlaskit.
Kiến trúc nền (HashRouter, Core phục vụ `web/dist` tại `/`, `/legacy/`) giữ nguyên theo
[ADR-0016](../adr/0016-web-thay-the-frontend-core.md) và [SPEC-WEB-003](2026-10-09-web-hoan-thien-thay-the-design.md).
Spec này sẽ thay phần "nhìn và kỹ thuật UI" của hai tài liệu đó khi hoàn tất (ADR-0017 sẽ ghi quyết định).

## 1. Mục tiêu và phạm vi

**Mục tiêu:** frontend mới thay thế được frontend hiện tại (đủ chức năng, URL hash cũ vẫn chạy), có giao diện đã duyệt ở prototype
CSS (`web/src/prototype/`), và có **sửa tại chỗ + Lưu/Hủy** cho công việc và hoạt động.

**Trong phạm vi:** toàn bộ màn của `web/src/core/` (xem §6), shell mới, design system nội bộ, các endpoint Core phục vụ UI mới (§4),
tài liệu và kiểm thử.

**Ngoài phạm vi (giai đoạn này):** `web/src/ctd/` (nghiên cứu sau), biểu đồ Gantt, mục "Nhật ký trực ban" (đợt 6 đang hoãn),
đổi stack (React 19, Tailwind, shadcn).

**Quyết định đã chốt với chủ dự án (2026-10-10):**
- Cách làm: **một nhánh dài, cutover một lần** (không chạy song song hai UI).
- Giữ nhìn của prototype CSS; thêm **Radix** cho hành vi (popover, dialog, tabs) — không Tailwind, không shadcn.
- Thay đổi chạm Core (endpoint lô, `GET /api/tasks`, thông báo, quyền) **làm luôn trong nhánh này**, không soạn issue liên module,
  không họp team. Quyết định ghi tại spec này và ADR-0017.

## 2. Nguyên tắc

1. Chỉ thay lớp trình bày. Giữ `core/api/*`, `queryKeys`, `capabilities.ts`, các `permissions.ts`, `shared/utils/date.ts`,
   bảng dịch lỗi. Quyền hiển thị chỉ đi qua `useCapabilities()` và trường `editable` do server trả (INV-AUTH-001);
   không viết điều kiện vai trò trong màn.
2. Server là chốt chặn quyền cuối cùng; không lọc dữ liệu rộng ở client (bất biến #1).
3. Ngày giờ theo lịch VN (`toVnDateKey`, `formatVnDate`, `todayVnKey`); không cắt chuỗi ISO UTC (bất biến #7).
4. 100% tiếng Việt (trừ Đăng nhập đã song ngữ). Mobile ≥360px cho Việc của tôi, chi tiết việc, nộp nghiệm thu.
5. Kéo-thả Kanban chỉ khi `(pointer: fine)`, luôn có đường thay thế bằng bàn phím/nút.
6. Hỗ trợ `prefers-reduced-motion`; tương phản đạt AA ở cả hai theme.

## 3. Giao diện và design system

- **Bố cục 3 pane:** sidebar ~232px, danh sách ~360px, chi tiết hẹp căn giữa. Dưới 768px: sidebar là ngăn kéo, chi tiết là trang riêng.
- **`web/src/ui/`** (mới): `tokens.css` (màu trung tính; màu nhấn chỉ cho trạng thái/ưu tiên/avatar/biểu tượng tổ; light + dark),
  `Button`, `Menu` (Radix Popover), `Dialog` (Radix Dialog), `Select`, `Tabs`, `Toast`, `Avatar`, `StatusIcon`, `PriorityIcon`,
  `Badge`, `Field`, `EditBar`. Mỗi thành phần có test render, bàn phím, aria.
- **`web/src/core/shell/`:** Sidebar, khung 3 pane, chuông thông báo, đổi đơn vị (chỉ hiện khi ≥2 đơn vị), phím tắt
  (`j/k`, `c`, `/`), theme sáng/tối (`useTheme` đổi sang bật class/attr trên `<html>`, vẫn lưu `tckt_theme`).
- **Điều hướng sidebar:** Hộp thư (thông báo) · Việc của tôi · Hoạt động · Văn bản · Giao việc · Trình · Các tổ · (theo quyền:
  Thành viên, Báo cáo, Tài khoản, Lưu trữ, Lịch).
- **Việc của tôi** gộp "Việc hôm nay" thành các tab *Hôm nay · Quá hạn · Chờ tôi duyệt · Tất cả*. URL cũ `#/my-tasks-today`
  và `#/my-tasks` chuyển vào tab tương ứng. Dòng việc có huy hiệu "Mới được giao" / "Bị trả lại" (từ `review_feedback`) và
  trạng thái đã nhận (`acknowledged_at`).
- **Hộp thư** chỉ chứa dòng sự kiện thông báo, có lọc *Chưa đọc / Nhắc tên / Duyệt*; chuông và mục sidebar dùng chung dữ liệu.
  Chỉ `useNotifications` được `refetchInterval` (60 giây).

## 4. Sửa tại chỗ và Lưu/Hủy

### 4.1 Luồng trên màn hình
- Trường được phép sửa hiện ô sửa khi bấm; trường không có quyền hiển thị chỉ đọc.
- `useEditSession` giữ bản nháp chỉ gồm trường đã đổi. Khi có thay đổi đầu tiên, `EditBar` nổi lên với **Lưu / Hủy** và số trường đã đổi;
  `Ctrl/⌘+Enter` lưu, `Esc` hủy.
- Đổi việc, đổi route hoặc đóng tab khi còn nháp thì hỏi "Lưu / Bỏ thay đổi / Ở lại". `HashRouter` không có `useBlocker`, nên có
  guard điều hướng dùng chung (context + `beforeunload`).
- Lưu xong: làm mới cache, toast. Lỗi theo trường: tô đúng ô, giữ nguyên nháp. `409`: chọn "Giữ của tôi / Lấy bản mới".

### 4.2 Bảng quyền sửa
| Đối tượng | Trường | Được sửa bởi |
|---|---|---|
| Công việc | Tiêu đề, mô tả | Tổ trưởng/tổ phó của tổ, trưởng/phó ban (`admin`, `vice_admin`), và **người được giao việc đó** |
| Công việc | Người phụ trách, tổ, hạn, ngày bắt đầu, ưu tiên, sản phẩm bàn giao | Tổ trưởng/tổ phó của tổ, trưởng/phó ban |
| Hoạt động | Tiêu đề, mô tả | Trưởng/phó ban, trưởng sự kiện (`event_lead`) |
| Hoạt động | Người phụ trách, tổ | Trưởng/phó ban |
| Cả hai | — | DYC chỉ đọc (INV-AUTH-001); đơn vị khác chỉ thấy theo `unit_visibility_policies` |

Trạng thái, checklist, nhận việc, nộp nghiệm thu, duyệt, hủy **không** thuộc lô: giữ các endpoint hiện có
(`/status`, `/checklist`, `/acknowledge`, `/submit-review`, `/review`, `/cancel`).

### 4.3 Endpoint Core mới
`PATCH /api/tasks/:id/batch` và `PATCH /api/activities/:id/batch`; body `{ changes: {trường: giá trị}, base: {trường: giá trị cũ} }`.
- Kiểm quyền **từng trường** theo §4.2; sai quyền thì từ chối cả lô: `403` + danh sách trường bị cấm.
- Xung đột theo từng trường: giá trị hiện tại khác `base` thì `409` + giá trị mới. Không thêm cột `updated_at`, không đổi schema.
- Validate: tiêu đề không rỗng; `deadline` bắt buộc; `start_date ≤ deadline`; ưu tiên thuộc enum; người phụ trách/tổ phải thuộc phạm vi
  đơn vị hiện hành (INV-LEAK-001).
- Ghi trong một giao dịch; chỉ sau khi commit mới gửi thông báo.
- `GET /api/tasks/:id` và `GET /api/activities/:id` trả thêm `editable: [tên trường]`.
- `PATCH /api/tasks/:id` cũ giữ nguyên để không vỡ UI `/legacy/` (`core/tests/frontend.contract.test.js`).

### 4.4 Thông báo và email sau khi lưu
- Một thông báo gộp mới (`task.updated`, `activity.updated`) tới người liên quan, **trừ người sửa**, liệt kê "ai đổi gì" (từ → sang).
  `sourceKey` theo `taskId`/`activityId` + thời điểm lưu để không gửi trùng.
- Người mới thêm vào phụ trách nhận `task.assigned` như hiện tại; không bắn thông báo riêng từng trường.
- Thêm loại sự kiện vào danh mục `notifier` và mẫu email tiếng Việt.

## 5. Endpoint Core khác phục vụ UI mới
- `GET /api/tasks` có lọc (`mine`, `status`, `team_id`, `from`, `to`, `overdue`, `pending_review`), qua `scopeFor`, trả `acknowledged_at`,
  `activity_title`, `review_feedback`. Phục vụ tab "Tất cả", lịch (sau này) và danh sách việc. Giới hạn số dòng có chủ đích; phải qua
  `core/tests/units.leak.test.js`.
- `GET /api/notifications` nhận bộ lọc (`unread`, `kind`) và trả thêm `task_id`, `activity_id` để UI mở đúng đối tượng.
- Không đổi schema trong giai đoạn này. Nếu cần (ví dụ phân trang, `updated_at`), ghi lại thành quyết định trong ADR-0017.

## 6. Danh sách màn (giữ đủ chức năng, giữ URL hash)
| Nhóm | Màn |
|---|---|
| Lõi 3 pane | Việc của tôi, Hoạt động, Văn bản, Chỉ đạo (`#/directive/:id`), Trình (`#/submission/:id`) |
| Chi tiết | Hoạt động (`#/activity/:id`), Công việc (`#/task/:id`), bình luận, tệp/link, checklist, nộp/duyệt nghiệm thu |
| Kanban | `#/board/:id` (kéo-thả + bàn phím) |
| Lịch | `#/calendar` |
| Quản trị | Tổ, Trang tổ, Thành viên, Tài khoản (nhập hàng loạt, bộ trọng số), Báo cáo (tải Excel), Lưu trữ |
| Ngoài shell | Đăng nhập (SSO `/auth/microsoft` giữ nguyên), Onboarding, 404, Tài khoản của tôi |

Mỗi màn có bảng đối chiếu "chức năng cũ → thành phần mới" trong plan; màn chưa đủ chức năng thì chưa được coi là xong.

## 7. Kiểm thử
- TDD, test viết trước. Test logic cũ giữ nguyên; test màn viết lại theo `role/label`, ít phụ thuộc DOM thư viện.
- Thêm `@testing-library/user-event` cho luồng sửa/Lưu/Hủy; thêm Playwright smoke cho luồng chính
  (đăng nhập → Việc của tôi → sửa việc → Lưu → thấy thông báo).
- Core: test hợp đồng hai endpoint lô (quyền từng vai trò gồm người được giao/tổ trưởng/trưởng ban/DYC, `403`, `409`, giao dịch, một
  thông báo gộp) và `GET /api/tasks`; ít nhất một test đi từ session thật, không chỉ mock `req.unit.modules`.
- A11y: axe trên `ui/`, bàn phím cho Menu/Dialog/Tabs, tương phản hai theme, `prefers-reduced-motion`; kiểm bố cục ở 360/768/1024/1440.
- Cổng trước khi push: `cd web && npm test && npm run build`, `cd core && npm test`, `npm run test:tools`,
  `npm run docs:index && npm run docs:check -- --base origin/staging`.

## 8. Phụ thuộc
Thêm `@radix-ui/react-popover`, `react-dialog`, `react-tabs` (và gói Radix khác nếu thật sự cần), `@testing-library/user-event`.
Giữ React 18. Gỡ toàn bộ `@atlaskit/*`, `@compiled/react`; gỡ `@lottiefiles/dotlottie-react` nếu không còn dùng. Dark mode do token riêng.

## 9. Thứ tự làm (trong nhánh dài)
1. Tokens + `ui/` + shell chạy với dữ liệu thật.
2. Core: `GET /api/tasks`, endpoint lô, thông báo, `editable`.
3. Màn: Việc của tôi → Hoạt động + chi tiết (sửa tại chỗ) → Công việc/Kanban → Lịch → Tổ, Thành viên, Văn bản, Chỉ đạo, Trình, Báo cáo,
   Lưu trữ, Tài khoản, Đăng nhập, Onboarding.
4. Gỡ Atlaskit, dọn phụ thuộc, tài liệu, cutover.

## 10. Tài liệu phải cập nhật (cùng nhánh)
ADR-0017 (thay phần frontend của ADR-0016); `docs/dev/frontend.md`; SPEC-WEB-003; `docs/dev/kien-truc.md`; `docs/dev/test.md`;
`docs/dev/chay-local.md`; `docs/dev/phan-quyen.md`; `docs/dev/api.md`; `docs/ai/bay-da-gap.md` (bỏ bẫy Atlaskit, thêm bẫy mới);
`docs/ai/tim-o-dau.md`. Đánh `deprecated` các spec/plan màn hình ngày 2026-10-08 và plan đợt 0–6 mà spec này thay, rồi `npm run docs:index`.

## 11. Rủi ro
- Nhánh dài lệch `staging`: đồng bộ định kỳ.
- Chạm hợp đồng dùng chung của Core mà không qua họp: ghi rõ quyết định ở §1 và ADR-0017; giữ endpoint cũ để `/legacy/` không vỡ.
- Cutover: smoke trên staging; rollback bằng giữ `/legacy/` và image Core trước đó.

## Lịch sử phiên bản

| Version | Ngày | Thay đổi | Người |
|---|---|---|---|
| 1.0 | 2026-10-10 | Bản đầu: giao diện Linear-style, sửa tại chỗ + Lưu/Hủy, endpoint lô, kế hoạch tài liệu và kiểm thử | DYC |
