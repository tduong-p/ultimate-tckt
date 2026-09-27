# Implementation Plan

## Overview
This task list follows the exploratory bugfix workflow to fix the pytest alembic import error. The bug occurs when the ctd-backend package is not installed in the Python environment, causing pytest to fail during test collection due to missing alembic dependency.

---

- [ ] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - Alembic Import Fails Without Package Installation
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bug exists
  - **Manual Verification Approach**: This is an environment setup bug, so we use manual verification instead of automated property-based testing
  - Verify bug condition manually in the unfixed environment:
    - Navigate to `services/ctd-api/backend/`
    - Ensure the Python environment is active (conda or venv)
    - Run `pip show ctd-backend` → Expected: "Package(s) not found: ctd-backend"
    - Run `pip list | grep alembic` (Unix) or `pip list | findstr alembic` (Windows) → Expected: alembic not in list
    - Run `python -c "import alembic"` → Expected: ModuleNotFoundError
    - Run `pytest` → Expected: Collection fails with "ModuleNotFoundError: No module named 'alembic.config'"
  - **EXPECTED OUTCOME**: All verification steps FAIL (this is correct - it proves the bug exists)
  - Document counterexamples found:
    - Record exact error message from pytest
    - Record output of `pip show ctd-backend`
    - Record output of `pip list` (confirm alembic missing)
  - Mark task complete when verification is done and failures are documented
  - _Requirements: Bug Condition C(X) where X.packageInstalled("ctd-backend") == False AND X.packageInstalled("alembic") == False_

- [ ] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Existing Functionality Preserved
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED environment for non-buggy cases (functionality that should work):
    - Check if any tests that don't import alembic can run (if any exist)
    - Check if other Python dependencies are available (run `pip list` and record installed packages)
    - Check if application startup commands are documented (review `docs/dev/chay-local.md`)
  - Document baseline behavior to preserve:
    - List of currently installed packages (will verify these remain after fix)
    - Any currently passing tests (will verify they still pass after fix)
    - Application runtime behavior if testable (will verify it still works after fix)
  - **Manual Verification List**:
    - Record current `pip list` output
    - Record current pytest test results (if any tests work without alembic)
    - Note any other working functionality (e.g., application startup, other imports)
  - **EXPECTED OUTCOME**: Documentation of baseline behavior to preserve
  - Mark task complete when baseline is documented
  - _Requirements: Preservation Requirements - all non-alembic functionality must remain unchanged_

- [ ] 3. Fix for pytest alembic import error

  - [ ] 3.1 Install ctd-backend package in editable mode
    - Navigate to `services/ctd-api/backend/` directory
    - Ensure Python environment is active (conda `ultimate-tckt` or venv `.venv`)
    - Run installation command: `pip install -e '.[dev]'`
    - Wait for installation to complete
    - Verify package installation: `pip show ctd-backend` → Should show package info with editable location
    - Verify alembic installation: `pip list | grep alembic` → Should show alembic with version number
    - Test alembic import: `python -c "import alembic; print(alembic.__version__)"` → Should print version without error
    - _Bug_Condition: isBugCondition(input) where input.packageInstalled("ctd-backend") == False AND input.packageInstalled("alembic") == False_
    - _Expected_Behavior: After installation, alembic module is importable and pytest can collect tests successfully_
    - _Preservation: All existing dependencies and test functionality remain unchanged_
    - _Requirements: 2.1, 2.2, 2.3_

  - [ ] 3.2 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Alembic Import Succeeds After Package Installation
    - **IMPORTANT**: Re-run the SAME verification steps from task 1 - do NOT create new tests
    - The verification from task 1 encodes the expected behavior
    - When these verifications pass, it confirms the expected behavior is satisfied
    - Run verification steps from step 1 in the FIXED environment:
      - `pip show ctd-backend` → Expected: Shows package information with path
      - `pip list | grep alembic` → Expected: Shows alembic with version number
      - `python -c "import alembic"` → Expected: No error, silent success
      - `pytest` → Expected: Tests collect successfully without ModuleNotFoundError
    - **EXPECTED OUTCOME**: All verification steps PASS (confirms bug is fixed)
    - Document successful outcomes:
      - pytest collects tests successfully
      - alembic imports without error
      - ctd-backend package is installed in editable mode
    - _Requirements: Expected Behavior Properties - pytest successfully collects tests when alembic is available_

  - [ ] 3.3 Verify preservation tests still pass
    - **Property 2: Preservation** - Existing Functionality Unchanged
    - **IMPORTANT**: Re-run the SAME verification steps from task 2 - do NOT create new tests
    - Compare current state with documented baseline from step 2:
      - Run `pip list` → Compare with baseline, verify all previous packages still present
      - Run full pytest suite → Compare test results with baseline, verify no regressions
      - Test application functionality → Verify any previously working features still work
    - **Manual Verification Checklist**:
      - All previously installed packages still present (check pip list)
      - Any tests that passed before still pass (run pytest and compare)
      - Application still works correctly (test startup, basic operations if applicable)
    - **EXPECTED OUTCOME**: All preservation checks PASS (confirms no regressions)
    - Document preservation verification:
      - Confirm no packages were removed
      - Confirm no previously passing tests now fail
      - Confirm application behavior unchanged
    - _Requirements: Preservation Requirements - all existing functionality preserved_

- [ ] 4. (Optional) Document common setup mistake in troubleshooting
  - Add section to `docs/ai/bay-da-gap.md` or `docs/dev/chay-local.md`
  - Document the symptom: "ModuleNotFoundError for alembic when running pytest"
  - Document the root cause: "ctd-backend package not installed in Python environment"
  - Document the solution: "Run `pip install -e '.[dev]'` from `services/ctd-api/backend/` directory"
  - Include verification steps for developers to check if setup is correct
  - Tăng `version` trong frontmatter của tài liệu được cập nhật
  - Thêm dòng vào `## Lịch sử phiên bản` với mô tả thay đổi
  - _Requirements: Documentation improvement for developer experience_

- [ ] 5. Checkpoint - Ensure all verifications pass
  - Confirm pytest runs successfully without import errors
  - Confirm all preservation checks pass
  - Confirm package is installed in editable mode (code changes take effect without reinstall)
  - Ask the user if questions arise
  - _Requirements: Complete fix validation_

---

## Notes

- This is an **environment setup bug**, not a code bug, so manual verification steps are used instead of automated property-based tests
- The "exploration test" (task 1) is really a manual verification checklist that proves the bug exists
- The "preservation test" (task 2) is a manual baseline documentation to verify no regressions
- The fix is a one-time installation command that sets up the development environment correctly
- After the fix, the developer can continue normal development with `pytest` working as expected
