const express = require('express');

function createSubmissionRoutes(context) {
  const { asyncRoute } = context;
  const router = express.Router();

  const isBtv = (role) => ['btv_lead', 'btv_member'].includes(role);
  const isTcktAdmin = (role) => ['admin', 'vice_admin'].includes(role);
  const isDyc = (unit) => unit && unit.kind === 'platform_owner';

  // GET /api/submissions
  router.get('/', asyncRoute(async (req, res) => {
    // TODO: Truy vấn danh sách submissions từ DB theo scope
    res.json({ data: [] });
  }));

  // POST /api/submissions
  router.post('/', asyncRoute(async (req, res) => {
    const unitRole = req.unitRole;
    if (!isTcktAdmin(unitRole) && !isBtv(unitRole)) {
      return res.status(403).json({ error: 'Bạn không có quyền tạo submission.' });
    }
    const { to_unit_id, source_type, source_id } = req.body;
    if (!to_unit_id || !source_type || !source_id) {
      return res.status(400).json({ error: 'Thiếu thông tin bắt buộc.' });
    }
    // TODO: Thực hiện câu lệnh SQL tạo submission
    res.status(201).json({});
  }));

  // GET /api/submissions/:id
  router.get('/:id', asyncRoute(async (req, res) => {
    // TODO: Lấy chi tiết submission theo id
    res.json({});
  }));

  // POST /api/submissions/:id/respond
  router.post('/:id/respond', asyncRoute(async (req, res) => {
    const unitRole = req.unitRole;
    if (!isBtv(unitRole) && !isDyc(req.unit)) {
      return res.status(403).json({ error: 'Chỉ BTV hoặc DYC mới có quyền phản hồi submission.' });
    }
    const { response } = req.body;
    if (!['seen', 'revision_requested', 'accepted'].includes(response)) {
      return res.status(400).json({ error: 'Trạng thái phản hồi không hợp lệ.' });
    }
    // TODO: Cập nhật phản hồi submission trong DB
    res.json({});
  }));

  // POST /api/submissions/:id/withdraw
  router.post('/:id/withdraw', asyncRoute(async (req, res) => {
    const unitRole = req.unitRole;
    if (!isTcktAdmin(unitRole)) {
      return res.status(403).json({ error: 'Chỉ đơn vị gửi mới có quyền rút lại submission khi chưa phản hồi.' });
    }
    // TODO: Kiểm tra điều kiện chưa có response và thực hiện rút lại submission
    res.json({});
  }));

  return router;
}

module.exports = {
  createSubmissionRoutes
};
