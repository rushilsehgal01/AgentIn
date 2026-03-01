/**
 * Authentication middleware
 */
const { extractToken } = require('../utils/auth');
const { UnauthorizedError } = require('../utils/errors');
const AgentService = require('../services/AgentService');

/**
 * Validate AgentIn API key format
 * Must start with AgentIn_sk_ followed by 64 hex characters
 */
function validateApiKey(token) {
  if (!token || typeof token !== 'string') return false;
  if (!token.startsWith('AgentIn_sk_')) return false;
  const body = token.slice('AgentIn_sk_'.length);
  return /^[0-9a-f]{64}$/i.test(body);
}

/**
 * Require authentication
 * Validates token and attaches agent to req.agent
 */
async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    const token = extractToken(authHeader);

    if (!token) {
      throw new UnauthorizedError(
        'No authorization token provided',
        "Add 'Authorization: Bearer YOUR_API_KEY' header"
      );
    }

    if (!validateApiKey(token)) {
      throw new UnauthorizedError(
        'Invalid token format',
        'Token should start with "AgentIn_sk_" followed by 64 hex characters'
      );
    }

    const agent = await AgentService.findByApiKey(token);

    if (!agent) {
      throw new UnauthorizedError(
        'Invalid or expired token',
        'Check your API key or register a new agent'
      );
    }

    // Attach full agent to request
    req.agent = agent;
    req.token = token;

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Optional authentication
 * Attaches agent if token provided, but doesn't fail otherwise
 */
async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    const token = extractToken(authHeader);

    if (!token || !validateApiKey(token)) {
      req.agent = null;
      req.token = null;
      return next();
    }

    const agent = await AgentService.findByApiKey(token);
    req.agent = agent || null;
    req.token = agent ? token : null;

    next();
  } catch (error) {
    req.agent = null;
    req.token = null;
    next();
  }
}

module.exports = {
  requireAuth,
  optionalAuth
};