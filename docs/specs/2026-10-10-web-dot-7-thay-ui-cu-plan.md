---
doc_id: PLAN-WEBP7-001
title: Kế hoạch triển khai — web/ đợt 7 (thay frontend Core tại /)
version: 1.1
status: active
audience: [dev, ai]
owner: DYC
updated: 2026-10-10
related_code: [web/**, core/src/app.js, core/Dockerfile, core/public/**, .github/workflows/**, tools/tests/**]
---

# Kế hoạch triển khai — web/ đợt 7 (thay frontend Core tại /)

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Phục vụ app Core React từ `web/` tại `/`, giữ giao diện cũ dưới `/legacy` trong thời gian chuyển tiếp và đóng gói cả frontend mới vào image Core.

**Architecture:** `core/src/app.js` phục vụ file tĩnh từ `core/web-dist`, gửi `index.html` mới cho URL frontend, và giữ `core/public` tại `/legacy`. Vite biến `web/index.html` thành entrypoint Core duy nhất; Docker multi-stage build Vite từ context gốc rồi chép bundle vào image Node hiện tại. API/auth không đi qua SPA fallback. Đợt 6 (Nhật ký trực ban) được hoãn và sẽ bổ sung sau trên app mới.

**Tech Stack:** Node.js 22, Express 5, Docker Buildx, Vite 5, React 18, GitHub Actions.

**Spec:** `docs/specs/2026-10-09-web-hoan-thien-thay-the-design.md` §5–7; quyết định liên module tại issue #95.

## Global Constraints

- Pull request target `staging`; không push thẳng lên `main`.
- Giữ `/api/*` và `/auth/*` ngoài SPA fallback; không đổi API, session, schema hoặc quyền.
- Giữ `core/public` phục vụ tại `/legacy` và chưa xóa UI cũ trong đợt này.
- Build image Core cho `linux/arm64`; giữ tag, cache, provenance và deploy policy hiện hành.
- Đợt 7 triển khai trước đợt 6 theo yêu cầu; mục Nhật ký trực ban chưa xuất hiện cho tới khi đợt 6 được làm sau.
- Commit từng task; mọi thay đổi code phải cập nhật tài liệu liên quan cùng PR.

## Review Focus

- `GET /` trả đúng `web/dist/index.html`, không trả trang redirect cũ.
- URL frontend con như `/activity/123` trả SPA entrypoint; `/api/missing` vẫn trả JSON 404.
- `/legacy/` tải HTML cũ và các asset CSS/JS dưới `/legacy`, không rơi vào SPA mới.
- `/auth/unknown` và `/legacy/unknown` không bị SPA fallback trả nhầm index.
- Khi chỉ `web/**` đổi, CI vẫn chạy test web và Core, rồi build image Core bằng root context; khi chỉ Core đổi, job test/build vẫn không bị job web `skipped` chặn.

## File Map

- `web/index.html`: thay trang redirect thành entrypoint React Core.
- `web/vite.config.ts`, `web/core.html`: build Core còn một HTML entry; giữ `ctd.html`.
- `core/src/app.js`: nhận đường dẫn dist (injectable trong test), bỏ static Core cũ ở root, mount legacy và web static đúng thứ tự, phân luồng API/auth/frontend.
- `core/public/index.html`: prefix đường dẫn stylesheet/script legacy bằng `/legacy/`.
- `core/tests/web-cutover.test.js`: HTTP integration tests cho root, route frontend, legacy/assets, API và auth.
- `core/Dockerfile`, `.dockerignore`, `core/.dockerignore`: multi-stage build từ root, giới hạn build context, bỏ ignore cũ không còn áp dụng.
- `.github/workflows/deploy.yml`: filter web/root dockerignore vào Core build; Core build chờ test cần thiết và chạy cả pull request không push image.
- `tools/tests/deploy-workflow.test.js`: khóa cấu hình context/filter/PR build trong test hạ tầng.
- `docs/specs/2026-10-09-web-hoan-thien-thay-the-design.md`, `docs/dev/kien-truc.md`, `docs/dev/frontend.md`, `docs/README.md`: phản ánh cutover và phạm vi hoãn.

## Tasks

### Task 1: Thêm test HTTP cho routing mới, chạy đỏ trước

- [ ] **Step 1: Thêm integration test Core** trong `core/tests/web-cutover.test.js`. Dựng DB và Express app giống `core/tests/helpers/server.js`, nhưng tự khởi tạo server để truyền thư mục `webDistDir` tạm vào `createApplication`; không sửa helper dùng chung. Tạo temp dist có `index.html` chứa `WEB_ENTRY`, và gọi server bằng `http.createServer`.
- [ ] **Step 2: Khóa các hành vi HTTP**: `/` và `/activity/123` trả `WEB_ENTRY`; `/legacy/` trả HTML cũ; `/legacy/styles.css` và `/legacy/app.js` trả 200; `/api/not-found` trả JSON 404; `/auth/not-found` và `/legacy/not-found` không trả `WEB_ENTRY`. Dọn server, temp dist và test DB trong `finally`.
- [ ] **Step 3: Chạy test để xác nhận đỏ đúng nguyên nhân**: `cd core && node --test tests/web-cutover.test.js`. Trên baseline, `/` phải trả Core UI cũ nên assertion `WEB_ENTRY` fail.
- [ ] **Step 4: Commit test đỏ** với message `test(core): khóa hợp đồng cutover web và legacy`.

### Task 2: Chuyển Vite entrypoint và Express static/fallback

- [ ] **Step 1: Biến `web/index.html` thành entrypoint Core**, dựa trên metadata/title hiện tại của `web/core.html`; giữ script `/src/core/main.tsx`. Xóa `core.html` khỏi `rollupOptions.input` và xóa file redirect `web/core.html`; giữ `ctd.html` trong build.
- [ ] **Step 2: Chạy `cd web && npm test && npm run build`**; xác nhận build tạo `dist/index.html` và `dist/ctd.html`, không tạo `dist/core.html`.
- [ ] **Step 3: Cập nhật `createApplication`** để nhận `options.webDistDir` cho test, mặc định là `path.join(__dirname, '..', 'web-dist')`; mount static web assets nhưng không auto-serve index.
- [ ] **Step 4: Chuyển static cũ khỏi root, mount legacy tại `/legacy`** từ `core/public`; đổi asset URL trong `core/public/index.html` sang `/legacy/styles.css`, `/legacy/components.css`, `/legacy/app.js`, `/legacy/notifications.js`. Mount web assets tại root nhưng không auto-serve index. Giữ API và auth routes trước fallback.
- [ ] **Step 5: Thêm fallback có ranh giới**: endpoint `/api/*` 404 JSON; `/auth/*` và `/legacy/*` chưa khớp trả 404; GET `/` và các GET frontend khác gửi web `index.html`. Không fallback cho method ghi.
- [ ] **Step 6: Chạy test đỏ rồi test xanh**: `cd core && node --test tests/web-cutover.test.js`, sau đó `npm test`. Expected: test mới pass và suite Core không đổi hành vi API/auth.
- [ ] **Step 7: Commit** với message `feat(core): phục vụ web mới tại root và giữ legacy`.

### Task 3: Đóng gói web trong image Core và kiểm tra workflow

- [ ] **Step 1: Thêm root `.dockerignore`** loại `.git`, `.env`, `**/node_modules`, `core/storage`, docs, services, tooling và test artifacts; không loại `web/**` hoặc `core/public/**`. Xóa `core/.dockerignore` vì Docker chỉ đọc ignore ở build-context root.
- [ ] **Step 2: Chuyển `core/Dockerfile` sang multi-stage**: Node 22 build stage copy `web/package.json` + lockfile, `npm ci`, copy `web/`, `npm run build`; runtime stage cài production dependencies trong `core/`, copy Core source và `/src/web/dist` vào `/app/web-dist`, tạo `storage/task-attachments`, giữ `EXPOSE 3000` và `CMD` hiện tại.
- [ ] **Step 3: Cập nhật path filter**: filter `core` khớp `core/**`, `web/**`, `.dockerignore`; filter `web` vẫn chỉ khớp `web/**`. Như vậy thay đổi web chạy `test-core` và `test-web`, thay đổi Core hoặc ignore vẫn chạy `test-core`.
- [ ] **Step 4: Cập nhật job Core build** với `needs: [changes, test-core, test-web]` và điều kiện `always()`, chỉ build khi `test-core == 'success'` và `test-web` là `success` hoặc `skipped`; chạy với `push` và `pull_request`. Login GHCR + push image chỉ khi event là push; PR build arm64 nhưng không publish image. Giữ `deploy-core` chỉ chạy theo luồng push hiện hành.
- [ ] **Step 5: Thêm assertions workflow** vào `tools/tests/deploy-workflow.test.js` cho build context `.`, Dockerfile `core/Dockerfile`, filter web/root ignore, build PR không push và arm64.
- [ ] **Step 6: Chạy test trước/sau thay đổi workflow**: `npm run test:tools`, `cd core && npm test`. Test workflow phải fail trên baseline nếu các điều kiện trên chưa được cấu hình và pass sau sửa.
- [ ] **Step 7: Commit** với message `build(core): đóng gói web từ context repo root`.

### Task 4: Đồng bộ tài liệu, chạy đủ gate và chuẩn bị PR

- [ ] **Step 1: Cập nhật `docs/dev/kien-truc.md` và `docs/dev/frontend.md`**: pipeline Express phục vụ web ở `/`, legacy ở `/legacy`, Vite entrypoint `index.html`, multi-stage build/context root, cách test local.
- [ ] **Step 2: Chạy `npm run docs:index`**; không sửa `docs/README.md` bằng tay. Bump version/date/history cho tài liệu có nội dung đổi.
- [ ] **Step 3: Chạy đủ gate**: `cd web && npm test && npm run build`; `cd core && npm test`; `npm run test:tools`; `npm run docs:check -- --base origin/staging`; `git diff --check`.
- [ ] **Step 4: Xác nhận CI PR** chạy `test-core`, `test-web`, `docs`, `test:tools` và job build Core arm64 không publish; ghi rõ job nào bị path-filter skip.
- [ ] **Step 5: Tạo PR draft vào `staging`** gắn issue #95; ghi phụ thuộc PR #91, #92, #94 nếu chúng chưa merge. Không merge hoặc deploy production.

## Lịch sử phiên bản

| Version | Ngày | Thay đổi | Người |
|---|---|---|---|
| 1.0 | 2026-10-10 | Plan đợt 7: cutover web tại `/`, giữ legacy, đổi Docker context và kiểm tra CI arm64; đợt 6 được hoãn theo yêu cầu | DYC |
| 1.1 | 2026-10-10 | Bổ sung hoàn thiện giao diện di động tự động, `ErrorBoundary` và luồng điều hướng xuyên màn trên `web/` sau cutover; nội dung kế hoạch đợt 7 không đổi | DYC |
