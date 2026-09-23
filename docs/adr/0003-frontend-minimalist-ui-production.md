---
doc_id: ADR-0003-001
title: Hệ thống frontend sản xuất — minimalist UI cho toàn bộ Hub
version: 1.0
status: active
audience: [dev, ai]
owner: DYC
updated: 2026-09-24
related_code: [core/public/**]
---

# Hệ thống frontend sản xuất — minimalist UI cho toàn bộ Hub

Ghi lại quyết định ngôn ngữ thiết kế cho toàn bộ frontend Hub, mở rộng từ
dashboard sang mọi màn hình, mà không đổi stack.

## Bối cảnh

Dashboard chính đã được thiết kế lại (18/09/2026) theo protocol
"Premium Utilitarian Minimalism": nền đơn sắc ấm, bento surface viền
`1px solid #EAEAEA`, font Newsreader (tiêu đề) + Plus Jakarta Sans (nội dung) +
JetBrains Mono (số liệu/metadata), icon Phosphor Bold thay toàn bộ emoji, accent
pastel nhạt. Cùng ngày, một spec riêng ("Production Frontend System") yêu cầu
đưa toàn bộ các route còn lại (đăng nhập, Kanban, Teams, Documents, Reports…)
lên cùng mức hoàn thiện, giữ nguyên dashboard làm chuẩn thị giác.

## Quyết định

Áp dụng ngôn ngữ thiết kế trên cho toàn bộ `public/`, không di chuyển sang
framework hay thêm runtime dependency: `index.html` giữ shell + landmark,
`styles.css` giữ token/typography/reset, `components.css` giữ style
component/route dùng chung, `app.js`/`notifications.js` giữ hành vi + primitive
render. Phosphor là hệ icon duy nhất; cấm emoji trong UI sản phẩm. Motion tối
giản, có fallback `prefers-reduced-motion`.

## Hệ quả

- Mọi màn hình mới phải dùng token/typography có sẵn trong `styles.css`,
  không tự chọn font/màu khác.
- Không thêm framework frontend (React, Vue…) vào `core/public/`; `web/`
  (frontend đa đơn vị tương lai) là dự án tách biệt, xem D6/D7 (`SPEC-UNIT-002`).

## Lịch sử phiên bản

| Version | Ngày | Thay đổi | Người |
|---|---|---|---|
| 1.0 | 2026-09-24 | Bản đầu, nguồn: `legacy/hub/docs/superpowers/specs/2026-09-18-minimalist-ui-dashboard-design.md` và `2026-09-18-production-frontend-system-design.md` (repo cũ `tckt-activity-hub`) | DYC |
