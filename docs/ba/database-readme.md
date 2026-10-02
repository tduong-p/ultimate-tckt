---
doc_id: BA-DB-001
title: Database structure — Core and Operations
version: 1.1
status: active
audience: [ba, dev, ai]
owner: DYC
updated: 2026-09-26
related_code: [core/db.sql, core/src/config/migrate.js]
---

# Database structure — Core and Operations

This README explains the target relational model for the shared Core and Operations database. It accompanies the [multi-unit ERD](erd-multiunit.png) and its [Mermaid source](erd-multiunit.mmd).

## Current schema and target design

The supplied ERD describes the existing TCKT operations schema. The multi-unit platform design adds organization, membership, visibility, directive, submission, audit, and operations-log data, and adds unit ownership to existing team and activity records. These additions are a **target design**; the diagram and this README do not claim that every planned table is already present in the running database.

Core and Operations share MySQL. CTD remains a separate service with its own PostgreSQL database; CTD tables are outside this ERD.

## Main relationships

- A `users` account can have memberships in multiple `org_units`. Each membership has its own role. Unit membership and internal team membership are different relationships.
- An `org_units` row represents DYC, BTV, TCKT, or another organizational unit. `parent_id` optionally links it to a parent unit.
- Each `teams` row belongs to one `org_units` row. TCKT can keep its internal teams; other units do not have to use teams.
- BTV creates a `directives` row addressed to TCKT. TCKT can assign an owner and link one or more `activities` to the directive. Activities contain `tasks`.
- TCKT reports an activity, operations log, or report through `submissions`. A submission points to a source using `source_type` and `source_id`; because the source can be different table types, `source_id` is a polymorphic reference rather than a conventional foreign key.
- `unit_visibility_policies` determines what one unit may read from another. A submission also grants access to the specific item submitted, subject to withdrawal and response rules.
- `audit_logs` records cross-unit reads and sensitive changes. `ops_logs` and `ops_log_attendance` record duty shifts or meetings and attendance.

## Tables

### Identity and unit structure

| Table | Status | Purpose and important relationships |
|---|---|---|
| `users` | Existing | One account per person. `email` identifies the account. `role` is the current legacy TCKT role during migration; the target authorization model reads a role from the person's membership in the selected unit. |
| `org_units` | Planned | Organization registry: `code`, `name`, `kind`, optional `parent_id`, and active status. `parent_id` supports a unit hierarchy. |
| `unit_memberships` | Planned | Many-to-many link between `users` and `org_units`, with a role for that specific unit. Composite primary key: (`user_id`, `unit_id`). The same person may belong to TCKT, BTV, a department, Đoàn trường, or Liên chi đoàn. |
| `unit_modules` | Planned | Lists which application modules are enabled for each unit. Composite key: (`unit_id`, `module_id`). Membership alone does not enable a module. |

### Unit visibility, settings, and audit

| Table | Status | Purpose and important relationships |
|---|---|---|
| `unit_visibility_policies` | Planned | Stores a read level for a viewer unit and data-owning unit. The planned levels are `summary`, `tasks_readonly`, and `full_readonly`; seed BTV → TCKT as `summary`. |
| `setting_locks` | Planned | Locks a setting globally or for one unit. `unit_id = NULL` means the lock applies to all units. Stores who locked it and the reason. |
| `audit_logs` | Planned | Records cross-unit access and sensitive changes. Stores actor, actor unit, action, target type/id, owning unit, metadata, and time. |

### Internal teams and Operations

| Table | Status | Purpose and important relationships |
|---|---|---|
| `teams` | Existing, extended | Internal team registry. Target design adds required `unit_id`, so teams belong to a unit. Existing teams are assigned to TCKT during migration. |
| `user_teams` | Existing | Many-to-many membership between users and teams. Stores team leadership flags such as `is_lead` and `is_vice_lead`. It does not replace `unit_memberships`. |
| `activities` | Existing, extended | Main project/activity record. Target design adds required `unit_id` and nullable `directive_id`; existing activities are assigned to TCKT. `team_id` identifies the lead team; `activity_teams` records supporting teams. |
| `activity_teams` | Existing | Join table for activities and supporting teams, with an optional contact user. Composite key: (`activity_id`, `team_id`). |
| `tasks` | Existing | Work items under an activity, including team ownership, primary assignee, assigner, reviewer, and workflow status. |
| `task_assignees` | Existing | Join table for additional task assignees/co-assignees. Stores acknowledgement time for task assignment. |
| `task_checklists` | Existing | Checklist items belonging to a task, including the user who completed an item. |
| `task_attachments` | Existing | Files attached to tasks and the user who added them. |
| `activity_proposals` | Existing | Proposal submission/review records for activities, including submitter and reviewer. |
| `participants` | Existing | Join table between activities and participating users. |
| `updates` | Existing | Activity/task updates authored by users. |
| `update_tagged_users` | Existing | Join table identifying users tagged in an update. |
| `documents` | Existing | Documents issued by a team and created by a user. |
| `weight_presets` | Existing | Configurable weight values used when logging unplanned work. |
| `notifications` | Existing | Notifications addressed to users and optionally linked to an activity or task. |
| `sessions` | Existing | Login/session state keyed by `session_id`. This is infrastructure data, not an Operations record. |

### BTV ↔ TCKT workflow

| Table | Status | Purpose and important relationships |
|---|---|---|
| `directives` | Planned | A unit-to-unit assignment. Stores `from_unit_id`, `to_unit_id`, creator, responsible owner, title/body, deadline, acknowledgement time, and status. For the initial workflow, BTV sends directives to TCKT. |
| `submissions` | Planned | A unit's submission of a specific source item to another unit. Stores sender/recipient, `source_type`, `source_id`, optional `directive_id`, submitter, note, response, response note, responder, and withdrawal/response timestamps. |

### Operations logs

| Table | Status | Purpose and important relationships |
|---|---|---|
| `ops_logs` | Planned | A unit-owned duty shift, meeting, or other operations log. Stores its time, location/content, and recorder. |
| `ops_log_attendance` | Planned | Join table between an operations log and users, with attendance status and note. Composite key: (`ops_log_id`, `user_id`). |

## Directive and reporting lifecycle

1. A BTV member creates a directive addressed to TCKT. It starts as `sent`.
2. An authorized TCKT administrator acknowledges it and appoints an owner. It becomes `acknowledged`.
3. TCKT creates activities linked by `activities.directive_id`; the directive progresses to `in_progress`.
4. TCKT submits a result using `submissions`, linked to the directive. The directive becomes `submitted`.
5. BTV responds by accepting the result (`accepted`) or requesting a revision (`revision_requested`). TCKT can continue the work and submit again.

Directive progress is derived from tasks across its linked activities: completed (`done`) tasks divided by tasks that are not `cancelled`. It is a calculated value, not a separate stored progress table in this design.

## Data access boundaries

- Every business record belongs to a unit directly or through its parent records. Queries across units must apply the server-side data scope policy.
- Users can operate under one selected unit context at a time. Their role and permissions come from that unit's membership.
- BTV's default `summary` view shows aggregate activity information and directives/submissions. Task details and fuller internal records require the corresponding visibility level or an explicit submission.
- DYC is the platform owner and has global access under the design; cross-unit access is audited.
- A submission grants access to the submitted item only. Withdrawing it before a response revokes that access; a responded submission cannot be withdrawn.

## Schema implementation notes

- Use the Core migration system to create or alter MySQL tables; do not edit a deployed database manually.
- The multi-unit migration is designed to be idempotent: assign current teams and activities to TCKT and create TCKT memberships from existing `users.role` values without duplicating rows.
- The schema fields shown in the ERD are a design summary. Before implementing, verify the existing-table columns and foreign keys against `core/db.sql` and `core/src/config/migrate.js`.

## References

- [Multi-unit design specification](../specs/nen-tang-da-don-vi-design.md), especially sections 5–7.
- [Operations use cases](dieu-hanh-use-case.md).
- [ERD image](erd-multiunit.png) and [editable ERD source](erd-multiunit.mmd).

## Lịch sử phiên bản

| Version | Date | Change | Author |
|---|---|---|---|
| 1.0 | 2026-09-26 | Initial database structure README for the multi-unit target model | DYC |
| 1.1 | 2026-09-27 | Ghi nhận sự thay đổi liên quan đến migrate.js ở nhánh GĐ1-A | D2 |
