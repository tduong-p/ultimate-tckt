---
doc_id: SPEC-UNIT-001
title: Requirements — Nền tảng đa đơn vị (GĐ1)
version: 1.0
status: active
audience: [ba, dev, ai]
owner: DYC
updated: 2026-09-24
related_code: []
---

Bản gốc Kiro: `.kiro/specs/nen-tang-da-don-vi/`. Sửa ở đây rồi đồng bộ sang Kiro (hoặc ngược lại) trong cùng PR.

# Requirements: Nền tảng đa đơn vị (GĐ1)

## Introduction

Chuyển TCKT Activity Hub từ hệ thống nội bộ của một ban thành nền tảng đa đơn vị cho Đoàn Đại học, gồm:

- **Core Platform:** danh tính, đơn vị, membership, mức xem, setting có khóa, audit, gateway.
- **Module Điều hành:** code Hub hiện có, cộng thêm giao việc liên đơn vị, cơ chế Trình, và nhật ký trực ban/họp ban.
- **Module Công tác Đảng (CTD):** backend FastAPI riêng, nối vào Core qua JWT bridge.
- **Frontend chung:** React, đặt trong thư mục `web/`.

Tài liệu này chỉ bao phủ **GĐ1**. GĐ2 và GĐ3 xem ở `design.md` §10. Thiết kế chi tiết nằm ở `design.md`.

## Requirements

### Requirement 1: Cây đơn vị và membership

**User Story:** Là DYC, tôi muốn mô hình hóa các đơn vị (DYC, BTV, TCKT, VP Đoàn, Chi bộ, ĐT/LCĐ), trong đó mỗi người có role riêng ở từng đơn vị, để một người có thể thuộc nhiều đơn vị.

#### Acceptance Criteria
1. WHEN migration chạy trên dữ liệu hiện có THEN hệ thống SHALL gán mọi `teams` và `activities` về đơn vị TCKT, và tạo membership TCKT cho mỗi user với role bằng `users.role` hiện tại.
2. WHEN migration chạy lại lần hai THEN hệ thống SHALL không tạo bản ghi trùng (idempotent).
3. WHEN tạo membership với role không hợp lệ so với `kind` của đơn vị THEN hệ thống SHALL từ chối với lỗi 400.
4. WHEN user có nhiều membership THEN giao diện SHALL cho phép chuyển đơn vị đang làm việc, và mọi quyền SHALL được tính theo đơn vị đang chọn.
5. IF `current_unit_id` trong session không thuộc membership của user THEN hệ thống SHALL chuyển về membership đầu tiên. IF user không có membership nào THEN hệ thống SHALL trả 403.

### Requirement 2: DYC, admin global, và khóa setting

**User Story:** Là DYC (chủ quản nền tảng), tôi muốn quản trị cấu hình hệ thống, khóa các setting quan trọng, và có toàn quyền truy cập mọi dữ liệu nghiệp vụ của mọi đơn vị khi cần.

#### Acceptance Criteria
1. WHEN migration chạy THEN user có `is_devops=1` SHALL được chuyển thành membership DYC `dyc_engineer`.
2. WHEN ứng dụng khởi động THEN mọi email trong `DEVOPS_EMAILS` SHALL có membership `dyc_admin`.
3. WHEN người không thuộc DYC sửa một setting `managed_by=platform` THEN hệ thống SHALL trả 403.
4. WHEN một setting `managed_by=unit` có dòng trong `setting_locks` THEN hệ thống SHALL trả 403 kèm lý do khóa với người không thuộc DYC, và UI SHALL hiển thị trạng thái khóa kèm lý do.
5. WHEN tài khoản DYC gọi bất kỳ endpoint đọc dữ liệu nghiệp vụ nào (hoạt động, task, ops_log, hồ sơ CTD) THEN hệ thống SHALL cho phép đọc (`scopeFor` coi DYC là admin global, bỏ qua giới hạn theo đơn vị), và SHALL ghi `audit_logs` cho lượt truy cập liên đơn vị đó.
6. WHEN DYC khóa hoặc mở khóa một setting THEN hệ thống SHALL ghi `audit_logs`.
7. Phân cấp quyền xem trong nội bộ DYC (ví dụ giới hạn ai trong DYC được xem hồ sơ CTD) KHÔNG thuộc phạm vi GĐ1, để thiết kế sau.

### Requirement 3: Mức xem liên đơn vị cấu hình được

**User Story:** Là Trưởng ban TCKT, tôi muốn chọn mức dữ liệu BTV được xem (`summary` / `tasks_readonly` / `full_readonly`) mà không cần sửa code.

#### Acceptance Criteria
1. WHEN migration chạy THEN policy BTV→TCKT SHALL được seed với mức `summary`.
2. WHEN người xem thuộc đơn vị khác và ở mức `summary` THEN response SHALL chỉ chứa directive, submission, và activity ở dạng tổng quan (`id`, `title`, `status`, `priority`, `start_date`, `deadline`, `progress_percent`, tên `event_lead`, `directive_id`).
3. WHEN mức là `tasks_readonly` THEN người xem SHALL thấy thêm tasks và assignees ở chế độ chỉ đọc.
4. WHEN mức là `full_readonly` THEN người xem SHALL thấy thêm checklist, bình luận, đính kèm và ops_log ở chế độ chỉ đọc.
5. IF không có policy giữa hai đơn vị THEN người xem SHALL chỉ thấy directive và submission liên quan trực tiếp đến đơn vị mình.
6. WHEN `admin`/`vice_admin` của đơn vị sở hữu đổi mức xem THEN thay đổi SHALL có hiệu lực ngay và SHALL được ghi `audit_logs`.
7. WHEN người không phải admin của đơn vị sở hữu cố đổi mức xem THEN hệ thống SHALL trả 403.
8. Mọi truy vấn đọc SHALL đi qua `scopeFor`, và việc lọc trường SHALL được thực hiện trong serializer phía server.

### Requirement 4: Giao việc liên đơn vị (directive)

**User Story:** Là thành viên BTV, tôi muốn giao việc cho TCKT và theo dõi tiến độ tổng mà không phải hỏi dồn.

#### Acceptance Criteria
1. WHEN `btv_lead`/`btv_member` tạo directive gửi TCKT THEN directive SHALL ở trạng thái `sent`, và admin TCKT SHALL nhận thông báo.
2. WHEN `admin`/`vice_admin` TCKT tiếp nhận và cử người chịu trách nhiệm THEN trạng thái SHALL chuyển sang `acknowledged`.
3. WHEN TCKT tạo hoạt động gắn `directive_id` THEN trạng thái SHALL chuyển sang `in_progress`, và `progress_percent` SHALL bằng số task `done` chia cho số task không bị `cancelled`, tính trên mọi hoạt động gắn directive đó.
4. WHEN TCKT Trình kết quả gắn với directive THEN trạng thái SHALL chuyển sang `submitted`.
5. WHEN BTV chấp nhận THEN trạng thái SHALL chuyển sang `accepted`. WHEN BTV yêu cầu bổ sung THEN lý do SHALL là bắt buộc, và trạng thái SHALL chuyển sang `revision_requested`.
6. WHEN directive ở trạng thái `sent` quá 48 giờ THEN hệ thống SHALL thông báo cho admin TCKT.
7. WHEN directive quá hạn mà chưa `accepted` THEN hệ thống SHALL thông báo cho cả hai đơn vị.
8. WHEN người ngoài hai đơn vị liên quan thao tác với directive THEN hệ thống SHALL trả 403.

### Requirement 5: Trình (submission)

**User Story:** Là Trưởng ban TCKT, tôi muốn chủ động Trình từng mục cụ thể (hoạt động, biên bản, báo cáo) lên BTV, kể cả khi mức xem đang là `summary`.

#### Acceptance Criteria
1. WHEN TCKT Trình một mục THEN đơn vị nhận SHALL xem được đúng mục đó và không mục nào khác ngoài phạm vi policy.
2. WHEN submission bị rút lại trước khi có phản hồi THEN đơn vị nhận SHALL mất quyền xem mục đó.
3. IF submission đã có phản hồi THEN hệ thống SHALL không cho rút lại.
4. WHEN đơn vị nhận phản hồi (`seen` / `revision_requested` / `accepted`) THEN người Trình SHALL nhận thông báo. Hai lựa chọn `revision_requested` và `accepted` chỉ dùng được khi submission gắn với directive.

### Requirement 6: Nhật ký trực ban/họp ban

**User Story:** Là Tổ trưởng TCKT, tôi muốn ghi lại các buổi trực ban/họp ban kèm điểm danh để theo dõi trách nhiệm từng cá nhân.

#### Acceptance Criteria
1. WHEN `leader` trở lên tạo ops_log (`duty_shift` / `meeting` / `other`) kèm danh sách điểm danh THEN hệ thống SHALL lưu log và trạng thái điểm danh của từng người.
2. WHEN `member` không được chỉ định cố tạo ops_log THEN hệ thống SHALL trả 403.
3. WHEN người thuộc đơn vị khác đọc ops_log THEN hệ thống SHALL chỉ trả dữ liệu nếu mức xem là `full_readonly` hoặc log đó đã được Trình.
4. WHEN ghi nhận `absent` THEN hệ thống SHALL phát event `ops_log.absent_recorded`.

### Requirement 7: Module registry và frontend chung

**User Story:** Là người dùng, tôi muốn một giao diện duy nhất chỉ hiện các tab mình được dùng. Là dev, tôi muốn mỗi nhóm sở hữu một thư mục module riêng.

#### Acceptance Criteria
1. WHEN user đăng nhập THEN shell SHALL chỉ hiện mục menu có trong manifest mà user có membership phù hợp VÀ đơn vị của user đã bật module đó.
2. WHEN user chỉ có membership ở ĐT/LCĐ, VP Đoàn hoặc Chi bộ THEN user SHALL chỉ thấy tab Công tác Đảng.
3. WHEN sinh viên truy cập Hub THEN sinh viên SHALL không thấy tab Công tác Đảng.
4. Shell mới SHALL chạy ở `/app` song song với giao diện cũ ở `/` trong suốt GĐ1.
5. Các màn hình "Việc hôm nay" và nộp nghiệm thu SHALL dùng được trên mobile web (từ 360px).

### Requirement 8: Tích hợp CTD qua JWT bridge

**User Story:** Là cán bộ xử lý hồ sơ Đảng, tôi muốn làm việc trong tab Công tác Đảng của Hub mà không phải đăng nhập hệ thống khác.

#### Acceptance Criteria
1. WHEN gateway chuyển tiếp `/m/ctd/api/v1/*` THEN Core SHALL ký JWT HS256 với secret `HUB_BRIDGE_SECRET`, `aud=ctd`, TTL 60 giây, chứa user, đơn vị đang chọn và role.
2. WHEN CTD nhận token hợp lệ THEN CTD SHALL tìm hoặc tạo `app_user` theo `hub_user_id`, đồng bộ đơn vị theo `hub_unit_id`, và ánh xạ role theo bảng ở design §8.1.
3. WHEN token hết hạn, sai `aud` hoặc sai chữ ký THEN CTD SHALL trả 401.
4. WHEN BTV mở tab CTD THEN BTV SHALL chỉ thấy số liệu từ `/api/v1/summary` và không thấy hồ sơ cá nhân nào.
5. WHEN cán bộ ĐT/LCĐ mở tab THEN cán bộ SHALL chỉ thấy hồ sơ của đơn vị mình. Tương tự, TCKT thấy hàng chờ `tckt_checking` + toàn cảnh, VP Đoàn thấy `vp_checking`, Chi bộ thấy hồ sơ `forwarded` ở chế độ chỉ đọc.
6. Luồng đăng nhập OTP/mật khẩu của sinh viên tại `ctd-hoso` SHALL tiếp tục hoạt động như hiện tại.
7. WHEN trạng thái hồ sơ thay đổi THEN CTD SHALL gửi event về Core qua `/internal/events`.

### Requirement 9: Audit

**User Story:** Là admin đơn vị, tôi muốn biết ai ở đơn vị khác đã xem hoặc thay đổi dữ liệu của đơn vị mình.

#### Acceptance Criteria
1. WHEN người thuộc đơn vị khác đọc tài nguyên của đơn vị sở hữu THEN hệ thống SHALL ghi `audit_logs` gồm actor, đơn vị của actor, loại và id tài nguyên, đơn vị sở hữu.
2. WHEN mức xem, khóa setting hoặc membership thay đổi THEN hệ thống SHALL ghi `audit_logs`.

### Requirement 10: Kiểm thử chống rò rỉ

**User Story:** Là DYC, tôi muốn CI chặn mọi thay đổi làm lộ dữ liệu nội bộ ra đơn vị khác (ngoại trừ chính DYC, vốn là admin global).

#### Acceptance Criteria
1. WHEN CI chạy THEN bộ test SHALL gọi mọi route GET đã đăng ký bằng tài khoản BTV ở mức `summary`, và fail nếu response chứa khóa ngoài danh sách tổng quan hoặc chứa id task/checklist/ops_log của TCKT.
2. WHEN CI chạy THEN bộ test SHALL xác nhận DYC đọc được mọi endpoint nghiệp vụ (không bị 403) VÀ mỗi lượt đọc đó có ghi `audit_logs` tương ứng.
3. WHEN bộ test chống rò rỉ fail THEN pipeline SHALL chặn merge.

## Điều kiện hoàn thành GĐ1 (ngoài các AC trên)

- Email thật và cron (Hub + CTD) phải được bật trước khi mở cho người dùng thật.

## Câu hỏi còn mở

Xem `design.md` §13. Các câu hỏi đó không chặn việc bắt đầu, nhưng phải chốt trước khi triển khai Requirement 8.

## Lịch sử phiên bản

| Version | Ngày | Thay đổi | Người |
|---|---|---|---|
| 1.0 | 2026-09-24 | Bản có frontmatter, đồng bộ từ `.kiro/specs/nen-tang-da-don-vi/requirements.md` | DYC |
