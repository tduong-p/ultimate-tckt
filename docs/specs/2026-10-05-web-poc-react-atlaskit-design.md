---
doc_id: SPEC-POC-001
title: Thiết kế — POC Frontend React + Atlaskit (Sub-project 1)
version: 1.0
status: active
audience: [dev, ai]
owner: DYC
updated: 2026-10-05
related_code: []
---

# Thiết kế — POC Frontend React + Atlaskit (Sub-project 1)

Dựa trên quyết định tại `ADR-0015-001`, tài liệu này mô tả thiết kế chi tiết cho Sub-project 1 của việc đập đi xây lại toàn bộ frontend sang React và Atlassian Design System. Sub-project 1 giới hạn trong việc khởi tạo kiến trúc đa ứng dụng (Multi-page app) và xây dựng màn hình thử nghiệm "My Tasks" của hệ Core.

## Kiến trúc & Tooling
- **Vị trí mã nguồn:** Toàn bộ mã nguồn POC đặt tại thư mục `cai-tien-frontend/` ở gốc repo.
- **Stack công nghệ:** React 18, TypeScript, Vite.
- **Mô hình triển khai (Multi-page app):**
  - Cấu hình `vite.config.ts` để xuất ra 2 entry độc lập: `core.html` (điểm vào của ứng dụng Core) và `ctd.html` (điểm vào của ứng dụng CTD).
  - Trình duyệt sẽ tải từng ứng dụng tách biệt, nhưng bên trong code, chúng chia sẻ chung một tập hợp thư viện UI và tiện ích.
- **Tích hợp CSS-in-JS:** Cấu hình plugin `@compiled/react` cho Vite để biên dịch style theo chuẩn của Atlassian.
- **Kết nối Backend (API):** Sử dụng tính năng Proxy của Vite (trong `vite.config.ts`) để forward mọi request `/api` về backend gốc (mặc định `http://localhost:3000`), giải quyết vấn đề CORS ở môi trường local.

## Quản lý Component & Giao diện (Atlassian Design System)
- **Thư viện chuẩn:**
  - Cài đặt `@atlaskit/css-reset` tại điểm vào cao nhất để đồng bộ hoá CSS mặc định.
  - Sử dụng `@atlaskit/tokens` để gọi các giá trị màu sắc, khoảng cách. Cấm tuyệt đối việc sử dụng mã hex hardcode (ví dụ `#FFFFFF`) trong component.
- **Tổ chức thư mục `src/`:**
  - `src/shared/`:
    - `components/`: Các UI component bọc lại từ Atlaskit (như Button, Modal).
    - `layouts/`: Chứa `PageLayout.tsx` thiết kế thanh điều hướng chuẩn chung.
    - `utils/`: Cấu hình Axios (`api.ts`) và các hàm helper.
  - `src/core/`: Điểm vào (`main.tsx`) và các màn hình (`features/`) của ứng dụng Core.
  - `src/ctd/`: Điểm vào (`main.tsx`) và các màn hình của ứng dụng CTD.

## Màn hình thử nghiệm: "My Tasks" (Core)
- **Vị trí:** `src/core/features/tasks/MyTasks.tsx`.
- **Quản lý trạng thái & Data Fetching:** Sử dụng `@tanstack/react-query` để lấy dữ liệu từ endpoint `/api/tasks/my-tasks` (hoặc endpoint tương đương hiện có của Core).
- **Thành phần UI (UI Components):**
  - `@atlaskit/dynamic-table`: Dùng để hiển thị bảng danh sách công việc (có phân trang, sắp xếp).
  - `@atlaskit/lozenge`: Hiển thị nhãn trạng thái công việc (Mới, Đang xử lý, Quá hạn).
  - `@atlaskit/spinner`: Hiển thị loading state.
  - `@atlaskit/flag`: Hiển thị thông báo (toast) khi thao tác lỗi hoặc thành công.
- **Error Handling:** 
  - Khởi tạo một ErrorBoundary ở cấp cao nhất của trang.
  - Trong trường hợp API lỗi (mất kết nối, HTTP 500), `react-query` trả về trạng thái `isError`, giao diện sẽ hiện empty state cảnh báo thay vì làm sập trang.

## Lịch sử phiên bản

| Version | Ngày | Thay đổi | Người |
|---|---|---|---|
| 1.0 | 2026-10-05 | Thiết kế ban đầu POC Frontend React + Atlaskit | DYC |

