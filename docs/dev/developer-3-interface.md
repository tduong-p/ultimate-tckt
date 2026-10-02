---
doc_id: DEV-GUIDE-003
title: Interface Guide for Developer 3 - Directives & Submissions API
version: 1.2
status: active
audience: [dev, ai]
owner: Developer 2
updated: 2026-10-02
related_code: [core/src/routes/directives.js, core/src/routes/submissions.js, core/src/policies/access.js, core/src/services/audit.js, core/src/serializers/summary.js]
---

# Interface Guide for Developer 3: Directives & Submissions API

Tài liệu này mô tả các interface, helper functions và patterns mà Developer 3 cần dùng khi triển khai API cho directives và submissions.

## 1. Unit Context (đã sẵn sàng)

Mọi request đã được gắn unit context qua middleware `loadUnitContext`. Bạn có thể truy cập:

```javascript
// Trong route handler
router.post('/api/directives', auth, asyncRoute(async (req, res) => {
  // Unit context từ middleware
  const { unit, unitRole, memberships, actor } = req;
  
  // unit = { id, code, name, kind }
  // unitRole = 'admin' | 'vice_admin' | 'leader' | 'btv_lead' | ...
  // memberships = [{ unit_id, code, name, kind, role }, ...]
  // actor = user object với thêm unit và unitRole
  
  console.log('Current unit:', unit.code);        // 'BTV', 'TCKT', ...
  console.log('Role in unit:', unitRole);         // 'btv_lead', 'admin', ...
  console.log('User has', memberships.length, 'memberships');
}));
```

## 2. Scope Queries với `scopeFor()`

Hàm `scopeFor(viewer, resourceType, options)` trả về điều kiện SQL an toàn để lọc dữ liệu theo unit và visibility policies.

### 2.1 Signature

```javascript
/**
 * @param {Object} viewer - req.actor (user object with unit context)
 * @param {string} resourceType - 'directives' | 'submissions' | 'activities' | 'teams'
 * @param {Object} options - { alias: 'table_alias' } (optional, default 'a')
 * @returns {Promise<{ sql: string, params: Array }>}
 */
const scope = await scopeFor(req.actor, 'directives', { alias: 'd' });
```

### 2.2 Cách dùng trong query

```javascript
router.get('/api/directives', auth, asyncRoute(async (req, res) => {
  const scope = await scopeFor(req.actor, 'directives', { alias: 'd' });
  
  const [rows] = await db.execute(
    `SELECT d.*, 
       from_unit.name AS from_unit_name,
       to_unit.name AS to_unit_name
     FROM directives d
     JOIN org_units from_unit ON from_unit.id = d.from_unit_id
     JOIN org_units to_unit ON to_unit.id = d.to_unit_id
     WHERE ${scope.sql}
     ORDER BY d.created_at DESC`,
    [...scope.params]  // QUAN TRỌNG: spread params vào query
  );
  
  res.json(rows);
}));
```

### 2.3 Logic của scopeFor

- **DYC** (`platform_owner`): trả về `1=1` (toàn quyền đọc)
- **Same unit**: trả về `d.unit_id = ?` với unit_id của user
- **Cross-unit với policy**: trả về `(d.unit_id = ? OR d.unit_id IN (?, ?, ...))` dựa trên visibility policies
- **No policy**: chỉ thấy same unit

**Đặc biệt cho directives/submissions**: ngoài scope cơ bản, cần thêm logic cho:
- Directives: `from_unit_id = my_unit OR to_unit_id = my_unit`
- Submissions: tương tự

## 3. Audit Logging

Ghi audit log cho mọi thay đổi quan trọng: create, acknowledge, respond, withdraw.

### 3.1 Signature

```javascript
const { recordAudit } = require('../services/audit');

/**
 * @param {Pool} db - database connection pool
 * @param {Object} entry
 * @param {number} entry.actorId - user.id thực hiện action
 * @param {number} entry.actorUnitId - unit_id đang chọn của actor
 * @param {string} entry.action - tên action (e.g., 'directive.create')
 * @param {string} entry.targetType - loại target ('directive', 'submission')
 * @param {string|number} entry.targetId - ID của target
 * @param {number} entry.ownerUnitId - unit_id sở hữu resource
 * @param {Object} entry.meta - metadata bổ sung (optional)
 */
await recordAudit(db, { ... });
```

### 3.2 Ví dụ audit cho directives

```javascript
// Khi BTV tạo directive gửi TCKT
router.post('/api/directives', auth, asyncRoute(async (req, res) => {
  const { to_unit_id, title, body, deadline } = req.body;
  
  // Validate và insert directive
  const [result] = await db.execute(
    `INSERT INTO directives(from_unit_id, to_unit_id, title, body, deadline, created_by, status)
     VALUES (?, ?, ?, ?, ?, ?, 'sent')`,
    [req.unit.id, to_unit_id, title, body, deadline, req.actor.id]
  );
  
  // Audit log
  await recordAudit(db, {
    actorId: req.actor.id,
    actorUnitId: req.unit.id,
    action: 'directive.create',
    targetType: 'directive',
    targetId: result.insertId,
    ownerUnitId: to_unit_id,  // owner là đơn vị nhận
    meta: {
      title: title,
      from_unit_code: req.unit.code,
      deadline: deadline
    }
  });
  
  res.status(201).json({ id: result.insertId });
}));
```

### 3.3 Các action codes cần dùng

| Action | Khi nào | Owner Unit |
|--------|---------|------------|
| `directive.create` | BTV tạo directive mới | `to_unit_id` |
| `directive.acknowledge` | TCKT tiếp nhận và chỉ định owner | `to_unit_id` |
| `directive.link_activity` | TCKT gắn activity vào directive | `to_unit_id` |
| `directive.respond` | BTV phản hồi (accept/revision) | `to_unit_id` |
| `submission.create` | TCKT Trình kết quả | `to_unit_id` |
| `submission.respond` | BTV phản hồi submission | `from_unit_id` |
| `submission.withdraw` | TCKT rút submission | `to_unit_id` |

## 4. Summary View Serializer

Khi trả về dữ liệu cho đơn vị khác (với visibility level = `summary`), cần filter fields.

### 4.1 Cho Activities

```javascript
const { toSummaryView } = require('../serializers/summary');

router.get('/api/activities/:id', auth, asyncRoute(async (req, res) => {
  // ... get activity ...
  
  // Check if cross-unit and should apply summary
  const isCrossUnit = req.actor.unit && activity.unit_id !== req.actor.unit.id;
  const isDyc = req.actor.unit?.kind === 'platform_owner';
  
  if (isCrossUnit && !isDyc) {
    // Check visibility policy level
    const [[policy]] = await db.execute(
      `SELECT level FROM unit_visibility_policies 
       WHERE viewer_unit_id = ? AND owner_unit_id = ?`,
      [req.actor.unit.id, activity.unit_id]
    );
    
    if (!policy || policy.level === 'summary') {
      return res.json(toSummaryView(activity));
    }
  }
  
  res.json(activity);  // Full view cho same unit hoặc policy cao hơn
}));
```

### 4.2 Summary fields cho Activity

`toSummaryView(activity)` chỉ giữ:
- `id`, `title`, `status`, `priority`
- `start_date`, `deadline`
- `progress_percent` (calculated)
- `event_lead_name`
- `directive_id`

**MỌI field khác bị loại bỏ**: `description`, `team_id`, `team_name`, `tasks`, `comments`, `attachments`, ...

### 4.3 Tạo serializer cho Directive (nếu cần)

Nếu directives cũng cần summary view:

```javascript
// core/src/serializers/summary.js
function toDirectiveSummary(directive) {
  return {
    id: directive.id,
    title: directive.title,
    status: directive.status,
    deadline: directive.deadline,
    from_unit_name: directive.from_unit_name,
    to_unit_name: directive.to_unit_name,
    progress_percent: directive.progress_percent,
    created_at: directive.created_at
  };
}
```

## 5. Authorization Helpers

### 5.1 Kiểm tra role cho directives

```javascript
// BTV có quyền tạo directive?
function canCreateDirective(memberships) {
  return memberships.some(m => 
    m.kind === 'standing_committee' && 
    ['btv_lead', 'btv_member'].includes(m.role)
  );
}

// TCKT admin có quyền acknowledge directive?
function canAcknowledgeDirective(unitRole, unitKind) {
  return unitKind === 'department' && ['admin', 'vice_admin'].includes(unitRole);
}

// User có quyền respond submission không?
function canRespondToSubmission(submission, req) {
  // Chỉ BTV có quyền respond submission gửi tới BTV
  if (submission.to_unit_id === req.unit.id) {
    return req.unit.kind === 'standing_committee' &&
           ['btv_lead', 'btv_member'].includes(req.unitRole);
  }
  return false;
}
```

### 5.2 Pattern check ownership

```javascript
router.patch('/api/directives/:id', auth, asyncRoute(async (req, res) => {
  // Get directive
  const [[directive]] = await db.execute(
    'SELECT * FROM directives WHERE id = ?',
    [req.params.id]
  );
  
  if (!directive) {
    return res.status(404).json({ error: 'Directive không tồn tại.' });
  }
  
  // Check if user's unit is involved
  const isFromUnit = directive.from_unit_id === req.unit.id;
  const isToUnit = directive.to_unit_id === req.unit.id;
  
  if (!isFromUnit && !isToUnit) {
    return res.status(403).json({ 
      error: 'Bạn không có quyền với directive này.' 
    });
  }
  
  // Additional role checks based on action...
}));
```

## 6. State Transitions

Sử dụng transaction và conditional update để tránh race conditions.

```javascript
router.post('/api/directives/:id/acknowledge', auth, asyncRoute(async (req, res) => {
  const { owner_user_id } = req.body;
  
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    
    // Lock and check current state
    const [[directive]] = await conn.execute(
      'SELECT * FROM directives WHERE id = ? FOR UPDATE',
      [req.params.id]
    );
    
    if (!directive) {
      await conn.rollback();
      return res.status(404).json({ error: 'Directive không tồn tại.' });
    }
    
    // Validate state transition
    if (directive.status !== 'sent') {
      await conn.rollback();
      return res.status(409).json({ 
        error: 'Chỉ directive ở trạng thái "sent" mới có thể acknowledge.' 
      });
    }
    
    // Update
    await conn.execute(
      `UPDATE directives 
       SET status = 'acknowledged', 
           owner_user_id = ?, 
           acknowledged_at = NOW()
       WHERE id = ?`,
      [owner_user_id, req.params.id]
    );
    
    await conn.commit();
    
    // Audit (outside transaction)
    await recordAudit(db, {
      actorId: req.actor.id,
      actorUnitId: req.unit.id,
      action: 'directive.acknowledge',
      targetType: 'directive',
      targetId: req.params.id,
      ownerUnitId: directive.to_unit_id,
      meta: { owner_user_id }
    });
    
    res.json({ ok: true });
    
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}));
```

## 7. Validation Patterns

```javascript
// Validate required fields
function validateDirectiveInput(req, res) {
  const { to_unit_id, title, body, deadline } = req.body;
  
  if (!to_unit_id || !title || !deadline) {
    res.status(400).json({ 
      error: 'to_unit_id, title và deadline là bắt buộc.' 
    });
    return false;
  }
  
  if (title.length > 200) {
    res.status(400).json({ error: 'title không được dài quá 200 ký tự.' });
    return false;
  }
  
  // Validate date format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(deadline)) {
    res.status(400).json({ error: 'deadline phải có format YYYY-MM-DD.' });
    return false;
  }
  
  return true;
}

// Usage
router.post('/api/directives', auth, asyncRoute(async (req, res) => {
  if (!validateDirectiveInput(req, res)) return;
  
  // ... proceed with creation ...
}));
```

## 8. Error Handling

```javascript
// 400: Bad Request - validation errors
res.status(400).json({ error: 'title không được rỗng.' });

// 403: Forbidden - authorization errors
res.status(403).json({ error: 'Chỉ BTV mới có quyền tạo directive.' });

// 404: Not Found
res.status(404).json({ error: 'Directive không tồn tại.' });

// 409: Conflict - state transition errors
res.status(409).json({ 
  error: 'Chỉ directive ở trạng thái "sent" mới có thể acknowledge.' 
});
```

## 9. Context Import Pattern

```javascript
function createDirectiveRoutes(context) {
  const { 
    db,           // database pool
    auth,         // auth middleware
    admin,        // admin guard
    asyncRoute,   // async error wrapper
    scopeFor,     // scope generator function
    logger,       // logger instance
    notifier      // facade phát thông báo ra ngoài (notifier.notify)
  } = context;
  
  const router = express.Router();
  
  // ... define routes ...
  
  return router;
}

module.exports = { createDirectiveRoutes };
```

## 10. Testing Checklist

Khi viết tests cho directives/submissions:

- [ ] BTV có quyền tạo directive
- [ ] TCKT admin có quyền acknowledge directive
- [ ] State transitions tuân thủ quy tắc (sent → acknowledged → in_progress, etc.)
- [ ] Withdrawal chỉ được khi chưa có response
- [ ] Response kèm lý do khi revision_requested
- [ ] Audit log được ghi cho mọi action quan trọng
- [ ] Cross-unit visibility: chỉ thấy directive liên quan đến đơn vị mình
- [ ] DYC thấy tất cả directives
- [ ] Đơn vị không liên quan không thấy directive
- [ ] Progress_percent được tính đúng từ activities linked

## 11. Workflow Events (Optional cho GĐ1)

Nếu cần phát thông báo ra ngoài (email do Noti đảm nhận sau):

```javascript
// Sau khi commit transaction thành công
try {
  const [tcktAdmins] = await db.execute(
    `SELECT u.id, u.name, u.email
     FROM unit_memberships m
     JOIN users u ON u.id = m.user_id
     WHERE m.unit_id = ? AND m.role IN ('admin', 'vice_admin')`,
    [tcktUnitId]
  );

  for (const admin of tcktAdmins) {
    notifier.notify({
      event: 'directive.received',            // trùng tên template của Noti
      recipient: admin,                       // { id, name, email }
      data: { actor: req.actor.name, directive: { id: directive.id, title: directive.title } },
      sourceKey: `directive-received:${directive.id}:${admin.id}`  // sẽ là dedupe_key
    });
  }
} catch (error) {
  // Thông báo lỗi không được rollback transaction đã commit
  logger.error('Failed to send directive notifications', error);
}
```

## Lịch sử phiên bản

| Version | Ngày | Thay đổi | Người |
|---------|------|----------|-------|
| 1.0 | 2026-09-30 | Tạo document interface cho Developer 3 | Developer 2 |
| 1.1 | 2026-10-02 | Ví dụ thông báo dùng `notifier.notify` thay `mailer` | DYC |

<!-- updated: 2026-10-02 dev3 routes -->
