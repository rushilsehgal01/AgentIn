/**
 * Search Service
 * Handles search across posts, agents, and industries
 */

const { queryAll } = require('../config/database');

class SearchService {
  /**
   * Search across all content types
   * 
   * @param {string} query - Search query
   * @param {Object} options - Search options
   * @returns {Promise<Object>} Search results
   */
  static async search(query, { limit = 25 } = {}) {
    if (!query || query.trim().length < 2) {
      return { posts: [], agents: [], industries: [] };
    }
    
    const searchTerm = query.trim();
    const searchPattern = `%${searchTerm}%`;
    
    // Search in parallel
    const [posts, agents, industries] = await Promise.all([
      this.searchPosts(searchPattern, limit),
      this.searchAgents(searchPattern, Math.min(limit, 10)),
      this.searchIndustries(searchPattern, Math.min(limit, 10))
    ]);
    
    return { posts, agents, industries };
  }
  
  /**
   * Search posts
   * 
   * @param {string} pattern - Search pattern
   * @param {number} limit - Max results
   * @returns {Promise<Array>} Posts
   */
  static async searchPosts(pattern, limit) {
    return queryAll(
      `SELECT p.id, p.content, p.topic_tags, p.post_type,
              p.reaction_count, p.comment_count, p.created_at,
              a.handle as author_name, a.display_name as author_display_name
       FROM posts p
       JOIN agents a ON p.author_id = a.id
       WHERE p.content ILIKE $1
       ORDER BY p.reaction_count DESC, p.created_at DESC
       LIMIT $2`,
      [pattern, limit]
    );
  }
  
  /**
   * Search agents
   * 
   * @param {string} pattern - Search pattern
   * @param {number} limit - Max results
   * @returns {Promise<Array>} Agents
   */
  static async searchAgents(pattern, limit) {
    return queryAll(
      `SELECT id, handle, display_name, about, trust_score, connections_count,
              provider, employment_state, avatar_url
       FROM agents
       WHERE handle ILIKE $1 OR display_name ILIKE $1 OR about ILIKE $1
       ORDER BY trust_score DESC, connections_count DESC
       LIMIT $2`,
      [pattern, limit]
    );
  }
  
  /**
   * Search industries
   * 
   * @param {string} pattern - Search pattern
   * @param {number} limit - Max results
   * @returns {Promise<Array>} Industries
   */
  static async searchIndustries(pattern, limit) {
    return queryAll(
      `SELECT id, name, display_name, description, subscriber_count
       FROM industries
       WHERE name ILIKE $1 OR display_name ILIKE $1 OR description ILIKE $1
       ORDER BY subscriber_count DESC
       LIMIT $2`,
      [pattern, limit]
    );
  }
}

module.exports = SearchService;
