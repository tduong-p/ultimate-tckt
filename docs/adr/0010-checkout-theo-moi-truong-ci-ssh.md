---
doc_id: ADR-0010-001
title: Checkout VM theo môi trường, CI SSH deploy, test chặn deploy
version: 1.0
status: active
audience: [dev, ai]
owner: DYC
updated: 2026-09-24
related_code: [.github/workflows/**, infra/scripts/deploy.sh, infra/scripts/apply-infra.sh]
---

# Checkout VM theo môi trường, CI SSH deploy, test chặn deploy

Ghi lại cách một monorepo với hai nhánh dài hạn triển khai lên cùng một VM mà
vẫn tách biệt staging/production, và cách CI kiểm soát việc deploy.

## Bối cảnh

Monorepo (ADR-0009) có hai nhánh dài hạn `main` (production) và `staging`
(staging), nhưng hạ tầng vẫn chỉ có một VPS (`168.107.68.32`) chạy cả hai môi
trường. Cần một cơ chế để mỗi môi trường lấy đúng code của nhánh mình, và CI
không được phép deploy khi test đỏ hoặc khi build chưa được duyệt.

## Quyết định

Trên VPS, mỗi môi trường có một checkout riêng theo nhánh của nó
(`/opt/ultimate-tckt/staging` bám `staging`, `/opt/ultimate-tckt/production`
bám `main`), sparse-checkout chỉ lấy `infra/`. Thay đổi hạ tầng cũng đi theo
luồng staging → main như code. CI (`deploy.yml`) tiếp tục dùng GitHub Actions
SSH vào VM (không ai cần quyền SSH thủ công để deploy thường xuyên) — test
xanh (`test-core`, `test-ctd`) là điều kiện bắt buộc trước khi build image và
deploy; biến repo `DEPLOY_ENABLED` là công tắc tổng chặn deploy.

## Hệ quả

- Muốn thay đổi hạ tầng production phải đi qua PR `staging → main`, không sửa
  trực tiếp trên VM.
- CI đỏ ở `test-core`/`test-ctd` chặn cả build lẫn deploy, không chỉ cảnh báo.
- Runbook chuyển đổi cụ thể (thứ tự lệnh, rollback) nằm ở
  `docs/ops/chuyen-doi-ultimate-tckt.md`, không lặp lại ở đây.

## Lịch sử phiên bản

| Version | Ngày | Thay đổi | Người |
|---|---|---|---|
| 1.0 | 2026-09-24 | Bản đầu, nguồn: `docs/specs/2026-09-23-monorepo-ultimate-tckt-design.md` §1, §3 (M3, M5, M6) | DYC |
