# AGENTS.md — luật làm việc cho mọi AI agent và dev

File này là **luật chung, duy nhất** cho mọi AI agent (Claude Code, Codex, Antigravity, Gemini, Cursor…) và dev.
`CLAUDE.md` và `GEMINI.md` chỉ trỏ về đây. Luật ở đây ưu tiên hơn skill và thói quen mặc định của agent.

Repo `ultimate-tckt`: nền tảng đa đơn vị Đoàn Đại học — `core/` (Node/MySQL, Core + module Điều hành),
`services/ctd-api/` (FastAPI/Postgres, module Công tác Đảng), `web/` (frontend chung, sắp có),
`infra/` (compose, nginx, script VM), `docs/` (tài liệu có version).

## 1. Bắt buộc dùng Superpowers

Mọi việc (tính năng, sửa lỗi, refactor, tài liệu lớn) đều đi theo quy trình **Superpowers v6.4.1**:
brainstorming → writing-plans → subagent-driven-development / executing-plans → test-driven-development →
verification-before-completion → requesting-code-review → finishing-a-development-branch.
Gặp lỗi → systematic-debugging trước khi sửa.

Cài theo agent:
- **Claude Code**: plugin `superpowers@claude-plugins-official` đã khai báo trong `.claude/settings.json` —
  chấp nhận khi được hỏi, hoặc chạy `/plugin install superpowers@claude-plugins-official`.
- **Antigravity**: `agy plugin install https://github.com/obra/superpowers`.
- **Codex** (app/CLI): cài plugin Superpowers từ marketplace (`/plugins` → tìm `superpowers`).
- **Agent không cài được plugin**: bản vendored ở `.agents/skills/` (xem `.agents/skills/_superpowers/README.md`).
  Trước mọi việc, đọc `.agents/skills/using-superpowers/SKILL.md` và file tool-mapping của agent mình trong
  `.agents/skills/using-superpowers/references/`, rồi đọc skill phù hợp trước khi làm.

Quy tắc riêng của repo đè lên skill:
- Spec và plan lưu ở `docs/specs/` (**không** dùng `docs/superpowers/`), có frontmatter như mọi tài liệu khác,
  chạy `npm run docs:index` sau khi thêm.
- Workspace tạm của skill (`.superpowers/`) đã được git-ignore — không commit.
- Chọn model rẻ nhất đủ sức cho từng subagent; review cuối cả nhánh dùng model mạnh nhất.

## 2. Trước khi làm bất cứ việc gì

1. Đọc `docs/README.md` (bản đồ tài liệu) và toàn bộ `docs/ai/` (bất biến, bẫy đã gặp, cách kiểm tra, tìm ở đâu).
2. Xác định việc thuộc **module nào** theo `docs/dev/ranh-gioi-module.md`.
3. Tìm tài liệu có `related_code` trùng phần code sắp sửa; đọc chúng trước khi sửa.
4. Có tình huống quen thuộc (thêm tính năng, debug, hotfix, đổi schema, đổi quyền…) → làm theo `docs/playbooks/`.

## 3. Phạm vi: một module thì làm luôn, liên module thì raise họp team

- Việc chỉ nằm trong **một module** và không đổi **hợp đồng dùng chung** → làm luôn.
- Việc chạm **module khác**, hoặc đổi hợp đồng dùng chung (schema/migration, auth/session/đơn vị/role, dạng
  `/api/session`, field/mã lỗi API mà nơi khác đang dùng, env, infra/CI, dependency dùng chung, test helper dùng
  chung, bất biến, ADR, luật trong file này) → **dừng, không code phần đó**. Soạn issue theo mẫu
  `.github/ISSUE_TEMPLATE/cross-module.md` và báo người dùng/trưởng module để đưa ra **họp team**.
  Chỉ làm sau khi quyết định được ghi trong issue.
- Không chắc → coi là liên module và hỏi. Không tự mở rộng phạm vi "cho xong".
- Chi tiết bảng module và danh sách hợp đồng: `docs/dev/ranh-gioi-module.md`.

## 4. Luật tài liệu (bắt buộc, CI chặn merge nếu thiếu)

Mục tiêu: **một chuyện chỉ có một tài liệu, và tài liệu luôn đúng với code** — để người và agent sau không bị
lẫn lộn giữa bản cũ và bản mới.

1. Mọi thay đổi code/cấu hình/hạ tầng phải cập nhật tài liệu liên quan **trong cùng PR**.
2. Sửa nội dung một tài liệu → tăng `version` (MAJOR: người đọc bản cũ sẽ làm sai; MINOR: bổ sung/làm rõ),
   đặt `updated` = ngày hôm nay, thêm một dòng vào `## Lịch sử phiên bản`.
3. Thêm/xoá/đổi tên tài liệu → chạy `npm run docs:index`. Không sửa tay `docs/README.md`.
4. Quyết định kiến trúc mới → thêm `docs/adr/NNNN-<slug>.md`. Không sửa ADR cũ; thay bằng ADR mới có `supersedes`.
5. Không tạo tài liệu ngoài cấu trúc trong `docs/README.md`. Không để hai tài liệu mô tả cùng một chuyện —
   tài liệu lỗi thời thì sửa hoặc xoá, không viết bản song song. Không tạo file ghi chú rời (`NOTES.md`,
   `TODO.md`, `*_SUMMARY.md`…) ở gốc repo hay trong thư mục code.
6. Frontmatter phẳng, `related_code` chỉ trỏ tới glob có thật; link nội bộ phải trỏ tới file tồn tại.
7. Thật sự không cần sửa tài liệu → nhãn PR `no-docs-needed` + dòng `Docs: không cần vì …` trong mô tả PR.
8. Trước khi báo xong: `npm run docs:index && npm run docs:check -- --base origin/staging` phải xanh.

## 5. Không bao giờ

- Phá bất biến trong `docs/ai/bat-bien.md`.
- Ghi secret, mật khẩu, token, giá trị `.env` vào repo, tài liệu, log hay mô tả PR.
- Push thẳng lên `main`. Luồng: nhánh tính năng → PR vào `staging` → PR `staging → main`.
- Sửa file trong `docs/ba/nguon/` (bản gốc của stakeholder, chỉ đọc) hoặc sửa skill vendored trong `.agents/skills/`.
- Xoá dữ liệu/volume/stack trên VM khi không được giao rõ ràng.

## 6. Trước khi push

    cd core && npm test
    cd services/ctd-api/backend && .venv/bin/pytest
    npm run test:tools && npm run docs:check -- --base origin/staging

## 7. Sau khi xong một việc

- Có bẫy mới gặp → thêm vào `docs/ai/bay-da-gap.md`.
- Tình huống chưa có playbook → viết playbook mới trong `docs/playbooks/`.

---
Phiên bản luật: 2.0 (2026-09-24) — thêm bắt buộc Superpowers, quy tắc module/liên module, siết luật tài liệu.
Đổi file này là thay đổi hợp đồng dùng chung (raise họp team).
