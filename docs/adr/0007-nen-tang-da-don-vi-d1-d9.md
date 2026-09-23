---
doc_id: ADR-0007-001
title: Nền tảng đa đơn vị — quyết định kiến trúc D1–D9
version: 1.1
status: active
audience: [dev, ai]
owner: DYC
updated: 2026-09-24
related_code: [core/**, services/ctd-api/**]
---

# Nền tảng đa đơn vị — quyết định kiến trúc D1–D9

Ghi lại 9 quyết định kiến trúc chốt trong buổi brainstorm mở rộng Hub từ nội
bộ TCKT sang nền tảng nhiều đơn vị (BTV, DYC, các đơn vị dùng CTD).

## Bối cảnh

Hub ban đầu chỉ phục vụ TCKT. Ba yêu cầu mới xuất hiện: BTV cần giám sát/giao
việc/xem báo cáo TCKT như một đơn vị khác; DYC là đơn vị chủ quản vận hành hệ
thống; CTD (hệ xét duyệt hồ sơ Đảng, FastAPI/Postgres có sẵn) cần vào Hub như
một tab hiển thị theo role.

## Quyết định

D1: thiết kế đa đơn vị ngay từ GĐ1 (chỉ bật BTV, TCKT, DYC, đơn vị dùng CTD).
D2: mức xem liên đơn vị cấu hình được trong Setting (`summary` /
`tasks_readonly` / `full_readonly`) cộng cơ chế Trình theo từng mục.
D3: mặc định BTV → TCKT = `summary`.
D4 (hiện hành, xem mục Thay thế): **DYC là admin global**, toàn quyền truy cập
mọi dữ liệu nghiệp vụ kể cả CTD, có ghi `audit_logs`; phân cấp quyền xem nội bộ
DYC để sau.
D5: kiến trúc Core Platform + module backend độc lập, mỗi nhóm dev phụ trách
một module.
D6: một frontend chung duy nhất (React + TypeScript + Vite ở `web/`), chia
thư mục theo module, không iframe/micro-frontend.
D7: backend CTD giữ service riêng (FastAPI/Postgres), nối Core qua JWT bridge.
D8: tiêu chí tách module loại B là đạt ≥2/3 tiêu chí (độc lập dữ liệu, độc lập
đội ngũ, độc lập vòng đời deploy).
D9: không có GĐ0; rủi ro vận hành đã nhận diện được chấp nhận, ghi lại thay vì
làm thêm một giai đoạn chuẩn bị.

## Hệ quả

- Mọi module mới phải phân loại A/B theo D8 trước khi viết code (loại A trong
  `core/src/modules/`, loại B là service riêng `services/<id>/`).
- CTD tiếp tục là service riêng theo D7, không gộp vào MySQL của Core.
- D4 hiện hành cho DYC quyền đọc toàn bộ dữ liệu nghiệp vụ — mọi policy quyền
  xem phải cộng thêm nhánh "DYC luôn được xem" và ghi `audit_logs` khi DYC đọc
  dữ liệu đơn vị khác.

## Thay thế

D4 ban đầu (chốt cùng ngày 2026-09-23, trước khi bị đảo ngược) là **"DYC quản
lý hệ thống, không xem nghiệp vụ"** — DYC chỉ vận hành hạ tầng/tài khoản, không
đọc dữ liệu nghiệp vụ của các đơn vị khác. Quyết định này đã bị **đảo ngược
trong cùng ngày 2026-09-23** thành "DYC tối cao" (D4 ở mục Quyết định phía
trên): DYC được xác nhận là admin global, đọc mọi dữ liệu nghiệp vụ. Vai trò
`quan_tri` bên CTD theo đó ánh xạ thẳng cho DYC (không còn ánh xạ tạm sang
`admin` TCKT như đề xuất ban đầu).

## Lịch sử phiên bản

| Version | Ngày | Thay đổi | Người |
|---|---|---|---|
| 1.0 | 2026-09-24 | Bản đầu, nguồn: `legacy/hub/docs/superpowers/specs/2026-09-23-nen-tang-da-don-vi-design.md` (repo cũ `tckt-activity-hub`) | DYC |
| 1.1 | 2026-09-24 | Cập nhật D4 theo bản hiệu lực `.kiro/specs/nen-tang-da-don-vi/design.md`, ghi rõ D4 gốc đã bị đảo ngược | DYC |
