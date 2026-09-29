const executiveRoles = ['admin', 'vice_admin'];
const leadershipRoles = ['leader', 'vice_leader'];
const isExecutive = user => executiveRoles.includes(user?.role);
const isLeadership = user => leadershipRoles.includes(user?.role);

const auth = (req, res, next) => {
  // Check đăng nhập trước
  if (!req.session.user) {
    return res.status(401).json({ error: 'Please sign in to continue.' });
  }
  
  // Check có membership không (user "mồ côi")
  if (!req.memberships?.length) {
    return res.status(403).json({ 
      error: 'Tài khoản chưa thuộc đơn vị nào. Liên hệ quản trị đơn vị.' 
    });
  }
  
  next();
};

const admin = (req, res, next) => 
  isExecutive(req.actor) ? next() : res.status(403).json({ error: 'Administrator access is required.' });

const manager = (req, res, next) => 
  (isExecutive(req.actor) || isLeadership(req.actor)) 
    ? next() 
    : res.status(403).json({ error: 'You do not have permission for this action.' });

const managerOrEventLead = (canManageActivity) => (req, res, next) => {
  const user = req.actor;
  if (!user) return res.status(401).json({ error: 'Vui lòng đăng nhập để tiếp tục.' });
  if (isExecutive(user) || isLeadership(user)) return next();
  
  const activityId = req.params.id;
  canManageActivity(user, activityId)
    .then(allowed => allowed ? next() : res.status(403).json({ error: 'Bạn không có quyền thực hiện thao tác này.' }))
    .catch(next);
};

module.exports = { executiveRoles, leadershipRoles, isExecutive, isLeadership, auth, admin, manager, managerOrEventLead };
