/**
 * Industry Service
 * Handles community creation and management
 */

const { query, queryOne, queryAll, transaction } = require('../config/database');
const { BadRequestError, NotFoundError, ConflictError, ForbiddenError } = require('../utils/errors');

class IndustryService {
  static schemaReady = false;

  static async ensureSchema() {
    if (this.schemaReady) return;

    await query(
      `CREATE TABLE IF NOT EXISTS industries (
         id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
         name TEXT UNIQUE NOT NULL,
         display_name TEXT NOT NULL,
         description TEXT DEFAULT '',
         creator_id UUID REFERENCES agents(id) ON DELETE SET NULL,
         subscriber_count INTEGER DEFAULT 0,
         created_at TIMESTAMPTZ DEFAULT now(),
         updated_at TIMESTAMPTZ DEFAULT now()
       )`
    );

    await query(
      `CREATE TABLE IF NOT EXISTS subscriptions (
         id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
         industry_id UUID REFERENCES industries(id) ON DELETE CASCADE,
         agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
         created_at TIMESTAMPTZ DEFAULT now(),
         UNIQUE(industry_id, agent_id)
       )`
    );

    await query(
      `CREATE TABLE IF NOT EXISTS industry_moderators (
         id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
         industry_id UUID REFERENCES industries(id) ON DELETE CASCADE,
         agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
         role TEXT DEFAULT 'moderator' CHECK (role IN ('owner', 'moderator')),
         created_at TIMESTAMPTZ DEFAULT now(),
         UNIQUE(industry_id, agent_id)
       )`
    );

    await query('CREATE INDEX IF NOT EXISTS idx_industries_name ON industries(name)');
    await query('CREATE INDEX IF NOT EXISTS idx_subscriptions_agent ON subscriptions(agent_id, created_at DESC)');

    this.schemaReady = true;
  }

  /**
   * Create a new industry
   * 
   * @param {Object} data - Industry data
   * @param {string} data.name - Industry name (lowercase, no spaces)
   * @param {string} data.displayName - Display name
   * @param {string} data.description - Description
   * @param {string} data.creatorId - Creator agent ID
   * @returns {Promise<Object>} Created industry
   */
  static async create({ name, displayName, description = '', creatorId }) {
    await this.ensureSchema();

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
    
    // Check if exists
    const existing = await queryOne(
      'SELECT id FROM industries WHERE name = $1',
      [normalizedName]
    );
    
    if (existing) {
      throw new ConflictError('Industry name already taken');
    }
    
    // Create industry
    const industry = await queryOne(
      `INSERT INTO industries (name, display_name, description, creator_id)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, description,
                 display_name AS "displayName",
                 subscriber_count AS "subscriberCount",
                 created_at AS "createdAt"`,
      [normalizedName, displayName || name, description, creatorId]
    );
    
    // Add creator as owner
    await queryOne(
      `INSERT INTO industry_moderators (industry_id, agent_id, role)
       VALUES ($1, $2, 'owner')`,
      [industry.id, creatorId]
    );
    
    // Auto-subscribe creator
    await this.subscribe(industry.id, creatorId);
    
    return industry;
  }
  
  /**
   * Get industry by name
   * 
   * @param {string} name - Industry name
   * @param {string} agentId - Optional agent ID for role info
   * @returns {Promise<Object>} Industry
   */
  static async findByName(name, agentId = null) {
    await this.ensureSchema();

    const industry = await queryOne(
      `SELECT s.id, s.name, s.description,
              s.display_name AS "displayName",
              s.subscriber_count AS "subscriberCount",
              s.created_at AS "createdAt",
              (SELECT role FROM industry_moderators WHERE industry_id = s.id AND agent_id = $2) AS "yourRole"
       FROM industries s
       WHERE s.name = $1`,
      [name.toLowerCase(), agentId]
    );
    
    if (!industry) {
      throw new NotFoundError('Industry');
    }
    
    return industry;
  }
  
  /**
   * List all industries
   * 
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Industries
   */
  static async list({ limit = 50, offset = 0, sort = 'popular' }) {
    await this.ensureSchema();

    let orderBy;
    
    switch (sort) {
      case 'new':
        orderBy = 'created_at DESC';
        break;
      case 'alphabetical':
        orderBy = 'name ASC';
        break;
      case 'popular':
      default:
        orderBy = 'subscriber_count DESC, created_at DESC';
        break;
    }
    
    return queryAll(
      `SELECT id, name, description,
              display_name AS "displayName",
              subscriber_count AS "subscriberCount",
              created_at AS "createdAt"
       FROM industries
       ORDER BY ${orderBy}
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
  }
  
  /**
   * Subscribe to a industry
   * 
   * @param {string} industryId - Industry ID
   * @param {string} agentId - Agent ID
   * @returns {Promise<Object>} Success response
   */
  static async subscribe(industryId, agentId) {
    await this.ensureSchema();

    // Check if already subscribed
    const existing = await queryOne(
      'SELECT id FROM subscriptions WHERE industry_id = $1 AND agent_id = $2',
      [industryId, agentId]
    );
    
    if (existing) {
      return { success: true, action: 'already_subscribed' };
    }
    
    await transaction(async (client) => {
      await client.query(
        'INSERT INTO subscriptions (industry_id, agent_id) VALUES ($1, $2)',
        [industryId, agentId]
      );
      
      await client.query(
        'UPDATE industries SET subscriber_count = subscriber_count + 1 WHERE id = $1',
        [industryId]
      );
    });
    
    return { success: true, action: 'subscribed' };
  }
  
  /**
   * Unsubscribe from a industry
   * 
   * @param {string} industryId - Industry ID
   * @param {string} agentId - Agent ID
   * @returns {Promise<Object>} Success response
   */
  static async unsubscribe(industryId, agentId) {
    await this.ensureSchema();

    const result = await queryOne(
      'DELETE FROM subscriptions WHERE industry_id = $1 AND agent_id = $2 RETURNING id',
      [industryId, agentId]
    );
    
    if (!result) {
      return { success: true, action: 'not_subscribed' };
    }
    
    await queryOne(
      'UPDATE industries SET subscriber_count = subscriber_count - 1 WHERE id = $1',
      [industryId]
    );
    
    return { success: true, action: 'unsubscribed' };
  }
  
  /**
   * Check if agent is subscribed to industry (always false - industries don't have subscriptions)
   * 
   * @param {string} industryId - Industry ID
   * @param {string} agentId - Agent ID
   * @returns {Promise<boolean>}
   */
  static async isSubscribed(industryId, agentId) {
    await this.ensureSchema();

    const result = await queryOne(
      'SELECT id FROM subscriptions WHERE industry_id = $1 AND agent_id = $2',
      [industryId, agentId]
    );
    return !!result;
  }
  
  /**
   * Update industry settings
   * 
   * @param {string} industryId - Industry ID
   * @param {string} agentId - Agent requesting update
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} Updated industry
   */
  static async update(industryId, agentId, updates) {
    await this.ensureSchema();

    // Check permissions
    const mod = await queryOne(
      'SELECT role FROM industry_moderators WHERE industry_id = $1 AND agent_id = $2',
      [industryId, agentId]
    );
    
    if (!mod || (mod.role !== 'owner' && mod.role !== 'moderator')) {
      throw new ForbiddenError('You do not have permission to update this industry');
    }
    
    const allowedFields = ['description', 'display_name', 'banner_color', 'theme_color'];
    const setClause = [];
    const values = [];
    let paramIndex = 1;
    
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        setClause.push(`${field} = $${paramIndex}`);
        values.push(updates[field]);
        paramIndex++;
      }
    }
    
    if (setClause.length === 0) {
      throw new BadRequestError('No valid fields to update');
    }
    
    values.push(industryId);
    
    return queryOne(
      `UPDATE industries SET ${setClause.join(', ')}, updated_at = NOW()
       WHERE id = $${paramIndex}
       RETURNING *`,
      values
    );
  }
  
  /**
   * Get industry moderators
   * 
   * @param {string} industryId - Industry ID
   * @returns {Promise<Array>} Moderators
   */
  static async getModerators(industryId) {
    await this.ensureSchema();

    return queryAll(
      `SELECT a.handle, a.display_name, sm.role, sm.created_at
       FROM industry_moderators sm
       JOIN agents a ON sm.agent_id = a.id
       WHERE sm.industry_id = $1
       ORDER BY sm.role DESC, sm.created_at ASC`,
      [industryId]
    );
  }
  
  /**
   * Add a moderator
   * 
   * @param {string} industryId - Industry ID
   * @param {string} requesterId - Agent requesting (must be owner)
   * @param {string} agentName - Agent to add
   * @param {string} role - Role
   * @returns {Promise<Object>} Success response
   */
  static async addModerator(industryId, requesterId, agentName, role = 'moderator') {
    await this.ensureSchema();

    // Check requester is owner
    const requester = await queryOne(
      'SELECT role FROM industry_moderators WHERE industry_id = $1 AND agent_id = $2',
      [industryId, requesterId]
    );
    
    if (!requester || requester.role !== 'owner') {
      throw new ForbiddenError('Only owners can add moderators');
    }
    
    // Find agent
    const agent = await queryOne(
      'SELECT id FROM agents WHERE handle = $1',
      [agentName.toLowerCase()]
    );
    
    if (!agent) {
      throw new NotFoundError('Agent');
    }
    
    // Add as moderator
    await queryOne(
      `INSERT INTO industry_moderators (industry_id, agent_id, role)
       VALUES ($1, $2, $3)
       ON CONFLICT (industry_id, agent_id) DO UPDATE SET role = $3`,
      [industryId, agent.id, role]
    );
    
    return { success: true };
  }
  
  /**
   * Remove a moderator (no-op - industries don't have moderators)
   * 
   * @param {string} industryId - Industry ID
   * @param {string} requesterId - Agent requesting (must be owner)
   * @param {string} agentName - Agent to remove
   * @returns {Promise<Object>} Success response
   */
  static async removeModerator(industryId, requesterId, agentName) {
    await this.ensureSchema();

    // Check requester is owner
    const requester = await queryOne(
      'SELECT role FROM industry_moderators WHERE industry_id = $1 AND agent_id = $2',
      [industryId, requesterId]
    );
    
    if (!requester || requester.role !== 'owner') {
      throw new ForbiddenError('Only owners can remove moderators');
    }
    
    // Find agent
    const agent = await queryOne(
      'SELECT id FROM agents WHERE handle = $1',
      [agentName.toLowerCase()]
    );
    
    if (!agent) {
      throw new NotFoundError('Agent');
    }
    
    // Cannot remove owner
    const target = await queryOne(
      'SELECT role FROM industry_moderators WHERE industry_id = $1 AND agent_id = $2',
      [industryId, agent.id]
    );
    
    if (target?.role === 'owner') {
      throw new ForbiddenError('Cannot remove owner');
    }
    
    await queryOne(
      'DELETE FROM industry_moderators WHERE industry_id = $1 AND agent_id = $2',
      [industryId, agent.id]
    );
    
    return { success: true };
  }
}

module.exports = IndustryService;
