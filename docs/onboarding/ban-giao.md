---
doc_id: ONB-HO-001
title: Onboarding — bàn giao
version: 1.1
status: active
audience: [onboarding, dev]
owner: DYC
updated: 2026-09-24
related_code: []
---

# Onboarding — bàn giao

Tài liệu này giúp người rời dự án và người kế nhiệm bàn giao đầy đủ quyền truy cập và biết bí mật (secret) nằm ở đâu — **không ghi bất kỳ giá trị bí mật/mật khẩu nào**, kể cả mật khẩu mặc định dùng cho môi trường dev. Viết lại từ tài liệu bàn giao CTD cũ (`BAN-GIAO-DEV-TEAM.md`), đã bỏ toàn bộ giá trị nhạy cảm và cập nhật theo tên hạ tầng mới (`ultimate-tckt`).

## 1. Bí mật nằm ở đâu (chỉ ghi vị trí, không ghi giá trị)

- **GitHub Environment secrets** (`staging`, `production`): `SSH_HOST`, `SSH_USER`, `SSH_PRIVATE_KEY` — xem/đổi tại Settings → Environments trên GitHub, cần quyền admin repo. Chi tiết cấu hình: [`../ops/github.md`](../ops/github.md).
- **`.env` thật trên VM**: `/opt/ultimate-tckt/<staging|production>/infra/.env`, quyền file `600`. Chứa mật khẩu DB, `CORE_SESSION_SECRET`, `CORE_SETTINGS_ENCRYPTION_KEY`, `CTD_JWT_SECRET`… (danh sách đầy đủ biến — không phải giá trị — ở `infra/.env.example`).
- **Deploy key SSH** (VM đọc GitHub): private key nằm trên chính VM (`~/.ssh/ultimate_tckt_deploy`), public key đã đăng ký ở GitHub → Settings → Deploy keys (chỉ đọc). Xem [`../ops/vps.md`](../ops/vps.md) mục 3.
- **Tài khoản DuckDNS** — quản lý 4 tên miền (`tckt-hub(-staging)`, `ctd-hoso(-staging)`). Không có secret trong repo; chỉ có tài khoản đăng nhập trên duckdns.org.
- **Tài khoản Oracle Cloud** — chủ sở hữu VM (`168.107.68.32`). Không có secret trong repo; quyền truy cập là quyền trên Oracle Cloud Console.
- **Azure App Registration** — Core dùng cho đăng nhập Microsoft SSO (`/auth/microsoft`, tenant mặc định `hust.edu.vn`; biến `AZURE_TENANT`, `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`, `AZURE_REDIRECT_URI` trong `core/src/config/environment.js`). Nếu không cấu hình, route trả 503. Client secret nằm trong Azure Portal và `.env` trên VM, không nằm trong repo.

**Không nơi nào trong danh sách trên chấp nhận secret bị commit vào repo hay ghi vào bất kỳ tài liệu nào** — xem `docs/ai/bat-bien.md` mục 2.

## 2. Checklist bàn giao quyền truy cập

Khi có người rời dự án hoặc đổi thế hệ dev team, thực hiện đủ các mục sau — không chỉ đổi mật khẩu mà phải **thu hồi quyền của người rời đi**:

### GitHub
- [ ] Gỡ người rời dự án khỏi danh sách collaborator/team của repo `tduong-p/ultimate-tckt`.
- [ ] Thêm người kế nhiệm với đúng mức quyền cần (không mặc định cấp `admin`).
- [ ] Nếu người rời dự án có quyền admin repo (có thể tự xem/đổi secret): xoay vòng (rotate) toàn bộ Environment secrets (`SSH_HOST` không đổi vì là IP VM, nhưng `SSH_PRIVATE_KEY` phải đổi cặp khoá mới).

### VM (Oracle Cloud)
- [ ] Gỡ public key SSH của người rời dự án khỏi `~/.ssh/authorized_keys` trên VM.
- [ ] Nếu người rời dự án từng có quyền `sudo`/root trên VM: đổi mật khẩu root/console truy cập Oracle Cloud (không phải secret trong repo, thao tác trên Oracle Cloud Console).
- [ ] Xoay vòng cặp khoá deploy key (`~/.ssh/ultimate_tckt_deploy` trên VM + public key trên GitHub Deploy keys) nếu nghi ngờ private key từng bị lộ ra ngoài VM.

### DuckDNS
- [ ] Đổi mật khẩu tài khoản DuckDNS quản lý 4 domain nếu người rời dự án có quyền truy cập trực tiếp tài khoản (không phải chỉ biết domain).

### Oracle Cloud
- [ ] Gỡ người rời dự án khỏi danh sách user/nhóm IAM có quyền truy cập compartment chứa VM.
- [ ] Xoay vòng bất kỳ API key/Access key Oracle Cloud nào người đó từng có quyền tạo/xem.

### Azure App Registration (Microsoft SSO của Core)
- [ ] Xoay vòng client secret của App Registration nếu người rời dự án có quyền xem/tạo secret đó trong Azure Portal.
- [ ] Gỡ quyền của người rời dự án khỏi Azure AD tenant/App Registration liên quan.

### Sau khi xoay vòng bất kỳ secret nào ở trên
- [ ] Cập nhật giá trị mới vào đúng nơi lưu trữ tương ứng (GitHub Environment secret, hoặc `/opt/ultimate-tckt/<env>/infra/.env` trên VM) — **không ghi giá trị mới vào bất kỳ file nào trong repo hay tài liệu**.
- [ ] Deploy lại/restart service liên quan để áp secret mới (xem [`../ops/deploy-va-nhanh.md`](../ops/deploy-va-nhanh.md)).
- [ ] Xác nhận health check `/api/health` của cả `core` và `ctd-api` vẫn xanh sau khi xoay vòng.

## 3. Bàn giao kiến thức nghiệp vụ/kỹ thuật

Không lặp lại nội dung — trỏ người kế nhiệm tới:
- Đọc theo thứ tự ở [`tuan-1.md`](tuan-1.md).
- Việc còn dang dở (nếu có) ghi trong issue tracker của GitHub repo, không ghi trong tài liệu tĩnh này (dễ lỗi thời).
- Việc còn lại của GĐ1 chia theo lane (ai sở hữu gì, phụ thuộc gì): [`../specs/2026-09-24-gd1-phan-lane.md`](../specs/2026-09-24-gd1-phan-lane.md). Nhận lane nào thì làm trong module của lane đó; chạm lane khác → raise theo [`../dev/ranh-gioi-module.md`](../dev/ranh-gioi-module.md).

## Lịch sử phiên bản

| Version | Ngày | Thay đổi | Người |
|---|---|---|---|
| 1.0 | 2026-09-24 | Bản đầu (viết lại từ tài liệu cũ khi gộp monorepo, bỏ toàn bộ mật khẩu/secret) | DYC |
| 1.1 | 2026-09-24 | Mục 3 trỏ tới tài liệu phân lane GĐ1 và quy tắc ranh giới module | DYC |
