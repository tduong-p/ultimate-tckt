---
doc_id: PLAN-TEAM-002
title: Phân công chi tiết 6 devs (4 Backend + 2 Frontend)
version: 1.0
status: active
audience: [dev, ops]
owner: DYC
updated: 2026-09-24
related_code: []
---

# Phân công chi tiết 6 devs (4 Backend + 2 Frontend)

Kế hoạch chia việc tối ưu cho **4 devs backend + 2 devs frontend**, đảm bảo:
- ✅ Công việc song song tối đa
- ✅ Tránh conflict code
- ✅ Phụ thuộc được quản lý rõ ràng
- ✅ Load balancing giữa các devs

**Timeline: 4 tuần** (theo ke-hoach-hub-core-operations.md)

---

## 1. Team roster

| Dev | Alias | Vai trò | Kỹ năng chính | Trách nhiệm |
|-----|-------|---------|---------------|-------------|
| **BE-1** | Alice | Backend Lead | Node.js expert, MySQL, architecture | Migration, middleware, DYC admin |
| **BE-2** | Bob | Backend Senior | Node.js, business logic | Directives, submissions |
| **BE-3** | Charlie | Backend Mid | Node.js, Express, API | Ops logs, rule engine |
| **BE-4** | Dave | Backend Mid | Node.js, testing | Module registry, audit, support |
| **FE-1** | Eve | Frontend Lead | React expert, TypeScript, architecture | Shell setup, layout, core components |
| **FE-2** | Frank | Frontend Mid | React, UI/UX | Migrate old UI, new screens |

---

## 2. Chiến lược phân việc

### 2.1 Nguyên tắc chống conflict

**Backend:**
- Mỗi dev sở hữu **một nhóm bảng** trong database
- Mỗi dev sở hữu **một nhóm routes** riêng biệt
- Shared code (middleware, policies) chỉ **BE-1** sửa
- Các dev khác PR vào file shared → review cẩn thận

**Frontend:**
- **FE-1**: Sở hữu `src/shell/`, `src/lib/`, `src/ui/` (core infrastructure)
- **FE-2**: Sở hữu `src/modules/dieu-hanh/` (business components)
- Chỉ FE-1 tạo shared components, FE-2 dùng
- Mock API để làm parallel (FE-2 không chờ backend)

### 2.2 Dependency management

```
                    T1 (BE-1) Migration
                         │
        ┌────────────────┼────────────────┐
        │                │                │
    T2 (BE-1)        T4 (BE-4)       T5 (BE-4)
    Middleware         Audit        Module Reg
        │                │                │
   ┌────┴─────┐         │           ┌────┘
   │          │         │           │
T3 (BE-1)  T9 (BE-2) T10 (BE-2)  T7 (FE-1)
DYC Admin  Direct.  Submit.      Shell
   │          │         │           │
   │      T11 (BE-1) ←──┘      T8 (FE-1)
   │       Visibility         Mgmt UI
   │          │                   │
T12 (BE-3)    │              T14 (FE-2)
Ops logs      │              Migrate UI
   │          │                   │
T13 (BE-3)    │              T15 (FE-2)
Events    T21 (BE-4)         New UI
          Privacy test
              │
          T22 (BE-4)
          DYC test
              │
          T23 (BE-4)
          CI test
```

**Critical path**: T1 → T2 → T11 → T21 (BE-1 lead, BE-4 support)

---

## 3. Phân công theo tuần

### TUẦN 1: Backend Foundation (Ngày 1-5)

#### **Thứ 2 (Ngày 1)**

| Dev | Task | Deliverable | Time | Notes |
|-----|------|-------------|------|-------|
| **BE-1** | T1: Migration design | Schema design doc | 8h | Pair với BE-4 |
| **BE-2** | T9: Directives design | State machine diagram | 8h | Không code, chỉ thiết kế |
| **BE-3** | T12: Ops logs design | Schema + API spec | 8h | Không code, chỉ thiết kế |
| **BE-4** | T1: Support BE-1 | Review schema | 8h | Pair programming |
| **FE-1** | Tech research | Vite setup plan | 4h | Research, not code |
| **FE-2** | Tech research | Component lib research | 4h | Research, not code |

**Checkpoint Ngày 1:**
- ✅ Database schema designed
- ✅ Directives state machine defined
- ✅ Ops logs API spec ready
- ✅ Frontend tech decisions made

---

#### **Thứ 3 (Ngày 2)**

| Dev | Task | Deliverable | Time | Notes |
|-----|------|-------------|------|-------|
| **BE-1** | T1: Write migration | Migration script | 8h | Focus on core tables first |
| **BE-2** | T9: Directives tables | `directives` table only | 4h | Wait for T1 merge |
| **BE-2** | Study codebase | Understand routes pattern | 4h | Read `src/routes/` |
| **BE-3** | T12: Ops logs tables | `ops_logs`, `ops_log_attendance` | 4h | Wait for T1 merge |
| **BE-3** | Study codebase | Understand rule engine | 4h | Read `src/services/` |
| **BE-4** | T5: Module registry design | Manifest structure | 8h | Can start parallel |
| **FE-1** | - | - | 0h | Wait for API specs |
| **FE-2** | - | - | 0h | Wait for API specs |

**Checkpoint Ngày 2:**
- ✅ Migration script 50% done
- ✅ Module manifest designed
- ⏳ Backend team familiar with codebase

---

#### **Thứ 4 (Ngày 3)**

| Dev | Task | Deliverable | Time | Notes |
|-----|------|-------------|------|-------|
| **BE-1** | T1: Test migration | Idempotent tests | 4h | Run 2 times |
| **BE-1** | T2: Middleware start | `loadUnitContext` skeleton | 4h | Start after T1 done |
| **BE-2** | T9: Directives API | CRUD routes | 8h | After T1 merged |
| **BE-3** | T12: Ops logs API | CRUD routes | 8h | After T1 merged |
| **BE-4** | T5: Module registry impl | Manifest system | 4h | Independent |
| **BE-4** | T4: Audit design | Helper function spec | 4h | Design only |
| **FE-1** | - | - | 0h | Wait |
| **FE-2** | - | - | 0h | Wait |

**Conflict risk:** BE-2, BE-3 đều thêm routes → giải quyết:
- BE-2: `src/routes/directives.js` (file mới)
- BE-3: `src/routes/ops-logs.js` (file mới)
- BE-1: Đăng ký trong `src/routes/index.js` (merge sau cùng)

**Checkpoint Ngày 3:**
- ✅ T1 merged to staging
- ✅ Migration tested (idempotent)
- ✅ BE-2, BE-3 working on separate route files

---

#### **Thứ 5 (Ngày 4)**

| Dev | Task | Deliverable | Time | Notes |
|-----|------|-------------|------|-------|
| **BE-1** | T2: Middleware impl | `loadUnitContext` complete | 6h | Critical path |
| **BE-1** | T2: Register routes | Merge BE-2, BE-3 routes | 2h | Resolve conflicts |
| **BE-2** | T9: State transitions | Implement FSM | 6h | Depends on T2 |
| **BE-2** | T10: Submissions design | Schema + API spec | 2h | Start design |
| **BE-3** | T12: Attendance logic | Implement tracking | 6h | Depends on T2 |
| **BE-3** | T13: Events design | Event list + triggers | 2h | Start design |
| **BE-4** | T5: Menu API | `GET /api/v1/modules/menu` | 4h | **FE-1 can start after this** |
| **BE-4** | T4: Audit impl | `logAudit` helper | 4h | Ready for use |
| **FE-1** | - | - | 0h | Wait for T5 |
| **FE-2** | - | - | 0h | Wait for T7 |

**Checkpoint Ngày 4:**
- ✅ T2 merged (middleware ready)
- ✅ T4, T5 ready for use
- ✅ T9, T12 routes working
- ✅ **Frontend can start Ngày 5**

---

#### **Thứ 6 (Ngày 5)**

| Dev | Task | Deliverable | Time | Notes |
|-----|------|-------------|------|-------|
| **BE-1** | T2: Refactor policies | `scopeFor`, `isExecutive` | 6h | Use `req.unitRole` |
| **BE-1** | Code review | Review BE-2, BE-3, BE-4 PRs | 2h | Merge all |
| **BE-2** | T9: Notifications | Wire to rule engine | 4h | Complete T9 |
| **BE-2** | T10: Submissions impl | Create routes | 4h | Start T10 |
| **BE-3** | T12: Finish ops logs | Polish + tests | 4h | Complete T12 |
| **BE-3** | T13: Events impl | Wire 6 events | 4h | Complete T13 |
| **BE-4** | T5: Event endpoint | `/internal/events` stub | 2h | Complete T5 |
| **BE-4** | Write tests | Integration tests | 6h | Backend week 1 tests |
| **FE-1** | T7: Vite setup | Project init | 4h | **Start frontend** |
| **FE-1** | T7: Routing | React Router config | 4h | Basic structure |
| **FE-2** | Setup | Install deps, understand structure | 4h | Learn from FE-1 |
| **FE-2** | Study API | Read backend routes | 4h | Understand endpoints |

**Checkpoint Tuần 1:**
- ✅ T1, T2, T4, T5 complete (core platform ready)
- ✅ T9, T12, T13 complete (operations backend)
- ✅ T10 in progress
- ✅ Frontend started
- ✅ Test coverage ~80%

---

### TUẦN 2: Operations Complete + Shell Ready (Ngày 6-10)

#### **Thứ 2 (Ngày 6)**

| Dev | Task | Deliverable | Time | Notes |
|-----|------|-------------|------|-------|
| **BE-1** | T3: DYC admin start | Setting locks API | 6h | Start T3 |
| **BE-1** | Support frontend | Answer API questions | 2h | On-call |
| **BE-2** | T10: Submissions complete | Withdraw + respond API | 6h | Finish T10 |
| **BE-2** | T11: Visibility start | `scopeFor` update design | 2h | Start T11 |
| **BE-3** | Bug fixes | Fix T12, T13 issues | 4h | Polish |
| **BE-3** | Documentation | Document ops logs API | 4h | Write API docs |
| **BE-4** | Integration tests | Test T9, T10 flows | 8h | E2E tests |
| **FE-1** | T7: Layout | Header, Sidebar, Layout | 6h | Core shell |
| **FE-1** | T7: Auth | Login flow (use session) | 2h | Connect to `/auth/login` |
| **FE-2** | Mock API | Create mock endpoints | 8h | Allow parallel work |

**Checkpoint Ngày 6:**
- ✅ T10 complete
- ✅ T11 started
- ✅ Frontend layout working
- ✅ Mock API ready

---

#### **Thứ 3 (Ngày 7)**

| Dev | Task | Deliverable | Time | Notes |
|-----|------|-------------|------|-------|
| **BE-1** | T3: Global read | `scopeFor` DYC logic | 4h | Admin global |
| **BE-1** | T3: Bootstrap | DYC from `DEVOPS_EMAILS` | 2h | Startup logic |
| **BE-1** | T11: Support BE-2 | Review visibility design | 2h | Pair programming |
| **BE-2** | T11: `scopeFor` impl | 3 levels implementation | 6h | Core logic |
| **BE-2** | T11: Serializers | `toSummaryView` function | 2h | Data filtering |
| **BE-3** | Performance | Add indexes, optimize queries | 4h | DB optimization |
| **BE-3** | T3: Support BE-1 | Audit logging integration | 4h | Helper |
| **BE-4** | Docs | API documentation | 4h | Swagger/Postman |
| **BE-4** | Refactor | Code cleanup | 4h | Tech debt |
| **FE-1** | T7: Unit switcher | Switch unit component | 4h | Core feature |
| **FE-1** | T7: Menu | Dynamic menu from API | 4h | Real API integration |
| **FE-2** | T14: Start migration | Plan screens to migrate | 4h | Planning |
| **FE-2** | T14: Dashboard | "Việc hôm nay" component | 4h | First screen |

**Checkpoint Ngày 7:**
- ✅ T3 80% done
- ✅ T11 core logic done
- ✅ Frontend shell functional
- ✅ FE-2 started migration

---

#### **Thứ 4 (Ngày 8)**

| Dev | Task | Deliverable | Time | Notes |
|-----|------|-------------|------|-------|
| **BE-1** | T3: Finish | Complete DYC admin | 4h | Merge T3 |
| **BE-1** | T11: Settings UI backend | Visibility config API | 4h | For FE-1 |
| **BE-2** | T11: Apply to routes | Update all GET routes | 8h | Critical work |
| **BE-3** | Testing | Manual test all flows | 8h | QA work |
| **BE-4** | T21: Start | Privacy test design | 8h | **Start security tests** |
| **FE-1** | T7: Notifications | Notification bell | 4h | OneSignal integration |
| **FE-1** | T8: Units management | CRUD units | 4h | Admin UI |
| **FE-2** | T14: Activities | Activity list + detail | 8h | Major screen |

**Checkpoint Ngày 8:**
- ✅ T3 complete
- ✅ T11 applied to all routes
- ✅ Security tests started
- ✅ Activities screen working

---

#### **Thứ 5 (Ngày 9)**

| Dev | Task | Deliverable | Time | Notes |
|-----|------|-------------|------|-------|
| **BE-1** | T11: Polish | Edge cases, error handling | 4h | Finish T11 |
| **BE-1** | Code review | Review all PRs | 4h | Merge everything |
| **BE-2** | Bug fixes | Fix visibility issues | 6h | From testing |
| **BE-2** | Support frontend | Help with API integration | 2h | On-call |
| **BE-3** | Testing | Regression tests | 8h | All features |
| **BE-4** | T21: Implement | Privacy leak tests | 8h | Write test suite |
| **FE-1** | T8: Members | Membership management | 4h | Admin UI |
| **FE-1** | T8: Settings | Lock settings (DYC only) | 4h | Admin UI |
| **FE-2** | T14: Kanban | Kanban board | 8h | Complex component |

**Checkpoint Ngày 9:**
- ✅ T11 complete and merged
- ✅ T21 test suite ready
- ✅ Management UI complete
- ✅ Kanban working

---

#### **Thứ 6 (Ngày 10)**

| Dev | Task | Deliverable | Time | Notes |
|-----|------|-------------|------|-------|
| **BE-1** | Review | Final code review | 4h | Approve all PRs |
| **BE-1** | Documentation | Update all docs | 4h | Bump versions |
| **BE-2** | Polish | Final touches backend | 6h | Clean code |
| **BE-2** | Performance test | Load testing | 2h | 50 concurrent users |
| **BE-3** | Integration test | Full smoke test | 8h | All features |
| **BE-4** | T22: DYC tests | DYC access tests | 4h | Complete T22 |
| **BE-4** | T21: Refine | Fix flaky tests | 4h | Stable tests |
| **FE-1** | Polish | Responsive fixes | 6h | Mobile testing |
| **FE-1** | Accessibility | A11y review | 2h | Basic checks |
| **FE-2** | T14: Teams | Team management screen | 4h | Complete migration |
| **FE-2** | T14: Settings | Settings screen | 4h | Last old UI screen |

**Checkpoint Tuần 2:**
- ✅ Backend: T3, T10, T11 complete
- ✅ Frontend: T7, T8 complete, T14 80%
- ✅ Security tests: T21, T22 ready
- ✅ All core features working

---

### TUẦN 3: New UI + Integration (Ngày 11-15)

#### **Thứ 2 (Ngày 11)**

| Dev | Task | Deliverable | Time | Notes |
|-----|------|-------------|------|-------|
| **BE-1** | Support | Answer integration questions | 4h | On-call for frontend |
| **BE-1** | T23: CI design | GitHub Actions workflow | 4h | Plan CI integration |
| **BE-2** | API adjustments | Fix frontend feedback | 8h | Based on integration |
| **BE-3** | API adjustments | Fix frontend feedback | 8h | Based on integration |
| **BE-4** | T23: CI impl | Add tests to pipeline | 4h | Implement workflow |
| **BE-4** | Monitoring | Setup app monitoring | 4h | Logging, metrics |
| **FE-1** | T15: BTV screens start | Directives sent | 4h | New feature |
| **FE-1** | T15: BTV submissions | Submissions inbox | 4h | New feature |
| **FE-2** | T14: Finish migration | Polish old screens | 4h | Complete T14 |
| **FE-2** | T15: TCKT directives | Directives received | 4h | New feature |

**Checkpoint Ngày 11:**
- ✅ T14 complete (migration done)
- ✅ T15 started (50%)
- ✅ T23 implemented
- ✅ Backend stable

---

#### **Thứ 3 (Ngày 12)**

| Dev | Task | Deliverable | Time | Notes |
|-----|------|-------------|------|-------|
| **BE-1** | Buffer | Available for urgent fixes | 8h | Flexible |
| **BE-2** | Buffer | Available for urgent fixes | 8h | Flexible |
| **BE-3** | Buffer | Available for urgent fixes | 8h | Flexible |
| **BE-4** | T23: Test CI | Verify pipeline works | 4h | Complete T23 |
| **BE-4** | Documentation | Final docs update | 4h | All docs current |
| **FE-1** | T15: BTV dashboard | Summary stats | 4h | Analytics screen |
| **FE-1** | Polish | Fix UI bugs | 4h | Based on testing |
| **FE-2** | T15: TCKT submissions | Submission form | 4h | Submit items |
| **FE-2** | T15: Ops logs | Ops logs CRUD | 4h | Complete T15 |

**Checkpoint Ngày 12:**
- ✅ T15 complete
- ✅ T23 complete
- ✅ All 18 tasks done
- ✅ Ready for intensive testing

---

#### **Thứ 4-5 (Ngày 13-14): Integration Testing**

| Dev | Task | Focus | Time |
|-----|------|-------|------|
| **BE-1** | Testing lead | Coordinate testing | 16h |
| **BE-2** | Bug fixes | High priority | 16h |
| **BE-3** | Bug fixes | Medium priority | 16h |
| **BE-4** | Testing | Automated + manual | 16h |
| **FE-1** | Bug fixes | UI/UX issues | 16h |
| **FE-2** | Bug fixes | Component issues | 16h |

**Test scenarios:**
- BTV giao việc cho TCKT (directive flow)
- TCKT trình hồ sơ lên BTV (submission flow)
- TCKT tạo nhật ký trực ban (ops log)
- BTV xem dữ liệu ở mức `summary` (không lộ)
- DYC đọc mọi dữ liệu (có audit log)
- Admin đổi mức xem (visibility policy)
- Chuyển đơn vị (unit switcher)
- Mobile responsive (360px+)

**Checkpoint Ngày 14:**
- ✅ No P1 bugs
- ✅ ≤5 P2 bugs
- ✅ Test coverage ~80%
- ✅ Performance p95 <500ms

---

#### **Thứ 6 (Ngày 15): Staging Deploy**

| Dev | Task | Deliverable | Time |
|-----|------|-------------|------|
| **All** | Deploy staging | Full deployment | 2h |
| **All** | Smoke test | Test all features | 4h |
| **All** | Fix issues | Urgent fixes only | 2h |

**Deploy checklist:**
- [ ] Database backed up
- [ ] Migration tested on staging data
- [ ] Environment variables set
- [ ] Nginx configured
- [ ] SSL certificates valid
- [ ] Monitoring active
- [ ] All tests pass

**Checkpoint Tuần 3:**
- ✅ Staging deployed successfully
- ✅ All features working on staging
- ✅ Ready for production

---

### TUẦN 4: Production Deploy + Monitoring (Ngày 16-20)

#### **Thứ 2-3 (Ngày 16-17): Final Testing**

| Dev | Task | Time |
|-----|------|------|
| **All** | Stakeholder testing | 8h |
| **All** | Fix feedback | 8h |

**User acceptance testing:**
- BTV stakeholders test
- TCKT stakeholders test
- DYC admins test
- Collect feedback
- Fix critical issues only

---

#### **Thứ 4 (Ngày 18): Production Deploy**

| Time | Activity | Responsible |
|------|----------|-------------|
| 09:00 | Final go/no-go meeting | All |
| 10:00 | Backup production DB | BE-4 |
| 10:30 | Deploy code | BE-1, BE-2 |
| 11:00 | Run migration | BE-1 |
| 11:30 | Verify deployment | BE-3, BE-4 |
| 12:00 | Smoke test | FE-1, FE-2 |
| 13:00 | Go live announcement | PM |
| 14:00 | Monitor | All |

---

#### **Thứ 5-6 (Ngày 19-20): Monitor + Hotfix**

| Dev | Role | Availability |
|-----|------|--------------|
| **BE-1** | On-call primary | 8:00-20:00 |
| **BE-2** | On-call secondary | 8:00-20:00 |
| **BE-3** | Support | 9:00-18:00 |
| **BE-4** | Support | 9:00-18:00 |
| **FE-1** | On-call frontend | 9:00-18:00 |
| **FE-2** | Support | 9:00-18:00 |

**Monitor:**
- Error rates
- Response times
- User logins
- Feature usage
- Database performance

---

## 4. Conflict prevention strategies

### 4.1 Code ownership

**Backend files:**
```
BE-1 owns:
  src/middleware/unit-context.js
  src/policies/access.js
  src/routes/index.js (registration)
  src/config/migrate.js

BE-2 owns:
  src/routes/directives.js
  src/routes/submissions.js

BE-3 owns:
  src/routes/ops-logs.js
  src/services/events.js

BE-4 owns:
  src/routes/modules.js
  src/routes/admin.js
  src/services/audit.js
```

**Frontend files:**
```
FE-1 owns:
  src/shell/**
  src/lib/**
  src/ui/**
  src/App.tsx
  src/main.tsx

FE-2 owns:
  src/modules/dieu-hanh/**
```

### 4.2 Merge strategy

**Daily sync (5:00 PM):**
1. BE-1 merges vào `staging` trước (owner of shared files)
2. BE-2, BE-3, BE-4 rebase lên `staging` mới
3. FE-1 merges vào `staging`
4. FE-2 rebases lên `staging` mới

**Workflow:**
```bash
# BE-1 (lúc 5:00 PM)
git checkout staging
git pull
git merge be-1-feature
git push

# BE-2, BE-3, BE-4 (sau khi BE-1 push)
git checkout staging
git pull
git checkout be-2-feature
git rebase staging
# Resolve conflicts if any
git push -f

# Create PR: staging ← be-2-feature
# Merge sau khi review
```

### 4.3 Database migration strategy

**Chỉ BE-1 tạo migration files:**
- Các dev khác yêu cầu thêm bảng → nói BE-1
- BE-1 tạo migration, commit, push
- Các dev khác pull và chạy migration

**File naming:**
```
src/config/migrations/
├── 001-multi-unit-core.sql      (BE-1, Tuần 1 Thứ 3)
├── 002-directives-submissions.sql (BE-1, Tuần 2 Thứ 2)
└── 003-ops-logs.sql             (BE-1, Tuần 2 Thứ 2)
```

### 4.4 API contract

**Freeze API sau khi frontend start:**
- Tuần 1 Thứ 6: API endpoints confirmed
- BE-2, BE-3, BE-4 không được đổi response structure
- Cần thêm field → thêm optional field (backward compatible)
- Breaking change → sync với FE-1, FE-2 trước

**API versioning:**
```
/api/v1/*  (current, stable)
/api/v2/*  (future, breaking changes)
```

---

## 5. Communication protocol

### 5.1 Daily standup (9:00 AM, 15 phút)

**Format:**
```
BE-1: Yesterday | Today | Blockers
BE-2: ...
BE-3: ...
BE-4: ...
FE-1: ...
FE-2: ...
Sync: Dependencies check (5 min)
```

### 5.2 Sync points (khi cần)

**Backend sync** (BE-1, BE-2, BE-3, BE-4):
- Tuần 1 Thứ 4: After T1 merged
- Tuần 1 Thứ 6: Before T2 complete
- Tuần 2 Thứ 4: After T11 complete

**Frontend sync** (FE-1, FE-2):
- Tuần 2 Thứ 2: After T7 layout ready
- Tuần 2 Thứ 6: Before T14 start
- Tuần 3 Thứ 2: After T14 complete

**Cross-team sync** (All):
- Tuần 2 Thứ 2: API integration planning
- Tuần 3 Thứ 2: Integration issues review
- Tuần 3 Thứ 5: Pre-staging deploy

### 5.3 Escalation

**Blocked < 2 giờ:** Hỏi trong team channel  
**Blocked 2-4 giờ:** Ping BE-1 (backend) hoặc FE-1 (frontend)  
**Blocked > 4 giờ:** Sync meeting ngay (all hands)  
**Conflict code:** BE-1 hoặc FE-1 làm referee

---

## 6. Load balancing

### 6.1 Task complexity và time estimate

| Dev | Tuần 1 | Tuần 2 | Tuần 3 | Tuần 4 | Total |
|-----|--------|--------|--------|--------|-------|
| BE-1 | 40h (T1,T2) | 32h (T3,T11) | 16h (support) | 8h | 96h |
| BE-2 | 32h (T9) | 36h (T10,T11) | 16h (fixes) | 8h | 92h |
| BE-3 | 32h (T12,T13) | 24h (test) | 24h (fixes) | 8h | 88h |
| BE-4 | 32h (T4,T5) | 32h (test) | 24h (T21-23) | 8h | 96h |
| FE-1 | 8h | 32h (T7,T8) | 32h (T15) | 8h | 80h |
| FE-2 | 8h | 24h (mock) | 40h (T14,T15) | 8h | 80h |

**Balanced:** Mỗi dev ~80-96 giờ trong 4 tuần (20-24h/tuần, reasonable)

### 6.2 Critical path coverage

**BE-1 trên critical path:**
- Backup: BE-4 pair programming
- T1 critical → BE-4 full support
- T2 critical → BE-2 reviews
- T11 critical → BE-2 implements, BE-1 reviews

**Nếu BE-1 nghỉ:**
- Tuần 1: STOP, không thể thay thế (architecture lead)
- Tuần 2+: BE-4 takes over (đã familiar với code)

---

## 7. Risk mitigation

### 7.1 Risks và backup plan

| Risk | Probability | Impact | Mitigation | Backup |
|------|-------------|--------|------------|--------|
| BE-1 blocked T1 | Medium | Critical | BE-4 pair programming | Extend 1-2 ngày |
| BE-2, BE-3 conflict | High | Medium | Separate files | BE-1 merges daily |
| Frontend blocked by backend | Medium | Medium | Mock API | FE-2 creates mocks |
| T11 too complex | Medium | High | Start early (Tuần 2 Thứ 2) | Simplify to 2 levels |
| Integration issues | High | Medium | Daily integration testing | Buffer Tuần 3 |

### 7.2 Schedule buffer

**Built-in buffers:**
- Tuần 2 Thứ 6: Backend buffer day
- Tuần 3 Thứ 2: Integration buffer
- Tuần 3 Thứ 4-5: Testing buffer (2 ngày)
- Tuần 4: Full week buffer

**If ahead of schedule:**
- Tech debt cleanup
- Performance optimization
- Extra testing
- Documentation polish

**If behind schedule:**
- Cut T8 (management UI) → manual SQL
- Simplify T15 (new UI) → fewer screens
- Defer non-critical bugs to post-launch

---

## 8. Tools và workflow

### 8.1 Git branches

**Naming convention:**
```
be-1/T1-migration
be-2/T9-directives
be-3/T12-ops-logs
be-4/T5-modules
fe-1/T7-shell
fe-2/T14-migrate-ui
```

### 8.2 GitHub Projects

**Kanban board:**
```
Backlog | In Progress | Review | Done
```

**Labels:**
```
backend, frontend, critical, blocked, bug, enhancement
```

### 8.3 PR template

```markdown
## Task
T<number>: <title>

## Owner
BE-1 / BE-2 / BE-3 / BE-4 / FE-1 / FE-2

## Changes
- Added X
- Modified Y

## Dependencies
- Depends on: T<number> (merged)
- Blocks: T<number>

## Test plan
1. ...
2. ...

## Screenshots
(nếu UI)

## Checklist
- [ ] Tests pass
- [ ] No conflicts with shared files
- [ ] Docs updated
```

### 8.4 Communication channels

| Channel | Purpose | SLA |
|---------|---------|-----|
| Slack `#dev-backend` | Backend team | <1h |
| Slack `#dev-frontend` | Frontend team | <1h |
| Slack `#dev-all` | Cross-team | <1h |
| GitHub PR | Code review | <4h |
| Daily standup | Sync | Every 9 AM |
| Video call | Urgent | On-demand |

---

## 9. Success metrics

### 9.1 Per developer

| Metric | Target |
|--------|--------|
| Tasks completed on time | 100% |
| Code review turnaround | <4h |
| Bugs introduced | <2 per task |
| Test coverage | ≥80% |
| Commit frequency | ≥2 per day |

### 9.2 Team

| Metric | Target |
|--------|--------|
| Velocity | 18 tasks / 4 weeks |
| Sprint burn-down | Linear |
| Integration issues | <5 major |
| Merge conflicts | <10 total |
| CI success rate | ≥95% |

---

## 10. Onboarding (nếu cần thêm người)

**Nếu thêm BE-5 giữa chừng:**
- Tuần 1: Pair với BE-4 (ít critical)
- Tuần 2: Nhận T4 (audit) từ BE-4
- Tuần 3: Bug fixes và testing

**Nếu thêm FE-3 giữa chừng:**
- Tuần 2: Pair với FE-2
- Tuần 3: Nhận một phần T14 hoặc T15

---

## Lịch sử phiên bản

| Version | Ngày | Thay đổi | Người |
|---|---|---|---|
| 1.0 | 2026-09-24 | Phân công chi tiết 6 devs (4 BE + 2 FE) | DYC |
