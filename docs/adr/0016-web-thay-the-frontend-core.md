---
doc_id: ADR-0016-001
title: web/ (React + Atlaskit) thay thế frontend Core tại /
version: 1.1
status: superseded
audience: [dev, ai, ops]
owner: DYC
updated: 2026-10-10
supersedes: 0015
superseded_by: 0017
related_code: [web/**, core/src/app.js, core/Dockerfile, .github/workflows/deploy.yml]
---

# web/ (React + Atlaskit) thay thế frontend Core tại /

## Bối cảnh

- ADR-0015 cho phép làm POC React + Atlaskit và hứa sẽ quyết định thay thế sau khi nghiệm thu POC.
- PR 83 đã đưa `web/` vào `staging`:
  - Có các màn Core đầu tiên dùng API thật.
  - Có khoảng 170 test Vitest.
  - Có job CI `test-web`.
- Frontend cũ `core/public/` theo ADR-0001 và ADR-0003: JavaScript thuần, router hash tự viết, một file `app.js` khoảng 1.400 dòng dài. File này ngày càng khó mở rộng.
- Requirement 7.4 của `nen-tang-da-don-vi-requirements.md` định chạy shell mới ở `/app`, song song với UI cũ ở `/`, trong suốt GĐ1.
- Trưởng dự án đã quyết định ngày 2026-10-09:
  - Hoàn thiện `web/` cho đủ chức năng của UI cũ, kèm các cải tiến đang để "Sắp có".
  - Sau đó thay UI cũ ngay tại `/`.
  - Không cần họp team.

## Quyết định

1. `web/` (React 18, TypeScript, Vite, Atlaskit, TanStack Query) là frontend chính thức của Core, thay `core/public/`.
2. Khi `web/` làm được mọi việc UI cũ làm (danh sách ngang bằng trong `SPEC-WEB-003`), Core phục vụ `web/dist` tại `/`.
   - Việc này thay cho phương án `/app` của Requirement 7.4.
   - UI cũ chuyển sang `/legacy` trong một thời gian chuyển tiếp, rồi bị gỡ.
3. `web/` dùng **hash router** với cùng đường dẫn như UI cũ (`#activity/:id`, `#board/:id`, `#team/:id`…), để link trong email và thông báo Core đang gửi vẫn đúng.
4. Phần nhìn và kỹ thuật frontend của ADR-0001 và ADR-0003 hết hiệu lực khi bước thay thế hoàn tất. Phần backend của ADR-0001 (Node/Express/MySQL) giữ nguyên.

## Hệ quả

- Image Core phải build `web/` (Docker nhiều giai đoạn). CI cần job build `web/` trước khi build image Core.
- Mọi tính năng frontend mới của Core làm trong `web/`. Từ khi có ADR này, `core/public/` chỉ nhận bản vá lỗi cho tới khi bị gỡ.
- Callback SSO `redirect('/')` của Core tự trỏ về `web/` sau khi thay thế.

## Lịch sử phiên bản

| Version | Ngày | Thay đổi | Người |
|---|---|---|---|
| 1.0 | 2026-10-09 | Bản đầu: `web/` thay frontend Core tại `/`, hash router tương thích link cũ, `/legacy` chuyển tiếp | DYC |
| 1.1 | 2026-10-10 | Đánh dấu superseded bởi ADR-0017 (thay Atlaskit bằng UI kit tokens + Radix UI) | DYC |
