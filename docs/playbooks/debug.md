---
doc_id: PB-DBG-001
title: Playbook — debug
version: 1.0
status: active
audience: [dev, ai]
owner: DYC
updated: 2026-09-24
related_code: []
---

# Playbook — debug

Tài liệu này giúp dev và AI agent tìm nguyên nhân gốc của một lỗi/hành vi sai một cách có hệ thống, thay vì sửa mò — áp dụng cho cả `core/` (Node) và `services/ctd-api/` (FastAPI).

## Khi nào dùng

Khi gặp hành vi không đúng kỳ vọng (lỗi hiển thị, response sai, exception, hành vi khác giữa local và staging/production) và chưa rõ nguyên nhân nằm ở đâu. Nếu đã biết chắc nguyên nhân và chỉ cần sửa, dùng thẳng [`sua-loi.md`](sua-loi.md).

## Các bước

1. **Tái hiện lỗi ở local trước.** Không debug trực tiếp trên staging/production nếu tái hiện được ở local — xem `docs/dev/chay-local.md` để dựng môi trường.
2. **Kiểm `docs/ai/bay-da-gap.md` trước khi đoán mò** — nhiều lỗi lặp lại (lệch múi giờ UTC/local, task `cancelled` lọt vào thống kê…) đã có bài học ghi sẵn.
3. **Viết một test tái hiện lỗi** (đỏ) trước khi sửa bất cứ dòng nào — xem `docs/dev/test.md`. Nếu lỗi khó viết test tự động (giao diện, luồng SSO thật), ghi lại bước tay tái hiện được trong PR.
4. **Đọc log đúng chỗ:**
   - Local: log console của `npm run dev` (core) hoặc `uvicorn --reload` (ctd-api).
   - Staging/production: `ut_compose <env> logs -f core` hoặc `ut_compose <env> logs -f ctd-api` trên VM (xem `docs/ops/su-co.md`).
5. **Thu hẹp phạm vi**: xác định lỗi ở tầng nào — route/handler, service/logic thuần (`access.js`, `app/services/`), hay tầng DB/migration. Với lỗi liên quan phân quyền, đối chiếu với `docs/dev/phan-quyen.md` trước khi sửa logic.
6. **Sửa nguyên nhân gốc**, không vá triệu chứng (ví dụ: không try/catch nuốt lỗi để "hết đỏ test" mà không hiểu vì sao lỗi).
7. Sau khi sửa, chuyển sang quy trình [`sua-loi.md`](sua-loi.md) để hoàn tất (cập nhật `bay-da-gap.md`, chạy đủ bộ test).

## Kiểm tra xong

- [ ] Có test tái hiện được lỗi, và test đó chuyển từ đỏ sang xanh sau khi sửa.
- [ ] Đã xác định và ghi lại nguyên nhân gốc (không chỉ "thêm điều kiện cho qua").
- [ ] Đã kiểm `docs/ai/bay-da-gap.md` xem lỗi có từng gặp trước đó không.
- [ ] `cd core && npm test` hoặc `.venv/bin/pytest` (tuỳ app liên quan) xanh toàn bộ, không chỉ test mới.

## Tài liệu phải cập nhật

- `docs/ai/bay-da-gap.md` — thêm bài học nếu đây là lỗi/hiểu lầm có thể lặp lại ở chỗ khác.
- Tài liệu nghiệp vụ/kỹ thuật liên quan nếu debug phát hiện tài liệu cũ mô tả sai hành vi thật của hệ thống.

## Lịch sử phiên bản

| Version | Ngày | Thay đổi | Người |
|---|---|---|---|
| 1.0 | 2026-09-24 | Bản đầu (viết lại từ tài liệu cũ khi gộp monorepo) | DYC |
