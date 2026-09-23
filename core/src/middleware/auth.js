const executiveRoles = ['admin', 'vice_admin'];
const leadershipRoles = ['leader', 'vice_leader'];
const isExecutive = user => executiveRoles.includes(user?.role);
const isLeadership = user => leadershipRoles.includes(user?.role);
const devopsEmailAllowlist = () => String(process.env.DEVOPS_EMAILS || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
const isDevops = user => {
  if (!user) return false;
  if (Number(user.is_devops) === 1) return true;
  const email = String(user.email || '').toLowerCase();
  return email ? devopsEmailAllowlist().includes(email) : false;
};
const auth = (req, res, next) => req.session.user ? next() : res.status(401).json({ error: 'Please sign in to continue.' });
const admin = (req, res, next) => isExecutive(req.session.user) ? next() : res.status(403).json({ error: 'Administrator access is required.' });
const manager = (req, res, next) => (isExecutive(req.session.user) || isLeadership(req.session.user)) ? next() : res.status(403).json({ error: 'You do not have permission for this action.' });
const devops = (req, res, next) => (isExecutive(req.session.user) && isDevops(req.session.user)) ? next() : res.status(403).json({ error: 'Devops access is required for this setting.' });
const managerOrEventLead = (canManageActivity) => (req, res, next) => {
  const user = req.session.user;
  if (!user) return res.status(401).json({ error: 'Vui lòng đăng nhập để tiếp tục.' });
  if (isExecutive(user) || isLeadership(user)) return next();
  const activityId = req.params.id;
  canManageActivity(user, activityId).then(allowed => allowed ? next() : res.status(403).json({ error: 'Bạn không có quyền thực hiện thao tác này.' })).catch(next);
};

module.exports = { executiveRoles, leadershipRoles, isExecutive, isLeadership, isDevops, auth, admin, manager, devops, managerOrEventLead };
