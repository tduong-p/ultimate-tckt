---
doc_id: OPS-DB-001
title: Truy cập database từ xa (chỉ đọc)
version: 1.1
status: active
audience: [dev, ops, ai]
owner: DYC
updated: 2026-09-26
related_code: [infra/scripts/create-core-readonly-user.sh]
---

# Truy cập database từ xa (chỉ đọc)

Tài liệu này hướng dẫn kết nối công cụ quản trị CSDL (DBeaver, DataGrip, VS Code Database Client…) tới MySQL của `core` an toàn — không mở port ra internet, chỉ có quyền `SELECT`.

## 1. Mô hình bảo mật

```
[ DBeaver (máy cá nhân) ]
      │ SSH Tunnel (port 22, khoá SSH)
      ▼
[ VM 168.107.68.32 ]
      │ chỉ bind 127.0.0.1:3306 (staging) / 127.0.0.1:3307 (production)
      ▼
[ container core-db (MySQL 8) ]
      Database: tên trong CORE_DB_NAME của .env môi trường đó
      User: user chỉ-đọc do create-core-readonly-user.sh tạo, quyền SELECT duy nhất
```

Nguyên tắc:

- Port MySQL không mở ra internet; firewall VM chỉ cho `22` (SSH), `80`, `443`.
- Muốn tới được `127.0.0.1:330x` trên VM, client bắt buộc phải xác thực SSH vào VM trước (SSH tunnel).
- User đọc riêng biệt với user ứng dụng (`CORE_DB_USER`) — chỉ có `SELECT`, không có quyền ghi/xoá/tạo bảng. Dù mật khẩu user đọc này bị lộ, dữ liệu vẫn không thể bị sửa/xoá qua đường này.
- Host pattern của user là `'%'` (không phải `'localhost'`) vì khi đi qua Docker port-forward, MySQL container thấy địa chỉ nguồn là gateway của Docker bridge, không phải `127.0.0.1` bên trong container.

## 2. Tạo hoặc cấp lại mật khẩu user chỉ đọc

```bash
ssh ubuntu@168.107.68.32
bash /opt/ultimate-tckt/<env>/infra/scripts/create-core-readonly-user.sh <staging|production> [username]
```

- Không truyền `username` → mặc định (script tự đặt, xem output khi chạy).
- Script hỏi mật khẩu: Enter để tự sinh mật khẩu ngẫu nhiên mạnh, hoặc tự nhập.
- Script tự: đọc mật khẩu root MySQL từ `.env` của môi trường (qua `infra/scripts/lib.sh`), tạo/cập nhật user với đúng quyền `SELECT` trên database của `core`, thu hồi mọi quyền khác, in thông tin kết nối.

Mật khẩu chỉ hiện một lần trên console — lưu vào password manager hoặc thẳng vào connection DBeaver, không ghi vào tài liệu hay chat.

## 3. Cấu hình DBeaver

**Tab Main:**

| Trường | Staging | Production |
|---|---|---|
| Host | `127.0.0.1` | `127.0.0.1` |
| Port | `3306` | `3307` |
| Database | tên DB core của môi trường đó | như staging |
| Username | user do script tạo | như staging |
| Password | mật khẩu ở bước 2 | như staging |

**Tab SSH:** tick **Use SSH Tunnel** — Host/IP `168.107.68.32`, Port `22`, User `ubuntu`, Authentication Method **Public Key**, Private Key = khoá SSH cá nhân của bạn (không phải deploy key của VM; tạo và xin cấp quyền theo [`ssh.md`](ssh.md)).

Bấm **Test Connection**. Nếu gặp lỗi `Public Key Retrieval is not allowed`, vào **Driver properties**, đặt `allowPublicKeyRetrieval = TRUE`.

## 4. Kiểm tra quyền

```sql
-- kỳ vọng: thành công
SELECT * FROM users LIMIT 1;

-- kỳ vọng: bị từ chối
UPDATE users SET is_active = 1 WHERE id = 1;
DROP TABLE users;
```

## 5. Xử lý sự cố

- **`Communications link failure` / `Connection refused`**: `core-db` chưa map port trên host, hoặc chưa `up`. Kiểm tra trên VM: `sudo ss -tulpn | grep 330<6|7>`. Khởi động lại nếu cần: `ut_compose <env> up -d core-db`.
- **`Access denied for user`**: sai mật khẩu hoặc user chưa tồn tại trên môi trường đó — chạy lại `create-core-readonly-user.sh <env>`.
- **Đổi mật khẩu hoặc xoá user**: chạy lại script (đổi mật khẩu), hoặc xoá thủ công qua `ut_compose <env> exec -T core-db mysql -uroot -p"$CORE_MYSQL_ROOT_PASSWORD" -e "DROP USER IF EXISTS '<user>'@'%';"`.

## 6. ctd-api (Postgres)

Hiện chưa có script tạo user chỉ đọc cho `ctd-db` (Postgres). `ctd-db` không map port ra host trong compose hiện tại — muốn truy vấn trực tiếp, dùng `ut_compose <env> exec -T ctd-db psql -U "$CTD_DB_USER" "$CTD_DB_NAME"` qua SSH (không qua DBeaver). Cần script/port riêng thì mở playbook thêm tính năng (`docs/playbooks/them-tinh-nang.md`).

## Lịch sử phiên bản

| Version | Ngày | Thay đổi | Người |
|---|---|---|---|
| 1.0 | 2026-09-24 | Bản đầu (viết lại từ tài liệu cũ khi gộp monorepo) | DYC |
| 1.1 | 2026-09-26 | Trỏ tới hướng dẫn SSH `ssh.md` | DYC |
