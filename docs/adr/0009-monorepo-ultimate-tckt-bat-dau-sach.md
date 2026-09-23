---
doc_id: ADR-0009-001
title: Monorepo ultimate-tckt — bắt đầu sạch
version: 1.0
status: active
audience: [dev, ai]
owner: DYC
updated: 2026-09-24
related_code: []
---

# Monorepo ultimate-tckt — bắt đầu sạch

Ghi lại quyết định gộp 3 repo (`tckt-activity-hub`, `ctd`, `infra`) thành một
monorepo mới, không mang theo lịch sử git.

## Bối cảnh

Hub, CTD và hạ tầng vốn nằm ở 3 repo riêng, gây khó khăn khi thay đổi cùng lúc
code + hạ tầng, và tài liệu bị phân tán/không version hoá. Cần một điểm bắt
đầu rõ ràng để đồng thời đổi tên hạ tầng (ADR-0011) và dựng lại hệ thống tài
liệu (ADR-0012).

## Quyết định

Repo mới `tduong-p/ultimate-tckt`, private, tài khoản cá nhân có GitHub Pro
(Education); chuyển sang Organization bằng *Transfer* khi cần phân quyền theo
team. **Bắt đầu sạch**: không import lịch sử git; mỗi nhánh có một commit
"initial import" ghi SHA nguồn của từng repo cũ. Ba repo cũ được archive
(chỉ đọc) để tra cứu lịch sử. Cấu trúc thư mục: `core/` (← hub),
`services/ctd-api/` (← ctd), `web/` (chưa có, tương lai), `infra/`, `docs/`.

## Hệ quả

- Lịch sử commit trước ngày gộp chỉ tra được ở 3 repo archive, không có trong
  `ultimate-tckt`.
- Mọi thay đổi code từ nay đi qua monorepo; không còn push trực tiếp vào các
  repo cũ.
- Cấu trúc `core/`, `services/ctd-api/`, `web/`, `infra/`, `docs/` là cấu trúc
  chính thức duy nhất — xem `docs/dev/kien-truc.md`.

## Lịch sử phiên bản

| Version | Ngày | Thay đổi | Người |
|---|---|---|---|
| 1.0 | 2026-09-24 | Bản đầu, nguồn: `docs/specs/2026-09-23-monorepo-ultimate-tckt-design.md` §1 (M1, M2, M4) | DYC |
