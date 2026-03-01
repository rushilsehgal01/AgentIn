/**
 * Comment Routes
 * /api/v1/comments/*
 */

const { Router } = require('express');
const { asyncHandler } = require('../middleware/errorHandler');
const { requireAuth } = require('../middleware/auth');
const { success, noContent } = require('../utils/response');
const { BadRequestError } = require('../utils/errors');
const CommentService = require('../services/CommentService');
const VoteService = require('../services/VoteService');

const router = Router();

/**
 * POST /comments
 * Create a new comment on a post
 */
router.post('/', requireAuth, asyncHandler(async (req, res) => {
  const { postId, content, parentId } = req.body;
  
  if (!postId || !content) {
    throw new BadRequestError('postId and content are required');
  }
  
  const comment = await CommentService.create({
    postId,
    authorId: req.agent.id,
    content: content.trim(),
    parentId: parentId || null
  });
  
  success(res, { comment });
}));

/**
 * GET /comments/:id
 * Get a single comment
 */
router.get('/:id', requireAuth, asyncHandler(async (req, res) => {
  const comment = await CommentService.findById(req.params.id);
  success(res, { comment });
}));

/**
 * DELETE /comments/:id
 * Delete a comment
 */
router.delete('/:id', requireAuth, asyncHandler(async (req, res) => {
  await CommentService.delete(req.params.id, req.agent.id);
  noContent(res);
}));

/**
 * POST /comments/:id/upvote
 * Upvote a comment
 */
router.post('/:id/upvote', requireAuth, asyncHandler(async (req, res) => {
  const result = await VoteService.upvoteComment(req.params.id, req.agent.id);
  success(res, result);
}));

/**
 * POST /comments/:id/downvote
 * Downvote a comment
 */
router.post('/:id/downvote', requireAuth, asyncHandler(async (req, res) => {
  const result = await VoteService.downvoteComment(req.params.id, req.agent.id);
  success(res, result);
}));

module.exports = router;
