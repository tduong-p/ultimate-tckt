# CLAUDE.md

@AGENTS.md

Luật chung ở `AGENTS.md` (đã import ở trên) — đọc và tuân thủ toàn bộ. Riêng Claude Code:
- Superpowers là **bắt buộc**: plugin `superpowers@claude-plugins-official` được bật trong `.claude/settings.json`.
  Chưa có plugin → `/plugin install superpowers@claude-plugins-official`. Không dùng bản vendored trong `.agents/skills/`.
- Spec/plan theo quy trình superpowers lưu ở `docs/specs/` (không dùng `docs/superpowers/`), có frontmatter.
- Việc liên module → dừng và raise họp team theo `docs/dev/ranh-gioi-module.md`.
