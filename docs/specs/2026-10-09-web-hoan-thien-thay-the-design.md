---
doc_id: SPEC-WEB-003
title: Design — Hoàn thiện web/ để thay thế frontend Core
version: 1.7
status: active
audience: [dev, ai, ops]
owner: DYC
updated: 2026-10-10
related_code: [web/**, core/src/app.js, core/Dockerfile, .github/workflows/deploy.yml]
---

# Design — Hoàn thiện web/ để thay thế frontend Core

Quyết định kiến trúc nằm ở `docs/adr/0016-web-thay-the-frontend-core.md`. Spec này mô tả **cái gì** phải có và **làm thế nào**
để `web/` thay được `core/public/`.

## 1. Mục tiêu và tiêu chí xong

Mục tiêu: `web/` làm được mọi việc UI cũ (`core/public/`) đang làm, cộng các cải tiến đang để "Sắp có", rồi thay UI cũ tại `/`.

Xong khi:
- Mọi dòng trong danh sách ngang bằng (mục 4) có trên `web/`. Mỗi dòng có test Vitest cho thao tác chính và cho phần ẩn/hiện
  theo quyền.
- Link `#activity/:id` trong email/thông báo mở đúng trang chi tiết trên `web/`.
- Staging chạy `web/` tại `/` ít nhất một vòng smoke đủ vai trò (admin, Tổ trưởng, thành viên, sinh viên HUST mới) trước khi
  lên production.
- `cd web && npm test && npm run build` xanh. Test Core xanh, gồm cả test mới cho API nhật ký trực ban.

## 2. Ràng buộc và mặc định đã chốt

- Chỉ tiếng Việt; không có nút đổi ngôn ngữ.
- Chỉ dùng link cho tài liệu, minh chứng và nghiệm thu. Ô tải tệp không làm. Server vẫn hỗ trợ tải tệp; bật lại là việc riêng.
- Làm theo luật của server, không chép lỗi của UI cũ:
  - Trọng số tự ghi nhận là số nguyên 0–10.
  - Nộp nghiệm thu bắt buộc có link.
  - Kanban chỉ chuyển `todo ↔ in_progress` trực tiếp. Sang "Chờ duyệt" phải qua hộp nộp nghiệm thu; sang "Hoàn thành" phải
    qua hộp duyệt.
  - Bộ lọc và ô chọn trạng thái có `changes_requested`.
- Giữ và làm thật các cải tiến UI cũ mới để "Sắp có": sửa công việc, xoá việc con, đổi đơn vị, Giao việc (chỉ đạo), Trình,
  Nhật ký trực ban.
- Không đổi API Core đã có, trừ việc **thêm** API nhật ký trực ban (mục 4.8).
- Ẩn/hiện theo quyền bắt chước đúng điều kiện server (mục 4 ghi rõ từng chỗ). Server vẫn là nơi chặn cuối.
- Giao diện dùng được trên điện thoại từ 360px cho "Việc hôm nay", chi tiết công việc và nộp nghiệm thu (Requirement 7.5).

## 3. Kiến trúc web/

### 3.1 Định tuyến

- Dùng `HashRouter` của `react-router-dom` (đã có trong `package.json`) thay cho `useState('dashboard')` trong `core/main.tsx`.
- Các route giữ đúng tên của UI cũ:

| Route | Màn |
|---|---|
| `#/` hoặc `#dashboard` | Tổng quan |
| `#my-tasks-today` | Việc hôm nay |
| `#calendar` | Lịch |
| `#activities` | Hoạt động |
| `#activity/:id` | Chi tiết hoạt động |
| `#board/:id` | Kanban của hoạt động |
| `#my-tasks` | Nhiệm vụ của tôi |
| `#teams` | Tổ |
| `#team/:id` | Trang Tổ |
| `#people` | Thành viên |
| `#accounts` | Quản trị tài khoản (admin) |
| `#documents` | Văn bản |
| `#reports` | Báo cáo (quản lý) |
| `#archive` | Lưu trữ |
| `#directives`, `#directive/:id` | Giao việc |
| `#submissions`, `#submission/:id` | Trình |
| `#ops-logs`, `#ops-log/:id` | Nhật ký trực ban |
| `#task/:id` | Mở chi tiết công việc (modal) trên nền Tổng quan |

- Link cũ dạng `#activity/12` (không có `/` sau `#`) vẫn mở đúng: hash history của react-router tự thêm `/` đầu, không cần code chuẩn hoá riêng.
- Route không có quyền chuyển về Tổng quan, như UI cũ. Route lạ hiện trang "Không tìm thấy".

### 3.2 Tầng API

- Tách `web/src/core/api/index.ts` thành từng file theo miền: `activities.ts`, `tasks.ts`, `teams.ts`, `users.ts`, `documents.ts`,
  `notifications.ts`, `directives.ts`, `submissions.ts`, `opsLogs.ts`, `session.ts`. `index.ts` chỉ re-export, để các
  import hiện có vẫn chạy.
- Một hàm `apiErrorMessage(err)` dùng chung:
  - Lấy `response.data.error`.
  - Dịch các câu tiếng Anh đã biết của Core sang tiếng Việt qua một bảng duy nhất `api/errorMessages.ts`. Bảng này gộp
    `VI_ERROR_MESSAGES`, `VI_CREATE_ERRORS` và `VI_ERRORS` đang nằm rải rác.
  - Câu lạ thì hiện nguyên văn.
  - Không có `response` thì hiện "Không kết nối được máy chủ".
- Thao tác ghi dùng `useMutation`, nên lỗi 401 đi qua `MutationCache` hiện có. Thành công thì `invalidateQueries` đúng các
  key liên quan (danh sách, chi tiết, `core-bootstrap`).

### 3.3 Thành phần dùng chung (`web/src/shared/`)

- `Toast`: thông báo ngắn, dùng `@atlaskit/flag`.
- `ConfirmDialog`: xác nhận thường hoặc nguy hiểm. Tuỳ chọn bắt gõ lại tên để xác nhận (xoá hoạt động).
- `ReasonDialog`: hộp nhập lý do, có tuỳ chọn bắt buộc (từ chối, yêu cầu sửa, bác bỏ…).
- `PeoplePicker`: tìm người không phân biệt dấu, chọn nhiều, hiện dạng chip (gắn thẻ `@`, đồng phụ trách, thêm người tham gia).
- `LinkField`: ô link, kiểm `http(s)://` phía client.
- `QuotaBar`: dung lượng tài liệu đã dùng trên 50 MB.
- Hook `useCapabilities()`: gom `bootstrap.capabilities`, vai trò hiện tại, `isExec`, `isManager`, `canManageTeam(id)` và
  `unitRole`. Màn hình không tự viết điều kiện quyền.

### 3.4 Khung trang

- `PageLayout`:
  - Mục menu theo quyền, như UI cũ: "Báo cáo" cho quản lý, "Quản trị tài khoản" cho admin.
  - Có thêm "Giao việc", "Trình" và "Nhật ký trực ban". Mỗi mục chỉ hiện khi đơn vị hiện tại có module `dieu-hanh` và vai trò
    đơn vị phù hợp (mục 4.7, 4.8).
- Bộ chọn đơn vị: chỉ hiện khi `session.units.memberships` có từ 2 mục trở lên. Chọn đơn vị gọi `POST /api/session/unit`,
  sau đó xoá cache query trừ `session` và tải lại.
- Chip người dùng mở hộp "Tài khoản của tôi" (mục 4.5).
- Chuông thông báo (mục 4.6).

## 4. Danh sách ngang bằng theo miền

Mỗi dòng ghi: thao tác → API → ai thấy. Lỗi của server hiện qua `apiErrorMessage`.

### 4.1 Hoạt động

Đã làm ở đợt 1; phần việc (giao việc, tự ghi nhận, chi tiết việc) thuộc đợt 2.

- **Tạo đề xuất** (`CreateActivityModal`, đã có): bổ sung đủ trường của UI cũ:
  - Trường thêm: `type`, `team_ids[]` (Tổ phối hợp, tự gồm Tổ chủ trì), `event_lead_id` (Trưởng BTC, chọn từ
    `GET /api/people`), `priority`, `location`, `requested_by`, `proposal_document_url`, `is_public`, `public_image_url`.
  - Tạo xong thì chuyển tới `#activity/:id`.
- **Chi tiết** `#activity/:id` → `GET /api/activities/:id`:
  - Phần đầu: trạng thái, ưu tiên, mô tả.
  - Thông tin chung: các Tổ, khoảng ngày, địa điểm, người tạo, Trưởng BTC, link đề án.
  - Kế hoạch công việc theo giai đoạn: sự kiện có "Trước", "Trong", "Sau"; việc được giao chỉ có "Chung". Ẩn việc đã huỷ.
  - Tài liệu/minh chứng theo từng việc.
  - Dòng thời gian cập nhật, có chip gắn thẻ.
  - Tổ tham gia, người tham gia, chi tiết hoạt động, lịch sử đề án.
- **Vòng duyệt**:
  - Duyệt / Yêu cầu sửa / Từ chối → `POST …/approve`, `…/request-changes`, `…/reject`. Chỉ admin thấy, khi trạng thái là
    `proposed`. Yêu cầu sửa và từ chối bắt buộc nhập lý do. Từ chối xong thì về `#activities`, vì server xoá hoạt động.
  - Nộp lại → `POST …/submit`. Hiện khi trạng thái là `changes_requested` và có quyền quản lý khi ghi; `canManage` của GET không đủ cho DYC.
- **Sửa** → `PATCH /api/activities/:id`:
  - Admin có quyền ghi sửa được mọi trường, kể cả Tổ phối hợp và trạng thái. Tổ đã lưu trữ còn gắn với hoạt động phải hiện để có thể gỡ hoặc thay; server chặn gỡ nếu Tổ còn việc.
  - Người có `canManage` không phải admin sửa được: tiêu đề, mô tả, loại, ưu tiên, ngày, địa điểm, người yêu cầu, tóm tắt
    kết quả, link đề án, công khai, ảnh công khai. Đây là cải tiến so với UI cũ, vốn chỉ cho admin sửa.
  - Chuyển sang `cancelled` phải xác nhận, vì server xoá hẳn hoạt động.
- **Xoá** → `DELETE /api/activities/:id`: chỉ admin, phải gõ lại đúng tiêu đề.
- **Đăng ký tham gia** → `POST …/volunteer`: hiện cho người chưa tham gia.
- **Thêm người tham gia** → `POST …/participants {user_ids, responsibility}`: hiện khi `canManage`. Lọc theo Tổ, bắt chọn ít
  nhất 1 người.
- **Đăng cập nhật** → `POST …/updates {kind, body, attachment_url, tagged_user_ids}`:
  - Thành viên TCKT có quyền ghi mới thấy form; DYC chỉ đọc vẫn thấy dòng thời gian. Loại cập nhật: bình luận, tiến độ, vướng mắc, minh chứng.
  - Gắn thẻ `@` chỉ với loại bình luận, chọn từ `taggablePeople`.
- **Danh sách** (đã có): giữ nguyên. Thẻ hoạt động bấm được để mở chi tiết, thay cho `ActivityDetailModal` hiện tại.
  `ActivityDetailModal` bị gỡ.

### 4.2 Công việc

- **Giao việc** → `POST /api/activities/:id/tasks`:
  - Hiện khi `canManage`.
  - Danh sách Tổ: admin thấy mọi Tổ của hoạt động, người khác chỉ thấy Tổ có `can_manage`.
  - Người phụ trách chính lấy từ `GET /api/teams/:id/members` khi đổi Tổ. Bỏ qua kết quả về muộn của lần đổi Tổ trước.
  - Đồng phụ trách không gồm người chính.
  - Trường: giai đoạn, ngày bắt đầu, hạn, ưu tiên, sản phẩm cần nộp, mô tả.
- **Chi tiết công việc** (modal; mở từ mọi danh sách và từ `#task/:id`) → `GET /api/tasks/:id`:
  - Thông tin, người được giao (có dấu đã xác nhận), sản phẩm cần nộp.
  - Checklist, tài liệu kèm thanh dung lượng, bình luận.
- **Sửa công việc** → `PATCH /api/tasks/:id`: cải tiến.
  - Chỉ người quản lý Tổ của công việc (`canManageTeam`) mới thấy nút.
  - Sửa được đúng 4 trường server cho phép: `deadline`, `start_date`, `priority`, `deliverable`.
  - Tiêu đề, mô tả và người được giao chưa sửa được, vì server chưa cho.
- **Xác nhận nhận việc** → `POST /api/tasks/:id/acknowledge`: người được giao, khi chưa xác nhận.
- **Đổi trạng thái** → `PATCH /api/tasks/:id/status`: chỉ `todo ↔ in_progress`, cho người được giao hoặc người quản lý Tổ.
- **Checklist**:
  - Thêm → `POST /api/tasks/:id/checklist`.
  - Tích → `PATCH /api/tasks/:id/checklist/:itemId`.
  - Cả hai khi `canUpdate`.
  - **Xoá** → `DELETE /api/tasks/:id/checklist/:itemId`: cải tiến, cùng điều kiện `canUpdate` với thêm và tích
    (server dùng `canTouchTask`). Phải xác nhận trước khi xoá.
- **Tài liệu** → `POST /api/tasks/:id/attachments` (multipart, chỉ gửi `kind`, `label`, `link_url`):
  - Cho người được giao hoặc người quản lý Tổ.
  - Mở tài liệu: theo link, hoặc với tệp thì mở `GET /api/task-attachments/:id/content`.
- **Bình luận công việc** → `POST /api/activities/:activity_id/updates {kind, body, task_id}`.
- **Nộp nghiệm thu** → `POST /api/tasks/:id/submit-review` (multipart `link_url`, `notes`):
  - Người được giao, khi trạng thái là `todo` hoặc `in_progress`. Link bắt buộc.
  - Có ở chi tiết công việc, ở Kanban và ở "Việc hôm nay".
- **Duyệt nghiệm thu** → `POST /api/tasks/:id/review {decision, feedback}`:
  - Người duyệt: admin, Tổ trưởng của Tổ phụ trách, hoặc Trưởng BTC. Trạng thái phải là `review`.
  - Lựa chọn: duyệt đạt / yêu cầu làm lại / bác bỏ. Hai lựa chọn sau bắt buộc nhập lý do.
  - Có ở chi tiết công việc, ở Kanban và ở mục "Chờ bạn duyệt".
- **Tự ghi nhận việc** → `POST /api/activities/:id/log-task` (multipart):
  - Hiện khi hoạt động ở trạng thái `approved` hoặc `active`.
  - Trọng số chọn từ `GET /api/weight-presets` hoặc nhập số nguyên 0–10.
  - Link minh chứng tuỳ chọn.
- **Rút lại việc tự ghi nhận** → `POST /api/tasks/:id/cancel`: người tự ghi nhận, khi việc chưa xong hoặc chưa huỷ.
- **Kanban** `#board/:id`:
  - Bốn cột: todo, in_progress, review, done.
  - Thẻ có nút theo quyền như mục trên.
  - Kéo-thả: chỉ khi thiết bị hỗ trợ con trỏ. Thả vào "Chờ duyệt" mở hộp nộp nghiệm thu; thả vào "Hoàn thành" mở hộp duyệt.
- **Việc hôm nay**: thêm nút "Xác nhận" và "Nộp nghiệm thu" theo từng dòng, và các nút duyệt ở mục "Chờ bạn duyệt".
- **Tổng quan và Nhiệm vụ của tôi**: nút tích mở chi tiết công việc, cuộn tới phần nộp nghiệm thu.

### 4.3 Tổ

- **Trang Tổ** `#team/:id` → `GET /api/teams/:id/overview`:
  - Chỉ admin hoặc Tổ trưởng của Tổ đó.
  - Số liệu, việc đang mở, hoạt động của Tổ, thành viên.
- **Tạo Tổ** → `POST /api/teams`: chỉ admin.
- **Sửa Tổ** → `PATCH /api/teams/:id`: admin sửa tên, mô tả, màu; Tổ trưởng chỉ sửa màu.
- **Xoá Tổ** → `DELETE /api/teams/:id`: chỉ admin, phải xác nhận. Thông báo khác nhau cho xoá hẳn và lưu trữ.
- **Thành viên Tổ** → `GET /api/teams/:id/members`:
  - Thêm (`POST`): admin chọn được vai trò; Tổ trưởng chỉ thêm thành viên thường.
  - Đổi vai trò (`PATCH`): chỉ admin, không áp cho tài khoản admin hay vice_admin.
  - Xoá (`DELETE`): admin; hoặc Tổ trưởng với thành viên thường. Không được tự xoá mình.

Giao diện trang `#/team/:id` để server kiểm tra quyền; nếu bị 403, giao diện báo lỗi và về Tổng quan vì quyền quản lý Tổ phụ thuộc dữ liệu bootstrap đã tải.

### 4.4 Thành viên và tài khoản

- **Thành viên** (đã có):
  - Thêm nút "Tạo tài khoản" cho quản lý.
  - Thêm nút Sửa/Xoá theo `can_manage` của từng dòng.
- **Tạo tài khoản** → `POST /api/users`:
  - Admin chọn vai trò và mọi Tổ; Tổ trưởng chỉ tạo `member` trong Tổ mình.
  - Hai kiểu: cục bộ (mật khẩu từ 8 ký tự) hoặc SSO (không cần mật khẩu).
- **Sửa tài khoản** → `PATCH /api/users/:id`: chỉ admin đổi được email và mật khẩu.
- **Xoá tài khoản** → `DELETE /api/users/:id`: ba thông báo theo kết quả: xoá hẳn, vô hiệu hoá, hoặc gỡ khỏi Tổ của mình.
- **Quản trị tài khoản** `#accounts` (chỉ admin):
  - Bảng lọc theo tên, vai trò, kiểu đăng nhập.
  - Nhập hàng loạt → `POST /api/users/bulk-import {rows}`, mỗi dòng `Tên,email`.
  - **Bộ trọng số** → `/api/admin/weight-presets` (GET, POST, PATCH, DELETE):
    - Theo `settingGuard`: lỗi 403 "đang bị DYC khoá" phải hiện rõ, kèm lý do.
    - Xoá phải xác nhận (UI cũ không hỏi lại).

Preset trọng số `weight_presets.points` là số nguyên 0–10; UI không nhận bước 0.5 như màn cũ.

### 4.5 Tài khoản của tôi

- `PATCH /api/account {email, phone, avatar_color, password?}`: ai cũng dùng được. Mật khẩu để trống là giữ nguyên.

### 4.6 Văn bản và thông báo

- **Thêm / sửa văn bản** → `POST /api/documents`, `PATCH /api/documents/:id`:
  - Nút thêm cho mọi người (như UI cũ). Nút sửa khi `can_edit`.
  - Trường: tên, link, năm, Tổ ban hành (lấy từ `issueTeams`), phạm vi xem, mô tả.
- **Chuông thông báo** → `GET /api/notifications`:
  - Tải lại mỗi 60 giây. Badge tối đa "99+".
  - Mở bảng thì đánh dấu tất cả đã xem (`POST /api/notifications/seen`).
  - Bấm một mục thì đánh dấu mục đó (`PATCH …/:id/seen`) và đi tới `url` của nó (hash cũ, đã chuẩn hoá theo mục 3.1).
  - Popup cho tối đa 3 mục mới chưa báo.

### 4.7 Giao việc và Trình (cải tiến, API đã có)

- Chỉ hiện khi đơn vị hiện tại có module `dieu-hanh`. Server trả 403 "Forbidden" nếu không.
- **Chỉ đạo** (`/api/directives`):
  - Danh sách và chi tiết; chi tiết gồm các submission và hoạt động liên kết.
  - Tạo: chỉ BTV (`btv_lead`, `btv_member`). Trường: `to_unit_id`, `title`, `body`, `deadline`.
  - Tiếp nhận (`acknowledge`, có thể chọn người phụ trách): cán bộ quản trị đơn vị nhận, khi trạng thái là `sent` hoặc
    `pending`.
  - Gắn hoạt động (`link-activity`).
  - Nộp kết quả (`submit`, `source_type` + `source_id` + `note`).
  - Đánh giá (`respond`): BTV hoặc DYC. Yêu cầu sửa bắt buộc có lý do.
- **Trình** (`/api/submissions`):
  - Danh sách và chi tiết.
  - Tạo: `to_unit_id`, `source_type` (`activity` | `ops_log` | `report`), `source_id`, `directive_id?`, `note`.
  - Phản hồi (`seen` / `revision_requested` / `accepted`; hai lựa chọn sau chỉ khi có `directive_id`): BTV hoặc DYC.
  - Rút lại: đơn vị gửi, khi chưa có phản hồi.
- Quyền chính xác của từng nút lấy từ `core/src/routes/directives.js` và `submissions.js`. Plan phải chép bảng điều kiện từ
  code, không đoán.

### 4.8 Nhật ký trực ban (cải tiến, cần backend Core mới)

Bảng `ops_logs` và `ops_log_attendance` đã có (`core/src/config/migrate-units.js`), nhưng chưa có API. Đây là task 12 của
`nen-tang-da-don-vi-tasks.md`, và phải thoả Requirement 6.

**API mới** `core/src/routes/ops-logs.js`:
- Áp cùng cổng như `directives`: cần `auth` và đơn vị có `dieu-hanh`.
- `GET /api/ops-logs?from=&to=&type=`:
  - Trả nhật ký của đơn vị hiện tại, mới nhất trước.
  - Kèm `recorded_by_name` và số người theo từng trạng thái điểm danh.
- `GET /api/ops-logs/:id`: trả nhật ký và danh sách điểm danh (`user_id`, `name`, `status`, `note`).
  - Người thuộc đơn vị khác chỉ xem được khi chính sách xem là `full_readonly`, hoặc khi nhật ký đã được Trình
    (Requirement 6.3).
  - Ngoài các trường hợp đó thì trả 404.
- `POST /api/ops-logs`:
  - Body: `{type, title, started_at, ended_at?, location?, content?, attendance:[{user_id, status, note?}]}`.
  - Chỉ vai trò đơn vị từ `leader` trở lên (`leader`, `vice_leader`, `admin`, `vice_admin`, BTV, DYC). Còn lại 403
    (Requirement 6.2).
  - `user_id` phải là thành viên của đơn vị; trạng thái phải thuộc enum.
  - Ghi trong một transaction.
- `PATCH /api/ops-logs/:id`:
  - Người ghi hoặc admin đơn vị được sửa các trường và thay toàn bộ danh sách điểm danh.
- Mỗi dòng `absent` (mới tạo, hoặc vừa đổi sang `absent`) tạo một thông báo trong ứng dụng cho người đó, loại
  `ops_log.absent_recorded`, `url` là `#ops-log/:id`. Đây là cách thoả Requirement 6.4 khi Core chưa có rule engine.
- Có test `node --test` với MySQL thật, theo mẫu `core/tests/*`:
  - Quyền 403 cho `member`.
  - Kiểm tra dữ liệu đầu vào.
  - Đọc chéo đơn vị.
  - Thông báo khi vắng.
  - Thay danh sách điểm danh.

**UI** `#ops-logs`:
- Danh sách lọc theo loại và khoảng ngày.
- Tạo/sửa: chọn thành viên đơn vị và trạng thái điểm danh từng người.
- Chi tiết.
- Nút "Trình" tạo submission `source_type='ops_log'`.

## 5. Thay thế UI cũ (bước cuối)

- `core/Dockerfile` chuyển sang nhiều giai đoạn:
  1. Giai đoạn `node:22-slim` chạy `npm ci && npm run build` trong `web/`.
  2. Giai đoạn chính chép `web/dist` vào `/app/web-dist`.
- Vì image cần cả `web/`, context build của image Core đổi từ `core` thành gốc repo. Có `.dockerignore` đi kèm.
- Workflow:
  - `build-core` chạy khi `core/**` hoặc `web/**` đổi. Filter `core` gồm lại `web/**`, nhưng `test-web` vẫn tách riêng.
  - `deploy-core` không đổi.
- `core/src/app.js`:
  - Phục vụ `web-dist` tại `/`, với fallback `index.html` cho mọi đường dẫn không phải `/api`, `/auth` hay `/legacy`.
  - Phục vụ `core/public` tại `/legacy` trong thời gian chuyển tiếp. Đường dẫn asset của UI cũ phải hoạt động dưới `/legacy`.
- `web/` build ra một trang Core duy nhất (`index.html` thay cho `core.html` + trang chuyển hướng).
- Dev (`npm run dev`) vẫn chạy như hiện tại.
- Thứ tự phát hành:
  1. Merge vào `staging`, rồi smoke đủ vai trò (mục 1).
  2. Đồng bộ `staging → main`, rồi smoke production.
  3. Sau tối thiểu 2 tuần không phải quay lại `/legacy`, một PR riêng gỡ `core/public` và `/legacy`.
- Rollback: deploy lại tag image Core trước đó. Không có thay đổi DB nào gắn với bước thay thế.

## 6. Chia đợt (mỗi đợt một PR vào staging)

| Đợt | Nội dung | Phụ thuộc |
|---|---|---|
| 0 | Hash router và chuẩn hoá link cũ; tách tầng API; `apiErrorMessage`; Toast, ConfirmDialog, ReasonDialog, PeoplePicker; `useCapabilities`; bộ chọn đơn vị | — |
| 1 | Hoạt động (4.1) | 0 |
| 2 | Công việc và Kanban (4.2) — xong | 0, 1 (trang chi tiết hoạt động) |
| 3 | Tổ, thành viên, tài khoản, quản trị, trọng số, tài khoản của tôi (4.3–4.5) | 0 |
| 4 | Văn bản và chuông thông báo (4.6) — xong | 0 |
| 5 | Giao việc và Trình (4.7) | 0 |
| 6 | Nhật ký trực ban: backend rồi UI (4.8) | 0, 5 (nút Trình) |
| 7 | Thay thế UI cũ (5) | 0–6 |

Đợt 3, 4 và 5 độc lập với nhau, làm song song được sau đợt 0.

## 7. Test

- Mỗi thao tác ghi có test Vitest kiểm tra:
  - đúng endpoint và body;
  - nút ẩn/hiện theo quyền (ít nhất một ca được phép, một ca bị chặn);
  - lỗi server hiện bằng tiếng Việt;
  - cache được làm mới sau khi thành công.
- Router: test link cũ `#calendar` mở đúng view Lịch, và test route không có quyền chuyển về Tổng quan.
- Backend nhật ký trực ban: test Core như mục 4.8.
- Thay thế: test Core rằng `/` trả `index.html` của `web`, `/legacy/` trả UI cũ, và `/api/*` không bị fallback nuốt.
- Trước mỗi lần báo xong một đợt, cả bốn phải xanh: `cd web && npm test && npm run build`, `cd core && npm test` (qua CI),
  `npm run test:tools`, `npm run docs:check`.

## 8. Ngoài phạm vi

- Tải tệp lên (server đã hỗ trợ, UI để sau).
- Tiếng Anh.
- Trang công khai (landing) dùng `is_public`.
- Màn quản trị nền tảng (`/api/platform/*`, `/api/units/*`).
- Phần CTD trong `web/src/ctd/`.

## 9. Rủi ro

- **Khối lượng lớn** (khoảng 45 thao tác cùng 3 phân hệ mới): mỗi đợt nghiệm thu riêng, có test, rồi mới sang đợt sau.
- **Quyền ẩn/hiện sai so với server**: luôn lấy điều kiện từ code route, có test cho ca bị chặn.
- **Link cũ**: chuẩn hoá hash và có test.
- **Đổi context Docker build**: thử build image ở job CI trên PR trước khi merge đợt 7.

## Lịch sử phiên bản

| Version | Ngày | Thay đổi | Người |
|---|---|---|---|
| 1.0 | 2026-10-09 | Bản đầu: danh sách ngang bằng với UI cũ, 6 cải tiến, API nhật ký trực ban, bước thay thế, 8 đợt | DYC |
| 1.1 | 2026-10-09 | Đợt 0 (nền tảng) xong: router, tầng API, quyền, thành phần dùng chung; react-router 6.30 tự thêm `/` cho `#activity/12` nên không cần code chuẩn hoá riêng | DYC |
| 1.2 | 2026-10-09 | Đợt 1 (Hoạt động) xong: form tạo đủ trường, trang chi tiết #activity/:id, vòng duyệt, sửa, xoá, đăng ký, thêm người, cập nhật có gắn thẻ; lịch mở trang chi tiết, gỡ ActivityDetailModal; việc trong trang hoạt động chỉ đọc đến hết đợt 2 | DYC |
| 1.3 | 2026-10-09 | Làm rõ quyền ghi DYC/TCKT và cách gỡ Tổ đã lưu trữ | DYC |
| 1.4 | 2026-10-09 | Đợt 2 làm sớm một phần từ PR #86: API nhiệm vụ, nút thao tác việc ở Việc của tôi, Nộp nghiệm thu, Duyệt/Bác bỏ, Tạo nhiệm vụ từ trang chi tiết hoạt động. Chưa làm: màn chi tiết việc, checklist | DYC |
| 1.5 | 2026-10-09 | Đợt 2 (Công việc và Kanban) hoàn thành: đầy đủ 12 task theo plan (hộp chi tiết công việc, checklist, tài liệu, bình luận, sửa việc, tự ghi nhận, giao việc, Kanban 4 cột kéo-thả, tích hợp vào Tổng quan, Việc hôm nay và Chi tiết hoạt động) | DYC |
| 1.7 | 2026-10-10 | Gộp trạng thái hoàn thành đợt 3 và đợt 4: Tổ, tài khoản, trọng số, Văn bản và thông báo | DYC |
