---
doc_id: ADR-0014-001
title: Service Noti — gửi thông báo email theo template qua HTTP API
version: 1.0
status: active
audience: [dev, ai]
owner: DYC
updated: 2026-10-02
supersedes: 0004
related_code: [docs/specs/2026-10-02-noti-service-design.md, docs/specs/2026-10-02-noti-service-plan.md]
---

# Service Noti — gửi thông báo email theo template qua HTTP API

Ghi lại quyết định xây dựng service Noti độc lập thay thế cho Email Rule Engine trong Core (ADR-0004).

## Bối cảnh

- ADR-0004 mô tả Email Rule Engine + Cron runner trong Core, nhưng kiến trúc này chỉ tồn tại ở nhánh cũ `archive/gd1a-staging` và chưa từng có trên `staging`/`main`.
- ADR-0013 đã gỡ bỏ module email cũ và OneSignal khỏi Core, đưa toàn bộ điểm phát thông báo ngoài ứng dụng về facade duy nhất `core/src/notifier.js` (tạm thời chưa gửi gì ra ngoài).
- Nền tảng đa đơn vị (TCKT, CTD, các đơn vị và module tương lai) cần một kênh gửi thông báo thống nhất, có template tiếng Việt chuẩn hoá, hàng đợi tin cậy, retry có backoff, chống gửi trùng, hỗ trợ nhiều driver gửi mail (console, SMTP, Microsoft Graph API).

## Quyết định

1. **Xây dựng service Noti riêng biệt** (`services/noti-api/`) với stack Python/FastAPI + Postgres + Alembic, theo khuôn tương tự `services/ctd-api/backend`.
2. **Giao tiếp qua HTTP API v1**: Các module khác (Core, CTD...) chỉ gọi API kèm `template + data + recipients + dedupe_key`; Noti quản lý template tiếng Việt trong code repo, xếp hàng trên Postgres, gửi qua worker độc lập, retry backoff và ghi nhận kết quả.
3. **Thay thế ADR-0004**: Không đưa Rule Engine phức tạp vào Core. Mọi thông báo ngoài ứng dụng quy tụ về service Noti.
4. **Hạ tầng**: Chạy trong mạng compose nội bộ, 1 container image phục vụ 2 tiến trình (`api` và `worker`), sử dụng chung cluster Postgres sẵn có với database `noti` riêng biệt.

## Hệ quả

- Core và các service khác không phải tự quản lý driver email, kết nối SMTP/Graph hay cơ chế retry.
- Cần bổ sung cấu hình hạ tầng mới: database `noti`, dịch vụ `noti-api` và `noti-worker` trong Docker Compose, biến môi trường `NOTI_*` trên VM, và pipeline CI cho `services/noti-api`. Các công việc hạ tầng này được tách thành issue liên module để họp team trước khi triển khai (theo `AGENTS.md` §3).
- Chi tiết thiết kế và kế hoạch triển khai được quy định tại [SPEC-NOTI-001](../specs/2026-10-02-noti-service-design.md) và [PLAN-NOTI-001](../specs/2026-10-02-noti-service-plan.md).

## Lịch sử phiên bản

| Version | Ngày | Thay đổi | Người |
|---|---|---|---|
| 1.0 | 2026-10-02 | Bản đầu, thay thế ADR-0004 theo quyết định tách service Noti | DYC |
