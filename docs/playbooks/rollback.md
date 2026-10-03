---
doc_id: PB-RB-001
title: Playbook — rollback
version: 1.2
status: active
audience: [dev, ai]
owner: DYC
updated: 2026-10-03
related_code: [infra/scripts/deploy.sh]
---

# Playbook — rollback

Tài liệu này giúp dev và AI agent lùi một môi trường (staging hoặc production) về phiên bản chạy tốt trước đó, ở ba mức: chỉ app image, cấu hình infra, hoặc dữ liệu.

## Khi nào dùng

Khi một bản deploy gây lỗi trên staging/production và cách nhanh nhất để khôi phục dịch vụ là lùi về bản trước, thay vì sửa code ngay (có thể sửa code sau, song song, theo [`hotfix-production.md`](hotfix-production.md) nếu là production).

## Các bước

### 1. Rollback image ứng dụng (`core`, `ctd-api` hoặc `noti`)

Các lệnh dưới đây chạy **trên VM** (SSH vào, xem [`../ops/deploy-va-nhanh.md`](../ops/deploy-va-nhanh.md) mục 5), từ thư mục nào cũng được: dùng đường dẫn tuyệt đối, vì `infra/scripts/` chỉ tồn tại bên trong thư mục môi trường.

Tìm tag image chạy tốt trước đó (12 ký tự đầu SHA commit, xem lịch sử Actions hoặc tag trên GHCR; với đợt phát hành, tag cũ đã được ghi lại ở bước chuẩn bị, mục 7.2 của tài liệu trên), rồi:

```bash
bash /opt/ultimate-tckt/<staging|production>/infra/scripts/deploy.sh <staging|production> <core|ctd-api|noti> <tag-cu>   # noti: chỉ staging
```

`deploy.sh` tự pull đúng tag, `up -d --no-deps` chỉ service của app đó (`noti` = `noti-api` + `noti-worker`), và chạy health check `http://127.0.0.1:<port>/api/health` (Noti: `:8100/v1/health`) — script tự thoát với exit code khác 0 nếu health check thất bại, không âm thầm coi là thành công. Nó **không** tự lùi khi health check lỗi: container lỗi vẫn nằm đó cho tới khi bạn deploy lại một tag tốt.

**Lùi image không lùi dữ liệu.** Theo luật pilot (SPEC-PILOT-001 §9.3) migration của Core chỉ thêm bảng/cột nên bản Core cũ chạy được trên DB đã migrate; không cần restore DB chỉ vì lùi image (trừ khi migration của bản đó phá luật này). Lùi `ctd-api` về bản trước khi sửa seed admin (#54) thì mỗi lần khởi động seed lại đặt mật khẩu admin CTD về mật khẩu mặc định công khai: chỉ lùi khi thật cần, rồi đặt lại mật khẩu bằng `python -m app.seeds.set_password` (xem mục 7.5 và 7.6 của tài liệu trên). Nếu `main` vẫn chứa bản lỗi, lần push sau lên `main` sẽ deploy lại bản lỗi: tạm tắt biến repo `PROD_DEPLOY_ENABLED` hoặc sửa tiến theo [`hotfix-production.md`](hotfix-production.md).

### 2. Rollback cấu hình infra (compose/nginx)

Nếu lỗi đến từ thay đổi `infra/**` (compose, nginx) chứ không phải image ứng dụng:

```bash
git -C /opt/ultimate-tckt/<env> log --oneline -- infra/   # tìm commit infra trước đó
git -C /opt/ultimate-tckt/<env> checkout <commit-cu> -- infra/
bash /opt/ultimate-tckt/<env>/infra/scripts/apply-infra.sh <env>
```

`apply-infra.sh` tự sao lưu cấu hình nginx đang dùng vào `$UT_ROOT/backups/nginx-<ts>/` trước khi áp bản mới, và từ chối reload nếu `nginx -t` báo lỗi cú pháp.

Đây chỉ là biện pháp tạm: thư mục `infra/` trên VM thành "đã sửa tay", mà `apply-infra.sh` và `deploy.sh` đều chạy `git pull --ff-only` nên sẽ từ chối nếu commit mới cũng đổi các file đó. Sau sự cố, đưa bản đúng vào git bằng PR (revert commit infra gây lỗi), rồi trên VM chạy `git -C /opt/ultimate-tckt/<env> checkout HEAD -- infra/` để bỏ thay đổi tay trước khi pull.

### 3. Rollback dữ liệu (restore từ backup)

Chỉ khi rollback image/infra không đủ (dữ liệu đã bị hỏng bởi migration hoặc thao tác sai) — xem quy trình đầy đủ ở [`../ops/backup-restore.md`](../ops/backup-restore.md). Đây là bước nặng nhất, **luôn backup bản hiện tại trước khi restore đè lên**, kể cả khi bản hiện tại đang lỗi. Nếu DB đã chạy migration mới hơn bản backup (có bảng hoặc marker mà bản backup không có), restore đè lên DB đang có để lại các bảng thừa đó: tạo lại DB trống rồi mới nạp dump — trình tự đầy đủ, kèm kiểm tra, ở [`../ops/deploy-va-nhanh.md`](../ops/deploy-va-nhanh.md) mục 7.6.

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
| 1.1 | 2026-10-02 | Rollback Noti (staging) | DYC |
| 1.2 | 2026-10-03 | Lệnh dùng đường dẫn tuyệt đối trên VM; lùi image không lùi dữ liệu; cảnh báo `infra/` bị sửa tay; restore vào DB sạch khi DB đã migrate | DYC |
