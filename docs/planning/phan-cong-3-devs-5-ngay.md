---
doc_id: PLAN-TEAM-003
title: Phân công 3 developers — nền tảng đa đơn vị trong 5 ngày
version: 1.0
status: active
audience: [dev, ops]
owner: DYC
updated: 2026-09-27
related_code: [core/src/config/migrate-units.js, core/src/config/migrate.js, core/src/policies/access.js, core/src/middleware/auth.js, core/src/routes/**]
---

# Phân công 3 developers — nền tảng đa đơn vị trong 5 ngày

Tài liệu này hướng dẫn giao việc cho một nhóm 3 developers trong 5 ngày làm việc. Phạm vi là backend Core cho mô hình đa đơn vị và luồng BTV giao việc cho TCKT. Đây không phải kế hoạch triển khai CTD hoặc frontend.

## 1. Mục tiêu cuối ngày thứ 5

Nhóm có các PR review được vào `staging`, chứng minh được các kết quả sau:

1. Database hiện có được nâng cấp an toàn: dữ liệu TCKT cũ được gắn với đơn vị TCKT và mỗi user có membership TCKT tương ứng.
2. Quyền truy cập được tính theo đơn vị đang chọn và role của user trong membership đó.
3. Người có quyền ở BTV tạo được directive cho TCKT; TCKT tiếp nhận, gắn hoạt động, Trình kết quả; BTV phản hồi.
4. Kiểm tra quyền xác nhận BTV không đọc được chi tiết nội bộ TCKT ngoài mức `summary` mặc định.

Hoàn thành ở đây nghĩa là code, migration, tài liệu và test sẵn sàng để review/merge vào `staging`. Không đồng nghĩa với production deployment.

## 2. Tài liệu và quy ước làm căn cứ

Trước khi bắt đầu, cả nhóm đọc:

- [`docs/specs/nen-tang-da-don-vi-design.md`](../specs/nen-tang-da-don-vi-design.md), tập trung §5–§7.
- [`docs/specs/nen-tang-da-don-vi-requirements.md`](../specs/nen-tang-da-don-vi-requirements.md), tập trung yêu cầu 1–5 và 9–10.
- [`docs/ba/database-readme.md`](../ba/database-readme.md) và [`docs/ba/erd-multiunit.png`](../ba/erd-multiunit.png).
- [`docs/dev/quy-uoc-code.md`](../dev/quy-uoc-code.md), [`docs/dev/db-migration.md`](../dev/db-migration.md), và [`docs/dev/phan-quyen.md`](../dev/phan-quyen.md).

Nếu tài liệu này khác design spec, design spec là nguồn quyết định. Không tự thêm kiến trúc mới như `module_registry`, định kỳ đồng bộ user/unit sang CTD, hoặc đổi Core thành service khác trong phạm vi này.

## 3. Quy tắc phối hợp chung

- Mỗi developer sở hữu một workstream và một PR riêng. Mục tiêu merge theo thứ tự: migration → unit context/policy → directive/submission.
- Ngày 1 phải chốt schema/API contract chung trước khi mỗi người triển khai phần phụ thuộc.
- Không cùng sửa một file nếu chưa báo người sở hữu file. Developer 1 sở hữu `migrate-units.js`; Developer 2 sở hữu `access.js`/`auth.js`; Developer 3 sở hữu route directive/submission.
- Tạo nhánh từ `staging`, mở PR về `staging`, và không push thẳng lên `main`.
- Route mới dùng factory `createXRoutes(context)`, đăng ký trong `core/src/routes/index.js`, bọc handler bằng `asyncRoute`, và dùng SQL tham số hóa.
- Mọi quyết định quyền đọc phải thực thi ở server. Không lấy dữ liệu liên đơn vị rồi lọc ở frontend.
- Migration phải idempotent và chạy qua `npm run migrate`. Không sửa database môi trường bằng tay.
- Mỗi PR cập nhật tài liệu liên quan cùng PR. Không đưa secret hoặc dữ liệu cá nhân thật vào fixture/log.

## 4. Developer 1 — Migration và dữ liệu nền

### Mục tiêu

Hoàn thiện, đối chiếu và kiểm chứng migration đa đơn vị đang có; không viết lại từ đầu.

### Điểm bắt đầu

- `core/src/config/migrate-units.js` đã có DDL, seed và backfill phần lớn bảng đa đơn vị.
- `core/src/config/migrate.js` là entry point migration; xác nhận migration mới được gọi theo đúng pattern hiện có.
- Đối chiếu design spec §5.1–§5.3 và schema trong `core/db.sql`.

### Việc cần làm

1. Kiểm từng bảng/cột/index/FK so với design: `org_units`, `unit_memberships`, `unit_modules`, `unit_visibility_policies`, `setting_locks`, `audit_logs`, `directives`, `submissions`, `ops_logs`, `ops_log_attendance`.
2. Kiểm phần mở rộng `teams.unit_id`, `activities.unit_id`, `activities.directive_id`; dữ liệu cũ phải được gán về TCKT trước khi `unit_id` thành `NOT NULL`.
3. Kiểm backfill membership TCKT từ `users.role`, tránh trùng khi chạy lại.
4. Đối chiếu chuyển đổi `users.is_devops` và `DEVOPS_EMAILS` theo design spec §5.2. Nếu còn thiếu, bổ sung sao cho không khóa mất tài khoản vận hành.
5. Xác nhận seed BTV → TCKT có policy `summary`; seed module theo unit phải khớp spec và không tạo bản ghi trùng.
6. Kiểm migration khi chạy lần đầu, chạy lại, và khi dừng giữa chừng sau một bước DDL/backfill.
7. Viết/cập nhật migration tests bằng fixture DB thật của Core; không dùng database staging/production.

### Acceptance criteria

- Migration chạy trên database mới và database có dữ liệu TCKT hiện tại.
- Chạy lại không nhân đôi đơn vị, membership, module hoặc policy và không lỗi.
- Các `teams`/`activities` cũ có `unit_id` trỏ tới TCKT; user hiện tại có membership TCKT khớp role cũ.
- Có kiểm tra chuyển đổi DYC/DevOps theo design.
- PR nêu rõ giả định về schema cũ và kết quả kiểm tra.

### Không làm

- Không đổi tên các bảng/cột hiện hữu chỉ để làm sơ đồ đẹp hơn.
- Không xóa `users.role` trong giai đoạn này; spec giữ cột này như bản sao tương thích.
- Không làm thay phần policy của Developer 2.

## 5. Developer 2 — Unit context, authorization và scope

### Mục tiêu

Thiết lập ngữ cảnh đơn vị đang làm việc và nơi duy nhất xác định phạm vi dữ liệu liên đơn vị.

### Điểm bắt đầu

- `core/src/middleware/auth.js` hiện đọc role legacy từ session user.
- `core/src/policies/access.js` hiện có scope TCKT theo team/activity nhưng chưa có `scopeFor` đa đơn vị.
- Xem cách middleware/policy được truyền vào route context trong `core/src/routes/index.js`.

### Việc cần làm

1. Thêm `loadUnitContext` theo spec: lấy `current_unit_id` từ session, kiểm tra membership; nếu không hợp lệ thì chuyển về membership đầu tiên; user không có membership trả 403.
2. Đưa unit đang chọn, role trong unit và memberships vào context thống nhất cho request. Không suy role BTV/TCKT từ một role toàn cục duy nhất.
3. Thiết kế `scopeFor(viewer, resourceType)` trả điều kiện SQL và params an toàn, hoặc interface tương đương đã thống nhất với Developer 3.
4. Giữ RBAC nội bộ TCKT hoạt động; áp unit ownership cho các truy vấn activity/team thuộc phạm vi thay đổi.
5. Thực thi mức xem mặc định BTV → TCKT là `summary`, và giới hạn field trả về tại server serializer.
6. Cho phép đọc directive/submission liên quan trực tiếp theo spec dù không có visibility policy; từ chối unit không liên quan.
7. Ghi `audit_logs` cho các lượt đọc liên đơn vị cần audit và thay đổi membership/policy/setting lock thuộc scope này.
8. Thêm tests cho nhiều membership, unit context, `summary`, hai mức read-only cao hơn, unit không liên quan và DYC global audit.

### Acceptance criteria

- Quyền user được tính từ membership ở unit đang chọn.
- Tài khoản có nhiều membership chỉ dùng một unit context cho mỗi request.
- Ở `summary`, response BTV không chứa task/checklist/comment/attachment/ops log của TCKT.
- Đơn vị ngoài quan hệ không đọc được resource; DYC đọc global theo spec và có audit.
- Route trong phạm vi áp dụng policy ở server, không tự rải điều kiện unit riêng.

### Interface cần chốt với Developer 3

Ngày 1 thống nhất tên middleware, nơi đặt unit context (`req.unit`, `req.unitRole`, `req.memberships` theo spec), cách gọi scope, serializer summary và cách tạo audit log. Gửi ví dụ input/output trước khi Developer 3 khóa phần query.

## 6. Developer 3 — Directive và submission API

### Mục tiêu

Hoàn thành API backend tối thiểu cho BTV giao nhiệm vụ và TCKT báo cáo kết quả.

### Việc cần làm

1. Tạo route factory riêng cho directives và submissions, đăng ký trong `core/src/routes/index.js`.
2. Dùng bảng `directives` và `submissions` theo schema đã chốt với Developer 1; không tạo bảng báo cáo riêng nếu `submissions` đáp ứng thiết kế.
3. Triển khai luồng directive:
   - BTV `btv_lead`/`btv_member` tạo directive gửi TCKT → `sent`.
   - Admin/vice-admin TCKT tiếp nhận và gán `owner_user_id` → `acknowledged`.
   - TCKT gắn hoạt động qua `activities.directive_id` → `in_progress`.
   - TCKT Trình kết quả bằng submission gắn directive → `submitted`.
   - BTV chấp nhận → `accepted`, hoặc yêu cầu sửa với lý do bắt buộc → `revision_requested`.
4. Cho phép TCKT tiếp tục xử lý sau yêu cầu sửa và Trình lại. Cập nhật trạng thái bằng transaction/conditional update để hai request đồng thời không làm sai vòng đời.
5. Hỗ trợ submission cho loại nguồn trong spec (`activity`, `ops_log`, `report`), lưu đơn vị gửi/nhận, người Trình, ghi chú và directive tùy chọn.
6. Chỉ cho rút submission khi chưa có response; sau khi phản hồi thì từ chối rút.
7. `accepted` và `revision_requested` chỉ hợp lệ khi submission gắn directive; response phải lưu người phản hồi, nội dung và timestamp.
8. Gọi policy/scope của Developer 2 cho mọi thao tác đọc/ghi; không tự kiểm quyền bằng tên đơn vị hard-code trong nhiều route.
9. Phát workflow events qua cơ chế hiện có sau khi ghi DB thành công nếu handler đã sẵn sàng; lỗi email không được làm rollback directive đã lưu.
10. Viết route tests cho quyền, state transitions, lý do revision, withdrawal và lịch sử phản hồi.

### Acceptance criteria

- API hỗ trợ luồng từ tạo directive đến phản hồi BTV.
- Chỉ actor có membership/role phù hợp mới thực hiện từng transition.
- Transition sai không cập nhật một phần dữ liệu.
- BTV chỉ thấy directive/submission liên quan và resource được phép xem theo policy/submission.
- Tests bao phủ thành công và các trường hợp 403/400 quan trọng.

### Không làm

- Không xây frontend BTV/TCKT trong sprint này.
- Không làm CTD bridge, periodic sync, hoặc API nội bộ cho service.
- Không tạo `module_registry` nếu chưa có ADR/đặc tả chốt yêu cầu đó.

## 7. Kế hoạch tích hợp theo ngày

| Ngày | Developer 1 | Developer 2 | Developer 3 | Mốc chung |
|---|---|---|---|---|
| **1** | Đối chiếu DDL/backfill, gửi schema contract. | Chốt shape của unit context, policy và audit. | Chốt endpoints, role matrix, transitions và test cases. | Khóa interface chung; không triển khai theo giả định riêng. |
| **2** | Hoàn tất migration/backfill và tests cơ bản. | Tạo unit context, tests membership và fallback. | Dựng routes/tests theo contract. | Cả nhóm chạy trên cùng schema/API contract. |
| **3** | Xử lý rerun/partial-run và DYC bootstrap. | Hoàn thiện `scopeFor`, serializer summary, audit hooks. | Hoàn thiện create/acknowledge/link activity và authorization. | Merge migration đầu tiên sau review. |
| **4** | Review tích hợp và sửa schema/test phát sinh. | Áp scope cho route liên quan, hoàn thiện access tests. | Hoàn thiện submit/respond/withdraw và state tests. | Demo API end-to-end bằng dữ liệu test. |
| **5** | Rerun migration tests, cập nhật DB docs nếu cần. | Chạy privacy/access regression, sửa rò rỉ. | Chạy route regression, hoàn thiện API docs. | Chạy Core tests + docs check; mở PR hoàn chỉnh tới `staging`. |

## 8. Phụ thuộc và review

1. Developer 1 công bố schema contract trước cuối ngày 1; Developer 3 không tự suy đoán tên field SQL.
2. Developer 2 công bố interface `loadUnitContext`/`scopeFor`/audit trước cuối ngày 1; Developer 3 gọi interface đó thay vì tự viết policy.
3. Developer 1 review migration; Developer 2 review quyền/privacy; Developer 3 review transition/API behavior. Lead tích hợp và quyết định xung đột còn lại.
4. Nếu dependency bị chậm, Developer 3 tiếp tục viết tests theo contract đã chốt; không tạo bảng/cột tạm khác migration.

## 9. Definition of Done

- [ ] Code đúng phạm vi workstream, không sửa lan sang phần ngoài yêu cầu.
- [ ] Có tests cho luồng thành công và các ca từ chối/biên quan trọng.
- [ ] `cd core && npm test` chạy thành công với MySQL test.
- [ ] Nếu sửa markdown trong `docs/`, `npm run docs:check` chạy thành công.
- [ ] Tài liệu liên quan được cập nhật trong cùng PR.
- [ ] PR mô tả migration, quyền liên đơn vị, tests đã chạy và rủi ro còn lại.
- [ ] PR target `staging`; không deploy production trong mục tiêu năm ngày.

## 10. Ngoài phạm vi năm ngày

- Giao một directive cho nhiều đơn vị hoặc thu báo cáo hàng loạt.
- Snapshot submission; GĐ1 dùng bản live của resource được Trình.
- Frontend, module registry riêng, JWT bridge CTD, thay đổi schema PostgreSQL CTD, đồng bộ định kỳ users/units sang CTD.
- Production deployment hoặc thay đổi hạ tầng.

## Lịch sử phiên bản

| Version | Ngày | Thay đổi | Người |
|---|---|---|---|
| 1.0 | 2026-09-27 | Tạo hướng dẫn phân công ba developers cho nền tảng đa đơn vị trong năm ngày | DYC |
