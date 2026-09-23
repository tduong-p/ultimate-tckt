---
doc_id: PB-FEAT-001
title: Playbook — thêm tính năng
version: 1.0
status: active
audience: [dev, ai]
owner: DYC
updated: 2026-09-24
related_code: []
---

# Playbook — thêm tính năng

Tài liệu này giúp dev và AI agent thêm một tính năng mới (route/endpoint, luồng nghiệp vụ, màn hình) vào `core/` hoặc `services/ctd-api/` theo đúng quy trình của repo — không phải hướng dẫn kỹ thuật chi tiết (xem `docs/dev/`), mà là **trình tự các bước không được bỏ**.

## Khi nào dùng

Khi thêm một khả năng nghiệp vụ mới cho một module đã tồn tại (Core/Điều hành hoặc CTD) — ví dụ thêm một loại báo cáo, một trường dữ liệu, một hành động trên hồ sơ/task. Nếu tính năng cần một **module hoàn toàn mới** (dịch vụ riêng hoặc nhóm route lớn tách biệt), dùng [`them-module.md`](them-module.md) thay vì tài liệu này.

## Các bước

1. **Đọc tài liệu liên quan trước khi sửa code**: tìm mọi doc có `related_code` khớp phần sắp sửa (`docs/README.md`, hoặc grep `related_code` trong frontmatter các file `docs/dev/*.md`, `docs/ba/*.md`). Đọc `docs/ai/bat-bien.md` để biết ràng buộc không được phá.
2. **Xác nhận phạm vi dữ liệu (scope)**: nếu tính năng đọc/ghi dữ liệu liên đơn vị hoặc liên Tổ, phải đi qua `activityScope`/`scopeFor` (Core, `core/src/policies/access.js`) hoặc `visible_cases`/whitelist theo `transition_def.allowed_roles` (CTD) — không tự viết điều kiện quyền rải rác trong route.
3. **Viết test trước (TDD)** khi có thể — test đỏ trước, code sau. Core: `core/tests/*.test.js` (xem `docs/dev/test.md`). CTD: `services/ctd-api/backend/tests/test_*.py`.
4. **Đổi schema nếu cần** theo [`doi-schema.md`](doi-schema.md) — không sửa DB bằng tay.
5. **Cài đặt tính năng**: route/service ở Core (`core/src/routes/`, `core/src/services/`) hoặc router/service ở CTD (`app/api/`, `app/services/`). Nếu tính năng phát sinh sự kiện nghiệp vụ mới (thông báo), đăng ký vào Rule Engine — xem `docs/dev/email-cron.md`, không tự viết gửi mail rời rạc.
6. **Chạy test cục bộ đến khi xanh**:
   ```bash
   cd core && npm test
   cd services/ctd-api/backend && .venv/bin/pytest
   npm run test:tools
   ```
7. **Cập nhật tài liệu trong cùng PR** — xem mục dưới. Chạy `npm run docs:index && npm run docs:check`.
8. **Mở PR vào `staging`** (không push thẳng vào `main`). Điền mục "Tài liệu đã cập nhật" trong PR template; nếu thật sự không cần đổi tài liệu, gắn nhãn `no-docs-needed` kèm dòng "Docs: không cần vì …".

## Kiểm tra xong

- [ ] Test mới (đỏ trước khi sửa, xanh sau khi sửa) đã có trong `core/tests/` hoặc `services/ctd-api/backend/tests/`.
- [ ] `cd core && npm test` và `cd services/ctd-api/backend && .venv/bin/pytest` đều xanh.
- [ ] Không có điều kiện quyền viết tay ngoài `access.js`/`scopeFor`/whitelist CTD.
- [ ] `npm run docs:check` (từ thư mục gốc repo) exit 0.
- [ ] Nếu tính năng phát sinh sự kiện thông báo mới: đã đăng ký vào Rule Engine, không gọi mailer trực tiếp.

## Tài liệu phải cập nhật

- Doc BA tương ứng (`docs/ba/dieu-hanh-use-case.md` hoặc `docs/ba/ctd-use-case.md`) nếu luồng nghiệp vụ đổi.
- `docs/dev/api.md` nếu thêm/đổi endpoint.
- `docs/dev/kien-truc.md` nếu thêm thành phần kiến trúc mới.
- `docs/ai/bay-da-gap.md` nếu phát hiện một bẫy/hiểu lầm mới trong lúc làm.

## Lịch sử phiên bản

| Version | Ngày | Thay đổi | Người |
|---|---|---|---|
| 1.0 | 2026-09-24 | Bản đầu (viết lại từ tài liệu cũ khi gộp monorepo) | DYC |
