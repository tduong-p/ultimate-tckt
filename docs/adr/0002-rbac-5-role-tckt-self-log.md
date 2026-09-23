---
doc_id: ADR-0002-001
title: RBAC 5 vai trò TCKT và cơ chế tự log công việc
version: 1.0
status: active
audience: [dev, ai]
owner: DYC
updated: 2026-09-24
related_code: [core/src/policies/**, core/src/middleware/auth.js]
---

# RBAC 5 vai trò TCKT và cơ chế tự log công việc

Ghi lại thiết kế phân quyền 5 chức danh của TCKT Activity Hub và cơ chế thành
viên tự log công việc kèm trọng số điểm.

## Bối cảnh

Bản gốc dùng thuật ngữ "Ban"/"Đề án" và phân quyền chưa tách rõ cấp Ban Điều
Hành và cấp Tổ. Yêu cầu từ Ban Điều Hành TCKT (17/09/2026) đòi cải tổ thuật
ngữ (Tổ thay Ban, Hoạt động thay Đề án), 5 chức danh chuẩn, chặn tự nghiệm thu
trừ lãnh đạo, và cho thành viên tự ghi nhận công việc đã làm.

## Quyết định

5 vai trò: `admin`/`vice_admin` (Trưởng/Phó Ban — Ban Điều Hành, toàn quyền
Hub), `leader`/`vice_leader` (Tổ trưởng/Tổ phó — quản lý Tổ mình), `member`
(Thành viên thường). Trường hợp đặc biệt `event_lead_id` cho quyền quản lý một
sự kiện cụ thể không phụ thuộc Tổ. Quy tắc Anti-Self-Review: `member` không
được tự duyệt việc mình làm hoặc tự log; lãnh đạo (từ Tổ trưởng trở lên) được
bypass. Thành viên có thể tự log công việc đã hoàn thành (gắn minh chứng), vào
trạng thái `review`, kèm trọng số điểm 0–10 theo preset do BĐH cấu hình.

## Hệ quả

- Mọi policy quyền hạn mới phải dùng đúng 5 khoá vai trò trên, không thêm vai
  trò song song.
- ADR-0008 mở rộng vai trò `vice_leader` trở lên sang quyền CTD.
- UI phải dùng thuật ngữ "Tổ"/"Hoạt động", không còn "Ban"/"Đề án".

## Lịch sử phiên bản

| Version | Ngày | Thay đổi | Người |
|---|---|---|---|
| 1.0 | 2026-09-24 | Bản đầu, nguồn: `legacy/hub/docs/superpowers/specs/2026-09-17-role-refactoring-and-work-logging-design.md` (repo cũ `tckt-activity-hub`) | DYC |
