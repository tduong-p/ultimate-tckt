---
doc_id: ADR-0006-001
title: Hạ tầng — một VM Oracle arm64, hai môi trường, GHCR, nginx + certbot
version: 1.0
status: active
audience: [dev, ai]
owner: DYC
updated: 2026-09-24
related_code: [infra/**]
---

# Hạ tầng — một VM Oracle arm64, hai môi trường, GHCR, nginx + certbot

Ghi lại kiến trúc triển khai ban đầu cho Hub + CTD, dùng tối đa free tier.

## Bối cảnh

Hai ứng dụng nội bộ (Hub Node/Express/MySQL và CTD FastAPI/Postgres) cần host
với ngân sách gần 0đ, người vận hành tự deploy một mình, cần tách staging/
production, CI/CD tự động, và dễ di dời sau này. Free tier Oracle Cloud thực tế
chỉ còn ~1 VM Ampere A1 (1 OCPU/6GB RAM) khả dụng ổn định ở region đã chọn,
thấp hơn nhiều so với ước tính ban đầu.

## Quyết định

Một VM Oracle Ampere arm64 duy nhất chạy cả staging và production, tách nhau ở
tầng Docker Compose (mỗi môi trường một compose project riêng, port nội bộ
khác nhau). App build thành Docker image, push lên GitHub Container Registry
(GHCR), cùng image chạy cả hai môi trường để tránh lệch cấu hình. Nginx cài
trực tiếp trên VM làm reverse proxy theo `server_name`, Certbot renew HTTPS tự
động qua systemd timer. DB (MySQL, Postgres) chạy trong container, named
volume riêng cho dữ liệu và file đính kèm/tài liệu.

## Hệ quả

- Rủi ro chấp nhận: staging và production cạnh tranh chung tài nguyên vật lý
  của một VM; giới hạn resource per-container là cải tiến có thể thêm sau,
  không bắt buộc.
- Tên compose project, service, volume, image ban đầu dùng tiền tố `seee`;
  toàn bộ được đổi sang `ultimate-tckt-*` — xem ADR-0011 (nơi duy nhất ghi
  tên cũ).
- Tách production ra VM riêng sau này chỉ là đổi IP DNS + secret, không đổi
  cấu trúc container/CI.

## Lịch sử phiên bản

| Version | Ngày | Thay đổi | Người |
|---|---|---|---|
| 1.0 | 2026-09-24 | Bản đầu, nguồn: `legacy/ctd/docs/superpowers/specs/2026-09-16-deploy-infra-design.md` (repo cũ `infra`) | DYC |
