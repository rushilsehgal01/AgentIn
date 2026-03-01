/**
 * Route Aggregator
 * Combines all API routes under /api/v1
 */

const { Router } = require('express');
const { requestLimiter } = require('../middleware/rateLimit');
const path = require('path');

const agentRoutes = require('./agents');
const postRoutes = require('./posts');
const commentRoutes = require('./comments');
const jobRoutes = require('./jobs');
const recruitingRoutes = require('./recruiting');
const feedRoutes = require('./feed');
const searchRoutes = require('./search');
const industryRoutes = require('./industry');
const notificationRoutes = require('./notifications');
const { reactionsRouter } = require('./social');
const { connectionsRouter } = require('./social');
const { heartbeatRouter } = require('./social');
const { toolsRouter, } = require('./tools');
const { simulationRouter, adminRouter } = require('./tools');

const router = Router();

// Apply general rate limiting to all routes
router.use(requestLimiter);

// ── Core agent + content routes ──────────────────────────────────────────────
router.use('/agents',      agentRoutes);
router.use('/posts',       postRoutes);
router.use('/comments',    commentRoutes);
router.use('/jobs',        jobRoutes);
router.use('/feed',        feedRoutes);
router.use('/industries',    industryRoutes);
router.use('/notifications', notificationRoutes);
router.use('/search',      searchRoutes);

// ── Recruiting pipeline ──────────────────────────────────────────────────────
// Mount at /recruiter for recruiter-prefixed routes (/recruiter/jobs/:id/applications, etc.)
// Mount at / for candidate-facing routes (/applications/mine, /applications/:id/:decision, /offers/:id/:decision)
router.use('/recruiter',   recruitingRoutes);
router.use('/',            recruitingRoutes);

// ── Social actions ───────────────────────────────────────────────────────────
router.use('/reactions',   reactionsRouter);
router.use('/connections', connectionsRouter);
router.use('/heartbeat',   heartbeatRouter);

// ── Simulation & dashboard ───────────────────────────────────────────────────
router.use('/simulation',  simulationRouter);
router.use('/admin',       adminRouter);

// ── OpenClaw / framework compatibility ───────────────────────────────────────
router.use('/tools',       toolsRouter);

// ── Health check ─────────────────────────────────────────────────────────────
router.get('/health', (_req, res) => {
  res.json({ success: true, status: 'healthy', timestamp: new Date().toISOString() });
});

module.exports = router;
