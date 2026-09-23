---
doc_id: AI-CHK-001
title: Cách kiểm tra trước khi coi là xong
version: 1.3
status: active
audience: [ai, dev]
owner: DYC
updated: 2026-09-24
related_code: [.github/workflows/**, tools/**]
---

# Cách kiểm tra trước khi coi là xong

Chạy đủ các lệnh dưới đây trước khi báo "xong" hoặc push. Không coi một thay đổi là hoàn tất chỉ vì code chạy
được thủ công một lần.

## Test từng phần

```bash
# Core (Node/MySQL) — cần MySQL local, biến TEST_DB_HOST/PORT/USER/PASSWORD (mặc định fallback DB_*, rồi root@localhost)
cd core && npm test

# CTD (FastAPI/Postgres) — cần Postgres local, DB ctd_test đã tồn tại
cd services/ctd-api/backend && TEST_DATABASE_URL=postgresql+psycopg://postgres:postgres@localhost:5432/ctd_test .venv/bin/pytest

# Script hạ tầng (bash, stub docker/git/sudo…) + tooling docs-check
npm run test:tools

# Frontmatter + version tài liệu
npm run docs:check
```

Chỉ sửa một phần (ví dụ chỉ route Core) vẫn nên chạy cả `npm run test:tools` nếu có đụng tới `infra/**` hoặc
`tools/**`, và luôn chạy `docs:check` nếu có đổi bất kỳ file `.md` nào trong `docs/`.

## Chạy local (khi cần MySQL/Postgres)

Xem `docs/dev/chay-local.md` để dựng MySQL 8 và Postgres 16 bằng Docker cho máy dev. Không dùng DB thật của
staging/production để chạy test.

## Cách đọc CI

Workflow `.github/workflows/deploy.yml`: lọc theo đường dẫn thay đổi (`dorny/paths-filter`) → chạy
`test-core` (MySQL 8 service) và/hoặc `test-ctd` (Postgres 16 service) tương ứng → nếu xanh mới build arm64
(buildx + QEMU) → deploy qua SSH chỉ khi biến repo `DEPLOY_ENABLED == 'true'` (production cần thêm `PROD_DEPLOY_ENABLED == 'true'`). Đổi gì trong `infra/**` sẽ kích
hoạt `apply-infra.sh` thay vì `deploy.sh`. PR đỏ ở bước nào thì sửa đúng phần đó trước, không bỏ qua.

Workflow `.github/workflows/docs.yml`: chạy `docs:check` trên PR, xuất docx/pdf khi merge vào `main`
(qua `tools/docs-export/export.sh`), gắn tag `docs-vYYYY.MM.N`.

## `docs:check`

`npm run docs:check` kiểm mỗi file `.md` trong `docs/` (trừ `docs/ba/nguon/**`, `docs/README.md`,
`docs/CHANGELOG.md`): frontmatter đúng khuôn (`doc_id` khớp regex, `status` hợp lệ…), có mục
`## Lịch sử phiên bản`, và nếu nội dung thân bài đổi so với base branch thì `version` phải tăng. Chạy với
`-- --base origin/staging` khi muốn so với nhánh nguồn trước khi mở PR. Chỉ đổi khoảng trắng cuối dòng hoặc
`updated` không bị coi là thay đổi nội dung. Khi tăng `version`, `updated` là ngày sửa: được giữ nguyên nếu
sửa lần nữa trong cùng ngày, nhưng không được lùi về ngày cũ hơn. Đổi code khớp `related_code` của một tài liệu
mà không sửa tài liệu đó → lỗi; ADR (`docs/adr/`) được bỏ qua vì ADR không sửa, chỉ thay bằng ADR mới.
Trên CI, kiểm tác động này chỉ chạy ở PR (nhãn `no-docs-needed` trên PR cho phép bỏ qua kèm lý do); lần chạy
sau khi merge (push) chỉ kiểm frontmatter và bump version, vì mọi thay đổi đã phải qua PR.

## Lịch sử phiên bản

| Version | Ngày | Thay đổi | Người |
|---|---|---|---|
| 1.0 | 2026-09-24 | Bản đầu (viết lại từ tài liệu cũ khi gộp monorepo) | DYC |
| 1.1 | 2026-09-24 | Ghi luật ngày `updated` khi bump và việc bỏ qua ADR trong kiểm tác động | DYC |
| 1.2 | 2026-09-24 | Kiểm tác động code→tài liệu chỉ gác ở PR, push không lặp lại | DYC |
| 1.3 | 2026-09-24 | Công tắc `PROD_DEPLOY_ENABLED` | DYC |
