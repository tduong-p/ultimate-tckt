---
doc_id: PLAN-TEAM-001
title: Phân nhóm phát triển và workflow
version: 1.0
status: active
audience: [dev, ops]
owner: DYC
updated: 2026-09-24
related_code: []
---

# Phân nhóm phát triển và workflow

Tài liệu này mô tả cách tổ chức nhóm dev cho dự án nền tảng đa đơn vị GĐ1.

## 1. Tổng quan team structure

```
┌─────────────────────────────────────────────────────────────┐
│                    Team Lead / DYC                          │
│              (Architecture, unblock, escalation)            │
└──────────────────────┬──────────────────────────────────────┘
                       │
        ┌──────────────┼──────────────┬──────────────┐
        │              │              │              │
┌───────▼──────┐ ┌─────▼──────┐ ┌────▼───────┐ ┌───▼────────┐
│   Nhóm A     │ │  Nhóm B    │ │  Nhóm C    │ │  Nhóm D    │
│ Core Platform│ │ Operations │ │ Frontend   │ │ CTD Integ. │
│              │ │            │ │            │ │            │
│  2 devs      │ │  2 devs    │ │  2 devs    │ │  1-2 devs  │
│ Node/MySQL   │ │ Node/MySQL │ │ React/TS   │ │ FastAPI/PG │
│              │ │            │ │            │ │            │
│ Tasks 1-6    │ │ Tasks 9-15 │ │ Tasks 7,8, │ │ Tasks      │
│ (critical)   │ │            │ │ 14,15,20   │ │ 16-20      │
└──────────────┘ └────────────┘ └────────────┘ └────────────┘
        │              │              │              │
        └──────────────┴──────────────┴──────────────┘
                       │
                ┌──────▼───────┐
                │   Nhóm E     │
                │  QA/Security │
                │   1 dev      │
                │ Tasks 21-23  │
                └──────────────┘
```

## 2. Chi tiết từng nhóm

### 2.1 Nhóm A: Core Platform (Critical Path)

**Size**: 2 developers (1 lead, 1 senior)

**Responsibility**:
- Database migration (10 bảng mới)
- Unit context middleware
- DYC global admin + audit trail
- Module registry system
- JWT bridge với CTD

**Tech stack**:
- Node.js 22, Express 5
- MySQL 8
- JWT (HS256)

**Tasks**: 1, 2, 3, 4, 5, 6

**Timeline**: Tuần 1-2 (critical path, không delay được)

**Skills required**:
- Node.js expert
- MySQL migration experience
- Security-aware (JWT, RBAC)
- System design thinking

**Deliverables**:
- Migration script idempotent
- `loadUnitContext` middleware
- `scopeFor` function với DYC global read
- Module manifest API
- JWT signing/verification

### 2.2 Nhóm B: Operations Module

**Size**: 2 developers

**Responsibility**:
- Directives (giao việc liên đơn vị)
- Submissions (Trình)
- Visibility policies implementation
- Operations logs (trực ban/họp ban)
- Rule engine event wiring

**Tech stack**:
- Node.js 22, Express 5
- MySQL 8
- Rule engine (existing)

**Tasks**: 9, 10, 11, 12, 13

**Timeline**: Tuần 2-3

**Dependencies**:
- Task 2 (middleware) phải xong mới bắt đầu
- Có thể design parallel với Nhóm A

**Skills required**:
- Node.js + Express
- Business logic complexity
- State machines (directive states)
- Email notifications

**Deliverables**:
- Directives API với 6 states
- Submissions API với withdraw logic
- `toSummaryView` serializer
- Ops logs tables + API
- Event triggers cho rule engine

### 2.3 Nhóm C: Frontend Shell

**Size**: 2 developers (1 lead React expert, 1 mid-level)

**Responsibility**:
- React shell mới (`web/`)
- Shared UI components
- Unit switcher, menu dynamic
- Migrate old UI từ `core/public/`
- New Operations UI screens

**Tech stack**:
- React 18
- TypeScript
- Vite
- React Router
- TanStack Query (hoặc SWR)

**Tasks**: 7, 8, 14, 15

**Timeline**: Tuần 2-5

**Dependencies**:
- Task 5 (module registry API) phải có spec rõ
- Có thể mock API để làm parallel

**Skills required**:
- React + TypeScript expert
- Component architecture
- State management
- Responsive design (mobile ≥360px)
- Performance optimization

**Deliverables**:
- `web/` project setup (Vite)
- Layout với login, unit switcher, menu
- Shared components library
- BTV screens: assigned work, dashboard
- TCKT screens: work from BTV, ops logs
- Mobile-responsive "Việc hôm nay" screen

### 2.4 Nhóm D: CTD Integration

**Size**: 1-2 developers (Python fullstack)

**Responsibility**:
- JWT bridge authentication trong CTD
- Role mapping Core → CTD
- Summary endpoint cho BTV
- Event outbox tích hợp
- Migrate CTD frontend vào shell

**Tech stack**:
- FastAPI
- SQLAlchemy 2.0
- Postgres 16
- React (frontend migration)

**Tasks**: 16, 17, 18, 19, 20

**Timeline**: Tuần 2-4

**Dependencies**:
- Task 6 (JWT bridge từ Core) phải xong
- Task 7 (React shell) phải có layout ready

**Skills required**:
- FastAPI + SQLAlchemy
- JWT authentication
- React (để migrate frontend)
- Understanding của CTD business logic

**Deliverables**:
- `deps.py` accept JWT bridge
- JIT user creation/sync
- Role mapping logic (5 mappings)
- `/api/v1/summary` endpoint
- Event outbox về Core
- `features/canbo/*` migrated to `web/src/modules/ctd/`

### 2.5 Nhóm E: QA/Security

**Size**: 1 developer (có thể kiêm từ Nhóm B hoặc C)

**Responsibility**:
- Privacy leak test suite
- DYC access verification tests
- CI integration
- Security review
- Documentation validation

**Tech stack**:
- Node.js test framework (node:test)
- pytest (cho CTD)
- GitHub Actions

**Tasks**: 21, 22, 23

**Timeline**: Tuần 4-5

**Dependencies**:
- Task 11 (visibility policies) phải implement xong
- Cần stable APIs để viết tests

**Skills required**:
- Testing mindset
- Security awareness
- CI/CD experience
- Scripting (bash, Python)

**Deliverables**:
- Test suite: BTV ở mức `summary` không lộ data
- Test suite: DYC read all + audit logs
- CI workflow `.github/workflows/security-tests.yml`
- Security review report

## 3. Dependency matrix

| Nhóm | Bắt đầu sau | Cần output từ | Bị block nếu |
|---|---|---|---|
| **A** | Ngay | — | — (critical path) |
| **B** | Tuần 1 Thứ 6 | A: Task 2 (middleware) | A delay > 2 ngày |
| **C** | Tuần 2 Thứ 6 | A: Task 5 (API spec) | A delay > 1 tuần |
| **D** | Tuần 2 CN | A: Task 6 (JWT), C: Task 7 (shell) | A delay > 1 tuần |
| **E** | Tuần 4 Thứ 4 | B: Task 11 (policies) | B delay > 3 ngày |

## 4. Daily workflow

### 4.1 Morning standup (9:00 AM, 15 phút)

**Format**: Round-robin, mỗi người 2 phút

```
1. Nhóm A
   - Dev 1: Yesterday | Today | Blockers
   - Dev 2: Yesterday | Today | Blockers

2. Nhóm B
   - Dev 1: ...
   - Dev 2: ...

3. Nhóm C
   - Dev 1: ...
   - Dev 2: ...

4. Nhóm D
   - Dev 1: ...
   - (Dev 2 nếu có)

5. Nhóm E
   - Dev 1: ...

6. Lead: Sync điểm phụ thuộc + unblock
```

**Output**: Google Doc với action items

### 4.2 Code & commit (9:15 AM - 5:00 PM)

**Workflow**:
```bash
# Morning: pull latest
git checkout staging
git pull origin staging

# Create feature branch
git checkout -b feature/T1-my-task

# Code...
# Test locally
cd core && npm test  # hoặc pytest

# Commit frequently
git add <files>
git commit -m "feat(core): implement unit middleware

- Add loadUnitContext middleware
- Refactor access.js to use req.unitRole
- Add tests for fallback logic

Refs: Task 2"

# Push at least once per day
git push -u origin feature/T1-my-task
```

**Commit message format**:
```
<type>(<scope>): <subject>

<body>

Refs: Task <number>
```

**Types**: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`

### 4.3 Pull request (khi task xong)

**PR checklist**:
- [ ] Branch từ `staging`
- [ ] Tests pass locally
- [ ] Documentation updated
- [ ] No secrets committed
- [ ] Self-review done

**PR template**:
```markdown
## Task
T<number>: <title>

## Changes
- Added X
- Modified Y
- Removed Z

## Test plan
1. ...
2. ...
3. Expected: ...

## Screenshots
(nếu UI changes)

## Documentation
- Updated: docs/dev/xxx.md (v1.0 → v1.1)
- Created: docs/adr/NNNN-xxx.md

## Checklist
- [ ] Tests pass (`npm test`, `pytest`)
- [ ] `npm run docs:check` pass
- [ ] No ESLint/Pylint warnings
- [ ] Self-reviewed
- [ ] Ready for review
```

**Review process**:
1. Tạo PR: `staging ← feature/T1-my-task`
2. Request review từ ≥1 người (khác nhóm nếu có thể)
3. Reviewer approve → Merge (không squash)
4. Delete feature branch
5. CI auto-deploy to staging

### 4.4 End of day (5:00 PM)

**Checklist**:
- [ ] Code pushed (WIP branches OK)
- [ ] Blockers documented in standup doc
- [ ] Tomorrow plan clear
- [ ] No uncommitted secrets

## 5. Weekly workflow

### 5.1 Thứ 2: Sprint start

**Morning** (9:00 AM):
- Standup + week goals review
- Dependency check giữa các nhóm
- Risk assessment

**Afternoon**:
- Code

### 5.2 Thứ 3-5: Execution days

**Pattern**:
- 9:00 AM: Standup
- 9:15 AM - 12:00 PM: Deep work
- 1:00 PM - 5:00 PM: Deep work
- 5:00 PM: Push code, update progress

**Mid-week sync** (Thứ 4, 2:00 PM, 30 phút):
- Progress vs plan
- Re-estimate remaining work
- Adjust assignments nếu cần

### 5.3 Thứ 6: Sprint review

**Morning** (9:00 AM):
- Standup

**Afternoon** (2:00 PM, 1 giờ):
- Demo working software
- Each nhóm: 10 phút demo
- Stakeholder feedback (nếu có)
- Plan next week

### 5.4 Chủ nhật (optional): Buffer day

**Purpose**:
- Catch up nếu tuần trước delay
- Integration testing
- Documentation cleanup
- Learning/refactoring

## 6. Integration points

### 6.1 Nhóm A → Nhóm B (Task 2 done)

**Event**: Middleware `loadUnitContext` hoàn thành

**Handoff**:
- Nhóm A: Document middleware API
- Nhóm B: Test với dummy data
- Sync meeting: 30 phút

**Acceptance**:
- Nhóm B có thể gọi `req.unit`, `req.unitRole`, `req.memberships`
- Policy functions (`scopeFor`, `isExecutive`) hoạt động

### 6.2 Nhóm A → Nhóm C (Task 5 done)

**Event**: Module registry API ready

**Handoff**:
- Nhóm A: OpenAPI spec + example response
- Nhóm C: Mock API trong frontend
- Sync meeting: 30 phút

**Acceptance**:
- Frontend có thể fetch menu theo `current_unit_id`
- Menu filter theo membership

### 6.3 Nhóm A → Nhóm D (Task 6 done)

**Event**: JWT bridge implemented

**Handoff**:
- Nhóm A: JWT secret, claims structure, example token
- Nhóm D: Verification logic + tests
- Sync meeting: 45 phút

**Acceptance**:
- CTD có thể verify token từ Core
- JIT user creation hoạt động

### 6.4 Nhóm C → Nhóm D (Task 7 done)

**Event**: React shell layout ready

**Handoff**:
- Nhóm C: Shell component API, routing structure
- Nhóm D: CTD module integration
- Sync meeting: 30 phút

**Acceptance**:
- CTD screens render trong shell
- Login state shared
- Unit switcher hoạt động với CTD

### 6.5 Nhóm B → Nhóm E (Task 11 done)

**Event**: Visibility policies implemented

**Handoff**:
- Nhóm B: API endpoints, test accounts, expected behavior
- Nhóm E: Test plan review
- Sync meeting: 45 phút

**Acceptance**:
- Nhóm E có thể login as BTV
- Test scenarios documented

## 7. Conflict resolution

### 7.1 Technical conflicts

**Scenario**: Nhóm B và Nhóm D disagree về JWT claims structure

**Process**:
1. Document both options (Google Doc)
2. List pros/cons
3. Escalate to Lead
4. Lead decide within 24 hours
5. Document decision as ADR

### 7.2 Resource conflicts

**Scenario**: Nhóm A bị overload (critical path)

**Process**:
1. Daily standup: Lead identifies bottleneck
2. Borrow 1 dev từ Nhóm B (senior)
3. Pair programming với Nhóm A
4. Nhóm B adjust timeline (+1-2 ngày)

### 7.3 Timeline conflicts

**Scenario**: Task 2 delay 3 ngày → block Nhóm B

**Process**:
1. Nhóm B pivot to design work (API spec, database schema)
2. Mock middleware trong tests
3. Integrate real middleware khi ready
4. No overall timeline impact

## 8. Communication channels

### 8.1 Synchronous

| Channel | Purpose | Frequency |
|---|---|---|
| Daily standup | Progress + blockers | Mỗi ngày 9:00 AM |
| Sync meeting | Handoff giữa nhóm | On-demand |
| Sprint review | Demo + feedback | Mỗi Thứ 6 |
| Retrospective | Process improvement | Cuối milestone |

### 8.2 Asynchronous

| Channel | Purpose | SLA |
|---|---|---|
| GitHub PR | Code review | < 4 giờ |
| GitHub Issues | Bug tracking | < 1 ngày |
| Google Doc | Design docs | < 2 ngày |
| Zalo | Urgent only | < 15 phút |

### 8.3 Documentation

| Type | Tool | Update frequency |
|---|---|---|
| Code docs | JSDoc / docstrings | Every PR |
| API specs | OpenAPI / Postman | When API changes |
| Architecture | `docs/dev/`, `docs/adr/` | Major changes only |
| Progress | Google Sheet | Daily |

## 9. Onboarding new dev mid-sprint

**Scenario**: Cần thêm 1 dev vào Nhóm D tuần 3

**Process**:

**Day 1** (onboarding):
1. Read `docs/onboarding/ngay-1.md`
2. Setup local environment
3. Run all tests (pass)
4. Read `.kiro/specs/nen-tang-da-don-vi/`
5. Shadow existing Nhóm D dev

**Day 2-3** (ramp up):
1. Pick up small task (documentation, minor bug)
2. Create first PR
3. Code review feedback
4. Read related code (CTD backend)

**Day 4+** (productive):
1. Pick up real task (T19 hoặc T20)
2. Pair programming với dev hiện có
3. Independent work

**Buddy system**: Mỗi dev mới có 1 buddy trong nhóm

## 10. Team health metrics

### 10.1 Velocity tracking

**Weekly**:
- Tasks completed / Tasks planned
- Story points (if used)
- Burndown chart

**Target**: 4-5 tasks/week (team-wide)

### 10.2 Quality metrics

**Per PR**:
- Test coverage delta
- Review time (target: < 4 giờ)
- Rework rate (target: < 10%)

**Weekly**:
- Bugs found in staging
- Bugs escaped to production
- CI pipeline success rate (target: ≥95%)

### 10.3 Morale indicators

**Weekly pulse check** (anonymous):
1. Workload: 😀 😐 😞
2. Clarity: 😀 😐 😞
3. Collaboration: 😀 😐 😞
4. Learning: 😀 😐 😞

**Action**: If ≥2 😞 in same area → retrospective topic

## 11. Success patterns

### 11.1 What works well (từ past projects)

- ✅ Daily standup 15 phút (no status reports, just sync)
- ✅ Pair programming khi stuck > 2 giờ
- ✅ Document decisions as ADRs
- ✅ Test on staging mỗi ngày
- ✅ Celebrate small wins (PR merged, test pass)

### 11.2 Anti-patterns to avoid

- ❌ Merge vào `main` trước khi test staging
- ❌ Long-lived feature branches (> 1 tuần)
- ❌ Skip documentation "sẽ viết sau"
- ❌ Work in silo (no code review)
- ❌ Ignore failing tests "để sau sửa"

## 12. Remote work guidelines (nếu có)

### 12.1 Core hours

**Overlap time**: 9:00 AM - 5:00 PM (múi giờ Việt Nam)

**Flexible**: Bắt đầu sớm/muộn OK, nhưng phải attend standup

### 12.2 Availability

**Mandatory**:
- Standup 9:00 AM
- Sprint review Thứ 6
- Sync meetings (scheduled)

**Optional**:
- Informal pair programming
- Office hours (Lead available 10-11 AM)

### 12.3 Tools

- **Video**: Google Meet / Zoom
- **Screen share**: VS Code Live Share
- **Whiteboard**: Excalidraw / Miro
- **Chat**: Zalo (urgent), GitHub (async)

## Lịch sử phiên bản

| Version | Ngày | Thay đổi | Người |
|---|---|---|---|
| 1.0 | 2026-09-24 | Bản đầu tiên | DYC |
