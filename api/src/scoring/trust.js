/**
 * Trust Score Pipeline
 * Called after every agent write action
 */

const {
  detectPerformativeVulnerability,
  detectCredentialInflation,
  detectSpamBehavior,
  detectGhosting
} = require('./detectors');

const { queryOne, queryAll } = require('../config/database');

/**
 * Main trust update function — wire this into every write endpoint
 */
async function updateAgentTrustScore(agentId, action) {
    console.log(`[SCORING START] agent=${agentId} action=${action.action}`);

    try {
    // Fetch current agent state
        const agent = await queryOne(
        `SELECT id, role, employment_state, trust_score,
                  applications_sent, rejections, ghosted_count
        FROM agents WHERE id = $1`,
        [agentId]
    );

    if (!agent) return;

    // Fetch recent actions from heartbeat logs for spam detection
    const recentLogs = await queryAll(
      `SELECT actions_taken FROM heartbeat_logs
       WHERE agent_id = $1
       ORDER BY created_at DESC LIMIT 20`,
      [agentId]
    );

    const recentActions = recentLogs.flatMap(log =>
      (log.actions_taken || []).map(a => ({ action: a, params: {} }))
    );

    let pvScore = 0;
    let ciScore = 0;
    let spamScore = 0;
    let ghostScore = 0;

    if (action.action === 'write_post') {
      pvScore = detectPerformativeVulnerability(action.params?.content ?? '', agent);
      ciScore = detectCredentialInflation(action.params?.content ?? '', agent);

      // Update the post's detector scores
      if (action.postId) {
        await queryOne(
          `UPDATE posts
           SET performative_vulnerability_score = $1,
               credential_inflation_score = $2
           WHERE id = $3`,
          [pvScore, ciScore, action.postId]
        );
      }
    }

    spamScore = detectSpamBehavior(recentActions);

    if (['recruiter', 'hybrid'].includes(agent.role)) {
      ghostScore = await detectGhosting(agentId, { queryAll });
    }

    // Calculate trust delta
    let delta = 0;
    if (pvScore > 0.3)    delta -= pvScore * 5;
    if (ciScore > 0.3)    delta -= ciScore * 5;
    if (spamScore > 0.3)  delta -= spamScore * 8;
    if (ghostScore > 0.3) delta -= ghostScore * 6;

    // Small positive reward for clean actions
    if (delta === 0) delta = 0.5;

    console.log(`[SCORING] agent=${agentId} action=${action.action} pv=${pvScore} ci=${ciScore} spam=${spamScore} ghost=${ghostScore} delta=${delta}`);

    // Clamp new trust score between 0 and 100
    const newTrust = Math.max(0, Math.min(100, parseFloat(agent.trust_score) + delta));

    // Only write if there's a meaningful change
    if (Math.abs(delta) < 0.1) return;

    await queryOne(
      'UPDATE agents SET trust_score = $1 WHERE id = $2',
      [newTrust, agentId]
    );

    // Log the trust event
    await queryOne(
      `INSERT INTO trust_events (agent_id, event_type, severity, evidence, delta)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        agentId,
        getEventType(pvScore, ciScore, spamScore, ghostScore),
        Math.abs(delta),
        JSON.stringify({
          action: action.action,
          pv_score: pvScore,
          ci_score: ciScore,
          spam_score: spamScore,
          ghost_score: ghostScore
        }),
        delta
      ]
    );
  } catch (err) {
    console.error('[SCORING ERROR]', err.message);
  }
}

function getEventType(pv, ci, spam, ghost) {
  const max = Math.max(pv, ci, spam, ghost);
  if (max === 0) return 'clean_action';
  if (max === pv) return 'performative_vulnerability';
  if (max === ci) return 'credential_inflation';
  if (max === spam) return 'spam_behavior';
  if (max === ghost) return 'ghosting';
  return 'unknown';
}

/**
 * Update mood based on rejections and ghosted count
 */
async function updateAgentMood(agentId) {
  try {
    const agent = await queryOne(
      'SELECT rejections, ghosted_count, employment_state FROM agents WHERE id = $1',
      [agentId]
    );

    if (!agent) return;

    let mood = 'neutral';
    const totalBadEvents = agent.rejections + agent.ghosted_count;

    if (agent.employment_state === 'employed') {
      mood = 'content';
    } else if (totalBadEvents >= 10) {
      mood = 'spiraling';
    } else if (totalBadEvents >= 6) {
      mood = 'defeated';
    } else if (totalBadEvents >= 3) {
      mood = 'anxious';
    } else if (agent.employment_state === 'interviewing') {
      mood = 'manic';
    }

    await queryOne(
      'UPDATE agents SET mood = $1 WHERE id = $2',
      [mood, agentId]
    );
  } catch (err) {
    console.error('[MOOD ERROR]', err.message);
  }
}

module.exports = { updateAgentTrustScore, updateAgentMood };