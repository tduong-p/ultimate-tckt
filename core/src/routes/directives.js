const express = require('express');

function createDirectiveRoutes(context) {
  const { asyncRoute } = context;
  const router = express.Router();

  const isBtv = (role) => ['btv_lead', 'btv_member'].includes(role);
  const isTcktAdmin = (role) => ['admin', 'vice_admin'].includes(role);
  const isDyc = (unit) => unit && unit.kind === 'platform_owner';

  // GET /api/directives
  router.get('/', asyncRoute(async (req, res) => {
    // TODO: Truy vấn danh sách chỉ đạo từ DB theo unitId và query status
    res.json({ data: [] });
  }));

  // POST /api/directives
  router.post('/', asyncRoute(async (req, res) => {
    const unitRole = req.unitRole;
    if (!isBtv(unitRole) && !isDyc(req.unit)) {
      return res.status(403).json({ error: 'Chỉ BTV mới có quyền tạo chỉ đạo.' });
    }
    const { to_unit_id, title, deadline } = req.body;
    if (!to_unit_id || !title || !deadline) {
      return res.status(400).json({ error: 'Thiếu thông tin bắt buộc.' });
    }
    // TODO: Thực hiện câu lệnh SQL tạo directive
    res.status(201).json({});
  }));

  // GET /api/directives/:id
  router.get('/:id', asyncRoute(async (req, res) => {
    // TODO: Lấy chi tiết directive kèm activities và submissions
    res.json({});
  }));

  // POST /api/directives/:id/acknowledge
  router.post('/:id/acknowledge', asyncRoute(async (req, res) => {
    const unitRole = req.unitRole;
    if (!isTcktAdmin(unitRole)) {
      return res.status(403).json({ error: 'Chỉ cán bộ quản trị đơn vị nhận mới có quyền tiếp nhận.' });
    }
    // TODO: Kiểm tra trạng thái 'sent' và cập nhật 'acknowledged'
    res.json({});
  }));

  // POST /api/directives/:id/link-activity
  router.post('/:id/link-activity', asyncRoute(async (req, res) => {
    // TODO: Gắn hoạt động vào chỉ đạo
    res.json({});
  }));

  // POST /api/directives/:id/submit
  router.post('/:id/submit', asyncRoute(async (req, res) => {
    // TODO: Nộp báo cáo kết quả (tạo submission và đổi trạng thái directive thành submitted)
    res.status(201).json({});
  }));

  // POST /api/directives/:id/respond
  router.post('/:id/respond', asyncRoute(async (req, res) => {
    const unitRole = req.unitRole;
    if (!isBtv(unitRole) && !isDyc(req.unit)) {
      return res.status(403).json({ error: 'Chỉ BTV hoặc DYC mới có quyền đánh giá kết quả.' });
    }
    // TODO: Phản hồi kết quả (accepted / revision_requested)
    res.json({});
  }));

  return router;
}

module.exports = {
  createDirectiveRoutes
};
