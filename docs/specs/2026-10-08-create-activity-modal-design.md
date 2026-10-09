---
doc_id: SPEC-ACTMODAL-001
title: Thiết kế — Create Activity Modal UI Design
version: 1.5
status: active
audience: [dev, ai]
owner: DYC
updated: 2026-10-09
related_code: [web/src/core/features/dashboard/CreateActivityModal.tsx]
---

# Create Activity Modal UI Design

## 1. Overview
The "Đề xuất hoạt động" (Propose Activity) modal allows users to create a new activity directly from the Dashboard. It is an overlay dialog that presents a comprehensive form capturing the activity's details.

## 2. Layout & Structure
The modal uses the standard Atlassian ModalDialog component.

### Header
- Title: "Đề xuất hoạt động" (Large, bold)
- Subtitle: "ĐỀ XUẤT MỚI" (small, all-caps, blue above the title)
- Description: "Chọn Tổ chủ trì và tất cả các Tổ phối hợp tham gia."

### Form Fields (2-column layout where applicable)
- **Tiêu đề** (Full width textfield, placeholder "ví dụ: Ngày hội Kỹ thuật")
- **Loại hoạt động** (Half width select, default "Sự kiện do đơn vị đề xuất")
- **Tổ chủ trì** (Half width select, placeholder "Chọn một Tổ", bắt buộc). Người có `capabilities.canCreateAccount` (admin/vice_admin) thấy mọi Tổ; người khác chỉ thấy Tổ có `can_manage` (backend kiểm `leadsTeam` cho mọi Tổ gửi lên). Không có Tổ nào → "Không có Tổ nào bạn được phép đề xuất".
- **Các Tổ tham gia** (Full width container with checkbox: "Phát triển Đảng và Chuyển đổi số")
- **Ngày bắt đầu** (Half width date input)
- **Hạn chung** (Half width date input, bắt buộc). Ngày bắt đầu phải ≤ hạn chung.

### Lỗi và trạng thái
- Lỗi máy chủ hiện trong khối `role="alert"`; các câu tiếng Anh đã biết của Core được dịch sang tiếng Việt, câu lạ hiện nguyên văn.
- Đóng modal thì xoá lỗi validate và lỗi mutation; mở lại là form trống.
- **Mức ưu tiên** (Half width select, default "trung bình")
- **Địa điểm** (Half width textfield, placeholder "Không bắt buộc")
- **Được yêu cầu bởi** (Full width textfield, placeholder "Dành cho công việc do lãnh đạo giao")
- **Hồ sơ hoạt động** (Full width textfield, placeholder "Liên kết hồ sơ hoạt động (không bắt buộc)")
- **Visibility Toggle** (Checkbox: "Show this activity on the public landing page")
- **Public image URL (optional)** (Full width textfield, placeholder "https://example.com/activity.jpg")
- **Mô tả** (Full width textarea, placeholder "Hoạt động hướng đến mục tiêu gì?")

### Footer
- Primary Button: "Tạo đề xuất" (Full width, blue)

## 3. Interactions
- Clicking "+ Đề xuất hoạt động" on the Dashboard opens the modal.
- Clicking the close (X) icon or clicking outside the modal closes it.
- Nhấn "Tạo đề xuất" gọi API tạo hoạt động; thành công đóng modal và gọi `onCreated(id)` để mở trang chi tiết.

Cập nhật 2026-10-09 (đợt 1 SPEC-WEB-003): Form thêm Trưởng BTC; các link chỉ nhận `http(s)`; tạo thành công gọi `onCreated(id)` để chuyển tới `#/activity/:id`.

## Lịch sử phiên bản
| Version | Ngày | Thay đổi | Người |
|---|---|---|---|
| 1.0 | 2026-10-08 | Khởi tạo tài liệu thiết kế modal Đề xuất hoạt động | DYC |
| 1.1 | 2026-10-08 | Tích hợp mutation tạo hoạt động với API POST /api/activities | DYC |
| 1.2 | 2026-10-08 | Bắt buộc tiêu đề, mô tả, hạn chung và Tổ chủ trì (không còn mặc định Tổ 1); bỏ trường Người phụ trách | DYC |
| 1.3 | 2026-10-09 | Danh sách Tổ theo quyền (executive thấy mọi Tổ, Tổ trưởng/Tổ phó chỉ Tổ có `can_manage`); kiểm ngày bắt đầu ≤ hạn chung; lỗi máy chủ dịch sang tiếng Việt; reset khi mở lại; nền theo token | DYC |
| 1.4 | 2026-10-09 | Thu hẹp `related_code` về các tệp thực sự do tài liệu này mô tả; SPEC-WEB-003 mở rộng (tài liệu vẫn active) | DYC |
| 1.5 | 2026-10-09 | Đợt 1 SPEC-WEB-003: thêm Trưởng BTC, kiểm link và chuyển tới chi tiết sau khi tạo | DYC |
