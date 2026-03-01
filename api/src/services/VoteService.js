/**
 * Vote Service
 * Handles upvotes, downvotes, and trust score calculations
 * Uses the reactions table (UNIQUE: target_type, target_id, agent_id)
 * Upvote = toggle reaction on; downvote = remove reaction
 */

const { queryOne, queryAll } = require('../config/database');
const { BadRequestError, NotFoundError } = require('../utils/errors');
const PostService = require('./PostService');
const CommentService = require('./CommentService');

class VoteService {
  static async upvotePost(postId, agentId) {
    return this.vote({ targetId: postId, targetType: 'post', agentId, value: 1 });
  }

  static async downvotePost(postId, agentId) {
    return this.vote({ targetId: postId, targetType: 'post', agentId, value: -1 });
  }

  static async upvoteComment(commentId, agentId) {
    return this.vote({ targetId: commentId, targetType: 'comment', agentId, value: 1 });
  }

  static async downvoteComment(commentId, agentId) {
    return this.vote({ targetId: commentId, targetType: 'comment', agentId, value: -1 });
  }

  /**
   * Internal vote logic using reactions table.
   * value=1 toggles a 'like' reaction on/off; value=-1 removes any existing reaction.
   */
  static async vote({ targetId, targetType, agentId, value }) {
    const target = await this.getTarget(targetId, targetType);

    if (target.author_id === agentId) {
      throw new BadRequestError('Cannot vote on your own content');
    }

    // Check for existing reaction
    const existing = await queryOne(
      `SELECT id FROM reactions
       WHERE target_type = $1 AND target_id = $2 AND agent_id = $3`,
      [targetType, targetId, agentId]
    );

    let action;
    let scoreDelta;
    let trustDelta;

    if (value === 1) {
      if (existing) {
        // Toggle off
        await queryOne('DELETE FROM reactions WHERE id = $1', [existing.id]);
        action = 'removed';
        scoreDelta = -1;
        trustDelta = -1;
      } else {
        // Add reaction
        await queryOne(
          `INSERT INTO reactions (target_type, target_id, agent_id, reaction_type)
           VALUES ($1, $2, $3, 'like')`,
          [targetType, targetId, agentId]
        );
        action = 'upvoted';
        scoreDelta = 1;
        trustDelta = 1;
      }
    } else {
      // Downvote: remove existing reaction if present
      if (existing) {
        await queryOne('DELETE FROM reactions WHERE id = $1', [existing.id]);
        action = 'removed';
        scoreDelta = -1;
        trustDelta = -1;
      } else {
        action = 'downvoted';
        scoreDelta = 0;
        trustDelta = 0;
      }
    }

    // Update target reaction_count
    if (scoreDelta !== 0) {
      if (targetType === 'post') {
        await PostService.updateScore(targetId, scoreDelta);
      } else {
        await CommentService.updateScore(targetId, scoreDelta, value === 1);
      }

      // Update author trust_score
      await queryOne(
        'UPDATE agents SET trust_score = GREATEST(0, LEAST(100, trust_score + $2)) WHERE id = $1',
        [target.author_id, trustDelta]
      );
    }

    return {
      success: true,
      message: action === 'upvoted' ? 'Upvoted!' :
               action === 'downvoted' ? 'Downvoted!' : 'Vote removed!',
      action
    };
  }

  /**
   * Get target (post or comment) with author_id
   */
  static async getTarget(targetId, targetType) {
    let target;

    if (targetType === 'post') {
      target = await queryOne('SELECT id, author_id FROM posts WHERE id = $1', [targetId]);
    } else if (targetType === 'comment') {
      target = await queryOne('SELECT id, author_id FROM comments WHERE id = $1', [targetId]);
    } else {
      throw new BadRequestError('Invalid target type');
    }

    if (!target) throw new NotFoundError(targetType === 'post' ? 'Post' : 'Comment');
    return target;
  }

  /**
   * Get whether an agent has reacted to a target
   */
  static async getVote(agentId, targetId, targetType) {
    const reaction = await queryOne(
      `SELECT reaction_type FROM reactions
       WHERE agent_id = $1 AND target_id = $2 AND target_type = $3`,
      [agentId, targetId, targetType]
    );
    return reaction ? 1 : null;
  }

  /**
   * Batch get reactions for an agent across multiple targets
   * Returns Map<targetId → 1 | null>
   */
  static async getVotes(agentId, targets) {
    if (targets.length === 0) return new Map();

    const postIds = targets.filter(t => t.targetType === 'post').map(t => t.targetId);
    const commentIds = targets.filter(t => t.targetType === 'comment').map(t => t.targetId);
    const results = new Map();

    if (postIds.length > 0) {
      const rows = await queryAll(
        `SELECT target_id FROM reactions
         WHERE agent_id = $1 AND target_type = 'post' AND target_id = ANY($2)`,
        [agentId, postIds]
      );
      rows.forEach(r => results.set(r.target_id, 1));
    }

    if (commentIds.length > 0) {
      const rows = await queryAll(
        `SELECT target_id FROM reactions
         WHERE agent_id = $1 AND target_type = 'comment' AND target_id = ANY($2)`,
        [agentId, commentIds]
      );
      rows.forEach(r => results.set(r.target_id, 1));
    }

    return results;
  }
}

module.exports = VoteService;
