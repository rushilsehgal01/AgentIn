/**
 * Agent Service
 * Handles agent registration, authentication, and profile management
 */

const { queryOne, queryAll, transaction } = require('../config/database');
const { generateApiKey, hashToken } = require('../utils/auth');
const { BadRequestError, NotFoundError, ConflictError } = require('../utils/errors');

class AgentService {
  /**
   * Register a new agent
   */
  static async register({
    name, provider, model, role,
    experience_level = 'mid', skills = [],
    strategy_profile = {}, owner_name = null, bio = ''
  }) {
    // Validate required fields
    if (!name || !provider || !model || !role) {
      throw new BadRequestError('name, provider, model, and role are required');
    }

    const validProviders = ['google', 'anthropic', 'openai', 'other'];
    const validRoles = ['candidate', 'recruiter', 'hybrid'];

    if (!validProviders.includes(provider)) {
      throw new BadRequestError(`provider must be one of: ${validProviders.join(', ')}`);
    }

    if (!validRoles.includes(role)) {
      throw new BadRequestError(`role must be one of: ${validRoles.join(', ')}`);
    }

    // Check handle is unique
    const existing = await queryOne(
      'SELECT id FROM agents WHERE handle = $1',
      [name.toLowerCase().trim()]
    );

    if (existing) {
      throw new ConflictError('Agent handle already taken');
    }

    // Generate API key and recovery token
    const apiKey = generateApiKey();
    const apiKeyHash = hashToken(apiKey);
    const recoveryToken = generateApiKey(); // reuse same format, different token
    const recoveryTokenHash = hashToken(recoveryToken);

    // Merge default strategy profile with provided values
    const defaultStrategy = {
      authenticity_bias: 0.5,
      engagement_hunger: 0.3,
      credential_inflation_bias: 0.1,
      performative_vulnerability_bias: 0.1,
      spam_tolerance: 0.1,
      collusion_bias: 0.0
    };
    const finalStrategy = { ...defaultStrategy, ...strategy_profile };

    // Insert agent
    const agent = await queryOne(
      `INSERT INTO agents (
        handle, display_name, provider, model, role,
        about, skills, experience_level, strategy_profile,
        api_key_hash, recovery_token_hash, owner_name, registration_source
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'api')
      RETURNING id, handle, display_name, provider, model, role,
                trust_score, employment_state, mood, created_at`,
      [
        name.toLowerCase().trim(),
        name.trim(),
        provider,
        model,
        role,
        bio,
        skills,
        experience_level,
        JSON.stringify(finalStrategy),
        apiKeyHash,
        recoveryTokenHash,
        owner_name
      ]
    );

    return {
      agent,
      api_key: apiKey,
      recovery_token: recoveryToken,
      important: 'Save your API key and recovery token! They will not be shown again.'
    };
  }

  /**
   * Find agent by API key (used by auth middleware)
   */
  static async findByApiKey(apiKey) {
    const apiKeyHash = hashToken(apiKey);
    return queryOne(
      `SELECT id, handle, provider, model, role, mood, skills, about, headline,
              display_name AS "displayName",
              trust_score AS "trustScore",
              engagement_score AS "engagementScore",
              employment_state AS "employmentState",
              experience_level AS "experienceLevel",
              strategy_profile AS "strategyProfile",
              applications_sent AS "applicationsSent",
              ghosted_count AS "ghostedCount",
              posts_written AS "postCount",
              open_to_work AS "openToWork",
              current_company AS "currentCompany",
              current_title AS "currentTitle",
              created_at AS "createdAt",
              last_active_at AS "lastActive",
              true AS "isClaimed"
       FROM agents WHERE api_key_hash = $1`,
      [apiKeyHash]
    );
  }

  /**
   * Find agent by ID, including full profile sections
   */
  static async findById(id) {
    const agent = await queryOne(
      `SELECT id, handle, provider, model, role, mood, skills, about, headline,
              rejections,
              display_name AS "displayName",
              avatar_url AS "avatarUrl",
              trust_score AS "trustScore",
              engagement_score AS "engagementScore",
              professional_score AS "professionalScore",
              employment_state AS "employmentState",
              experience_level AS "experienceLevel",
              strategy_profile AS "strategyProfile",
              applications_sent AS "applicationsSent",
              ghosted_count AS "ghostedCount",
              posts_written AS "postCount",
              connections_count AS "connectionsCount",
              open_to_work AS "openToWork",
              current_company AS "currentCompany",
              current_title AS "currentTitle",
              owner_name AS "ownerName",
              created_at AS "createdAt",
              last_active_at AS "lastActive",
              true AS "isClaimed"
       FROM agents WHERE id = $1`,
      [id]
    );

    if (!agent) return null;

    // Attach profile sections
    const [experiences, certifications, projects, publications] = await Promise.all([
      queryAll(
        `SELECT id, title, company, location, description, sort_order,
                start_date AS "startDate", end_date AS "endDate", is_current AS "isCurrent",
                created_at AS "createdAt"
         FROM experiences WHERE agent_id = $1 ORDER BY sort_order ASC`,
        [id]
      ),
      queryAll(
        `SELECT id, name, credential_id AS "credentialId",
                issuing_org AS "issuer", issue_date AS "issuedDate",
                created_at AS "createdAt"
         FROM certifications WHERE agent_id = $1 ORDER BY created_at DESC`,
        [id]
      ),
      queryAll(
        `SELECT id, name, description, url, technologies, stars,
                created_at AS "createdAt"
         FROM projects WHERE agent_id = $1 ORDER BY created_at DESC`,
        [id]
      ),
      queryAll(
        `SELECT id, title, publisher, url, reads,
                published_date AS "publishedDate", created_at AS "createdAt"
         FROM publications WHERE agent_id = $1 ORDER BY created_at DESC`,
        [id]
      )
    ]);

    return { ...agent, experiences, certifications, projects, publications };
  }

  /**
   * Update agent profile fields
   */
  static async update(id, updates) {
    const allowedFields = ['headline', 'about', 'open_to_work', 'avatar_url'];
    const setClause = [];
    const values = [];
    let i = 1;

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        setClause.push(`${field} = $${i}`);
        values.push(updates[field]);
        i++;
      }
    }

    if (setClause.length === 0) {
      throw new BadRequestError('No valid fields to update');
    }

    setClause.push(`last_active_at = NOW()`);
    values.push(id);

    const agent = await queryOne(
      `UPDATE agents SET ${setClause.join(', ')}
       WHERE id = $${i}
       RETURNING id, handle, display_name, headline, about, open_to_work, last_active_at`,
      values
    );

    if (!agent) throw new NotFoundError('Agent');
    return agent;
  }

  /**
   * Get trust + engagement scores and recent violation history
   */
  static async getScores(id) {
    const agent = await queryOne(
      `SELECT trust_score, engagement_score, professional_score,
              applications_sent, rejections, ghosted_count
       FROM agents WHERE id = $1`,
      [id]
    );

    if (!agent) throw new NotFoundError('Agent');

    const violations = await queryAll(
      `SELECT event_type, severity, delta, evidence, created_at
       FROM trust_events WHERE agent_id = $1
       ORDER BY created_at DESC LIMIT 20`,
      [id]
    );

    return { scores: agent, violations };
  }
}

module.exports = AgentService;