---
doc_id: PLAN-IDX-001
title: Planning — Index
version: 1.1
status: active
audience: [dev, ba, ops]
owner: DYC
updated: 2026-09-24
related_code: []
---

# Planning Documentation

Tài liệu kế hoạch phát triển nền tảng đa đơn vị.

## Tài liệu trong thư mục này

### Kế hoạch tổng thể
- **[ke-hoach-phat-trien.md](ke-hoach-phat-trien.md)** — Kế hoạch chi tiết 6 tuần, timeline, milestones, risks
  - 24 tasks breakdown
  - 5 tuần development + 1 tuần production deploy
  - Definition of Done
  - Success metrics

### Tổ chức nhóm
- **[phan-nhom-dev.md](phan-nhom-dev.md)** — Team structure, workflow, communication
  - 5 nhóm (A: Core, B: Operations, C: Frontend, D: CTD, E: QA)
  - Daily/weekly workflow
  - Integration points
  - Conflict resolution

## Quick start

### Cho dev mới
1. Đọc `ke-hoach-phat-trien.md` §1-2 (trạng thái + mục tiêu)
2. Xác định nhóm của bạn → đọc `phan-nhom-dev.md` §2 (chi tiết nhóm)
3. Đọc tasks của nhóm trong `.kiro/specs/nen-tang-da-don-vi/tasks.md`
4. Setup local theo `docs/onboarding/ngay-1.md`

### Cho lead/manager
1. Đọc toàn bộ `ke-hoach-phat-trien.md`
2. Đọc `phan-nhom-dev.md` §3-6 (dependencies, workflow, integration)
3. Track progress theo §10 (metrics)

## Tài liệu liên quan

- **Requirements**: `.kiro/specs/nen-tang-da-don-vi/requirements.md`
- **Design**: `.kiro/specs/nen-tang-da-don-vi/design.md`
- **Tasks**: `.kiro/specs/nen-tang-da-don-vi/tasks.md`
- **Onboarding**: `docs/onboarding/`
- **Operations**: `docs/ops/deploy-va-nhanh.md`

## Lịch sử phiên bản

| Version | Ngày | Thay đổi | Người |
|---|---|---|---|
| 1.1 | 2026-09-24 | Thêm link đến ke-hoach-phat-trien.md và phan-nhom-dev.md | DYC |
| 1.0 | 2026-09-23 | Bản đầu | DYC |
