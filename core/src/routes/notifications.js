const express = require('express');

function createNotificationRoutes({ db, auth, asyncRoute }) {
  const router = express.Router();

  router.get('/api/notifications', auth, asyncRoute(async (req, res) => {
    await db.execute('DELETE FROM notifications WHERE expires_at<=NOW()');
    const [[notifications], [counts]] = await Promise.all([
      db.execute('SELECT id,kind,title,body,url,email_status,push_status,seen_at,created_at,expires_at FROM notifications WHERE user_id=? AND expires_at>NOW() ORDER BY created_at DESC LIMIT 20', [req.session.user.id]),
      db.execute('SELECT COUNT(*) unread_count FROM notifications WHERE user_id=? AND seen_at IS NULL AND expires_at>NOW()', [req.session.user.id])
    ]);
    res.set('Cache-Control', 'no-store');
    res.json({ notifications, unread_count: Number(counts[0].unread_count) });
  }));

  router.patch('/api/notifications/:id/seen', auth, asyncRoute(async (req, res) => {
    const [result] = await db.execute('UPDATE notifications SET seen_at=COALESCE(seen_at,NOW()) WHERE id=? AND user_id=? AND expires_at>NOW()', [req.params.id, req.session.user.id]);
    if (!result.affectedRows) return res.status(404).json({ error: 'Notification not found.' });
    res.json({ ok: true });
  }));

  router.post('/api/notifications/seen', auth, asyncRoute(async (req, res) => {
    const [result] = await db.execute('UPDATE notifications SET seen_at=NOW() WHERE user_id=? AND seen_at IS NULL AND expires_at>NOW()', [req.session.user.id]);
    res.json({ ok: true, marked_seen: result.affectedRows });
  }));

  return router;
}

module.exports = { createNotificationRoutes };
