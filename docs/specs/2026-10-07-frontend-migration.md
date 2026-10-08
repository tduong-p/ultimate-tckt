---
doc_id: SPEC-WEB-001
title: Frontend Migration (Atlassian Design System)
version: 1.1
status: active
audience: [dev, ai]
owner: DYC
updated: 2026-10-08
related_code: [web/**]
---

# Frontend Migration (Atlassian Design System) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Migrate the successful Atlassian Design System POC from cai-tien-frontend to the official web/ module for the entire repository.

**Architecture:** We will copy the React + Vite + Atlassian Design System structure from cai-tien-frontend into the root web/ directory, set it up as a workspace package if necessary, and update the repository's module boundaries documentation to reflect that the Web module is now active.

**Tech Stack:** React, Vite, @atlaskit (Atlassian Design System), TypeScript.

**Spec:** SPEC-WEB-001 (This document).

## Global Constraints
- Target directory must be exactly web/.
- Must retain all existing UI improvements (dark mode, split-pane, mobile responsiveness).
- Do not break the core or services modules.

## Review Focus
- Ensure the dev server starts correctly in the new web/ folder.
- Ensure all relative imports resolve correctly after the move.
- Ensure docs/dev/ranh-gioi-module.md is updated.

---

### Task 1: Create and Scaffold the web/ module

**Files:**
- Create/Move: web/**
- Modify: docs/dev/ranh-gioi-module.md

- [ ] **Step 1: Move POC files to official web module**
```bash
Move-Item -Path "cai-tien-frontend" -Destination "web"
```

- [ ] **Step 2: Update Module Boundaries Documentation**
Modify docs/dev/ranh-gioi-module.md to remove "(chưa tạo)" from the Web module row.
```markdown
| **Web** (frontend chung) | web/** | |
```

- [ ] **Step 3: Run docs index check**
```bash
npm run docs:index
npm run docs:check -- --base origin/staging
```

- [ ] **Step 4: Commit**
```bash
git add web docs/dev/ranh-gioi-module.md docs/README.md docs/specs/
git commit -m "feat(web): migrate frontend POC to official web module"
```

## Lịch sử phiên bản

| Version | Ngày | Thay đổi | Người |
|---|---|---|---|
| 1.0 | 2026-10-07 | Kế hoạch chuyển đổi POC sang module web/ chính thức | DYC |
| 1.1 | 2026-10-08 | Tích hợp toàn diện API Backend và xóa dữ liệu mock thử nghiệm trong web/** | DYC |
