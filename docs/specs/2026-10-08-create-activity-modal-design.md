---
title: "Create Activity Modal UI Design"
version: 1.0.0
updated: 2026-10-08
related_code:
  - "web/src/core/features/dashboard/CreateActivityModal.tsx"
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
- **Tổ chủ trì** (Half width select, placeholder "Chọn một Tổ")
- **Các Tổ tham gia** (Full width container with checkbox: "Phát triển Đảng và Chuyển đổi số")
- **Trưởng Ban Tổ Chức (không bắt buộc)** (Full width select, default "Không chọn (phân công theo Ban chủ trì)")
- **Ngày bắt đầu** (Half width date input)
- **Hạn chung** (Half width date input)
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
- Clicking "Tạo đề xuất" currently closes the modal (as this is a static UI).
