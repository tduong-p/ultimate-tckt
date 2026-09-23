# AGENTS.md — luật làm việc cho mọi AI agent và dev

Repo `ultimate-tckt`: nền tảng đa đơn vị Đoàn Đại học — `core/` (Node/MySQL, Core + module Điều hành),
`services/ctd-api/` (FastAPI/Postgres, module Công tác Đảng), `web/` (frontend chung, sắp có),
`infra/` (compose, nginx, script VM), `docs/` (tài liệu có version).

## Trước khi làm bất cứ việc gì
1. Đọc `docs/README.md` (bản đồ tài liệu) và toàn bộ `docs/ai/`.
2. Tìm tài liệu có `related_code` trùng phần code sắp sửa; đọc chúng trước khi sửa.
3. Có tình huống quen thuộc (thêm tính năng, debug, hotfix, đổi schema…) → làm theo `docs/playbooks/`.

## Khi thay đổi (bắt buộc, CI chặn merge nếu thiếu)
1. Mọi thay đổi code/cấu hình/hạ tầng phải cập nhật tài liệu liên quan **trong cùng PR**.
2. Sửa nội dung một tài liệu → tăng `version` (MAJOR: người đọc bản cũ sẽ làm sai; MINOR: bổ sung/làm rõ),
   đặt `updated` = ngày hôm nay, thêm một dòng vào `## Lịch sử phiên bản`.
3. Thêm/xoá/đổi tên tài liệu → chạy `npm run docs:index`.
4. Quyết định kiến trúc mới → thêm `docs/adr/NNNN-<slug>.md`. Không sửa ADR cũ; thay thế bằng ADR mới có `supersedes`.
5. Không tạo tài liệu ngoài cấu trúc trong `docs/README.md`. Không để hai tài liệu mô tả cùng một chuyện.
6. Thật sự không cần sửa tài liệu → nhãn PR `no-docs-needed` + dòng `Docs: không cần vì …` trong mô tả PR.

## Không bao giờ
- Phá bất biến trong `docs/ai/bat-bien.md`.
- Ghi secret, mật khẩu, token vào repo hoặc tài liệu.
- Push thẳng lên `main`. Luồng: `staging` → PR → `main`.
- Sửa file trong `docs/ba/nguon/` (bản gốc của stakeholder, chỉ đọc).

## Trước khi push
    cd core && npm test
    cd services/ctd-api/backend && pytest
    npm run test:tools && npm run docs:check -- --base origin/staging

## Sau khi xong một việc
- Có bẫy mới gặp → thêm vào `docs/ai/bay-da-gap.md`.
- Tình huống chưa có playbook → viết playbook mới trong `docs/playbooks/`.
