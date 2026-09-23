---
doc_id: OPS-INC-001
title: Xử lý sự cố thường gặp
version: 1.0
status: active
audience: [dev, ops, ai]
owner: DYC
updated: 2026-09-24
related_code: []
---

# Xử lý sự cố thường gặp

Tài liệu này liệt kê các sự cố vận hành thường gặp trên VM và cách chẩn đoán nhanh. Dùng cùng `docs/playbooks/debug.md` khi cần tái hiện lỗi ở local.

## 1. Xem log một service

```bash
ssh ubuntu@168.107.68.32
cd /opt/ultimate-tckt/<staging|production>
docker compose -p ultimate-tckt-<env> --env-file infra/.env -f infra/compose/docker-compose.<env>.yml logs -f core
# đổi "core" thành core-db / ctd-api / ctd-db khi cần
```

Luôn chỉ định `-p ultimate-tckt-<env>` tường minh — hai môi trường là hai compose project khác tên trên cùng VM, thiếu `-p` dễ nhầm log của môi trường này với môi trường kia.

## 2. Container bị restart loop

- Xem log ngay trước lần restart gần nhất: `docker compose ... logs --tail 200 <service>`.
- Kiểm tra `.env` của môi trường (`/opt/ultimate-tckt/<env>/infra/.env`) có đủ biến bắt buộc không (`${VAR:?}` trong compose sẽ khiến container không lên nếu biến rỗng/thiếu) — đối chiếu với `infra/.env.example`.
- Với `core`: thiếu `CORE_SETTINGS_ENCRYPTION_KEY` hoặc `CORE_SESSION_SECRET` khiến container không khởi động được (xem `docs/ops/moi-truong.md`).
- Với `ctd-api`: kiểm `CTD_JWT_SECRET`, `DATABASE_URL` (ghép từ `CTD_DB_*`); môi trường không phải `dev` mà secret vẫn để mặc định sẽ bị chặn khởi động có chủ đích (xem `services/ctd-api/backend/app/config.py`).
- Database chưa sẵn sàng khi app khởi động: kiểm `core-db`/`ctd-db` đã `healthy`/đang chạy chưa trước khi kết luận lỗi ở app.

## 3. Lỗi nginx (`nginx -t` báo lỗi, hoặc trang không vào được)

- `infra/scripts/apply-infra.sh` luôn chạy `nginx -t` trước khi reload; nếu cú pháp sai, script dừng và **không** reload — dịch vụ đang chạy không bị ảnh hưởng, nhưng site mới chưa được áp dụng.
- Bản sao các site trước khi áp dụng được lưu ở `/opt/ultimate-tckt/backups/nginx-<ts>/` — đối chiếu để biết cấu hình cũ khác gì cấu hình mới đang lỗi.
- Kiểm chứng chỉ SSL còn hạn: `sudo certbot certificates`.
- Domain trả sai/không trả trang: kiểm DNS DuckDNS còn trỏ đúng IP VM, kiểm site trong `sites-enabled` có đúng symlink không (`ls -la /etc/nginx/sites-enabled/`).

## 4. Hết dung lượng đĩa

- Kiểm dung lượng: `df -h`.
- Nguyên nhân thường gặp: image Docker cũ tích luỹ (`docker image prune -f` — `deploy.sh` đã tự chạy sau mỗi lần deploy, nhưng có thể cần chạy tay `docker system df` / `docker system prune` khi cần dọn sâu hơn), hoặc backup ở `/opt/ultimate-tckt/backups/` tích luỹ bất thường (đối chiếu với chính sách giữ 14 bản ở `docs/ops/backup-restore.md`).
- Không chạy `docker system prune -a` hay bất kỳ lệnh có `-v`/xoá volume nào mà không kiểm tra kỹ — volume chứa dữ liệu thật (`core_mysql`, `ctd_postgres`, …).

## 5. Rollback về tag image cũ

```bash
ssh ubuntu@168.107.68.32
bash /opt/ultimate-tckt/<env>/infra/scripts/deploy.sh <staging|production> <core|ctd-api> <tag-cu>
```

Lấy `<tag-cu>` từ tab Actions (SHA rút gọn của lần build/deploy tốt gần nhất trước đó). Xem thêm `docs/playbooks/rollback.md` và mục rollback trong `docs/ops/chuyen-doi-ultimate-tckt.md` (khi rollback trong lúc chuyển đổi hạ tầng, không phải rollback một bản deploy thường).

## 6. Health check fail liên tục sau deploy

- `deploy.sh` tự thoát khác 0 nếu `/api/health` không trả 200 trong 60 giây — CI sẽ đỏ, không tự "coi như deploy thành công".
- Kiểm log app ngay sau `up -d` (mục 2) để biết đang lỗi kết nối DB, lỗi migration chưa chạy, hay lỗi khác.
- Nếu app cần migration DB chưa chạy (core: `npm run migrate`; ctd-api: Alembic) mà chưa chạy trước khi deploy code mới, app có thể lỗi ngay khi khởi động — xem `docs/dev/db-migration.md`.

## Lịch sử phiên bản

| Version | Ngày | Thay đổi | Người |
|---|---|---|---|
| 1.0 | 2026-09-24 | Bản đầu (viết lại từ tài liệu cũ khi gộp monorepo) | DYC |
