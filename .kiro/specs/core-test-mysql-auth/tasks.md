# Implementation Plan

## Overview

This implementation plan addresses the MySQL test authentication documentation bug. The fix is documentation-only — no code changes are needed. The plan follows the exploratory bugfix workflow: first verify the current documentation gap (Bug Condition), then ensure our changes don't break existing workflows (Preservation), and finally implement the documentation improvements.

---

- [ ] 1. Verify current documentation gap (Bug Condition exploration)
  - **Property 1: Bug Condition** - Documentation Does Not Communicate DB_PASSWORD Requirement
  - **CRITICAL**: This verification MUST be done on UNCHANGED documentation - we're confirming the gap exists
  - **DO NOT attempt to fix the documentation yet**
  - **NOTE**: This verification confirms the expected developer experience gap
  - **GOAL**: Confirm that following current documentation does not lead developers to set DB_PASSWORD
  - **Verification Approach**: Simulate fresh developer onboarding
  - Simulate developer cloning repo and reading only `.env.example`, README, and `docs/ai/kiem-tra.md`
  - Verify that `core/.env.example` line 6 shows `DB_PASSWORD=` with NO inline comment explaining test requirement
  - Verify that README line 44 mentions `(TEST_DB_*)` but not `DB_PASSWORD` explicitly
  - Verify that `docs/ai/kiem-tra.md` line 21 mentions fallback chain but doesn't actionably state "set DB_PASSWORD"
  - **EXPECTED OUTCOME**: Documentation gap confirmed - developer cannot discover DB_PASSWORD requirement from current docs
  - Document findings: which files lack the guidance, what a new developer would conclude
  - Mark task complete when documentation gap is verified and documented
  - _Requirements: 1.1, 2.1_

- [ ] 2. Verify preservation requirements (before making changes)
  - **Property 2: Preservation** - Existing Test Behavior and CI/CD Compatibility
  - **IMPORTANT**: Follow observation-first methodology
  - Observe current behavior: Run `cd core && npm test` with `DB_PASSWORD` correctly set - tests pass
  - Observe CI behavior: Check `.github/workflows/deploy.yml` test-core job - runs without DB_PASSWORD set
  - Verify `tests/helpers/db.js` lines 8-14 show fallback chain: `TEST_DB_PASSWORD → DB_PASSWORD → ''`
  - Verify no code changes are planned that would alter this fallback logic
  - Document preserved behaviors: test isolation (random DB names), environment variable overrides (TEST_DB_HOST/PORT/USER), CI compatibility
  - **EXPECTED OUTCOME**: Baseline behaviors documented - ready to verify they remain unchanged after doc updates
  - Mark task complete when preservation requirements are documented
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ] 3. Implement documentation improvements

  - [ ] 3.1 Update core/.env.example with inline comments
    - Add inline comment above `DB_PASSWORD=` (line 6) explaining test requirement
    - Use clear Vietnamese language: "CẦN ĐẶT khi chạy npm test local nếu MySQL yêu cầu mật khẩu"
    - Clarify CI doesn't need this: "CI sử dụng MySQL container không mật khẩu nên không cần đặt trong CI"
    - Explain fallback relationship: "Tests sẽ dùng TEST_DB_PASSWORD nếu có, nếu không sẽ fallback về DB_PASSWORD"
    - _Bug_Condition: Developer reads .env.example without finding DB_PASSWORD guidance for tests_
    - _Expected_Behavior: Developer sees explicit inline comment that DB_PASSWORD must be set for local test runs with password-protected MySQL_
    - _Preservation: Empty DB_PASSWORD= line preserved, no .env.example structure changes, CI workflows unchanged_
    - _Requirements: 2.1, 2.2, 2.3_

  - [ ] 3.2 Update docs/ai/kiem-tra.md test instructions
    - Locate Core test section (around line 21)
    - Replace "cần MySQL local, biến TEST_DB_HOST/PORT/USER/PASSWORD (mặc định fallback DB_*, rồi root@localhost)"
    - With: "cần MySQL local. Đặt DB_PASSWORD trong core/.env nếu MySQL yêu cầu mật khẩu."
    - Add clarification: "Test helper dùng TEST_DB_* nếu có, fallback về DB_*, mặc định root@localhost:3306 không password"
    - Increment `version` field in frontmatter (MINOR bump - adds clarity)
    - Update `updated` field to current date
    - Add entry to `## Lịch sử phiên bản` section
    - _Bug_Condition: Developer troubleshooting test failures cannot find actionable DB_PASSWORD guidance_
    - _Expected_Behavior: Test documentation explicitly states "Đặt DB_PASSWORD trong core/.env nếu MySQL yêu cầu mật khẩu"_
    - _Preservation: Existing fallback chain description preserved, no test commands changed, technical accuracy maintained_
    - _Requirements: 2.1, 2.2_

  - [ ] 3.3 Update README.md test command description
    - Locate Core test command (line 44)
    - Replace "(TEST_DB_*)" with "đặt DB_PASSWORD trong core/.env"
    - Updated line should read: `cd core && npm test                              # node --test, cần MySQL local, đặt DB_PASSWORD trong core/.env`
    - _Bug_Condition: README suggests TEST_DB_* variables are primary, misleading developers_
    - _Expected_Behavior: README clearly states the actual action needed: setting DB_PASSWORD_
    - _Preservation: Test command unchanged, only inline comment clarified_
    - _Requirements: 2.1_

  - [ ] 3.4 Check if onboarding docs need updates (optional)
    - Read `docs/onboarding/ngay-1.md` to check MySQL setup section
    - If file exists and has MySQL setup steps, add guidance to set DB_PASSWORD in .env
    - Suggested addition: "**Quan trọng**: Đặt `DB_PASSWORD` trong `core/.env` để khớp với mật khẩu MySQL root của bạn"
    - Include example: `DB_PASSWORD=myMySQLRootPassword`
    - If file doesn't exist or doesn't cover MySQL setup, skip this step
    - Increment `version` and update frontmatter if changes made
    - _Bug_Condition: New developers following onboarding don't configure DB_PASSWORD proactively_
    - _Expected_Behavior: Onboarding doc includes explicit step to configure DB_PASSWORD before first test run_
    - _Preservation: Existing onboarding steps unchanged, only adding clarification_
    - _Requirements: 2.1, 2.3_

  - [ ] 3.5 Verify Bug Condition is resolved
    - **Property 1: Expected Behavior** - Developers Can Discover DB_PASSWORD Requirement
    - **IMPORTANT**: Re-verify documentation with changes applied - do NOT write new tests
    - Simulate fresh developer reading updated `.env.example` comments
    - Verify inline comment above `DB_PASSWORD=` explicitly mentions test requirement
    - Check updated README and `docs/ai/kiem-tra.md` for DB_PASSWORD mentions
    - Expected: Developer can answer "what must I set in .env for tests?" from documentation alone
    - **EXPECTED OUTCOME**: Documentation now communicates the requirement clearly
    - _Requirements: 2.1, 2.2, 2.3_

  - [ ] 3.6 Verify Preservation requirements still met
    - **Property 2: Preservation** - No Existing Behaviors Changed
    - **IMPORTANT**: Confirm documentation changes haven't introduced confusion or false guidance
    - Verify `.env.example` comment mentions "CI không cần" to preserve CI workflow understanding
    - Verify no documentation suggests modifying `tests/helpers/db.js` code
    - Verify fallback chain description in `docs/ai/kiem-tra.md` is technically accurate
    - Run `cd core && npm test` with DB_PASSWORD set - all tests still pass
    - Verify CI workflow in `.github/workflows/deploy.yml` requires no changes
    - **EXPECTED OUTCOME**: All existing behaviors preserved, no regressions introduced
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ] 4. Checkpoint - Documentation improvements complete
  - All documentation files updated with clear DB_PASSWORD guidance
  - Bug Condition resolved: developers can discover password requirement from docs
  - Preservation verified: no code changes, CI unchanged, existing workflows intact
  - Ready for PR review and merge

---

## Notes

- This is a **documentation-only fix** - zero code changes required
- The test helper's password fallback logic in `tests/helpers/db.js` is correct and unchanged
- Focus on developer experience: make the requirement discoverable BEFORE test failures occur
- Validation is manual (reading docs, checking clarity) rather than automated tests
- CI/CD compatibility must be preserved - no workflow changes required
