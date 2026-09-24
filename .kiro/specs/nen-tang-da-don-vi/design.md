> Nguồn chính của thiết kế từ nay. Bản snapshot lúc brainstorm (2026-09-23) ở `docs/superpowers/specs/2026-09-23-nen-tang-da-don-vi-design.md`; không sửa bản đó nữa.

# Thiết kế: Nền tảng đa đơn vị Đoàn Đại học (Core Platform + Module)

- **Ngày:** 2026-09-23
- **Phạm vi:** toàn bộ TCKT Activity Hub (repo `tckt-activity-hub`) và tích hợp module Công tác Đảng (repo `ctd`)
- **Thay thế một phần:** mục B (RBAC) và mục I (lộ trình) của `TCKT_REQUIREMENTS_SPEC.md`. Các mục nghiệp vụ còn lại của tài liệu đó (luồng đề án, task, nghiệm thu, thông báo…) vẫn giữ hiệu lực, nay thuộc về module Điều hành.

---

## 1. Bối cảnh và quyết định đã chốt

Ban đầu, Hub được thiết kế cho **nội bộ một ban** là Ban Tổ chức – Kiểm tra (TCKT). Sau đó có thêm ba yêu cầu mới:

1. **BTV** (Ban Thường vụ) cần giám sát, giao việc và xem báo cáo của TCKT. BTV được coi như **một đơn vị khác**: chỉ thấy những gì mình giao hoặc những gì được Trình lên.
2. **DYC** là đơn vị chủ quản, xây dựng và vận hành hệ thống. DYC độc lập với cơ cấu Đoàn và về sau sẽ khóa một số setting chỉ DYC được sửa.
3. **Công tác Đảng (CTD)**, hệ thống xét duyệt hồ sơ Đảng đã có sẵn (FastAPI + PostgreSQL), sẽ được đưa vào Hub thành một tab. Tab này hiển thị khác nhau tùy role, và sinh viên không thấy tab.

Các quyết định đã chốt trong buổi brainstorm:

| # | Quyết định |
|---|---|
| D1 | Thiết kế **đa đơn vị ngay từ GĐ1**. GĐ1 chỉ bật BTV, TCKT, DYC và các đơn vị dùng CTD |
| D2 | Mức xem liên đơn vị **cấu hình được trong Setting**, gồm 3 mức cố định (`summary` / `tasks_readonly` / `full_readonly`), cộng thêm cơ chế **Trình** cho từng mục |
| D3 | Mặc định BTV → TCKT = `summary` |
| D4 | DYC là **admin global**: toàn quyền truy cập mọi dữ liệu nghiệp vụ (kể cả CTD). Phân cấp quyền xem nội bộ trong DYC để sau, chưa chốt ở GĐ1 |
| D5 | Kiến trúc **Core Platform + các module backend độc lập**, mỗi nhóm dev phụ trách một module |
| D6 | **Một frontend chung duy nhất** (React + TypeScript + Vite), chia thư mục theo module. Không dùng iframe, không dùng micro-frontend |
| D7 | Backend CTD giữ nguyên là service riêng (FastAPI/Postgres) và nối vào Core qua JWT bridge |
| D8 | Tiêu chí tách module: đạt ≥2 trong 3 tiêu chí (xem §4.3) |
| D9 | **Không có GĐ0.** Các việc vận hành đã được nhận diện được ghi vào §11 như rủi ro đã chấp nhận |

## 2. Cơ cấu tổ chức

```
[DYC] ─ chủ quản nền tảng (độc lập, ngoài cây Đoàn)

Đoàn Đại học
├── Ban Thường vụ (BTV)
├── Văn phòng Đoàn (VP Đoàn)
├── Các Ban chuyên môn
│   ├── Ban Tổ chức – Kiểm tra (TCKT)
│   └── Các ban khác                      (GĐ3)
├── Chi bộ                                (quan sát hồ sơ Đảng)
└── Đoàn trường / Liên chi đoàn (ĐT/LCĐ)  (chung một nhóm role)
```

| `kind` | Đơn vị | Role trong đơn vị |
|---|---|---|
| `platform_owner` | DYC | `dyc_admin`, `dyc_engineer` |
| `standing_committee` | BTV | `btv_lead`, `btv_member` |
| `department` | TCKT (các ban khác ở GĐ3) | `admin`, `vice_admin`, `leader`, `vice_leader`, `member` (giữ nguyên 5 role cũ) |
| `office` | VP Đoàn | `officer` |
| `party_cell` | Chi bộ | `observer` |
| `grassroots` | ĐT/LCĐ | `officer` |

Mỗi người có thể thuộc nhiều đơn vị. Role gắn với **từng membership**, không gắn với user.

## 3. Kiến trúc tổng thể

```
┌──────────── Frontend chung (web/, React+TS+Vite) ────────────┐
│ Shell: đăng nhập · chuyển đơn vị · menu theo manifest ·       │
│        chuông thông báo · bộ component dùng chung             │
│ modules/dieu-hanh/     modules/ctd/     modules/<sau này>/     │
└───────────────────────────────┬──────────────────────────────┘
                                │ cookie session (cùng domain)
┌──────────── Core Platform (Node/Express, MySQL) ─────────────┐
│ Danh tính · Đơn vị · Membership · Mức xem · Setting + khóa    │
│ Audit · Thông báo (Rule Engine sẵn có) · Module registry      │
│ Gateway /m/<module>/api/v1/*  → ký JWT bridge                 │
└──────────┬──────────────────────────────────┬────────────────┘
           │ (in-process ở GĐ1)               │ HTTP nội bộ Docker
┌──────────▼───────────┐            ┌─────────▼──────────────┐
│ Module Điều hành      │            │ Module CTD              │
│ (Node, cùng MySQL)    │            │ (FastAPI, Postgres)     │
└───────────────────────┘            └─────────────────────────┘
```

- **Module Điều hành trong GĐ1 nằm chung process và chung database với Core**, vì đó là code Hub hiện tại. Dù vậy, nó vẫn phải tuân thủ hợp đồng module (có manifest, đọc quyền qua Core, có ranh giới thư mục rõ ràng). Chỉ tách ra service riêng khi có lý do thật.
- **CTD là service riêng**, và gateway gọi sang qua mạng Docker nội bộ (`http://ctd-app:8000`). Trình duyệt không bao giờ gọi trực tiếp đến CTD cho phần quản lý.
- Trang nộp hồ sơ của sinh viên vẫn nằm ở `ctd-hoso.duckdns.org` (SPA cũ của CTD) cho đến GĐ3.

## 4. Hợp đồng module và phân nhóm use case

### 4.1 Hợp đồng: mọi module phải tuân thủ

1. **Manifest:** khai báo `id`, `name`, các mục menu, và danh sách `(unit_kind, role)` được thấy từng mục menu. Shell chỉ hiện những mục mà người dùng có membership phù hợp *và* đơn vị của họ đã bật module đó (`unit_modules`).
2. **Xác thực:** chỉ chấp nhận JWT bridge do Core ký. Module không lưu mật khẩu và không có luồng đăng nhập riêng cho cán bộ.
3. **API:** đi qua gateway với tiền tố `/m/<module>/api/v1/*`. Thay đổi phá vỡ tương thích thì phải lên `v2`.
4. **Sự kiện:** module gửi event về Core (`POST /internal/events`, dùng chữ ký bridge) để Core lo thông báo và audit. Module không tự gửi email cho người dùng.
5. **Summary:** endpoint `GET /summary` trả số liệu tổng hợp để dùng cho dashboard cấp trên. Endpoint này không được chứa dữ liệu cá nhân.

### 4.2 JWT bridge

- Ký bằng HS256 với secret riêng `HUB_BRIDGE_SECRET`, **không dùng lại** `CTD_JWT_SECRET`. TTL là 60 giây, và mỗi request qua gateway được ký một token mới.
- Claims gồm: `sub` (id user trong Core), `email`, `name`, `unit_id` và `unit_kind` của đơn vị đang chọn, `role` trong đơn vị đó, `aud` (id module), `iat`, `exp`.
- Phía module sẽ xác minh chữ ký, `aud` và `exp`, rồi tìm hoặc tạo user cục bộ theo `sub` (JIT) và cập nhật tên, đơn vị, role mỗi lần.

### 4.3 Tiêu chí tách module

Một nhóm use case nên thành module riêng khi đạt ≥2/3:

- (a) Có nhóm người dùng chỉ dùng riêng nhóm này.
- (b) Dữ liệu ít phải JOIN với phần khác.
- (c) Có vòng đời hoặc quy trình riêng.

### 4.4 Phân nhóm hiện tại (BA sẽ hoàn thiện)

| Nhóm | Use case | Người dùng | Quyết định |
|---|---|---|---|
| **Core** | Đăng nhập, tài khoản, đơn vị, membership, mức xem, setting + khóa, thông báo, audit | Tất cả, DYC quản trị | Lõi dùng chung |
| **Điều hành** | Hoạt động, đề án, task/Kanban, nghiệm thu, self-log, giao việc liên đơn vị, Trình, trực ban/họp ban, KPI, báo cáo, kho tài liệu | TCKT, BTV (ĐT/LCĐ từ GĐ3) | Gộp chung vì các phần dùng đan xen nhau |
| **CTD** | Nộp hồ sơ, kiểm tra, họp xét, chuyển Chi bộ | SV, ĐT/LCĐ, TCKT, VP Đoàn, Chi bộ | Tách riêng (đạt cả 3 tiêu chí) |
| *Ứng viên* | Kiểm tra cơ sở, thi đua khen thưởng, chuyển sinh hoạt, đơn thư | — | Đánh giá khi có yêu cầu thật |

Giao việc và Trình đặt trong Điều hành. Chỉ đưa lên Core khi có module thứ hai thật sự cần.

## 5. Mô hình dữ liệu (Core + Điều hành, MySQL)

### 5.1 Bảng mới

| Bảng | Cột chính | Ghi chú |
|---|---|---|
| `org_units` | `id`, `code` UNIQUE, `name`, `kind`, `parent_id` NULL, `is_active` | Seed: DYC, BTV, TCKT, VP Đoàn, Chi bộ, và các ĐT/LCĐ |
| `unit_memberships` | `user_id`, `unit_id`, `role`, PK(`user_id`,`unit_id`) | Role được kiểm tra theo `kind` của đơn vị |
| `unit_modules` | `unit_id`, `module_id`, PK | TCKT: `dieu-hanh`, `ctd`. BTV: `dieu-hanh`, `ctd`. VP Đoàn, Chi bộ, ĐT/LCĐ: `ctd` |
| `unit_visibility_policies` | `viewer_unit_id`, `owner_unit_id`, `level` ENUM, `updated_by`, `updated_at` | Seed: BTV→TCKT = `summary` |
| `setting_locks` | `setting_key`, `unit_id` NULL, `locked_by`, `reason`, `created_at` | `unit_id` NULL nghĩa là khóa cho mọi đơn vị |
| `audit_logs` | `id`, `actor_id`, `actor_unit_id`, `action`, `target_type`, `target_id`, `owner_unit_id`, `meta` JSON, `created_at` | GĐ1: ghi truy cập liên đơn vị, thay đổi mức xem, khóa setting, membership |
| `directives` | `id`, `from_unit_id`, `to_unit_id`, `title`, `body`, `deadline`, `status`, `created_by`, `owner_user_id`, `acknowledged_at`, `created_at`, `updated_at` | `status`: `sent`, `acknowledged`, `in_progress`, `submitted`, `accepted`, `revision_requested` |
| `submissions` | `id`, `from_unit_id`, `to_unit_id`, `source_type`, `source_id`, `directive_id` NULL, `note`, `submitted_by`, `response` ENUM NULL, `response_note`, `responded_by`, `responded_at`, `withdrawn_at`, `created_at` | `source_type`: `activity`, `ops_log`, `report`. `response`: `seen`, `revision_requested`, `accepted` |
| `ops_logs` | `id`, `unit_id`, `type` ENUM(`duty_shift`,`meeting`,`other`), `title`, `started_at`, `ended_at`, `location`, `content`, `recorded_by`, `created_at` | |
| `ops_log_attendance` | `ops_log_id`, `user_id`, `status` ENUM(`present`,`late`,`absent_excused`,`absent`), `note` | |

### 5.2 Thay đổi bảng cũ

- `teams.unit_id` và `activities.unit_id`: NOT NULL, có index. Dữ liệu cũ được gán về TCKT.
- `activities.directive_id`: NULL, FK tới `directives`.
- `users.role`: **giữ trong GĐ1** như bản sao role TCKT, để các test cũ vẫn chạy. Code mới đọc từ `unit_memberships`. Cột này bị xóa ở GĐ2.
- `users.is_devops` và `DEVOPS_EMAILS`: user có `is_devops=1` được chuyển thành membership DYC `dyc_engineer`. Email trong `DEVOPS_EMAILS` sẽ tự được đảm bảo có membership `dyc_admin` mỗi lần khởi động (bootstrap chống khóa ngoài). Cột `is_devops` bị xóa sau khi migrate xong.

### 5.3 Migration

Viết một migration duy nhất, idempotent, chạy qua `npm run migrate`:

1. Tạo các bảng mới.
2. Seed các đơn vị.
3. Gán `unit_id` = TCKT cho `teams`/`activities`.
4. Tạo membership TCKT từ `users.role`.
5. Chuyển `is_devops` sang membership DYC.
6. Seed policy BTV→TCKT.

## 6. Phân quyền và phạm vi xem

### 6.1 Ngữ cảnh đơn vị

- Session lưu `current_unit_id`. Middleware `loadUnitContext` gắn vào request: `req.unit`, `req.unitRole`, `req.memberships`.
- Nếu `current_unit_id` không thuộc membership của user thì tự chuyển về membership đầu tiên. User không có membership nào thì trả 403.
- Các hàm trong `src/policies/access.js` (`isExecutive`, `leadsTeam`, `activityScope`, …) được chuyển sang dùng `req.unitRole` và lọc theo `unit_id`.

### 6.2 `scopeFor(viewer, resourceType)`

Đây là hàm duy nhất sinh điều kiện lọc cho mọi truy vấn đọc. Route không được tự viết điều kiện riêng.

| Người xem so với đơn vị sở hữu | Quy tắc |
|---|---|
| DYC (`platform_owner`) | Admin global: đọc được mọi tài nguyên của mọi đơn vị, không giới hạn theo `level`. Mỗi lượt đọc liên đơn vị vẫn ghi `audit_logs` như đơn vị khác |
| Cùng đơn vị | RBAC nội bộ, giữ nguyên như hiện nay |
| Khác đơn vị, có policy | Các loại tài nguyên mà `level` cho phép, **cộng** mục đã được Trình tới đơn vị mình (chưa rút lại), **cộng** directive có `from_unit` hoặc `to_unit` là mình |
| Khác đơn vị, không có policy | Chỉ directive và submission liên quan trực tiếp. Còn lại thì không thấy gì (mặc định từ chối) |

| `level` | Tài nguyên được đọc |
|---|---|
| `summary` | `directives`, `submissions`, `activities` (chỉ dạng tổng quan) |
| `tasks_readonly` | + `tasks`, `task_assignees` |
| `full_readonly` | + `task_checklists`, `updates`, `task_attachments`, `ops_logs`, `ops_log_attendance` |

**Dạng tổng quan của activity** gồm các trường: `id`, `title`, `status`, `priority`, `start_date`, `deadline`, `progress_percent` (tính từ task), `event_lead` (tên), `directive_id`. Việc lọc trường được thực hiện trong serializer phía server (`toSummaryView`). Các trường không có trong danh sách này không bao giờ được đưa vào response.

### 6.3 Quyền ghi liên đơn vị

Người ngoài đơn vị chỉ được đọc. Các ngoại lệ:

- BTV (`btv_lead`, `btv_member`) được tạo directive, trả lời submission, chấp nhận hoặc yêu cầu bổ sung directive.
- TCKT (`admin`, `vice_admin`) được tiếp nhận directive, cử `owner_user_id` và Trình.

Mọi thao tác ghi khác từ đơn vị ngoài đều trả 403.

### 6.4 Cấu hình mức xem

Cấu hình nằm ở trang **Setting → Phạm vi xem liên đơn vị**. Chỉ `admin`/`vice_admin` của **đơn vị sở hữu dữ liệu** được sửa, và mỗi lần sửa đều ghi audit. Nếu DYC khóa key `visibility.<owner>.<viewer>` thì trang này chuyển sang chỉ đọc.

### 6.5 Setting và khóa DYC

Mỗi setting có thuộc tính `managed_by`:

- `platform`: SMTP, cron jobs, đơn vị, membership ngoài phạm vi đơn vị mình, danh mục module. Chỉ DYC sửa được.
- `unit`: email templates, email rules, mức xem, weight presets. Admin của đơn vị sửa được, trừ khi có dòng trong `setting_locks`.

Cơ chế khóa phải được áp ở cả server (trả 403 kèm lý do) và UI (hiện 🔒 kèm lý do).

## 7. Luồng nghiệp vụ liên đơn vị (module Điều hành)

### 7.1 Giao việc (directive)

```
sent ─(TCKT tiếp nhận + cử owner)→ acknowledged ─(tạo hoạt động gắn directive_id)→ in_progress
in_progress ─(Trình kết quả = submission gắn directive)→ submitted
submitted ─(BTV chấp nhận)→ accepted
submitted ─(BTV yêu cầu bổ sung, bắt buộc lý do)→ revision_requested → in_progress
```

- `progress_percent` của directive được tính theo công thức: task `done` / tổng số task (trừ `cancelled`) của mọi hoạt động gắn với directive đó.
- Nhắc việc qua Cron Runner có sẵn: directive còn ở `sent` quá 48 giờ thì báo cho admin TCKT. Directive quá `deadline` mà chưa `accepted` thì báo cho cả hai bên.

### 7.2 Trình (submission)

- Nút **[Trình lên…]** có trên hoạt động, biên bản ops_log và báo cáo. Người dùng chọn đơn vị nhận và có thể ghi chú.
- GĐ1 cho đơn vị nhận xem **bản live** của mục được trình. Từ GĐ2 chuyển sang xem snapshot.
- Được rút lại khi `response` còn NULL.

### 7.3 Nhật ký vận hành

- Người ghi: `leader` trở lên, hoặc người được chỉ định trong ops_log.
- Đơn vị ngoài chỉ thấy nhật ký khi đang ở mức `full_readonly`, hoặc khi nhật ký đó đã được Trình.
- Dữ liệu điểm danh được đưa vào thống kê cá nhân nội bộ.

### 7.4 Sự kiện thông báo mới (đăng ký vào Rule Engine)

`directive.created`, `directive.acknowledged`, `directive.overdue`, `directive.unacknowledged_48h`, `submission.created`, `submission.responded`, `ops_log.absent_recorded`, cùng các event từ CTD (`ctd.case.*`).

## 8. Tích hợp CTD

### 8.1 Thay đổi phía CTD

1. `backend/app/deps.py`: `current_user` chấp nhận thêm JWT bridge (secret `HUB_BRIDGE_SECRET`, `aud=ctd`), tìm hoặc tạo `app_user` theo `hub_user_id` (cột mới), và đồng bộ `unit` theo `unit_id` + `kind` của Core (bảng `unit` thêm cột `hub_unit_id`).
2. Ánh xạ role:

   | Core (kind, role) | CTD role |
   |---|---|
   | `grassroots`, `officer` | `can_bo_don_vi` |
   | `department` TCKT, role có quyền CTD (xem §13, câu 1) | `tckt` |
   | `office`, `officer` | `vp_doan` |
   | `party_cell`, `observer` | `chi_bo` |
   | `standing_committee`, * | *(không có role CTD, chỉ gọi `/summary`)* |
   | `platform_owner`, * | `quan_tri` (admin global theo D4 — xem mọi hồ sơ). Phân cấp quyền xem trong nội bộ DYC để thiết kế sau |

3. Tiền tố API `/api/v1/*`, và phát hành OpenAPI làm hợp đồng.
4. Endpoint `GET /api/v1/summary`: số hồ sơ theo trạng thái, theo đơn vị, số hồ sơ trễ SLA. Endpoint này thay cho dữ liệu giả trong `frontend/src/data/mock.ts`.
5. Gửi event trạng thái hồ sơ về Core, tương ứng outbox hiện có.
6. Luồng đăng nhập OTP/mật khẩu hiện tại **được giữ lại cho sinh viên** (trang nộp ở `ctd-hoso`).

### 8.2 Tab "Công tác Đảng" theo role

| Người dùng | Hiển thị |
|---|---|
| Cán bộ ĐT/LCĐ | Hộp xử lý hồ sơ của đơn vị mình |
| TCKT (có quyền CTD) | Hàng chờ `tckt_checking` + toàn cảnh |
| VP Đoàn | Hàng chờ `vp_checking` |
| Chi bộ | Hồ sơ `forwarded`, chỉ đọc |
| BTV | Chỉ dashboard số liệu từ `/summary` |
| DYC | Admin global — thấy toàn bộ hồ sơ mọi đơn vị (role `quan_tri`), kể cả quản lý danh mục giấy tờ |
| Sinh viên | Không có tab (dùng trang nộp riêng) |

### 8.3 Frontend

Chuyển các màn hình `features/canbo/*` và `features/baocao/*` của CTD sang `web/src/modules/ctd/`. Sau khi chuyển xong, phần frontend quản lý trong repo CTD được gỡ bỏ. Chỉ giữ lại phần sinh viên (`features/hoso/*`, `features/auth/*`) cho đến GĐ3.

## 9. Frontend chung

- Thư mục `web/` nằm trong repo Hub, dùng React 18 + TypeScript + Vite. Kết quả build được Core phục vụ như file tĩnh.
- Cấu trúc thư mục:

  ```
  web/src/
    shell/        # layout, đăng nhập, chuyển đơn vị, menu, thông báo
    ui/           # component dùng chung (kế thừa design system của CTD)
    lib/          # api client, auth context, manifest loader
    modules/
      dieu-hanh/
      ctd/
  ```

- File `CODEOWNERS` phân quyền review theo thư mục.
- **Chuyển giao:** shell mới chạy ở `/app` song song với `public/` cũ ở `/`. Khi đạt tương đương tính năng thì chuyển `/` sang shell và gỡ `public/app.js` (GĐ2).
- Mobile web là yêu cầu bắt buộc, nhất là các màn "Việc hôm nay" và nộp nghiệm thu.

## 10. Lộ trình

### GĐ1: Nền tảng + BTV/TCKT nắm được hoạt động + tab CTD

| Nhóm | Việc | Phụ thuộc |
|---|---|---|
| Core | ① Migration §5.3 ② `loadUnitContext` + refactor `access.js` ③ DYC + `setting_locks` + `managed_by` ④ `audit_logs` ⑤ Module registry + manifest + `unit_modules` ⑥ Gateway + JWT bridge + `/internal/events` ⑦ Shell React (`web/`) + bộ UI dùng chung ⑧ Quản lý đơn vị và membership (DYC + admin đơn vị) | Không phụ thuộc. Đi đầu |
| Điều hành | Backend: `directives`, `submissions`, `unit_visibility_policies`, `scopeFor` + serializer, `ops_logs`, các event mới. Frontend: chuyển Việc hôm nay, Hoạt động, Kanban, Setting sang shell. Làm màn BTV (Việc đã giao, Hồ sơ được trình, Dashboard) và màn TCKT (Việc cấp trên giao, Đã trình, Nhật ký) | Backend sau ①②. Frontend sau ⑦ |
| CTD | §8.1 (1)–(5), chuyển màn hình sang `web/src/modules/ctd/` | Bridge sau ⑥. Màn hình sau ⑦ |

**Điều kiện hoàn thành GĐ1:**

- BTV giao việc và thấy tiến độ ở dạng tổng quan.
- TCKT tiếp nhận, xử lý và Trình lên.
- ĐT/LCĐ, VP Đoàn, Chi bộ và TCKT dùng được tab CTD trong Hub.
- BTV chỉ thấy số liệu CTD. DYC (admin global, D4) đọc được hồ sơ CTD, mỗi lượt đọc có ghi `audit_logs`. Sinh viên không thấy tab.
- Bộ test chống rò rỉ chạy xanh.
- Email thật và cron đã bật trước khi mở cho người dùng thật.

### GĐ2: Báo cáo và hoàn thiện

- Snapshot khi Trình. Báo cáo định kỳ tự sinh nháp (qua Cron + Rule Engine). Chỉ số tổng hợp cho cấp trên (ví dụ tỷ lệ tham gia trực ban).
- Gantt + cảnh báo trùng lịch. Xuất PDF/Excel. Kho tài liệu. Dashboard KPI.
- Break-glass cho DYC: xin quyền, đơn vị sở hữu duyệt, quyền tự hết hạn, có audit.
- Xóa `users.role` và `users.is_devops`. Gỡ frontend `public/` cũ.

### GĐ3: Mở rộng

- ĐT/LCĐ được bật module Điều hành. Giao việc một-nhiều và thu báo cáo hàng loạt.
- Bảo vệ dữ liệu kiểm tra: đơn vị bị kiểm tra không thấy ghi chú về mình trước khi kết luận được công bố.
- Các ban chuyên môn khác.
- Trang nộp hồ sơ sinh viên mới trong `web/` (ngoài shell quản lý).
- SSO Microsoft cho CTD và trang nộp hồ sơ sinh viên. (Core đã có đăng nhập Microsoft qua `/auth/microsoft`, cấu hình `AZURE_*` trong `core/src/config/environment.js`.)
- Xét các module mới theo §4.3.

## 11. Rủi ro đã chấp nhận (không có GĐ0)

| Rủi ro | Hiện trạng | Ghi chú |
|---|---|---|
| Backup database và volume làm tay | Runbook `infra` chỉ có lệnh chạy thủ công | Mất VM là mất dữ liệu kể từ lần backup tay gần nhất |
| Admin CTD dùng mật khẩu mặc định `Dev@123` | Được ghi trong `docs/BAN-GIAO-DEV-TEAM.md` của CTD | Nên đổi trước khi có dữ liệu thật |
| Email tắt ở cả hai app, CTD chưa có cron | `MAILER_DRIVER: console`, `EMAIL_NOTIFICATIONS_ENABLED: "false"` | Đã đưa vào điều kiện hoàn thành GĐ1 |
| Runbook ghi "TCKT has no DB migration tool" | Code đã có `npm run migrate` | Được xác minh ở bước ① của GĐ1 |
| Staging và production chung một VM 1 OCPU | — | Runbook đã có phương án tách VM production |

## 12. Kiểm thử

- **Theo module:** giữ các test hiện có (Hub `node --test`, CTD pytest). Mỗi thay đổi đi kèm test mới theo TDD.
- **Core:** test cho `scopeFor` theo từng mức × từng loại tài nguyên, test `loadUnitContext`, test khóa setting, và test bootstrap `DEVOPS_EMAILS`.
- **Chống rò rỉ (chặn merge):** duyệt mọi route GET đã đăng ký bằng tài khoản BTV ở mức `summary`. Assert response không chứa khóa nào ngoài danh sách tổng quan, và không chứa id task, checklist hay ops_log của TCKT. Một test khác kiểm tra DYC nhận 403 ở mọi endpoint nghiệp vụ.
- **Contract bridge:** phía Hub kiểm tra response của CTD theo OpenAPI v1. Phía CTD kiểm tra token hợp lệ, hết hạn, sai `aud` và sai chữ ký.
- **E2E (Playwright):** mỗi role (BTV, TCKT, ĐT/LCĐ, VP Đoàn, Chi bộ) chạy một luồng chính. Có thêm các ca phủ định: DYC, sinh viên.

## 13. Câu hỏi còn mở (không chặn GĐ1 bắt đầu)

1. ~~**Ai ở TCKT có quyền CTD?**~~ **Đã chốt 2026-09-23:** từ tổ phó trở lên, tức `vice_leader`, `leader`, `vice_admin`, `admin` của TCKT đều nhận role `tckt` bên CTD. `member` không có quyền CTD. Bỏ cơ chế team `ctd_reviewer`.
2. ~~**Role `quan_tri` của CTD**~~ **Đã chốt (D4 đảo ngược 2026-09-23):** DYC giờ là admin global nên nhận role `quan_tri` trực tiếp (xem toàn bộ hồ sơ, quản lý danh mục giấy tờ). `admin` TCKT vẫn giữ role `tckt` (hàng chờ + toàn cảnh), không cần thêm `quan_tri`.
3. **Tài khoản sinh viên** trong CTD tạm thời tách khỏi Core. Có cần đồng bộ hay không sẽ được quyết định ở GĐ3 cùng trang nộp mới. *(không đổi)*
4. ~~**Danh sách ĐT/LCĐ và cán bộ phụ trách thực tế**~~ **Đã chốt 2026-09-23:** GĐ1 seed dữ liệu đơn vị giả (đánh dấu rõ là giả). Thay bằng danh sách thật trước khi mở cho người dùng thật.
5. **Phân cấp quyền xem nội bộ DYC** (D4 mới): DYC full access ngay ở GĐ1, nhưng có cần giới hạn ngay một số DYC không xem hồ sơ CTD hay không, hay để tất cả DYC xem được hết cho đến khi thiết kế phân cấp? Mặc định tạm: tất cả membership DYC (`dyc_admin`, `dyc_engineer`) đều xem được hết, phân cấp chi tiết hơn để sau.
