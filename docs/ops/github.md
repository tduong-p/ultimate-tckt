---
doc_id: OPS-GH-001
title: Cấu hình GitHub — checklist
version: 1.1
status: active
audience: [dev, ops, ai]
owner: DYC
updated: 2026-09-24
related_code: [.github/**]
---

# Cấu hình GitHub — checklist

Danh sách những gì phải cấu hình thủ công trên GitHub (repo `tduong-p/ultimate-tckt`, private) để CI/CD và bảo vệ nhánh hoạt động đúng như `docs/ops/deploy-va-nhanh.md` mô tả. Đây là việc tay của chủ repo (Settings trên GitHub), không có script tự động hoá.

## 1. Environments

Tạo hai GitHub Environment: **`staging`** và **`production`**.

Mỗi Environment cần các secret:

| Secret | Ý nghĩa |
|---|---|
| `SSH_HOST` | IP của VM (`168.107.68.32`) |
| `SSH_USER` | User SSH trên VM (`ubuntu`) |
| `SSH_PRIVATE_KEY` | Private key của cặp khoá **CI** (khác với deploy key của VM — xem `docs/ops/vps.md` mục 3). Public key tương ứng phải nằm trong `~/.ssh/authorized_keys` của user đó trên VM. |

Environment `production`: đặt **deployment branch** = chỉ `main` (không cho job deploy chạy với ref khác, kể cả khi ai đó chỉnh workflow thủ công).

## 2. Biến repo (Variables)

- `DEPLOY_ENABLED` (`true`/`false`) — bật/tắt bước SSH-deploy trong `deploy.yml`. Đặt `false` cho tới khi VM đã bootstrap xong và sẵn sàng nhận deploy (xem `docs/ops/chuyen-doi-ultimate-tckt.md`).

## 3. Ruleset nhánh `main`

- Yêu cầu Pull Request trước khi merge (không cho push thẳng).
- Yêu cầu các status check sau phải xanh trước khi merge: `changes`, `test-core`, `test-ctd`, `docs` (job bị skip theo path filter vẫn tính là đạt).
- Chặn force-push và xoá nhánh.
- Không cần bypass list: `docs.yml` chỉ gắn tag `docs-v*` và tạo GitHub Release, không commit vào `main`.

## 4. Ruleset nhánh `staging`

- Yêu cầu status check `changes`, `test-core`, `test-ctd`, `docs` xanh.
- Chặn force-push và xoá nhánh.
- Không bắt buộc review, nhưng vì ruleset bắt buộc check nên **push thẳng commit mới vào `staging` bị từ chối** (commit chưa có check). Thực tế: đẩy lên nhánh tính năng → mở PR vào `staging` → merge khi CI xanh.
- Ruleset hiện có: `protect-main`, `protect-staging` (xem `gh api repos/tduong-p/ultimate-tckt/rulesets`).

## 5. Nhãn (Label)

- `no-docs-needed` — gắn vào PR khi thay đổi không cần cập nhật tài liệu, đi kèm dòng "Docs: không cần vì …" trong mô tả PR (xem `.github/pull_request_template.md`, và luật ở `AGENTS.md`).

## 6. GHCR (GitHub Container Registry)

- Hai package: `ultimate-tckt-core`, `ultimate-tckt-ctd-api` — đặt **Private**, không public.
- Workflow `ghcr-cleanup.yml` chạy định kỳ hàng tuần, giữ lại 10 phiên bản mới nhất mỗi package (`min-versions-to-keep: 10`), xoá bản cũ hơn để tránh phình dung lượng registry.

## 7. Kiểm tra sau khi cấu hình xong

- Push thử một commit nhỏ vào `staging` → CI chạy `test-core`/`test-ctd` (tuỳ path filter), build image nếu liên quan, deploy nếu `DEPLOY_ENABLED=true`.
- Thử tạo PR vào `main` không đủ check → bị chặn merge.
- Thử push thẳng vào `main` → bị từ chối bởi ruleset.

## Lịch sử phiên bản

| Version | Ngày | Thay đổi | Người |
|---|---|---|---|
| 1.0 | 2026-09-24 | Bản đầu (viết lại từ tài liệu cũ khi gộp monorepo) | DYC |
| 1.1 | 2026-09-24 | Ghi đúng ruleset đã tạo: thêm check `changes`, chặn xoá nhánh; staging bắt buộc check nên thay đổi đi qua PR | DYC |
