---
doc_id: PB-HOT-001
title: Playbook — hotfix production
version: 1.4
status: active
audience: [dev, ai]
owner: DYC
updated: 2026-10-05
related_code: [.github/workflows/deploy.yml]
---

# Playbook — hotfix production

Tài liệu này giúp dev và AI agent xử lý một lỗi khẩn cấp trên **production** mà không đợi được luồng bình thường (`staging` → PR → `main`), và quan trọng nhất là **không để `staging` bị lệch lùi so với `main`** sau khi hotfix xong.

## Khi nào dùng

Chỉ khi lỗi đang ảnh hưởng người dùng thật trên production (`tckt-hub.duckdns.org`, `ctd-hoso.duckdns.org`) và không thể đợi chu kỳ merge `staging → main` bình thường. Nếu lỗi cũng tái hiện ở staging và chưa gây ảnh hưởng thật ở production, dùng luồng thường: sửa trên `staging` → PR vào `staging` → PR `staging → main`.

## Các bước

1. **Xác nhận thật sự cần hotfix** — không phải mọi lỗi production đều cần bỏ qua luồng thường; ưu tiên [`rollback.md`](rollback.md) trước nếu chỉ cần lùi về bản chạy tốt trước đó thay vì sửa code ngay.
2. **Tạo nhánh từ `main`** (không phải từ `staging`):
   ```bash
   git checkout main && git pull
   git checkout -b hotfix/<mo-ta-ngan>
   ```
3. **Sửa tối thiểu** — chỉ sửa đúng phần gây sự cố, không tiện tay dọn dẹp/refactor thêm trong cùng hotfix.
4. **Viết/chạy test tái hiện lỗi** theo [`sua-loi.md`](sua-loi.md) — kể cả hotfix cũng không được bỏ qua bước này.
5. **Mở PR từ `hotfix/<mo-ta-ngan>` vào `main`** (không vào `staging`). CI (`deploy.yml`) chạy `test-core`/`test-ctd`/`test-noti` theo path filter như bình thường (Noti production chỉ deploy khi biến repo `PROD_NOTI_ENABLED` bật); ruleset `main` vẫn yêu cầu PR + check xanh, không có đường tắt bỏ qua CI.
6. **Merge vào `main`** → CI tự build + deploy production (nếu `DEPLOY_ENABLED=true` và `PROD_DEPLOY_ENABLED=true`). Theo dõi health check qua `docs/ops/su-co.md`.
7. **Merge ngược `main → staging` bằng PR ngay sau khi hotfix đã lên production** — bắt buộc, để `staging` không bị lệch lùi. Ruleset `protect-staging` chặn push thẳng (xem `docs/ops/github.md` mục 4), nên đi qua một nhánh đồng bộ:
   ```bash
   git fetch origin
   git switch -c "sync/main-to-staging-$(date +%Y%m%d)" origin/staging
   git merge --no-ff origin/main
   git push -u origin HEAD
   ```
   Mở PR từ nhánh `sync/main-to-staging-<ngày>` vào `staging` và merge bằng **merge commit** (không squash, không rebase — squash làm `main` lại có commit mà `staging` không có).
8. Nếu bước 7 có xung đột, giải quyết ngay trong nhánh đồng bộ (sửa, `git add`, `git commit`) rồi mới push — không được bỏ qua bước merge ngược này dù xung đột khó.

## Kiểm tra xong

- [ ] PR hotfix merge vào `main` qua CI xanh (`test-core`/`test-ctd`/`docs` theo ruleset), không bypass check.
- [ ] Health check `/api/health` của app bị ảnh hưởng đã xanh trên production sau deploy.
- [ ] PR đồng bộ đã merge vào `staging` — sau `git fetch origin`, `git log origin/staging..origin/main` phải rỗng.
- [ ] Test tái hiện lỗi tồn tại trong bộ test, không chỉ sửa tay rồi xoá.

## Tài liệu phải cập nhật

- Tài liệu mô tả hành vi bị lỗi (BA hoặc dev) nếu hotfix thay đổi hành vi nghiệp vụ.
- `docs/ai/bay-da-gap.md` nếu lỗi có thể lặp lại ở chỗ khác.
- `docs/ops/su-co.md` nếu sự cố này là một dạng mới chưa từng ghi trong danh sách xử lý sự cố.

## Lịch sử phiên bản

| Version | Ngày | Thay đổi | Người |
|---|---|---|---|
| 1.0 | 2026-09-24 | Bản đầu (viết lại từ tài liệu cũ khi gộp monorepo) | DYC |
| 1.1 | 2026-09-24 | Deploy production cần cả `PROD_DEPLOY_ENABLED` | DYC |
| 1.2 | 2026-10-02 | Thêm `test-noti`; Noti chưa deploy production | DYC |
| 1.3 | 2026-10-03 | Merge ngược `main → staging` qua PR từ nhánh đồng bộ (ruleset chặn push thẳng `staging`); kiểm bằng `origin/` | DYC |
| 1.4 | 2026-10-05 | Noti production deploy theo `PROD_NOTI_ENABLED` | DYC |
