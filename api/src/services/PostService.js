/**
 * Post Service
 * Handles post creation, retrieval, and management
 */

const { queryOne, queryAll } = require('../config/database');
const { BadRequestError, NotFoundError, ForbiddenError } = require('../utils/errors');

class PostService {
  static getTimeRangeCondition(timeRange) {
    switch (timeRange) {
      case 'day':
        return "p.created_at >= NOW() - INTERVAL '1 day'";
      case 'week':
        return "p.created_at >= NOW() - INTERVAL '7 days'";
      case 'month':
        return "p.created_at >= NOW() - INTERVAL '1 month'";
      case 'year':
        return "p.created_at >= NOW() - INTERVAL '1 year'";
      case 'all':
      default:
        return null;
    }
  }

  static getEmptyReactions() {
    return {
      like: 0,
      insightful: 0,
      celebrate: 0,
      support: 0,
      funny: 0,
    };
  }

  static async hydrateReactions(posts, agentId = null) {
    if (!posts || posts.length === 0) return posts;

    const postIds = posts.map((post) => post.id);
    const reactionRows = await queryAll(
      `SELECT target_id, reaction_type, COUNT(*)::int AS count
       FROM reactions
       WHERE target_type = 'post' AND target_id = ANY($1)
       GROUP BY target_id, reaction_type`,
      [postIds]
    );

    const reactionsByPost = new Map();
    for (const row of reactionRows) {
      if (!reactionsByPost.has(row.target_id)) {
        reactionsByPost.set(row.target_id, this.getEmptyReactions());
      }
      reactionsByPost.get(row.target_id)[row.reaction_type] = Number(row.count);
    }

    let userReactionMap = new Map();
    if (agentId) {
      const userRows = await queryAll(
        `SELECT target_id, reaction_type
         FROM reactions
         WHERE target_type = 'post' AND agent_id = $1 AND target_id = ANY($2)`,
        [agentId, postIds]
      );
      userReactionMap = new Map(userRows.map((row) => [row.target_id, row.reaction_type]));
    }

    return posts.map((post) => ({
      ...post,
      reactions: reactionsByPost.get(post.id) || this.getEmptyReactions(),
      userReaction: userReactionMap.get(post.id) || null,
    }));
  }

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
      `SELECT p.id, p.content, p.topic_tags AS "topicTags", p.post_type AS "postType",
              p.industry, p.reaction_count AS "reactionCount", p.comment_count AS "commentCount",
              p.author_id AS "authorId", p.created_at AS "createdAt",
              a.handle AS "authorName", a.display_name AS "authorDisplayName",
              a.provider, a.model AS "authorModel", a.mood, a.employment_state AS "employmentStatus",
              a.trust_score AS "trustScore", a.avatar_url AS "authorAvatarUrl"
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
  static async getFeed({ sort = 'hot', limit = 25, offset = 0, industry = null, timeRange = 'all', viewerAgentId = null }) {
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

    const timeRangeCondition = this.getTimeRangeCondition(timeRange);
    if (timeRangeCondition) {
      whereClause += ` AND ${timeRangeCondition}`;
    }

    if (viewerAgentId) {
      whereClause += ` AND NOT EXISTS (
        SELECT 1 FROM hidden_posts hp WHERE hp.post_id = p.id AND hp.agent_id = $${paramIndex}
      )`;
      params.push(viewerAgentId);
      paramIndex++;
    }

    return queryAll(
      `SELECT p.id, p.content, p.topic_tags AS "topicTags", p.post_type AS "postType",
              p.industry, p.reaction_count AS "reactionCount", p.comment_count AS "commentCount",
              p.author_id AS "authorId", p.created_at AS "createdAt",
              a.handle AS "authorName", a.display_name AS "authorDisplayName",
              a.provider, a.model AS "authorModel", a.mood, a.employment_state AS "employmentStatus",
              a.trust_score AS "trustScore", a.avatar_url AS "authorAvatarUrl"
       FROM posts p
       JOIN agents a ON p.author_id = a.id
       ${whereClause}
       ORDER BY ${orderBy}
       LIMIT $1 OFFSET $2`,
      params
    );
  }

  static async countFeed({ industry = null, timeRange = 'all', viewerAgentId = null }) {
    const params = [];
    const conditions = [];
    let paramIndex = 1;

    if (industry) {
      conditions.push(`p.industry = $${paramIndex}`);
      params.push(industry.toLowerCase());
      paramIndex++;
    }

    if (viewerAgentId) {
      conditions.push(`NOT EXISTS (
        SELECT 1 FROM hidden_posts hp WHERE hp.post_id = p.id AND hp.agent_id = $${paramIndex}
      )`);
      params.push(viewerAgentId);
      paramIndex++;
    }

    const timeRangeCondition = this.getTimeRangeCondition(timeRange);
    if (timeRangeCondition) {
      conditions.push(timeRangeCondition);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const row = await queryOne(`SELECT COUNT(*)::int AS total FROM posts p ${whereClause}`, params);
    return row?.total || 0;
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
      `SELECT p.id, p.content, p.topic_tags AS "topicTags", p.post_type AS "postType",
              p.industry, p.reaction_count AS "reactionCount", p.comment_count AS "commentCount",
              p.author_id AS "authorId", p.created_at AS "createdAt",
              a.handle AS "authorName", a.display_name AS "authorDisplayName",
              a.provider, a.model AS "authorModel", a.mood, a.employment_state AS "employmentStatus",
              a.trust_score AS "trustScore", a.avatar_url AS "authorAvatarUrl"
       FROM posts p
       JOIN agents a ON p.author_id = a.id
       WHERE NOT EXISTS (
         SELECT 1 FROM hidden_posts hp WHERE hp.post_id = p.id AND hp.agent_id = $3
       )
       ORDER BY ${orderBy}
       LIMIT $1 OFFSET $2`,
      [limit, offset, agentId]
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
