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

## ai

| Tài liệu | Tiêu đề | Version | Trạng thái | Đối tượng |
|---|---|---|---|---|
| [AI-INV-001](ai/bat-bien.md) | Bất biến — điều không được phá | 1.2 | active | ai, dev |
| [AI-PIT-001](ai/bay-da-gap.md) | Bẫy đã gặp | 1.1 | active | ai, dev |
| [AI-CHK-001](ai/kiem-tra.md) | Cách kiểm tra trước khi coi là xong | 1.3 | active | ai, dev |
| [AI-MAP-001](ai/tim-o-dau.md) | Cần X thì xem file nào | 1.0 | active | ai, dev |

## ba

| Tài liệu | Tiêu đề | Version | Trạng thái | Đối tượng |
|---|---|---|---|---|
| [BA-UNIT-001](ba/co-cau-don-vi-va-role.md) | Cơ cấu đơn vị và vai trò | 1.2 | active | ba |
| [BA-CTD-001](ba/ctd-use-case.md) | Use case Công tác Đảng (CTD) | 1.0 | active | ba |
| [BA-DOC-001](ba/danh-muc-giay-to-ctd.md) | Danh mục giấy tờ hồ sơ Đảng | 1.0 | active | ba |
| [BA-OPS-001](ba/dieu-hanh-use-case.md) | Use case điều hành hoạt động TCKT | 1.1 | active | ba |
| [BA-GLOS-001](ba/thuat-ngu.md) | Thuật ngữ | 1.0 | active | ba, dev, ai |
| [BA-OVW-001](ba/tong-quan-nen-tang.md) | Tổng quan nền tảng đa đơn vị | 1.0 | active | ba |

## dev

| Tài liệu | Tiêu đề | Version | Trạng thái | Đối tượng |
|---|---|---|---|---|
| [DEV-API-001](dev/api.md) | API | 1.2 | active | dev, ai |
| [DEV-LOCAL-001](dev/chay-local.md) | Chạy dự án ở máy local | 1.0 | active | dev, ai, onboarding |
| [DEV-DB-001](dev/db-migration.md) | Migration cơ sở dữ liệu | 1.1 | active | dev, ai |
| [DEV-MAIL-001](dev/email-cron.md) | Email và Cron | 1.2 | active | dev, ai |
| [DEV-FE-001](dev/frontend.md) | Frontend | 1.0 | active | dev, ai |
| [DEV-ARCH-001](dev/kien-truc.md) | Kiến trúc hệ thống | 1.1 | active | dev, ai |
| [DEV-RBAC-001](dev/phan-quyen.md) | Phân quyền | 1.3 | active | dev, ai |
| [DEV-CONV-001](dev/quy-uoc-code.md) | Quy ước code | 1.0 | active | dev, ai |
| [DEV-TEST-001](dev/test.md) | Test | 1.3 | active | dev, ai |

## onboarding

| Tài liệu | Tiêu đề | Version | Trạng thái | Đối tượng |
|---|---|---|---|---|
| [ONB-HO-001](onboarding/ban-giao.md) | Onboarding — bàn giao | 1.0 | active | onboarding, dev |
| [ONB-D1-001](onboarding/ngay-1.md) | Onboarding — ngày 1 | 1.0 | active | onboarding, dev |
| [ONB-W1-001](onboarding/tuan-1.md) | Onboarding — tuần 1 | 1.0 | active | onboarding, dev |

## ops

| Tài liệu | Tiêu đề | Version | Trạng thái | Đối tượng |
|---|---|---|---|---|
| [OPS-BAK-001](ops/backup-restore.md) | Backup và restore database | 1.1 | active | dev, ops, ai |
| [OPS-CUT-001](ops/chuyen-doi-ultimate-tckt.md) | Runbook chuyển đổi sang hạ tầng ultimate-tckt | 1.3 | active | ops, ai |
| [OPS-PROP-001](ops/de-xuat-ha-tang.md) | Đề xuất cấp máy chủ và tên miền chính thức | 1.0 | active | ops, ba |
| [OPS-DEPLOY-001](ops/deploy-va-nhanh.md) | Deploy và nhánh git | 1.2 | active | dev, ops, ai |
| [OPS-GH-001](ops/github.md) | Cấu hình GitHub — checklist | 1.3 | active | dev, ops, ai |
| [OPS-ENV-001](ops/moi-truong.md) | Môi trường staging và production | 1.0 | active | dev, ops, ai |
| [OPS-INC-001](ops/su-co.md) | Xử lý sự cố thường gặp | 1.0 | active | dev, ops, ai |
| [OPS-DB-001](ops/truy-cap-db.md) | Truy cập database từ xa (chỉ đọc) | 1.0 | active | dev, ops, ai |
| [OPS-VPS-001](ops/vps.md) | VPS — cài đặt và bố cục | 1.0 | active | dev, ops, ai |

## playbooks

| Tài liệu | Tiêu đề | Version | Trạng thái | Đối tượng |
|---|---|---|---|---|
| [PB-DBG-001](playbooks/debug.md) | Playbook — debug | 1.0 | active | dev, ai |
| [PB-RBAC-001](playbooks/doi-quyen.md) | Playbook — đổi quyền | 1.1 | active | dev, ai |
| [PB-SCH-001](playbooks/doi-schema.md) | Playbook — đổi schema | 1.1 | active | dev, ai |
| [PB-HOT-001](playbooks/hotfix-production.md) | Playbook — hotfix production | 1.1 | active | dev, ai |
| [PB-DEP-001](playbooks/nang-dependency.md) | Playbook — nâng dependency | 1.0 | active | dev, ai |
| [PB-RB-001](playbooks/rollback.md) | Playbook — rollback | 1.0 | active | dev, ai |
| [PB-FIX-001](playbooks/sua-loi.md) | Playbook — sửa lỗi | 1.0 | active | dev, ai |
| [PB-MOD-001](playbooks/them-module.md) | Playbook — thêm module mới | 1.1 | active | dev, ai |
| [PB-FEAT-001](playbooks/them-tinh-nang.md) | Playbook — thêm tính năng | 1.0 | active | dev, ai |

## specs

| Tài liệu | Tiêu đề | Version | Trạng thái | Đối tượng |
|---|---|---|---|---|
| [SPEC-MONO-001](specs/2026-09-23-monorepo-ultimate-tckt-design.md) | Thiết kế — Gộp repo thành monorepo ultimate-tckt + hệ thống tài liệu | 1.0 | active | dev, ai |
| [SPEC-MONO-002](specs/2026-09-23-monorepo-ultimate-tckt-plan.md) | Kế hoạch triển khai — Gộp repo thành monorepo ultimate-tckt | 1.0 | active | dev, ai |
| [SPEC-UNIT-004](specs/2026-09-24-gd1a-core-da-don-vi-plan.md) | Kế hoạch triển khai — GĐ1-A Nền tảng đa đơn vị trong Core | 1.0 | active | dev, ai |
| [SPEC-UNIT-002](specs/nen-tang-da-don-vi-design.md) | Design — Nền tảng đa đơn vị (GĐ1) | 1.1 | active | ba, dev, ai |
| [SPEC-UNIT-001](specs/nen-tang-da-don-vi-requirements.md) | Requirements — Nền tảng đa đơn vị (GĐ1) | 1.0 | active | ba, dev, ai |
| [SPEC-UNIT-003](specs/nen-tang-da-don-vi-tasks.md) | Tasks — Nền tảng đa đơn vị (GĐ1) | 1.0 | active | ba, dev, ai |

