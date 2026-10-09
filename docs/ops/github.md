---
doc_id: OPS-GH-001
title: Cấu hình GitHub — checklist
version: 1.11
status: active
audience: [dev, ops, ai]
owner: DYC
updated: 2026-10-10
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
- `PROD_DEPLOY_ENABLED` (`true`/`false`) — công tắc riêng cho production; deploy production cần cả hai biến `true`.
- `PROD_NOTI_ENABLED` (`true`, mặc định không đặt = tắt) — công tắc riêng cho job `deploy-noti` trên production (SPEC-MAIL-001 D3); vẫn cần `DEPLOY_ENABLED`.

## 3. Ruleset nhánh `main`

- Yêu cầu Pull Request trước khi merge (không cho push thẳng).
- Yêu cầu các status check sau phải xanh trước khi merge: `changes`, `test-core`, `test-ctd`, `docs` (job bị skip theo path filter vẫn tính là đạt). `test-web` (frontend `web/`) **chưa** bắt buộc trên `main`: chỉ thêm sau khi đồng bộ `staging → main`, vì nhánh mà workflow chưa có job `test-web` sẽ không bao giờ báo check này và PR kẹt ở "Expected — waiting" (job bị skip chỉ tính là đạt khi job có trong workflow).
- Chặn force-push và xoá nhánh.
- Không cần bypass list: `docs.yml` chỉ gắn tag `docs-v*` và tạo GitHub Release, không commit vào `main`.

## 4. Ruleset nhánh `staging`

- Yêu cầu status check `changes`, `test-core`, `test-ctd`, `test-web`, `docs` xanh (`test-web` bắt buộc từ 2026-10-09, sau khi PR 83 đưa job vào `staging`).
- `build-core` kiểm tra build arm64 trên pull request khi `core/**`, `web/**` hoặc `.dockerignore` đổi; PR không đăng nhập GHCR và không publish image. Job này không đổi điều kiện `deploy-core`, vốn chỉ chạy khi push.
- Chặn force-push và xoá nhánh.
- Không bắt buộc review, nhưng vì ruleset bắt buộc check nên **push thẳng commit mới vào `staging` bị từ chối** (commit chưa có check). Thực tế: đẩy lên nhánh tính năng → mở PR vào `staging` → merge khi CI xanh.
- Ruleset hiện có: `protect-main`, `protect-staging` (xem `gh api repos/tduong-p/ultimate-tckt/rulesets`).

## 5. Nhãn (Label)

- `no-docs-needed` — gắn vào PR khi thay đổi không cần cập nhật tài liệu, đi kèm dòng "Docs: không cần vì …" trong mô tả PR (xem `.github/pull_request_template.md`, và luật ở `AGENTS.md`). Kiểm tác động code→tài liệu chỉ chạy ở PR, nên nhãn này không cần lặp lại sau merge.
- `cross-module` — tạo nhãn này (màu tuỳ ý). Mẫu issue `.github/ISSUE_TEMPLATE/cross-module.md` ("Đề xuất thay đổi liên module") tự gắn nhãn; dùng khi việc chạm module khác hoặc hợp đồng dùng chung, đưa ra họp team (xem `docs/dev/ranh-gioi-module.md`).

## 6. GHCR (GitHub Container Registry)

- Ba package: `ultimate-tckt-core`, `ultimate-tckt-ctd-api`, `ultimate-tckt-noti` — đặt **Private**, không public. Package mới
  do CI tạo ở lần build đầu (`ultimate-tckt-noti` sau khi Noti merge vào `staging`); kiểm lại quyền ngay sau lần đầu đó.
- Workflow `ghcr-cleanup.yml` chạy định kỳ hàng tuần, giữ lại 40 phiên bản mới nhất mỗi package (`min-versions-to-keep: 40`), xoá bản cũ hơn. Staging và production dùng chung package nên phải giữ đủ nhiều để tag production (và tag trước đó để rollback) không bị xoá; image build với `provenance: false` để mỗi lần build chỉ tạo một phiên bản.

## 7. Kiểm tra sau khi cấu hình xong

- Push thử một commit nhỏ vào `staging` → CI chạy `test-core`/`test-web`/`test-ctd`/`test-noti` (tuỳ path filter), build image nếu liên quan, deploy nếu `DEPLOY_ENABLED=true`.
- Thử tạo PR vào `main` không đủ check → bị chặn merge.
- Thử push thẳng vào `main` → bị từ chối bởi ruleset.

## 8. GitHub App và ruleset cho bot repobot

- GitHub App `tckt-repobot`: không webhook; quyền Contents (read & write), Pull requests (read & write), Metadata
  (read); chỉ cài cho repo `ultimate-tckt`. Private key nằm trên VM (`docs/ops/repobot.md`), không ở đâu khác.
- Kênh thông báo của bot chỉ **đọc** qua App: danh sách PR, file và diff của PR, PR gắn với một commit — nằm trong
  quyền Pull requests/Contents ở trên, không cần thêm quyền hay webhook.
- Ruleset `bot-branches` (target `refs/heads/bot/**`): chặn tạo, cập nhật, xoá và force-push; bypass chỉ App
  `tckt-repobot` — người và agent khác không đẩy hay xoá được nhánh `bot/*`.
- App không nằm trong bypass của `protect-main`/`protect-staging`: bot chỉ mở PR vào `staging`, không push thẳng
  hay merge.

## Lịch sử phiên bản

| Version | Ngày | Thay đổi | Người |
|---|---|---|---|
| 1.0 | 2026-09-24 | Bản đầu (viết lại từ tài liệu cũ khi gộp monorepo) | DYC |
| 1.1 | 2026-09-24 | Ghi đúng ruleset đã tạo: thêm check `changes`, chặn xoá nhánh; staging bắt buộc check nên thay đổi đi qua PR | DYC |
| 1.2 | 2026-09-24 | Nhãn `no-docs-needed`: kiểm tác động chỉ ở PR | DYC |
| 1.3 | 2026-09-24 | Thêm `PROD_DEPLOY_ENABLED`; GHCR giữ 40 bản, build không provenance | DYC |
| 1.4 | 2026-09-24 | Thêm nhãn `cross-module` và mẫu issue đề xuất thay đổi liên module | DYC |
| 1.5 | 2026-09-27 | Thêm mục 8: GitHub App và ruleset `bot-branches` cho bot repobot | DYC |
| 1.6 | 2026-09-27 | Mục 8: App đọc PR/diff/commit cho kênh thông báo, không thêm quyền | DYC (soạn cùng Claude) |
| 1.7 | 2026-10-02 | Thêm package `ultimate-tckt-noti` và job `test-noti` | DYC |
| 1.8 | 2026-10-05 | Thêm biến repo `PROD_NOTI_ENABLED` | DYC |
| 1.9 | 2026-10-09 | Thêm job `test-web` (chưa nằm trong check bắt buộc của ruleset) | DYC |
| 1.10 | 2026-10-09 | `test-web` thành check bắt buộc của `protect-staging`; `protect-main` thêm sau khi đồng bộ `staging → main` | DYC |
| 1.11 | 2026-10-10 | Ghi job `build-core` kiểm tra arm64 trên PR mà không publish; deploy vẫn chỉ chạy khi push | DYC |
