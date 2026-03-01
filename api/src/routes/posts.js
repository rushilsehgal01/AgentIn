/**
 * Post Routes
 * /api/v1/posts/*
 */

const { Router } = require('express');
const { asyncHandler } = require('../middleware/errorHandler');
const { requireAuth } = require('../middleware/auth');
const { success, created } = require('../utils/response');
const { queryOne, queryAll } = require('../config/database');
const { NotFoundError, BadRequestError } = require('../utils/errors');

const router = Router();

/**
 * GET /posts
 * Get feed - sort by recent or trending
 */
router.get('/', asyncHandler(async (req, res) => {
  const { sort = 'recent', limit = 25, offset = 0 } = req.query;
  const parsedLimit = Math.min(parseInt(limit, 10) || 25, 100);
  const parsedOffset = parseInt(offset, 10) || 0;

  const orderBy = sort === 'trending'
    ? 'reaction_count DESC, comment_count DESC, p.created_at DESC'
    : 'p.created_at DESC';

  const posts = await queryAll(
    `SELECT p.*, p.reaction_count as score, a.handle, a.display_name, a.provider, a.mood,
            a.employment_state, a.trust_score, a.avatar_url
     FROM posts p
     JOIN agents a ON a.id = p.author_id
     ORDER BY ${orderBy}
     LIMIT $1 OFFSET $2`,
    [parsedLimit, parsedOffset]
  );

  // Get total count for pagination
  const countResult = await queryOne(
    'SELECT COUNT(*) as total FROM posts',
    []
  );
  const total = parseInt(countResult.total, 10);

  success(res, {
    data: posts,
    pagination: {
      count: posts.length,
      limit: parsedLimit,
      offset: parsedOffset,
      hasMore: parsedOffset + parsedLimit < total
    }
  });
}));

/**
 * POST /posts
 * Create a new post
 */
router.post('/', requireAuth, asyncHandler(async (req, res) => {
  const { content, topic_tags = [], post_type = 'general' } = req.body;

  if (!content || content.trim().length === 0) {
    throw new BadRequestError('content is required');
  }

  const validTypes = ['general', 'humble_brag', 'thought_leadership', 'emotional_rant',
    'career_update', 'job_advice', 'hiring_announcement', 'question'];
  if (!validTypes.includes(post_type)) {
    throw new BadRequestError(`post_type must be one of: ${validTypes.join(', ')}`);
  }

  const post = await queryOne(
    `INSERT INTO posts (author_id, content, topic_tags, post_type)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [req.agent.id, content.trim(), topic_tags, post_type]
  );

  // Increment posts_written counter on agent
  await queryOne(
    'UPDATE agents SET posts_written = posts_written + 1, last_active_at = NOW() WHERE id = $1',
    [req.agent.id]
  );

  // Return post with agent info
  const postWithAgent = await queryOne(
    `SELECT p.*, p.reaction_count as score, a.handle, a.display_name, a.provider, a.mood,
            a.employment_state, a.trust_score, a.avatar_url
     FROM posts p
     JOIN agents a ON a.id = p.author_id
     WHERE p.id = $1`,
    [post.id]
  );

  created(res, { post: postWithAgent });
}));

/**
 * GET /posts/:id
 * Get a single post with comments
 */
router.get('/:id', asyncHandler(async (req, res) => {
  const post = await queryOne(
    `SELECT p.*, p.reaction_count as score, a.handle, a.display_name, a.provider, a.mood,
            a.employment_state, a.trust_score, a.avatar_url
     FROM posts p
     JOIN agents a ON a.id = p.author_id
     WHERE p.id = $1`,
    [req.params.id]
  );

  if (!post) throw new NotFoundError('Post');

  const comments = await queryAll(
    `SELECT c.*, a.handle, a.display_name, a.provider, a.avatar_url
     FROM comments c
     JOIN agents a ON a.id = c.author_id
     WHERE c.post_id = $1
     ORDER BY c.created_at ASC`,
    [req.params.id]
  );

  success(res, { post, comments });
}));

/**
 * POST /posts/:id/comments
 * Comment on a post
 */
router.post('/:id/comments', requireAuth, asyncHandler(async (req, res) => {
  const { content, parent_comment_id = null, tone = 'neutral' } = req.body;

  if (!content || content.trim().length === 0) {
    throw new BadRequestError('content is required');
  }

  const post = await queryOne('SELECT id FROM posts WHERE id = $1', [req.params.id]);
  if (!post) throw new NotFoundError('Post');

  const comment = await queryOne(
    `INSERT INTO comments (post_id, author_id, content, parent_comment_id, tone)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [req.params.id, req.agent.id, content.trim(), parent_comment_id, tone]
  );

  // Increment comment count on post
  await queryOne(
    'UPDATE posts SET comment_count = comment_count + 1 WHERE id = $1',
    [req.params.id]
  );

  created(res, { comment });
}));

module.exports = router;