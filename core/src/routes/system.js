const express = require('express');
const { findOrCreateHustAccount } = require('../auth/hust-account');
const { classifyHustEmail, studentCohortFromEmail, withHustIdentity } = require('../auth/hust-identity');
const { sessionView } = require('../middleware/unit-context');
const { ensureDycAdmins } = require('../units/memberships');
const { devopsEmailAllowlist } = require('../middleware/auth');

function createSystemRoutes(context) {
  const { db, auth, admin, manager, isLeadership, isExecutive, asyncRoute, validHttpUrl, one, ids, activityScope, leadsTeam, belongsToTeam, canManageTeam, managedTeamIds, canManageUser, canManageActivity, visibleActivity, bcrypt, ExcelJS, packageInfo, microsoftSso, logger, emailEvents, push, taskUpload, attachmentKinds, allowedExtensions, attachmentRoot, path, fs, crypto } = context;
  const router = express.Router();

router.get('/api/session',(req,res)=>{const view=sessionView(req);res.json({...view,user:withHustIdentity(view.user)})});
router.post('/api/session/unit',auth,(req,res)=>{const unitId=Number(req.body.unit_id);const m=req.memberships.find(x=>x.unit_id===unitId);if(!m)return res.status(403).json({error:'Bạn không thuộc đơn vị này.'});req.session.current_unit_id=unitId;req.unit={id:m.unit_id,code:m.code,name:m.name,kind:m.kind};req.unitRole=m.role;const view=sessionView(req);res.json({...view,user:withHustIdentity(view.user)})});
router.use('/auth/microsoft/callback',(_req,res,next)=>{res.type('text/plain');next()});
router.get('/auth/microsoft',(req,res)=>{if(!microsoftSso?.clientId||!microsoftSso?.clientSecret)return res.status(503).send('Microsoft SSO is not configured. Set AZURE_CLIENT_ID and AZURE_CLIENT_SECRET.');const state=crypto.randomBytes(32).toString('hex');req.session.microsoftSsoState=state;const query=new URLSearchParams({client_id:microsoftSso.clientId,response_type:'code',redirect_uri:microsoftSso.redirectUri,response_mode:'query',scope:'openid profile email',state,prompt:'select_account',domain_hint:microsoftSso.allowedDomain});res.redirect(`https://login.microsoftonline.com/${encodeURIComponent(microsoftSso.tenant)}/oauth2/v2.0/authorize?${query}`)});
router.get('/auth/microsoft/callback',asyncRoute(async(req,res)=>{const state=String(req.query.state||''),expected=String(req.session.microsoftSsoState||'');delete req.session.microsoftSsoState;if(!state||!expected||state.length!==expected.length||!crypto.timingSafeEqual(Buffer.from(state),Buffer.from(expected)))return res.status(400).send('Invalid or expired Microsoft sign-in state.');if(req.query.error)return res.status(401).send(`Microsoft sign-in failed: ${String(req.query.error_description||req.query.error)}`);const code=String(req.query.code||'');if(!code)return res.status(400).send('Microsoft did not return an authorization code.');const tokenResponse=await fetch(`https://login.microsoftonline.com/${encodeURIComponent(microsoftSso.tenant)}/oauth2/v2.0/token`,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:microsoftSso.clientId,client_secret:microsoftSso.clientSecret,code,redirect_uri:microsoftSso.redirectUri,grant_type:'authorization_code',scope:'openid profile email'})});const tokens=await tokenResponse.json();if(!tokenResponse.ok||!tokens.access_token){logger.error('Microsoft token exchange failed.',{status:tokenResponse.status,error:tokens.error});return res.status(401).send('Microsoft sign-in could not be completed.')}const profileResponse=await fetch('https://graph.microsoft.com/oidc/userinfo',{headers:{Authorization:`Bearer ${tokens.access_token}`}}),profile=await profileResponse.json();if(!profileResponse.ok)return res.status(401).send('Microsoft account information could not be read.');const email=String(profile.email||profile.preferred_username||'').trim().toLowerCase();if(!classifyHustEmail(email))return res.status(403).send('Only @hust.edu.vn and @sis.hust.edu.vn accounts may sign in.');const user=await findOrCreateHustAccount({db,bcrypt,crypto},email,profile);if(!user)return res.status(403).send('Your Activity Hub account has been deactivated. Please contact an administrator.');if(devopsEmailAllowlist().includes(email))await ensureDycAdmins(db,[email]);req.session.user=user;res.redirect('/')}));
router.get('/api/push/config',auth,(_req,res)=>{res.set('Cache-Control','no-store');res.json({enabled:push.enabled,appId:push.enabled?push.appId:null})});
router.get('/api/version',(_req,res)=>{res.set('Cache-Control','no-store');res.json({version:packageInfo.version,build:'2026-08-23.4'})});
router.get('/api/health',asyncRoute(async(_req,res)=>{try{await db.query('SELECT 1');res.json({status:'ok'})}catch(error){logger.error('Database health check failed.',error);throw error}}));
router.post('/api/email/test',auth,admin,asyncRoute(async(req,res)=>{const to=String(req.body.to||'').trim().toLowerCase();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)||to.length>254)return res.status(400).json({error:'Vui lòng nhập địa chỉ email hợp lệ.'});try{const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);const requestedBy=escapeHtml(req.session.user.name||'Quản trị viên');const checkedAt=new Intl.DateTimeFormat('vi-VN',{dateStyle:'full',timeStyle:'medium',timeZone:'Asia/Ho_Chi_Minh'}).format(new Date());const result=await emailEvents.sendRaw(db,{to,subject:'[TCKT - Activity Hub] Kiểm tra thông báo email',html:`<div lang="vi" style="font-family:Arial,sans-serif;max-width:620px;margin:auto;color:#1f2937"><h2 style="color:#1e3a8a">Email thông báo đang hoạt động</h2><p>Xin chào,</p><p>${requestedBy} vừa thực hiện kiểm tra gửi email từ TCKT Activity Hub.</p><p>Nếu bạn nhận được email này, cấu hình SMTP của máy chủ đang hoạt động bình thường.</p><p>Người thực hiện kiểm tra: ${requestedBy}<br>Thời gian kiểm tra: ${checkedAt}</p></div>`});res.json({ok:true,to,message_id:result.messageId})}catch(error){res.status(502).json({error:`Không thể gửi email kiểm tra: ${error.response||error.message||'Lỗi không xác định'}`})}}));
router.post('/api/login',asyncRoute(async(req,res)=>{const email=String(req.body.email||'').trim().toLowerCase();const [rows]=await db.execute('SELECT id,name,email,password_hash,role,phone,class_number,faculty_notice_acknowledged_at,avatar_color,is_devops FROM users WHERE email=? AND is_active=1',[email]);const user=one(rows);if(!user||!(await bcrypt.compare(String(req.body.password||''),user.password_hash)))return res.status(401).json({error:'Email or password is incorrect.'});delete user.password_hash;if(devopsEmailAllowlist().includes(email))await ensureDycAdmins(db,[email]);req.session.user=user;res.json({user:withHustIdentity(user)})}));
router.post('/api/logout',(req,res,next)=>req.session.destroy(err=>err?next(err):res.json({ok:true})));
router.post('/api/onboarding/faculty-notice',auth,asyncRoute(async(req,res)=>{if(classifyHustEmail(req.session.user.email)!=='faculty')return res.status(403).json({error:'This notice is only for HUST staff and faculty accounts.'});await db.execute('UPDATE users SET faculty_notice_acknowledged_at=NOW() WHERE id=?',[req.session.user.id]);req.session.user.faculty_notice_acknowledged_at=new Date().toISOString();res.json({user:withHustIdentity(req.session.user)})}));
router.post('/api/onboarding/student-class',auth,asyncRoute(async(req,res)=>{if(classifyHustEmail(req.session.user.email)!=='student')return res.status(403).json({error:'This information is only for HUST student accounts.'});const classNumber=String(req.body.class_number||'').trim().replace(/\s+/g,' ');if(!classNumber||classNumber.length>100)return res.status(400).json({error:'Class number is required and must not exceed 100 characters.'});const cohort=studentCohortFromEmail(req.session.user.email);if(!cohort)return res.status(400).json({error:'The entrance year could not be inferred from this student email address.'});await db.execute('UPDATE users SET class_number=? WHERE id=?',[classNumber,req.session.user.id]);req.session.user.class_number=classNumber;res.json({user:withHustIdentity(req.session.user)})}));
router.patch('/api/account',auth,asyncRoute(async(req,res)=>{const email=String(req.body.email||'').trim().toLowerCase(),phone=String(req.body.phone||'').trim(),avatarColor=String(req.body.avatar_color||'');if(!email||!/^#[0-9a-f]{6}$/i.test(avatarColor))return res.status(400).json({error:'A valid email and avatar color are required.'});const values=[email,phone||null,avatarColor],sets=['email=?','phone=?','avatar_color=?'];if(req.body.password){if(String(req.body.password).length<8)return res.status(400).json({error:'Password must contain at least 8 characters.'});sets.push('password_hash=?');values.push(await bcrypt.hash(String(req.body.password),10))}values.push(req.session.user.id);await db.execute(`UPDATE users SET ${sets.join(',')} WHERE id=?`,values);Object.assign(req.session.user,{email,phone:phone||null,avatar_color:avatarColor});res.json({user:withHustIdentity(req.session.user)})}));

router.get('/api/bootstrap',auth,asyncRoute(async(req,res)=>{
  const user=req.actor,s=activityScope(user);
  const taskScope=isExecutive(user)?'1=1':isLeadership(user)?`(EXISTS(SELECT 1 FROM user_teams x WHERE x.user_id=? AND x.team_id=t.team_id AND (x.is_lead=1 OR x.is_vice_lead=1)) OR EXISTS(SELECT 1 FROM task_assignees x WHERE x.task_id=t.id AND x.user_id=?))`:`EXISTS(SELECT 1 FROM task_assignees x WHERE x.task_id=t.id AND x.user_id=?)`;
  const taskParams=isExecutive(user)?[]:isLeadership(user)?[user.id,user.id]:[user.id];
  const [[statRows],[upcoming],[tasks],[activity],[teams]]=await Promise.all([
    db.execute(`SELECT COUNT(DISTINCT CASE WHEN a.status IN ('approved','active') THEN a.id END) activeActivities,COUNT(DISTINCT CASE WHEN t.status NOT IN ('done','cancelled') THEN t.id END) openTasks,COUNT(DISTINCT CASE WHEN t.status NOT IN ('done','cancelled') AND t.deadline<CURDATE() THEN t.id END) overdueTasks,COUNT(DISTINCT CASE WHEN t.status='done' AND MONTH(t.completed_at)=MONTH(CURDATE()) AND YEAR(t.completed_at)=YEAR(CURDATE()) THEN t.id END) completedMonth FROM activities a LEFT JOIN tasks t ON t.activity_id=a.id WHERE ${s.sql}`,s.params),
    db.execute(`SELECT a.*,te.name team_name,te.color team_color,GROUP_CONCAT(DISTINCT involved.name ORDER BY involved.name SEPARATOR ', ') team_names,COUNT(DISTINCT t.id) task_count,COUNT(DISTINCT CASE WHEN t.status='done' THEN t.id END) done_count,COUNT(DISTINCT p.user_id) participant_count FROM activities a JOIN teams te ON te.id=a.team_id JOIN activity_teams ats ON ats.activity_id=a.id JOIN teams involved ON involved.id=ats.team_id LEFT JOIN tasks t ON t.activity_id=a.id LEFT JOIN participants p ON p.activity_id=a.id AND p.state='confirmed' WHERE a.status IN ('proposed','approved','active') AND ${s.sql} GROUP BY a.id ORDER BY a.deadline LIMIT 5`,s.params),
    db.execute(`SELECT t.*,a.title activity_title,te.name team_name,GROUP_CONCAT(DISTINCT u.name ORDER BY u.name SEPARATOR ', ') assignee_name,GROUP_CONCAT(DISTINCT u.id ORDER BY u.id) assignee_ids FROM tasks t JOIN activities a ON a.id=t.activity_id JOIN teams te ON te.id=t.team_id LEFT JOIN task_assignees ta ON ta.task_id=t.id LEFT JOIN users u ON u.id=ta.user_id WHERE ${taskScope} AND t.status NOT IN ('done','cancelled') GROUP BY t.id ORDER BY t.deadline LIMIT 100`,taskParams),
    db.execute(`SELECT n.body,n.kind,n.created_at,usr.name user_name,usr.avatar_color,a.title activity_title,a.id activity_id FROM updates n JOIN users usr ON usr.id=n.user_id JOIN activities a ON a.id=n.activity_id WHERE ${s.sql} ORDER BY n.created_at DESC LIMIT 7`,s.params),
    db.execute(`SELECT t.*,EXISTS(SELECT 1 FROM user_teams ux WHERE ux.team_id=t.id AND ux.user_id=? AND (ux.is_lead=1 OR ux.is_vice_lead=1)) can_manage FROM teams t WHERE t.is_active=1 ORDER BY t.sort_order,t.name`,[user.id])
  ]);
  res.json({stats:one(statRows),upcoming,tasks,activity,teams,capabilities:{canCreateActivity:isExecutive(user)||isLeadership(user),canCreateAccount:isExecutive(user)}})
}));

router.get('/api/my-tasks-today', auth, asyncRoute(async (req, res) => {
  const user = req.actor;
  const [[dueToday], [overdue], [pendingMyReview]] = await Promise.all([
    db.execute(
      `SELECT t.*,a.title activity_title FROM tasks t JOIN activities a ON a.id=t.activity_id JOIN task_assignees ta ON ta.task_id=t.id
       WHERE ta.user_id=? AND t.status NOT IN ('done','cancelled') AND DATE(t.deadline)=CURDATE() ORDER BY t.priority DESC`,
      [user.id]
    ),
    db.execute(
      `SELECT t.*,a.title activity_title FROM tasks t JOIN activities a ON a.id=t.activity_id JOIN task_assignees ta ON ta.task_id=t.id
       WHERE ta.user_id=? AND t.status NOT IN ('done','cancelled') AND t.deadline<CURDATE() ORDER BY t.deadline`,
      [user.id]
    ),
    db.execute(
      `SELECT DISTINCT t.*,a.title activity_title FROM tasks t JOIN activities a ON a.id=t.activity_id
       WHERE t.status='review' AND (? = 1 OR t.team_id IN (SELECT team_id FROM user_teams WHERE user_id=? AND (is_lead=1 OR is_vice_lead=1)) OR a.event_lead_id=?)
       ORDER BY t.submitted_for_review_at`,
      [isExecutive(user) ? 1 : 0, user.id, user.id]
    )
  ]);
  res.json({ dueToday, overdue, pendingMyReview });
}));

router.get('/api/weight-presets', auth, asyncRoute(async (_req, res) => {
  const [rows] = await db.execute('SELECT id, label AS name, points, description, sort_order, is_active FROM weight_presets WHERE is_active=1 ORDER BY sort_order ASC, points ASC, id ASC');
  res.json(rows);
}));

router.get('/api/admin/weight-presets', auth, admin, asyncRoute(async (_req, res) => {
  const [rows] = await db.execute('SELECT id, label AS name, points, description, sort_order, is_active FROM weight_presets ORDER BY sort_order ASC, points ASC, id ASC');
  res.json(rows);
}));

router.post('/api/admin/weight-presets', auth, admin, asyncRoute(async (req, res) => {
  const name = String(req.body.name || '').trim();
  const points = Number(req.body.points);
  const sortOrder = Number(req.body.sort_order || 0);
  const description = req.body.description ? String(req.body.description).trim() : null;
  if (!name) return res.status(400).json({ error: 'Tên preset không được để trống.' });
  if (isNaN(points) || points < 0 || points > 10) {
    return res.status(400).json({ error: 'Điểm trọng số phải là số từ 0 đến 10.' });
  }
  const [result] = await db.execute('INSERT INTO weight_presets(label, points, description, sort_order, is_active) VALUES(?, ?, ?, ?, 1)', [name, points, description, sortOrder]);
  res.status(201).json({ id: result.insertId, name, points, description, sort_order: sortOrder, is_active: 1 });
}));

router.patch('/api/admin/weight-presets/:id', auth, admin, asyncRoute(async (req, res) => {
  const [existing] = await db.execute('SELECT * FROM weight_presets WHERE id=?', [req.params.id]);
  const preset = one(existing);
  if (!preset) return res.status(404).json({ error: 'Preset không tồn tại.' });

  const name = req.body.name !== undefined ? String(req.body.name).trim() : preset.label;
  if (!name) return res.status(400).json({ error: 'Tên preset không được để trống.' });

  let points = preset.points;
  if (req.body.points !== undefined) {
    points = Number(req.body.points);
    if (isNaN(points) || points < 0 || points > 10) {
      return res.status(400).json({ error: 'Điểm trọng số phải là số từ 0 đến 10.' });
    }
  }

  const description = req.body.description !== undefined ? (String(req.body.description).trim() || null) : preset.description;
  const sortOrder = req.body.sort_order !== undefined ? Number(req.body.sort_order) : preset.sort_order;
  const isActive = req.body.is_active !== undefined ? (req.body.is_active ? 1 : 0) : preset.is_active;

  await db.execute('UPDATE weight_presets SET label=?, points=?, description=?, sort_order=?, is_active=? WHERE id=?', [name, points, description, sortOrder, isActive, req.params.id]);
  res.json({ ok: true, id: Number(req.params.id), name, points, description, sort_order: sortOrder, is_active: isActive });
}));

router.delete('/api/admin/weight-presets/:id', auth, admin, asyncRoute(async (req, res) => {
  const [result] = await db.execute('DELETE FROM weight_presets WHERE id=?', [req.params.id]);
  if (!result.affectedRows) return res.status(404).json({ error: 'Preset không tồn tại.' });
  res.json({ ok: true, deleted: true });
}));

  return router;
}

module.exports = { createSystemRoutes };
