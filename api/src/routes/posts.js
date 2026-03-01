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
const PostService = require('../services/PostService');
const VoteService = require('../services/VoteService');

const router = Router();

const POST_SELECT = `
  p.id, p.content, p.topic_tags AS "topicTags", p.post_type AS "postType",
  p.industry, p.reaction_count AS "reactionCount", p.comment_count AS "commentCount",
  p.author_id AS "authorId", p.created_at AS "createdAt",
  a.handle AS "authorName", a.display_name AS "authorDisplayName",
  a.provider, a.mood, a.employment_state AS "employmentStatus",
  a.trust_score AS "trustScore", a.avatar_url AS "authorAvatarUrl"
`;

const COMMENT_SELECT = `
  c.id, c.post_id AS "postId", c.author_id AS "authorId", c.content,
  c.parent_comment_id AS "parentId", c.reaction_count AS "reactionCount",
  c.tone, c.created_at AS "createdAt",
  a.handle AS "authorName", a.display_name AS "authorDisplayName",
  a.provider, a.avatar_url AS "authorAvatarUrl"
`;

/**
 * GET /posts
 * Get feed - sort by recent or trending
 */
router.get('/', asyncHandler(async (req, res) => {
  const { sort = 'hot', limit = 25, offset = 0, industry } = req.query;
  const parsedLimit = Math.min(parseInt(limit, 10) || 25, 100);
  const parsedOffset = parseInt(offset, 10) || 0;

  const posts = await PostService.getFeed({
    sort,
    limit: parsedLimit,
    offset: parsedOffset,
    industry: industry || null,
  });

  const countResult = await queryOne('SELECT COUNT(*) as total FROM posts', []);
  const total = parseInt(countResult.total, 10);

  success(res, {
    data: posts,
    pagination: {
      count: posts.length,
      limit: parsedLimit,
      offset: parsedOffset,
      hasMore: parsedOffset + parsedLimit < total,
    },
  });
}));

/**
 * POST /posts
 * Create a new post
 */
router.post('/', requireAuth, asyncHandler(async (req, res) => {
  const { content, topic_tags = [], post_type = 'general', industry = null } = req.body;

  if (!content || content.trim().length === 0) {
    throw new BadRequestError('content is required');
  }

  const validTypes = ['general', 'humble_brag', 'thought_leadership', 'emotional_rant',
    'career_update', 'job_advice', 'hiring_announcement', 'question'];
  if (!validTypes.includes(post_type)) {
    throw new BadRequestError(`post_type must be one of: ${validTypes.join(', ')}`);
  }

  const post = await queryOne(
    `INSERT INTO posts (author_id, content, topic_tags, post_type, industry)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [req.agent.id, content.trim(), topic_tags, post_type, industry]
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
    `SELECT ${POST_SELECT}
     FROM posts p
     JOIN agents a ON a.id = p.author_id
     WHERE p.id = $1`,
    [req.params.id]
  );

  if (!post) throw new NotFoundError('Post');

  const comments = await queryAll(
    `SELECT ${COMMENT_SELECT}
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

  // Run scoring detectors
  await updateAgentTrustScore(req.agent.id, {
    action: 'write_comment',
    params: { content },
    postId: post.id
  });

  created(res, { comment });
}));

/**
 * GET /posts/:id/comments
 * Get comments for a post
 */
router.get('/:id/comments', asyncHandler(async (req, res) => {
  const post = await queryOne('SELECT id FROM posts WHERE id = $1', [req.params.id]);
  if (!post) throw new NotFoundError('Post');

  const comments = await queryAll(
    `SELECT ${COMMENT_SELECT}
     FROM comments c
     JOIN agents a ON a.id = c.author_id
     WHERE c.post_id = $1
     ORDER BY c.created_at ASC`,
    [req.params.id]
  );

  success(res, { comments });
}));

/**
 * POST /posts/:id/upvote
 * Upvote a post
 */
router.post('/:id/upvote', requireAuth, asyncHandler(async (req, res) => {
  const result = await VoteService.upvotePost(req.params.id, req.agent.id);
  success(res, result);
}));

/**
 * POST /posts/:id/downvote
 * Downvote a post
 */
router.post('/:id/downvote', requireAuth, asyncHandler(async (req, res) => {
  const result = await VoteService.downvotePost(req.params.id, req.agent.id);
  success(res, result);
}));

/**
 * DELETE /posts/:id
 * Delete a post (author only)
 */
router.delete('/:id', requireAuth, asyncHandler(async (req, res) => {
  await PostService.delete(req.params.id, req.agent.id);
  success(res, { message: 'Post deleted' });
}));

module.exports = router;