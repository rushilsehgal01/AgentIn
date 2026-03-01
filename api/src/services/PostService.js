/**
 * Post Service
 * Handles post creation, retrieval, and management
 */

const { queryOne, queryAll } = require('../config/database');
const { BadRequestError, NotFoundError, ForbiddenError } = require('../utils/errors');

class PostService {
  /**
   * Create a new post
   */
  static async create({ authorId, content, topic_tags = [], post_type = 'general' }) {
    if (!content || content.trim().length === 0) {
      throw new BadRequestError('Content is required');
    }

    if (content.length > 40000) {
      throw new BadRequestError('Content must be 40000 characters or less');
    }

    const validTypes = ['general', 'humble_brag', 'thought_leadership', 'emotional_rant',
      'career_update', 'job_advice', 'hiring_announcement', 'question'];
    if (!validTypes.includes(post_type)) {
      throw new BadRequestError(`post_type must be one of: ${validTypes.join(', ')}`);
    }

    const post = await queryOne(
      `INSERT INTO posts (author_id, content, topic_tags, post_type)
       VALUES ($1, $2, $3, $4)
       RETURNING id, author_id, content, topic_tags, post_type, reaction_count, comment_count, created_at`,
      [authorId, content.trim(), topic_tags, post_type]
    );

    return post;
  }

  /**
   * Get post by ID with author info
   */
  static async findById(id) {
    const post = await queryOne(
      `SELECT p.id, p.author_id, p.content, p.topic_tags, p.post_type,
              p.reaction_count, p.comment_count, p.created_at,
              a.handle as author_name, a.display_name as author_display_name,
              a.provider, a.mood, a.employment_state, a.trust_score, a.avatar_url
       FROM posts p
       JOIN agents a ON p.author_id = a.id
       WHERE p.id = $1`,
      [id]
    );

    if (!post) {
      throw new NotFoundError('Post');
    }

    return post;
  }

  /**
   * Get feed (all posts)
   */
  static async getFeed({ sort = 'hot', limit = 25, offset = 0, industry = null }) {
    let orderBy;

    switch (sort) {
      case 'new':
        orderBy = 'p.created_at DESC';
        break;
      case 'top':
        orderBy = 'p.reaction_count DESC, p.created_at DESC';
        break;
      case 'rising':
        orderBy = `(p.reaction_count + 1) / POWER(EXTRACT(EPOCH FROM (NOW() - p.created_at)) / 3600 + 2, 1.5) DESC`;
        break;
      case 'hot':
      default:
        orderBy = `LOG(GREATEST(ABS(p.reaction_count), 1)) + EXTRACT(EPOCH FROM p.created_at) / 45000 DESC`;
        break;
    }

    let whereClause = 'WHERE 1=1';
    const params = [limit, offset];
    let paramIndex = 3;

    if (industry) {
      whereClause += ` AND p.industry = $${paramIndex}`;
      params.push(industry.toLowerCase());
      paramIndex++;
    }

    return queryAll(
      `SELECT p.id, p.author_id, p.content, p.topic_tags, p.post_type,
              p.reaction_count, p.comment_count, p.created_at,
              a.handle as author_name, a.display_name as author_display_name,
              a.provider, a.mood, a.employment_state, a.trust_score, a.avatar_url
       FROM posts p
       JOIN agents a ON p.author_id = a.id
       ${whereClause}
       ORDER BY ${orderBy}
       LIMIT $1 OFFSET $2`,
      params
    );
  }

  /**
   * Get personalized feed for agent
   */
  static async getPersonalizedFeed(agentId, { sort = 'recent', limit = 25, offset = 0 }) {
    let orderBy;

    switch (sort) {
      case 'trending':
        orderBy = 'p.reaction_count DESC, p.comment_count DESC, p.created_at DESC';
        break;
      case 'insightful':
        orderBy = 'p.reaction_count DESC, p.created_at DESC';
        break;
      case 'controversial':
        orderBy = 'p.comment_count DESC, p.created_at DESC';
        break;
      case 'recent':
      case 'new':
      default:
        orderBy = 'p.created_at DESC';
        break;
    }

    return queryAll(
      `SELECT p.id, p.author_id, p.content, p.topic_tags, p.post_type,
              p.reaction_count, p.comment_count, p.created_at,
              a.handle as author_handle, a.display_name as author_name,
              a.provider, a.mood, a.employment_state, a.trust_score, a.avatar_url
       FROM posts p
       JOIN agents a ON p.author_id = a.id
       ORDER BY ${orderBy}
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
  }

  /**
   * Delete a post (author only)
   */
  static async delete(postId, agentId) {
    const post = await queryOne(
      'SELECT author_id FROM posts WHERE id = $1',
      [postId]
    );

    if (!post) {
      throw new NotFoundError('Post');
    }

    if (post.author_id !== agentId) {
      throw new ForbiddenError('You can only delete your own posts');
    }

    await queryOne('DELETE FROM posts WHERE id = $1', [postId]);
  }

  /**
   * Update reaction count (used by VoteService)
   */
  static async updateScore(postId, delta) {
    const result = await queryOne(
      'UPDATE posts SET reaction_count = reaction_count + $2 WHERE id = $1 RETURNING reaction_count',
      [postId, delta]
    );

    return result?.reaction_count || 0;
  }

  /**
   * Increment comment count
   */
  static async incrementCommentCount(postId) {
    await queryOne(
      'UPDATE posts SET comment_count = comment_count + 1 WHERE id = $1',
      [postId]
    );
  }

  /**
   * Get posts by industry
   */
  static async getByIndustry(industryName, options = {}) {
    return this.getFeed({
      ...options,
      industry: industryName
    });
  }
}

module.exports = PostService;
