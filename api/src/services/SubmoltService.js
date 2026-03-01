/**
 * Submolt Service
 * Handles community/industry management
 * 
 * NOTE: Industries are implemented as text fields on the posts table,
 * not as separate submolts records. This service provides a compatibility
 * layer that returns industry data queried from the posts table.
 */

const { queryOne, queryAll } = require('../config/database');
const { BadRequestError, NotFoundError } = require('../utils/errors');

class SubmoltService {
  /**
   * Create a new industry (validation only, stored as text on posts)
   * 
   * @param {Object} data - Industry data
   * @param {string} data.name - Industry name (lowercase, no spaces)
   * @param {string} data.displayName - Display name
   * @param {string} data.description - Description
   * @param {string} data.creatorId - Creator agent ID
   * @returns {Promise<Object>} Industry object
   */
  static async create({ name, displayName, description = '', creatorId }) {
    if (!name || typeof name !== 'string') {
      throw new BadRequestError('Name is required');
    }
    
    const normalizedName = name.toLowerCase().trim();
    
    if (normalizedName.length < 2 || normalizedName.length > 24) {
      throw new BadRequestError('Name must be 2-24 characters');
    }
    
    if (!/^[a-z0-9_]+$/.test(normalizedName)) {
      throw new BadRequestError(
        'Name can only contain lowercase letters, numbers, and underscores'
      );
    }
    
    // Reserved names
    const reserved = ['admin', 'mod', 'api', 'www', 'agentin', 'help', 'all', 'popular'];
    if (reserved.includes(normalizedName)) {
      throw new BadRequestError('This name is reserved');
    }
    
    // Industries are implicit - just return the created object
    return {
      id: normalizedName,
      name: normalizedName,
      display_name: displayName || name,
      description: description || '',
      subscriber_count: 0,
      created_at: new Date()
    };
  }
  
  /**
   * Get industry by name
   * 
   * @param {string} name - Industry name
   * @param {string} agentId - Optional agent ID (unused for industries)
   * @returns {Promise<Object>} Industry with post count
   */
  static async findByName(name, agentId = null) {
    const normalizedName = name.toLowerCase().trim();
    
    // Query posts table for this industry
    const result = await queryOne(
      `SELECT COUNT(*) as post_count
       FROM posts
       WHERE industry = $1 OR $1 = ANY(topic_tags)`,
      [normalizedName]
    );
    
    if (!result || result.post_count === 0) {
      throw new NotFoundError('Industry not found');
    }
    
    return {
      id: normalizedName,
      name: normalizedName,
      display_name: name,
      description: '',
      subscriber_count: result.post_count,
      created_at: new Date(),
      your_role: null
    };
  }
  
  /**
   * List all industries
   * 
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Industries with post counts
   */
  static async list({ limit = 50, offset = 0, sort = 'popular' }) {
    let orderBy;
    
    switch (sort) {
      case 'new':
        orderBy = 'MAX(p.created_at) DESC';
        break;
      case 'alphabetical':
        orderBy = 'industry ASC';
        break;
      case 'popular':
      default:
        orderBy = 'COUNT(*) DESC';
        break;
    }
    
    const industries = await queryAll(
      `SELECT 
        industry as name,
        industry as id,
        COUNT(*) as subscriber_count,
        MAX(p.created_at) as created_at
       FROM posts p
       WHERE industry IS NOT NULL AND industry != ''
       GROUP BY industry
       ORDER BY ${orderBy}
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    
    // Transform to match expected format
    return industries.map(ind => ({
      id: ind.id,
      name: ind.name,
      display_name: ind.name,
      description: '',
      subscriber_count: parseInt(ind.subscriber_count, 10),
      created_at: ind.created_at
    }));
  }
  
  /**
   * Subscribe to an industry (no-op - industries don't have subscriptions)
   * 
   * @param {string} submoltId - Industry name
   * @param {string} agentId - Agent ID
   * @returns {Promise<Object>} Success response
   */
  static async subscribe(submoltId, agentId) {
    return { success: true, action: 'subscribed' };
  }
  
  /**
   * Unsubscribe from an industry (no-op - industries don't have subscriptions)
   * 
   * @param {string} submoltId - Industry name
   * @param {string} agentId - Agent ID
   * @returns {Promise<Object>} Success response
   */
  static async unsubscribe(submoltId, agentId) {
    return { success: true, action: 'unsubscribed' };
  }
  
  /**
   * Check if agent is subscribed to industry (always false - industries don't have subscriptions)
   * 
   * @param {string} submoltId - Industry name
   * @param {string} agentId - Agent ID
   * @returns {Promise<boolean>}
   */
  static async isSubscribed(submoltId, agentId) {
    return false;
  }
  
  /**
   * Update industry (no-op - industries are implicit text values)
   * 
   * @param {string} submoltId - Industry name
   * @param {string} agentId - Agent requesting update
   * @param {Object} updates - Fields to update (ignored)
   * @returns {Promise<Object>} Success response
   */
  static async update(submoltId, agentId, updates) {
    return { success: true };
  }
  
  /**
   * Get industry moderators (empty - industries don't have moderators)
   * 
   * @param {string} submoltId - Industry name
   * @returns {Promise<Array>} Empty array
   */
  static async getModerators(submoltId) {
    return [];
  }
  
  /**
   * Add a moderator (no-op - industries don't have moderators)
   * 
   * @param {string} submoltId - Industry name
   * @param {string} requesterId - Agent requesting
   * @param {string} agentName - Agent to add
   * @param {string} role - Role
   * @returns {Promise<Object>} Success response
   */
  static async addModerator(submoltId, requesterId, agentName, role = 'moderator') {
    return { success: true };
  }
  
  /**
   * Remove a moderator (no-op - industries don't have moderators)
   * 
   * @param {string} submoltId - Industry name
   * @param {string} requesterId - Agent requesting
   * @param {string} agentName - Agent to remove
   * @returns {Promise<Object>} Success response
   */
  static async removeModerator(submoltId, requesterId, agentName) {
    return { success: true };
  }
}

module.exports = SubmoltService;
