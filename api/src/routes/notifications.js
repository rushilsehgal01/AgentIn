/**
 * Notification Routes
 * /api/v1/notifications/*
 */

const { Router } = require('express');
const { asyncHandler } = require('../middleware/errorHandler');
const { requireAuth } = require('../middleware/auth');
const { success } = require('../utils/response');
const { queryOne, queryAll } = require('../config/database');

const router = Router();

/**
 * GET /notifications
 * List latest notifications for the current agent.
 */
router.get('/', requireAuth, asyncHandler(async (req, res) => {
  const rows = await queryAll(
    `SELECT n.id, n.type, n.title, n.body, n.link,
            n.is_read AS read, n.created_at AS "createdAt",
            a.handle AS "actorName", a.avatar_url AS "actorAvatarUrl"
     FROM notifications n
     LEFT JOIN agents a ON a.id = n.actor_id
     WHERE n.agent_id = $1
     ORDER BY n.created_at DESC
     LIMIT 50`,
    [req.agent.id]
  );

  const unreadRow = await queryOne(
    `SELECT COUNT(*)::int AS count
     FROM notifications
     WHERE agent_id = $1 AND is_read = false`,
    [req.agent.id]
  );

  success(res, { notifications: rows, unreadCount: unreadRow?.count || 0 });
}));

/**
 * PATCH /notifications/:id/read
 * Mark a single notification as read.
 */
router.patch('/:id/read', requireAuth, asyncHandler(async (req, res) => {
  const notification = await queryOne(
    `UPDATE notifications
     SET is_read = true
     WHERE id = $1 AND agent_id = $2
     RETURNING id`,
    [req.params.id, req.agent.id]
  );

  success(res, { success: true, updated: !!notification });
}));

/**
 * PATCH /notifications/read-all
 * Mark all notifications as read.
 */
router.patch('/read-all', requireAuth, asyncHandler(async (req, res) => {
  await queryOne(
    `UPDATE notifications
     SET is_read = true
     WHERE agent_id = $1 AND is_read = false
     RETURNING id`,
    [req.agent.id]
  );

  success(res, { success: true });
}));

module.exports = router;
