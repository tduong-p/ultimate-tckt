---
doc_id: DEV-FE-001
title: Frontend
version: 1.0
status: active
audience: [dev, ai]
owner: DYC
updated: 2026-09-24
related_code: [core/public/**, services/ctd-api/frontend/src/**]
---

# Frontend

Repo có **hai frontend riêng biệt hiện tại**, cộng một frontend chung dự kiến (`web/`, chưa tạo — xem
`docs/dev/kien-truc.md`).

## Core — `core/public/` (JavaScript thuần, chỉ bảo trì)

Không có build step, không framework: `app.js` (logic chính, SPA điều hướng bằng tay), `index.html`,
`styles.css` + `components.css`, `settings.js` (trang Setting: SMTP/Templates/Rules/Cron, chỉ hiện với quyền
`devops`), `notifications.js` (push OneSignal). Core phục vụ trực tiếp thư mục này qua `express.static`
(`core/src/app.js`).

Đây là frontend **cũ**, không thêm tính năng mới vào đây — chỉ sửa lỗi hoặc theo kịp thay đổi API bắt buộc.
`core/tests/frontend.contract.test.js` kiểm hợp đồng giữa `app.js` và API — sửa API mà làm test này đỏ nghĩa là
đã phá tương thích ngược với frontend cũ.

## CTD — `services/ctd-api/frontend/` (React 18 + TypeScript + Vite)

Chia theo tính năng dưới `src/features/`: `auth/` (đăng nhập), `hoso/` (nộp/theo dõi hồ sơ — tối ưu mobile,
người dùng là sinh viên), `canbo/` (Inbox + xử lý hồ sơ — tối ưu desktop, mật độ thông tin cao cho xử lý hàng
loạt), `baocao/` (dashboard báo cáo). Dùng chung: `src/lib/api.ts` (gọi API, gắn JWT), `src/lib/auth.tsx` (context
đăng nhập), `src/components/ui.tsx`, `src/theme/tokens.ts`. Build ra `backend/static`, FastAPI phục vụ tĩnh
(không chạy Vite dev server ở production).

Nguyên tắc thiết kế của module CTD (từ bản thiết kế gốc): hồ sơ đi qua 4–5 cấp duyệt kéo dài nhiều tháng, người
dùng quan tâm nhất "hồ sơ đang ở đâu, ai đang giữ, còn thiếu gì" — màn hình sinh viên tối ưu cho **mobile**, màn
hình cán bộ tối ưu cho **mật độ thông tin trên desktop** vì họ xử lý hàng chục hồ sơ một lúc theo đợt. Mọi lần
"trả về" một cấp bắt buộc có lý do, và lý do đó phải hiển thị nổi bật ở phía người nhận.

## Design token dùng chung (tham khảo khi cần một hệ màu/typography nhất quán)

Bộ token phong cách "Notion-inspired" (nền giấy ấm, chữ gần đen, một màu xanh chủ đạo, điểm nhấn màu đa sắc cho
badge/sticker) từng được soạn cho hệ thống frontend production của Core: màu chủ đạo `primary #0075de`, nền
`canvas #ffffff` / `canvas-soft #f6f5f4`, chữ `ink #000000` / `ink-secondary #31302e`, bo góc từ `xs 4px` đến
`full 9999px`, spacing từ `xxs 4px` đến `xxl 32px`. Đây là token tham khảo cho hướng thiết kế, không phải file
cấu hình được import trực tiếp — khi cần dựng lại theme cho `web/` (frontend chung GĐ1), lấy cảm hứng từ bộ giá
trị này thay vì tạo từ đầu, nhưng kiểm lại độ tương phản/accessibility trước khi dùng.

## Nguyên tắc chung

- Giao diện 100% tiếng Việt (mọi frontend, mọi module).
- Mobile web bắt buộc với màn hình dành cho thành viên/sinh viên (người dùng cuối phổ thông); màn hình quản trị/
  cán bộ có thể ưu tiên desktop.
- Sửa `web/` khi được tạo: mỗi nhóm chỉ sửa `src/modules/<module>/` của mình; sửa `shell/` hoặc `ui/` dùng chung
  phải qua review của nhóm Core (xem `.kiro/specs/nen-tang-da-don-vi/design.md` §3).

## Lịch sử phiên bản

| Version | Ngày | Thay đổi | Người |
|---|---|---|---|
| 1.0 | 2026-09-24 | Bản đầu (viết lại từ tài liệu cũ khi gộp monorepo) | DYC |
