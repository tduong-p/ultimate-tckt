# Superpowers (bản vendored)

Các thư mục skill `brainstorming`, `writing-plans`, `executing-plans`, `subagent-driven-development`,
`test-driven-development`, `systematic-debugging`, `verification-before-completion`, `requesting-code-review`,
`receiving-code-review`, `using-git-worktrees`, `finishing-a-development-branch`, `dispatching-parallel-agents`,
`writing-skills`, `using-superpowers`, `diagnosing-superpowers` trong `.agents/skills/` là bản sao **nguyên vẹn**
của [obra/superpowers](https://github.com/obra/superpowers) **v6.4.1** (giấy phép MIT — xem `LICENSE`).

- Dành cho agent không cài được plugin (Codex/Antigravity/khác đọc `.agents/skills/`).
- Claude Code dùng plugin chính thức khai báo ở `.claude/settings.json`, không đọc thư mục này.
- **Không sửa file skill ở đây.** Quy tắc riêng của repo (vị trí spec/plan, frontmatter, ranh giới module…) nằm
  trong `AGENTS.md` và được ưu tiên hơn skill.
- Nâng version: chép lại nguyên các thư mục skill từ bản mới, cập nhật số version ở file này và trong `AGENTS.md`,
  mở PR (đây là thay đổi hợp đồng dùng chung — xem `docs/dev/ranh-gioi-module.md`).
