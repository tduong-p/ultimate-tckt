---
doc_id: AI-PIT-001
title: Bẫy đã gặp
version: 1.13
status: active
audience: [ai, dev]
owner: DYC
updated: 2026-10-08
related_code: []
---

# Bẫy đã gặp

Danh sách lỗi/hiểu lầm đã xảy ra thật trong lịch sử dự án, để không lặp lại. Nguồn: lịch sử git của repo cũ
`tckt-activity-hub` (nay là `deployment-package`, các SHA dưới đây tra được bằng `git log --oneline` trong repo đó).

- **Lệch ngày UTC/local khi cắt chuỗi ISO.** Nhiều màn (lịch, dashboard) từng lấy 10 ký tự đầu của chuỗi
  timestamp UTC và coi đó là ngày hiển thị, sai lệch với ngày theo giờ Việt Nam gần nửa đêm. Sửa qua nhiều đợt:
  `e4d0bb7` (so hạn chót theo ngày lịch, không theo timestamp), `5f06c19` và `88fc946` (sửa tiếp các chỗ cắt
  chuỗi UTC/local còn sót trong lịch và dashboard). Bài học: luôn quy đổi múi giờ trước khi lấy phần ngày, không
  bao giờ dùng `slice`/`substring` trên chuỗi ISO để suy ra "ngày hôm nay" của người dùng.
- **Task/activity `cancelled` lọt vào thống kê hoặc kế hoạch việc.** `b552065`: loại task đã huỷ khỏi số liệu
  tổng quan/bootstrap. `6c80165`: ẩn task đã huỷ khỏi kế hoạch công việc của hoạt động. Bài học: mọi query đếm/
  liệt kê task phải lọc rõ trạng thái, không mặc định "mọi bản ghi còn tồn tại = còn hiệu lực".
- **Activity bị hard-delete khi chuyển sang `cancelled`.** `8b3342f` cố tình xoá cứng activity khi trạng thái
  thành huỷ (thay vì chỉ đổi cờ). Đây là quyết định có chủ đích tại thời điểm đó, không phải lỗi — nhưng vì hệ quả
  không đảo ngược được (mất luôn dữ liệu, không phải soft-delete), bất kỳ ai định "dọn" activity huỷ đều phải biết
  hành vi này trước khi đổi logic tương tự ở nơi khác.
- **Tính năng upload file đang tắt, chỉ nhận link.** `1b32165` tạm tắt các trường upload file, chỉ giữ minh chứng
  dạng link. Đừng giả định trường upload file trong UI cũ đang hoạt động — kiểm code thực tế trước khi dựa vào nó.
- **`emailEvents.emit` chạy sau khi pool DB đã đóng trong test** → log nhiễu `Pool is closed`. Xảy ra khi test kết
  thúc và teardown pool trước khi một callback bất đồng bộ (gửi email) kịp chạy xong. Bài học: test nào kích hoạt
  side-effect bất đồng bộ (email, cron) phải đợi nó hoàn tất trước khi teardown, hoặc mock hẳn phần gửi.
- **Test `weight-presets` gửi sai tên field.** Test cũ gửi `body: { label: … }` trong khi route
  `POST/PATCH /api/admin/weight-presets` đọc field `name` (cột DB vẫn là `label` — API và schema DB không cùng
  tên). Sửa ở `core/tests/weight-presets.test.js` khi dựng monorepo (Task 2 của plan monorepo). Bài học: tên field
  API và tên cột DB không nhất thiết trùng nhau, đừng suy đoán từ tên cột.
- **Image phải build cho arm64.** VM chạy Oracle Ampere (ARM), không phải x86_64. Build Docker image không dùng
  buildx/QEMU cho arm64 sẽ tạo image không chạy được trên VM dù CI xanh trên máy build x86.
- **`ctd@staging` từng cũ hơn `ctd@main` 8 commit.** Lúc dựng monorepo (2026-09-23), nhánh `staging` của repo `ctd`
  cũ hơn `main` — nếu lấy nhầm `staging` làm nguồn thì PR `staging → main` của monorepo mới sẽ kéo lùi phiên bản
  CTD production. Bài học: trước khi import nguồn, luôn so `git log` giữa các nhánh của từng repo nguồn, đừng mặc
  định `staging` luôn mới hơn `main`.
- **OTP dev cố định `123456` từng chạy trên môi trường thật.** Trước khi có `APP_ENV=staging|production`, CTD
  chạy với `app_env=dev` ở mọi nơi kể cả môi trường thật, nghĩa là ai biết email người dùng cũng đăng nhập được
  bằng mã `123456` (xem `services/ctd-api/backend/app/infra/otp.py`). Đã đóng bằng cách bắt buộc set `APP_ENV`
  đúng môi trường khi deploy — kiểm lại giá trị này mỗi khi thấy đăng nhập CTD "quá dễ" trên staging/production.
- **`dorny/paths-filter` trên PR cần quyền `pull-requests: read`.** Token mặc định của repo mới không có quyền
  này → job `changes` lỗi "Resource not accessible by integration" và mọi job sau bị skip. Job `changes` trong
  `deploy.yml` khai báo `permissions: { contents: read, pull-requests: read }`; đừng xoá.
- **Push nhiều nhánh cùng lúc vào repo vừa tạo có thể không kích hoạt workflow** cho một trong các nhánh
  (gặp với `staging` ngày 2026-09-24). Nếu thiếu run, đẩy thêm một commit (qua PR) để kích hoạt lại.
- **`agy` headless chọn lệnh shell để ghi file.** Ở mode mặc định, headless tự từ chối lệnh shell
  (`denied_actions: RunCommand`), và khi được nhờ tạo file thì `agy` hay thử bằng shell nên kết quả rỗng; `--mode
  plan` kèm `--json-schema` trả rỗng. Bài học: đừng để `agy` ghi — bắt nó trả nội dung qua `--json-schema` (đọc ở
  `structured_output`) và để code tự ghi. Phát hiện khi spike repobot (2026-09-26).
- **Ruleset chỉ cho App bypass thì chủ repo cũng không xoá được nhánh.** Ruleset `bot-branches` chặn xoá `bot/**`
  với mọi người trừ App `tckt-repobot`, nên nút "Delete branch" sau khi đóng PR bot bị từ chối. Dọn bằng cách tạm
  thêm mình vào bypass (xem `docs/ops/repobot.md`).
- **Seed chạy ở mỗi lần container khởi động không được ghi đè mật khẩu hoặc tự ý mở khóa tài khoản.**
  `seed_admin` trong CTD từng đặt lại mật khẩu mặc định công khai và ép `is_active = True` ở mỗi lần container khởi động lại,
  khiến việc đổi mật khẩu bảo mật hoặc khóa tài khoản quản trị bị đảo ngược sau mỗi lần deploy/restart.
  Bài học: seed chỉ khởi tạo tài khoản nếu chưa có; với tài khoản đã tồn tại, không bao giờ ghi đè `password_hash` hay `is_active`.

## `unit_id` ép `INT UNSIGNED` làm Core staging crash-loop; viết lại file migration làm mất bản sửa cũ

DB staging đã migrate bởi bản cũ có `org_units.id` là `INT` có dấu. Migration ép `unit_id INT UNSIGNED` rồi MySQL từ chối
`fk_teams_unit` (`ER_FK_INCOMPATIBLE_COLUMNS`), container `core` restart mãi và job `deploy-core` đỏ ở bước health check. Bản sửa `330a27b`
(đọc kiểu của `org_units.id` rồi dùng đúng kiểu đó) từng có, nhưng PR #44 viết lại `core/src/config/migrate-units.js` và làm mất nó; CI xanh vì
DB test là DB mới (đã `UNSIGNED`). Bài học: sau khi merge file migration lớn, kiểm tra các bản sửa trước đó còn nguyên (`git log -p -- <file>`), và
giữ test dựng lại trạng thái DB staging (`migrate.units.test.js`, "signed INT"). Deploy đỏ ở health check: đọc `docker logs` của container trước khi đoán.

## `mailer.notify*` cũ gửi cả email lẫn push; scheduler gắn thông báo ngoài vào `inserted`

Hàm `notify*` của `mailer.js` cũ gọi cả Gmail lẫn OneSignal, nên xoá riêng một kênh dễ làm mất kênh kia. Ngoài ra scheduler nhắc hạn
từng chỉ gửi khi `insertNotificationOnce` chèn được dòng mới (gửi lỗi một lần là mất thư), rồi lại sửa thành gọi mọi mục mỗi lượt
(bắn lặp, không biết đã gửi chưa). Hiện mọi điểm phát thông báo đi qua `notifier.notify({ event, recipient, data, sourceKey })`;
`sourceKey` là khoá chống trùng phía nhận (Noti dedupe, SPEC-NOTI-001 §8). Scheduler dùng `notifications.email_status` làm trạng thái:
dòng mới là `pending`, chỉ gọi `notify` khi còn `pending`, rồi ghi `success`/`failed`/`pending` (lỗi tạm thời, lượt sau thử lại) bằng
`emailStatusFor`. Dòng `pending` mồ côi (người nhận hết hiệu lực, task đã đóng) không ai dọn: đừng coi `pending` là "sắp gửi chắc chắn".

## `tasks.deadline` là `DATE`: nhắc hạn theo giờ cho kết quả sai

Cột `deadline` chỉ có ngày (00:00). Phép `TIMESTAMPDIFF(HOUR, NOW(), deadline) IN (24, 4)` cũ cho "còn 4 giờ" sai và lệch tuỳ giờ scheduler chạy.
Nhắc hạn nay so **ngày lịch giờ VN** trong Node (`core/src/services/reminder-rules.js`: "1 ngày", "hôm nay"), chỉ gửi 07:00–21:59 VN.
Đừng thêm mốc theo giờ cho `tasks.deadline`; xem `docs/dev/mui-gio.md`.

## Noti: test chỉ chạy driver `console` nên lỗi của driver thật và cấu hình lọt qua

Bản đầu của `services/noti-api` xanh 57/57 test nhưng driver `graph` sập ngay khi khởi động (đọc `settings.graph_tenant_id`, config
tên `graph_tenant`), `.env.example` ghi sai tên biến (bị bỏ qua không báo), và worker gán cứng `base_url` nên mọi link trong email sai.
Test giờ dựng từng driver từ `Settings`, so `.env.example` với các trường của `Settings`, và kiểm link trong thư lấy từ `NOTI_APP_BASE_URL`.
Khi thêm cấu hình hoặc driver mới: thêm test dựng nó từ `Settings`, đừng chỉ test lớp driver với tham số truyền tay.

## Đổi cùng lúc script VM và compose: job `infra` lần đầu chạy script cũ

Job `infra` SSH vào VM và gọi `infra/scripts/apply-infra.sh` **đang có trên VM**; script này tự `git pull` rồi mới đọc compose
mới. Khi PR #45 vừa thêm `${NOTI_IMAGE_TAG:?}` vào compose vừa sửa `apply-infra.sh` để export biến đó, lần chạy sau merge dùng
script cũ với compose mới → `required variable NOTI_IMAGE_TAG is missing a value`. Script lúc đó đã được pull, nên chỉ cần
`gh run rerun <id> --failed`. Thêm biến `:?` mới vào compose: hoặc cho script cũ vẫn chạy được (biến có `:-` ở bản đầu), hoặc
dự trù rerun một lần.

## Test Core xanh ở local (Node 24) nhưng đỏ trên CI (Node 22)

`AbortSignal.timeout()` dùng timer không giữ event loop. Trên Node 22, test "request treo bị huỷ" làm `node --test` kết thúc
khi promise còn chờ (`Promise resolution is still pending but the event loop has already resolved`), kéo đỏ cả test sau nó
(PR #46). Code cần huỷ sau một khoảng thời gian thì dùng `AbortController` + `setTimeout` và `clearTimeout` trong `finally`.
Core chạy Node 22 (`core/package.json` `engines`): máy có Node khác thì chạy test bằng `npx -y node@22 --test …`.

## `docs:check --base` ở local xanh nhưng CI đỏ vì tài liệu liên quan chưa sửa

Kiểm tác động code→tài liệu so `git diff base...HEAD`, tức chỉ các **commit**. Chạy `docs:check` khi thay đổi `infra/**`
còn chưa commit thì local báo `docs ok`, còn CI của PR báo hàng chục tài liệu có `related_code` trùng mà chưa sửa (PR #45).
Commit xong rồi mới chạy `npm run docs:check -- --base origin/staging`; đổi `infra/**`/`.github/**` thì dự trù sửa nhiều tài liệu.

## Router hash của UI Core coi mọi anchor là trang

`core/public/app.js` điều hướng bằng `location.hash`, nên một link neo bình thường (`href="#content"` của link bỏ qua)
cũng bị `route()` hiểu là tên trang. Trước đây hash lạ âm thầm về dashboard; từ SPEC-SOON-001 hash lạ hiện trang
"Lạc đoàn". Link neo trong UI cũ phải `preventDefault()` và tự `focus()`/cuộn, hoặc tên trang phải có trong `KNOWN_PAGES`.
Hai PR cùng merge vào `staging` mà còn marker `<<<<<<<`/`>>>>>>>` trong tài liệu làm `docs:check` của mọi PR sau đỏ —
xem diff trước khi bấm merge.

## Test tính "hôm nay" bằng ngày local của máy chạy: đỏ mỗi ngày từ 17:00 UTC

CI chạy UTC, còn Core tính ngày nghiệp vụ theo giờ Việt Nam (`core/src/date-vn.js`). Từ 17:00 đến 24:00 UTC (00:00–07:00 giờ VN) hai ngày này khác nhau,
nên test tự dựng deadline "hôm nay" bằng `new Date()` / `getDate()` thất bại chập chờn (ví dụ `my-tasks-today.test.js`). Trong test luôn dùng `dateInVietnam()`.

## Noti: `sent` không còn nghĩa "đã gửi" cho thư bị allowlist; gửi lặp khi DB hỏng sau gửi

Trước #49, người nhận bị `NOTI_RECIPIENT_ALLOWLIST` bỏ vẫn được ghi `sent`, nên staging báo "đã gửi" cho thư chưa hề đi.
Giờ trạng thái là `suppressed` (không tính vào trạng thái tổng; tất cả `suppressed` → tổng `suppressed`). Code đọc
trạng thái Noti (đếm `sent`, thống kê) phải xử lý `suppressed` như "cố ý không gửi", không phải thành công cũng không phải lỗi.
Còn một rủi ro đã biết, đã ghi trong SPEC-NOTI-001 §7: nếu thư đã đi mà DB hỏng lâu hơn khoá 5 phút, `recover()` trả dòng
về `pending` và thư có thể đi thêm một lần. Đừng "sửa" bằng cách cho lỗi ghi `sent` kích hoạt retry; điều đó còn tệ hơn.

## Thứ tự tham số SQL khi ghép `scopeFor`: `?` trong `SELECT` đứng trước `?` trong `WHERE`

`GET /api/teams` có `EXISTS(... mine.user_id=? ...)` trong `SELECT` nhưng truyền `[...s.params, req.actor.id]`, nên
`user_id` nhận unit id và `t.unit_id` nhận user id. Tài khoản admin id 3 trùng unit TCKT id 3 nên vẫn chạy đúng; mọi
tài khoản khác nhận danh sách Tổ rỗng → form "Sửa hoạt động" có ô "Tổ chủ trì" trống, không lưu được (production
2026-10-08). Bài học: params phải theo đúng thứ tự `?` xuất hiện trong câu SQL, không theo thứ tự "scope trước"; test
dùng user có id khác unit id để không bị trùng số che lỗi.

## Lịch sử phiên bản

| Version | Ngày | Thay đổi | Người |
|---|---|---|---|
| 1.0 | 2026-09-24 | Bản đầu (viết lại từ tài liệu cũ khi gộp monorepo) | DYC |
| 1.1 | 2026-09-24 | Thêm bẫy quyền `paths-filter` và push nhiều nhánh vào repo mới | DYC |
| 1.2 | 2026-09-27 | Thêm bẫy `agy` headless ghi file bằng shell và ruleset `bot-branches` chặn cả chủ repo xoá nhánh | DYC |
| 1.3 | 2026-10-02 | Thêm bẫy mailer cũ gộp email và push; scheduler gắn thông báo ngoài vào `inserted` | DYC |
| 1.4 | 2026-10-02 | Thêm bẫy Noti: test chỉ chạy driver console, lỗi cấu hình driver thật lọt qua | DYC |
| 1.5 | 2026-10-02 | Thêm bẫy `docs:check --base` chỉ thấy file đã commit | DYC |
| 1.6 | 2026-10-02 | Thêm bẫy: lần đầu đổi cả script VM và compose, job infra chạy script cũ; `AbortSignal.timeout` trên Node 22 | DYC |
| 1.7 | 2026-10-02 | Thêm bẫy: unit_id phải theo kiểu org_units.id; merge viết lại file làm mất bản sửa cũ | DYC |
| 1.8 | 2026-10-03 | Thêm bẫy: router hash UI Core coi anchor là trang; marker xung đột lọt vào staging | DYC |
| 1.9 | 2026-10-03 | Đồng bộ main→staging: thêm bẫy seed chạy mỗi lần khởi động ghi đè mật khẩu và tự mở khóa tài khoản quản trị | DYC |
| 1.10 | 2026-10-03 | Thêm bẫy: test dùng ngày local của máy chạy đỏ từ 17:00 UTC vì Core tính ngày theo giờ VN | DYC |
| 1.11 | 2026-10-05 | #49: scheduler dùng `email_status` (pending mồ côi); thêm bẫy `tasks.deadline` là `DATE` nên nhắc theo ngày lịch, không theo giờ | DYC |
| 1.12 | 2026-10-05 | #49 Noti: thêm bẫy `suppressed` thay `sent` cho thư bị allowlist, và rủi ro gửi lặp khi DB hỏng sau gửi | DYC |
| 1.13 | 2026-10-08 | Thêm bẫy thứ tự tham số SQL khi ghép `scopeFor` (`/api/teams` trả rỗng cho mọi tài khoản trừ id trùng unit id) | DYC |
