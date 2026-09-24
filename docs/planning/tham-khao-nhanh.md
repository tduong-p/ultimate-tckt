---
doc_id: PLAN-QR-001
title: Tham khảo nhanh — Development plan
version: 1.0
status: active
audience: [dev]
owner: DYC
updated: 2026-09-24
related_code: []
---

# Tham khảo nhanh: Development Plan GĐ1

**Mục tiêu**: Chuyển từ hệ thống nội bộ một ban → nền tảng đa đơn vị  
**Timeline**: 6 tuần (5 tuần dev + 1 tuần production)  
**Team size**: 7-9 developers

## Timeline tóm tắt

| Tuần | Milestone | Tasks | Nhóm active |
|---|---|---|---|
| **1** | Core Foundation | T1-2 | A |
| **2** | Parallel Start | T3-6, T9 start, T7 start, T16 start | A, B, C, D |
| **3** | Feature Dev | T9-13, T7-8, T16-19 | B, C, D |
| **4** | UI Migration | T14-15, T20, T21-22 start | B, C, D, E |
| **5** | Testing & Hardening | T21-23, integration test | All |
| **6** | Production Deploy | T24, monitoring | All |

## Nhóm và trách nhiệm

```
A: Core Platform     → T1-6  (Node/MySQL)    Critical path
B: Operations        → T9-15 (Node/MySQL)    Bắt đầu tuần 2
C: Frontend Shell    → T7,8,14,15,20 (React) Bắt đầu tuần 2
D: CTD Integration   → T16-20 (FastAPI)      Bắt đầu tuần 2
E: QA/Security       → T21-23 (Testing)      Bắt đầu tuần 4
```

## Critical path

**T1 (migration)** → **T2 (middleware)** → **T3 (DYC)** → **T11 (visibility)** → **T21-23 (tests)** → **Done**

Mọi task khác có thể song song.

## Phụ thuộc quan trọng

- **T2 xong** → Nhóm B bắt đầu (T9-13)
- **T5 xong** → Nhóm C có API spec (T7)
- **T6 xong** → Nhóm D bắt đầu (T16)
- **T11 xong** → Nhóm E bắt đầu (T21-22)

## Daily workflow

```
09:00 - Standup (15 phút)
09:15 - Deep work
12:00 - Lunch
13:00 - Deep work
17:00 - Push code, update progress
```

**Thứ 4**: Mid-week sync (30 phút)  
**Thứ 6**: Sprint review (1 giờ)

## Git workflow

```bash
# Bắt đầu task
git checkout staging
git pull
git checkout -b feature/T1-my-task

# Commit
git add <files>
git commit -m "feat(core): short description

Detailed description

Refs: Task 1"

# Push daily
git push -u origin feature/T1-my-task

# Khi xong: create PR staging ← feature/T1-my-task
```

## Definition of Done (per task)

- [ ] Tests pass (`npm test` / `pytest`)
- [ ] Test coverage ≥75%
- [ ] Documentation updated (version bump)
- [ ] `npm run docs:check` pass
- [ ] Code review approved (≥1 reviewer)
- [ ] No ESLint/Pylint warnings
- [ ] Manual test pass

## Lệnh thường dùng

```bash
# Test
cd core && npm test
cd services/ctd-api/backend && pytest
npm run test:tools
npm run docs:check -- --base origin/staging

# Local dev
cd core && npm run dev           # Port 3000
cd services/ctd-api/backend && uvicorn app.main:app --reload  # Port 8000

# Deploy (tự động qua CI)
git push origin staging          # → staging environment
git push origin main             # → production environment
```

## Contacts

- **Blocked > 4 giờ**: Escalate to Lead
- **Scope/timeline change**: Escalate to DYC
- **Production incident**: Follow `docs/ops/su-co.md`

## Docs cần đọc

**Trước khi bắt đầu**:
- `docs/onboarding/ngay-1.md`
- `.kiro/specs/nen-tang-da-don-vi/requirements.md`
- `.kiro/specs/nen-tang-da-don-vi/design.md`
- `AGENTS.md` (quy tắc documentation)

**Khi làm task**:
- `docs/playbooks/<tương ứng>.md` (nếu có)
- `docs/ai/bat-bien.md` (invariants)
- `docs/ai/bay-da-gap.md` (pitfalls)

**Khi deploy**:
- `docs/ops/deploy-va-nhanh.md`
- `docs/ops/moi-truong.md`

## Success metrics

- **Velocity**: 4-5 tasks/week (team-wide)
- **Quality**: Test coverage ≥75%, zero P1 bugs pre-prod
- **CI/CD**: Pipeline success ≥95%
- **Docs**: 100% updated in same PR

## Milestones

1. **Core Platform Ready** (Cuối tuần 2): Migration + middleware + DYC + JWT
2. **Feature Complete** (Cuối tuần 4): Directives + submissions + CTD integrated + UI migrated
3. **Production Ready** (Cuối tuần 5): All tests pass, staging deployed
4. **In Production** (Cuối tuần 6): Zero downtime deploy, monitoring active

## Escalation path

```
Blocked < 4h      → Ask in team
Blocked ≥ 4h      → Escalate to lead
Scope change      → Escalate to DYC
Production issue  → docs/ops/su-co.md
```

## Anti-patterns ❌

- Merge vào `main` trước test staging
- Feature branch > 1 tuần
- Skip documentation
- Work in silo (no review)
- Ignore failing tests

## Best practices ✅

- Push code daily
- Pair programming khi stuck > 2 giờ
- Document decisions as ADRs
- Test on staging mỗi ngày
- Self-review before requesting review

---

**Chi tiết đầy đủ**: `ke-hoach-phat-trien.md` và `phan-nhom-dev.md`

## Lịch sử phiên bản

| Version | Ngày | Thay đổi | Người |
|---|---|---|---|
| 1.0 | 2026-09-24 | Bản đầu tiên | DYC |
