---
doc_id: PB-RB-001
title: Playbook — rollback
version: 1.0
status: active
audience: [dev, ai]
owner: DYC
updated: 2026-09-24
related_code: [infra/scripts/deploy.sh]
---

# Playbook — rollback

Tài liệu này giúp dev và AI agent lùi một môi trường (staging hoặc production) về phiên bản chạy tốt trước đó, ở ba mức: chỉ app image, cấu hình infra, hoặc dữ liệu.

## Khi nào dùng

Khi một bản deploy gây lỗi trên staging/production và cách nhanh nhất để khôi phục dịch vụ là lùi về bản trước, thay vì sửa code ngay (có thể sửa code sau, song song, theo [`hotfix-production.md`](hotfix-production.md) nếu là production).

## Các bước

### 1. Rollback image ứng dụng (`core` hoặc `ctd-api`)

Tìm tag image chạy tốt trước đó (12 ký tự đầu SHA commit, xem lịch sử Actions hoặc tag trên GHCR), rồi:

```bash
infra/scripts/deploy.sh <staging|production> <core|ctd-api> <tag-cu>
```

`deploy.sh` tự pull đúng tag, `up -d --no-deps` chỉ service đó, và chạy health check `http://127.0.0.1:<port>/api/health` — script tự thoát với exit code khác 0 nếu health check thất bại, không âm thầm coi là thành công.

### 2. Rollback cấu hình infra (compose/nginx)

Nếu lỗi đến từ thay đổi `infra/**` (compose, nginx) chứ không phải image ứng dụng:

```bash
git -C /opt/ultimate-tckt/<env> log --oneline -- infra/   # tìm commit infra trước đó
git -C /opt/ultimate-tckt/<env> checkout <commit-cu> -- infra/
infra/scripts/apply-infra.sh <env>
```

`apply-infra.sh` tự sao lưu cấu hình nginx đang dùng vào `$UT_ROOT/backups/nginx-<ts>/` trước khi áp bản mới, và từ chối reload nếu `nginx -t` báo lỗi cú pháp.

### 3. Rollback dữ liệu (restore từ backup)

Chỉ khi rollback image/infra không đủ (dữ liệu đã bị hỏng bởi migration hoặc thao tác sai) — xem quy trình đầy đủ ở [`../ops/backup-restore.md`](../ops/backup-restore.md). Đây là bước nặng nhất, **luôn backup bản hiện tại trước khi restore đè lên**, kể cả khi bản hiện tại đang lỗi.

## Kiểm tra xong

- [ ] Health check `/api/health` của service vừa rollback trả 200 sau khi `deploy.sh`/`apply-infra.sh` chạy xong.
- [ ] Xác nhận qua domain thật (`docs/ops/su-co.md`) rằng lỗi ban đầu đã hết.
- [ ] Nếu đã rollback dữ liệu: xác nhận số dòng bảng chính (tương tự lệnh đếm trong `docs/ops/chuyen-doi-ultimate-tckt.md`) khớp với kỳ vọng, không bị thiếu do restore nhầm bản backup.
- [ ] Ghi lại trong PR/issue theo dõi: tag/commit đã rollback về, lý do, và kế hoạch fix-forward nếu cần.

## Tài liệu phải cập nhật

- `docs/ops/su-co.md` nếu sự cố dẫn đến rollback là dạng mới chưa từng ghi.
- ADR mới nếu rollback kéo theo đảo ngược một quyết định kiến trúc/hạ tầng đã ghi trong `docs/adr/`.

## Lịch sử phiên bản

| Version | Ngày | Thay đổi | Người |
|---|---|---|---|
| 1.0 | 2026-09-24 | Bản đầu (viết lại từ tài liệu cũ khi gộp monorepo) | DYC |
