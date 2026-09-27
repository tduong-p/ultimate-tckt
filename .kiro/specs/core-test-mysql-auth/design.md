# MySQL Test Authentication Bugfix Design

## Overview

The test suite in `core/` fails due to MySQL authentication errors when developers run `npm test` locally. The root cause is not a code defect in `tests/helpers/db.js` — the fallback chain for password resolution (`TEST_DB_PASSWORD` → `DB_PASSWORD` → `''`) is correctly implemented. The actual problem is a **documentation gap**: developers are unaware they must set `DB_PASSWORD` in their local `.env` file to match their MySQL root password.

This fix focuses on improving developer onboarding and documentation to make the MySQL password requirement explicit and discoverable. The solution involves updating `.env.example` with clear guidance and optionally enhancing test-related documentation.

## Glossary

- **Bug_Condition (C)**: The condition that triggers test failures - when a developer runs `npm test` with their local MySQL requiring a password, but their `.env` file has `DB_PASSWORD=` (empty string)
- **Property (P)**: The desired outcome - developers understand they must configure `DB_PASSWORD` to match their local MySQL password, enabling successful test runs
- **Preservation**: Existing test behavior, environment variable fallback logic, and CI/CD compatibility that must remain unchanged
- **rootConfig**: The configuration object in `tests/helpers/db.js` (lines 8-14) that establishes MySQL connection parameters using environment variables with fallback defaults
- **createTestDatabase()**: The test helper function that creates isolated test databases with random names (`tckt_test_{pid}_{random}`) for each test run

## Bug Details

### Bug Condition

The bug manifests when a developer attempts to run the test suite locally on a fresh repository clone. The developer has MySQL 8 installed locally with a root password set, but has not configured their `.env` file's `DB_PASSWORD` field. The test helper reads an empty string from `process.env.DB_PASSWORD` and attempts to authenticate with MySQL without a password, resulting in "Access denied for user 'root'@'localhost' (using password: NO)" errors.

**Formal Specification:**
```
FUNCTION isBugCondition(environment)
  INPUT: environment of type DeveloperEnvironment
  OUTPUT: boolean
  
  RETURN environment.mysqlRequiresPassword = true
         AND (environment.envFile.DB_PASSWORD = '' OR environment.envFile.DB_PASSWORD = undefined)
         AND environment.envFile.TEST_DB_PASSWORD = undefined
         AND developer.intent = 'run npm test locally'
END FUNCTION
```

### Examples

- **Scenario 1 (Fresh Clone)**: Developer clones repo, runs `cp .env.example .env`, sets required fields like `SESSION_SECRET` and `SETTINGS_ENCRYPTION_KEY`, but leaves `DB_PASSWORD=` empty because the example file shows an empty value. When they run `npm test`, all 45 database tests fail with authentication errors.

- **Scenario 2 (Password-Protected MySQL)**: Developer has MySQL 8 installed with root password `'mySecurePass123'`. They follow the README instructions but don't realize they need to edit `DB_PASSWORD` in `.env`. Test command fails immediately during `createTestDatabase()` at line 20 of `tests/helpers/db.js`.

- **Scenario 3 (CI Environment - Expected Success)**: GitHub Actions workflow runs with MySQL service container. The workflow doesn't set `TEST_DB_PASSWORD` or `DB_PASSWORD` environment variables, relying on the default empty password for the test MySQL container. Tests pass because the MySQL service is configured without a password.

- **Edge Case (Explicit TEST_DB_PASSWORD)**: Developer sets `TEST_DB_PASSWORD=testpass` in their `.env` file specifically for test isolation. This works correctly because the fallback chain in `rootConfig` prioritizes `TEST_DB_PASSWORD` over `DB_PASSWORD`.

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- The fallback chain in `rootConfig` (`TEST_DB_PASSWORD` → `DB_PASSWORD` → `''`) must continue to work exactly as implemented in lines 8-14 of `tests/helpers/db.js`
- CI/CD pipelines using MySQL containers without passwords must continue to pass without requiring environment variable configuration
- The test isolation mechanism (random database names `tckt_test_{pid}_{random}`) must remain unchanged
- All existing environment variable overrides (`TEST_DB_HOST`, `TEST_DB_PORT`, `TEST_DB_USER`, `TEST_DB_NAME`) must continue to function

**Scope:**
All inputs that do NOT involve a developer reading `.env.example` and setting up their local environment for the first time should be completely unaffected by this fix. This includes:
- Existing developers who have already configured their `.env` correctly
- CI/CD workflows that use MySQL service containers
- Production and staging deployments that use separate database configurations
- Developers using Docker Compose for local MySQL (if they follow Docker setup docs)

## Hypothesized Root Cause

Based on the bug description and analysis of the codebase, the root cause is **insufficient documentation**:

1. **Silent Example Values**: The `.env.example` file shows `DB_PASSWORD=` (empty) without any comment explaining that developers MUST set this to match their local MySQL password for tests to work. Developers reasonably assume empty is a valid default.

2. **Undiscoverable Requirement**: The test documentation in `docs/ai/kiem-tra.md` mentions "cần MySQL local, biến TEST_DB_HOST/PORT/USER/PASSWORD" but doesn't emphasize that `DB_PASSWORD` (not just `TEST_DB_PASSWORD`) is the primary variable developers should configure. The parenthetical "(mặc định fallback DB_*, rồi root@localhost)" is technical but not actionable guidance.

3. **No Onboarding Checklist Item**: The onboarding document `docs/onboarding/ngay-1.md` likely doesn't include a step to "configure DB_PASSWORD in .env to match your MySQL root password" before running tests.

4. **README Ambiguity**: The README states "cần MySQL local (TEST_DB_*)" which suggests `TEST_DB_*` variables are required, but doesn't clarify that `DB_PASSWORD` is sufficient and commonly used.

The code in `tests/helpers/db.js` is working as designed — it's a documentation problem, not a logic problem.

## Correctness Properties

Property 1: Bug Condition - Developer Understands Password Requirement

_For any_ developer environment where MySQL requires a password for the root user, the documentation and `.env.example` file SHALL clearly communicate that `DB_PASSWORD` must be set to the local MySQL root password (or `TEST_DB_PASSWORD` for test-specific credentials) before running `npm test`.

**Validates: Requirements 2.1, 2.2, 2.3**

Property 2: Preservation - Fallback Chain Unchanged

_For any_ test execution environment (local, CI, Docker), the test helper's `rootConfig` object SHALL continue to use the same environment variable fallback chain (`TEST_DB_PASSWORD` → `DB_PASSWORD` → `''`) without modification, preserving compatibility with existing CI/CD pipelines and developer workflows.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**

## Fix Implementation

### Changes Required

This is a **documentation-only fix**. No code changes are needed in `tests/helpers/db.js` because the fallback logic is correct.

**File 1**: `core/.env.example`

**Current Content** (line 6):
```
DB_PASSWORD=
```

**Proposed Change**:
```
# Password cho MySQL root user. CẦN ĐẶT khi chạy npm test local nếu MySQL yêu cầu mật khẩu.
# CI sử dụng MySQL container không mật khẩu nên không cần đặt trong CI.
# Tests sẽ dùng TEST_DB_PASSWORD nếu có, nếu không sẽ fallback về DB_PASSWORD.
DB_PASSWORD=
```

**Alternative (More Concise)**:
```
# Bắt buộc khi chạy npm test local với MySQL có mật khẩu. CI không cần.
DB_PASSWORD=
```

**Rationale**: Developers copying `.env.example` to `.env` will now see inline guidance that `DB_PASSWORD` is required for local test runs if their MySQL has a password. The comment also clarifies the relationship between `DB_PASSWORD` and `TEST_DB_PASSWORD`.

---

**File 2 (Optional)**: `docs/ai/kiem-tra.md`

**Current Content** (line 21):
```bash
# Core (Node/MySQL) — cần MySQL local, biến TEST_DB_HOST/PORT/USER/PASSWORD (mặc định fallback DB_*, rồi root@localhost)
cd core && npm test
```

**Proposed Change**:
```bash
# Core (Node/MySQL) — cần MySQL local. Đặt DB_PASSWORD trong core/.env nếu MySQL yêu cầu mật khẩu.
# Test helper dùng TEST_DB_* nếu có, fallback về DB_*, mặc định root@localhost:3306 không password.
cd core && npm test
```

**Rationale**: Makes the `DB_PASSWORD` requirement explicit and actionable for developers reading test documentation. The current text is technically correct but not immediately helpful for troubleshooting.

---

**File 3 (Optional)**: `docs/onboarding/ngay-1.md`

Add a step to the MySQL setup section (need to read the file first to determine exact location):

```markdown
3. Tạo file `.env` từ `.env.example`:
   ```bash
   cp .env.example .env
   ```
   
4. **Quan trọng**: Đặt `DB_PASSWORD` trong `core/.env` để khớp với mật khẩu MySQL root của bạn. Nếu MySQL của bạn không có mật khẩu (không khuyến khích), để trống. Ví dụ:
   ```
   DB_PASSWORD=myMySQLRootPassword
   ```
```

**Rationale**: Proactively guides new developers to configure the password correctly during initial setup, preventing the bug from occurring.

---

**File 4 (Optional)**: `README.md`

**Current Content** (line 44):
```bash
cd core && npm test                              # node --test, cần MySQL local (TEST_DB_*)
```

**Proposed Change**:
```bash
cd core && npm test                              # node --test, cần MySQL local, đặt DB_PASSWORD trong core/.env
```

**Rationale**: Removes the misleading `(TEST_DB_*)` which suggests those are the primary variables to set, replacing it with the actual action developers need to take.

---

### Code Changes (NOT RECOMMENDED)

We considered but **rejected** the following code change to `tests/helpers/db.js`:

```javascript
// REJECTED: Adding password validation
if (rootConfig.password === '' && process.platform !== 'linux') {
  throw new Error('DB_PASSWORD must be set in .env for local test runs');
}
```

**Rejection Reasons**:
1. **Breaks CI**: Many CI environments use MySQL containers without passwords, and this would require every CI workflow to set a dummy password.
2. **False Positives**: Developers who intentionally run MySQL without a password (e.g., via Docker Compose with no password) would be blocked.
3. **Platform Detection Unreliable**: Using `process.platform` is fragile and doesn't reliably distinguish CI from local environments.
4. **Documentation Solves Root Cause**: The actual problem is developer awareness, not a missing validation. Clear documentation is the appropriate fix.

## Testing Strategy

### Validation Approach

The testing strategy for a documentation-only fix differs from code changes. Validation focuses on **developer experience** and **information discoverability** rather than unit/integration tests. The approach:

1. **Exploratory Bug Condition Checking**: Simulate a fresh developer onboarding experience to confirm the documentation changes make the password requirement discoverable.
2. **Preservation Checking**: Verify that existing test behavior remains identical (no code changes means no test changes needed, but we validate documentation doesn't introduce confusion).

### Exploratory Bug Condition Checking

**Goal**: Confirm that after the documentation changes, a new developer following the setup process will discover they need to set `DB_PASSWORD` BEFORE encountering test failures. This is "exploratory" because we're testing human workflow, not code execution.

**Test Plan**: Simulate a fresh repository clone and developer onboarding. Read only the changed documentation (`.env.example`, README, onboarding docs) and verify the password requirement is explicit and actionable.

**Test Cases**:
1. **Fresh Clone Walkthrough**: Starting from `git clone`, follow README → onboarding doc → copy `.env.example` → read inline comments. Expected: Developer sees comment about `DB_PASSWORD` requirement before running `npm test`.
2. **Test Failure Debugging**: Assume developer missed the comment and gets auth error. Check if error message + documentation provide clear path to solution. Expected: `docs/ai/kiem-tra.md` mentions `DB_PASSWORD` explicitly.
3. **CI Developer Confusion**: Verify that a developer reading `.env.example` understands why CI doesn't fail (comment mentions "CI không cần"). Expected: No confusion about why CI works but local doesn't.

**Expected Outcomes**:
- Developers can answer "what do I need to set in .env to run tests?" by reading `.env.example` comments alone
- Test failure error message ("Access denied") + searching docs leads to `DB_PASSWORD` as the solution
- No developer assumes they need to modify `tests/helpers/db.js` code

### Fix Checking

**Goal**: Verify that the documentation changes successfully communicate the password requirement to developers.

**Validation Method**: Manual review checklist (not automated tests, since this is documentation):

```
FOR each documentation change DO
  ASSERT comment/instruction explicitly mentions DB_PASSWORD requirement
  ASSERT comment explains WHEN to set it (local test, MySQL with password)
  ASSERT comment explains when NOT needed (CI, passwordless MySQL)
  ASSERT language is actionable (not just technical description)
END FOR
```

**Acceptance Criteria**:
- [ ] `.env.example` has inline comment above `DB_PASSWORD` mentioning test requirement
- [ ] Comment uses clear language ("CẦN ĐẶT khi chạy npm test local nếu MySQL yêu cầu mật khẩu")
- [ ] At least one test-related doc (`docs/ai/kiem-tra.md` or README) explicitly mentions `DB_PASSWORD`
- [ ] Onboarding doc (if updated) includes a step to configure `DB_PASSWORD` with example value

### Preservation Checking

**Goal**: Verify that no existing test behavior, CI workflows, or developer workflows are broken by the documentation changes.

**Test Method**: Since this is a documentation-only change with zero code modifications, preservation is guaranteed at the code level. However, we validate documentation doesn't introduce misleading guidance.

**Validation Checklist**:
```
FOR each documentation change DO
  ASSERT no instruction contradicts existing behavior
  ASSERT no instruction implies code changes are needed
  ASSERT fallback chain (TEST_DB_PASSWORD → DB_PASSWORD → '') is accurately described
  ASSERT CI/CD compatibility is explicitly preserved in comments
END FOR
```

**Test Cases**:
1. **CI Workflow Preservation**: Read updated `.env.example` comment. Verify it doesn't suggest CI needs to set `DB_PASSWORD`. Expected: Comment says "CI không cần" or similar.
2. **TEST_DB_PASSWORD Override**: Verify documentation doesn't discourage using `TEST_DB_PASSWORD` for test-specific passwords. Expected: `.env.example` comment mentions "Tests sẽ dùng TEST_DB_PASSWORD nếu có".
3. **Empty Password Valid Case**: Verify documentation doesn't forbid empty passwords (some developers may intentionally run MySQL without password). Expected: Comment says "nếu MySQL yêu cầu mật khẩu" (conditional, not absolute).

**Acceptance Criteria**:
- [ ] No documentation change requires CI workflow modifications
- [ ] No documentation change suggests modifying `tests/helpers/db.js` code
- [ ] Documentation accurately describes the existing fallback chain
- [ ] Documentation doesn't break existing developers' mental models

### Unit Tests

No new unit tests required. The existing test suite in `core/tests/` serves as a preservation test:

- **Existing Tests**: All 45 tests in `core/tests/**/*.test.js` must continue to pass when `DB_PASSWORD` is correctly configured
- **No New Tests**: Since we're not changing code behavior, no new test files are needed
- **Manual Validation**: After documentation changes, run `cd core && npm test` with `DB_PASSWORD` set to confirm all tests pass

### Property-Based Tests

Not applicable for a documentation-only fix. Property-based testing validates code behavior across input domains, but this fix doesn't modify any code logic.

### Integration Tests

**Manual Integration Test**:

1. **Clean Environment Setup**:
   ```bash
   # Simulate fresh clone
   rm core/.env
   cp core/.env.example core/.env
   ```

2. **Read Documentation Path**:
   - Open `core/.env.example`, read comments
   - Open README, read test section
   - Open `docs/onboarding/ngay-1.md`, read MySQL setup

3. **Expected Behavior**: Developer identifies they need to set `DB_PASSWORD` before running tests

4. **Configure and Test**:
   ```bash
   # Edit core/.env: DB_PASSWORD=<local MySQL password>
   cd core && npm test
   ```

5. **Expected Result**: All tests pass, confirming the fix enables successful test runs

**CI Integration Test**:

- **Existing CI**: `.github/workflows/deploy.yml` already runs `npm test` in `test-core` job with MySQL service
- **No Changes Needed**: CI doesn't set `DB_PASSWORD` and shouldn't need to
- **Validation**: After merging documentation changes, verify CI still passes without workflow modifications
