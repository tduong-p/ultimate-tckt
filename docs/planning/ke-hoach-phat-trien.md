---
doc_id: PLAN-DEV-001
title: Kế hoạch phát triển nền tảng đa đơn vị
version: 1.0
status: active
audience: [dev, ba, ops]
owner: DYC
updated: 2026-09-24
related_code: []
---

# Kế hoạch phát triển nền tảng đa đơn vị

Tài liệu này là kế hoạch chi tiết để phát triển nền tảng đa đơn vị (GĐ1) từ trạng thái hiện tại đến production-ready, bao gồm phân công nhóm, timeline, và chiến lược song song hóa công việc.

## 1. Tổng quan dự án

### 1.1 Trạng thái hiện tại
- ✅ **TCKT Operations v2.1.1**: Đang chạy production (hoạt động, task/Kanban, nghiệm thu)
- ✅ **CTD Backend**: 90% hoàn thiện (FastAPI, 135 tests passing)
- ✅ **CTD Frontend**: 40% hoàn thiện (React UI với mock data, chưa kết nối backend)
- ✅ **Hạ tầng**: Oracle ARM VM, Docker Compose, CI/CD hoạt động
- ✅ **Tài liệu**: Hệ thống tài liệu có version, kiểm bằng CI

### 1.2 Mục tiêu GĐ1
Chuyển từ hệ thống **nội bộ một ban** thành **nền tảng đa đơn vị** với:
- Cây đơn vị: DYC (chủ quản), BTV (giám sát), TCKT (vận hành)
- Các đơn vị CTD: VP Đoàn, Chi bộ, ĐT/LCĐ
- Mức xem liên đơn vị cấu hình được
- DYC admin global có ghi vết audit
- Giao việc liên đơn vị (directive) và Trình (submission)
- JWT bridge nối Core ↔ CTD
- Frontend React chung (`web/`)

### 1.3 Phạm vi GĐ1
**Trong phạm vi:**
- 24 tasks từ `.kiro/specs/nen-tang-da-don-vi/tasks.md`
- Test chống rò rỉ (privacy leak) chặn merge
- Tích hợp CTD vào shell chung
- Nhật ký trực ban/họp ban

**Ngoài phạm vi:**
- Mở rộng cho các ban khác (GĐ2)
- Mobile app (GĐ3)
- Module kiểm tra cơ sở, thi đua khen thưởng (chưa có yêu cầu)

## 2. Tổ chức nhóm phát triển

### 2.1 Cấu trúc nhóm đề xuất

Chia làm **4 nhóm song song** sau khi Task 1 (migration) hoàn thành:

#### **Nhóm A: Core Platform** (2 devs)
- **Trách nhiệm**: Nền tảng dùng chung, phân quyền, audit, module registry
- **Công nghệ**: Node.js 22, Express 5, MySQL 8
- **Tasks**: 1, 2, 3, 4, 5, 6 (critical path)
- **Thời gian**: Tuần 1-2

#### **Nhóm B: Operations Module** (2 devs)
- **Trách nhiệm**: Giao việc liên đơn vị, Trình, nhật ký, UI cũ
- **Công nghệ**: Node.js 22, Express 5, MySQL 8
- **Tasks**: 9, 10, 11, 12, 13, 14, 15
- **Phụ thuộc**: Task 2 (middleware) hoàn thành
- **Thời gian**: Tuần 2-4

#### **Nhóm C: Frontend Shell** (2 devs)
- **Trách nhiệm**: React shell mới, UI components dùng chung
- **Công nghệ**: React 18, TypeScript, Vite
- **Tasks**: 7, 8, 14, 15, 20
- **Phụ thuộc**: Task 5 (module registry API) hoàn thành
- **Thời gian**: Tuần 2-5

#### **Nhóm D: CTD Integration** (1-2 devs)
- **Trách nhiệm**: Tích hợp CTD vào nền tảng, hoàn thiện frontend
- **Công nghệ**: FastAPI, Postgres, React
- **Tasks**: 16, 17, 18, 19, 20
- **Phụ thuộc**: Task 6 (JWT bridge) hoàn thành
- **Thời gian**: Tuần 2-4

#### **Nhóm E: QA/Security** (1 dev, có thể kiêm)
- **Trách nhiệm**: Viết test chống rò rỉ, CI integration, tài liệu
- **Tasks**: 21, 22, 23
- **Phụ thuộc**: Task 11 (visibility policies) hoàn thành
- **Thời gian**: Tuần 4-5

### 2.2 Phân công theo kỹ năng

| Vai trò | Kỹ năng cần | Tasks | Nhóm |
|---|---|---|---|
| **Backend Lead** | Node.js expert, MySQL, phân quyền phức tạp | 1-6 | A |
| **Backend Senior** | Node.js, business logic | 9-13 | B |
| **Frontend Lead** | React expert, TypeScript, kiến trúc FE | 7, 8 | C |
| **Frontend Developer** | React, TypeScript, UI/UX | 14, 15, 20 | C |
| **Fullstack (Python)** | FastAPI, SQLAlchemy, JWT | 16-19 | D |
| **QA Engineer** | Testing, security, CI/CD | 21-23 | E |

### 2.3 Workflow và giao tiếp

**Daily standup** (15 phút):
- Mỗi nhóm báo cáo: đã làm, đang làm, blocked
- Sync phụ thuộc giữa các nhóm

**Sync điểm giữa các nhóm**:
- Nhóm A + B: Task 2 hoàn thành
- Nhóm A + C: Task 5 hoàn thành
- Nhóm A + D: Task 6 hoàn thành
- Nhóm B + E: Task 11 hoàn thành
- Nhóm C + D: Task 7 hoàn thành

**Review code**:
- Mỗi PR cần ≥1 approval từ người khác nhóm
- PR từ Nhóm A (core platform) cần approval từ cả Nhóm B và D

## 3. Timeline chi tiết

### 3.1 Tuần 1: Foundation (Critical Path)

**Mục tiêu**: Hoàn thành database migration và core platform

| Ngày | Tasks | Nhóm | Deliverable |
|---|---|---|---|
| Thứ 2 | T1: Migration design | A | Migration script draft |
| Thứ 3 | T1: Migration implementation | A | Migration chạy được 2 lần (idempotent) |
| Thứ 4 | T1: Migration testing<br>T2: Middleware design | A | Migration pass local tests<br>Middleware interface |
| Thứ 5 | T2: Middleware implementation | A | `loadUnitContext` hoạt động |
| Thứ 6 | T2: Refactor `access.js` | A | Policy layer dùng `req.unitRole` |

**Checkpoint Tuần 1**:
- ✅ 10 bảng mới được tạo
- ✅ Dữ liệu cũ được migrate về TCKT
- ✅ Middleware unit context hoạt động
- ✅ Test coverage ≥80% cho Task 1-2

### 3.2 Tuần 2: Parallel Development Starts

**Nhóm A: Core Platform (tiếp)**

| Ngày | Tasks | Deliverable |
|---|---|---|
| Thứ 2 | T3: DYC admin | Setting locks, `managed_by` |
| Thứ 3 | T3: Global read + audit | `scopeFor` với DYC, ghi audit logs |
| Thứ 4 | T4: Audit logging | Log cross-unit reads, visibility changes |
| Thứ 5 | T5: Module registry | Manifest system, API menu |
| Thứ 6 | T6: JWT bridge | HS256 signing, `/internal/events` |

**Nhóm B: Operations (bắt đầu sau Thứ 5 tuần 1)**

| Ngày | Tasks | Deliverable |
|---|---|---|
| Thứ 6 | T9: Directives design | State machine diagram, API spec |
| CN | T9: Directives implementation | Tables, routes, state transitions |

**Nhóm C: Frontend Shell (bắt đầu sau Thứ 5 tuần 2)**

| Ngày | Tasks | Deliverable |
|---|---|---|
| Thứ 6 | T7: Shell setup | Vite project, routing, layout |

**Nhóm D: CTD (bắt đầu sau Thứ 6 tuần 2)**

| Ngày | Tasks | Deliverable |
|---|---|---|
| Thứ 7 (CN) | T16: JWT auth design | Integration plan, token validation |

**Checkpoint Tuần 2**:
- ✅ Core platform hoàn thành (T1-6)
- ✅ JWT bridge hoạt động (có thể test bằng curl)
- ✅ Directives tables + API ở alpha stage
- ✅ Shell React khởi tạo được

### 3.3 Tuần 3: Feature Development

**Nhóm B: Operations**

| Ngày | Tasks | Deliverable |
|---|---|---|
| Thứ 2 | T9: Directives (tiếp) | Notifications, 48h alert |
| Thứ 3 | T10: Submissions | Tables, API, withdraw logic |
| Thứ 4 | T11: Visibility policies | `toSummaryView` serializer, UI settings |
| Thứ 5 | T12: Ops logs | Tables, API, attendance |
| Thứ 6 | T13: Rule engine events | Wire `directive.*`, `submission.*`, `ops_log.*` |

**Nhóm C: Frontend Shell**

| Ngày | Tasks | Deliverable |
|---|---|---|
| Thứ 2 | T7: Shell (tiếp) | Login, unit switcher, menu |
| Thứ 3 | T7: Shell (tiếp) | Notifications bell, shared UI components |
| Thứ 4 | T8: Management UI | Unit/membership CRUD for DYC |
| Thứ 5 | T14: Migrate old UI (start) | Plan for moving `core/public/` |
| Thứ 6 | T14: Migrate old UI | Port "Việc hôm nay" screen |

**Nhóm D: CTD**

| Ngày | Tasks | Deliverable |
|---|---|---|
| Thứ 2 | T16: JWT auth implementation | `deps.py` accept bridge token, JIT user |
| Thứ 3 | T17: Role mapping | Core role → CTD role mapping logic |
| Thứ 4 | T18: Summary endpoint | `/api/v1/summary` (replace mock) |
| Thứ 5 | T19: Event outbox | Send status events to Core |
| Thứ 6 | T20: Frontend migration (design) | Plan for moving to `web/src/modules/ctd/` |

**Checkpoint Tuần 3**:
- ✅ Directives + submissions hoạt động end-to-end
- ✅ Visibility policies có UI cấu hình
- ✅ CTD backend tích hợp xong với Core
- ✅ Shell có login, chuyển đơn vị, menu động
- ✅ Test coverage ≥75% cho các features mới

### 3.4 Tuần 4: UI Migration + Security

**Nhóm B: Operations (finish up)**

| Ngày | Tasks | Deliverable |
|---|---|---|
| Thứ 2-3 | Buffer | Bug fixes, integration testing |

**Nhóm C: Frontend**

| Ngày | Tasks | Deliverable |
|---|---|---|
| Thứ 2 | T14: Migrate old UI | Port Activities, Kanban screens |
| Thứ 3 | T14: Migrate old UI | Port Settings screens |
| Thứ 4 | T15: New Operations UI | BTV screens (assigned work, dashboard) |
| Thứ 5 | T15: New Operations UI | TCKT screens (work from BTV, ops logs) |
| Thứ 6 | T20: CTD frontend start | Move `features/canbo/*` to shell |

**Nhóm D: CTD**

| Ngày | Tasks | Deliverable |
|---|---|---|
| Thứ 2-3 | T20: Frontend migration | Move `features/canbo/*`, `features/baocao/*` |
| Thứ 4-5 | T20: Frontend integration | Connect to shell, test all flows |
| Thứ 6 | Integration testing | End-to-end CTD in shell |

**Nhóm E: QA/Security (start)**

| Ngày | Tasks | Deliverable |
|---|---|---|
| Thứ 4 | T21: Privacy leak test design | Test plan, BTV test account |
| Thứ 5 | T21: Privacy leak test impl | Automated tests for all GET routes |
| Thứ 6 | T22: DYC access test | Test DYC read all + audit logs |

**Checkpoint Tuần 4**:
- ✅ Operations UI hoàn chỉnh trong shell
- ✅ CTD frontend hoạt động trong shell
- ✅ Privacy leak tests viết xong
- ✅ Manual testing pass cho các luồng chính

### 3.5 Tuần 5: Testing, Hardening, Deploy Prep

**Nhóm A+B+C+D: Bug fixing, integration testing**

| Ngày | Tasks | Focus |
|---|---|---|
| Thứ 2 | Integration testing | Test cross-unit flows end-to-end |
| Thứ 3 | Performance testing | Load test với 50 concurrent users |
| Thứ 4 | Security review | Review audit logs, JWT expiry, CSRF |

**Nhóm E: Security + CI**

| Ngày | Tasks | Deliverable |
|---|---|---|
| Thứ 2 | T21-22: Test refinement | Fix flaky tests, improve coverage |
| Thứ 3 | T23: CI integration | Add privacy tests to GitHub Actions |
| Thứ 4 | T23: CI hardening | Block merge on test failure |
| Thứ 5 | Documentation | Update all docs per AGENTS.md rules |

**Tất cả nhóm:**

| Ngày | Tasks | Deliverable |
|---|---|---|
| Thứ 6 | T24: Production prep | Enable real email + cron |
| Thứ 7 (CN) | Deploy staging | Full smoke test on staging |

**Checkpoint Tuần 5**:
- ✅ Tất cả 24 tasks hoàn thành
- ✅ CI tests pass (privacy leak, DYC access)
- ✅ Staging deployment successful
- ✅ Documentation updated
- ✅ Ready for production deploy

### 3.6 Tuần 6: Production Deploy + Monitoring

| Ngày | Tasks | Focus |
|---|---|---|
| Thứ 2 | Final staging test | All stakeholders approve |
| Thứ 3 | Production deploy | Follow `docs/ops/deploy-va-nhanh.md` |
| Thứ 4-5 | Monitor + hotfix | Watch logs, respond to issues |
| Thứ 6 | Retrospective | Team meeting, lessons learned |

## 4. Chiến lược song song hóa

### 4.1 Dependency Graph

```
T1 (Migration) ──┬──> T2 (Middleware) ──┬──> T3 (DYC) ──> T4 (Audit)
                 │                       │
                 │                       ├──> T9 (Directives)
                 │                       │
                 │                       └──> T10 (Submissions)
                 │
                 └──> T5 (Module) ──┬──> T7 (Shell) ──┬──> T8 (Management UI)
                                    │                  │
                                    │                  └──> T14 (Migrate UI)
                                    │
                                    └──> T6 (JWT) ──> T16 (CTD auth) ──> T17-19

T11 (Visibility) ──> T21-22 (Security tests) ──> T23 (CI)

T15 (Operations UI) ──┬──> Integration
T20 (CTD frontend) ───┘
```

### 4.2 Critical Path

**T1 → T2 → T3 → T11 → T21 → T23** (5 tuần)

Đây là đường dài nhất. Mọi công việc khác có thể song song hóa.

### 4.3 Risk Mitigation: Rủi ro song song hóa

| Rủi ro | Giảm thiểu |
|---|---|
| T2 delay → block T9, T10 | Nhóm B có thể bắt đầu với API design, database schema |
| T5 delay → block T7 | Nhóm C mock API trước, thay bằng real API sau |
| T6 delay → block T16 | Nhóm D có thể làm T17-19 với stub auth |
| Merge conflict giữa nhóm | Daily sync 15 phút, rebase thường xuyên |
| Nhóm A bị overload (critical path) | Pair programming với Nhóm B senior |

## 5. Definition of Done

Mỗi task được coi là **Done** khi:

### 5.1 Code quality
- [ ] Test coverage ≥75% cho logic mới
- [ ] Tất cả test pass (`npm test`, `pytest`, `npm run test:tools`)
- [ ] No ESLint/Pylint warnings
- [ ] Code review approved (≥1 reviewer)

### 5.2 Documentation
- [ ] Tài liệu liên quan được cập nhật trong cùng PR
- [ ] `version` được bump theo semantic versioning
- [ ] `updated` = ngày hôm nay
- [ ] `npm run docs:check` pass
- [ ] ADR được tạo nếu có quyết định kiến trúc mới

### 5.3 Testing
- [ ] Unit tests cho business logic
- [ ] Integration tests cho API endpoints
- [ ] Manual testing pass trên dev environment
- [ ] Regression tests pass (không phá tính năng cũ)

### 5.4 Security & Privacy
- [ ] Không commit secrets, API keys
- [ ] Input validation đầy đủ
- [ ] XSS/CSRF protection (CSP headers, SameSite cookies)
- [ ] Audit logging cho cross-unit access
- [ ] Privacy leak tests pass (nếu áp dụng)

### 5.5 Git workflow
- [ ] Branch từ `staging`
- [ ] Commit message theo format: `type(scope): subject`
- [ ] PR description có: tóm tắt, test plan, screenshots (nếu UI)
- [ ] CI/CD pipeline pass
- [ ] Merged vào `staging`, not `main`

## 6. Milestones và Deliverables

### Milestone 1: Core Platform Ready (Cuối tuần 2)
**Deliverables:**
- Migration script chạy idempotent
- 10 bảng mới trong database
- Unit context middleware hoạt động
- DYC global admin với audit trail
- JWT bridge có thể test bằng curl
- Module registry API trả menu động

**Success criteria:**
- Core tests pass (≥80% coverage)
- Postman collection test pass cho Core API
- Documentation updated

### Milestone 2: Feature Complete (Cuối tuần 4)
**Deliverables:**
- Directives + submissions hoạt động end-to-end
- Visibility policies có UI cấu hình
- Ops logs với attendance tracking
- CTD tích hợp với Core qua JWT
- React shell với login + unit switcher + menu
- Operations UI migrated

**Success criteria:**
- Manual test pass cho 10 luồng chính
- Frontend tests pass
- Backend tests pass (≥75% coverage)
- No critical bugs in backlog

### Milestone 3: Production Ready (Cuối tuần 5)
**Deliverables:**
- Privacy leak tests chạy trong CI
- DYC access tests pass
- CTD frontend hoạt động trong shell
- Tất cả 24 tasks completed
- Documentation 100% updated
- Staging deployment successful

**Success criteria:**
- CI pipeline pass
- Security review approved
- Performance test pass (< 500ms p95)
- Stakeholder UAT pass

### Milestone 4: In Production (Cuối tuần 6)
**Deliverables:**
- Production deployment
- Real email + cron enabled
- Monitoring dashboards
- Incident response plan
- Team retrospective document

**Success criteria:**
- Zero downtime deployment
- ≤2 P2 bugs in first week
- Zero P1 bugs
- Team velocity documented for GĐ2 planning

## 7. Công cụ và quy trình

### 7.1 Development tools
- **IDE**: VS Code với extensions (ESLint, Prettier, Pylance)
- **Database**: DBeaver / MySQL Workbench / pgAdmin
- **API testing**: Postman / Insomnia / curl
- **Git GUI**: GitKraken / Sourcetree (optional)

### 7.2 Communication
- **Sync**: Daily standup 9:00 AM (15 phút)
- **Async**: GitHub PR comments, Issues
- **Docs**: Google Docs cho design docs
- **Urgent**: Zalo group (chỉ production issues)

### 7.3 Branch naming
```
feature/T1-migration-multi-unit
feature/T7-react-shell
fix/T11-visibility-policy-bug
docs/T1-update-migration-guide
```

### 7.4 PR template
```markdown
## Task
T<number>: <task title>

## Changes
- [ ] Added X
- [ ] Modified Y
- [ ] Removed Z

## Test plan
1. Step one
2. Step two
3. Expected result

## Screenshots
(nếu có UI changes)

## Checklist
- [ ] Tests pass
- [ ] Documentation updated
- [ ] No secrets committed
```

### 7.5 Deployment process
```bash
# Development
git checkout staging
git pull
git checkout -b feature/T1-my-feature
# ... code, commit ...
git push -u origin feature/T1-my-feature
# Create PR staging ← feature/T1-my-feature

# After PR approved + CI pass
# Merge to staging → auto deploy to staging environment

# After staging tested
# Create PR main ← staging
# After approval → auto deploy to production
```

## 8. Rủi ro và giảm thiểu

### 8.1 Technical risks

| Rủi ro | Xác suất | Tác động | Giảm thiểu |
|---|---|---|---|
| Migration phá dữ liệu production | Medium | Critical | Backup trước migrate, idempotent script, test trên staging clone |
| JWT bridge security flaw | Low | High | Security review, penetration test, short TTL |
| Performance degradation với cross-unit queries | Medium | Medium | Index optimization, query profiling, caching layer |
| Frontend bundle size quá lớn | Low | Low | Code splitting, lazy loading, tree shaking |
| Race condition trong audit logs | Low | Medium | Transaction isolation, unique constraints |

### 8.2 Resource risks

| Rủi ro | Xác suất | Tác động | Giảm thiểu |
|---|---|---|---|
| Key developer nghỉ giữa chừng | Medium | High | Pair programming, code review, documentation |
| Nhóm A (critical path) overload | High | High | Cross-training, Nhóm B support Nhóm A |
| Stakeholder requirements change | Low | Medium | Freeze requirements sau tuần 1, change request process |
| Staging environment down | Low | Medium | Local Docker setup, VM backup |

### 8.3 Schedule risks

| Rủi ro | Xác suất | Tác động | Giảm thiểu |
|---|---|---|---|
| Task underestimation | High | Medium | 20% buffer trong timeline, daily reestimation |
| Scope creep | Medium | Medium | "Ngoài phạm vi GĐ1" checklist, defer to GĐ2 |
| Testing phase finds major bugs | Medium | High | Continuous testing, staging deploy sớm (tuần 4) |
| Production cutover issues | Low | Critical | Phased rollout, rollback plan ready |

## 9. Communication plan

### 9.1 Internal (dev team)
- **Daily standup**: 9:00 AM, 15 phút
  - Format: What did I do? What will I do? Blockers?
  - Rotate facilitator mỗi ngày
- **Sprint review**: Mỗi tuần Thứ 6, 30 phút
  - Demo progress, show working software
- **Retrospective**: Cuối mỗi milestone, 1 giờ
  - What went well? What to improve? Action items

### 9.2 Stakeholders
- **Weekly update**: Email mỗi Thứ 6
  - Progress vs plan, blockers, next week goals
- **Milestone demo**: Cuối mỗi milestone, 1 giờ
  - Working software demo, Q&A
- **UAT**: Tuần 5, 2 ngày
  - Stakeholders test trên staging
  - Bug report process

### 9.3 Escalation path
1. **Blocked < 4 giờ**: Hỏi trong team
2. **Blocked ≥ 4 giờ**: Escalate to lead
3. **Scope/timeline change**: Escalate to DYC
4. **Production incident**: Follow `docs/ops/su-co.md`

## 10. Success metrics

### 10.1 Development metrics
- **Velocity**: Tasks completed per week (target: 4-5 tasks/week)
- **Code quality**: Test coverage ≥75%, zero P1 bugs pre-production
- **Documentation**: 100% docs updated in same PR
- **CI/CD**: Pipeline success rate ≥95%

### 10.2 Post-launch metrics (tuần 6+)
- **Uptime**: ≥99.9%
- **Performance**: p95 response time < 500ms
- **Errors**: < 0.1% error rate
- **User adoption**: BTV + TCKT users active within 1 week

### 10.3 Team health
- **Burnout indicator**: Overtime < 5 hours/week/person
- **Knowledge sharing**: Each dev codes in ≥2 modules
- **Morale**: Retrospective action items addressed

## 11. Điều kiện hoàn thành dự án

GĐ1 được coi là **hoàn thành** khi:

- [ ] Tất cả 24 tasks đã merged vào `main`
- [ ] CI pipeline pass (bao gồm privacy leak tests)
- [ ] Documentation 100% updated
- [ ] Staging testing pass (UAT approved)
- [ ] Production deployment successful
- [ ] Email thật + cron enabled
- [ ] Zero P1 bugs trong production
- [ ] Monitoring + alerting setup
- [ ] Team retrospective hoàn thành
- [ ] Lessons learned documented cho GĐ2

## 12. Tài liệu tham khảo

- **Requirements**: `.kiro/specs/nen-tang-da-don-vi/requirements.md`
- **Design**: `.kiro/specs/nen-tang-da-don-vi/design.md`
- **Tasks**: `.kiro/specs/nen-tang-da-don-vi/tasks.md`
- **Playbooks**: `docs/playbooks/*.md`
- **Onboarding**: `docs/onboarding/ngay-1.md`, `docs/onboarding/tuan-1.md`
- **Operations**: `docs/ops/deploy-va-nhanh.md`, `docs/ops/moi-truong.md`
- **Architecture**: `docs/dev/kien-truc.md`
- **Coding standards**: `docs/dev/quy-uoc-code.md`

## 13. Appendix: Quick reference

### 13.1 Lệnh thường dùng
```bash
# Setup local
cd core && npm install && npm test
cd services/ctd-api/backend && python -m venv .venv && .venv/bin/pip install -r requirements.txt && .venv/bin/pytest

# Check before commit
npm run docs:check -- --base origin/staging
npm run test:tools

# Deploy staging
git push origin staging  # CI auto-deploy

# Deploy production
git checkout main
git merge staging
git push origin main  # CI auto-deploy
```

### 13.2 Contacts
- **DYC Lead**: [email/Zalo]
- **DevOps**: [email/Zalo]
- **Stakeholder BTV**: [contact]
- **Stakeholder TCKT**: [contact]

## Lịch sử phiên bản

| Version | Ngày | Thay đổi | Người |
|---|---|---|---|
| 1.0 | 2026-09-24 | Bản đầu tiên - kế hoạch phát triển GĐ1 | DYC |
