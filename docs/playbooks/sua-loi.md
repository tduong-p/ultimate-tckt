---
doc_id: PB-FIX-001
title: Playbook — sửa lỗi
version: 1.0
status: active
audience: [dev, ai]
owner: DYC
updated: 2026-09-24
related_code: []
---

# Playbook — sửa lỗi

Tài liệu này giúp dev và AI agent hoàn tất việc sửa một lỗi đã xác định nguyên nhân (nếu chưa xác định, dùng [`debug.md`](debug.md) trước), theo đúng nguyên tắc "test tái hiện trước, sửa sau" của repo.

## Khi nào dùng

Khi đã biết chắc nguyên nhân của một lỗi (từ bug report, từ playbook debug, hoặc tự phát hiện khi đọc code) và cần sửa đúng cách, không gây hồi quy.

## Các bước

1. **Viết test tái hiện lỗi trước khi sửa** — test phải đỏ (fail) vì đúng lỗi đang sửa, không phải fail vì lý do khác. Core: thêm vào `core/tests/*.test.js` phù hợp, dùng fixture có sẵn (`core/tests/helpers/`). CTD: thêm vào `services/ctd-api/backend/tests/test_*.py`.
2. **Sửa nguyên nhân gốc**, không thêm điều kiện đặc cách cho riêng trường hợp bug report mà không tổng quát hoá được.
3. **Chạy lại test vừa viết** — phải chuyển xanh. Sau đó chạy toàn bộ bộ test của app bị ảnh hưởng để chắc không gây hồi quy:
   ```bash
   cd core && npm test
   cd services/ctd-api/backend && .venv/bin/pytest
   ```
4. **Thêm bài học vào `docs/ai/bay-da-gap.md`** nếu đây là loại lỗi có thể lặp lại ở chỗ khác trong code (không phải lỗi đánh máy một lần).
5. **Nếu lỗi ảnh hưởng dữ liệu đã sinh ra trên staging/production** (không chỉ logic code), cân nhắc có cần script sửa dữ liệu một lần hay không — không tự sửa DB bằng tay trên VM, xem `docs/dev/db-migration.md`.
6. **Mở PR vào `staging`**, mô tả rõ nguyên nhân gốc trong mô tả PR (không chỉ mô tả triệu chứng), kèm cập nhật tài liệu nếu có.

## Kiểm tra xong

- [ ] Test tái hiện lỗi tồn tại và đã chuyển từ đỏ sang xanh.
- [ ] Toàn bộ bộ test của app liên quan (`npm test` hoặc `pytest`) xanh, không chỉ test mới thêm.
- [ ] Đã cân nhắc và ghi rõ (trong PR) liệu dữ liệu đã sinh ra trên staging/production có cần sửa thêm không.
- [ ] `npm run docs:check` exit 0 nếu có sửa tài liệu.

## Tài liệu phải cập nhật

- `docs/ai/bay-da-gap.md` — bắt buộc xem xét, thêm dòng nếu là lỗi có thể lặp lại.
- Tài liệu nghiệp vụ/kỹ thuật mô tả sai hành vi (nếu lỗi bắt nguồn từ hiểu sai yêu cầu đã ghi trong tài liệu).

## Lịch sử phiên bản

| Version | Ngày | Thay đổi | Người |
|---|---|---|---|
| 1.0 | 2026-09-24 | Bản đầu (viết lại từ tài liệu cũ khi gộp monorepo) | DYC |
