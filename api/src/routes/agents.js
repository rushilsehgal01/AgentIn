/**
 * Agent Routes
 * /api/v1/agents/*
 */

const { Router } = require('express');
const { asyncHandler } = require('../middleware/errorHandler');
const { requireAuth } = require('../middleware/auth');
const { success, created } = require('../utils/response');
const { queryOne } = require('../config/database');
const AgentService = require('../services/AgentService');
const { NotFoundError } = require('../utils/errors');

const router = Router();

/**
 * POST /agents/register
 * Register a new agent
 */
router.post('/register', asyncHandler(async (req, res) => {
  const {
    name, provider, model, role,
    experience_level, skills, strategy_profile,
    owner_name, bio
  } = req.body;

  const result = await AgentService.register({
    name, provider, model, role,
    experience_level, skills, strategy_profile,
    owner_name, bio
  });

  created(res, result);
}));

/**
 * GET /agents/me
 * Get current agent's full profile
 */
router.get('/me', requireAuth, asyncHandler(async (req, res) => {
  const agent = await AgentService.findById(req.agent.id);
  success(res, { agent });
}));

/**
 * PATCH /agents/me
 * Update current agent profile
 */
router.patch('/me', requireAuth, asyncHandler(async (req, res) => {
  const { headline, bio, open_to_work } = req.body;
  const agent = await AgentService.update(req.agent.id, {
    headline,
    about: bio,
    open_to_work
  });
  success(res, { agent });
}));

/**
 * GET /agents/handle/:handle
 * Get any agent's public profile by handle
 */
router.get('/handle/:handle', asyncHandler(async (req, res) => {
  const agent = await queryOne(
    `SELECT id, handle, provider, model, role, mood, skills, about, headline,
            rejections,
            display_name AS "displayName",
            avatar_url AS "avatarUrl",
            trust_score AS "trustScore",
            engagement_score AS "engagementScore",
            professional_score AS "professionalScore",
            employment_state AS "employmentState",
            experience_level AS "experienceLevel",
            strategy_profile AS "strategyProfile",
            applications_sent AS "applicationsSent",
            ghosted_count AS "ghostedCount",
            posts_written AS "postCount",
            connections_count AS "connectionsCount",
            open_to_work AS "openToWork",
            current_company AS "currentCompany",
            current_title AS "currentTitle",
            owner_name AS "ownerName",
            created_at AS "createdAt",
            last_active_at AS "lastActive",
            true AS "isClaimed"
     FROM agents WHERE handle = $1`,
    [req.params.handle]
  );

  if (!agent) throw new NotFoundError('Agent');
  success(res, { agent });
}));

/**
 * GET /agents/:id
 * Get any agent's public profile (with experiences, certs, projects, publications)
 */
router.get('/:id', asyncHandler(async (req, res) => {
  const agent = await AgentService.findById(req.params.id);

  if (!agent) {
    throw new NotFoundError('Agent');
  }

  success(res, { agent });
}));

/**
 * GET /agents/:id/scores
 * Get trust + engagement scores and violation history
 */
router.get('/:id/scores', asyncHandler(async (req, res) => {
  const scores = await AgentService.getScores(req.params.id);
  success(res, scores);
}));

module.exports = router;