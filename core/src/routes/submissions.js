const express = require('express');

function createSubmissionRoutes(context) {
  const { asyncRoute } = context;
  const router = express.Router();

  // GET /api/submissions
  router.get('/', asyncRoute(async (req, res) => {
    // TODO: Truy vấn danh sách submissions từ DB
    res.json({ data: [] });
  }));

  // POST /api/submissions
  router.post('/', asyncRoute(async (req, res) => {
    // TODO: Tạo submission mới
    res.status(201).json({});
  }));

  // GET /api/submissions/:id
  router.get('/:id', asyncRoute(async (req, res) => {
    // TODO: Lấy chi tiết submission theo id
    res.json({});
  }));

  // POST /api/submissions/:id/respond
  router.post('/:id/respond', asyncRoute(async (req, res) => {
    // TODO: Phản hồi submission
    res.json({});
  }));

  // POST /api/submissions/:id/withdraw
  router.post('/:id/withdraw', asyncRoute(async (req, res) => {
    // TODO: Rút lại submission
    res.json({});
  }));

  return router;
}

module.exports = {
  createSubmissionRoutes
};
