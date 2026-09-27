# Pytest Alembic Import Error Bugfix Design

## Overview

This bug fix addresses a pytest collection failure caused by a missing `alembic` package in the Python environment when running tests for the CTD API backend. The root cause is that the package dependencies declared in `pyproject.toml` are not installed in the active Python environment (conda environment named `ultimate-tckt`). The fix involves installing the package in editable mode using pip, which will install all dependencies including alembic.

## Glossary

- **Bug_Condition (C)**: The condition that triggers the bug - pytest collection fails when alembic is not installed in the active Python environment
- **Property (P)**: The desired behavior - pytest should successfully collect and run tests when all dependencies are properly installed
- **Preservation**: Existing test behavior, package functionality, and application runtime behavior that must remain unchanged by the fix
- **pyproject.toml**: PEP 517/518 build system configuration file that declares package metadata and dependencies for the `ctd-backend` package
- **Editable install**: A pip installation mode (`pip install -e .`) that installs a package in development mode, allowing code changes without reinstallation
- **Conda environment**: An isolated Python environment managed by conda, in this case named `ultimate-tckt`

## Bug Details

### Bug Condition

The bug manifests when a developer or CI system attempts to run pytest in the `services/ctd-api/backend/` directory without first installing the package and its dependencies. The `ultimate-tckt` conda environment exists but does not have the `ctd-backend` package installed, which means the dependencies declared in `pyproject.toml` (including alembic) are not present.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type PytestExecutionContext
  OUTPUT: boolean
  
  RETURN input.currentDirectory == "services/ctd-api/backend"
         AND input.pythonEnvironment == "ultimate-tckt" (or any environment)
         AND NOT packageInstalled("ctd-backend", input.pythonEnvironment)
         AND NOT packageInstalled("alembic", input.pythonEnvironment)
         AND fileExists("tests/test_migrations.py")
END FUNCTION
```

### Examples

- **Example 1**: Developer activates `ultimate-tckt` conda environment, navigates to `services/ctd-api/backend/`, runs `pytest` → Expected: Tests run successfully. Actual: ModuleNotFoundError during collection.
- **Example 2**: Developer runs `conda list` in `ultimate-tckt` environment → Expected: alembic should be listed. Actual: alembic is not in the package list.
- **Example 3**: Developer runs `pytest tests/test_migrations.py` → Expected: Test executes. Actual: Import error on line 1 of test_migrations.py.
- **Edge case**: Developer installs alembic manually with `pip install alembic` → Expected: This specific test works, but this is not the correct solution because it doesn't install other dependencies and doesn't follow the documented setup process.

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Tests that do not import alembic (other tests in the test suite) must continue to work
- The alembic package must continue to work correctly for runtime database migrations (Procfile, alembic upgrade head)
- Other dependencies from pyproject.toml (fastapi, uvicorn, sqlalchemy, etc.) must continue to function
- pytest configuration in pyproject.toml (testpaths, addopts) must continue to be respected

**Scope:**
All functionality that does NOT involve the missing alembic dependency should be completely unaffected by this fix. This includes:
- Application runtime behavior (FastAPI server, database connections, etc.)
- Other test files that don't import alembic
- Package build and distribution process
- Development workflow for other dependencies

## Hypothesized Root Cause

Based on the bug description and project structure, the most likely issues are:

1. **Package Not Installed in Environment**: The primary cause is that the developer has not run `pip install -e '.[dev]'` in the `services/ctd-api/backend/` directory after activating the conda environment. This is the documented setup step in `docs/dev/chay-local.md`.

2. **Conda Environment Created But Not Configured**: The conda environment `ultimate-tckt` exists (perhaps created manually or by a previous workflow) but was never used to install the ctd-backend package, leaving it empty of project dependencies.

3. **Virtual Environment Confusion**: The developer might be using the wrong Python environment. The documentation shows using `.venv` (venv) but the error message mentions a conda environment. There might be a mismatch between the active environment and the expected one.

4. **Documentation Gap**: While `docs/dev/chay-local.md` documents the setup process clearly, there may not be a central "first-time setup" checklist that developers follow, leading to skipped steps.

## Correctness Properties

Property 1: Bug Condition - Alembic Available After Installation

_For any_ Python environment where the ctd-backend package is installed using `pip install -e '.[dev]'` from the `services/ctd-api/backend/` directory, pytest SHALL successfully import alembic during test collection and execute all tests including test_migrations.py without ModuleNotFoundError.

**Validates: Requirements 2.1, 2.2, 2.3**

Property 2: Preservation - Existing Functionality Unchanged

_For any_ functionality that does NOT depend on the bug fix (other tests, application runtime, other dependencies), the system SHALL produce exactly the same behavior as before, preserving all existing test results, application behavior, and development workflows.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct (package not installed), the fix is straightforward:

**Location**: Developer's local environment setup

**Specific Changes**:

1. **Install Package in Editable Mode**: Run the installation command in the correct directory with the correct environment active
   - Command: `pip install -e '.[dev]'`
   - Working directory: `services/ctd-api/backend/`
   - Environment: The Python environment being used for development (conda, venv, or system Python)
   - Effect: Installs all dependencies from `pyproject.toml` including alembic, fastapi, pytest, etc.

2. **Verify Installation**: Check that alembic is now available
   - Command: `python -c "import alembic; print(alembic.__version__)"`
   - Expected output: Version number (e.g., `1.14.0` or higher)

3. **Verify Package Installation**: Check that ctd-backend is installed in editable mode
   - Command: `pip list | grep ctd-backend` (Unix) or `pip list | findstr ctd-backend` (Windows)
   - Expected output: `ctd-backend  0.1.0  <path-to-backend-directory>`

4. **Run Pytest**: Verify tests now work
   - Command: `pytest`
   - Expected: Tests collect successfully and run

5. **Documentation Enhancement** (optional, if gap identified): Add a troubleshooting section to `docs/dev/chay-local.md` or `docs/ai/bay-da-gap.md` documenting this common setup mistake

### Alternative: If Using System Python Without Virtual Environment

If the developer is not using a virtual environment (not recommended but possible):

1. **Create Virtual Environment First**: 
   ```bash
   cd services/ctd-api/backend
   python3.12 -m venv .venv
   ```

2. **Activate Virtual Environment**:
   - Unix/Mac: `source .venv/bin/activate`
   - Windows PowerShell: `.venv\Scripts\Activate.ps1`
   - Windows CMD: `.venv\Scripts\activate.bat`

3. **Install Package**: `pip install -e '.[dev]'`

### Note on Conda vs Venv

The bug description mentions a conda environment (`ultimate-tckt`) but the documentation uses venv (`.venv`). This discrepancy should be investigated:

- If conda is the preferred tool, update documentation to use conda consistently
- If venv is preferred, the developer should switch from conda to venv
- Either way, the installation command `pip install -e '.[dev]'` works in both conda and venv environments

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, confirm the bug exists on the unfixed (uninstalled) state, then verify that installation resolves the issue and preserves all existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface the bug in the current state BEFORE implementing the fix. Confirm the root cause analysis.

**Test Plan**: Manually verify the bug exists by attempting to run pytest without installing the package, then inspect the Python environment to confirm alembic is missing.

**Test Cases**:
1. **Pytest Collection Failure**: Run `pytest` in `services/ctd-api/backend/` without installation (will fail with ModuleNotFoundError)
2. **Package List Check**: Run `pip list` or `conda list` and verify alembic is not present (will confirm alembic is missing)
3. **Import Check**: Run `python -c "import alembic"` (will fail with ModuleNotFoundError)
4. **Package Installation Check**: Run `pip show ctd-backend` (will show "Package not found")

**Expected Counterexamples**:
- `ModuleNotFoundError: No module named 'alembic.config'` during pytest collection
- `alembic` not in output of `pip list` or `conda list`
- `Package not found: ctd-backend` from `pip show`

### Fix Checking

**Goal**: Verify that after installing the package, pytest successfully collects and runs tests.

**Pseudocode:**
```
GIVEN environment WHERE isBugCondition(environment)
WHEN pip_install_editable("services/ctd-api/backend", options="[dev]")
THEN
  result := run_pytest("services/ctd-api/backend")
  ASSERT result.collection_succeeded == True
  ASSERT "ModuleNotFoundError" NOT IN result.stderr
  ASSERT "alembic" IN pip_list()
  ASSERT test_migrations_collected(result)
END
```

### Preservation Checking

**Goal**: Verify that the installation does not break any existing functionality.

**Pseudocode:**
```
GIVEN environment_before WHERE package_installed("ctd-backend")
GIVEN test_results_before := run_pytest()
GIVEN app_behavior_before := test_application_runtime()

WHEN reinstall_package()

THEN
  test_results_after := run_pytest()
  app_behavior_after := test_application_runtime()
  
  ASSERT test_results_after == test_results_before (same pass/fail for non-alembic tests)
  ASSERT app_behavior_after == app_behavior_before (application still works)
  ASSERT all_dependencies_still_installed()
END
```

**Testing Approach**: Manual verification is sufficient for this bug fix because:
- The fix is a one-time setup step (installation), not a code change
- The bug affects the development environment setup, not production code
- Property-based testing is not applicable to installation procedures
- Standard pytest runs will verify preservation by running the existing test suite

**Test Plan**: 

1. **Before Fix**: Document current state
   - Record which tests pass/fail before installation
   - Note application runtime behavior (if any part is currently working)

2. **After Fix**: Verify improvement without regression
   - Confirm test_migrations.py now collects and runs
   - Confirm all previously passing tests still pass
   - Confirm application still starts and runs correctly

**Test Cases**:
1. **Non-Alembic Tests Preservation**: Run tests that don't use alembic (e.g., `tests/test_auth.py` if it exists) and verify they behave identically before and after installation
2. **Application Runtime Preservation**: Start the FastAPI application with `uvicorn app.main:app` and verify it still works
3. **Alembic CLI Preservation**: Run `alembic upgrade head` and verify migrations still work (this uses alembic at runtime, not just in tests)
4. **Other Dependencies Preservation**: Import and use other dependencies (fastapi, sqlalchemy, pydantic) and verify they work correctly

### Unit Tests

Since this is an environment setup issue rather than a code bug, traditional unit tests are not applicable. However, we can perform manual verification steps:

- Verify pytest can import alembic after installation
- Verify test_migrations.py collects without errors
- Verify test_migrations.py executes and either passes or fails based on actual migration state (not import errors)
- Verify other test files still work correctly

### Property-Based Tests

Property-based testing is not applicable for this bugfix because:
- The bug is about environment setup, not algorithmic correctness
- There are no input domains to generate test cases from
- The fix is idempotent (running `pip install` multiple times has the same effect)

### Integration Tests

Manual integration verification:

- **Full Test Suite**: Run `pytest` and verify all tests collect and execute
- **Application Startup**: Run `uvicorn app.main:app` and verify the server starts without import errors
- **Migration Execution**: Run `alembic upgrade head` and verify migrations apply correctly
- **Development Workflow**: Follow the complete setup process in `docs/dev/chay-local.md` from a clean state and verify every step works
