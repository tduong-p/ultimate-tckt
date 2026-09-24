---
doc_id: PLAN-HUB-001
title: Kế hoạch phát triển Hub (Core + Operations, không CTD)
version: 1.0
status: active
audience: [dev, ba]
owner: DYC
updated: 2026-09-24
related_code: [core/**, web/**]
---

# Kế hoạch phát triển Hub (Core + Operations, không CTD)

Tài liệu này là kế hoạch chi tiết phát triển **Hub system** (Core Platform + Module Điều hành) **không bao gồm tích hợp CTD**, phù hợp khi:
- Chỉ có team backend Node.js + frontend React
- Không có team Python/FastAPI
- Muốn deploy nhanh Core Platform trước
- CTD sẽ tích hợp sau (hoặc không cần)

## 1. Tổng quan

### 1.1 Phạm vi

**Trong phạm vi:**
- ✅ Core Platform: đơn vị, membership, phân quyền, audit, module registry
- ✅ Operations Module: directives, submissions, visibility policies, ops logs
- ✅ Frontend React shell (`web/`)
- ✅ Migrate UI cũ từ `core/public/`
- ✅ Security testing (privacy leak tests)

**Ngoài phạm vi:**
- ❌ CTD integration (JWT bridge, role mapping, CTD frontend migration)
- ❌ Tasks 16-20 (toàn bộ phần CTD)
- ❌ Task 6 phần JWT bridge (giữ lại phần `/internal/events`)

**Tasks: 18 tasks** (từ 24 tasks gốc, bỏ 6 tasks liên quan CTD)

### 1.2 Tech stack

**Backend:**
- Node.js 22
- Express 5
- MySQL 8
- Session-based auth (existing)

**Frontend:**
- React 18
- TypeScript
- Vite
- React Router v6
- TanStack Query (hoặc SWR cho data fetching)
- Tailwind CSS (optional, hoặc custom CSS như hiện tại)

**Infrastructure:**
- Same as current (Docker Compose, nginx, Oracle ARM VM)
- No CTD containers needed

### 1.3 Timeline

**4 tuần** (thay vì 6 tuần full version với CTD)

| Tuần | Focus | Deliverables |
|------|-------|-------------|
| 1 | Backend foundation | Migration, middleware, DYC admin, audit |
| 2 | Operations features | Directives, submissions, visibility, ops logs |
| 3 | Frontend shell + migration | React shell, migrate old UI, new screens |
| 4 | Testing + deployment | Security tests, integration, staging deploy |

## 2. Team organization

### 2.1 Cấu trúc team đề xuất

**Team nhỏ gọn: 4-6 developers**

#### **Nhóm A: Backend** (2-3 devs)
- **Lead**: Node.js expert, MySQL, system design
- **Dev 1-2**: Node.js, Express, business logic
- **Tasks**: T1-5, T9-13 (critical path)
- **Timeline**: Tuần 1-2 (full time), tuần 3-4 (support frontend)

#### **Nhóm B: Frontend** (2-3 devs)
- **Lead**: React expert, TypeScript, architecture
- **Dev 1-2**: React, UI/UX, component development
- **Tasks**: T7-8, T14-15, T21-23
- **Timeline**: Tuần 2-4

**Note**: Có thể overlap - 1 fullstack dev làm cả backend và frontend

### 2.2 Phân công chi tiết

| Dev | Role | Primary tasks | Backup tasks |
|-----|------|---------------|--------------|
| Dev 1 | Backend Lead | T1-3, T11 | T9-10 review |
| Dev 2 | Backend | T4-5, T9-10 | T12-13 |
| Dev 3 | Backend/Fullstack | T12-13, support frontend | T11 |
| Dev 4 | Frontend Lead | T7-8, T14 | T15, T21-23 |
| Dev 5 | Frontend | T14, T15 | T7-8 |
| Dev 6 | QA/Fullstack | T21-23, testing | Any blocked task |

**Minimum viable team: 4 devs** (2 backend, 2 frontend)

## 3. Tasks breakdown (18 tasks)

### 3.1 Core Platform (Tasks 1-5)

#### **T1: Database migration** (Critical, 3 ngày)
**Owner**: Dev 1 (Backend Lead)

**Deliverables:**
```sql
-- 8 bảng mới (bỏ 2 bảng CTD: directives.unit_modules, không cần)
org_units
unit_memberships
unit_visibility_policies
setting_locks
audit_logs
directives
submissions
ops_logs
ops_log_attendance
```

**Steps:**
1. Design schema với proper indexes
2. Write idempotent migration script
3. Seed units: DYC, BTV, TCKT (bỏ VP Đoàn, Chi bộ, ĐT/LCĐ - chỉ cần cho CTD)
4. Migrate existing data → TCKT
5. Test run 2 lần (idempotent check)
6. Write rollback script

**Test coverage**: ≥90% (critical)

**Acceptance:**
- [ ] Migration chạy được 2 lần không lỗi
- [ ] Dữ liệu cũ migrate đúng sang TCKT
- [ ] Seed data cho 3 đơn vị (DYC, BTV, TCKT)
- [ ] Foreign keys + indexes đúng
- [ ] Tests pass

---

#### **T2: Middleware + refactor policies** (3 ngày)
**Owner**: Dev 1 (Backend Lead)  
**Depends on**: T1

**Deliverables:**
- `src/middleware/unit-context.js` - Load unit context
- Refactor `src/policies/access.js` - Use `req.unitRole`

**Steps:**
1. Create `loadUnitContext` middleware
2. Handle fallback: invalid unit → first membership
3. Handle no membership → 403
4. Refactor all policy functions: `isExecutive`, `leadsTeam`, etc.
5. Update all routes to use new middleware

**Test coverage**: ≥85%

**Acceptance:**
- [ ] `req.unit`, `req.unitRole`, `req.memberships` available
- [ ] Fallback logic works
- [ ] Old tests still pass (backward compat)
- [ ] New tests for multi-unit scenarios

---

#### **T3: DYC admin + setting locks** (2 ngày)
**Owner**: Dev 1  
**Depends on**: T2

**Deliverables:**
- Column `managed_by` for settings
- API: lock/unlock settings (DYC only)
- Bootstrap DYC admin from `DEVOPS_EMAILS`
- `scopeFor` treats DYC as global admin

**Steps:**
1. Add `managed_by` column to relevant tables
2. Create `setting_locks` CRUD API
3. Bootstrap logic in startup (`src/runtime.js`)
4. Update `scopeFor` for DYC global read
5. Write audit logs for DYC reads

**Acceptance:**
- [ ] DYC can lock any setting
- [ ] Non-DYC cannot modify locked settings
- [ ] DYC reads all data (no 403)
- [ ] Every DYC cross-unit read logged to `audit_logs`

---

#### **T4: Audit logging** (1 ngày)
**Owner**: Dev 2  
**Depends on**: T2, T3

**Deliverables:**
- Audit helper: `logAudit(actor, action, target, meta)`
- Wire into: cross-unit reads, visibility changes, lock ops, membership changes

**Steps:**
1. Create audit logging helper
2. Add to DYC read paths
3. Add to visibility policy changes
4. Add to setting lock operations
5. Add to membership CRUD

**Acceptance:**
- [ ] DYC reads logged
- [ ] Visibility changes logged
- [ ] Lock operations logged
- [ ] Audit log API for admins

---

#### **T5: Module registry (không JWT bridge)** (2 ngày)
**Owner**: Dev 2  
**Depends on**: T2

**Deliverables:**
- Module manifest system
- API: `GET /api/v1/modules/menu` - Return menu by membership
- `/internal/events` endpoint (for future module integration)

**Steps:**
1. Define manifest structure for `dieu-hanh` module
2. Create module registry service
3. API returns menu filtered by unit + membership
4. Event receiver endpoint (stub for now)

**Acceptance:**
- [ ] Manifest for `dieu-hanh` defined
- [ ] API returns correct menu for BTV vs TCKT
- [ ] Event endpoint ready (empty handler OK)

---

### 3.2 Operations Module (Tasks 9-15)

#### **T9: Directives** (3 ngày)
**Owner**: Dev 2  
**Depends on**: T2

**Deliverables:**
- Table: `directives`
- API: CRUD + state transitions
- State machine: `sent → acknowledged → in_progress → submitted → accepted/revision_requested`
- Notifications at each transition

**Steps:**
1. Create directives table
2. CRUD API with proper permissions
3. State transition logic with validation
4. Wire to rule engine for notifications
5. 48-hour overdue alert

**Acceptance:**
- [ ] BTV can create directive to TCKT
- [ ] TCKT admin can acknowledge + assign owner
- [ ] Progress auto-calculated from activities
- [ ] Notifications sent at transitions
- [ ] Overdue alerts work

---

#### **T10: Submissions** (2 ngày)
**Owner**: Dev 2  
**Depends on**: T9

**Deliverables:**
- Table: `submissions`
- API: submit, withdraw, respond
- Link to directives (optional)

**Steps:**
1. Create submissions table
2. Submit API (activity/ops_log/report)
3. Withdraw API (before response only)
4. Respond API (seen/revision_requested/accepted)
5. Notifications

**Acceptance:**
- [ ] TCKT can submit any item to BTV
- [ ] Can withdraw before response
- [ ] Cannot withdraw after response
- [ ] BTV sees submitted item (bypass visibility policy)

---

#### **T11: Visibility policies** (3 ngày)
**Owner**: Dev 1  
**Depends on**: T2, T9, T10

**Deliverables:**
- `scopeFor` implementation with 3 levels
- `toSummaryView` serializer
- UI: Settings → Visibility policies
- Seed: BTV→TCKT = `summary`

**Steps:**
1. Update `scopeFor` function
2. Implement 3 levels: summary / tasks_readonly / full_readonly
3. Create serializer `toSummaryView`
4. Settings UI for admins
5. Apply to all GET routes

**Test coverage**: ≥90% (critical for security)

**Acceptance:**
- [ ] BTV at `summary` sees only: id, title, status, priority, dates, progress
- [ ] BTV at `tasks_readonly` sees + tasks
- [ ] BTV at `full_readonly` sees + comments, attachments
- [ ] Admin can change level with audit log
- [ ] Non-admin cannot change

---

#### **T12: Ops logs** (2 ngày)
**Owner**: Dev 3  
**Depends on**: T2

**Deliverables:**
- Tables: `ops_logs`, `ops_log_attendance`
- API: CRUD with attendance
- Types: duty_shift, meeting, other

**Steps:**
1. Create ops logs tables
2. CRUD API (leader+ only)
3. Attendance tracking
4. Event: `ops_log.absent_recorded`

**Acceptance:**
- [ ] Leader+ can create ops log
- [ ] Member cannot create
- [ ] Attendance recorded
- [ ] Event fires on absent

---

#### **T13: Rule engine events** (1 ngày)
**Owner**: Dev 3  
**Depends on**: T9, T10, T12

**Deliverables:**
- Wire new events to rule engine

**Events:**
```javascript
'directive.created'
'directive.acknowledged'
'directive.overdue'
'submission.created'
'submission.responded'
'ops_log.absent_recorded'
```

**Acceptance:**
- [ ] All events fire at correct times
- [ ] Email rules can use these events
- [ ] Test notifications work

---

### 3.3 Frontend Shell (Tasks 7-8, 14-15)

#### **T7: React shell** (4 ngày)
**Owner**: Dev 4 (Frontend Lead)  
**Depends on**: T5 (module API)

**Deliverables:**
- `web/` project setup (Vite + React + TS)
- Layout: header, sidebar, main content
- Login flow (use existing session)
- Unit switcher
- Dynamic menu from API
- Notification bell (OneSignal integration)

**Tech decisions:**
- Router: React Router v6
- State: React Context + TanStack Query
- Styling: Tailwind CSS hoặc custom CSS (match design token)
- UI library: Shadcn/ui hoặc custom components

**Structure:**
```
web/
├── src/
│   ├── shell/              # Shell components
│   │   ├── Layout.tsx
│   │   ├── Header.tsx
│   │   ├── Sidebar.tsx
│   │   ├── UnitSwitcher.tsx
│   │   └── NotificationBell.tsx
│   ├── ui/                 # Shared UI components
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Input.tsx
│   │   └── ...
│   ├── lib/                # Utilities
│   │   ├── api.ts
│   │   ├── auth.tsx
│   │   └── utils.ts
│   ├── modules/            # Module-specific code
│   │   └── dieu-hanh/      # Operations module
│   │       ├── activities/
│   │       ├── tasks/
│   │       └── ...
│   ├── App.tsx
│   └── main.tsx
├── package.json
├── vite.config.ts
└── tsconfig.json
```

**Steps:**
1. Initialize Vite + React + TypeScript
2. Setup routing
3. Create shell layout components
4. Implement authentication (session-based)
5. Unit switcher component
6. Fetch menu from API
7. Notification integration
8. Mobile responsive (≥360px)

**Acceptance:**
- [ ] User can login (use existing `/auth/login` API)
- [ ] Unit switcher works
- [ ] Menu loads dynamically
- [ ] Mobile responsive
- [ ] Notifications visible

---

#### **T8: Management UI (DYC/admin)** (2 ngày)
**Owner**: Dev 4  
**Depends on**: T7

**Deliverables:**
- Unit management (CRUD)
- Membership management (CRUD)
- Setting locks UI (DYC only)

**Screens:**
1. Units list + create/edit
2. Members list + add/remove
3. Settings → Locks (DYC only)

**Acceptance:**
- [ ] DYC can manage units
- [ ] Admin can manage memberships in their unit
- [ ] DYC can lock/unlock settings

---

#### **T14: Migrate old UI** (4 ngày)
**Owner**: Dev 5  
**Depends on**: T7

**Deliverables:**
- Migrate from `core/public/app.js` to `web/src/modules/dieu-hanh/`

**Screens to migrate:**
1. Dashboard (Việc hôm nay)
2. Activities list + detail
3. Kanban board
4. Teams management
5. Settings (email, cron - merge với T8)

**Steps:**
1. Create React components for each screen
2. Replace vanilla JS logic with React
3. Use TanStack Query for data fetching
4. Match existing functionality
5. Mobile optimize "Việc hôm nay"

**Acceptance:**
- [ ] All features from old UI work
- [ ] Mobile responsive for key screens
- [ ] No regression in functionality
- [ ] Can deprecate `core/public/app.js`

---

#### **T15: New Operations UI** (3 ngày)
**Owner**: Dev 5  
**Depends on**: T9, T10, T11, T12, T14

**Deliverables:**
- BTV screens
- TCKT screens

**BTV screens:**
1. Assigned work (directives sent)
2. Received submissions (inbox)
3. Dashboard (summary stats)

**TCKT screens:**
1. Work from BTV (directives received)
2. Submitted items (submissions sent)
3. Ops logs (duty shifts, meetings)

**Acceptance:**
- [ ] BTV sees directives they sent
- [ ] BTV sees submissions received
- [ ] TCKT sees directives received
- [ ] TCKT can submit items
- [ ] Ops logs CRUD works

---

### 3.4 Security Testing (Tasks 21-23)

#### **T21: Privacy leak tests** (2 ngày)
**Owner**: Dev 6 (QA)  
**Depends on**: T11

**Deliverables:**
- Test suite: BTV at `summary` level
- Check all GET routes for data leaks

**Test scenarios:**
1. BTV login at `summary` level
2. Call all GET `/api/v1/*` endpoints
3. Assert response contains ONLY allowed fields
4. Assert NO task IDs, checklist IDs, ops_log IDs leaked

**Acceptance:**
- [ ] Test suite covers all GET routes
- [ ] Fails if any leak detected
- [ ] Passes with proper serialization

---

#### **T22: DYC access tests** (1 ngày)
**Owner**: Dev 6  
**Depends on**: T3

**Deliverables:**
- Test: DYC can read all endpoints (no 403)
- Test: Every read generates audit log

**Acceptance:**
- [ ] DYC reads all business endpoints
- [ ] No 403 errors
- [ ] Audit logs created

---

#### **T23: CI integration** (1 ngày)
**Owner**: Dev 6  
**Depends on**: T21, T22

**Deliverables:**
- Add T21-22 to GitHub Actions
- Block merge on failure

**Steps:**
1. Create `.github/workflows/security-tests.yml`
2. Run privacy leak tests
3. Run DYC access tests
4. Fail PR if either fails

**Acceptance:**
- [ ] CI runs security tests
- [ ] Merge blocked on failure
- [ ] Tests run on every PR to staging

---

## 4. Weekly timeline

### 4.1 Tuần 1: Backend Foundation

**Goal**: Core platform ready

| Day | Backend (Dev 1-3) | Frontend (Dev 4-5) | QA (Dev 6) |
|-----|-------------------|--------------------|-----------| 
| Mon | T1: Migration design | Planning, tech stack research | Setup test environment |
| Tue | T1: Implementation (pair) | - | Review T1 |
| Wed | T1: Testing + T2: Middleware start | - | Test T1 |
| Thu | T2: Middleware impl | - | Test T2 |
| Fri | T2: Refactor policies | - | Integration test T1-2 |

**Checkpoint:**
- ✅ Migration idempotent
- ✅ Middleware works
- ✅ 90% test coverage

---

### 4.2 Tuần 2: Operations + Shell Start

**Goal**: Operations backend + frontend shell

| Day | Backend (Dev 1-3) | Frontend (Dev 4-5) | QA (Dev 6) |
|-----|-------------------|--------------------|-----------| 
| Mon | T3: DYC admin (Dev 1)<br>T9: Directives start (Dev 2) | T7: Vite setup, routing | Test T3 |
| Tue | T4: Audit (Dev 1)<br>T9: Directives (Dev 2)<br>T12: Ops logs start (Dev 3) | T7: Shell layout | Test T9 |
| Wed | T5: Module registry (Dev 1)<br>T9: Directives (Dev 2)<br>T12: Ops logs (Dev 3) | T7: Auth + unit switcher | Test T12 |
| Thu | T10: Submissions (Dev 2)<br>T13: Events (Dev 3) | T7: Menu + notifications | Integration test |
| Fri | T11: Visibility start (Dev 1) | T8: Management UI start | Test T5, T10, T13 |

**Checkpoint:**
- ✅ DYC admin works
- ✅ Directives flow complete
- ✅ Submissions work
- ✅ React shell login works

---

### 4.3 Tuần 3: UI Migration + Policies

**Goal**: UI complete, visibility policies working

| Day | Backend (Dev 1-3) | Frontend (Dev 4-5) | QA (Dev 6) |
|-----|-------------------|--------------------|-----------| 
| Mon | T11: Visibility impl (Dev 1)<br>Support frontend | T8: Management UI (Dev 4)<br>T14: Start migration (Dev 5) | - |
| Tue | T11: Serializers (Dev 1)<br>Bug fixes | T14: Dashboard (Dev 5)<br>T8: Settings (Dev 4) | Test T11 |
| Wed | T11: Settings UI backend | T14: Activities (Dev 5)<br>T15: BTV screens start (Dev 4) | Manual test flows |
| Thu | Support frontend, API adjustments | T14: Kanban (Dev 5)<br>T15: BTV screens (Dev 4) | E2E testing |
| Fri | Code review, bug fixes | T15: TCKT screens (both devs) | Regression testing |

**Checkpoint:**
- ✅ Visibility policies work
- ✅ Old UI migrated
- ✅ New screens functional

---

### 4.4 Tuần 4: Testing + Deploy

**Goal**: Production ready

| Day | Backend | Frontend | QA (Dev 6) |
|-----|---------|----------|-----------|
| Mon | Bug fixes from testing | Polish UI, responsive fixes | T21: Privacy leak tests |
| Tue | Performance optimization | Accessibility review | T21: Continue |
| Wed | Security review | Final touches | T22: DYC access tests |
| Thu | - | - | T23: CI integration |
| Fri | Deploy staging | Deploy staging | Full smoke test |

**Checkpoint:**
- ✅ All 18 tasks complete
- ✅ Security tests pass
- ✅ Staging deployed
- ✅ Ready for production

---

## 5. Technical decisions

### 5.1 Frontend architecture

**Routing:**
```typescript
/app                    → Layout wrapper
/app/dashboard          → Dashboard (Việc hôm nay)
/app/activities         → Activities list
/app/activities/:id     → Activity detail
/app/kanban            → Kanban board
/app/directives        → BTV: directives sent / TCKT: received
/app/submissions       → Submission inbox
/app/ops-logs          → Operations logs
/app/teams             → Team management
/app/settings          → Settings
/app/admin/units       → DYC: unit management
/app/admin/members     → Admin: membership management
```

**State management:**
```typescript
// Auth context
const { user, unit, setUnit, logout } = useAuth();

// Data fetching
const { data, isLoading } = useQuery({
  queryKey: ['activities', unit.id],
  queryFn: () => api.getActivities(unit.id)
});

// Mutations
const mutation = useMutation({
  mutationFn: api.createActivity,
  onSuccess: () => queryClient.invalidateQueries(['activities'])
});
```

**API client:**
```typescript
// lib/api.ts
class ApiClient {
  private baseURL = '/api/v1';
  
  // Session-based auth (cookie), no JWT needed
  async get<T>(path: string): Promise<T> {
    const res = await fetch(`${this.baseURL}${path}`, {
      credentials: 'include' // Send session cookie
    });
    if (!res.ok) throw new ApiError(res);
    return res.json();
  }
  
  // ... post, put, delete
}

export const api = new ApiClient();
```

**Component structure:**
```typescript
// Example: Activity detail page
export function ActivityDetailPage() {
  const { id } = useParams();
  const { unit } = useAuth();
  const { data: activity, isLoading } = useQuery({
    queryKey: ['activity', id],
    queryFn: () => api.getActivity(id)
  });
  
  if (isLoading) return <Spinner />;
  if (!activity) return <NotFound />;
  
  return (
    <div>
      <ActivityHeader activity={activity} />
      <ActivityTasks tasks={activity.tasks} />
      <ActivityTimeline updates={activity.updates} />
    </div>
  );
}
```

### 5.2 Backend patterns

**Middleware stack:**
```javascript
app.use(helmet(cspConfig));
app.use(session(sessionConfig));
app.use(loadUnitContext);  // NEW: loads req.unit, req.unitRole, req.memberships
app.use('/api', apiRoutes);
app.use('/app', express.static('web/dist'));  // Serve React app
app.use(errorHandler);
```

**Route pattern:**
```javascript
// src/routes/directives.js
export function createDirectivesRoutes(context) {
  const { db, auth, policies } = context;
  const router = express.Router();
  
  router.get('/', auth, asyncRoute(async (req, res) => {
    const scope = policies.scopeFor(req.user, 'directives');
    const directives = await db.query(`
      SELECT * FROM directives
      WHERE ${scope.where}
    `, scope.params);
    
    res.json({ directives });
  }));
  
  router.post('/', auth, asyncRoute(async (req, res) => {
    // Only BTV can create
    if (req.unitRole !== 'btv_lead' && req.unitRole !== 'btv_member') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    
    // Create directive...
    res.json({ directive });
  }));
  
  return router;
}
```

**Scope function:**
```javascript
// src/policies/access.js
export function scopeFor(user, resourceType) {
  const { unit, unitRole, memberships } = user;
  
  // DYC: global admin
  if (unit.kind === 'platform_owner') {
    logAudit(user, 'read', resourceType, { crossUnit: true });
    return { where: '1=1', params: [] };
  }
  
  // Same unit: full access (RBAC applies)
  // Different unit: check visibility policy
  // ...
  
  return { where, params };
}
```

### 5.3 Database indexes

**Critical indexes:**
```sql
-- Memberships lookup (frequent)
CREATE INDEX idx_memberships_user ON unit_memberships(user_id);
CREATE INDEX idx_memberships_unit ON unit_memberships(unit_id);

-- Activities/tasks filtering
CREATE INDEX idx_activities_unit ON activities(unit_id, status);
CREATE INDEX idx_tasks_activity ON tasks(activity_id, status);

-- Directives filtering
CREATE INDEX idx_directives_from ON directives(from_unit_id, status);
CREATE INDEX idx_directives_to ON directives(to_unit_id, status);

-- Audit logs (DYC queries)
CREATE INDEX idx_audit_actor ON audit_logs(actor_id, created_at);
CREATE INDEX idx_audit_target ON audit_logs(target_type, target_id);
```

### 5.4 Testing strategy

**Backend tests:**
```javascript
// tests/routes.directives.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setupTestDB, createTestServer } from './helpers/index.js';

test('BTV can create directive to TCKT', async () => {
  const { db, cleanup } = await setupTestDB();
  const server = createTestServer(db);
  
  // Login as BTV
  const agent = request(server);
  await agent.post('/auth/login').send({
    email: 'btv.lead@example.com',
    password: 'test123'
  });
  
  // Create directive
  const res = await agent.post('/api/v1/directives').send({
    to_unit_id: TCKT_UNIT_ID,
    title: 'Test directive',
    body: 'Content',
    deadline: '2026-12-31'
  });
  
  assert.equal(res.status, 201);
  assert.equal(res.body.directive.status, 'sent');
  
  // Check notification sent
  const notifications = await db.query(
    'SELECT * FROM notifications WHERE user_id = ?',
    [TCKT_ADMIN_ID]
  );
  assert.equal(notifications.length, 1);
  
  await cleanup();
});
```

**Frontend tests:**
```typescript
// src/modules/dieu-hanh/activities/ActivityList.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ActivityList } from './ActivityList';

test('renders activity list', async () => {
  const queryClient = new QueryClient();
  
  render(
    <QueryClientProvider client={queryClient}>
      <ActivityList />
    </QueryClientProvider>
  );
  
  await waitFor(() => {
    expect(screen.getByText('Hoạt động')).toBeInTheDocument();
  });
});
```

## 6. Deployment

### 6.1 Build process

**Backend:**
```bash
# No build needed (Node.js runtime)
cd core
npm install --production
npm run migrate
node app.js
```

**Frontend:**
```bash
cd web
npm install
npm run build  # → dist/

# Serve from Core
# core/src/app.js: app.use('/app', express.static('web/dist'))
```

### 6.2 Docker Compose (simplified, no CTD)

```yaml
# infra/ultimate-tckt-staging/compose.yml
services:
  core:
    image: ghcr.io/tduong-p/ultimate-tckt/core:staging
    environment:
      NODE_ENV: production
      DB_HOST: core-db
    volumes:
      - uploads:/app/uploads
    depends_on:
      - core-db
    ports:
      - "127.0.0.1:3000:3000"
  
  core-db:
    image: mysql:8
    environment:
      MYSQL_DATABASE: tckt_hub
      MYSQL_ROOT_PASSWORD: ${DB_ROOT_PASSWORD}
    volumes:
      - core-db-data:/var/lib/mysql
    ports:
      - "127.0.0.1:3306:3306"

volumes:
  core-db-data:
  uploads:
```

**Simplified nginx config:**
```nginx
# infra/ultimate-tckt-staging/nginx.conf
server {
    server_name tckt-hub-staging.duckdns.org;
    
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    # SSL managed by certbot
}
```

### 6.3 CI/CD adjustments

**Simplified pipeline (no CTD build):**
```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [staging, main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      # Core tests
      - name: Core tests
        run: |
          cd core
          npm install
          npm test
      
      # Frontend build test
      - name: Frontend build
        run: |
          cd web
          npm install
          npm run build
      
      # Security tests
      - name: Security tests
        run: npm run test:security
  
  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      # Build and push Core image
      - name: Build Core
        run: |
          docker build -t ghcr.io/tduong-p/ultimate-tckt/core:${{ github.ref_name }} \
            -f core/Dockerfile .
          docker push ghcr.io/tduong-p/ultimate-tckt/core:${{ github.ref_name }}
      
      # SSH deploy
      - name: Deploy to VM
        run: |
          ssh vm "cd /opt/ultimate-tckt-${{ github.ref_name }} && \
            docker compose pull && \
            docker compose up -d"
```

## 7. Migration strategy

### 7.1 From current to new system

**Phase 1: Parallel run (1 tuần)**
- Old UI at `/` (existing)
- New UI at `/app` (new React shell)
- Same backend, same database
- Users test new UI, report bugs

**Phase 2: Gradual cutover (1 tuần)**
- Default landing → `/app`
- Old UI at `/legacy` (backup)
- Monitor error rates

**Phase 3: Deprecate old (sau 2 tuần)**
- Remove `core/public/app.js`
- Remove legacy routes
- Cleanup old code

### 7.2 Data migration

**No data migration needed** - same database, just add new tables

**Steps:**
1. Deploy with migration
2. Migration runs automatically on startup
3. Existing data tagged with TCKT unit
4. No downtime

### 7.3 Rollback plan

**If deployment fails:**
```bash
# Rollback database
cd /opt/ultimate-tckt-staging
./scripts/restore-backup.sh <backup-id>

# Rollback code
git reset --hard <previous-commit>
docker compose up -d
```

**If frontend broken:**
- Old UI still available at `/legacy`
- Switch nginx config back
- No data lost

## 8. Success metrics

### 8.1 Development metrics

| Metric | Target | How to measure |
|--------|--------|----------------|
| Velocity | 4-5 tasks/week | GitHub project board |
| Test coverage | ≥80% backend, ≥70% frontend | Coverage reports |
| Bug density | <5 bugs/1000 LOC | Issue tracker |
| Code review time | <4 hours | GitHub PR metrics |
| CI success rate | ≥95% | GitHub Actions |

### 8.2 Quality metrics

| Metric | Target | How to measure |
|--------|--------|----------------|
| Security tests | 100% pass | CI pipeline |
| Performance | p95 <500ms | Application monitoring |
| Uptime | ≥99.5% | Status monitoring |
| Error rate | <0.5% | Log aggregation |

### 8.3 User metrics (post-launch)

| Metric | Target | How to measure |
|--------|--------|----------------|
| BTV adoption | 80% in 1 week | Login analytics |
| TCKT adoption | 90% in 1 week | Login analytics |
| Mobile usage | ≥30% of traffic | Analytics |
| User satisfaction | ≥4/5 | Survey |

## 9. Risks and mitigation

### 9.1 Technical risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Frontend migration breaks features | Medium | High | Parallel run, extensive testing, rollback plan |
| Performance degradation | Low | Medium | Indexes, query optimization, caching |
| Security vulnerabilities | Low | Critical | Security tests, code review, penetration test |
| Browser compatibility issues | Low | Low | Test on Chrome, Firefox, Safari, Edge |

### 9.2 Schedule risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Backend delay blocks frontend | Medium | High | Frontend mocks API, develops in parallel |
| Key developer unavailable | Medium | Medium | Cross-training, pair programming, documentation |
| Scope creep | Low | Medium | Strict scope control, defer to Phase 2 |
| Integration issues | Medium | Medium | Early integration testing, daily standup |

### 9.3 Business risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| User resistance to new UI | Low | Medium | Training, gradual rollout, keep old UI accessible |
| BTV/TCKT workflow disruption | Low | High | Parallel run, test with real users before cutover |
| Missing features from old UI | Medium | Medium | Feature parity checklist, user feedback |

## 10. Team workflow

### 10.1 Daily standup (9:00 AM, 15 min)

**Format:**
1. Backend team (5 min)
2. Frontend team (5 min)
3. Blockers + sync (5 min)

**Questions:**
- Yesterday? Today? Blocked?

### 10.2 Weekly review (Friday 2:00 PM, 1 hour)

**Agenda:**
- Demo working features
- Review metrics (velocity, bugs, coverage)
- Plan next week
- Retrospective (last 15 min)

### 10.3 Communication

| Channel | Purpose | SLA |
|---------|---------|-----|
| GitHub PR | Code review | <4 hours |
| GitHub Issues | Bug tracking | <1 day |
| Daily standup | Sync + blockers | Daily 9 AM |
| Slack/Zalo | Urgent only | <15 min |

## 11. Definition of Done

**Per task:**
- [ ] Code complete and pushed
- [ ] Tests written (≥80% coverage for new code)
- [ ] Tests pass locally
- [ ] Code reviewed and approved
- [ ] Documentation updated
- [ ] Manual testing done
- [ ] No ESLint/TypeScript errors
- [ ] Merged to staging

**Per sprint:**
- [ ] All tasks marked Done
- [ ] No P1 bugs
- [ ] Demo to stakeholders
- [ ] Deployed to staging
- [ ] Smoke tests pass

**Project complete:**
- [ ] All 18 tasks Done
- [ ] Security tests pass in CI
- [ ] Performance tests pass
- [ ] Staging fully tested
- [ ] Production deployed
- [ ] Monitoring active
- [ ] Documentation complete

## 12. Next steps

### 12.1 Immediate (today)

1. Review and approve this plan
2. Assign developers to teams
3. Setup project board (GitHub Projects)
4. Schedule kickoff meeting

### 12.2 Week 1 Day 1

1. Kickoff meeting (1 hour)
   - Review plan
   - Q&A
   - Assign tasks
   
2. Environment setup
   - Local dev environment
   - Database setup
   - Git branch strategy
   
3. Start T1 (Migration)
   - Dev 1 + Dev 2 pair programming

### 12.3 Week 1 Day 2

1. Continue T1
2. Frontend team: research and tech decisions
3. QA: setup test environment

## 13. Appendix

### 13.1 Quick command reference

```bash
# Backend
cd core && npm test
cd core && npm run migrate
cd core && npm run dev

# Frontend
cd web && npm run dev      # Vite dev server
cd web && npm run build    # Production build
cd web && npm run preview  # Preview build

# Full stack local
# Terminal 1: Backend
cd core && npm run dev

# Terminal 2: Frontend (dev mode)
cd web && npm run dev

# Or: Frontend in backend (production-like)
cd web && npm run build
cd core && npm run dev  # Serves web/dist at /app

# Tests
npm run test:all           # All tests
npm run test:security      # Security tests only
npm run docs:check         # Documentation validation
```

### 13.2 API endpoints reference

**Auth:**
- POST `/auth/login` - Login
- POST `/auth/logout` - Logout
- GET `/auth/me` - Current user

**Core:**
- GET `/api/v1/units` - Units list
- GET `/api/v1/modules/menu` - Menu for current unit
- POST `/api/v1/units/:id/switch` - Switch active unit

**Operations:**
- GET `/api/v1/activities` - Activities (filtered by scope)
- GET `/api/v1/directives` - Directives
- POST `/api/v1/directives` - Create directive (BTV)
- GET `/api/v1/submissions` - Submissions
- POST `/api/v1/submissions` - Submit item (TCKT)
- GET `/api/v1/ops-logs` - Operations logs
- POST `/api/v1/ops-logs` - Create ops log (leader+)

**Admin:**
- GET `/api/v1/admin/members` - Unit members
- POST `/api/v1/admin/members` - Add member
- GET `/api/v1/admin/settings/locks` - Setting locks (DYC)
- POST `/api/v1/admin/settings/locks` - Lock setting (DYC)

### 13.3 Contacts

- **Technical Lead**: [Name/Email]
- **Product Owner**: [Name/Email]
- **DevOps**: [Name/Email]

## Lịch sử phiên bản

| Version | Ngày | Thay đổi | Người |
|---|---|---|---|
| 1.0 | 2026-09-24 | Bản đầu - Hub system plan (no CTD) | DYC |
