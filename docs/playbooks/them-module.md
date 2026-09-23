---
doc_id: PB-MOD-001
title: Playbook — thêm module mới
version: 1.1
status: active
audience: [dev, ai]
owner: DYC
updated: 2026-09-24
related_code: [services/ctd-api/**, infra/compose/**, infra/scripts/lib.sh, .github/workflows/deploy.yml]
---

# Playbook — thêm module mới

Tài liệu này giúp dev và AI agent quyết định **loại module** (A hay B) cho một nhóm use case mới, và liệt kê đầy đủ nơi phải sửa khi thêm một module loại B (dịch vụ riêng) — lấy `services/ctd-api/` làm ví dụ thật đã tồn tại.

## Khi nào dùng

Khi có một nhóm use case mới đủ lớn để cân nhắc tách thành module riêng thay vì chỉ thêm route vào module đã có (ví dụ: kiểm tra cơ sở, thi đua khen thưởng — xem `.kiro/specs/nen-tang-da-don-vi/design.md` §4.4 mục "Ứng viên").

## Các bước

### 1. Xác định loại module (A hay B)

Theo `.kiro/specs/nen-tang-da-don-vi/design.md` §4.3: một nhóm use case nên tách thành **module riêng** khi đạt **từ 2/3 tiêu chí** trở lên:

- (a) Có nhóm người dùng chỉ dùng riêng nhóm này.
- (b) Dữ liệu ít phải JOIN với phần còn lại.
- (c) Có vòng đời hoặc quy trình riêng.

Đạt ≥2/3 → **module loại B** (dịch vụ riêng `services/<id>/`, JWT bridge + gateway, ví dụ thật: `services/ctd-api/`). Không đạt → **module loại A** (route mới trong `core/src/modules/`, dùng chung DB/phiên đăng nhập với Core — thư mục này là kế hoạch, hiện `core/` chưa tách theo cấu trúc module con).

Với module loại A: theo playbook [`them-tinh-nang.md`](them-tinh-nang.md), không cần các bước hạ tầng dưới đây.

### 2. Module loại B — tạo dịch vụ riêng

1. **Manifest module**: khai báo `id`, `name`, danh sách mục menu và `(unit_kind, role)` được thấy từng mục — theo hợp đồng module ở `.kiro/specs/nen-tang-da-don-vi/design.md` §4.1. Đăng ký vào bảng `unit_modules` (kế hoạch) để đơn vị nào cần mới bật.
2. **Code**: tạo `services/<id>/` (backend riêng, có thể kèm `frontend/` build vào static của backend như `services/ctd-api/frontend` → `backend/static`).
3. **Xác thực**: chỉ chấp nhận JWT bridge do Core ký (`HUB_BRIDGE_SECRET`, HS256, TTL 60 giây) — không tự viết luồng đăng nhập/mật khẩu riêng cho cán bộ.
4. **API**: đi qua gateway với tiền tố `/m/<module>/api/v1/*`; đổi tương thích ngược thì lên `v2`, không sửa `v1` tại chỗ.
5. **Compose**: thêm service mới vào **cả hai** file `infra/compose/docker-compose.staging.yml` và `docker-compose.production.yml` — service tên `<id>`, `<id>-db` nếu có DB riêng, volume riêng theo quy ước `<id>_<phần dữ liệu>` (xem ví dụ `ctd_postgres`, `ctd_documents`).
6. **Nginx/gateway**: thêm file cấu hình mới trong `infra/nginx/<env>/<id>.conf` cho cả `staging` và `production`, áp bằng `infra/scripts/apply-infra.sh <env>` (không sửa nginx trên VM bằng tay).
7. **`lib.sh`**: thêm entry cho module mới vào `ut_app_service()` (map tên app → tên service compose) và `ut_app_port()` (map env + app → cổng host `127.0.0.1`) trong `infra/scripts/lib.sh`, theo đúng mẫu hai hàm này đang xử lý `core`/`ctd-api`.
8. **CI (`deploy.yml`)**: thêm path filter mới cho `services/<id>/**` trong job `changes`, thêm job `test-<id>` (service DB thật nếu cần, không SQLite/mock DB), `build-<id>` (buildx `linux/arm64`, vì VM là Oracle Ampere arm64), `deploy-<id>` (SSH gọi `infra/scripts/deploy.sh <env> <id> <tag>`).
9. **Image**: đặt tên `ghcr.io/tduong-p/ultimate-tckt-<id>:<sha12>`, biến tag `<ID>_IMAGE_TAG` theo mẫu `CORE_IMAGE_TAG`/`CTD_API_IMAGE_TAG`.
10. **Docs**: viết tài liệu BA (`docs/ba/<id>-use-case.md`) và dev (`docs/dev/` nếu cần) cho module mới; thêm dòng vào bảng phân nhóm use case (`docs/ba/tong-quan-nen-tang.md` hoặc file tương ứng).

## Kiểm tra xong

- [ ] Module type đã chọn có ghi rõ căn cứ (2/3 tiêu chí nào đạt) trong PR hoặc ADR.
- [ ] Service mới có trong **cả hai** file compose (staging + production), không chỉ một.
- [ ] `lib.sh`: `ut_app_service`/`ut_app_port` có entry cho module mới, test tooling (`npm run test:tools`) xanh.
- [ ] `deploy.yml`: path filter + 3 job (test/build/deploy) cho module mới, health check `/api/health` (hoặc endpoint tương đương) đã xác nhận chạy được trước khi bật `DEPLOY_ENABLED` / `PROD_DEPLOY_ENABLED`. Không thêm `concurrency` group cho job deploy (GitHub huỷ job đang chờ; `flock` trên VM đã tuần tự).
- [ ] Module chỉ chấp nhận JWT bridge, không có luồng đăng nhập/mật khẩu riêng.
- [ ] Tài liệu BA cho module mới đã có, dẫn từ `docs/ba/tong-quan-nen-tang.md`.

## Tài liệu phải cập nhật

- `docs/ba/tong-quan-nen-tang.md` — thêm module vào bức tranh tổng thể.
- `.kiro/specs/nen-tang-da-don-vi/design.md` §4.4 — cập nhật bảng phân nhóm use case nếu module đến từ danh sách "Ứng viên".
- `docs/ops/moi-truong.md`, `docs/ops/deploy-va-nhanh.md` — thêm service/port/domain mới nếu có.
- ADR mới trong `docs/adr/` nếu quyết định loại module (A/B) có tranh cãi hoặc đảo ngược quyết định trước.

## Lịch sử phiên bản

| Version | Ngày | Thay đổi | Người |
|---|---|---|---|
| 1.0 | 2026-09-24 | Bản đầu (viết lại từ tài liệu cũ khi gộp monorepo) | DYC |
| 1.1 | 2026-09-24 | Công tắc production, không dùng concurrency group | DYC |
