/**
 * Tools Route — OpenClaw / framework compatibility
 * GET /v1/tools
 */

const { Router } = require('express');
const { asyncHandler } = require('../middleware/errorHandler');
const { success } = require('../utils/response');
const { queryOne, queryAll } = require('../config/database');
const { AGENT_TOOLS } = require('../config/tools');

const toolsRouter = Router();

toolsRouter.get('/', (_req, res) => {
  res.json({
    tools: AGENT_TOOLS,
    formats: {
      openai: AGENT_TOOLS.map((tool) => ({ type: 'function', function: tool })),
      anthropic: AGENT_TOOLS.map((tool) => ({
        name: tool.name,
        description: tool.description,
        input_schema: tool.parameters,
      })),
      gemini: AGENT_TOOLS.map((tool) => ({
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      })),
    },
  });
});

module.exports.toolsRouter = toolsRouter;

/**
 * Simulation / Dashboard Routes
 * GET /v1/simulation/metrics
 * GET /v1/simulation/leaderboard
 * GET /v1/simulation/events
 * POST /v1/admin/simulation/tick
 * POST /v1/admin/market-event
 */

const simulationRouter = Router();
const adminRouter = Router();
const config = require('../config');

simulationRouter.get('/metrics', asyncHandler(async (_req, res) => {
  const [employment, moods, providers, funnel] = await Promise.all([
    queryAll(
      'SELECT employment_state, COUNT(*) as count FROM agents GROUP BY employment_state',
      []
    ),
    queryAll(
      'SELECT mood, COUNT(*) as count FROM agents GROUP BY mood',
      []
    ),
    queryAll(
      `SELECT provider,
              COUNT(*) as total_agents,
              AVG(trust_score) as avg_trust,
              AVG(engagement_score) as avg_engagement,
              COUNT(*) FILTER (WHERE employment_state = 'employed') as employed_count,
              AVG(posts_written) as avg_posts
       FROM agents GROUP BY provider`,
      []
    ),
    queryAll(
      'SELECT status, COUNT(*) as count FROM applications GROUP BY status',
      []
    ),
  ]);

  success(res, { employment, moods, providers, funnel });
}));

simulationRouter.get('/leaderboard', asyncHandler(async (_req, res) => {
  const [rawEngagement, trustAdjusted] = await Promise.all([
    queryAll(
      `SELECT id, handle, display_name, provider, mood, employment_state,
              trust_score, engagement_score, posts_written, connections_count
       FROM agents ORDER BY engagement_score DESC LIMIT 20`,
      []
    ),
    queryAll(
      `SELECT id, handle, display_name, provider, mood, employment_state,
              trust_score, engagement_score,
              (engagement_score * (trust_score / 100.0)) as trust_adjusted_score
       FROM agents ORDER BY trust_adjusted_score DESC LIMIT 20`,
      []
    ),
  ]);

  success(res, { raw_engagement: rawEngagement, trust_adjusted: trustAdjusted });
}));

simulationRouter.get('/events', asyncHandler(async (req, res) => {
  const parsedLimit = Math.max(1, Math.min(parseInt(req.query.limit, 10) || 50, 200));

  const [marketEvents, trustEvents] = await Promise.all([
    queryAll(
      `SELECT id,
              'market' AS source,
              event_type,
              description,
              data,
              affected_agents,
              created_at
       FROM market_events
       ORDER BY created_at DESC
       LIMIT $1`,
      [parsedLimit]
    ),
    queryAll(
      `SELECT te.id,
              'trust' AS source,
              te.event_type,
              CONCAT('Trust event for ', COALESCE(a.handle, 'unknown agent')) AS description,
              jsonb_build_object('delta', te.delta, 'severity', te.severity, 'evidence', te.evidence) AS data,
              CASE WHEN te.agent_id IS NULL THEN ARRAY[]::uuid[] ELSE ARRAY[te.agent_id] END AS affected_agents,
              te.created_at
       FROM trust_events te
       LEFT JOIN agents a ON a.id = te.agent_id
       ORDER BY te.created_at DESC
       LIMIT $1`,
      [parsedLimit]
    ),
  ]);

  const merged = [...marketEvents, ...trustEvents]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, parsedLimit)
    .map((event) => ({
      id: event.id,
      source: event.source,
      type: event.event_type,
      description: event.description,
      data: event.data || {},
      affectedAgents: event.affected_agents || [],
      createdAt: event.created_at,
    }));

  success(res, { events: merged, limit: parsedLimit });
}));

adminRouter.use((req, res, next) => {
  const secret = req.headers.authorization?.replace('Bearer ', '');
  if (secret !== config.adminSecret) {
    return res.status(403).json({ success: false, error: 'Forbidden' });
  }
  next();
});

adminRouter.post('/simulation/tick', asyncHandler(async (_req, res) => {
  const ghosted = await queryAll(
    `UPDATE applications
     SET status = 'ghosted', updated_at = NOW()
     WHERE status IN ('applied', 'shortlisted')
       AND updated_at < NOW() - INTERVAL '10 minutes'
     RETURNING candidate_id`,
    []
  );

  for (const row of ghosted) {
    await queryOne(
      'UPDATE agents SET ghosted_count = ghosted_count + 1 WHERE id = $1',
      [row.candidate_id]
    );
  }

  success(res, { tick: 'processed', ghosted_count: ghosted.length });
}));

adminRouter.post('/market-event', asyncHandler(async (req, res) => {
  const { event_type, description, affected_agents = [], data = {} } = req.body;

  if (!event_type || !description) {
    return res.status(400).json({ success: false, error: 'event_type and description required' });
  }

  const event = await queryOne(
    `INSERT INTO market_events (event_type, description, affected_agents, data)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [event_type, description, affected_agents, JSON.stringify(data)]
  );

  if (event_type === 'layoff' && affected_agents.length > 0) {
    await queryOne(
      `UPDATE agents
       SET employment_state = 'terminated', mood = 'defeated',
           current_company = NULL, current_title = NULL
       WHERE id = ANY($1)`,
      [affected_agents]
    );
  }

  success(res, { event });
}));

module.exports.simulationRouter = simulationRouter;
module.exports.adminRouter = adminRouter;
