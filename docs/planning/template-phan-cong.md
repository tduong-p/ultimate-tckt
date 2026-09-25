---
doc_id: PLAN-TPL-001
title: Template phân công team
version: 1.0
status: active
audience: [dev, ops]
owner: DYC
updated: 2026-09-24
related_code: []
---

# Template phân công team

Sử dụng template này để track tiến độ và phân công cụ thể từng người trong team.

## Team roster

| # | Tên | Nhóm | Role | Skills | Start date |
|---|-----|------|------|--------|------------|
| 1 | [Tên] | A | Backend Lead | Node.js expert, MySQL, RBAC | YYYY-MM-DD |
| 2 | [Tên] | A | Backend Senior | Node.js, system design | YYYY-MM-DD |
| 3 | [Tên] | B | Backend Senior | Node.js, business logic | YYYY-MM-DD |
| 4 | [Tên] | B | Backend Mid | Node.js, Express | YYYY-MM-DD |
| 5 | [Tên] | C | Frontend Lead | React expert, TypeScript | YYYY-MM-DD |
| 6 | [Tên] | C | Frontend Dev | React, UI/UX | YYYY-MM-DD |
| 7 | [Tên] | D | Fullstack (Python) | FastAPI, SQLAlchemy | YYYY-MM-DD |
| 8 | [Tên] | D | Fullstack (Python) | FastAPI, React | YYYY-MM-DD |
| 9 | [Tên] | E | QA Engineer | Testing, security, CI/CD | YYYY-MM-DD |

## Tuần 1: Foundation (Critical Path)

**Mục tiêu**: Migration + middleware hoàn thành

| Task | Người phụ trách | Partner/Reviewer | Status | Notes |
|------|-----------------|------------------|--------|-------|
| T1: Migration design | [A-Lead] | [A-Senior] | ⬜ Todo | |
| T1: Migration impl | [A-Lead], [A-Senior] | [B-Lead] (review) | ⬜ Todo | Pair programming |
| T1: Migration test | [A-Senior] | [A-Lead] | ⬜ Todo | |
| T2: Middleware design | [A-Lead] | [B-Lead] | ⬜ Todo | |
| T2: Middleware impl | [A-Senior] | [A-Lead] | ⬜ Todo | |
| T2: Refactor access.js | [A-Lead], [A-Senior] | [B-Lead] | ⬜ Todo | |

**Status codes**: ⬜ Todo | 🔵 In Progress | ✅ Done | ⛔ Blocked

## Tuần 2: Parallel Development Starts

### Nhóm A: Core Platform

| Task | Người phụ trách | Status | Due | Notes |
|------|-----------------|--------|-----|-------|
| T3: DYC admin | [A-Lead] | ⬜ | Thứ 3 | |
| T3: Global read + audit | [A-Senior] | ⬜ | Thứ 3 | |
| T4: Audit logging | [A-Senior] | ⬜ | Thứ 4 | |
| T5: Module registry | [A-Lead] | ⬜ | Thứ 5 | Spec for Nhóm C |
| T6: JWT bridge | [A-Lead], [A-Senior] | ⬜ | Thứ 6 | Blocker for Nhóm D |

### Nhóm B: Operations

| Task | Người phụ trách | Status | Due | Notes |
|------|-----------------|--------|-----|-------|
| T9: Directives design | [B-Lead] | ⬜ | Thứ 6 | State machine diagram |
| T9: Directives impl start | [B-Lead], [B-Mid] | ⬜ | CN | Tables + basic routes |

### Nhóm C: Frontend Shell

| Task | Người phụ trách | Status | Due | Notes |
|------|-----------------|--------|-----|-------|
| T7: Shell setup | [C-Lead] | ⬜ | Thứ 6 | Vite + React + routing |

### Nhóm D: CTD Integration

| Task | Người phụ trách | Status | Due | Notes |
|------|-----------------|--------|-----|-------|
| T16: JWT auth design | [D-FS1] | ⬜ | CN | Wait for T6 spec |

## Tuần 3: Feature Development

### Nhóm B: Operations

| Task | Người phụ trách | Status | Due | Notes |
|------|-----------------|--------|-----|-------|
| T9: Directives (finish) | [B-Lead], [B-Mid] | ⬜ | Thứ 2 | Notifications |
| T10: Submissions | [B-Lead] | ⬜ | Thứ 3 | |
| T11: Visibility policies | [B-Lead], [B-Mid] | ⬜ | Thứ 4 | Blocker for Nhóm E |
| T12: Ops logs | [B-Mid] | ⬜ | Thứ 5 | |
| T13: Rule engine events | [B-Lead] | ⬜ | Thứ 6 | |

### Nhóm C: Frontend Shell

| Task | Người phụ trách | Status | Due | Notes |
|------|-----------------|--------|-----|-------|
| T7: Login + unit switcher | [C-Lead] | ⬜ | Thứ 2 | |
| T7: Menu + notifications | [C-Dev] | ⬜ | Thứ 3 | |
| T8: Management UI | [C-Lead], [C-Dev] | ⬜ | Thứ 4 | |
| T14: Migrate UI (start) | [C-Dev] | ⬜ | Thứ 5-6 | "Việc hôm nay" |

### Nhóm D: CTD Integration

| Task | Người phụ trách | Status | Due | Notes |
|------|-----------------|--------|-----|-------|
| T16: JWT auth impl | [D-FS1] | ⬜ | Thứ 2 | |
| T17: Role mapping | [D-FS1] | ⬜ | Thứ 3 | |
| T18: Summary endpoint | [D-FS2] | ⬜ | Thứ 4 | Replace mock |
| T19: Event outbox | [D-FS2] | ⬜ | Thứ 5 | |
| T20: Frontend migration (design) | [D-FS1], [D-FS2] | ⬜ | Thứ 6 | Plan with Nhóm C |

## Tuần 4: UI Migration + Security

### Nhóm B: Operations (buffer)

| Task | Người phụ trách | Status | Notes |
|------|-----------------|--------|-------|
| Bug fixes T9-13 | [B-Lead], [B-Mid] | ⬜ | Integration testing |

### Nhóm C: Frontend

| Task | Người phụ trách | Status | Due | Notes |
|------|-----------------|--------|-----|-------|
| T14: Activities/Kanban | [C-Dev] | ⬜ | Thứ 2 | |
| T14: Settings screens | [C-Dev] | ⬜ | Thứ 3 | |
| T15: BTV screens | [C-Lead] | ⬜ | Thứ 4 | |
| T15: TCKT screens | [C-Lead] | ⬜ | Thứ 5 | |
| T20: CTD frontend (start) | [C-Lead], [D-FS1] | ⬜ | Thứ 6 | Move canbo/* |

### Nhóm D: CTD

| Task | Người phụ trách | Status | Due | Notes |
|------|-----------------|--------|-----|-------|
| T20: Move features | [D-FS1], [D-FS2] | ⬜ | Thứ 2-3 | canbo/*, baocao/* |
| T20: Integration | [D-FS1], [D-FS2] | ⬜ | Thứ 4-5 | Connect to shell |
| Integration testing | [D-FS1], [D-FS2] | ⬜ | Thứ 6 | End-to-end CTD |

### Nhóm E: QA/Security

| Task | Người phụ trách | Status | Due | Notes |
|------|-----------------|--------|-----|-------|
| T21: Test design | [E-QA] | ⬜ | Thứ 4 | Test plan, BTV account |
| T21: Test impl | [E-QA] | ⬜ | Thứ 5 | Privacy leak tests |
| T22: DYC test | [E-QA] | ⬜ | Thứ 6 | DYC access + audit |

## Tuần 5: Testing & Hardening

### All teams: Integration + bug fixing

| Task | Team | Người phụ trách | Status | Notes |
|------|------|-----------------|--------|-------|
| Integration testing | All | [A-Lead] coordinate | ⬜ | Cross-unit flows |
| Performance testing | All | [E-QA] | ⬜ | 50 concurrent users |
| Security review | All | [A-Lead], [E-QA] | ⬜ | JWT, audit, CSRF |

### Nhóm E: Security + CI

| Task | Người phụ trách | Status | Due | Notes |
|------|-----------------|--------|-----|-------|
| T21-22: Refinement | [E-QA] | ⬜ | Thứ 2 | Fix flaky tests |
| T23: CI integration | [E-QA] | ⬜ | Thứ 3 | GitHub Actions |
| T23: CI hardening | [E-QA] | ⬜ | Thứ 4 | Block merge on fail |
| Documentation | All | All | ⬜ | Thứ 5 | Update per AGENTS.md |

### Deploy prep

| Task | Team | Status | Due | Notes |
|------|------|--------|-----|-------|
| T24: Enable email/cron | All | ⬜ | Thứ 6 | Production config |
| Deploy staging | Ops | ⬜ | CN | Full smoke test |

## Tuần 6: Production Deploy

| Task | Team | Status | Notes |
|------|------|--------|-------|
| Final staging test | All | ⬜ | Stakeholder approval |
| Production deploy | Ops + All | ⬜ | Tuesday |
| Monitor + hotfix | All | ⬜ | Wed-Fri, on-call rotation |
| Retrospective | All | ⬜ | Friday 2PM |

## On-call rotation (Tuần 6)

| Day | Primary | Secondary | Notes |
|-----|---------|-----------|-------|
| Thứ 3 | [A-Lead] | [B-Lead] | Deploy day |
| Thứ 4 | [A-Senior] | [C-Lead] | |
| Thứ 5 | [B-Lead] | [D-FS1] | |
| Thứ 6 | [A-Lead] | [E-QA] | |

## Blockers & escalations

| Date | Who | Blocked on | Escalated to | Resolution | Resolved date |
|------|-----|------------|--------------|------------|---------------|
| | | | | | |
| | | | | | |

## Daily progress (mẫu)

### YYYY-MM-DD (Thứ X, Tuần Y)

**Nhóm A**:
- [Name]: Completed X, working on Y, blocked on Z
- [Name]: ...

**Nhóm B**:
- [Name]: ...
- [Name]: ...

**Nhóm C**:
- [Name]: ...
- [Name]: ...

**Nhóm D**:
- [Name]: ...

**Nhóm E**:
- [Name]: ...

**Action items**:
- [ ] [Person]: [Action] (due: date)
- [ ] ...

**Blockers resolved**:
- X was blocked on Y → resolved by Z

## Velocity tracking

| Tuần | Tasks planned | Tasks completed | Velocity | Notes |
|------|---------------|-----------------|----------|-------|
| 1 | 2 (T1-2) | | | |
| 2 | 5 (T3-6, T9) | | | |
| 3 | 9 (T7-8,T10-13,T16-19) | | | |
| 4 | 6 (T14-15,T20-22) | | | |
| 5 | 2 (T23-24) | | | |
| 6 | 0 (deploy) | | | |

**Total**: 24 tasks

## PR tracking

| PR # | Task | Author | Reviewer | Created | Merged | Status | Notes |
|------|------|--------|----------|---------|--------|--------|-------|
| | T1 | | | | | ⬜ | |
| | T2 | | | | | ⬜ | |
| ... | | | | | | | |

## Test coverage tracking

| Module | Week 1 | Week 2 | Week 3 | Week 4 | Week 5 | Target |
|--------|--------|--------|--------|--------|--------|--------|
| core/ | | | | | | ≥75% |
| services/ctd-api/ | | | | | | ≥75% |
| web/ | | | | | | ≥70% |

## Meeting notes

### Week 1 Sprint Review (YYYY-MM-DD)

**Attendees**: 

**Demo**:
- Nhóm A: ...

**Feedback**:
- ...

**Action items**:
- [ ] ...

### Week 1 Retrospective (YYYY-MM-DD)

**What went well**:
- ...

**What to improve**:
- ...

**Action items**:
- [ ] ...

---

## Notes

- Update status codes daily during standup
- Escalate blockers > 4 giờ to lead
- Track PRs to ensure review SLA (< 4 giờ)
- Update velocity weekly for planning adjustment

## Lịch sử phiên bản

| Version | Ngày | Thay đổi | Người |
|---|---|---|---|
| 1.0 | 2026-09-24 | Template ban đầu | DYC |
