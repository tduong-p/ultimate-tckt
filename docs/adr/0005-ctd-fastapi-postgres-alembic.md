---
doc_id: ADR-0005-001
title: CTD — FastAPI + Postgres + Alembic, luồng xét duyệt hồ sơ
version: 1.0
status: active
audience: [dev, ai]
owner: DYC
updated: 2026-09-24
related_code: [services/ctd-api/backend/**]
---

# CTD — FastAPI + Postgres + Alembic, luồng xét duyệt hồ sơ

Ghi lại quyết định viết lại hệ thống xét duyệt hồ sơ Đảng (CTD) trên stack
FastAPI, thay cho MVP Django ban đầu.

## Bối cảnh

MVP Django hiện thực đúng luồng luân chuyển hồ sơ cơ bản và đã giải quyết
timeout Power Automate, nhưng tài liệu BA (8–9/2026) mô tả phạm vi rộng hơn:
hồ sơ nhiều đầu mục giấy tờ (mỗi mục trạng thái/lý do riêng), bước kiểm tra Ban
TCKT, cuộc họp xét, đợt xét, dashboard/báo cáo, sinh biểu mẫu — mô hình dữ liệu
MVP không đỡ nổi. Ràng buộc: ngân sách ≤5 triệu VNĐ/năm, không khoá cứng
Microsoft, người viết là một người + AI (đội sau tiếp quản), không deadline
cứng nhưng cần tốc độ.

## Quyết định

Viết lại backend bằng FastAPI + SQLAlchemy + Alembic (migration có version,
khác hẳn cách `db.sql` không-migration của Hub) trên Postgres 16. Frontend
React + Vite build thẳng vào `backend/static/`, cùng FastAPI serve một
port/domain. Phạm vi: hồ sơ & tài liệu, luân chuyển & phân quyền, họp xét &
sinh tài liệu, thông báo, dashboard & báo cáo — chia thành chuỗi spec, tài
liệu nguồn chỉ phủ kiến trúc + khối 1–2.

## Hệ quả

- CTD dùng Alembic migration thật (khác Hub), xem `docs/dev/db-migration.md`.
- Ngoài phạm vi bản gốc: trình tạo quy trình bằng giao diện, màn hình nội bộ
  Chi bộ (thẩm tra lý lịch, họp Chi bộ), app di động riêng, chế độ tối, cổng
  tra cứu công khai.
- Là tiền đề cho ADR-0007 (tích hợp CTD vào nền tảng đa đơn vị qua JWT bridge).

## Lịch sử phiên bản

| Version | Ngày | Thay đổi | Người |
|---|---|---|---|
| 1.0 | 2026-09-24 | Bản đầu, nguồn: `legacy/ctd/docs/superpowers/specs/2026-09-15-he-thong-xet-duyet-ho-so-dang-design.md` (repo cũ `ctd`) | DYC |
