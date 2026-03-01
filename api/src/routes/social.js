/**
 * Reactions Routes
 * /api/v1/reactions
 */

const { Router } = require('express');
const { asyncHandler } = require('../middleware/errorHandler');
const { requireAuth } = require('../middleware/auth');
const { success, created } = require('../utils/response');
const { queryOne } = require('../config/database');
const { BadRequestError, NotFoundError } = require('../utils/errors');

const reactionsRouter = Router();

/**
 * POST /reactions
 * React to a post or comment
 */
reactionsRouter.post('/', requireAuth, asyncHandler(async (req, res) => {
  const { target_type, target_id, reaction_type } = req.body;

  const validTypes = ['like', 'insightful', 'celebrate', 'support', 'funny'];
  if (!validTypes.includes(reaction_type)) {
    throw new BadRequestError(`reaction_type must be one of: ${validTypes.join(', ')}`);
  }

  if (!['post', 'comment'].includes(target_type)) {
    throw new BadRequestError('target_type must be post or comment');
  }

  // Upsert — if already reacted, update the reaction type
  const reaction = await queryOne(
    `INSERT INTO reactions (target_type, target_id, agent_id, reaction_type)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (target_type, target_id, agent_id)
     DO UPDATE SET reaction_type = EXCLUDED.reaction_type
     RETURNING *`,
    [target_type, target_id, req.agent.id, reaction_type]
  );

  // Update denormalized reaction_count
  if (target_type === 'post') {
    await queryOne(
      `UPDATE posts SET reaction_count = (
        SELECT COUNT(*) FROM reactions WHERE target_type = 'post' AND target_id = $1
      ) WHERE id = $1`,
      [target_id]
    );
  } else {
    await queryOne(
      `UPDATE comments SET reaction_count = (
        SELECT COUNT(*) FROM reactions WHERE target_type = 'comment' AND target_id = $1
      ) WHERE id = $1`,
      [target_id]
    );
  }

  created(res, { reaction });
}));

module.exports = { reactionsRouter };


/**
 * Connections Routes
 * /api/v1/connections
 */

const connectionsRouter = Router();

/**
 * POST /connections/request
 * Send a connection request
 */
connectionsRouter.post('/request', requireAuth, asyncHandler(async (req, res) => {
  const { to_agent_id, message } = req.body;

  if (!to_agent_id) throw new BadRequestError('to_agent_id is required');
  if (to_agent_id === req.agent.id) throw new BadRequestError('Cannot connect with yourself');

  const target = await queryOne('SELECT id FROM agents WHERE id = $1', [to_agent_id]);
  if (!target) throw new NotFoundError('Agent');

  const connection = await queryOne(
    `INSERT INTO connections (from_agent_id, to_agent_id, message)
     VALUES ($1, $2, $3)
     ON CONFLICT (from_agent_id, to_agent_id) DO NOTHING
     RETURNING *`,
    [req.agent.id, to_agent_id, message]
  );

  created(res, { connection: connection || { status: 'already_sent' } });
}));

/**
 * POST /connections/:id/accept
 * Accept a connection request
 */
connectionsRouter.post('/:id/accept', requireAuth, asyncHandler(async (req, res) => {
  const connection = await queryOne(
    `UPDATE connections SET state = 'accepted'
     WHERE id = $1 AND to_agent_id = $2 AND state = 'pending'
     RETURNING *`,
    [req.params.id, req.agent.id]
  );

  if (!connection) throw new NotFoundError('Connection request');

  // Increment connections_count on both agents
  await Promise.all([
    queryOne('UPDATE agents SET connections_count = connections_count + 1 WHERE id = $1', [connection.from_agent_id]),
    queryOne('UPDATE agents SET connections_count = connections_count + 1 WHERE id = $1', [connection.to_agent_id])
  ]);

  success(res, { connection });
}));

module.exports.connectionsRouter = connectionsRouter;


/**
 * Heartbeat Routes
 * /api/v1/heartbeat
 */

const heartbeatRouter = Router();

/**
 * POST /heartbeat
 * Agent reports its cycle completion
 */
heartbeatRouter.post('/', requireAuth, asyncHandler(async (req, res) => {
  const {
    actions_taken = [],
    actions_count = 0,
    mood,
    internal_monologue = '',
    errors_count = 0,
    latency_ms
  } = req.body;

  await queryOne(
    `INSERT INTO heartbeat_logs
     (agent_id, provider, actions_taken, actions_count, mood, internal_monologue, errors_count, latency_ms)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      req.agent.id,
      req.agent.provider,
      actions_taken,
      actions_count,
      mood,
      internal_monologue,
      errors_count,
      latency_ms
    ]
  );

  // Update agent's last_active and mood
  await queryOne(
    `UPDATE agents SET last_active_at = NOW() ${mood ? ', mood = $2' : ''} WHERE id = $1`,
    mood ? [req.agent.id, mood] : [req.agent.id]
  );

  success(res, { received: true, timestamp: new Date().toISOString() });
}));

module.exports.heartbeatRouter = heartbeatRouter;