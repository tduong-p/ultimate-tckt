# Bản đồ tài liệu

> File này được sinh bởi `npm run docs:index` từ frontmatter. Không sửa tay.
> Đọc `AGENTS.md` ở gốc repo để biết quy tắc cập nhật tài liệu.

## adr

| Tài liệu | Tiêu đề | Version | Trạng thái | Đối tượng |
|---|---|---|---|---|
| [ADR-0001-001](adr/0001-hub-stack-node-express-mysql.md) | Stack Hub — Node 22/Express 5 + MySQL 8, frontend vanilla | 1.0 | active | dev, ai |
| [ADR-0002-001](adr/0002-rbac-5-role-tckt-self-log.md) | RBAC 5 vai trò TCKT và cơ chế tự log công việc | 1.0 | active | dev, ai |
| [ADR-0003-001](adr/0003-frontend-minimalist-ui-production.md) | Hệ thống frontend sản xuất — minimalist UI cho toàn bộ Hub | 1.0 | active | dev, ai |
| [ADR-0004-001](adr/0004-email-rule-engine-cron-devops.md) | Email Rule Engine + Cron runner tổng quát + quyền devops | 1.0 | active | dev, ai |
| [ADR-0005-001](adr/0005-ctd-fastapi-postgres-alembic.md) | CTD — FastAPI + Postgres + Alembic, luồng xét duyệt hồ sơ | 1.0 | active | dev, ai |
| [ADR-0006-001](adr/0006-infra-1-vm-2-env-ghcr-nginx-certbot.md) | Hạ tầng — một VM Oracle arm64, hai môi trường, GHCR, nginx + certbot | 1.0 | active | dev, ai |
| [ADR-0007-001](adr/0007-nen-tang-da-don-vi-d1-d9.md) | Nền tảng đa đơn vị — quyết định kiến trúc D1–D9 | 1.1 | active | dev, ai |
| [ADR-0008-001](adr/0008-quyen-ctd-tckt-to-pho-tro-len.md) | Quyền CTD của TCKT — từ tổ phó trở lên | 1.0 | active | dev, ai |
| [ADR-0009-001](adr/0009-monorepo-ultimate-tckt-bat-dau-sach.md) | Monorepo ultimate-tckt — bắt đầu sạch | 1.0 | active | dev, ai |
| [ADR-0010-001](adr/0010-checkout-theo-moi-truong-ci-ssh.md) | Checkout VM theo môi trường, CI SSH deploy, test chặn deploy | 1.0 | active | dev, ai |
| [ADR-0011-001](adr/0011-doi-ten-seee-sang-ultimate-tckt.md) | Đổi tên hạ tầng seee → ultimate-tckt-*, chuyển volume | 1.0 | active | dev, ai |
| [ADR-0012-001](adr/0012-he-thong-tai-lieu-markdown-version-ci.md) | Hệ thống tài liệu Markdown có version, kiểm bằng CI | 1.0 | active | dev, ai |
| [ADR-0013-001](adr/0013-go-email-cu-va-onesignal.md) | Gỡ module email cũ và OneSignal khỏi Core | 1.0 | active | dev, ai |
| [ADR-0014-001](adr/0014-noti-service.md) | Service Noti — gửi thông báo email theo template qua HTTP API | 1.0 | active | dev, ai |
| [ADR-0015-001](adr/0015-poc-frontend-react-atlaskit.md) | Cho phép xây dựng POC frontend React + Atlaskit | 1.0 | active | dev, ai |
| [ADR-0016-001](adr/0016-web-thay-the-frontend-core.md) | web/ (React + Atlaskit) thay thế frontend Core tại / | 1.0 | active | dev, ai, ops |

## ai

| Tài liệu | Tiêu đề | Version | Trạng thái | Đối tượng |
|---|---|---|---|---|
| [AI-INV-001](ai/bat-bien.md) | Bất biến — điều không được phá | 4.5 | active | ai, dev |
| [AI-PIT-001](ai/bay-da-gap.md) | Bẫy đã gặp | 1.20 | active | ai, dev |
| [AI-CHK-001](ai/kiem-tra.md) | Cách kiểm tra trước khi coi là xong | 1.12 | active | ai, dev |
| [AI-MAP-001](ai/tim-o-dau.md) | Cần X thì xem file nào | 2.3 | active | ai, dev |

## ba

| Tài liệu | Tiêu đề | Version | Trạng thái | Đối tượng |
|---|---|---|---|---|
| [BA-UNIT-001](ba/co-cau-don-vi-va-role.md) | Cơ cấu đơn vị và vai trò | 2.4 | active | ba |
| [BA-CTD-001](ba/ctd-use-case.md) | Use case Công tác Đảng (CTD) | 1.0 | active | ba |
| [BA-DOC-001](ba/danh-muc-giay-to-ctd.md) | Danh mục giấy tờ hồ sơ Đảng | 1.0 | active | ba |
| [BA-DB-001](ba/database-readme.md) | Database structure — Core and Operations | 1.1 | active | ba, dev, ai |
| [BA-OPS-001](ba/dieu-hanh-use-case.md) | Use case điều hành hoạt động TCKT | 2.7 | active | ba |
| [BA-GLOS-001](ba/thuat-ngu.md) | Thuật ngữ | 1.0 | active | ba, dev, ai |
| [BA-OVW-001](ba/tong-quan-nen-tang.md) | Tổng quan nền tảng đa đơn vị | 1.0 | active | ba |

## dev

| Tài liệu | Tiêu đề | Version | Trạng thái | Đối tượng |
|---|---|---|---|---|
| [DEV-API-001](dev/api.md) | API | 5.9 | active | dev, ai |
| [DEV-LOCAL-001](dev/chay-local.md) | Chạy dự án ở máy local | 1.3 | active | dev, ai, onboarding |
| [DEV-DB-001](dev/db-migration.md) | Migration cơ sở dữ liệu | 2.2 | active | dev, ai |
| [DEV-GUIDE-003](dev/developer-3-interface.md) | Interface Guide for Developer 3 - Directives & Submissions API | 1.4 | active | dev, ai |
| [DEV-MAIL-001](dev/email-cron.md) | Thông báo của Core (email, push và nhắc hạn) | 7.0 | active | dev, ai |
| [DEV-FE-001](dev/frontend.md) | Frontend | 1.20 | active | dev, ai |
| [DEV-ARCH-001](dev/kien-truc.md) | Kiến trúc hệ thống | 3.6 | active | dev, ai |
| [DEV-TZ-001](dev/mui-gio.md) | Múi giờ và xử lý thời gian | 1.1 | active | dev, ai |
| [DEV-NOTI-001](dev/noti.md) | Hướng dẫn phát triển và vận hành service Noti | 2.0 | active | dev, ai |
| [DEV-RBAC-001](dev/phan-quyen.md) | Phân quyền | 6.5 | active | dev, ai |
| [DEV-CONV-001](dev/quy-uoc-code.md) | Quy ước code | 1.0 | active | dev, ai |
| [DEV-MOD-001](dev/ranh-gioi-module.md) | Ranh giới module và quy tắc thay đổi liên module | 1.9 | active | dev, ai |
| [DEV-TEST-001](dev/test.md) | Test | 2.35 | active | dev, ai |

## onboarding

| Tài liệu | Tiêu đề | Version | Trạng thái | Đối tượng |
|---|---|---|---|---|
| [ONB-HO-001](onboarding/ban-giao.md) | Onboarding — bàn giao | 1.1 | active | onboarding, dev |
| [ONB-D1-001](onboarding/ngay-1.md) | Onboarding — ngày 1 | 1.2 | active | onboarding, dev |
| [ONB-W1-001](onboarding/tuan-1.md) | Onboarding — tuần 1 | 1.0 | active | onboarding, dev |

## ops

| Tài liệu | Tiêu đề | Version | Trạng thái | Đối tượng |
|---|---|---|---|---|
| [OPS-BAK-001](ops/backup-restore.md) | Backup và restore database | 1.3 | active | dev, ops, ai |
| [OPS-CUT-001](ops/chuyen-doi-ultimate-tckt.md) | Runbook chuyển đổi sang hạ tầng ultimate-tckt | 1.5 | active | ops, ai |
| [OPS-PROP-001](ops/de-xuat-ha-tang.md) | Đề xuất cấp máy chủ và tên miền chính thức | 1.1 | active | ops, ba |
| [OPS-DEPLOY-001](ops/deploy-va-nhanh.md) | Deploy và nhánh git | 4.5 | active | dev, ops, ai |
| [OPS-GH-001](ops/github.md) | Cấu hình GitHub — checklist | 1.11 | active | dev, ops, ai |
| [OPS-ENV-001](ops/moi-truong.md) | Môi trường staging và production | 1.8 | active | dev, ops, ai |
| [OPS-BOT-001](ops/repobot.md) | Vận hành bot Discord repobot | 1.1 | active | ops, dev |
| [OPS-TEST-001](ops/setup-db-test-vps.md) | Setup database test trên VPS | 1.4 | active | dev, ops |
| [OPS-SSH-001](ops/ssh.md) | SSH vào VM — khoá cá nhân và cấp quyền | 1.2 | active | dev, ops, ai, onboarding |
| [OPS-INC-001](ops/su-co.md) | Xử lý sự cố thường gặp | 1.1 | active | dev, ops, ai |
| [OPS-DB-001](ops/truy-cap-db.md) | Truy cập database từ xa (chỉ đọc) | 1.1 | active | dev, ops, ai |
| [OPS-VPS-001](ops/vps.md) | VPS — cài đặt và bố cục | 1.3 | active | dev, ops, ai |

## planning

| Tài liệu | Tiêu đề | Version | Trạng thái | Đối tượng |
|---|---|---|---|---|
| [PLAN-HUB-001](planning/ke-hoach-hub-core-operations.md) | Kế hoạch phát triển Hub (Core + Operations, không CTD) | 2.19 | active | dev, ba |
| [PLAN-DEV-001](planning/ke-hoach-phat-trien.md) | Kế hoạch phát triển nền tảng đa đơn vị | 1.0 | active | dev, ba, ops |
| [PLAN-TEAM-002](planning/phan-cong-6-devs.md) | Phân công chi tiết 6 devs (4 Backend + 2 Frontend) | 1.0 | active | dev, ops |
| [PLAN-TEAM-001](planning/phan-nhom-dev.md) | Phân nhóm phát triển và workflow | 1.0 | active | dev, ops |
| [PLAN-IDX-001](planning/README.md) | Planning — Index | 1.2 | active | dev, ba, ops |
| [PLAN-TPL-001](planning/template-phan-cong.md) | Template phân công team | 1.0 | active | dev, ops |
| [PLAN-QR-001](planning/tham-khao-nhanh.md) | Tham khảo nhanh — Development plan | 1.0 | active | dev |

## playbooks

| Tài liệu | Tiêu đề | Version | Trạng thái | Đối tượng |
|---|---|---|---|---|
| [PB-DBG-001](playbooks/debug.md) | Playbook — debug | 1.0 | active | dev, ai |
| [PB-RBAC-001](playbooks/doi-quyen.md) | Playbook — đổi quyền | 4.1 | active | dev, ai |
| [PB-SCH-001](playbooks/doi-schema.md) | Playbook — đổi schema | 2.1 | active | dev, ai |
| [PB-HOT-001](playbooks/hotfix-production.md) | Playbook — hotfix production | 1.6 | active | dev, ai |
| [PB-DEP-001](playbooks/nang-dependency.md) | Playbook — nâng dependency | 1.2 | active | dev, ai |
| [PB-RB-001](playbooks/rollback.md) | Playbook — rollback | 1.3 | active | dev, ai |
| [PB-FIX-001](playbooks/sua-loi.md) | Playbook — sửa lỗi | 1.0 | active | dev, ai |
| [PB-MOD-001](playbooks/them-module.md) | Playbook — thêm module mới | 1.9 | active | dev, ai |
| [PB-FEAT-001](playbooks/them-tinh-nang.md) | Playbook — thêm tính năng | 1.1 | active | dev, ai |
| [PB-NOTI-001](playbooks/viet-http-request-noti.md) | Playbook — viết mẫu HTTP request gọi Noti cho từng use case | 1.0 | draft | dev, ai |

## specs

| Tài liệu | Tiêu đề | Version | Trạng thái | Đối tượng |
|---|---|---|---|---|
| [SPEC-MONO-001](specs/2026-09-23-monorepo-ultimate-tckt-design.md) | Thiết kế — Gộp repo thành monorepo ultimate-tckt + hệ thống tài liệu | 1.0 | active | dev, ai |
| [SPEC-MONO-002](specs/2026-09-23-monorepo-ultimate-tckt-plan.md) | Kế hoạch triển khai — Gộp repo thành monorepo ultimate-tckt | 1.0 | active | dev, ai |
| [SPEC-UNIT-006](specs/2026-09-24-gd1-phan-lane.md) | Phân lane làm song song — GĐ1 nền tảng đa đơn vị | 1.0 | active | dev, ai |
| [SPEC-UNIT-004](specs/2026-09-24-gd1a-core-da-don-vi-plan.md) | Kế hoạch triển khai — GĐ1-A Nền tảng đa đơn vị trong Core | 1.0 | active | dev, ai |
| [SPEC-UNIT-005](specs/2026-09-24-gd1a2-nen-phan-2-plan.md) | Kế hoạch triển khai — GĐ1-A2 Nền phần 2 | 1.0 | active | dev, ai |
| [SPEC-AIKIT-002](specs/2026-09-26-ai-kit-plan.md) | Kế hoạch triển khai — AI kit cho dev (repo chính) | 1.0 | draft | dev, ai |
| [SPEC-AIKIT-001](specs/2026-09-26-ai-kit-repobot-design.md) | Design — AI kit cho dev và bot Discord repobot | 2.0 | draft | dev, ai, ops |
| [SPEC-AIKIT-003](specs/2026-09-26-repobot-plan.md) | Kế hoạch triển khai — bot Discord repobot (repo phụ) | 1.0 | draft | dev, ops, ai |
| [SPEC-AIKIT-004](specs/2026-09-27-repobot-notify-plan.md) | Kế hoạch triển khai — repobot thông báo thay đổi repo kèm TLDR (phần C) | 1.0 | draft | dev, ops, ai |
| [SPEC-PILOT-001](specs/2026-09-29-pilot-dieu-hanh-design.md) | Design — MVP Điều hành dùng thử nội bộ TCKT (pilot) | 3.0 | draft | dev, ai, ops |
| [PLAN-PILOT-001](specs/2026-09-29-pilot-dieu-hanh-plan.md) | Kế hoạch triển khai — MVP Điều hành dùng thử nội bộ (pilot) | 1.20 | draft | dev, ai |
| [PLAN-NOTI-002](specs/2026-10-02-core-noti-sender-plan.md) | Kế hoạch — Core gửi thông báo sang Noti (sender HTTP) | 1.2 | active | dev, ai |
| [PLAN-EMAILGO-001](specs/2026-10-02-go-email-cu-plan.md) | Kế hoạch gỡ module email cũ và OneSignal của Core | 3.0 | active | dev, ai |
| [SPEC-NOTI-001](specs/2026-10-02-noti-service-design.md) | Thiết kế service Noti — gửi thông báo email theo template qua HTTP API | 2.0 | active | dev, ai |
| [PLAN-NOTI-001](specs/2026-10-02-noti-service-plan.md) | Kế hoạch xây service Noti (services/noti-api) | 1.0 | draft | dev, ai |
| [SPEC-SOON-001](specs/2026-10-03-core-coming-soon-design.md) | Thiết kế màn hình "Đang phát triển" (Coming soon) cho UI Core legacy | 1.4 | active | dev, ai |
| [PLAN-SOON-001](specs/2026-10-03-core-coming-soon-plan.md) | Plan — màn hình "Đang phát triển" cho UI Core legacy | 1.2 | active | dev, ai |
| [PLAN-REL-001](specs/2026-10-03-phat-hanh-dot-1-core-plan.md) | Plan — sửa quyền, phạm vi dữ liệu và lỗi Core trước pilot | 1.2 | active | dev, ai |
| [SPEC-REL-001](specs/2026-10-03-phat-hanh-dot-1-design.md) | Design — phát hành đợt 1 (staging → main) và các bản sửa sau rà soát | 1.3 | active | dev, ops, ai |
| [PLAN-REL-002](specs/2026-10-03-phat-hanh-dot-1-ha-tang-plan.md) | Plan — sửa hạ tầng và CI sau rà soát phát hành đợt 1 | 1.1 | active | dev, ops, ai |
| [PLAN-REL-003](specs/2026-10-03-phat-hanh-dot-1-tai-lieu-plan.md) | Plan — tài liệu, dọn dẹp và runbook phát hành đợt 1 | 1.2 | active | dev, ops, ai |
| [SPEC-MAIL-001](specs/2026-10-04-mail-production-design.md) | Thiết kế bật email thật trên production (Core → Noti) — Đợt 2 | 1.3 | active | dev, ai |
| [PLAN-MAIL-001](specs/2026-10-04-mail-production-plan.md) | Plan — bật email thật trên production (Core → Noti) | 1.3 | active | dev, ai |
| [SPEC-NOTI-002](specs/2026-10-05-core-noti-49-design.md) | Thiết kế — sửa phần Core của | 1.1 | active | dev, ai |
| [PLAN-NOTI-003](specs/2026-10-05-core-noti-49-plan.md) | Kế hoạch — sửa phần Core của | 1.1 | active | dev, ai |
| [SPEC-NOTI-003](specs/2026-10-05-noti-49-design.md) | Thiết kế — sửa phần bên trong Noti của | 1.1 | active | dev, ai |
| [PLAN-NOTI-004](specs/2026-10-05-noti-49-plan.md) | Kế hoạch — sửa phần bên trong Noti của | 1.1 | active | dev, ai |
| [SPEC-POC-001](specs/2026-10-05-web-poc-react-atlaskit-design.md) | Thiết kế — POC Frontend React + Atlaskit (Sub-project 1) | 1.1 | deprecated | dev, ai |
| [PLAN-POC-002](specs/2026-10-05-web-poc-react-atlaskit-plan-2.md) | Kế hoạch triển khai — POC Frontend React (Sub-project 2 - API Integration) | 1.1 | deprecated | dev, ai |
| [PLAN-POC-003](specs/2026-10-05-web-poc-react-atlaskit-plan-3.md) | Kế hoạch triển khai — POC Frontend React (Sub-project 3 - Mock Data) | 1.1 | deprecated | dev, ai |
| [PLAN-POC-004](specs/2026-10-05-web-poc-react-atlaskit-plan-4.md) | Kế hoạch triển khai — POC Frontend React (Sub-project 4 - Atlassian UI Shell) | 1.1 | deprecated | dev, ai |
| [PLAN-POC-005](specs/2026-10-05-web-poc-react-atlaskit-plan-5.md) | Kế hoạch triển khai — POC Frontend React (Sub-project 5 - Full Jira UI Clone) | 1.1 | deprecated | dev, ai |
| [PLAN-POC-001](specs/2026-10-05-web-poc-react-atlaskit-plan.md) | Kế hoạch triển khai — POC Frontend React + Atlaskit | 1.1 | deprecated | dev, ai |
| [PLAN-POC-006](specs/2026-10-06-web-poc-react-atlaskit-plan-6.md) | Kế hoạch triển khai — POC Frontend React (Sub-project 6 - Wireframe Layout) | 1.1 | deprecated | dev, ai |
| [PLAN-POC-007](specs/2026-10-06-web-poc-react-atlaskit-plan-7.md) | Kế hoạch triển khai — POC Frontend React (Sub-project 7 - Dark Mode & Mobile Responsive) | 1.1 | deprecated | dev, ai |
| [PLAN-POC-008](specs/2026-10-06-web-poc-react-atlaskit-plan-8.md) | Kế hoạch triển khai — POC Frontend React (Sub-project 8 - Full Atlassian Design System) | 1.1 | deprecated | dev, ai |
| [SPEC-WEB-001](specs/2026-10-07-frontend-migration.md) | Frontend Migration (Atlassian Design System) | 1.3 | deprecated | dev, ai |
| [SPEC-ACTIVITIES-001](specs/2026-10-08-activities-ui-design.md) | Design — Activities & Projects Screen UI (Hoạt động & Dự án) | 1.6 | active | dev, ai |
| [PLAN-ACTIVITIES-001](specs/2026-10-08-activities-ui-plan.md) | Plan — Activities & Projects Screen UI Implementation | 1.5 | active | dev, ai |
| [SPEC-ARCHIVE-001](specs/2026-10-08-archive-screen-design.md) | Design — Archive Screen UI (Kho lưu trữ hoạt động) | 1.2 | active | dev, ai |
| [PLAN-ARCHIVE-001](specs/2026-10-08-archive-screen-plan.md) | Plan — Archive Screen UI Implementation | 1.1 | active | dev, ai |
| [SPEC-CALENDAR-001](specs/2026-10-08-calendar-ui-design.md) | Design — Calendar Screen UI (Lịch chung) | 1.7 | active | dev, ai |
| [PLAN-CALENDAR-001](specs/2026-10-08-calendar-ui-plan.md) | Plan — Calendar Screen UI Implementation | 1.3 | active | dev, ai |
| [SPEC-CAPI-001](specs/2026-10-08-core-api-integration-design.md) | Thiết kế — Tích hợp API Backend và Dọn dẹp dữ liệu rác cho TCKT Activity Hub (Core Web) | 1.4 | deprecated | dev, ai |
| [PLAN-CAPI-001](specs/2026-10-08-core-api-integration-plan.md) | Kế hoạch triển khai — Tích hợp API Backend và Dọn dẹp dữ liệu rác cho TCKT Activity Hub (Core Web) | 1.2 | deprecated | dev, ai |
| [SPEC-ACTMODAL-001](specs/2026-10-08-create-activity-modal-design.md) | Thiết kế — Create Activity Modal UI Design | 1.5 | active | dev, ai |
| [PLAN-ACTMODAL-001](specs/2026-10-08-create-activity-modal-plan.md) | Kế hoạch triển khai — Create Activity Modal UI | 1.3 | active | dev, ai |
| [SPEC-CTDUI-001](specs/2026-10-08-ctd-ui-design.md) | Thiết kế — Giao diện Công tác Đảng (CTD) theo Atlassian Design System | 1.1 | active | dev, ai |
| [PLAN-CTDUI-001](specs/2026-10-08-ctd-ui-plan.md) | Kế hoạch triển khai — Giao diện Công tác Đảng (CTD) theo Atlassian Design System | 1.1 | active | dev, ai |
| [SPEC-WEB-002](specs/2026-10-08-dashboard-ui-design.md) | Dashboard UI Design (Atlassian Design System) | 1.7 | active | dev, ai |
| [PLAN-WEB-002](specs/2026-10-08-dashboard-ui-plan.md) | Kế hoạch triển khai — Dashboard UI (Atlassian Design System) | 1.5 | active | dev, ai |
| [SPEC-DOCS-001](specs/2026-10-08-documents-screen-design.md) | Design — Documents Screen UI (Văn bản / Tài liệu) | 1.5 | active | dev, ai |
| [PLAN-DOCS-001](specs/2026-10-08-documents-screen-plan.md) | Plan — Documents Screen UI Implementation | 1.4 | active | dev, ai |
| [SPEC-LOGIN-001](specs/2026-10-08-login-ui-design.md) | Thiết kế — Giao diện Đăng nhập Hiện đại cho TCKT Activity Hub (Core Web) | 1.7 | active | dev, ai |
| [PLAN-LOGIN-001](specs/2026-10-08-login-ui-plan.md) | Kế hoạch Triển khai — Giao diện Đăng nhập Hiện đại cho TCKT Activity Hub (Core Web) | 1.6 | active | dev, ai |
| [SPEC-MEMBERS-001](specs/2026-10-08-members-screen-design.md) | Design — Members Screen UI (Thành viên) | 1.4 | active | dev, ai |
| [PLAN-MEMBERS-001](specs/2026-10-08-members-screen-plan.md) | Plan — Members Screen UI Implementation | 1.3 | active | dev, ai |
| [SPEC-MYTASKS-001](specs/2026-10-08-my-tasks-screen-design.md) | Design — My Tasks Screen UI (Công việc của tôi) | 1.6 | active | dev, ai |
| [PLAN-MYTASKS-001](specs/2026-10-08-my-tasks-screen-plan.md) | Plan — My Tasks Screen UI Implementation | 1.4 | active | dev, ai |
| [SPEC-REPORTS-001](specs/2026-10-08-reports-screen-design.md) | Design — Reports Screen UI (Báo cáo) | 1.5 | active | dev, ai |
| [PLAN-REPORTS-001](specs/2026-10-08-reports-screen-plan.md) | Plan — Reports Screen UI Implementation | 1.2 | active | dev, ai |
| [SPEC-TEAMS-001](specs/2026-10-08-teams-screen-design.md) | Design — Teams Screen UI (Các Tổ) | 1.3 | active | dev, ai |
| [PLAN-TEAMS-001](specs/2026-10-08-teams-screen-plan.md) | Plan — Teams Screen UI Implementation | 1.2 | active | dev, ai |
| [SPEC-ENTERPRISE-001](specs/2026-10-09-master-system-enhancement-proposal.md) | Đề án Toàn diện — Nâng cấp, Hoàn thiện & Chuẩn hóa Hệ thống Vận hành Enterprise | 1.1 | active | dev, ai, ops, ba |
| [PLAN-WEBP0-001](specs/2026-10-09-web-dot-0-nen-plan.md) | Kế hoạch triển khai — web/ đợt 0 (nền tảng: router, tầng API, thành phần dùng chung) | 1.0 | active | dev, ai |
| [PLAN-WEBP1-001](specs/2026-10-09-web-dot-1-hoat-dong-plan.md) | Kế hoạch triển khai — web/ đợt 1 (Hoạt động: tạo đề xuất, trang chi tiết, vòng duyệt, sửa, xoá, tham gia, cập nhật) | 1.1 | active | dev, ai |
| [PLAN-WEBP2-001](specs/2026-10-09-web-dot-2-cong-viec-plan.md) | Kế hoạch triển khai — web/ đợt 2 (công việc và Kanban) | 1.2 | active | dev, ai |
| [PLAN-WEBP3-001](specs/2026-10-09-web-dot-3-to-thanh-vien-plan.md) | Kế hoạch triển khai — web/ đợt 3 (Tổ, thành viên, tài khoản, quản trị, trọng số, tài khoản của tôi) | 1.0 | active | dev, ai |
| [PLAN-WEBP4-001](specs/2026-10-09-web-dot-4-van-ban-thong-bao-plan.md) | Kế hoạch triển khai — web/ đợt 4 (Văn bản và chuông thông báo) | 1.3 | active | dev, ai |
| [PLAN-WEBP5-001](specs/2026-10-09-web-dot-5-giao-viec-trinh-plan.md) | Kế hoạch triển khai — web/ đợt 5 (Giao việc và Trình) | 1.1 | active | dev, ai |
| [PLAN-WEBP6-001](specs/2026-10-09-web-dot-6-nhat-ky-truc-ban-plan.md) | Kế hoạch triển khai — web/ đợt 6 (Nhật ký trực ban: backend Core rồi UI) | 1.0 | active | dev, ai |
| [SPEC-WEB-003](specs/2026-10-09-web-hoan-thien-thay-the-design.md) | Design — Hoàn thiện web/ để thay thế frontend Core | 2.1 | active | dev, ai, ops |
| [PLAN-WEBP7-001](specs/2026-10-10-web-dot-7-thay-ui-cu-plan.md) | Kế hoạch triển khai — web/ đợt 7 (thay frontend Core tại /) | 1.1 | active | dev, ai |
| [SPEC-UNIT-002](specs/nen-tang-da-don-vi-design.md) | Design — Nền tảng đa đơn vị (GĐ1) | 1.1 | active | ba, dev, ai |
| [SPEC-UNIT-001](specs/nen-tang-da-don-vi-requirements.md) | Requirements — Nền tảng đa đơn vị (GĐ1) | 1.1 | active | ba, dev, ai |
| [SPEC-UNIT-003](specs/nen-tang-da-don-vi-tasks.md) | Tasks — Nền tảng đa đơn vị (GĐ1) | 2.0 | active | ba, dev, ai |

