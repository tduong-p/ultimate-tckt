---
doc_id: PB-DEP-001
title: Playbook — nâng dependency
version: 1.1
status: active
audience: [dev, ai]
owner: DYC
updated: 2026-09-26
related_code: [core/package.json, services/ctd-api/backend/pyproject.toml]
---

# Playbook — nâng dependency

Tài liệu này giúp dev và AI agent nâng phiên bản thư viện an toàn ở cả hai app, tránh phá build arm64 trên VM hoặc phá test CI.

## Khi nào dùng

Khi cần nâng phiên bản một dependency (bản vá bảo mật, tính năng mới cần bản cao hơn, dọn cảnh báo deprecated) ở `core/` (npm) hoặc `services/ctd-api/backend/` (pip/pyproject).

## Các bước

1. **Nâng từng dependency một, không nâng hàng loạt trong một PR** — dễ truy nguyên nếu có lỗi.
2. **Core (`core/package.json`)**:
   ```bash
   cd core
   npm outdated                    # xem thư viện có bản mới
   npm install <package>@<version>
   npm test
   ```
   Kiểm `engines.node` (`>=22 <23`) vẫn còn phù hợp — không nâng lên bản Node yêu cầu phiên bản engine khác mà không cập nhật cả `package.json` lẫn `Dockerfile`/CI (`actions/setup-node` trong `deploy.yml` đang dùng `node-version: 22`).
3. **CTD (`services/ctd-api/backend/pyproject.toml`)**:
   ```bash
   cd services/ctd-api/backend
   .venv/bin/pip install -e ".[dev]" --upgrade <package>
   .venv/bin/pytest
   ```
   Kiểm `requires-python` (`>=3.12`) vẫn khớp với `actions/setup-python` (`python-version: '3.12'`) trong `deploy.yml`.
4. **Chạy toàn bộ test của app vừa nâng**, không chỉ test liên quan trực tiếp tới thư viện đó — dependency có thể ảnh hưởng gián tiếp (ví dụ nâng ORM ảnh hưởng câu query khác).
5. **Kiểm build Docker image thành công cho arm64** trước khi merge nếu dependency có phần biên dịch native (ví dụ driver DB) — build sai kiến trúc từng là bẫy thật (`docs/ai/bay-da-gap.md`: "Image phải build cho arm64").
6. **Đọc changelog/breaking-change** của bản nâng nếu là major version — không nâng major mà không đọc gì.

## Kiểm tra xong

- [ ] `cd core && npm test` hoặc `.venv/bin/pytest` (tuỳ app) xanh toàn bộ sau khi nâng.
- [ ] Không đổi `engines.node`/`requires-python` mà quên đồng bộ với `deploy.yml` (`setup-node`/`setup-python`).
- [ ] Nếu dependency có phần native/biên dịch: đã xác nhận build image `linux/arm64` (buildx) thành công, không chỉ test trên máy dev x86.
- [ ] PR chỉ nâng dependency đã nêu trong tiêu đề, không lẫn thay đổi tính năng khác.

## Tài liệu phải cập nhật

- `docs/dev/kien-truc.md` nếu nâng dependency kéo theo đổi phiên bản runtime (Node/Python) toàn hệ thống.
- ADR mới trong `docs/adr/` nếu đây là nâng major version có rủi ro/breaking change đáng kể.

## Lịch sử phiên bản

| Version | Ngày | Thay đổi | Người |
|---|---|---|---|
| 1.0 | 2026-09-24 | Bản đầu (viết lại từ tài liệu cũ khi gộp monorepo) | DYC |
| 1.1 | 2026-09-26 | Version bump core/package.json 2.2.0 | DYC |
