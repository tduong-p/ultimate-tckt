---
doc_id: ADR-0012-001
title: Hệ thống tài liệu Markdown có version, kiểm bằng CI
version: 1.0
status: active
audience: [dev, ai]
owner: DYC
updated: 2026-09-24
related_code: [docs/**, tools/docs-check/**, .github/workflows/docs.yml]
---

# Hệ thống tài liệu Markdown có version, kiểm bằng CI

Ghi lại quyết định chọn Markdown làm bản gốc duy nhất cho toàn bộ tài liệu dự
án, thay vì rải rác docx/pdf không version.

## Bối cảnh

Tài liệu cũ nằm rải rác ở nhiều repo dưới dạng docx/pdf/md không nhất quán,
không version, không có cơ chế bắt buộc cập nhật khi code đổi — dễ lỗi thời
mà không ai biết. Việc gộp monorepo (ADR-0009) là dịp để dựng lại toàn bộ.

## Quyết định

Markdown là bản gốc duy nhất trong `docs/`; Word/PDF do CI tự xuất
(`tools/docs-export/export.sh`), không chỉnh tay file xuất ra. Mỗi file có
`version` riêng trong frontmatter; cả bộ tài liệu có tag `docs-vYYYY.MM.N` khi
merge vào `main`. CI (`docs.yml`, job `docs`) chặn merge khi tài liệu liên quan
đến code đã đổi (`related_code` glob) mà không được cập nhật, trừ khi gắn nhãn
`no-docs-needed`. Mỗi file có `doc_id` duy nhất theo quy tắc
`^[A-Z]+-[A-Z0-9]+-\d{3}$`, `audience`, `owner`, `status`.

## Hệ quả

- Mọi PR đổi code có `related_code` khớp glob của một tài liệu mà không sửa
  tài liệu đó sẽ bị `docs:check` chặn, trừ khi có nhãn `no-docs-needed`.
- Tài liệu cũ (docx/pdf/md rải rác ở các repo cũ, `docs/superpowers/**`,
  `docs/legacy/**`) không còn hiệu lực; nội dung còn giá trị được viết lại vào
  `docs/adr/**` hoặc `docs/specs/**` theo đúng định dạng này.
- `docs/ba/nguon/**` là ngoại lệ duy nhất không cần frontmatter (kho lưu file
  gốc, xem `docs/ba/nguon/README.md`).

## Lịch sử phiên bản

| Version | Ngày | Thay đổi | Người |
|---|---|---|---|
| 1.0 | 2026-09-24 | Bản đầu, nguồn: `docs/specs/2026-09-23-monorepo-ultimate-tckt-design.md` §1, §5 (M8) | DYC |
