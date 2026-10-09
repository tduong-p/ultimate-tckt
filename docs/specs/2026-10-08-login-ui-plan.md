---
doc_id: PLAN-LOGIN-001
title: Kế hoạch Triển khai — Giao diện Đăng nhập Hiện đại cho TCKT Activity Hub (Core Web)
version: 1.6
status: deprecated
audience: [dev, ai]
owner: DYC
updated: 2026-10-09
related_code: []
---

# Kế hoạch Triển khai — Giao diện Đăng nhập Hiện đại cho TCKT Activity Hub (Core Web)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Xây dựng màn hình đăng nhập hiện đại React + ADS kế thừa bố cục 2 cột đặc trưng từ hệ thống cũ và kết nối xác thực thực tế với backend Core Express, hỗ trợ kiểm soát phiên (session gating) và đăng xuất.

**Architecture:** Tạo component `LoginView.tsx` trong `web/src/core/features/auth/`, mở rộng `web/src/core/api/` với các hàm `loginUser` và `logoutUser`, điều hướng phiên trong `web/src/core/main.tsx` dựa trên React Query `fetchSession`, và thêm hành động đăng xuất trong `PageLayout.tsx`.

**Tech Stack:** React 18, Atlassian Design System (ADS), TypeScript, React Query (@tanstack/react-query), Vitest, Testing Library.

**Spec:** `docs/specs/2026-10-08-login-ui-design.md`

## Global Constraints
- Tất cả thay đổi mã nguồn chỉ nằm trong thư mục `web/` và tài liệu trong `docs/`.
- Tuyệt đối không thay đổi mã nguồn backend `core/` hoặc schema cơ sở dữ liệu.
- Tuyệt đối không chạy lệnh `git push` lên bất kỳ remote git nào.
- Empty states (nếu có) tuân thủ nghiêm ngặt việc sử dụng `InboxIcon` (không dùng checkbox/TaskIcon).
- Màu sắc và phong cách giao diện tuân thủ bảng mã gradient và ADS tokens.

## Review Focus
1. Đăng nhập sai mật khẩu hoặc tài khoản không tồn tại -> hiển thị thông báo lỗi rõ ràng mà không gây sập ứng dụng.
2. Nút đăng nhập hiển thị trạng thái đang tải (`isLoading`) để ngăn chặn việc người dùng nhấn liên tiếp nhiều lần.
3. Người dùng chưa đăng nhập khi truy cập `/core.html` phải thấy ngay màn hình đăng nhập thay vì giao diện trống hoặc lỗi 401.
4. Sau khi đăng nhập thành công, phiên làm việc được cập nhật ngay lập tức mà không cần tải lại toàn bộ trang thủ công.
5. Người dùng đăng xuất phải dọn sạch cache phiên và quay về màn hình đăng nhập an toàn.

---

### Task 1: Thêm API xác thực `loginUser` và `logoutUser` trong Data Layer

**Files:**
- Modify: `web/src/core/api/types.ts`
- Modify: `web/src/core/api/index.ts`
- Modify: `web/src/core/api/index.test.ts`

**Interfaces:**
- Consumes: `apiClient` từ `web/src/shared/utils/api`
- Produces: `loginUser(payload: LoginPayload): Promise<{ user: SessionUser }>`, `logoutUser(): Promise<{ ok: boolean }>`

- [ ] **Step 1: Viết test thất bại cho `loginUser` và `logoutUser`**
  Thêm các bài test trong `web/src/core/api/index.test.ts` kiểm tra gọi `POST /api/login` với `{ email, password }` và `POST /api/logout`.

- [ ] **Step 2: Chạy test để xác nhận test thất bại**
  Chạy: `npm --prefix web test src/core/api/index.test.ts`
  Kỳ vọng: Lỗi "loginUser is not defined" hoặc "logoutUser is not defined".

- [ ] **Step 3: Triển khai mã nguồn `LoginPayload`, `loginUser`, `logoutUser`**
  Định nghĩa `LoginPayload` trong `types.ts`, thêm `loginUser` và `logoutUser` trong `index.ts`.

- [ ] **Step 4: Chạy test để xác nhận tất cả test pass**
  Chạy: `npm --prefix web test src/core/api/index.test.ts`
  Kỳ vọng: PASS toàn bộ.

- [ ] **Step 5: Commit task 1**
  Commit thay đổi: `feat(web/auth): add loginUser and logoutUser api methods`

---

### Task 2: Xây dựng màn hình đăng nhập 2 cột hiện đại `LoginView.tsx`

**Files:**
- Create: `web/src/core/features/auth/LoginView.tsx`
- Create: `web/src/core/features/auth/LoginView.test.tsx`

**Interfaces:**
- Consumes: `loginUser` từ `web/src/core/api`, ADS components (`Button`, `Textfield`, `SectionMessage`, v.v.)
- Produces: `<LoginView onLoginSuccess={...} />`

- [ ] **Step 1: Viết test cho `LoginView`**
  Tạo `LoginView.test.tsx` kiểm tra:
  - Render khối thương hiệu cột trái (logo T, tiêu đề "Mỗi đóng góp. Một câu chuyện chung.", danh sách avatar).
  - Render form đăng nhập cột phải (nút Microsoft HUST SSO trỏ `/auth/microsoft`, các ô input email/password, nút Đăng nhập).
  - Nhập thông tin và submit thành công -> kích hoạt `loginUser` và gọi callback `onLoginSuccess`.
  - Submit thất bại -> hiển thị thông báo lỗi từ server.

- [ ] **Step 2: Chạy test để xác nhận test thất bại**
  Chạy: `npm --prefix web test src/core/features/auth/LoginView.test.tsx`
  Kỳ vọng: FAIL vì component chưa tồn tại.

- [ ] **Step 3: Triển khai component `LoginView.tsx`**
  Xây dựng bố cục 2 cột hoàn chỉnh với gradient xanh sâu `#0f172a, #1e3a8a, #2563eb`, đường phân cách, hỗ trợ ngôn ngữ, tích hợp ADS `Form` hoặc stateful inputs, xử lý lỗi và loading state.

- [ ] **Step 4: Chạy test để xác nhận pass**
  Chạy: `npm --prefix web test src/core/features/auth/LoginView.test.tsx`
  Kỳ vọng: PASS toàn bộ.

- [ ] **Step 5: Commit task 2**
  Commit thay đổi: `feat(web/auth): implement 2-column ADS LoginView component`

---

### Task 3: Tích hợp Session Gating trong `main.tsx` và Đăng xuất trong `PageLayout.tsx`

**Files:**
- Modify: `web/src/shared/layouts/PageLayout.tsx`
- Modify: `web/src/core/main.tsx`
- Modify: `web/src/core/main.test.tsx`
- Modify: `web/src/shared/layouts/PageLayout.test.tsx`

**Interfaces:**
- Consumes: `fetchSession`, `logoutUser`, `LoginView`, `PageLayout`
- Produces: Ứng dụng tự động chuyển đổi giữa màn hình đăng nhập và giao diện hoạt động chính dựa trên phiên người dùng thực tế.

- [ ] **Step 1: Cập nhật test cho `main.test.tsx` và `PageLayout.test.tsx`**
  Kiểm tra:
  - Khi session không có người dùng (`user: null`), hiển thị `LoginView`.
  - Khi session có người dùng (`user: { name: 'Admin', ... }`), hiển thị `PageLayout` và `Dashboard`.
  - `PageLayout` hỗ trợ prop `session` và gọi `onLogout` khi người dùng nhấn nút đăng xuất.

- [ ] **Step 2: Chạy test để xác nhận test thất bại**
  Chạy: `npm --prefix web test src/core/main.test.tsx src/shared/layouts/PageLayout.test.tsx`
  Kỳ vọng: FAIL với các trường hợp chưa hỗ trợ.

- [ ] **Step 3: Cập nhật `PageLayout.tsx` và `main.tsx`**
  - Trong `PageLayout.tsx`: thêm hiển thị avatar với thông tin người dùng và nút đăng xuất.
  - Trong `main.tsx`: sử dụng `useQuery(['session'], fetchSession)`, hiển thị `LoginView` khi chưa xác thực, và cung cấp handler `onLoginSuccess` và `onLogout`.

- [ ] **Step 4: Chạy test để xác nhận pass**
  Chạy: `npm --prefix web test src/core/main.test.tsx src/shared/layouts/PageLayout.test.tsx`
  Kỳ vọng: PASS toàn bộ.

- [ ] **Step 5: Commit task 3**
  Commit thay đổi: `feat(web/auth): wire session gating and logout flow`

---

### Task 4: Đồng bộ tài liệu và Kiểm tra toàn diện

**Files:**
- Modify: `docs/planning/ke-hoach-hub-core-operations.md`
- Modify: `docs/specs/2026-10-07-frontend-migration.md`
- Modify: `docs/specs/2026-10-08-core-api-integration-design.md`
- Modify: `docs/specs/2026-10-08-core-api-integration-plan.md`

- [ ] **Step 1: Cập nhật version và lịch sử phiên bản trong các tài liệu liên quan**
  Tăng phiên bản MINOR và ghi nhận việc bổ sung màn hình đăng nhập và dọn dẹp các liên kết CTD sang giai đoạn sau.

- [ ] **Step 2: Chạy đánh chỉ mục tài liệu `npm run docs:index`**
  Cập nhật bản đồ tài liệu `docs/README.md`.

- [ ] **Step 3: Chạy toàn bộ test suite và docs:check**
  Chạy:
  - `npm --prefix web test`
  - `npm run docs:check -- --base staging`

- [ ] **Step 4: Commit task 4**
  Commit thay đổi: `docs(auth): record login ui design and update documentation index`

## Lịch sử phiên bản

| Version | Ngày | Thay đổi | Người |
|---|---|---|---|
| 1.0 | 2026-10-08 | Khởi tạo kế hoạch triển khai màn hình đăng nhập hiện đại và kiểm soát phiên. | DYC |
| 1.1 | 2026-10-08 | Bổ sung hiệu ứng Lottie loading cho ứng dụng và form đăng nhập (`loading.lottie`). | DYC |
| 1.2 | 2026-10-08 | Bổ sung nút chuyển đổi Sáng / Tối hoạt ảnh Lottie (`theme-toggle.json`). | DYC |
| 1.3 | 2026-10-08 | Thay thế logo Microsoft tĩnh bằng logo hoạt ảnh Microsoft Start Lottie (`microsoft-start.json`) trên nút SSO. | DYC |
| 1.4 | 2026-10-08 | Bổ sung tài khoản kiểm thử local (`admin@hust.edu.vn` / `123456`) cùng nút tiện ích Điền nhanh và cơ chế phục hồi đa tầng cho môi trường dev. | DYC |
| 1.5 | 2026-10-08 | Làm sạch dữ liệu kiểm thử local, gỡ bỏ khung tài khoản test trên giao diện và khôi phục mã nguồn backend nguyên bản chuẩn bị đẩy nhánh staging. | DYC |
| 1.6 | 2026-10-09 | Deprecated: thay bằng SPEC-WEB-003 và `docs/dev/frontend.md`; thu hẹp `related_code` về `[]`. | DYC |
