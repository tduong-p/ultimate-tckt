---
doc_id: SPEC-SOON-001
title: Thiết kế màn hình "Đang phát triển" (Coming soon) cho UI Core legacy
version: 1.4
status: active
audience: [dev, ai]
owner: DYC
updated: 2026-10-10
related_code: [core/public/**, core/tests/frontend.contract.test.js]
---

# Màn hình "Đang phát triển" cho UI Core legacy

> Màn hình này thuộc giao diện legacy và tiếp tục truy cập dưới `/legacy/` trong giai đoạn chuyển tiếp. Route frontend mới tại `/` và kế hoạch gỡ legacy được quy định ở SPEC-WEB-003 §5.

Tài liệu này chốt thiết kế một màn hình chặn vui nhộn cho những chỗ trong UI Core legacy (`core/public/`) mà người
dùng pilot TCKT bấm vào được nhưng tính năng chưa sẵn sàng. Mục tiêu: thay trang lỗi trơn hoặc nút "chết" bằng một
màn hình nói thật là chưa có, kèm chút hài hước để người dùng không bực.

## 1. Phạm vi

- **Module:** Điều hành (`core/public/**`). Không đổi hợp đồng dùng chung: không thêm field vào `/api/session`,
  không thêm setting, không đổi route backend.
- **Ngoài phạm vi:** CTD frontend, feature flag phía server, làm thật các tính năng bị chặn.

Kết quả rà soát (2026-10-03) dẫn tới sáu chỗ áp dụng:

| Key | Chỗ hiện | Kiểu | Vì sao chặn |
|---|---|---|---|
| `sso` | Nút "Sign in with Microsoft HUST" trên trang đăng nhập | modal | Chưa cấu hình Azure → `/auth/microsoft` trả 503 chữ trơn |
| `directive` | Mục menu mới "Giao việc" (nhóm "Sắp có") | trang `#soon/directive` | API đã có (PR #40, `core/src/routes/directives.js`), chưa có giao diện |
| `submission` | Mục menu mới "Trình" | trang `#soon/submission` | API đã có (PR #40, `core/src/routes/submissions.js`), chưa có giao diện |
| `ops-log` | Mục menu mới "Nhật ký trực ban" | trang `#soon/ops-log` | ops_log chưa có code |
| `task-edit` | Nút "Sửa" mới trong chi tiết công việc + nút xoá mục checklist | modal | Backend có `PATCH /api/tasks/:id`, `DELETE …/checklist/:itemId` nhưng UI chưa có |
| `not-found` | Hash không thuộc trang nào đã biết | trang | Hiện giờ âm thầm chuyển về dashboard |

## 2. Giao diện

```
  [linh vật SVG tự vẽ: chú cò cầm máy chích điện, tia điện lóe]

  ĐANG PHÁT TRIỂN · Giao việc                          ← eyebrow + tên tính năng
  Tính năng này đang được phát triển.
  Chúng tôi đã chích điện dev để đẩy nhanh tiến độ. ⚡   ← câu chính, dùng chung

  ⚡ Đang sạc dev… ▓▓▓▓▓▓░░░░ 58%                       ← thanh sạc
  "Việc này đã được giao… cho đội dev."                 ← câu riêng từng tính năng

  [⚡ Chích thêm phát nữa]   [← Về Tổng quan]  (modal: [Đóng])
```

- **Linh vật:** SVG inline do nhóm tự vẽ, cùng tinh thần meme "chích điện" nhưng là nhân vật riêng.
  Không dùng hay vẽ lại nhân vật của tác giả khác (bản quyền). Không nhắc tới "sang Cam" (nhạy cảm: buôn người).
- **Thanh sạc:** khởi điểm ngẫu nhiên trong khoảng 30–70%, không gắn với tiến độ thật.
- **Nút "Chích thêm phát nữa"** (chỉ chạy ở client, không lưu gì): mỗi lần bấm thanh sạc tăng 5–12%, tia điện
  nháy, toast xoay vòng lần lượt:
  1. "Dev đã tỉnh."
  2. "Dev đang gõ nhanh hơn."
  3. "Dev xin nghỉ phép."
  4. "Công đoàn đã được thông báo."
  
  Thanh dừng ở 99%, khi đó nút bị vô hiệu hoá và hiện dòng "Dev đã ngất. Vui lòng quay lại sau."
- **Biến thể `not-found`:** cùng khung, eyebrow "LẠC ĐOÀN", câu chính "Lạc đoàn rồi! Trang này không tồn tại —
  chích điện cũng không ra.", không có thanh sạc và nút chích, chỉ có "Về Tổng quan".

Câu riêng từng tính năng:

| Key | Tiếng Việt | English |
|---|---|---|
| `sso` | Tài khoản HUST đang làm thủ tục nhập học — chưa được cấp thẻ. Tạm dùng tài khoản nội bộ nhé. | Your HUST account is still enrolling. Use your local account for now. |
| `directive` | Việc này đã được giao… cho đội dev. | This task has been assigned… to the dev team. |
| `submission` | Đã trình lên — đang chờ ký duyệt. | Submitted — awaiting sign-off. |
| `ops-log` | Ca trực này chưa có ai nhận ca. | Nobody has picked up this shift yet. |
| `task-edit` | Tính năng sửa deadline… hiện chưa có deadline. | The deadline-editing feature… has no deadline yet. |

Câu chính bản EN: "This feature is under development. We've tased the devs to speed things up."

## 3. Hành vi

- **Bảng nội dung:** một object `COMING_SOON` trong `core/public/app.js`, mỗi key gồm `icon`, `vi`/`en`
  (tên tính năng, câu riêng). Chọn ngôn ngữ theo biến `lang` đang có; chuỗi tiếng Việt không đi qua từ điển `vi`.
- **Bộ dựng:** `comingSoonView(key)` trả HTML. `showComingSoon(key)` gắn vào `#content` (trang).
  `comingSoonModal(key, onClose)` mở trong `#modal` có sẵn. Hai hàm dùng chung một hàm gắn sự kiện cho nút chích.
- **Router:** `route()` thêm nhánh `page==='soon'` với `id` thuộc `COMING_SOON` → trang. Page không thuộc danh sách
  trang đã biết → trang `not-found`. Trang **có thật** nhưng người dùng không đủ quyền (ví dụ `#accounts` với member)
  **vẫn chuyển về dashboard** như hiện nay, để không lộ trang đó tồn tại. Link bỏ qua "Chuyển đến nội dung chính"
  (`#content`) chỉ chuyển focus, không đổi hash, để không rơi vào trang "Lạc đoàn".
- **Menu:** thêm nhóm "Sắp có" cuối `<nav id="nav">` trong `index.html`, ba mục `data-page="soon/<key>"`, chữ nhạt kèm pill
  "Sắp có", hiện cho mọi vai trò. Mục đang mở được tô `active` theo `#soon/<key>`.
- **SSO:** hằng `SSO_READY=false` trong `app.js`. Khi `false`, bấm nút Microsoft → chặn chuyển trang, mở modal `sso`.
  Cấu hình Azure xong thì đổi sang `true`; nút trở lại chuyển tới `/auth/microsoft` như cũ.
- **Sửa công việc:** trong `taskDetailModal`, người `canManageTaskTeam(tk.team_id)` thấy nút "Sửa" và nút xoá cạnh
  từng mục checklist. Bấm → `comingSoonModal('task-edit', () => taskDetailModal(id))`, đóng thì quay lại chi tiết
  công việc.
- **Chuyển động:** tia điện lóe và linh vật rung nhẹ bằng CSS animation. Trong `@media (prefers-reduced-motion: reduce)`
  tắt hết animation; thanh sạc vẫn cập nhật nhưng không chuyển tiếp.
- **Truy cập:** linh vật `aria-hidden`, thanh sạc là `role="progressbar"` có `aria-valuenow`, toast dùng `#toast`
  (`aria-live`) có sẵn. Màu lấy từ token trong `styles.css`.

## 4. Kiểm thử

Thêm vào `core/tests/frontend.contract.test.js` (đọc file tĩnh, không cần DB):

- `COMING_SOON` có đủ sáu key, mỗi key có `vi` và `en`.
- `index.html` có nhóm "Sắp có" với ba link `#soon/directive`, `#soon/submission`, `#soon/ops-log`.
- `route()` có nhánh `soon` và nhánh `not-found`; vẫn giữ `location.hash='dashboard'` cho trang bị chặn quyền.
- Nút SSO bị chặn khi `SSO_READY=false`.
- `components.css` có rule `prefers-reduced-motion` cho lớp của màn hình này.
- Không có chuỗi "Cam" trong nội dung màn hình.

Kiểm tay trên trình duyệt: sáu chỗ, hai ngôn ngữ, màn hình hẹp, bật giảm chuyển động.

## 5. Tài liệu

Cập nhật `docs/dev/frontend.md` (mục Core): mô tả `COMING_SOON`, cách thêm một mục và cách gỡ khi tính năng xong.

## Lịch sử phiên bản

| Version | Ngày | Thay đổi | Người |
|---|---|---|---|
| 1.0 | 2026-10-03 | Bản đầu: sáu chỗ chặn, chủ đề "chích điện dev", thanh sạc và nút chích | DYC |
| 1.1 | 2026-10-03 | Giao việc/Trình: API đã có từ PR #40, chỉ thiếu giao diện | DYC |
| 1.2 | 2026-10-03 | Menu dùng `data-page="soon/<key>"`; link bỏ qua (`#content`) chỉ chuyển focus, không đổi route | DYC |
| 1.3 | 2026-10-08 | Ghi nhận hotfix PR #81: trang chi tiết hoạt động tra khung Participants bằng `#participants-head` thay vì qua nút `#volunteer` (nút ẩn khi người xem đã tham gia → lỗi `null.closest`, trang trắng); asset `?v=2.10.1`; phạm vi không đổi | DYC |
| 1.4 | 2026-10-10 | Làm rõ màn hình legacy tiếp tục nằm dưới `/legacy/` sau cutover | DYC |
