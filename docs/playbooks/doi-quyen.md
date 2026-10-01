---
doc_id: PB-RBAC-001
title: Playbook — đổi quyền
version: 4.1
status: active
audience: [dev, ai]
owner: DYC
updated: 2026-10-01
related_code: [core/src/policies/**, core/src/middleware/auth.js, core/src/middleware/legacy-gate.js, core/src/services/audit.js, core/src/routes/units.js, services/ctd-api/backend/app/deps.py]
---

# Playbook — đổi quyền

Tài liệu này giúp dev và AI agent sửa logic phân quyền (ai được xem/sửa gì) một cách an toàn — đây là loại thay đổi dễ gây rò rỉ dữ liệu nhất trong repo nếu làm ẩu, nên có playbook riêng thay vì gộp vào [`them-tinh-nang.md`](them-tinh-nang.md).

## Khi nào dùng

Khi thêm/sửa vai trò, thay đổi phạm vi dữ liệu một vai trò được xem, hoặc đổi điều kiện được phép thực hiện một hành động (duyệt, sửa, xoá) ở Core hoặc CTD.

## Các bước

1. **Đọc `docs/dev/phan-quyen.md` và `docs/ai/bat-bien.md` mục 1, 11, 12 trước khi sửa**:
   - **INV-AUTH-001**: Route Điều hành cũ đọc `req.actor` (không `req.session.user`), route mới dùng `req.unitRole` + `req.unit`.
   - **INV-AUDIT-001**: DYC đọc dữ liệu đơn vị khác phải gọi `recordAudit(db, {action:'cross_unit_read', ...})`.
   - Mọi truy vấn liên đơn vị/team đi qua `activityScope`/`scopeFor`, không tự viết điều kiện rải rác, không lấy rộng rồi lọc client.
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

## Cấp quyền cho user

**⚠️ KHÔNG sửa trực tiếp `users.role` hoặc bảng `unit_memberships` bằng SQL!**

Từ GĐ1-A Task 8, sử dụng API `/api/units/:id/members/:userId` để cấp/sửa/thu hồi quyền:

### Cấp quyền cho user mới

```bash
# Lấy unit_id
curl -X GET https://staging.example.com/api/units \
  -H "Cookie: connect.sid=..."

# Thêm user vào đơn vị với role
curl -X PUT https://staging.example.com/api/units/3/members/42 \
  -H "Cookie: connect.sid=..." \
  -H "Content-Type: application/json" \
  -d '{"role": "leader"}'
```

### Đổi role của user hiện có

```bash
# Cùng endpoint PUT, role mới sẽ ghi đè
curl -X PUT https://staging.example.com/api/units/3/members/42 \
  -H "Cookie: connect.sid=..." \
  -H "Content-Type: application/json" \
  -d '{"role": "admin"}'
```

### Thu hồi quyền (xóa membership)

```bash
curl -X DELETE https://staging.example.com/api/units/3/members/42 \
  -H "Cookie: connect.sid=..."
```

**Lưu ý:**
- Nếu đổi role TCKT, `users.role` tự động đồng bộ (không cần sửa tay).
- Không thể xóa `dyc_admin` cuối cùng (API trả 409 Conflict).
- Mọi thao tác được ghi audit log (`membership.upsert` / `membership.remove`).

## Kiểm tra xong

- [ ] Có test xác nhận vai trò KHÔNG được phép bị từ chối đúng (không chỉ test đường happy path).
- [ ] Không có điều kiện quyền viết tay ngoài `access.js`/`scopeFor` (Core) hoặc `scope.py`/`workflow.py` whitelist (CTD).
- [ ] `core/tests/policies.roles.test.js` (nếu liên quan) và bộ test quyền CTD đều xanh.
- [ ] Đã kiểm tra không có endpoint nào trả dữ liệu rộng rồi để client tự lọc.

## Tài liệu phải cập nhật

- `docs/dev/phan-quyen.md` — bắt buộc, mô tả kỹ thuật của thay đổi quyền.
- `docs/ba/co-cau-don-vi-va-role.md` — nếu thay đổi ảnh hưởng bảng vai trò/phạm vi xem ở mức nghiệp vụ (bắt buộc theo brief đổi quyền).
- ADR mới trong `docs/adr/` nếu đây là một quyết định phân quyền mới có tranh cãi (theo mẫu ADR-0008 — quyết định quyền CTD từ tổ phó trở lên).

## Checklist & Anti-patterns khi thêm route Điều hành mới

### ✅ Checklist

- [ ] Route prefix thuộc 1 trong 12 prefix được bảo vệ bởi Legacy Gate (xem `core/src/middleware/legacy-gate.js`)
- [ ] Handler đọc `req.actor` thay vì `req.session.user` để tính quyền
- [ ] Có test xác nhận outsider (BTV, LCĐ) bị 403
- [ ] Có test xác nhận DYC read-only với audit log
- [ ] Có test xác nhận TCKT member truy cập được không audit
- [ ] Truy vấn DB dùng `activityScope(req.actor)` hoặc `scopeFor(req.actor, resourceType)`

### ❌ Anti-patterns (KHÔNG làm)

```javascript
// ❌ SAI: Đọc req.session.user thay vì req.actor
router.get('/api/new-feature', auth, asyncRoute(async (req, res) => {
  const user = req.session.user;  // SAI!
  // ...
}));

// ✅ ĐÚNG: Đọc req.actor
router.get('/api/new-feature', auth, asyncRoute(async (req, res) => {
  const user = req.actor;  // ĐÚNG
  // ...
}));

// ❌ SAI: Kiểm tra quyền bằng users.role trực tiếp
if (req.session.user.role === 'admin') { /* ... */ }  // SAI!

// ✅ ĐÚNG: Dùng helper từ context hoặc req.actor
if (isExecutive(req.actor)) { /* ... */ }  // ĐÚNG

// ❌ SAI: Lấy dữ liệu rộng, để client lọc
const [rows] = await db.execute('SELECT * FROM activities');  // SAI!
res.json(rows);  // Client tự lọc

// ✅ ĐÚNG: Lọc ngay trong query theo scope
const s = activityScope(req.actor);  // ĐÚNG
const [rows] = await db.execute(`SELECT * FROM activities WHERE ${s.sql}`, s.params);
res.json(rows);

// ❌ SAI: DYC đọc dữ liệu TCKT mà không audit
// (khi tạo route mới ngoài 12 prefix, phải tự gọi recordAudit)

// ✅ ĐÚNG: Ghi audit khi DYC cross-unit read
if (hasDycMembership(req.memberships) && !hasTcktMembership(req.memberships)) {
  await recordAudit(db, {
    actorId: req.actor.id,
    actorUnitId: req.memberships.find(m => m.kind === 'platform_owner').unit_id,
    action: 'cross_unit_read',
    targetType: 'activity',
    targetId: activityId,
    ownerUnitId: await unitIdByCode(db, 'TCKT')
  });
}
```

## Lịch sử phiên bản

| Version | Ngày | Thay đổi | Người |
|---|---|---|---|
| 1.0 | 2026-09-24 | Bản đầu (viết lại từ tài liệu cũ khi gộp monorepo) | DYC |
| 2.0 | 2026-09-27 | Đồng bộ `main` = `staging`: nội dung theo bản `main` (chưa có code đa đơn vị GĐ1-A). Bản 1.2 trên `staging` mô tả GĐ1-A, lưu ở nhánh `archive/gd1a-staging` — NTMT làm lại ở PR sau | DYC |
| 3.0 | 2026-09-29 | Thêm mục "Checklist & Anti-patterns khi thêm route Điều hành mới". Cập nhật bước 1 với INV-AUTH-001 và INV-AUDIT-001. Thêm `legacy-gate.js` và `audit.js` vào `related_code`. | AI (Task 5) |
| 4.0 | 2026-09-29 | Thêm section "Cấp quyền cho user" với hướng dẫn dùng API `/api/units/:id/members/:userId` thay vì sửa SQL. Cảnh báo không sửa `users.role` hoặc `unit_memberships` trực tiếp. Thêm `units.js` vào `related_code`. | DYC |
| 2.1 | 2026-09-30 | Nhắc kiểm canManageUser khi đổi quyền quản lý tài khoản (pilot PR 4) | DYC |
| 4.1 | 2026-10-01 | Xử lý conflict merge staging và cập nhật tài liệu | DYC |
