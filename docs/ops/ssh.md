---
doc_id: OPS-SSH-001
title: SSH vào VM — khoá cá nhân và cấp quyền
version: 1.0
status: active
audience: [dev, ops, ai, onboarding]
owner: DYC
updated: 2026-09-26
related_code: [infra/scripts/lib.sh]
---

# SSH vào VM — khoá cá nhân và cấp quyền

Tài liệu này hướng dẫn một người (dev/ops) có quyền SSH **cá nhân** vào VM: tạo khoá, xin cấp quyền, cấu hình
máy mình, kết nối và xử lý lỗi thường gặp. Chỉ cần nếu việc của bạn chạm hạ tầng/deploy/DB — dev thuần tính năng
không cần.

## 1. Ba loại khoá SSH trong dự án — đừng nhầm

| Khoá | Ai giữ private key | Dùng để | Tài liệu |
|---|---|---|---|
| **Khoá cá nhân** | Máy của từng người | Người SSH vào VM, SSH tunnel DBeaver | tài liệu này |
| **Khoá CI** | GitHub Environment secret `SSH_PRIVATE_KEY` | GitHub Actions SSH vào VM để deploy | [`github.md`](github.md) |
| **Deploy key** | Trên VM (`~/.ssh/ultimate_tckt_deploy`) | VM đọc (pull) repo GitHub, chỉ đọc | [`vps.md`](vps.md) mục 3 |

Mỗi người một khoá cá nhân riêng. Không dùng chung khoá, không xin/gửi private key của người khác, không dùng khoá
CI hay deploy key để đăng nhập tay.

## 2. Tạo khoá cá nhân (trên máy bạn)

```bash
ssh-keygen -t ed25519 -C "ten-ban@ultimate-tckt" -f ~/.ssh/ultimate_tckt
```

- Đặt passphrase (khuyến nghị). macOS: thêm `UseKeychain yes` ở mục 4 để không phải gõ lại.
- Windows: chạy cùng lệnh trong PowerShell (OpenSSH có sẵn trên Windows 10+), khoá nằm ở `%USERPROFILE%\.ssh\`.
- Kết quả: `~/.ssh/ultimate_tckt` (private — **không bao giờ gửi đi**) và `~/.ssh/ultimate_tckt.pub` (public).

## 3. Xin cấp quyền

Gửi **nội dung file `.pub`** cho người quản lý hạ tầng (qua kênh nội bộ của team; public key không phải secret):

```bash
cat ~/.ssh/ultimate_tckt.pub
```

Người quản lý hạ tầng (đã SSH được vào VM) thêm key vào user `ubuntu`:

```bash
echo 'ssh-ed25519 AAAA... ten-ban@ultimate-tckt' >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

Giữ comment cuối dòng (`ten-ban@...`) để sau này biết key của ai mà gỡ — xem [`../onboarding/ban-giao.md`](../onboarding/ban-giao.md)
khi có người rời dự án.

## 4. Cấu hình `~/.ssh/config` (trên máy bạn)

```
Host ut-vm
  HostName 168.107.68.32
  User ubuntu
  IdentityFile ~/.ssh/ultimate_tckt
  IdentitiesOnly yes
  ServerAliveInterval 60
  # macOS: nhớ passphrase trong Keychain
  AddKeysToAgent yes
  UseKeychain yes
```

Trên Linux/Windows bỏ dòng `UseKeychain` (tuỳ chọn chỉ có trên macOS, máy khác sẽ báo lỗi).

## 5. Kết nối

```bash
ssh ut-vm
```

Lần đầu SSH hỏi xác nhận fingerprint của VM — gõ `yes`. Sau đó mọi lệnh trong tài liệu khác dạng
`ssh ubuntu@168.107.68.32` đều có thể thay bằng `ssh ut-vm`.

Một số việc hay làm sau khi vào VM:

```bash
cd /opt/ultimate-tckt/staging          # hoặc production — bố cục ở vps.md mục 2
source infra/scripts/lib.sh
ut_compose staging ps                  # xem container của môi trường
ut_compose staging logs --tail 100 core
```

Production là dữ liệu thật: chỉ đọc/xem log trừ khi được giao rõ ràng; không xoá volume/stack (luật ở `AGENTS.md` mục 5).
Xử lý sự cố cụ thể: [`su-co.md`](su-co.md).

SSH tunnel để mở DB bằng DBeaver dùng chính khoá cá nhân này — xem [`truy-cap-db.md`](truy-cap-db.md).

## 6. Lỗi thường gặp

| Triệu chứng | Nguyên nhân hay gặp | Cách xử lý |
|---|---|---|
| `Permission denied (publickey)` | Key chưa được thêm vào `authorized_keys`, hoặc SSH dùng nhầm khoá | Kiểm tra với `ssh -v ut-vm` xem khoá nào được thử; đảm bảo có `IdentitiesOnly yes`; nhờ người quản lý kiểm tra `authorized_keys` |
| `UNPROTECTED PRIVATE KEY FILE` | Quyền file private key quá rộng | `chmod 600 ~/.ssh/ultimate_tckt` |
| `Bad configuration option: usekeychain` | Dòng `UseKeychain` trên máy không phải macOS | Xoá dòng đó khỏi `~/.ssh/config` |
| `Connection timed out` | Mạng chặn cổng 22 (wifi công cộng/công ty) hoặc VM đang tắt | Thử mạng khác; hỏi người quản lý hạ tầng tình trạng VM |
| `REMOTE HOST IDENTIFICATION HAS CHANGED` | VM được cài lại, hoặc có tấn công MITM | **Không** tự bỏ qua — hỏi người quản lý hạ tầng xác nhận VM có cài lại không; nếu có mới chạy `ssh-keygen -R 168.107.68.32` |

## 7. Thu hồi quyền

Khi một người rời dự án hoặc nghi lộ khoá: xoá đúng dòng key của người đó trong `~/.ssh/authorized_keys` trên VM
(nhận diện bằng comment). Checklist đầy đủ khi bàn giao ở [`../onboarding/ban-giao.md`](../onboarding/ban-giao.md).

## Lịch sử phiên bản

| Version | Ngày | Thay đổi | Người |
|---|---|---|---|
| 1.0 | 2026-09-26 | Bản đầu: khoá cá nhân, cấp quyền, `~/.ssh/config`, lỗi thường gặp | DYC |
