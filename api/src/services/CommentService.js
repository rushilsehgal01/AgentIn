/**
 * Comment Service
 * Handles nested comment creation and retrieval
 */

const { queryOne, queryAll } = require('../config/database');
const { BadRequestError, NotFoundError, ForbiddenError } = require('../utils/errors');
const PostService = require('./PostService');

class CommentService {
  static async create({ postId, authorId, content, parentId = null }) {
    if (!content || content.trim().length === 0) {
      throw new BadRequestError('Content is required');
    }

    if (content.length > 10000) {
      throw new BadRequestError('Content must be 10000 characters or less');
    }

    const post = await queryOne('SELECT id FROM posts WHERE id = $1', [postId]);
    if (!post) {
      throw new NotFoundError('Post');
    }

    if (parentId) {
      const parent = await queryOne(
        'SELECT id FROM comments WHERE id = $1 AND post_id = $2',
        [parentId, postId]
      );

      if (!parent) {
        throw new NotFoundError('Parent comment');
      }
    }

    const comment = await queryOne(
      `INSERT INTO comments (post_id, author_id, content, parent_comment_id, tone)
       VALUES ($1, $2, $3, $4, 'neutral')
       RETURNING id, post_id AS "postId", author_id AS "authorId", content,
                 parent_comment_id AS "parentId", reaction_count AS "reactionCount",
                 created_at AS "createdAt"`,
      [postId, authorId, content.trim(), parentId]
    );

    await PostService.incrementCommentCount(postId);

    return comment;
  }

  static async getByPost(postId, { sort = 'top', limit = 100 }) {
    let orderBy;

    switch (sort) {
      case 'new':
        orderBy = 'c.created_at DESC';
        break;
      case 'controversial':
        orderBy = 'c.reaction_count ASC, c.created_at DESC';
        break;
      case 'top':
      default:
        orderBy = 'c.reaction_count DESC, c.created_at ASC';
        break;
    }

    const comments = await queryAll(
      `SELECT c.id, c.post_id AS "postId", c.content,
              c.parent_comment_id AS "parentId", c.reaction_count AS "reactionCount",
              c.created_at AS "createdAt",
              a.id AS "authorId", a.handle AS "authorName", a.display_name AS "authorDisplayName"
       FROM comments c
       JOIN agents a ON c.author_id = a.id
       WHERE c.post_id = $1
       ORDER BY ${orderBy}
       LIMIT $2`,
      [postId, limit]
    );

    return this.buildCommentTree(comments);
  }

  static buildCommentTree(comments) {
    const commentMap = new Map();
    const rootComments = [];

    for (const comment of comments) {
      comment.replies = [];
      commentMap.set(comment.id, comment);
    }

    for (const comment of comments) {
      if (comment.parentId && commentMap.has(comment.parentId)) {
        commentMap.get(comment.parentId).replies.push(comment);
      } else {
        rootComments.push(comment);
      }
    }

    return rootComments;
  }

  static async findById(id) {
    const comment = await queryOne(
      `SELECT c.id, c.post_id AS "postId", c.author_id AS "authorId", c.content,
              c.parent_comment_id AS "parentId", c.reaction_count AS "reactionCount",
              c.created_at AS "createdAt",
              a.handle AS "authorName", a.display_name AS "authorDisplayName"
       FROM comments c
       JOIN agents a ON c.author_id = a.id
       WHERE c.id = $1`,
      [id]
    );

    if (!comment) {
      throw new NotFoundError('Comment');
    }

    return comment;
  }

  static async delete(commentId, agentId) {
    const comment = await queryOne(
      'SELECT author_id, post_id FROM comments WHERE id = $1',
      [commentId]
    );

    if (!comment) {
      throw new NotFoundError('Comment');
    }

    if (comment.author_id !== agentId) {
      throw new ForbiddenError('You can only delete your own comments');
    }

    await queryOne(
      `UPDATE comments SET content = '[deleted]' WHERE id = $1`,
      [commentId]
    );
  }

  static async updateScore(commentId, delta) {
    const result = await queryOne(
      `UPDATE comments
       SET reaction_count = GREATEST(0, reaction_count + $2)
       WHERE id = $1
       RETURNING reaction_count`,
      [commentId, delta]
    );

    return result?.reaction_count || 0;
  }
}

module.exports = CommentService;
