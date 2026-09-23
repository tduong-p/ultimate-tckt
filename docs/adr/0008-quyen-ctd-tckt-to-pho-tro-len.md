---
doc_id: ADR-0008-001
title: Quyền CTD của TCKT — từ tổ phó trở lên
version: 1.0
status: active
audience: [dev, ai]
owner: DYC
updated: 2026-09-24
related_code: [services/ctd-api/backend/app/deps.py]
---

# Quyền CTD của TCKT — từ tổ phó trở lên

Ghi lại quyết định về việc thành viên TCKT nào được cấp quyền truy cập tab
Công tác Đảng (CTD) khi CTD được đưa vào Hub như một module.

## Bối cảnh

Nền tảng đa đơn vị (ADR-0007) đưa CTD vào Hub thành một tab, hiển thị khác
nhau tùy role. TCKT có 5 vai trò (ADR-0002): `admin`, `vice_admin`, `leader`,
`vice_leader`, `member`. Cần xác định TCKT ở cấp nào thì được xem/thao tác
nghiệp vụ CTD, tránh cấp quá rộng (rò rỉ hồ sơ Đảng cho thành viên thường)
hoặc quá hẹp (cản trở Tổ trưởng/Tổ phó đang thực sự xử lý công việc CTD).

## Quyết định

TCKT từ tổ phó trở lên — `vice_leader`, `leader`, `vice_admin`, `admin` — được
cấp quyền CTD (ánh xạ sang role `tckt` phía CTD: hàng chờ + toàn cảnh hồ sơ).
`member` không có quyền truy cập tab/API CTD.

## Hệ quả

- Middleware/deps phía CTD (`deps.py`) và điều kiện hiển thị tab phía Core
  phải kiểm tra đúng 4 role này, không dùng điều kiện "không phải member".
- Quyền này tách biệt với quyền `quan_tri` của DYC (ADR-0007, D4) — TCKT vẫn
  chỉ thấy hàng chờ/toàn cảnh, không phải admin global của CTD.
- Test chống rò rỉ quyền (`docs/dev/phan-quyen.md`) phải có ca kiểm `member`
  bị chặn truy cập CTD.

## Lịch sử phiên bản

| Version | Ngày | Thay đổi | Người |
|---|---|---|---|
| 1.0 | 2026-09-24 | Bản đầu, nguồn: spec monorepo `2026-09-23-monorepo-ultimate-tckt-design.md` §1 (quyết định nghiệp vụ chốt cùng đợt gộp monorepo) | DYC |
