# Bugfix Requirements Document

## Introduction

The `core/` test suite is completely non-functional due to MySQL authentication failures. All 45 database-dependent tests fail because the test helper (`tests/helpers/db.js`) attempts to connect to MySQL without providing credentials, resulting in "Access denied for user 'root'@'localhost' (using password: NO)" errors. This prevents running any tests that require database access, blocking the ability to verify the correctness of database-dependent features.

The root cause is that the test helper's `rootConfig` object reads from environment variables (`DB_PASSWORD`, `TEST_DB_PASSWORD`) which have empty string values in the local `.env` file, but the local MySQL instance requires an actual password for the root user.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN the test suite runs and `process.env.DB_PASSWORD` is an empty string THEN the system attempts to connect to MySQL with `password: ''` and fails with "Access denied for user 'root'@'localhost' (using password: NO)"

1.2 WHEN the test suite runs and `process.env.TEST_DB_PASSWORD` is undefined THEN the system falls back to `process.env.DB_PASSWORD` which is an empty string and fails with authentication error

1.3 WHEN MySQL requires a password for the root user THEN all 45 database-dependent tests fail during the `createTestDatabase()` call at line 20 of `tests/helpers/db.js`

### Expected Behavior (Correct)

2.1 WHEN the test suite runs and `TEST_DB_PASSWORD` environment variable is set THEN the system SHALL use that password to authenticate with MySQL successfully

2.2 WHEN the test suite runs and `TEST_DB_PASSWORD` is not set but `DB_PASSWORD` is set THEN the system SHALL use `DB_PASSWORD` as a fallback and authenticate successfully

2.3 WHEN MySQL requires authentication THEN all database-dependent tests SHALL be able to create isolated test databases and run successfully

### Unchanged Behavior (Regression Prevention)

3.1 WHEN tests run in CI/CD environments with different MySQL configurations THEN the system SHALL CONTINUE TO support reading credentials from `TEST_DB_*` environment variables

3.2 WHEN tests use the `createTestDatabase()` helper THEN the system SHALL CONTINUE TO create isolated test databases with random names using the format `tckt_test_{pid}_{random}`

3.3 WHEN tests complete (success or failure) THEN the system SHALL CONTINUE TO clean up test databases via the `teardown()` function

3.4 WHEN multiple tests run concurrently (via `--test-concurrency`) THEN the system SHALL CONTINUE TO create separate isolated databases for each test to prevent conflicts

3.5 WHEN the `rootConfig` uses environment variables for host and port THEN the system SHALL CONTINUE TO support `TEST_DB_HOST`, `TEST_DB_PORT` overrides with fallback to `DB_HOST`, `DB_PORT`
