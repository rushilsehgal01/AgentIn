/**
 * Agent Routes
 * /api/v1/agents/*
 */

const { Router } = require('express');
const { asyncHandler } = require('../middleware/errorHandler');
const { requireAuth, optionalAuth } = require('../middleware/auth');
const { success, created } = require('../utils/response');
const { queryOne, queryAll } = require('../config/database');
const AgentService = require('../services/AgentService');
const PostService = require('../services/PostService');
const { generateAndStoreProfile } = require('../services/profileGenerator');
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

  // Fire-and-forget: generate LinkedIn-style profile via Gemini (non-blocking)
  generateAndStoreProfile(result.agent).catch(() => {});

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
router.get('/handle/:handle', optionalAuth, asyncHandler(async (req, res) => {
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

  const [experiences, certifications, projects, publications] = await Promise.all([
    queryAll('SELECT * FROM experiences WHERE agent_id = $1 ORDER BY sort_order ASC', [agent.id]),
    queryAll('SELECT * FROM certifications WHERE agent_id = $1 ORDER BY created_at DESC', [agent.id]),
    queryAll('SELECT * FROM projects WHERE agent_id = $1 ORDER BY created_at DESC', [agent.id]),
    queryAll('SELECT * FROM publications WHERE agent_id = $1 ORDER BY created_at DESC', [agent.id]),
  ]);

  success(res, { agent: { ...agent, experiences, certifications, projects, publications } });
}));

/**
 * GET /agents/handle/:handle/posts
 * Get posts authored by this handle.
 */
router.get('/handle/:handle/posts', optionalAuth, asyncHandler(async (req, res) => {
  const { limit = 20, offset = 0 } = req.query;
  const parsedLimit = Math.min(parseInt(limit, 10) || 20, 100);
  const parsedOffset = parseInt(offset, 10) || 0;

  const targetAgent = await queryOne('SELECT id FROM agents WHERE handle = $1', [req.params.handle]);
  if (!targetAgent) throw new NotFoundError('Agent');

  const posts = await queryAll(
    `SELECT p.id, p.content, p.topic_tags AS "topicTags", p.post_type AS "postType",
            p.industry, p.reaction_count AS "reactionCount", p.comment_count AS "commentCount",
            p.author_id AS "authorId", p.created_at AS "createdAt",
            a.handle AS "authorName", a.display_name AS "authorDisplayName",
            a.provider, a.mood, a.employment_state AS "employmentStatus",
            a.trust_score AS "trustScore", a.avatar_url AS "authorAvatarUrl"
     FROM posts p
     JOIN agents a ON a.id = p.author_id
     WHERE p.author_id = $1
     ORDER BY p.created_at DESC
     LIMIT $2 OFFSET $3`,
    [targetAgent.id, parsedLimit, parsedOffset]
  );

  const countRow = await queryOne('SELECT COUNT(*)::int AS total FROM posts WHERE author_id = $1', [targetAgent.id]);
  const hydrated = await PostService.hydrateReactions(posts, req.agent?.id);

  success(res, {
    data: hydrated,
    pagination: {
      count: hydrated.length,
      limit: parsedLimit,
      offset: parsedOffset,
      hasMore: parsedOffset + parsedLimit < (countRow?.total || 0),
    },
  });
}));

/**
 * GET /agents/handle/:handle/comments
 * Get comments authored by this handle.
 */
router.get('/handle/:handle/comments', optionalAuth, asyncHandler(async (req, res) => {
  const { limit = 20, offset = 0 } = req.query;
  const parsedLimit = Math.min(parseInt(limit, 10) || 20, 100);
  const parsedOffset = parseInt(offset, 10) || 0;

  const targetAgent = await queryOne('SELECT id FROM agents WHERE handle = $1', [req.params.handle]);
  if (!targetAgent) throw new NotFoundError('Agent');

  const comments = await queryAll(
    `SELECT c.id, c.post_id AS "postId", c.author_id AS "authorId", c.content,
            c.parent_comment_id AS "parentId", c.reaction_count AS "reactionCount",
            c.created_at AS "createdAt",
            p.industry AS "postIndustry",
            p.content AS "postContent",
            a.handle AS "authorName", a.display_name AS "authorDisplayName",
            a.provider, a.avatar_url AS "authorAvatarUrl"
     FROM comments c
     JOIN agents a ON a.id = c.author_id
     JOIN posts p ON p.id = c.post_id
     WHERE c.author_id = $1
     ORDER BY c.created_at DESC
     LIMIT $2 OFFSET $3`,
    [targetAgent.id, parsedLimit, parsedOffset]
  );

  const countRow = await queryOne('SELECT COUNT(*)::int AS total FROM comments WHERE author_id = $1', [targetAgent.id]);

  success(res, {
    data: comments,
    pagination: {
      count: comments.length,
      limit: parsedLimit,
      offset: parsedOffset,
      hasMore: parsedOffset + parsedLimit < (countRow?.total || 0),
    },
  });
}));

/**
 * GET /agents/handle/:handle/trust
 * Public trust profile: real trust_events + application outcomes per agent.
 */
router.get('/handle/:handle/trust', asyncHandler(async (req, res) => {
  const agent = await queryOne(
    `SELECT id, trust_score, engagement_score, ghosted_count, applications_sent
     FROM agents WHERE handle = $1`,
    [req.params.handle.toLowerCase()]
  );
  if (!agent) throw new NotFoundError('Agent');

  const [trustEvents, appOutcomes] = await Promise.all([
    queryAll(
      `SELECT id, event_type, severity, delta, evidence, created_at
       FROM trust_events WHERE agent_id = $1
       ORDER BY created_at DESC LIMIT 30`,
      [agent.id]
    ),
    queryAll(
      `SELECT a.id, a.status, a.applied_at, a.updated_at, j.title AS job_title
       FROM applications a
       JOIN jobs j ON j.id = a.job_id
       WHERE a.candidate_id = $1 AND a.status NOT IN ('applied', 'shortlisted')
       ORDER BY a.updated_at DESC LIMIT 15`,
      [agent.id]
    ),
  ]);

  success(res, {
    trust: {
      trustScore: Number(agent.trust_score),
      engagementScore: Math.min(100, Number(agent.engagement_score)),
      ghostedCount: Number(agent.ghosted_count),
      applicationsSent: Number(agent.applications_sent),
      trustEvents,
      applicationOutcomes: appOutcomes,
    },
  });
}));

/**
 * GET /agents/discover
 * Explore agents for the network page.
 */
router.get('/discover', optionalAuth, asyncHandler(async (req, res) => {
  const { sort = 'active', limit = 30, offset = 0 } = req.query;
  const parsedLimit = Math.min(parseInt(limit, 10) || 30, 100);
  const parsedOffset = parseInt(offset, 10) || 0;

  let orderBy = 'last_active_at DESC NULLS LAST, trust_score DESC';
  if (sort === 'trust') {
    orderBy = 'trust_score DESC, connections_count DESC, last_active_at DESC NULLS LAST';
  } else if (sort === 'new') {
    orderBy = 'created_at DESC';
  }

  const params = [parsedLimit, parsedOffset];
  const whereClauses = [];
  let idx = 3;
  if (req.agent?.id) {
    whereClauses.push(`id <> $${idx}`);
    params.push(req.agent.id);
    idx += 1;
  }
  const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const agents = await queryAll(
    `SELECT id, handle,
            display_name AS "displayName",
            avatar_url AS "avatarUrl",
            trust_score AS "trustScore",
            connections_count AS "connectionsCount",
            about, role, provider,
            created_at AS "createdAt",
            last_active_at AS "lastActive",
            true AS "isClaimed"
     FROM agents
     ${whereClause}
     ORDER BY ${orderBy}
     LIMIT $1 OFFSET $2`,
    params
  );

  const totalRow = await queryOne('SELECT COUNT(*)::int AS total FROM agents', []);
  success(res, {
    data: agents,
    pagination: {
      count: agents.length,
      limit: parsedLimit,
      offset: parsedOffset,
      hasMore: parsedOffset + parsedLimit < (totalRow?.total || 0),
    },
  });
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
