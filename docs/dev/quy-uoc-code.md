---
doc_id: DEV-CONV-001
title: Quy ước code
version: 1.0
status: active
audience: [dev, ai]
owner: DYC
updated: 2026-09-24
related_code: []
---

# Quy ước code

Quy ước dưới đây rút ra từ code và lịch sử commit thật của hai app, không phải chuẩn lý tưởng áp đặt từ ngoài
vào — khi thêm code mới, bắt chước phong cách đang có trong file/module đang sửa trước, chỉ áp quy ước chung khi
tạo file mới.

## Core (`core/`, JavaScript)

- Route mới tạo theo pattern factory `createXRoutes(context)`, nhận `context` chứa `db`, middleware quyền
  (`auth`, `admin`, `manager`, `devops`), policy (`activityScope`, `canManageActivity`…) và tiện ích
  (`asyncRoute`, `one`, `ids`) — rồi đăng ký trong `core/src/routes/index.js`. Không tạo router độc lập ngoài
  pattern này.
- Handler bọc bằng `asyncRoute` (từ `core/src/routes/utils.js`) để lỗi async tự chuyển vào error handler, không
  `try/catch` thủ công trong từng route.
- Style dày đặc, ít xuống dòng trong route handler (xem `core/src/routes/documents.js`) — SQL viết bằng template
  string, tham số hoá bằng `?`, không nối chuỗi giá trị người dùng vào câu SQL.
- Tên biến/hàm: `camelCase` tiếng Anh (`isExecutive`, `canManageActivity`, `activityScope`). Chuỗi lỗi trả về
  người dùng: tiếng Việt (`'Bạn không có quyền thực hiện thao tác này.'`), log nội bộ có thể tiếng Anh.
- Test: `node:test` + `node:assert/strict`, một `test('mô tả bằng tiếng Việt hoặc Anh tuỳ ngữ cảnh nghiệp vụ', async () => {...})`
  mỗi kịch bản, dùng fixture chung `core/tests/helpers/{db,server,fixtures}.js` để tạo DB test, server test, và
  dữ liệu mẫu (`createTeam`, `createUser`, `createActivity`...). Không mock DB — chạy trên MySQL test thật.
- Commit message: **Conventional Commits, tiếng Anh**, ví dụ `feat(email): notify assigned teams when an activity
  is approved`, `fix(dashboard): exclude cancelled tasks from overview/bootstrap stats`. Scope là module/khu vực
  bị ảnh hưởng (`email`, `cron`, `dashboard`, `infra`…).

## CTD (`services/ctd-api/`, Python + TypeScript)

- **Định danh nghiệp vụ dùng tiếng Việt không dấu-ASCII** khi khái niệm đó là nghiệp vụ Việt Nam thuần
  (`ThaoTac`, `kiem_quyen`, `VAI_TRO_CAN_BO`, `HO_SO_DA_KET_THUC` trong `app/services/permissions.py`); tên
  framework/kỹ thuật (model, schema, router, field DB) vẫn tiếng Anh (`Case`, `CaseDetail`, `router`,
  `current_user`). Không trộn nửa Việt nửa Anh trong cùng một khái niệm.
- Docstring/comment giải thích **lý do** (không chỉ mô tả code làm gì) khi logic dễ bị vá sai lần sau — xem
  đầu file `permissions.py` giải thích vì sao chọn danh sách trắng thay vì chuỗi `if` loại trừ.
- Có đúng **một nơi** kiểm quyền đổi nội dung hồ sơ (`permissions.kiem_quyen`) và **một nơi** đổi trạng thái
  (`services/workflow.apply_action`) — thêm thao tác mới phải khai vào các nơi này, không tự viết kiểm tra quyền
  rải rác trong router.
- Phân biệt hai loại lỗi: `PermissionDenied` (sai vai trò/không phải chủ hồ sơ, 403) và `BusinessError` (đúng
  quyền nhưng sai trạng thái nghiệp vụ, 400) — không dùng chung một exception cho cả hai.
- Test: `pytest`, file `tests/test_<khu_vực>.py`, fixture DB thật ở `tests/conftest.py`. Có nhóm test đặt tên
  tiếng Việt cho phần nghiệp vụ đặc thù (`test_quyen_thao_tac.py`).
- Frontend TypeScript: chia theo tính năng dưới `src/features/<ten-tinh-nang>/` (`hoso`, `canbo`, `baocao`,
  `auth`), dùng tên thư mục tiếng Việt khi tính năng là nghiệp vụ CTD.
- Commit message CTD lịch sử **không đồng nhất** như Core — có cả Conventional Commits tiếng Anh
  (`feat(auth): add admin account…`) lẫn tiếng Việt tự do (`chore: dọn repo — gỡ MVP Django và tài liệu thiết kế
  cũ`, `docs: chốt bàn giao — nhánh M0+M1 hoàn thành…`). Từ khi vào monorepo: dùng chung một chuẩn — Conventional
  Commits, có thể viết phần mô tả bằng tiếng Việt, nhưng `type(scope):` phải là tiếng Anh chuẩn
  (`feat`, `fix`, `docs`, `chore`, `refactor`, `test`).

## Chung cho cả repo

- Không sửa DB bằng tay ở bất kỳ môi trường nào — luôn qua migration (`npm run migrate` / Alembic revision).
- Không thêm dependency mới "cho chắc" — `tools/docs-check/` và script hạ tầng cố tình không có dependency
  ngoài Node/bash chuẩn, giữ nguyên tinh thần đó khi thêm tooling mới.

## Lịch sử phiên bản

| Version | Ngày | Thay đổi | Người |
|---|---|---|---|
| 1.0 | 2026-09-24 | Bản đầu (viết lại từ tài liệu cũ khi gộp monorepo) | DYC |
