---
doc_id: SPEC-CTD-UI-001
title: Thiết kế — Giao diện Công tác Đảng (CTD) theo Atlassian Design System
version: 1.0
status: active
audience: [dev, ai]
owner: DYC
updated: 2026-10-08
related_code: [web/src/ctd/**, web/ctd.html]
---

# Thiết kế — Giao diện Công tác Đảng (CTD) theo Atlassian Design System

## 1. Tổng quan & Mục tiêu
Chuyển đổi và tích hợp giao diện module **Công tác Đảng (CTD)** sang nền tảng chung tại `web/` (`web/src/ctd/` và entry `web/ctd.html`), áp dụng thống nhất **Atlassian Design System (ADS)** với CSS reset, Design Tokens (`@atlaskit/tokens`), components chuẩn (`@atlaskit/dynamic-table`, `@atlaskit/lozenge`, `@atlaskit/button`, `@atlaskit/tabs`, v.v.).

Hệ thống hỗ trợ 2 nhóm đối tượng chính theo use case chuẩn của CTD (`docs/ba/ctd-use-case.md`):
1. **Cán bộ** (`can_bo_don_vi`, `tckt`, `vp_doan`, `chi_bo`, `quan_tri`): Hộp xử lý hồ sơ (C1), Chi tiết hồ sơ & thẩm định giấy tờ (C2), Toàn cảnh đợt xét & thống kê báo cáo (C6).
2. **Sinh viên** (`sinh_vien`): Trạng thái hồ sơ cá nhân (S2), Nộp và bổ sung hồ sơ kết nạp / chuyển chính thức (S3).

---

## 2. Kiến trúc & Điều hướng

### 2.1 Điểm vào ứng dụng
- **Vị trí entry:** `web/ctd.html` tải `web/src/ctd/main.tsx`.
- **Cấu hình Vite:** Thêm entry `ctd: resolve(__dirname, 'ctd.html')` vào `rollupOptions.input` trong `web/vite.config.ts`.
- **Chuyển đổi phân hệ:** Top navigation của cả hai phân hệ (Core và CTD) hỗ trợ chuyển đổi linh hoạt qua nút phân hệ (AppSwitcher) hoặc liên kết trực tiếp giữa `/core.html` và `/ctd.html`.

### 2.2 Layout chuẩn (`CtdLayout.tsx`)
- Tận dụng `@atlaskit/page-layout` gồm:
  - `TopNavigation`: Logo CTD, chuyển vai trò thử nghiệm (Role Switcher: Cán bộ / Sinh viên), nút chế độ sáng/tối (theme), avatar người dùng.
  - `LeftSidebar`:
    - Nhóm Cán bộ: "Hộp xử lý hồ sơ" (Inbox), "Toàn cảnh đợt xét" (Dashboard), "Thẩm định hồ sơ" (Review).
    - Nhóm Sinh viên: "Hồ sơ của tôi" (My Case), "Nộp hồ sơ Đảng" (Submit).
    - Liên kết chân trang: Chuyển sang "Hệ thống Điều hành TCKT".
  - `Main`: Vùng hiển thị nội dung chính với token khoảng cách chuẩn.

---

## 3. Chi tiết các màn hình tính năng

### 3.1 C1 — Hộp xử lý hồ sơ (`InboxView.tsx`)
- **4 Thẻ KPI:**
  - Tổng số hồ sơ trong đợt.
  - Đang chờ xử lý.
  - Quá hạn SLA (cảnh báo đỏ/cam).
  - Thời gian xử lý trung bình.
- **Thanh công cụ lọc & tìm kiếm:**
  - Ô tìm kiếm theo tên hoặc MSSV.
  - Bộ lọc trạng thái: Tất cả, Chờ tiếp nhận (`dt_checking`), Đang kiểm tra (`tckt_checking` / `vp_checking`), Cần bổ sung (`need_supplement`), Đủ điều kiện (`eligible`), Hoàn tất (`forwarded`).
- **Bảng dữ liệu hồ sơ (`DynamicTable`):**
  - Cột: Ứng viên (Họ tên, MSSV, Avatar), Đơn vị (Khoa/LCĐ), Loại hồ sơ (Kết nạp / Chuyển chính thức), Giấy tờ (x/y hợp lệ), Trạng thái (Lozenge màu tương ứng), Thời gian xử lý (Số ngày / SLA), Thao tác ("Xem & Thẩm định").

### 3.2 C2 — Chi tiết hồ sơ & Thẩm định giấy tờ (`ReviewCaseView.tsx`)
- **Thông tin tóm tắt ứng viên:** Card hiển thị Họ tên, MSSV, Chi đoàn, Khoá, Ngày sinh.
- **Tiến trình quy trình Đảng (Process Stepper):**
  - 5 bước: Sinh viên nộp -> ĐT/LCĐ kiểm tra -> TCKT kiểm tra -> Họp xét cấp đơn vị -> VP Đoàn rà soát & Chuyển Chi bộ.
- **Danh mục giấy tờ hồ sơ (`danh-muc-giay-to-ctd.md`):**
  - Bảng danh mục giấy tờ (Đơn xin vào Đảng, Lý lịch, Chứng nhận lớp bồi dưỡng, Bảng điểm...).
  - Trạng thái từng giấy tờ: Đạt, Cần bổ sung, Chưa kiểm tra, Không áp dụng.
  - Hành động cho cán bộ: Đánh dấu Đạt / Bổ sung (kèm lý do) / Không áp dụng.
- **Thanh hành động chuyển trạng thái (Workflow Actions):**
  - Tính năng tương ứng role: Thông qua gửi bước tiếp theo, Yêu cầu bổ sung, Không thông qua, Huỷ hồ sơ.

### 3.3 C6 — Toàn cảnh đợt xét & Báo cáo (`CtdDashboardView.tsx`)
- **Chỉ số tổng thể:** Tỷ lệ thông qua, số lượng hồ sơ theo từng đơn vị.
- **Phân bổ tiến độ (Stage Distribution):** Thanh tỷ lệ phân bố hồ sơ theo 5 khối trạng thái chính với token màu rõ ràng.
- **Backlog quá hạn:** Bảng danh sách các hồ sơ đang nằm quá thời gian quy định (SLA) cần đôn đốc.
- **Xuất báo cáo:** Nút xuất dữ liệu đợt xét.

### 3.4 S2 & S3 — Phân hệ Sinh viên (`StudentCaseView.tsx`)
- **S2 — Theo dõi trạng thái:** Sinh viên xem hồ sơ của mình đang ở bước nào, các giấy tờ cần bổ sung kèm phản hồi từ cán bộ kiểm tra.
- **S3 — Nộp & cập nhật giấy tờ:** Form tải lên các tệp tài liệu còn thiếu hoặc nộp hồ sơ mới.

---

## Lịch sử phiên bản
- 1.0 (2026-10-08): Khởi tạo tài liệu thiết kế giao diện CTD theo Atlassian Design System.
