const express = require('express');
const { syncTcktMembershipFromRole, hasMembershipOutsideTckt, hasDycMembership } = require('../units/memberships');

function createUserRoutes(context) {
  const { db, auth, admin, manager, isLeadership, isExecutive, asyncRoute, validHttpUrl, one, ids, activityScope, leadsTeam, belongsToTeam, canManageTeam, managedTeamIds, canManageUser, canManageActivity, visibleActivity, bcrypt, ExcelJS, packageInfo, logger, push, taskUpload, attachmentKinds, allowedExtensions, attachmentRoot, path, fs, crypto } = context;
  const router = express.Router();

router.get('/api/people',auth,asyncRoute(async(req,res)=>{
  let scope='1=1',params=[];
  if(!isExecutive(req.actor)){
    if(isLeadership(req.actor)){
      scope='EXISTS(SELECT 1 FROM user_teams mine JOIN user_teams theirs ON theirs.team_id=mine.team_id WHERE mine.user_id=? AND (mine.is_lead=1 OR mine.is_vice_lead=1) AND theirs.user_id=u.id)';
      params=[req.actor.id];
    } else {
      scope='u.id=?';
      params=[req.actor.id];
    }
  }
  const [rows]=await db.execute(`SELECT u.id,u.name,u.email,u.role,u.phone,u.avatar_color,u.auth_provider,u.is_active,GROUP_CONCAT(DISTINCT t.name ORDER BY t.name SEPARATOR ', ') teams,GROUP_CONCAT(DISTINCT t.id ORDER BY t.id) team_ids,COUNT(DISTINCT CASE WHEN tk.status='done' THEN tk.id END) completed_tasks FROM users u LEFT JOIN user_teams ut ON ut.user_id=u.id LEFT JOIN teams t ON t.id=ut.team_id LEFT JOIN task_assignees ta ON ta.user_id=u.id LEFT JOIN tasks tk ON tk.id=ta.task_id WHERE u.is_active=1 AND ${scope} GROUP BY u.id ORDER BY FIELD(u.role,'admin','vice_admin','leader','vice_leader','member'),u.name`,params);
  for(const row of rows)row.can_manage=await canManageUser(req.actor,row.id);
  res.json(rows)
}));

router.post('/api/users', auth, manager, asyncRoute(async (req, res) => {
  let { name, email, password, role, phone } = req.body;
  const authProvider = req.body.auth_provider === 'microsoft' ? 'microsoft' : 'local';
  const teamIds = ids(req.body.team_ids), allowedTeams = await managedTeamIds(req.actor);
  if (isLeadership(req.actor)) role = 'member';
  if (!name || !email || !['admin', 'vice_admin', 'leader', 'vice_leader', 'member'].includes(role)) {
    return res.status(400).json({ error: 'Tên, email và vai trò là bắt buộc.' });
  }
  if (authProvider === 'local' && !password) {
    return res.status(400).json({ error: 'Mật khẩu là bắt buộc đối với tài khoản đăng nhập cục bộ.' });
  }
  if (authProvider === 'local' && password.length < 8) {
    return res.status(400).json({ error: 'Mật khẩu phải có ít nhất 8 ký tự.' });
  }
  if (role === 'member' && !teamIds.length) {
    return res.status(400).json({ error: 'Thành viên phải thuộc ít nhất một ban/đội.' });
  }
  if (isLeadership(req.actor) && teamIds.some(id => !allowedTeams.includes(id))) {
    return res.status(403).json({ error: 'Trưởng/phó ban chỉ có thể tạo tài khoản trong ban mình phụ trách.' });
  }
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const hash = authProvider === 'microsoft'
      ? await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10)
      : await bcrypt.hash(password, 10);
    const [result] = await conn.execute(
      'INSERT INTO users(name,email,password_hash,role,auth_provider,phone) VALUES(?,?,?,?,?,?)',
      [name, String(email).trim().toLowerCase(), hash, role, authProvider, phone || null]
    );
    for (const teamId of teamIds) await conn.execute('INSERT INTO user_teams(user_id,team_id,is_lead,is_vice_lead) VALUES(?,?,?,?)', [result.insertId, teamId, role === 'leader', role === 'vice_leader']);
    await conn.commit();
    await syncTcktMembershipFromRole(db, result.insertId, { create: true });
    res.status(201).json({ id: result.insertId });
  } catch (e) { await conn.rollback(); throw e; } finally { conn.release(); }
}));
router.post('/api/users/bulk-import', auth, admin, asyncRoute(async (req, res) => {
  const rows = Array.isArray(req.body.rows) ? req.body.rows : [];
  if (!rows.length) return res.status(400).json({ error: 'Danh sách thành viên trống.' });
  let created = 0, skipped = 0;
  for (const row of rows) {
    const name = String(row.name || '').trim().slice(0, 120);
    const email = String(row.email || '').trim().toLowerCase();
    const teamIds = ids(row.team_ids);
    if (!name || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { skipped += 1; continue; }
    const [existing] = await db.execute('SELECT 1 FROM users WHERE email=?', [email]);
    if (existing.length) { skipped += 1; continue; }
    const hash = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10);
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      const [result] = await conn.execute("INSERT INTO users(name,email,password_hash,role,auth_provider) VALUES(?,?,?,'member','microsoft')", [name, email, hash]);
      for (const teamId of teamIds) await conn.execute('INSERT INTO user_teams(user_id,team_id) VALUES(?,?)', [result.insertId, teamId]);
      await conn.commit();
      await syncTcktMembershipFromRole(db, result.insertId, { create: true });
      created += 1;
    } catch (e) { await conn.rollback(); skipped += 1; } finally { conn.release(); }
  }
  res.json({ ok: true, created, skipped });
}));
const outsideUnitGuard=async(req,res)=>{if(hasDycMembership(req.memberships)||!(await hasMembershipOutsideTckt(db,req.params.id)))return false;res.status(403).json({error:'Tài khoản này thuộc đơn vị khác ngoài TCKT — chỉ DYC được sửa hoặc xoá.'});return true};
router.patch('/api/users/:id',auth,manager,asyncRoute(async(req,res)=>{if(await outsideUnitGuard(req,res))return;if(!(await canManageUser(req.actor,req.params.id)))return res.status(403).json({error:'You cannot edit this account.'});const [targetRows]=await db.execute('SELECT * FROM users WHERE id=?',[req.params.id]);const target=one(targetRows);if(!target)return res.status(404).json({error:'Account not found.'});let role=req.body.role||target.role,teamIds=ids(req.body.team_ids),allowedTeams=await managedTeamIds(req.actor);if(role&&!['admin','vice_admin','leader','vice_leader','member'].includes(role))return res.status(400).json({error:'Vai trò không hợp lệ.'});if(isLeadership(req.actor)){role='member';if(teamIds.some(id=>!allowedTeams.includes(id))||!teamIds.some(id=>allowedTeams.includes(id)))return res.status(403).json({error:'The account must remain in at least one team you lead.'})}if(role==='member'&&!teamIds.length)return res.status(400).json({error:'A member must belong to at least one team.'});const email=String(req.body.email||target.email).trim().toLowerCase(),name=String(req.body.name||target.name).trim(),phone=String(req.body.phone||'').trim(),avatarColor=String(req.body.avatar_color||target.avatar_color);if(!name||!email||!/^#[0-9a-f]{6}$/i.test(avatarColor))return res.status(400).json({error:'Name, email and a valid avatar color are required.'});const conn=await db.getConnection();try{await conn.beginTransaction();const sets=['name=?','email=?','role=?','phone=?','avatar_color=?','is_active=?'],values=[name,email,role,phone||null,avatarColor,req.body.is_active===false?0:1];if(req.body.password){if(String(req.body.password).length<8)return res.status(400).json({error:'Password must contain at least 8 characters.'});sets.push('password_hash=?');values.push(await bcrypt.hash(String(req.body.password),10))}values.push(req.params.id);await conn.execute(`UPDATE users SET ${sets.join(',')} WHERE id=?`,values);if(isExecutive(req.actor))await conn.execute('DELETE FROM user_teams WHERE user_id=?',[req.params.id]);else await conn.execute(`DELETE ut FROM user_teams ut JOIN user_teams mine ON mine.team_id=ut.team_id AND mine.user_id=? AND (mine.is_lead=1 OR mine.is_vice_lead=1) WHERE ut.user_id=?`,[req.actor.id,req.params.id]);for(const teamId of teamIds)await conn.execute('INSERT INTO user_teams(user_id,team_id,is_lead,is_vice_lead) VALUES(?,?,?,?) ON DUPLICATE KEY UPDATE is_lead=VALUES(is_lead),is_vice_lead=VALUES(is_vice_lead)',[req.params.id,teamId,role==='leader',role==='vice_leader']);await conn.commit();await syncTcktMembershipFromRole(db,req.params.id);res.json({ok:true})}catch(e){await conn.rollback();throw e}finally{conn.release()}}));
router.delete('/api/users/:id',auth,manager,asyncRoute(async(req,res)=>{if(await outsideUnitGuard(req,res))return;if(Number(req.params.id)===Number(req.actor.id))return res.status(400).json({error:'You cannot delete your own signed-in account.'});if(!(await canManageUser(req.actor,req.params.id)))return res.status(403).json({error:'You cannot delete this account.'});if(isLeadership(req.actor)){await db.execute('DELETE ut FROM user_teams ut JOIN user_teams mine ON mine.team_id=ut.team_id AND mine.user_id=? AND (mine.is_lead=1 OR mine.is_vice_lead=1) WHERE ut.user_id=?',[req.actor.id,req.params.id]);const [remaining]=await db.execute('SELECT 1 FROM user_teams WHERE user_id=? LIMIT 1',[req.params.id]);if(remaining.length)return res.json({ok:true,deleted:false,removed_from_managed_teams:true})}try{const [result]=await db.execute('DELETE FROM users WHERE id=?',[req.params.id]);if(!result.affectedRows)return res.status(404).json({error:'Account not found.'});res.json({ok:true,deleted:true})}catch(error){if(error.code!=='ER_ROW_IS_REFERENCED_2')throw error;await db.execute('UPDATE users SET is_active=0 WHERE id=?',[req.params.id]);res.json({ok:true,deleted:false,deactivated:true})}}));

  return router;
}

module.exports = { createUserRoutes };
