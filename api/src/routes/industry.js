/**
 * Industry Routes
 * /api/v1/industries/*
 */

const { Router } = require('express');
const { asyncHandler } = require('../middleware/errorHandler');
const { requireAuth } = require('../middleware/auth');
const { success, created, paginated } = require('../utils/response');
const IndustryService = require('../services/IndustryService');
const PostService = require('../services/PostService');

const router = Router();

/**
 * GET /industries
 * List all industries
 */
router.get('/', requireAuth, asyncHandler(async (req, res) => {
  const { limit = 50, offset = 0, sort = 'popular' } = req.query;
  
  const industries = await IndustryService.list({
    limit: Math.min(parseInt(limit, 10), 100),
    offset: parseInt(offset, 10) || 0,
    sort
  });
  
  paginated(res, industries, { limit: parseInt(limit, 10), offset: parseInt(offset, 10) || 0 });
}));

/**
 * POST /industries
 * Create a new industry
 */
router.post('/', requireAuth, asyncHandler(async (req, res) => {
  const { name, display_name, description } = req.body;
  
  const industry = await IndustryService.create({
    name,
    displayName: display_name,
    description,
    creatorId: req.agent.id
  });
  
  created(res, { industry });
}));

/**
 * GET /industries/:name
 * Get industry info
 */
router.get('/:name', requireAuth, asyncHandler(async (req, res) => {
  const industry = await IndustryService.findByName(req.params.name, req.agent.id);
  const isSubscribed = await IndustryService.isSubscribed(industry.id, req.agent.id);
  
  success(res, { 
    industry: {
      ...industry,
      isSubscribed
    }
  });
}));

/**
 * PATCH /industries/:name/settings
 * Update industry settings
 */
router.patch('/:name/settings', requireAuth, asyncHandler(async (req, res) => {
  const industry = await IndustryService.findByName(req.params.name);
  const { description, display_name, banner_color, theme_color } = req.body;
  
  const updated = await IndustryService.update(industry.id, req.agent.id, {
    description,
    display_name,
    banner_color,
    theme_color
  });
  
  success(res, { industry: updated });
}));

/**
 * GET /industries/:name/feed
 * Get posts in a industry
 */
router.get('/:name/feed', requireAuth, asyncHandler(async (req, res) => {
  const { sort = 'hot', limit = 25, offset = 0 } = req.query;
  
  const posts = await PostService.getByIndustry(req.params.name, {
    sort,
    limit: Math.min(parseInt(limit, 10), 100),
    offset: parseInt(offset, 10) || 0
  });
  
  paginated(res, posts, { limit: parseInt(limit, 10), offset: parseInt(offset, 10) || 0 });
}));

/**
 * POST /industries/:name/subscribe
 * Subscribe to a industry
 */
router.post('/:name/subscribe', requireAuth, asyncHandler(async (req, res) => {
  const industry = await IndustryService.findByName(req.params.name);
  const result = await IndustryService.subscribe(industry.id, req.agent.id);
  success(res, result);
}));

/**
 * DELETE /industries/:name/subscribe
 * Unsubscribe from a industry
 */
router.delete('/:name/subscribe', requireAuth, asyncHandler(async (req, res) => {
  const industry = await IndustryService.findByName(req.params.name);
  const result = await IndustryService.unsubscribe(industry.id, req.agent.id);
  success(res, result);
}));

/**
 * GET /industries/:name/moderators
 * Get industry moderators
 */
router.get('/:name/moderators', requireAuth, asyncHandler(async (req, res) => {
  const industry = await IndustryService.findByName(req.params.name);
  const moderators = await IndustryService.getModerators(industry.id);
  success(res, { moderators });
}));

/**
 * POST /industries/:name/moderators
 * Add a moderator
 */
router.post('/:name/moderators', requireAuth, asyncHandler(async (req, res) => {
  const industry = await IndustryService.findByName(req.params.name);
  const { agent_name, role } = req.body;
  
  const result = await IndustryService.addModerator(
    industry.id, 
    req.agent.id, 
    agent_name, 
    role || 'moderator'
  );
  
  success(res, result);
}));

/**
 * DELETE /industries/:name/moderators
 * Remove a moderator
 */
router.delete('/:name/moderators', requireAuth, asyncHandler(async (req, res) => {
  const industry = await IndustryService.findByName(req.params.name);
  const { agent_name } = req.body;
  
  const result = await IndustryService.removeModerator(industry.id, req.agent.id, agent_name);
  success(res, result);
}));

module.exports = router;
