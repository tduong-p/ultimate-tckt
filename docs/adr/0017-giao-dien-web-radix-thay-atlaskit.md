---
doc_id: ADR-0017-001
title: Giao diện web mới bằng UI Kit thuần CSS (tokens) và Radix UI thay thế Atlaskit
version: 1.0
status: active
audience: [dev, ai, ops]
owner: DYC
updated: 2026-10-10
supersedes: 0016
related_code: [web/src/ui/**, web/src/core/**, web/src/shared/**, web/package.json]
---

# Giao diện web mới bằng UI Kit thuần CSS (tokens) và Radix UI thay thế Atlaskit

## Bối cảnh

- ADR-0016 quyết định chọn `web/` (React + Atlaskit) thay thế frontend cũ của Core. Tuy nhiên, trong quá trình phát triển và vận hành thực tế:
  - Atlaskit mang theo bundle size rất lớn (~2.2MB uncompressed, phụ thuộc ngầm vào hàng chục thư viện `@compiled/react`, Emotion, runtime CSS-in-JS).
  - Tốc độ render và trải nghiệm tương tác (đặc biệt là việc chỉnh sửa trực tiếp dạng Linear/inline edit, phím tắt điều hướng `j`/`k`, menu popover, tabs) bị giới hạn bởi độ trễ và sự phức tạp của hệ thống components Atlaskit.
  - Thiết kế đòi hỏi giao diện năng động, mật độ thông tin cao, trải nghiệm phím tắt và micro-interactions tinh gọn theo phong cách Linear.
- Đợt cải tiến giao diện web theo `docs/specs/2026-10-10-web-giao-dien-moi-spec.md` đã xây dựng bộ UI kit riêng tại `web/src/ui/`:
  - 10 thành phần hạt nhân: Button, Select, Tabs, Dialog, Menu, Toast, Avatar, Badge, PriorityIcon, StatusIcon, EditBar.
  - Sử dụng CSS variables thuần `--ui-*` (`web/src/ui/tokens.css`, `web/src/ui/ui.css`), hỗ trợ chuyển theme Sáng / Tối thông qua `data-theme`.
  - Sử dụng Radix UI primitives không style (`@radix-ui/react-dialog`, `@radix-ui/react-popover`, `@radix-ui/react-tabs`) đảm bảo chuẩn tiếp cận WCAG 2.2 và phím tắt/focus management.

## Quyết định

1. **Thay thế Atlaskit trong toàn bộ module Core (`web/src/core/`) và Shared (`web/src/shared/`)**:
   - Sử dụng UI kit nội bộ tại `web/src/ui/` cùng các layout mới (`Shell`, `Sidebar`, `FormDialog`, `ConfirmDialog`).
   - Xoá `AppProvider` và `@atlaskit/css-reset` khỏi entrypoint chính của Core (`web/src/core/main.tsx`).
   - Mọi form và điều khiển dùng thẻ HTML tiêu chuẩn kèm lớp CSS `ui-*` và biến màu `--ui-*`.
2. **Ngoại lệ tạm thời cho module Công tác Đảng (`web/src/ctd/`)**:
   - Module `ctd` vẫn đang dùng một số component của `@atlaskit/*` (`CtdLayout`, `InboxView`, `CtdDashboardView`...). Module này nằm ngoài phạm vi tái cấu trúc giao diện lần này.
   - Do đó, các gói `@atlaskit/*` phục vụ riêng cho `ctd` được giữ lại trong `web/package.json` và sẽ được chuyển đổi sang UI kit ở đợt nâng cấp sau của `ctd`.
3. **Giữ nguyên hợp đồng URL và backend**:
   - Duy trì HashRouter tương thích hoàn toàn với các bookmark và đường dẫn hash cũ (`#activity/:id`, `#board/:id`, `#team/:id`...).
   - Giữ nguyên toàn bộ chuỗi tiếng Việt, API contracts, query keys và ma trận phân quyền.

## Hệ quả

- Giao diện Core tải nhanh hơn rõ rệt, giảm đáng kể phụ thuộc CSS-in-JS runtime, kiểm soát hoàn toàn CSS và theme qua token `--ui-*`.
- Hỗ trợ đầy đủ phím tắt (`j`/`k`, `Enter`, `Escape`, `f`, `m`, `c`, `?`) và inline edit mượt mà.
- Toàn bộ 119 file test của `web/` (843 tests) đều xanh và độc lập với Atlaskit.
- Kỹ sư phát triển frontend Core sẽ dùng `web/src/ui/` làm chuẩn component thay vì cài thêm UI library ngoài.

## Lịch sử phiên bản

| Version | Ngày | Thay đổi | Người |
|---|---|---|---|
| 1.0 | 2026-10-10 | Bản đầu: UI Kit thuần CSS (tokens) + Radix UI thay thế Atlaskit trong Core; giữ ngoại lệ ctd | DYC |
