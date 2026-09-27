const express = require('express');
const { createAttachment } = require('../services/task-attachments');

function createActivityRoutes(context) {
  const { db, auth, admin, manager, managerOrEventLead, isLeadership, isExecutive, asyncRoute, validHttpUrl, one, ids, activityScope, leadsTeam, belongsToTeam, canManageTeam, managedTeamIds, canManageUser, canManageActivity, visibleActivity, bcrypt, ExcelJS, packageInfo, logger, mailer, push, taskUpload, attachmentKinds, allowedExtensions, attachmentRoot, path, fs, crypto } = context;
  const router = express.Router();

  async function hardDeleteActivity(activityId, actorId, reason) {
    const conn = await db.getConnection();
    let activity, storedNames = [];
    try {
      await conn.beginTransaction();
      const [activities] = await conn.execute('SELECT id,title FROM activities WHERE id=? FOR UPDATE', [activityId]);
      activity = one(activities);
      if (!activity) { await conn.rollback(); return null; }
      const [attachments] = await conn.execute('SELECT x.stored_name FROM task_attachments x JOIN tasks t ON t.id=x.task_id WHERE t.activity_id=? AND x.stored_name IS NOT NULL', [activityId]);
      storedNames = attachments.map(item => path.basename(item.stored_name)).filter(Boolean);
      await conn.execute('DELETE FROM updates WHERE activity_id=?', [activityId]);
      await conn.execute('DELETE x FROM task_attachments x JOIN tasks t ON t.id=x.task_id WHERE t.activity_id=?', [activityId]);
      await conn.execute('DELETE ta FROM task_assignees ta JOIN tasks t ON t.id=ta.task_id WHERE t.activity_id=?', [activityId]);
      await conn.execute('DELETE FROM tasks WHERE activity_id=?', [activityId]);
      await conn.execute('DELETE FROM participants WHERE activity_id=?', [activityId]);
      await conn.execute('DELETE FROM activity_teams WHERE activity_id=?', [activityId]);
      await conn.execute('DELETE FROM activities WHERE id=?', [activityId]);
      await conn.commit();
    } catch (error) { await conn.rollback(); throw error; } finally { conn.release(); }
    const cleanup = await Promise.allSettled(storedNames.map(name => fs.promises.unlink(path.join(attachmentRoot, name)).catch(error => { if (error.code !== 'ENOENT') throw error; })));
    const failures = cleanup.filter(result => result.status === 'rejected');
    if (failures.length) logger.error(`Activity ${activityId} was hard-deleted but ${failures.length} attachment files could not be removed.`, failures.map(result => result.reason));
    logger.info(`Activity ${activityId} hard-deleted (${reason}) by user ${actorId}.`, { title: activity.title, attachmentFiles: storedNames.length, cleanupFailures: failures.length });
    return activity;
  }

router.patch('/api/activities/:id',auth,managerOrEventLead,asyncRoute(async(req,res,next)=>{if(!Object.hasOwn(req.body,'is_public')&&!Object.hasOwn(req.body,'public_image_url'))return next();if(!(await canManageActivity(req.session.user,req.params.id)))return res.status(403).json({error:'You cannot manage this activity.'});const publicImageUrl=String(req.body.public_image_url||'').trim();if(!validHttpUrl(publicImageUrl))return res.status(400).json({error:'The public image must be a valid http:// or https:// link.'});const isPublic=req.body.is_public===true||req.body.is_public==='true'||req.body.is_public==='on';await db.execute('UPDATE activities SET is_public=?,public_image_url=? WHERE id=?',[isPublic,publicImageUrl||null,req.params.id]);delete req.body.is_public;delete req.body.public_image_url;if(!Object.keys(req.body).length)return res.json({ok:true});next()}));

router.patch('/api/activities/:id',auth,managerOrEventLead,asyncRoute(async(req,res,next)=>{if(!Object.hasOwn(req.body,'proposal_document_url'))return next();if(!(await canManageActivity(req.session.user,req.params.id)))return res.status(403).json({error:'You cannot manage this activity.'});const proposalDocumentUrl=String(req.body.proposal_document_url||'').trim();if(!validHttpUrl(proposalDocumentUrl))return res.status(400).json({error:'The activity proposal document must be a valid http:// or https:// link.'});await db.execute('UPDATE activities SET proposal_document_url=? WHERE id=?',[proposalDocumentUrl||null,req.params.id]);delete req.body.proposal_document_url;next()}));

router.get('/api/activities',auth,asyncRoute(async(req,res)=>{const q=`%${String(req.query.q||'')}%`,status=String(req.query.status||'all'),type=String(req.query.type||'all'),s=activityScope(req.session.user);const [rows]=await db.execute(`SELECT a.*,te.name team_name,te.color team_color,u.name creator_name,(SELECT name FROM users WHERE id=a.event_lead_id) event_lead_name,GROUP_CONCAT(DISTINCT involved.name ORDER BY involved.name SEPARATOR ', ') team_names,COUNT(DISTINCT t.id) task_count,COUNT(DISTINCT CASE WHEN t.status='done' THEN t.id END) done_count,COUNT(DISTINCT p.user_id) participant_count FROM activities a JOIN teams te ON te.id=a.team_id JOIN users u ON u.id=a.creator_id JOIN activity_teams ats ON ats.activity_id=a.id JOIN teams involved ON involved.id=ats.team_id LEFT JOIN tasks t ON t.activity_id=a.id LEFT JOIN participants p ON p.activity_id=a.id AND p.state='confirmed' WHERE ${s.sql} AND (a.title LIKE ? OR a.description LIKE ?) AND (?='all' OR a.status=?) AND (?='all' OR a.type=?) GROUP BY a.id ORDER BY FIELD(a.status,'active','approved','proposed','completed','cancelled'),a.deadline`,[...s.params,q,q,status,status,type,type]);res.json(rows)}));

router.post('/api/activities',auth,manager,asyncRoute(async(req,res)=>{const {title,description,type,start_date,deadline,priority,requested_by,location,event_lead_id}=req.body,proposalDocumentUrl=String(req.body.proposal_document_url||'').trim(),publicImageUrl=String(req.body.public_image_url||'').trim(),isPublic=req.body.is_public===true||req.body.is_public==='true'||req.body.is_public==='on';const teamIds=ids(req.body.team_ids?.length?req.body.team_ids:req.body.team_id),primary=Number(req.body.team_id||teamIds[0]);if(!title||!description||!deadline||!teamIds.length||!teamIds.includes(primary)||!['event','assigned'].includes(type))return res.status(400).json({error:'Complete all required fields and select at least one team.'});if(!validHttpUrl(proposalDocumentUrl))return res.status(400).json({error:'The activity proposal document must be a valid http:// or https:// link.'});if(!validHttpUrl(publicImageUrl))return res.status(400).json({error:'The public image must be a valid http:// or https:// link.'});if(isLeadership(req.session.user)){for(const teamId of teamIds)if(!(await leadsTeam(req.session.user.id,teamId)))return res.status(403).json({error:'Team leaders and vice leaders may only propose work for teams they lead.'})}const conn=await db.getConnection();try{await conn.beginTransaction();const [result]=await conn.execute('INSERT INTO activities(title,description,is_public,public_image_url,proposal_document_url,type,team_id,creator_id,start_date,deadline,priority,requested_by,location,event_lead_id) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)',[title,description,isPublic,publicImageUrl||null,proposalDocumentUrl||null,type,primary,req.session.user.id,start_date||null,deadline,priority||'medium',requested_by||null,location||null,Number(req.body.event_lead_id)||null]);for(const teamId of teamIds)await conn.execute('INSERT INTO activity_teams(activity_id,team_id,role,responsibility) VALUES(?,?,?,?)',[result.insertId,teamId,teamId===primary?'primary':'supporting',teamId===primary?'Coordinates the activity':'Supports the activity']);await conn.commit();res.status(201).json({id:result.insertId});try{const [admins]=await db.execute("SELECT id,name,email FROM users WHERE role='admin' AND is_active=1");const activity={id:result.insertId,title,type,start_date,deadline,priority:priority||'medium'};for(const adminUser of admins)mailer.notifyActivityProposed(adminUser,activity,req.session.user.name)}catch(error){logger.error(`Unable to prepare activity ${result.insertId} proposal email notifications.`,error)}}catch(e){await conn.rollback();throw e}finally{conn.release()}}));

router.post('/api/activities/:id/submit', auth, managerOrEventLead, asyncRoute(async (req, res) => {
  const [rows] = await db.execute('SELECT id,status,title FROM activities WHERE id=?', [req.params.id]);
  const activity = one(rows);
  if (!activity) return res.status(404).json({ error: 'Không tìm thấy hoạt động.' });
  if (!(await canManageActivity(req.session.user, req.params.id))) return res.status(403).json({ error: 'Bạn không có quyền thực hiện thao tác này.' });
  if (!['proposed', 'changes_requested'].includes(activity.status)) return res.status(409).json({ error: 'Chỉ có thể nộp đề án ở trạng thái chờ nộp hoặc yêu cầu sửa đổi.' });
  await db.execute("UPDATE activities SET status='proposed' WHERE id=?", [req.params.id]);
  await db.execute('INSERT INTO activity_proposals(activity_id,submitted_by,action) VALUES(?,?,\'submit\')', [req.params.id, req.session.user.id]);
  res.json({ ok: true });
  try {
    const [admins] = await db.execute("SELECT id,name,email FROM users WHERE role IN ('admin','vice_admin') AND is_active=1");
    for (const adminUser of admins) mailer.notifyActivityProposed(adminUser, activity, req.session.user.name);
  } catch (error) { logger.error(`Unable to prepare activity ${req.params.id} resubmission emails.`, error); }
}));

router.post('/api/activities/:id/approve', auth, admin, asyncRoute(async (req, res) => {
  await decideProposal(req, res, { action: 'approve', nextStatus: 'approved', requireFeedback: false });
}));
router.post('/api/activities/:id/reject', auth, admin, asyncRoute(async (req, res) => {
  await decideProposal(req, res, { action: 'reject', nextStatus: 'cancelled', requireFeedback: true });
}));
router.post('/api/activities/:id/request-changes', auth, admin, asyncRoute(async (req, res) => {
  await decideProposal(req, res, { action: 'request_changes', nextStatus: 'changes_requested', requireFeedback: true });
}));

router.get('/api/activities/:id',auth,asyncRoute(async(req,res)=>{if(!(await visibleActivity(req.session.user,req.params.id)))return res.status(404).json({error:'Activity not found.'});const [[activities],[activityTeams],[tasks],[participants],[updates],[people],[taggablePeople],[attachments],[updateTags],[proposalHistory]]=await Promise.all([
  db.execute('SELECT a.*,te.name team_name,te.color team_color,u.name creator_name,(SELECT name FROM users WHERE id=a.event_lead_id) event_lead_name FROM activities a JOIN teams te ON te.id=a.team_id JOIN users u ON u.id=a.creator_id WHERE a.id=?',[req.params.id]),
  db.execute('SELECT at.*,t.name,t.color,u.name contact_name FROM activity_teams at JOIN teams t ON t.id=at.team_id LEFT JOIN users u ON u.id=at.contact_user_id WHERE at.activity_id=? ORDER BY at.role,t.name',[req.params.id]),
  db.execute(`SELECT t.*,te.name team_name,GROUP_CONCAT(DISTINCT u.name ORDER BY u.name SEPARATOR ', ') assignee_name,GROUP_CONCAT(DISTINCT u.id ORDER BY u.id) assignee_ids,(SELECT name FROM users WHERE id=t.primary_assignee_id) primary_assignee_name,(SELECT COUNT(*) FROM task_checklists tc WHERE tc.task_id=t.id) checklist_total,(SELECT COUNT(*) FROM task_checklists tc WHERE tc.task_id=t.id AND tc.is_done=1) checklist_done FROM tasks t JOIN teams te ON te.id=t.team_id LEFT JOIN task_assignees ta ON ta.task_id=t.id LEFT JOIN users u ON u.id=ta.user_id WHERE t.activity_id=? GROUP BY t.id ORDER BY FIELD(t.stage,'before','during','after','general'),t.deadline`,[req.params.id]),
  db.execute("SELECT p.*,u.name,u.role,u.avatar_color FROM participants p JOIN users u ON u.id=p.user_id WHERE p.activity_id=? ORDER BY FIELD(p.state,'confirmed','volunteered','declined'),u.name",[req.params.id]),
  db.execute('SELECT n.*,u.name user_name,u.avatar_color,tagged.name tagged_user_name FROM updates n JOIN users u ON u.id=n.user_id LEFT JOIN users tagged ON tagged.id=n.tagged_user_id WHERE n.activity_id=? ORDER BY n.created_at DESC',[req.params.id]),
  db.execute("SELECT u.id,u.name,u.role,MIN(ut.team_id) team_id,GROUP_CONCAT(DISTINCT t.id ORDER BY t.id) team_ids,GROUP_CONCAT(DISTINCT t.name ORDER BY t.name SEPARATOR ', ') teams FROM users u LEFT JOIN user_teams ut ON ut.user_id=u.id LEFT JOIN teams t ON t.id=ut.team_id LEFT JOIN activity_teams at ON at.team_id=ut.team_id WHERE u.is_active=1 AND (? = 1 OR (at.activity_id=? AND EXISTS(SELECT 1 FROM user_teams lead_team WHERE lead_team.user_id=? AND lead_team.team_id=ut.team_id AND (lead_team.is_lead=1 OR lead_team.is_vice_lead=1)))) GROUP BY u.id ORDER BY u.name",[isExecutive(req.session.user)?1:0,req.params.id,req.session.user.id]),
  db.execute(`SELECT DISTINCT u.id,u.name,u.role FROM users u WHERE u.is_active=1 AND u.id!=? AND (u.role IN ('admin','vice_admin') OR (u.role IN ('leader','vice_leader') AND (EXISTS(SELECT 1 FROM activities a WHERE a.id=? AND a.creator_id=u.id) OR EXISTS(SELECT 1 FROM activity_teams at JOIN user_teams ut ON ut.team_id=at.team_id WHERE at.activity_id=? AND ut.user_id=u.id AND (ut.is_lead=1 OR ut.is_vice_lead=1)))) OR (u.role NOT IN ('admin','vice_admin','leader','vice_leader') AND (EXISTS(SELECT 1 FROM participants p WHERE p.activity_id=? AND p.user_id=u.id AND p.state!='declined') OR EXISTS(SELECT 1 FROM tasks tk JOIN task_assignees ta ON ta.task_id=tk.id WHERE tk.activity_id=? AND ta.user_id=u.id) OR EXISTS(SELECT 1 FROM activity_teams at JOIN user_teams ut ON ut.team_id=at.team_id WHERE at.activity_id=? AND ut.user_id=u.id)))) ORDER BY u.name`,[req.session.user.id,req.params.id,req.params.id,req.params.id,req.params.id,req.params.id]),
  db.execute('SELECT x.id,x.task_id,x.kind,x.label,x.link_url,x.original_name,x.mime_type,x.size_bytes,x.created_at,u.name user_name FROM task_attachments x JOIN users u ON u.id=x.user_id JOIN tasks t ON t.id=x.task_id WHERE t.activity_id=? ORDER BY x.created_at DESC',[req.params.id]),
  db.execute('SELECT utu.update_id,u.id,u.name FROM update_tagged_users utu JOIN users u ON u.id=utu.user_id JOIN updates n ON n.id=utu.update_id WHERE n.activity_id=? ORDER BY u.name',[req.params.id]),
  db.execute('SELECT p.*,submitter.name submitter_name,reviewer.name reviewer_name FROM activity_proposals p JOIN users submitter ON submitter.id=p.submitted_by LEFT JOIN users reviewer ON reviewer.id=p.reviewer_id WHERE p.activity_id=? ORDER BY p.created_at',[req.params.id])
]);const tagsByUpdate=new Map;for(const tag of updateTags){const tags=tagsByUpdate.get(Number(tag.update_id))||[];tags.push({id:tag.id,name:tag.name});tagsByUpdate.set(Number(tag.update_id),tags)}for(const update of updates)update.tagged_users=tagsByUpdate.get(Number(update.id))||[];const activity=activities[0];for(const task of tasks){task.recorded_stage=task.stage;if(activity.type==='assigned')task.stage='general';else if(task.stage==='general')task.stage='before'}for(const person of people){person.team_ids=String(person.team_ids||'').split(',').filter(Boolean).map(Number);person.team_names=String(person.teams||'').split(',').map(x=>x.trim()).filter(Boolean)}res.json({activity,activityTeams,tasks,participants,updates,people,taggablePeople,attachments,proposalHistory,canManage:await canManageActivity(req.session.user,req.params.id)})}));

router.patch('/api/activities/:id',auth,managerOrEventLead,asyncRoute(async(req,res)=>{if(!(await canManageActivity(req.session.user,req.params.id)))return res.status(403).json({error:'You cannot manage this activity.'});const teamEdit=req.body.team_ids!==undefined||req.body.team_id!==undefined;const isExec=isExecutive(req.session.user);if(teamEdit&&!isExec)return res.status(403).json({error:'Only administrators can change involved teams.'});if(isExec&&req.body.status==='cancelled'){const activity=await hardDeleteActivity(req.params.id,req.session.user.id,'status change');if(!activity)return res.status(404).json({error:'Activity not found.'});return res.json({ok:true,deleted:true})}const allowed=['priority','result_summary','title','description','type','deadline','start_date','location','requested_by',...(isExec?['status','event_lead_id']:[])];const entries=Object.entries(req.body).filter(([key])=>allowed.includes(key));if(['title','description','deadline'].some(key=>Object.hasOwn(req.body,key)&&!String(req.body[key]||'').trim()))return res.status(400).json({error:'Title, description and deadline cannot be empty.'});let teamIds=[],primary=0;if(teamEdit){teamIds=ids(req.body.team_ids),primary=Number(req.body.team_id);if(!teamIds.length||!teamIds.includes(primary))return res.status(400).json({error:'Select involved teams and a coordinating team.'});const [validTeams]=await db.query(`SELECT id FROM teams WHERE is_active=1 AND id IN (${teamIds.map(()=>'?').join(',')})`,teamIds);if(validTeams.length!==teamIds.length)return res.status(400).json({error:'One or more selected teams are unavailable.'});const [taskTeams]=await db.query(`SELECT DISTINCT team_id FROM tasks WHERE activity_id=? AND team_id NOT IN (${teamIds.map(()=>'?').join(',')})`,[req.params.id,...teamIds]);if(taskTeams.length)return res.status(409).json({error:'A team with existing tasks cannot be removed. Reassign those tasks first.'})}if(!entries.length&&!teamEdit)return res.status(400).json({error:'No valid fields supplied.'});const conn=await db.getConnection();try{await conn.beginTransaction();if(entries.length)await conn.execute(`UPDATE activities SET ${entries.map(([k])=>`${k}=?`).join(',')} WHERE id=?`,[...entries.map(([k,v])=>['start_date','location','requested_by','result_summary','event_lead_id'].includes(k)?(v?Number(v)||v:null):v),req.params.id]);if(teamEdit){await conn.execute('UPDATE activities SET team_id=? WHERE id=?',[primary,req.params.id]);for(const teamId of teamIds)await conn.execute("INSERT INTO activity_teams(activity_id,team_id,role,responsibility) VALUES(?,?,?,?) ON DUPLICATE KEY UPDATE role=VALUES(role)",[req.params.id,teamId,teamId===primary?'primary':'supporting',teamId===primary?'Coordinates the activity':'Supports the activity']);await conn.query(`DELETE FROM activity_teams WHERE activity_id=? AND team_id NOT IN (${teamIds.map(()=>'?').join(',')})`,[req.params.id,...teamIds]);await conn.execute("UPDATE activity_teams SET role=IF(team_id=?,'primary','supporting') WHERE activity_id=?",[primary,req.params.id])}await conn.commit();res.json({ok:true})}catch(e){await conn.rollback();throw e}finally{conn.release()}}));

router.delete('/api/activities/:id',auth,admin,asyncRoute(async(req,res)=>{
  const activityId=Number(req.params.id);
  if(!Number.isInteger(activityId)||activityId<1)return res.status(400).json({error:'A valid activity ID is required.'});
  const activity=await hardDeleteActivity(activityId,req.session.user.id,'manual delete');
  if(!activity)return res.status(404).json({error:'Activity not found.'});
  res.json({ok:true,id:activityId,title:activity.title});
}));
router.post('/api/activities/:id/volunteer',auth,asyncRoute(async(req,res)=>{if(!(await visibleActivity(req.session.user,req.params.id)))return res.status(404).json({error:'Activity not found.'});await db.execute("INSERT INTO participants(activity_id,user_id,state) VALUES(?,?,'volunteered') ON DUPLICATE KEY UPDATE state='volunteered'",[req.params.id,req.session.user.id]);res.json({ok:true})}));
router.post('/api/activities/:id/participants',auth,manager,asyncRoute(async(req,res)=>{if(!(await canManageActivity(req.session.user,req.params.id)))return res.status(403).json({error:'You cannot manage participants for this activity.'});const userIds=ids(req.body.user_ids);if(!userIds.length)return res.status(400).json({error:'Select at least one member.'});for(const userId of userIds){let sql='SELECT 1 FROM users WHERE id=? AND is_active=1',params=[userId];if(isLeadership(req.session.user)){sql='SELECT 1 FROM users u JOIN user_teams member_team ON member_team.user_id=u.id JOIN user_teams leader_team ON leader_team.team_id=member_team.team_id AND leader_team.user_id=? AND (leader_team.is_lead=1 OR leader_team.is_vice_lead=1) JOIN activity_teams at ON at.team_id=member_team.team_id AND at.activity_id=? WHERE u.id=? AND u.is_active=1 LIMIT 1';params=[req.session.user.id,req.params.id,userId]}const [eligible]=await db.execute(sql,params);if(!eligible.length)return res.status(403).json({error:'You may only add active members from teams you lead.'})}const responsibility=String(req.body.responsibility||'Activity participant').trim().slice(0,255);const marks=userIds.map(()=>'?').join(',');const [[existing],[users],[activities]]=await Promise.all([db.query(`SELECT user_id,state FROM participants WHERE activity_id=? AND user_id IN (${marks})`,[req.params.id,...userIds]),db.query(`SELECT id,name,email FROM users WHERE id IN (${marks})`,userIds),db.execute('SELECT id,title,deadline FROM activities WHERE id=?',[req.params.id])]);for(const userId of userIds)await db.execute("INSERT INTO participants(activity_id,user_id,state,responsibility) VALUES(?,?,'confirmed',?) ON DUPLICATE KEY UPDATE state='confirmed',responsibility=VALUES(responsibility)",[req.params.id,userId,responsibility]);res.status(201).json({ok:true});const confirmed=new Set(existing.filter(item=>item.state==='confirmed').map(item=>Number(item.user_id)));for(const user of users)if(!confirmed.has(Number(user.id)))mailer.notifyActivityRegistration(user,activities[0],responsibility,req.session.user.name)}));
router.post('/api/activities/:id/updates',auth,asyncRoute(async(req,res)=>{
  if(!(await visibleActivity(req.session.user,req.params.id)))return res.status(404).json({error:'Activity not found.'});
  const body=String(req.body.body||'').trim(),taskId=Number(req.body.task_id)||null,kind=req.body.kind||'comment';
  const rawTagIds=Array.isArray(req.body.tagged_user_ids)?req.body.tagged_user_ids:String(req.body.tagged_user_ids||req.body.tagged_user_id||'').split(',');
  const taggedUserIds=kind==='comment'?ids(rawTagIds).filter(id=>id>0):[];
  if(!body)return res.status(400).json({error:'Write an update first.'});
  if(taggedUserIds.includes(Number(req.session.user.id)))return res.status(400).json({error:'You cannot tag yourself.'});
  let taggedUsers=[];
  if(taggedUserIds.length){
    const marks=taggedUserIds.map(()=>'?').join(',');
    const [users]=await db.query(`SELECT id,name,role FROM users WHERE is_active=1 AND id IN (${marks})`,taggedUserIds);
    if(users.length!==taggedUserIds.length)return res.status(400).json({error:'One or more tagged people are unavailable.'});
    for(const user of users)if(!(await visibleActivity(user,req.params.id)))return res.status(400).json({error:`${user.name} cannot view this activity.`});
    taggedUsers=users;
  }
  const [activities]=await db.execute('SELECT id,title FROM activities WHERE id=?',[req.params.id]),activity=activities[0];
  const conn=await db.getConnection();let updateId;
  try{
    await conn.beginTransaction();
    const [result]=await conn.execute('INSERT INTO updates(activity_id,task_id,user_id,tagged_user_id,body,kind,attachment_url) VALUES(?,?,?,?,?,?,?)',[req.params.id,taskId,req.session.user.id,taggedUserIds[0]||null,body,kind,req.body.attachment_url||null]);
    updateId=result.insertId;
    for(const user of taggedUsers){
      await conn.execute('INSERT INTO update_tagged_users(update_id,user_id) VALUES(?,?)',[updateId,user.id]);
      await conn.execute(`INSERT INTO notifications(user_id,activity_id,task_id,kind,title,body,url,source_key,expires_at) VALUES(?,?,?,?,?,?,?,?,DATE_ADD(NOW(),INTERVAL 7 DAY))`,[user.id,req.params.id,taskId,'comment_tag','You were tagged in a comment',`${req.session.user.name} tagged you in “${activity.title}”.`,`/#activity/${req.params.id}`,`comment-tag:${updateId}:${user.id}`]);
    }
    if(taskId)await conn.execute(`INSERT INTO notifications(user_id,activity_id,task_id,kind,title,body,url,source_key,email_status,push_status,expires_at)
      SELECT t.assigned_by,t.activity_id,t.id,'task_response','New task response',CONCAT(?, ' responded to “', t.title, '”.'),?,CONCAT('task-response:',?,':',t.assigned_by),'pending','pending',DATE_ADD(NOW(),INTERVAL 7 DAY)
      FROM tasks t JOIN users giver ON giver.id=t.assigned_by AND giver.is_active=1
      WHERE t.id=? AND t.activity_id=? AND t.assigned_by!=?`,[req.session.user.name,`/#activity/${req.params.id}`,updateId,taskId,req.params.id,req.session.user.id]);
    await conn.commit();
  }catch(error){await conn.rollback();throw error}finally{conn.release()}
  res.status(201).json({ok:true,id:updateId});
  for(const user of taggedUsers)push.queuePush(`comment tag ${updateId} to user ${user.id}`,{userId:user.id,title:'You were tagged in a comment',message:`${req.session.user.name} tagged you in ${activity.title}`,url:process.env.APP_BASE_URL?`${String(process.env.APP_BASE_URL).replace(/\/$/,'')}/#activity/${req.params.id}`:undefined});
  if(taskId)try{
    const [[tasks],[owners]]=await Promise.all([
      db.execute('SELECT t.id,t.title,t.activity_id,t.assigned_by,a.title activity_title FROM tasks t JOIN activities a ON a.id=t.activity_id WHERE t.id=? AND t.activity_id=?',[taskId,req.params.id]),
      db.execute('SELECT DISTINCT u.id,u.name,u.email FROM users u JOIN tasks t ON t.id=? LEFT JOIN task_assignees ta ON ta.task_id=t.id AND ta.user_id=u.id WHERE u.is_active=1 AND u.id!=? AND (ta.user_id IS NOT NULL OR u.id=t.assigned_by)',[taskId,req.session.user.id])
    ]);
    const task=tasks[0],sourceKey=task&&`task-response:${updateId}:${task.assigned_by}`;
    if(task)for(const owner of owners){
      const tracksDelivery=Number(owner.id)===Number(task.assigned_by);
      const recordStatus=channel=>status=>db.execute(`UPDATE notifications SET ${channel}_status=? WHERE user_id=? AND source_key=?`,[status,owner.id,sourceKey]);
      mailer.notifyTaskResponse(owner,task,req.session.user.name,{body,kind},tracksDelivery?{email:recordStatus('email'),push:recordStatus('push')}:{});
    }
  }catch(error){logger.error(`Unable to prepare task ${taskId} response notifications.`,error)}
}));

router.post('/api/activities/:id/tasks', auth, manager, asyncRoute(async (req, res) => {
  if (!(await canManageActivity(req.session.user, req.params.id))) return res.status(403).json({ error: 'Bạn không thể quản lý hoạt động này.' });
  const { title, description, stage, priority, team_id, start_date, deadline, deliverable } = req.body;
  const primaryAssigneeId = Number(req.body.primary_assignee_id) || null;
  const coAssigneeIds = ids(req.body.co_assignee_ids).filter(id => id !== primaryAssigneeId);
  if (!title || !team_id || !deadline || !primaryAssigneeId) return res.status(400).json({ error: 'Tiêu đề, ban phụ trách, hạn chót và người phụ trách chính là bắt buộc.' });
  if (!(await canManageTeam(req.session.user, team_id))) return res.status(403).json({ error: 'Bạn không thể giao việc cho ban này.' });
  const allAssigneeIds = [primaryAssigneeId, ...coAssigneeIds];
  for (const userId of allAssigneeIds) {
    const [member] = await db.execute('SELECT 1 FROM user_teams WHERE user_id=? AND team_id=?', [userId, team_id]);
    if (!member.length) return res.status(400).json({ error: 'Mọi người được giao việc phải thuộc ban phụ trách.' });
  }
  let taskId;
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [result] = await conn.execute(
      'INSERT INTO tasks(activity_id,title,description,stage,priority,team_id,primary_assignee_id,assigned_by,start_date,deadline,deliverable) VALUES(?,?,?,?,?,?,?,?,?,?,?)',
      [req.params.id, title, description || null, stage || 'general', priority || 'medium', team_id, primaryAssigneeId, req.session.user.id, start_date || null, deadline, deliverable || null]
    );
    taskId = result.insertId;
    for (const userId of allAssigneeIds) await conn.execute('INSERT INTO task_assignees(task_id,user_id,is_primary) VALUES(?,?,?)', [taskId, userId, userId === primaryAssigneeId]);
    await conn.execute("INSERT IGNORE INTO activity_teams(activity_id,team_id,role,responsibility) VALUES(?,?,'supporting','Phụ trách phần việc được giao')", [req.params.id, team_id]);
    await conn.commit();
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
  try {
    const marks = allAssigneeIds.map(() => '?').join(',');
    const [[users], [activities]] = await Promise.all([
      db.query(`SELECT id,name,email FROM users WHERE id IN (${marks})`, allAssigneeIds),
      db.execute('SELECT title FROM activities WHERE id=?', [req.params.id])
    ]);
    const task = { id: taskId, activity_id: Number(req.params.id), activity_title: activities[0]?.title || 'Hoạt động', title, deadline, priority: priority || 'medium', deliverable };
    for (const assignedUser of users) {
      mailer.notifyTaskAssigned(assignedUser, task, req.session.user.name);
      await db.execute(
        `INSERT INTO notifications(user_id,activity_id,task_id,kind,title,body,url,source_key,expires_at) VALUES(?,?,?,'task_assigned',?,?,?,?,DATE_ADD(NOW(),INTERVAL 7 DAY))`,
        [assignedUser.id, req.params.id, taskId, 'Công việc mới', `Bạn được giao: ${title}`, `/#activity/${req.params.id}`, `task-assigned:${taskId}:${assignedUser.id}`]
      );
    }
  } catch (error) {
    logger.error(`Unable to prepare task ${taskId} notifications.`, error);
  }
  res.status(201).json({ id: taskId });
}));

  async function decideProposal(req, res, { action, nextStatus, requireFeedback }) {
    const feedback = String((req.body || {}).feedback || '').trim();
    if (requireFeedback && !feedback) return res.status(400).json({ error: 'Vui lòng nhập lý do/ghi chú.' });
    const [rows] = await db.execute('SELECT id,title,type,start_date,deadline,priority,creator_id,status FROM activities WHERE id=?', [req.params.id]);
    const activity = one(rows);
    if (!activity) return res.status(404).json({ error: 'Không tìm thấy hoạt động.' });
    if (activity.status !== 'proposed') return res.status(409).json({ error: 'Đề án không ở trạng thái chờ duyệt.' });
    if (nextStatus === 'cancelled') {
      await hardDeleteActivity(req.params.id, req.session.user.id, `proposal ${action}`);
      res.json({ ok: true, deleted: true });
    } else {
      await db.execute('UPDATE activities SET status=? WHERE id=?', [nextStatus, req.params.id]);
      await db.execute('INSERT INTO activity_proposals(activity_id,submitted_by,action,reviewer_id,feedback_notes) VALUES(?,?,?,?,?)', [req.params.id, activity.creator_id, action, req.session.user.id, feedback || null]);
      res.json({ ok: true });
    }
    try {
      const [[creator]] = await db.query('SELECT id,name,email FROM users WHERE id=?', [activity.creator_id]);
      if (creator) mailer.notifyActivityDecision(creator, activity, action, feedback, req.session.user.name);
    } catch (error) { logger.error(`Unable to prepare activity ${req.params.id} decision emails.`, error); }
  }

router.post('/api/activities/:id/log-task', auth, taskUpload.single('file'), asyncRoute(async (req, res) => {
  const activityId = Number(req.params.id);
  const [actRows] = await db.execute('SELECT id, title, status, deadline FROM activities WHERE id=?', [activityId]);
  const activity = one(actRows);
  if (!activity) return res.status(404).json({ error: 'Không tìm thấy hoạt động.' });
  if (!['approved', 'active'].includes(activity.status)) {
    return res.status(409).json({ error: 'Chỉ có thể ghi nhận công việc vào hoạt động đã được duyệt và đang diễn ra.' });
  }

  const title = String(req.body.title || '').trim();
  if (!title) return res.status(400).json({ error: 'Tiêu đề công việc là bắt buộc.' });

  const teamId = Number(req.body.team_id);
  if (!teamId) return res.status(400).json({ error: 'Vui lòng chọn Tổ phụ trách.' });

  const [actTeamRows] = await db.execute('SELECT 1 FROM activity_teams WHERE activity_id=? AND team_id=?', [activityId, teamId]);
  if (!actTeamRows.length) return res.status(400).json({ error: 'Tổ được chọn không tham gia hoạt động này.' });

  const isExec = isExecutive(req.session.user);
  const userBelongsToTeam = await belongsToTeam(req.session.user.id, teamId);
  if (!isExec && !userBelongsToTeam) {
    return res.status(403).json({ error: 'Bạn chỉ có thể tự ghi nhận công việc thuộc Tổ của mình.' });
  }

  let weight = 1;
  if (req.body.weight !== undefined && req.body.weight !== '') {
    weight = Number(req.body.weight);
    if (isNaN(weight) || weight < 0 || weight > 10 || !Number.isInteger(weight)) {
      return res.status(400).json({ error: 'Trọng số công việc phải là số nguyên từ 0 đến 10.' });
    }
  }

  const linkUrl = String(req.body.link_url || '').trim();
  const file = req.file;
  if (linkUrl && !/^https?:\/\//i.test(linkUrl)) {
    return res.status(400).json({ error: 'Đường link minh chứng phải bắt đầu bằng http:// hoặc https://.' });
  }

  const description = String(req.body.description || '').trim();
  const notes = String(req.body.notes || '').trim();
  const deadline = activity.deadline || new Date().toISOString().slice(0, 10);

  let taskId;
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [result] = await conn.execute(
      `INSERT INTO tasks(activity_id, title, description, stage, priority, status, team_id, primary_assignee_id, assigned_by, is_self_logged, weight, submitted_for_review_at, deadline)
       VALUES(?, ?, ?, 'general', 'medium', 'review', ?, ?, ?, 1, ?, NOW(), ?)`,
      [activityId, title, description || null, teamId, req.session.user.id, req.session.user.id, weight, deadline]
    );
    taskId = result.insertId;

    await conn.execute(
      'INSERT INTO task_assignees(task_id, user_id, is_primary, acknowledged_at) VALUES(?, ?, 1, NOW())',
      [taskId, req.session.user.id]
    );

    const updateBody = (linkUrl || file)
      ? `${req.session.user.name} đã tự ghi nhận công việc (Điểm trọng số: ${weight}) và nộp minh chứng nghiệm thu.`
      : `${req.session.user.name} đã tự ghi nhận công việc (Điểm trọng số: ${weight}).`;
    await conn.execute(
      "INSERT INTO updates(activity_id, task_id, user_id, body, kind) VALUES(?, ?, ?, ?, 'evidence')",
      [activityId, taskId, req.session.user.id, updateBody]
    );

    await conn.commit();
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }

  if (linkUrl || file) {
    try {
      await createAttachment(context, {
        taskId,
        userId: req.session.user.id,
        kind: 'deliverable',
        label: notes || 'Minh chứng tự ghi nhận',
        linkUrl: linkUrl || null,
        file: file || null
      });
    } catch (attachError) {
      logger.error(`Unable to save attachment for self-logged task ${taskId}.`, attachError);
      if (attachError.status) return res.status(attachError.status).json({ error: attachError.message });
      throw attachError;
    }
  }

  try {
    const [reviewers] = await db.query(
      'SELECT DISTINCT u.id, u.name, u.email FROM users u JOIN user_teams ut ON ut.user_id=u.id WHERE ut.team_id=? AND (ut.is_lead=1 OR ut.is_vice_lead=1) AND u.is_active=1',
      [teamId]
    );
    const taskObj = { id: taskId, activity_id: activityId, activity_title: activity.title, title, deadline, priority: 'medium', weight };
    for (const reviewer of reviewers) {
      mailer.notifyTaskSubmittedForReview(reviewer, taskObj, req.session.user.name);
      await db.execute(
        `INSERT INTO notifications(user_id, activity_id, task_id, kind, title, body, url, source_key, expires_at)
         VALUES(?, ?, ?, 'task_review', ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 7 DAY))`,
        [reviewer.id, activityId, taskId, 'Nghiệm thu công việc tự ghi nhận', `${req.session.user.name} đã tự log việc: “${title}” (Điểm: ${weight}).`, `/#activity/${activityId}`, `task-self-log:${taskId}:${reviewer.id}`]
      );
    }
  } catch (notifyError) {
    logger.error(`Unable to send notifications for self-logged task ${taskId}.`, notifyError);
  }

  res.status(201).json({ ok: true, id: taskId });
}));

  return router;
}

module.exports = { createActivityRoutes };
