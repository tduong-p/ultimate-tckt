const express = require('express');
const { createAttachment } = require('../services/task-attachments');

function createTaskRoutes(context) {
  const { db, auth, admin, manager, isLeadership, isExecutive, asyncRoute, validHttpUrl, one, ids, activityScope, leadsTeam, belongsToTeam, canManageTeam, managedTeamIds, canManageUser, canManageActivity, canReviewTask, visibleActivity, bcrypt, ExcelJS, packageInfo, logger, mailer, push, taskUpload, attachmentKinds, allowedExtensions, attachmentRoot, path, fs, crypto } = context;
  const router = express.Router();

  async function canTouchTask(context, req, taskId) {
    const { db, canManageTeam } = context;
    const [rows] = await db.execute('SELECT t.*,EXISTS(SELECT 1 FROM task_assignees ta WHERE ta.task_id=t.id AND ta.user_id=?) assigned_to_me FROM tasks t WHERE t.id=?', [req.session.user.id, taskId]);
    const task = rows[0] || null;
    if (!task) return { task: null, allowed: false };
    const manages = await canManageTeam(req.session.user, task.team_id);
    return { task, allowed: manages || !!task.assigned_to_me };
  }

router.patch('/api/tasks/:id',auth,asyncRoute(async(req,res)=>{const [rows]=await db.execute('SELECT t.*,EXISTS(SELECT 1 FROM task_assignees ta WHERE ta.task_id=t.id AND ta.user_id=?) assigned_to_me FROM tasks t WHERE t.id=?',[req.session.user.id,req.params.id]);const task=one(rows);if(!task)return res.status(404).json({error:'Task not found.'});const manages=await canManageTeam(req.session.user,task.team_id);if(!manages&&!task.assigned_to_me)return res.status(403).json({error:'You cannot update this task.'});const allowed=manages?['deadline','start_date','priority','deliverable']:[];const entries=Object.entries(req.body).filter(([key])=>allowed.includes(key));if(!entries.length)return res.status(400).json({error:'No valid fields supplied.'});await db.execute(`UPDATE tasks SET ${entries.map(([k])=>`${k}=?`).join(',')} WHERE id=?`,[...entries.map(([,v])=>v||null),req.params.id]);res.json({ok:true})}));

router.post('/api/tasks/:id/attachments', auth, taskUpload.single('file'), asyncRoute(async (req, res) => {
  const [tasks] = await db.execute('SELECT id,activity_id FROM tasks WHERE id=?', [req.params.id]);
  const task = one(tasks);
  if (!task || !(await visibleActivity(req.session.user, task.activity_id))) return res.status(404).json({ error: 'Không tìm thấy công việc.' });
  const kind = attachmentKinds.includes(req.body.kind) ? req.body.kind : 'clarification';
  try {
    const created = await createAttachment(context, { taskId: task.id, userId: req.session.user.id, kind, label: req.body.label, linkUrl: String(req.body.link_url || '').trim(), file: req.file });
    res.status(201).json(created);
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    throw error;
  }
}));

const inlineSafeMimeByExtension={'.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.gif':'image/gif','.webp':'image/webp','.heic':'image/heic','.pdf':'application/pdf'};
router.get('/api/task-attachments/:id/content',auth,asyncRoute(async(req,res)=>{const [rows]=await db.execute('SELECT x.*,t.activity_id FROM task_attachments x JOIN tasks t ON t.id=x.task_id WHERE x.id=?',[req.params.id]);const item=one(rows);if(!item||!item.stored_name||!(await visibleActivity(req.session.user,item.activity_id)))return res.status(404).json({error:'Attachment not found.'});const filePath=path.join(attachmentRoot,path.basename(item.stored_name));if(!fs.existsSync(filePath))return res.status(404).json({error:'Stored file not found.'});const ext=path.extname(item.stored_name).toLowerCase(),safeMime=inlineSafeMimeByExtension[ext];res.type(safeMime||'application/octet-stream');res.setHeader('Content-Disposition',`${safeMime?'inline':'attachment'}; filename*=UTF-8''${encodeURIComponent(item.original_name)}`);res.sendFile(filePath)}));

router.get('/api/tasks/:id',auth,asyncRoute(async(req,res)=>{const [taskRows]=await db.execute(`SELECT t.*,a.title activity_title,a.description activity_description,a.status activity_status,a.deadline activity_deadline,te.name team_name,GROUP_CONCAT(DISTINCT u.name ORDER BY u.name SEPARATOR ', ') assignee_name,GROUP_CONCAT(DISTINCT u.id ORDER BY u.id) assignee_ids FROM tasks t JOIN activities a ON a.id=t.activity_id JOIN teams te ON te.id=t.team_id LEFT JOIN task_assignees ta ON ta.task_id=t.id LEFT JOIN users u ON u.id=ta.user_id WHERE t.id=? GROUP BY t.id`,[req.params.id]);const task=one(taskRows);if(!task||!(await visibleActivity(req.session.user,task.activity_id)))return res.status(404).json({error:'Task not found.'});const [[attachments],[updates],[checklist],[assignees]]=await Promise.all([db.execute('SELECT x.id,x.task_id,x.kind,x.label,x.link_url,x.original_name,x.mime_type,x.size_bytes,x.created_at,u.name user_name FROM task_attachments x JOIN users u ON u.id=x.user_id WHERE x.task_id=? ORDER BY x.created_at DESC',[task.id]),db.execute('SELECT n.*,u.name user_name,u.avatar_color FROM updates n JOIN users u ON u.id=n.user_id WHERE n.task_id=? ORDER BY n.created_at DESC',[task.id]),db.execute('SELECT * FROM task_checklists WHERE task_id=? ORDER BY sort_order,id',[task.id]),db.execute('SELECT ta.user_id,ta.is_primary,ta.acknowledged_at,u.name,u.email,u.avatar_color FROM task_assignees ta JOIN users u ON u.id=ta.user_id WHERE ta.task_id=? ORDER BY ta.is_primary DESC,u.name',[task.id])]);const myAssignee=assignees.find(a=>a.user_id===req.session.user.id),assigned=Boolean(myAssignee),manages=await canManageTeam(req.session.user,task.team_id);res.json({task,assignees,attachments,updates,checklist,canUpdate:assigned||manages,myAcknowledgedAt:myAssignee?.acknowledged_at||null})}));

router.post('/api/tasks/:id/acknowledge', auth, asyncRoute(async (req, res) => {
  const [result] = await db.execute('UPDATE task_assignees SET acknowledged_at=NOW() WHERE task_id=? AND user_id=? AND acknowledged_at IS NULL', [req.params.id, req.session.user.id]);
  if (!result.affectedRows) {
    const [rows] = await db.execute('SELECT 1 FROM task_assignees WHERE task_id=? AND user_id=?', [req.params.id, req.session.user.id]);
    if (!rows.length) return res.status(403).json({ error: 'Bạn không được giao công việc này.' });
  }
  res.json({ ok: true });
}));

router.patch('/api/tasks/:id/status', auth, asyncRoute(async (req, res) => {
  const [rows] = await db.execute('SELECT t.*,EXISTS(SELECT 1 FROM task_assignees ta WHERE ta.task_id=t.id AND ta.user_id=?) assigned_to_me FROM tasks t WHERE t.id=?', [req.session.user.id, req.params.id]);
  const task = one(rows);
  if (!task) return res.status(404).json({ error: 'Không tìm thấy công việc.' });
  const manages = await canManageTeam(req.session.user, task.team_id);
  if (!manages && !task.assigned_to_me) return res.status(403).json({ error: 'Bạn không thể cập nhật công việc này.' });
  const nextStatus = String(req.body.status || '');
  const allowedTransitions = { todo: ['in_progress'], in_progress: ['todo'] };
  if (!allowedTransitions[task.status]?.includes(nextStatus)) {
    return res.status(400).json({ error: 'Chuyển sang "Chờ duyệt" hoặc "Hoàn thành" phải qua bước nộp nghiệm thu.' });
  }
  await db.execute('UPDATE tasks SET status=? WHERE id=?', [nextStatus, req.params.id]);
  res.json({ ok: true });
}));

router.post('/api/tasks/:id/checklist', auth, asyncRoute(async (req, res) => {
  const { task, allowed } = await canTouchTask(context, req, req.params.id);
  if (!task) return res.status(404).json({ error: 'Không tìm thấy công việc.' });
  if (!allowed) return res.status(403).json({ error: 'Bạn không thể chỉnh sửa việc con của công việc này.' });
  const title = String(req.body.title || '').trim();
  if (!title) return res.status(400).json({ error: 'Nội dung việc con là bắt buộc.' });
  const [[{ next }]] = await db.query('SELECT COALESCE(MAX(sort_order),0)+1 next FROM task_checklists WHERE task_id=?', [req.params.id]);
  const [result] = await db.execute('INSERT INTO task_checklists(task_id,title,sort_order) VALUES(?,?,?)', [req.params.id, title, next]);
  res.status(201).json({ id: result.insertId });
}));

router.patch('/api/tasks/:id/checklist/:itemId', auth, asyncRoute(async (req, res) => {
  const { task, allowed } = await canTouchTask(context, req, req.params.id);
  if (!task) return res.status(404).json({ error: 'Không tìm thấy công việc.' });
  if (!allowed) return res.status(403).json({ error: 'Bạn không thể chỉnh sửa việc con của công việc này.' });
  const isDone = req.body.is_done === true || req.body.is_done === 'true';
  const [result] = await db.execute(
    'UPDATE task_checklists SET is_done=?,done_by=?,done_at=? WHERE id=? AND task_id=?',
    [isDone, isDone ? req.session.user.id : null, isDone ? new Date() : null, req.params.itemId, req.params.id]
  );
  if (!result.affectedRows) return res.status(404).json({ error: 'Không tìm thấy việc con.' });
  res.json({ ok: true });
}));

router.delete('/api/tasks/:id/checklist/:itemId', auth, asyncRoute(async (req, res) => {
  const { task, allowed } = await canTouchTask(context, req, req.params.id);
  if (!task) return res.status(404).json({ error: 'Không tìm thấy công việc.' });
  if (!allowed) return res.status(403).json({ error: 'Bạn không thể chỉnh sửa việc con của công việc này.' });
  await db.execute('DELETE FROM task_checklists WHERE id=? AND task_id=?', [req.params.itemId, req.params.id]);
  res.json({ ok: true });
}));

router.post('/api/tasks/:id/submit-review', auth, taskUpload.single('file'), asyncRoute(async (req, res) => {
  const { task, allowed } = await canTouchTask(context, req, req.params.id);
  if (!task) return res.status(404).json({ error: 'Không tìm thấy công việc.' });
  if (!task.assigned_to_me) return res.status(403).json({ error: 'Chỉ người được giao việc mới có thể nộp nghiệm thu.' });
  if (!['todo', 'in_progress'].includes(task.status)) return res.status(409).json({ error: 'Công việc này không ở trạng thái có thể nộp nghiệm thu.' });
  try {
    const created = await createAttachment(context, { taskId: task.id, userId: req.session.user.id, kind: 'deliverable', label: req.body.notes, linkUrl: String(req.body.link_url || '').trim(), file: req.file });
    await db.execute("UPDATE tasks SET status='review',submitted_for_review_at=NOW() WHERE id=?", [req.params.id]);
    try {
      const [[reviewers]] = await Promise.all([
        db.query("SELECT DISTINCT u.id,u.name,u.email FROM users u JOIN user_teams ut ON ut.user_id=u.id WHERE ut.team_id=? AND (ut.is_lead=1 OR ut.is_vice_lead=1)", [task.team_id])
      ]);
      for (const reviewer of reviewers) mailer.notifyTaskSubmittedForReview(reviewer, task, req.session.user.name);
    } catch (error) { logger.error(`Unable to prepare task ${req.params.id} review notifications.`, error); }
    res.status(201).json(created);
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    throw error;
  }
}));

router.post('/api/tasks/:id/review', auth, asyncRoute(async (req, res) => {
  const { task } = await canTouchTask(context, req, req.params.id);
  if (!task) return res.status(404).json({ error: 'Không tìm thấy công việc.' });
  if (!(await canReviewTask(req.session.user, task))) return res.status(403).json({ error: 'Bạn không thể nghiệm thu công việc này.' });
  if (task.status !== 'review') return res.status(409).json({ error: 'Công việc chưa được nộp để nghiệm thu.' });
  const decision = String(req.body.decision || '');
  const feedback = String(req.body.feedback || '').trim();
  if (!['approve', 'reject', 'cancel'].includes(decision)) return res.status(400).json({ error: 'Vui lòng chọn "Duyệt đạt", "Yêu cầu làm lại" hoặc "Bác bỏ".' });
  if ((decision === 'reject' || decision === 'cancel') && !feedback) {
    return res.status(400).json({ error: decision === 'cancel' ? 'Vui lòng nêu rõ lý do khi bác bỏ.' : 'Vui lòng nêu rõ lý do khi yêu cầu làm lại.' });
  }
  const nextStatus = decision === 'approve' ? 'done' : decision === 'cancel' ? 'cancelled' : 'in_progress';
  const completeSql = decision === 'approve' ? ',completed_at=NOW()' : '';
  await db.execute(`UPDATE tasks SET status=?,reviewed_by=?,reviewed_at=NOW(),review_feedback=?${completeSql} WHERE id=?`, [nextStatus, req.session.user.id, feedback || null, req.params.id]);
  const actionText = decision === 'approve'
    ? `Đã duyệt đạt.${feedback ? ` ${feedback}` : ''}`
    : decision === 'cancel'
    ? `Đã bác bỏ: ${feedback}`
    : `Yêu cầu làm lại: ${feedback}`;
  await db.execute(
    "INSERT INTO updates(activity_id,task_id,user_id,body,kind) VALUES(?,?,?,?,'review_note')",
    [task.activity_id, task.id, req.session.user.id, actionText]
  );
  try {
    const [assignees] = await db.query('SELECT u.id,u.name,u.email FROM task_assignees ta JOIN users u ON u.id=ta.user_id WHERE ta.task_id=?', [req.params.id]);
    for (const assignedUser of assignees) mailer.notifyTaskReviewed(assignedUser, task, decision, feedback, req.session.user.name);
  } catch (error) { logger.error(`Unable to prepare task ${req.params.id} review-result notifications.`, error); }
  res.json({ ok: true, status: nextStatus });
}));

router.post('/api/tasks/:id/cancel', auth, asyncRoute(async (req, res) => {
  const { task } = await canTouchTask(context, req, req.params.id);
  if (!task) return res.status(404).json({ error: 'Không tìm thấy công việc.' });
  if (task.status === 'done') return res.status(409).json({ error: 'Không thể hủy công việc đã hoàn thành.' });
  if (task.status === 'cancelled') return res.status(409).json({ error: 'Công việc này đã bị hủy.' });

  const manages = await canManageTeam(req.session.user, task.team_id);
  const isExec = isExecutive && isExecutive(req.session.user);
  const isSelfLoggedOwner = Boolean(task.is_self_logged && (Number(task.assigned_by) === Number(req.session.user.id) || !!task.assigned_to_me));

  if (!isSelfLoggedOwner && !manages && !isExec) {
    return res.status(403).json({ error: 'Bạn không có quyền hủy công việc này.' });
  }

  await db.execute("UPDATE tasks SET status='cancelled' WHERE id=?", [req.params.id]);
  const cancelNote = isSelfLoggedOwner
    ? `${req.session.user.name} đã rút lại công việc tự ghi nhận này.`
    : `${req.session.user.name} đã hủy công việc này.`;
  await db.execute(
    "INSERT INTO updates(activity_id,task_id,user_id,body,kind) VALUES(?,?,?,?,'progress')",
    [task.activity_id, task.id, req.session.user.id, cancelNote]
  );
  res.json({ ok: true, status: 'cancelled' });
}));

  return router;
}

module.exports = { createTaskRoutes };
