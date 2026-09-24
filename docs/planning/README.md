---
doc_id: PLAN-IDX-001
title: Planning — Index
version: 1.2
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
- **[ke-hoach-phat-trien.md](ke-hoach-phat-trien.md)** — Kế hoạch đầy đủ 6 tuần (24 tasks, bao gồm CTD)
  - 24 tasks breakdown
  - 5 nhóm dev (A: Core, B: Operations, C: Frontend, D: CTD, E: QA)
  - 5 tuần development + 1 tuần production deploy
  - Definition of Done
  - Success metrics

- **[ke-hoach-hub-core-operations.md](ke-hoach-hub-core-operations.md)** — Kế hoạch Hub only 4 tuần (18 tasks, không CTD)
  - 18 tasks (bỏ 6 tasks CTD)
  - 3 nhóm dev (Backend, Frontend, QA)
  - 4 tuần development
  - Phù hợp team nhỏ hoặc deploy Hub trước

### Tổ chức nhóm
- **[phan-nhom-dev.md](phan-nhom-dev.md)** — Team structure, workflow, communication (full version)
  - 5 nhóm (A: Core, B: Operations, C: Frontend, D: CTD, E: QA)
  - Daily/weekly workflow
  - Integration points
  - Conflict resolution

## Quick start

### Chọn kế hoạch phù hợp

**Full version (có CTD, 6 tuần):**
- Team 7-9 devs
- Có Python/FastAPI developers
- Muốn tích hợp CTD ngay
→ Đọc `ke-hoach-phat-trien.md`

**Hub only (không CTD, 4 tuần):**
- Team 4-6 devs
- Chỉ có Node.js + React developers
- Deploy Hub trước, CTD sau (hoặc không cần)
→ Đọc `ke-hoach-hub-core-operations.md`

### Cho dev mới
1. Chọn kế hoạch phù hợp
2. Đọc §1-2 (trạng thái + mục tiêu)
3. Xác định nhóm của bạn → đọc `phan-nhom-dev.md` §2 (chi tiết nhóm)
4. Đọc tasks của nhóm trong `.kiro/specs/nen-tang-da-don-vi/tasks.md`
5. Setup local theo `docs/onboarding/ngay-1.md`

### Cho lead/manager
1. Đánh giá team size và skill set
2. Chọn kế hoạch (full hoặc Hub only)
3. Đọc toàn bộ kế hoạch đã chọn
4. Đọc `phan-nhom-dev.md` §3-6 (dependencies, workflow, integration)
5. Track progress theo metrics

## Tài liệu liên quan

- **Requirements**: `.kiro/specs/nen-tang-da-don-vi/requirements.md`
- **Design**: `.kiro/specs/nen-tang-da-don-vi/design.md`
- **Tasks**: `.kiro/specs/nen-tang-da-don-vi/tasks.md`
- **Onboarding**: `docs/onboarding/`
- **Operations**: `docs/ops/deploy-va-nhanh.md`

## So sánh hai kế hoạch

| Aspect | Full (ke-hoach-phat-trien.md) | Hub Only (ke-hoach-hub-core-operations.md) |
|--------|-------------------------------|-------------------------------------------|
| **Tasks** | 24 tasks | 18 tasks (bỏ T16-20, T6 một phần) |
| **Timeline** | 6 tuần | 4 tuần |
| **Team size** | 7-9 devs | 4-6 devs |
| **Tech stack** | Node.js + React + Python/FastAPI | Node.js + React only |
| **CTD integration** | ✅ Có (JWT bridge, role mapping, frontend) | ❌ Không |
| **Module registry** | ✅ Đầy đủ (CTD manifest) | ⚠️ Cơ bản (chỉ dieu-hanh) |
| **Final deliverable** | Hub + CTD tích hợp | Hub standalone |
| **Phù hợp khi** | Team đầy đủ, cần CTD ngay | Team nhỏ, deploy nhanh |

## Lịch sử phiên bản

| Version | Ngày | Thay đổi | Người |
|---|---|---|---|
| 1.2 | 2026-09-24 | Thêm ke-hoach-hub-core-operations.md (Hub only, no CTD) | DYC |
| 1.1 | 2026-09-24 | Thêm link đến ke-hoach-phat-trien.md và phan-nhom-dev.md | DYC |
| 1.0 | 2026-09-23 | Bản đầu | DYC |
