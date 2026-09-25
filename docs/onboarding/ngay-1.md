---
doc_id: ONB-D1-001
title: Onboarding — ngày 1
version: 1.2
status: active
audience: [onboarding, dev]
owner: DYC
updated: 2026-09-26
related_code: []
---

# Onboarding — ngày 1

Tài liệu này giúp người mới (dev) có môi trường chạy được và test xanh ngay trong ngày đầu tiên.

## 1. Quyền cần xin trước

- **GitHub**: quyền `collaborator` (tối thiểu `write`) trên repo `tduong-p/ultimate-tckt` (private) — xin trực tiếp chủ repo.
- **VM** (chỉ cần nếu việc của bạn liên quan hạ tầng/deploy, không cần cho dev thuần tính năng): SSH access — xin người quản lý hạ tầng thêm public key SSH của bạn vào VM — các bước ở [`../ops/ssh.md`](../ops/ssh.md). Không xin private key của người khác.
- Không cần quyền gì trên Oracle Cloud/DuckDNS/Azure ở ngày đầu trừ khi việc của bạn là hạ tầng — xem [`ban-giao.md`](ban-giao.md) nếu cần danh sách đầy đủ.

## 2. Clone và cài đặt

```bash
git clone https://github.com/tduong-p/ultimate-tckt.git
cd ultimate-tckt
```

Xem hướng dẫn chạy local đầy đủ (biến môi trường, DB local, lệnh dev server) ở [`../dev/chay-local.md`](../dev/chay-local.md) — tài liệu này không lặp lại chi tiết đó.

## 3. Cài Superpowers cho AI agent của bạn (bắt buộc)

Repo bắt buộc mọi AI agent làm theo quy trình Superpowers — đọc mục 1 của `AGENTS.md` ở gốc repo.

- Claude Code: mở repo, chấp nhận plugin `superpowers@claude-plugins-official` khi được hỏi (khai báo trong `.claude/settings.json`).
- Antigravity: `agy plugin install https://github.com/obra/superpowers`.
- Codex: cài plugin Superpowers từ marketplace (`/plugins`).
- Agent khác: dùng bản vendored ở `.agents/skills/` (bắt đầu từ `.agents/skills/using-superpowers/SKILL.md`).

Đọc thêm [`../dev/ranh-gioi-module.md`](../dev/ranh-gioi-module.md): việc trong một module thì làm luôn, việc liên module phải raise họp team.

## 4. Chạy test — xác nhận môi trường đã đúng

```bash
# Core (cần MySQL local)
cd core && npm test

# CTD (cần PostgreSQL local)
cd services/ctd-api/backend && .venv/bin/pytest

# Tooling + docs-check (từ thư mục gốc repo)
npm run test:tools
npm run docs:check
```

Nếu cả ba lệnh trên xanh, môi trường của bạn đã sẵn sàng để bắt đầu code. Nếu có lỗi, kiểm lại `../dev/chay-local.md` trước khi hỏi người khác — phần lớn lỗi ngày đầu là thiếu biến `.env` hoặc DB local chưa đúng quyền.

## 5. Đọc gì tiếp theo

Sang ngày thứ hai trở đi, xem thứ tự đọc tài liệu và việc nhỏ đầu tiên ở [`tuan-1.md`](tuan-1.md).

## Lịch sử phiên bản

| Version | Ngày | Thay đổi | Người |
|---|---|---|---|
| 1.0 | 2026-09-24 | Bản đầu (viết lại từ tài liệu cũ khi gộp monorepo) | DYC |
| 1.1 | 2026-09-24 | Thêm bước cài Superpowers bắt buộc và quy tắc ranh giới module | DYC |
| 1.2 | 2026-09-26 | Trỏ tới hướng dẫn SSH `ops/ssh.md` | DYC |
