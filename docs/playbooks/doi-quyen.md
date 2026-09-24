---
doc_id: PB-RBAC-001
title: Playbook — đổi quyền
version: 1.2
status: active
audience: [dev, ai]
owner: DYC
updated: 2026-09-24
related_code: [core/src/policies/**, core/src/middleware/auth.js, core/src/middleware/legacy-gate.js, services/ctd-api/backend/app/deps.py]
---

# Playbook — đổi quyền

Tài liệu này giúp dev và AI agent sửa logic phân quyền (ai được xem/sửa gì) một cách an toàn — đây là loại thay đổi dễ gây rò rỉ dữ liệu nhất trong repo nếu làm ẩu, nên có playbook riêng thay vì gộp vào [`them-tinh-nang.md`](them-tinh-nang.md).

## Khi nào dùng

Khi thêm/sửa vai trò, thay đổi phạm vi dữ liệu một vai trò được xem, hoặc đổi điều kiện được phép thực hiện một hành động (duyệt, sửa, xoá) ở Core hoặc CTD.

## Các bước

1. **Đọc `docs/dev/phan-quyen.md` và `docs/ai/bat-bien.md` mục 1 trước khi sửa** — mọi truy vấn dữ liệu liên đơn vị/liên Tổ phải đi qua `activityScope`/`scopeFor` (`core/src/policies/access.js`), không tự viết điều kiện quyền rải rác trong route, không lấy dữ liệu rộng rồi lọc lại ở client.
2. **Xác định đúng tầng cần sửa**:
   - Core: hàm thuần trong `access.js` (`activityScope`, `canManageTeam`, `canManageActivity`, `canReviewTask`, `canManageUser`…) hoặc middleware `core/src/middleware/auth.js`.
   - CTD: `app/services/scope.py` (`visible_cases` — phạm vi xem hồ sơ theo vai trò) hoặc `app/services/workflow.py` (`duoc_phep` — whitelist theo `transition_def.allowed_roles`), `app/deps.py` (dependency xác thực/lấy user hiện tại).
3. **Viết test "chống rò rỉ" trước khi sửa** — test phải xác nhận vai trò KHÔNG được phép thì bị từ chối (403/không thấy dữ liệu), không chỉ test vai trò được phép thì thành công. Core có sẵn `core/tests/policies.roles.test.js` (ma trận quyền theo 5 role) làm mẫu; CTD có `test_quyen_thao_tac.py`, `test_scope.py`.
4. **Sửa logic**, giữ nguyên nguyên tắc: CTD không có vai trò nào (kể cả `quan_tri`) được đặc cách vượt whitelist — quyền luôn do dữ liệu (`transition_def.allowed_roles`) quyết định, không hard-code ngoại lệ trong code.
5. **Chạy toàn bộ test liên quan tới quyền**, không chỉ test mới:
   ```bash
   cd core && npm test
   cd services/ctd-api/backend && .venv/bin/pytest tests/test_quyen_thao_tac.py tests/test_scope.py
   ```
6. **Cập nhật tài liệu nghiệp vụ** phản ánh đúng quyền mới — đây là bước hay bị quên nhất vì bảng phân quyền dễ nằm rải rác nhiều file.
7. **Thêm route Điều hành mới → thêm prefix vào `LEGACY_PREFIXES`** (`core/src/middleware/legacy-gate.js`) nếu
   route nằm ngoài các prefix sẵn có — nếu không, `createLegacyGate` sẽ không chặn route đó và người ngoài
   TCKT/DYC sẽ đi qua thẳng, bỏ qua cả kiểm tra 403 lẫn audit `cross_unit_read` (xem
   `docs/dev/phan-quyen.md` mục "Cổng Điều hành (`legacyGate`)"). Route thuộc setting `managed_by=unit`/`platform`
   (ví dụ weight-presets qua `/api/admin/`) đi qua `settingGuard` riêng, không thêm vào đây.

## Cấp quyền cho người mới (qua API membership, GĐ1-A Task 8)

Không sửa trực tiếp `users.role` (hay `unit_memberships`) bằng SQL tay — luôn đi qua API membership của
`core/src/routes/units.js`, để đúng người được ghi `audit_logs` và (với đơn vị TCKT) `users.role` được đồng bộ
tự động:

1. Tìm đơn vị cần thêm người: `GET /api/units` (đăng nhập bằng tài khoản DYC hoặc admin của đơn vị đó).
2. Gán vai trò: `PUT /api/units/:id/members/:userId { role }` — `role` phải nằm trong `UNIT_ROLES[kind]` của
   đơn vị đó (400 nếu sai). Chỉ DYC (`dyc_admin` với đơn vị DYC) hoặc admin của chính đơn vị đó
   (`isUnitAdmin`) gọi được (403 nếu không).
3. Gỡ quyền: `DELETE /api/units/:id/members/:userId` — cùng điều kiện quyền như trên; không gỡ được
   `dyc_admin` cuối cùng của đơn vị DYC (409).
4. Đơn vị TCKT: đổi/gỡ membership ở đây tương đương đổi role ở màn Tài khoản cũ — không cần (và không nên)
   sửa thêm ở nơi khác.

## Kiểm tra xong

- [ ] Có test xác nhận vai trò KHÔNG được phép bị từ chối đúng (không chỉ test đường happy path).
- [ ] Không có điều kiện quyền viết tay ngoài `access.js`/`scopeFor` (Core) hoặc `scope.py`/`workflow.py` whitelist (CTD).
- [ ] `core/tests/policies.roles.test.js` (nếu liên quan) và bộ test quyền CTD đều xanh.
- [ ] Đã kiểm tra không có endpoint nào trả dữ liệu rộng rồi để client tự lọc.

## Tài liệu phải cập nhật

- `docs/dev/phan-quyen.md` — bắt buộc, mô tả kỹ thuật của thay đổi quyền.
- `docs/ba/co-cau-don-vi-va-role.md` — nếu thay đổi ảnh hưởng bảng vai trò/phạm vi xem ở mức nghiệp vụ (bắt buộc theo brief đổi quyền).
- ADR mới trong `docs/adr/` nếu đây là một quyết định phân quyền mới có tranh cãi (theo mẫu ADR-0008 — quyết định quyền CTD từ tổ phó trở lên).

## Lịch sử phiên bản

| Version | Ngày | Thay đổi | Người |
|---|---|---|---|
| 1.0 | 2026-09-24 | Bản đầu (viết lại từ tài liệu cũ khi gộp monorepo) | DYC |
| 1.1 | 2026-09-24 | Thêm bước 7: route Điều hành mới ngoài prefix sẵn có phải thêm vào `LEGACY_PREFIXES` | DYC |
| 1.2 | 2026-09-24 | Thêm mục "Cấp quyền cho người mới (qua API membership)" — dùng `/api/units*`, không sửa `users.role` bằng SQL tay | DYC |
