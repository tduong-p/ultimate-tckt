---
doc_id: ONB-W1-001
title: Onboarding — tuần 1
version: 1.0
status: active
audience: [onboarding, dev]
owner: DYC
updated: 2026-09-24
related_code: []
---

# Onboarding — tuần 1

Tài liệu này giúp người mới biết nên đọc gì trước, chọn việc nhỏ đầu tiên thế nào, và cách làm việc chung với AI agent trong repo này.

## 1. Thứ tự đọc tài liệu

1. `AGENTS.md` (gốc repo) — luật làm việc bắt buộc, kể cả cho người, không chỉ AI.
2. `docs/ai/bat-bien.md` — điều không được phá (rò rỉ dữ liệu, mất khoá mã hoá, sai tên hạ tầng…).
3. `docs/ba/tong-quan-nen-tang.md` rồi `docs/ba/thuat-ngu.md` — hiểu hệ thống phục vụ ai, dùng đúng từ vựng nghiệp vụ.
4. `docs/dev/kien-truc.md` — kiến trúc kỹ thuật tổng thể.
5. `docs/dev/chay-local.md`, `docs/dev/test.md` — đã làm ở ngày 1, đọc lại kỹ hơn.
6. `docs/dev/phan-quyen.md` — bắt buộc trước khi đụng bất cứ gì liên quan quyền.
7. `docs/playbooks/` tương ứng với việc đầu tiên được giao (feature/debug/schema…).
8. `docs/ai/bay-da-gap.md` — đọc lướt để biết lỗi nào đã từng xảy ra, tránh lặp lại.

## 2. Việc nhỏ đầu tiên

Chọn một việc **nhỏ, có phạm vi rõ, có test kiểm chứng được** — ví dụ: sửa một bug đã có báo cáo, thêm một test còn thiếu cho một route đã có, hoặc bổ sung một mục còn thiếu trong tài liệu BA. Tránh việc đầu tiên là đổi schema hoặc đổi quyền (rủi ro cao, nên để sau khi đã quen codebase). Làm theo playbook tương ứng trong `docs/playbooks/`, đặc biệt bước "Tài liệu phải cập nhật" — đây là phần người mới hay bỏ sót nhất.

## 3. Làm việc với AI agent trong repo này

- **Agent phải đọc `AGENTS.md` trước khi làm bất cứ việc gì** — file này là nguồn luật duy nhất cho agent, không đoán quy trình từ tên biến hay cấu trúc thư mục.
- **Tài liệu phải được cập nhật trong cùng PR** với thay đổi code — không tách PR "code trước, docs sau". Agent (và người) đều bị áp quy tắc này như nhau.
- `npm run docs:check` chạy trong CI (job `docs`, xem `.github/workflows/deploy.yml` và `docs.yml`) — kiểm frontmatter hợp lệ, bump version khi thân bài đổi, và đối chiếu `related_code` để phát hiện code đổi mà tài liệu liên quan chưa cập nhật. PR không xanh check này sẽ bị chặn merge vào `main`.
- Nếu một PR **thật sự không cần** cập nhật tài liệu (ví dụ chỉ sửa lỗi đánh máy trong comment, không đổi hành vi), gắn nhãn **`no-docs-needed`** và ghi rõ dòng `Docs: không cần vì …` trong mô tả PR — xem mẫu ở `.github/pull_request_template.md`. Gắn nhãn này mà không có lý do chính đáng là vi phạm quy trình.
- Khi nhờ agent làm một việc quen thuộc (thêm tính năng, debug, hotfix…), trỏ agent vào đúng playbook trong `docs/playbooks/` thay vì mô tả lại quy trình bằng lời — playbook đã được viết đúng cho repo này.

## Lịch sử phiên bản

| Version | Ngày | Thay đổi | Người |
|---|---|---|---|
| 1.0 | 2026-09-24 | Bản đầu (viết lại từ tài liệu cũ khi gộp monorepo) | DYC |
