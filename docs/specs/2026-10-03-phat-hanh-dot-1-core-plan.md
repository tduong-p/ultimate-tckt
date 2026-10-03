---
doc_id: PLAN-REL-001
title: Plan — sửa quyền, phạm vi dữ liệu và lỗi Core trước pilot
version: 1.1
status: active
audience: [dev, ai]
owner: DYC
updated: 2026-10-03
related_code: []
---

# Sửa Core sau rà soát phát hành đợt 1 — Implementation Plan

> **For agentic workers:** thực hiện theo task nhỏ, test trước khi sửa (TDD), review task trước khi chuyển tiếp. Phần code thuộc Nền hoặc hợp đồng dùng chung đã có quyết định bằng văn bản ghi trong issue #48 và #49 ngày 2026-10-03.

**Mục tiêu:** sửa các phát hiện R1–R12 của `SPEC-REL-001` trong Core; giữ R1 là điều kiện chặn phát hành (G1), xử lý các rủi ro pilot trước khi mở cho người dùng thật, và để các mục dọn dẹp/nhắc hạn ở đợt sau nếu chưa được duyệt.

**Phạm vi:** Core Node/MySQL, gồm module Điều hành và Nền. Không sửa CTD, Noti, hạ tầng, frontend chung `web/`, schema/migration, hay API dùng chung ngoài các quyết định đã ghi trong issue #48 và #49.

**Nguồn:** `SPEC-REL-001` §3–5; `SPEC-PILOT-001` §3, §9.1; issue #48 (quyền/tài khoản/đơn vị), issue #49 (Core↔Noti).

## Trạng thái và cổng quyết định

Ngày 2026-10-03, các quyết định bằng văn bản chính thức đã được ghi trực tiếp vào mục "Quyết định" của issue #48 và #49:

| Cổng | Nội dung quyết định đã chốt | Task áp dụng | Trạng thái |
|---|---|---|---|
| C48-A | Đồng bộ hai chiều `users.role` ↔ `unit_memberships` (TCKT) trên cả 4 route `teams.js`, gồm cả cờ lead/vice-lead. Sửa hồ sơ không tự tạo lại membership đã gỡ. | 1 | **ĐÃ CHỐT** (G1) |
| C48-B | Pilot Điều hành chỉ dành cho TCKT; Admin TCKT chỉ quản lý user TCKT (không có quyền platform owner, tài khoản DYC chỉ sửa qua `units.js`); Cấm tự đổi email qua `PATCH /api/account` (403, UI read-only); Gỡ route directives/submissions (404); Chỉ `dyc_admin` quản lý đơn vị khác (`dyc_engineer` không tự nâng quyền); Ẩn email member thường ở `units.js`. | 2, 3, 4, 6, 7, 8, 9 | **ĐÃ CHỐT** |
| C48-C | Quyền lấy từ `req.actor` và membership (INV-AUTH-001); Khóa/hạ quyền có hiệu lực ngay request tiếp theo; Đăng nhập bắt buộc `session.regenerate`; `/api/session` phản ánh đúng quyền ghi thực tế (DYC chỉ đọc Điều hành). | 5 | **ĐÃ CHỐT** |
| C48-D | Ghi audit log cho thao tác ghi nhạy cảm (tạo/sửa/khóa user, đổi role) và đọc chéo đơn vị; Tránh ghi log cho polling định kỳ; Tuyệt đối không ghi secret/mật khẩu vào metadata. | 10 | **ĐÃ CHỐT** |
| C49-A | Production chưa bật gửi email thật; Sửa R12 cho scheduler idempotent (dựa trên `sourceKey` ổn định, không gọi notify lặp mỗi 15 phút), chuẩn hóa múi giờ VN, loại trừ `review`/`done`/`cancelled`, retry có giới hạn cho lỗi tạm thời; Lập danh sách kiểm kê riêng cho toàn bộ phần còn lại của #49. | 12 | **ĐÃ CHỐT** |

### Mức ưu tiên

| Nhóm | Task | R | Thời điểm |
|---|---|---|---|
| A — chặn release | 1 | R1 | Trước PR `staging → main`; là G1 |
| B — an toàn pilot và tính đúng đắn | 2–9 | R2–R9 | Trước khi mở pilot hoặc trước khi gỡ giới hạn vận hành G3; mỗi task tách PR nhỏ |
| C — audit/cleanup/reliability | 10–12 | R10–R12 | Sau khi xong nhóm B; R12 thuộc #49 |

`G3` của `SPEC-REL-001` là biện pháp giảm thiểu tạm thời trong vận hành production: giữ `CORE_DEVOPS_EMAILS` rỗng và không tạo membership ngoài TCKT. G3 không thay thế cho các bài test code đã được kiểm chứng.

## Quy tắc thực hiện chung

- Trước Task 1–12: `git status --short`, xác nhận đúng repo/nhánh, `git fetch origin`. Mỗi Task là PR riêng vào `staging`.
- Không sửa contract dùng chung ngoài phạm vi quyết định trong issue. Không sửa schema/migration nếu không có issue/ADR mới.
- Với mỗi thay đổi code, bắt buộc theo quy trình TDD: thêm test đỏ trong `core/tests/`; chạy test mục tiêu thấy đỏ; sửa code tối thiểu; chạy lại test mục tiêu xanh; chạy toàn bộ `cd core && npm test`.
- Cập nhật tài liệu cùng PR: tăng `version`, `updated: 2026-10-03`, thêm dòng lịch sử; chạy `npm run docs:index` và `npm run docs:check -- --base origin/staging`.
- Không đổi dữ liệu production, secrets hay cấu hình VM trong code/test.

## Ma trận task, file và nghiệm thu

| Task | R | File code/test chính | Nghiệm thu tối thiểu | Cổng |
|---|---|---|---|---|
| 1. Đồng bộ vai trò tổ và membership TCKT | R1 | `core/src/routes/teams.js`, `core/tests/teams.mgmt.test.js` | Test cả 4 route team (`/teams`, `/teams/:id`, `/teams/:id/members`, `/teams/:id/members/:userId`); role và membership TCKT cập nhật đồng bộ hai chiều; cờ lead/vice-lead chính xác. | C48-A (G1) |
| 2. Chặn quản lý tài khoản chéo đơn vị và tái tạo membership | R2–R3 | `core/src/policies/access.js`, `core/src/routes/users.js`, `core/src/units/memberships.js`, `core/tests/users.test.js`, `core/tests/units.memberships-repo.test.js` | Admin TCKT chỉ sửa/xóa user TCKT, nhận 403 với DYC/BTV/platform_owner; sửa profile không hồi sinh membership TCKT đã chủ động gỡ. | C48-B |
| 3. Chặn tự đổi email | R4 | `core/src/routes/system.js`, `core/tests/account.test.js` | `PATCH /api/account` trả 403 khi gửi email mới; ô email frontend chỉ đọc; không thể chiếm allowlist. | C48-B |
| 4. Ngắt routes directives/submissions chưa hoàn thiện | R5 | `core/src/routes/index.js`, `core/tests/routes.mount.test.js`; giữ unit tests trong `core/tests/directives.test.js` | Endpoint directives và submissions trả 404; không ảnh hưởng các route Điều hành khác. | C48-B / SPEC §9.1 |
| 5. Làm hiệu lực khóa/hạ quyền ngay, session regeneration và quyền session | R6 | `core/src/middleware/auth.js`, `core/src/middleware/unit-context.js`, `core/src/routes/activities.js`, `core/src/routes/system.js`, `core/tests/auth.session.test.js` | Tài khoản inactive bị chặn ở request kế tiếp; login regenerate session; quyền route đọc từ `req.actor`; `/api/session` trả đúng quyền ghi thực tế (DYC chỉ đọc Điều hành). | C48-C |
| 6. Scope Điều hành chỉ dành cho TCKT và dọn `user_teams` | R7 | `core/src/policies/access.js`, `core/src/routes/documents.js`, `core/src/routes/system.js`, `core/src/routes/activities.js`, `core/src/routes/teams.js`, `core/src/routes/units.js`, tests visibility/leak | Dữ liệu Điều hành chỉ thuộc TCKT; INSERT activities/teams luôn gắn `unit_id`; gỡ membership TCKT tự động xóa `user_teams` liên quan; BTV không thấy Điều hành. | C48-B |
| 7. Giới hạn email thành viên đơn vị | R8 | `core/src/routes/units.js`, `core/tests/units.routes.test.js` | `GET /api/units/:id/members` ẩn trường email đối với member thường, chỉ trả cho vai trò quản trị được phép. | C48-B |
| 8. Chặn `dyc_engineer` tự cấp admin TCKT | R9 | `core/src/routes/units.js`, `core/tests/units.routes.test.js` | Chỉ `dyc_admin` mới được quản lý membership đơn vị khác; `dyc_engineer` nhận 403 khi thao tác đơn vị khác. | C48-B |
| 9. Sửa tác dụng phụ PATCH user | #48 mục 10 | `core/src/routes/users.js`, `core/tests/users.test.js` | PATCH user không gửi `is_active` thì giữ nguyên trạng thái khóa; không gửi role thì không xóa `user_teams`. | C48-B |
| 10. Audit thao tác nhạy cảm | R10 | `core/src/routes/users.js`, `core/src/routes/teams.js`, `core/src/services/audit.js`, tests tương ứng | Thao tác ghi nhạy cảm (tạo/sửa/khóa user, đổi role) ghi audit row; đọc chéo đơn vị có audit; không ghi log cho mỗi polling request; không ghi secret/mật khẩu vào metadata. | C48-D |
| 11. Cleanup mã hóa/seed/comment/BOM | R11 | `core/src/units/catalog.js`, `core/src/routes/index.js`, `core/src/config/migrate.js`, tests migrate/catalog | Loại bỏ BOM, sửa encoding tiếng Việt của `weight_presets`, xóa comment thừa; không đổi hành vi. | Không đổi contract |
| 12. Scheduler nhắc hạn idempotent và kiểm kê #49 | R12 | `core/src/services/deadline-notifications.js`, `core/tests/services.deadline-notifications.test.js`, `core/tests/noti-sender.test.js` | Scheduler không gọi notifier lặp lại mỗi 15 phút nếu noti trong app đã có; múi giờ VN; loại trừ `review`/`done`/`cancelled`; retry có giới hạn; lập kiểm kê cho các mục còn lại của #49. | C49-A |

---

## Task 1 — Đồng bộ role tổ với membership TCKT (R1, G1)

**Mục tiêu:** Khôi phục hành vi đồng bộ hai chiều giữa `users.role` và `unit_memberships` (TCKT) cho cả 4 route trong `core/src/routes/teams.js`:
1. `POST /api/teams`: Tạo tổ mới (gắn `unit_id`, nếu gán trưởng tổ thì cập nhật role và membership).
2. `PATCH /api/teams/:id`: Đổi trưởng tổ (người cũ về member, người mới lên lead).
3. `POST /api/teams/:id/members`: Thêm thành viên vào tổ (nếu cờ `is_lead` thì đồng bộ role/membership).
4. `DELETE /api/teams/:id/members/:userId`: Xóa thành viên khỏi tổ (nếu là leader thì hạ role và đồng bộ membership).

**Files:**
- Modify: `core/src/routes/teams.js`
- Test: `core/tests/teams.mgmt.test.js`
- Docs: `docs/dev/phan-quyen.md`, `docs/dev/api.md`

**Thực hiện TDD:**
1. Viết bộ test hồi quy trong `core/tests/teams.mgmt.test.js` bao phủ đầy đủ cả 4 route nêu trên. Kiểm tra `users.role`, `unit_memberships.role`, và cờ `is_lead`/`is_vice_lead`.
2. Kiểm tra trường hợp: Người dùng đã bị chủ động gỡ membership TCKT thì khi thao tác tổ không được tự ý tái sinh membership nếu không hợp lệ.
3. Chạy test, xác nhận đỏ.
4. Cập nhật `core/src/routes/teams.js` gọi `syncTcktMembershipFromRole` và xử lý cờ leader nhất quán.
5. Chạy test mục tiêu xanh, chạy toàn bộ `cd core && npm test`.

---

## Task 2 — Chặn sửa/xóa user ngoài đơn vị và tránh membership tự hồi sinh (R2–R3)

**Mục tiêu:**
- Admin TCKT chỉ quản lý tài khoản có membership TCKT và không có quyền `platform_owner`.
- Tài khoản DYC / platform owner chỉ do DYC quản trị qua `routes/units.js`.
- Sửa user thông thường qua `routes/users.js` không được tự ý gọi `syncTcktMembershipFromRole` để tái sinh membership TCKT cho tài khoản đã bị chủ động gỡ.
- `/api/people` chỉ trả về danh sách người thuộc TCKT cho admin TCKT.

**Files:** `core/src/policies/access.js`, `core/src/routes/users.js`, `core/src/units/memberships.js`, `core/tests/users.test.js`, `core/tests/units.leak.test.js`.

---

## Task 3 — Không cho user tự đổi email định danh (R4)

**Mục tiêu:**
- Endpoint `PATCH /api/account` từ chối nếu request chứa field `email` khác với email hiện tại: trả HTTP 403 Forbidden.
- Frontend legacy chuyển ô nhập email sang trạng thái `readonly` / `disabled`.
- Ngăn chặn triệt để nguy cơ chiếm trước email trong allowlist DYC hoặc email HUST của người khác.

**Files:** `core/src/routes/system.js`, `core/tests/account.test.js`, `core/public/` (UI account).

---

## Task 4 — Ngắt routes directives/submissions chưa hoàn thiện khỏi router (R5)

**Mục tiêu:**
- Theo `SPEC-PILOT-001 §9.1`, ngắt mount router `directives` và `submissions` khỏi `core/src/routes/index.js`.
- Client gọi vào các endpoint này nhận HTTP 404 Not Found.
- Giữ nguyên mã nguồn file và các test unit độc lập trong repo để hoàn thiện trong GĐ1.

**Files:** `core/src/routes/index.js`, `core/tests/routes.mount.test.js`.

---

## Task 5 — Hiệu lực khóa/hạ quyền ngay, session regeneration và quyền session (R6)

**Mục tiêu:**
- Khi user bị khóa (`is_active = 0`) hoặc hạ quyền, request tiếp theo gửi bằng session cũ bị chặn ngay lập tức (HTTP 401/403). Middleware `auth.js` / `unit-context.js` kiểm tra trạng thái actor từ DB.
- Khi đăng nhập thành công (`POST /api/login`), bắt buộc gọi `req.session.regenerate()` trước khi ghi nhận user vào session để chống session fixation.
- Mọi kiểm tra phân quyền thay vì đọc `req.session.user` phải đọc từ `req.actor` / `req.unitRole` (tuân thủ INV-AUTH-001).
- `/api/session` phản ánh đúng quyền ghi thực tế: Với DYC truy cập module Điều hành, session phải trả cờ ghi là `false` (vì bị `legacy-gate` chặn write) để frontend không hiển thị các nút thao tác gây lỗi 403.

**Files:** `core/src/middleware/auth.js`, `core/src/middleware/unit-context.js`, `core/src/routes/system.js`, `core/src/routes/activities.js`, `core/tests/auth.session.test.js`.

---

## Task 6 — Scope Điều hành chỉ dành cho TCKT và dọn `user_teams` (R7)

**Mục tiêu:**
- Pilot Điều hành chỉ phục vụ TCKT: Các truy vấn `activities`, `tasks`, `documents`, `reports`, `bootstrap` đều được đóng khung theo đơn vị TCKT (`unit_id = 1`).
- Khi tạo bản ghi mới (`INSERT activities`, `INSERT teams`), bắt buộc ghi nhận `unit_id` của TCKT thay vì để fallback ngẫu nhiên.
- Khi gỡ membership TCKT của một user (`DELETE /api/units/:id/members/:userId`), bắt buộc xóa các bản ghi liên quan trong `user_teams` của user đó để tránh rò rỉ quyền xem qua tổ.

**Files:** `core/src/policies/access.js`, `core/src/routes/activities.js`, `core/src/routes/teams.js`, `core/src/routes/documents.js`, `core/src/routes/system.js`, `core/src/routes/units.js`, `core/src/units/catalog.js`, `core/tests/units.visibility.test.js`.

---

## Task 7 — Không lộ email qua danh sách thành viên đơn vị (R8)

**Mục tiêu:**
- `GET /api/units/:id/members`: Chỉ trả về trường `email` nếu người gọi có vai trò quản trị đơn vị (`admin`, `lead`) hoặc DYC.
- Đối với thành viên thông thường (`member`), trường `email` bị ẩn (loại bỏ khỏi JSON response).

**Files:** `core/src/routes/units.js`, `core/tests/units.routes.test.js`.

---

## Task 8 — Ngăn `dyc_engineer` tự nâng quyền TCKT (R9)

**Mục tiêu:**
- Chỉ `dyc_admin` mới có quyền quản trị và phân bổ membership của đơn vị khác.
- `dyc_engineer` chỉ có quyền kỹ thuật và không được tự thêm mình hoặc thay đổi role của bản thân/người khác trong TCKT (HTTP 403).

**Files:** `core/src/routes/units.js`, `core/tests/units.routes.test.js`.

---

## Task 9 — Sửa tác dụng phụ PATCH user (issue #48 mục 10)

**Mục tiêu:**
- Trong `PATCH /api/users/:id`, nếu payload không chứa trường `is_active` thì giữ nguyên giá trị hiện tại trong DB, không được tự động mở khóa tài khoản đang bị khóa.
- Nếu không gửi thay đổi về team/role, không được tự ý xóa hoặc thay đổi `user_teams`.

**Files:** `core/src/routes/users.js`, `core/tests/users.test.js`.

---

## Task 10 — Audit thao tác nhạy cảm Điều hành (R10)

**Mục tiêu:**
- Ghi bản ghi vào `audit_logs` khi thực hiện các thao tác ghi nhạy cảm: tạo user, sửa user, khóa/mở khóa user, đổi mật khẩu user, phân quyền/gỡ trưởng tổ, thêm/xóa thành viên tổ.
- Ghi audit log khi DYC đọc dữ liệu Điều hành (tuân thủ INV-AUDIT-001).
- Tránh ghi audit log cho các request polling định kỳ không cần thiết.
- Tuyệt đối không ghi mật khẩu, token hoặc thông tin nhạy cảm vào cột `metadata`.

**Files:** `core/src/routes/users.js`, `core/src/routes/teams.js`, `core/src/middleware/legacy-gate.js`, `core/src/services/audit.js`, `core/tests/audit.test.js`.

---

## Task 11 — Dọn lỗi mã hóa/nhánh chết/BOM và seed fresh install (R11)

**Mục tiêu:**
- Loại bỏ BOM ở đầu file `core/src/units/catalog.js` và `core/src/config/migrate.js`.
- Sửa lỗi mã hóa tiếng Việt của seed `weight_presets` trong migration để cài đặt mới hiển thị đúng text tiếng Việt.
- Dọn dẹp câu lệnh `return` thừa và chú thích tạm.

**Files:** `core/src/units/catalog.js`, `core/src/routes/index.js`, `core/src/config/migrate.js`.

---

## Task 12 — Scheduler nhắc hạn idempotent và kiểm kê #49 (R12)

**Mục tiêu:**
1. **Sửa R12 (Core)**:
   - Sửa `core/src/services/deadline-notifications.js` để kiểm tra sự tồn tại của thông báo trong bảng `notifications`. Nếu thông báo đã tồn tại trong app với cùng `sourceKey`, không gọi lặp lại `notifier.notify` vô hạn mỗi 15 phút.
   - Chuẩn hóa việc so sánh hạn chót theo múi giờ Việt Nam (`Asia/Ho_Chi_Minh`), không cắt chuỗi ISO UTC (tuân thủ bất biến #7).
   - Bỏ qua các task có trạng thái `review`, `done`, `cancelled`.
   - Cơ chế retry có giới hạn cho các lỗi mạng tạm thời khi gọi sang Noti service.
2. **Kiểm kê độc lập phần còn lại của issue #49**:
   - Phân loại rõ ràng các mục chưa hoàn thiện trong #49:
     - Mục 1: Tính toán cửa sổ nhắc hạn chính xác (24h/4h) không gửi vào nửa đêm (Điều kiện trước khi bật email thật).
     - Mục 2: Không gửi thông báo cho task ở trạng thái review (Đã xử lý trong R12).
     - Mục 3: Lọc không gửi thông báo cho chính người thực hiện thao tác (Self-notification) (Điều kiện trước khi bật email thật).
     - Mục 4: Bỏ qua thành viên/lead đã bị vô hiệu hóa `is_active = 0` (Điều kiện trước khi bật email thật).
     - Mục 5: Gửi thông báo cho `event_lead` khi tổ chưa có lead (Backlog).
     - Mục 6: Validation định dạng email HUST/RFC khi tạo tài khoản để Noti không trả 400 (Điều kiện trước khi bật email thật).
     - Mục 7: Bổ sung outbox bền vững trong MySQL nếu Noti service gặp sự cố (Backlog GĐ2).
     - Mục 8: Dedupe key không bị purge sau 90 ngày; xử lý link khi đề án bị từ chối; cắt ngắn feedback dưới 64KB (Backlog).
     - Mục bên trong Noti: `starttls` certificate validation, timeout MSAL/Graph/SMTP, allowlist chặn gửi nhầm, giới hạn request size (Backlog Noti service).
   - **Tuyệt đối không đóng issue #49 khi mới chỉ hoàn thành R12**.

**Files:** `core/src/services/deadline-notifications.js`, `core/tests/services.deadline-notifications.test.js`, `core/tests/noti-sender.test.js`.

---

## Lộ trình phát hành tổng thể

| Giai đoạn | Nội dung | Tiêu chí hoàn thành |
|---|---|---|
| 1. Release Blocker | Task 1 (R1) theo C48-A | Test cả 4 route team xanh, PR vào `staging` -> Đạt G1. |
| 2. Release Docs & Runbook | PLAN-REL-003 Tasks 1 & 3 | PB-DEP-001 cập nhật -> Đạt G2; Runbook chuẩn hóa -> Đạt G4. |
| 3. Hotfix Bảo mật | #54 & #55 | Hotfix seed CTD (#54) và PR gỡ dump trên main (#55). |
| 4. Triển khai Core & Infra Pilot | Tasks 2–10 Core, Tasks 1–8 Infra | Nhóm B hoàn tất, test suite xanh, CI staging xanh -> Đạt G5. |
| 5. Kiểm tra & Bảng kiểm cuối | Verification & Smoke | Hoàn tất bảng kiểm phát hành, trình phê duyệt merge `staging → main` (G6). |

## Kiểm chứng toàn plan và tiêu chí đóng

Trước khi hoàn tất plan:

```bash
cd core && npm test
cd ../services/ctd-api/backend && .venv/bin/pytest
npm run test:tools
npm run docs:index
npm run docs:check -- --base origin/staging
npm run docs:check -- --base origin/main
```

## Lịch sử phiên bản

| Version | Ngày | Thay đổi | Người |
|---|---|---|---|
| 1.0 | 2026-10-03 | Bản đầu: task, test, tài liệu, cổng quyết định và lộ trình cho R1–R12 của SPEC-REL-001 | DYC |
| 1.1 | 2026-10-03 | Cập nhật theo quyết định văn bản #48/#49; bổ sung chi tiết test 4 route team, /api/session, is_lead, unit_id, user_teams sau khi gỡ membership, rate-limit audit GET; lập kiểm kê độc lập cho #49 | DYC |
