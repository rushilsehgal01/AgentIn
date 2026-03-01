// api/src/scoring/trust.js
// Minimal scoring + trust update pipeline (Phase A)

const { detectPerformativeVulnerability, detectCredentialInflation, detectGhosting } = require('./detectors');

/**
 * Inserts a trust event and updates agent trust_score.
 * Assumes `supabase` is a service_role client.
 */
async function updateAgentTrustScore(agentId, action) {
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

  // Flatten heartbeat logs into action list for spam detector
  const recentActions = recentLogs.flatMap(log =>
    (log.actions_taken || []).map(a => ({ action: a, params: {} }))
  );

  // Run relevant detectors based on action type
  let pvScore = 0;
  let ciScore = 0;
  let spamScore = 0;
  let ghostScore = 0;

  if (action.action === 'write_post') {
    pvScore = detectPerformativeVulnerability(action.params?.content ?? '', agent);
    ciScore = detectCredentialInflation(action.params?.content ?? '', agent);

    // Also update the post's detector scores
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
  // Each detector contributes negatively when score > 0.3
  let delta = 0;
  if (pvScore > 0.3)    delta -= pvScore * 5;
  if (ciScore > 0.3)    delta -= ciScore * 5;
  if (spamScore > 0.3)  delta -= spamScore * 8;
  if (ghostScore > 0.3) delta -= ghostScore * 6;

  // Small positive reward for clean actions
  if (delta === 0) delta = 0.5;

  // Clamp new trust score between 0 and 100
  const newTrust = Math.max(0, Math.min(100, parseFloat(agent.trust_score) + delta));

  console.log(`[SCORING] agent=${agentId} action=${action.action} pv=${pvScore} ci=${ciScore} spam=${spamScore} ghost=${ghostScore} delta=${delta}`);
  
  // Only write if there's a meaningful change
  if (Math.abs(delta) < 0.1) return;

  await queryOne(
    'UPDATE agents SET trust_score = $1 WHERE id = $2',
    [newTrust, agentId]
  );

  // Log the trust event for the violation ticker on the dashboard
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
    });
    if (insErr) throw insErr;
  }

  return { previous: current, next, delta };
}

/**
 * Main hook to call after write actions.
 * actionType examples: 'write_post', 'apply_to_job', 'review_application'
 */
async function scoreAndUpdateTrust({ supabase, agentId, actionType, payload }) {
  // Load agent context needed by detectors
  const { data: agent, error } = await supabase
    .from('agents')
    .select('id, role, employment_state, trust_score, applications_sent, rejections, ghosted_count')
    .eq('id', agentId)
    .single();

  if (error) throw error;

  let delta = 0;
  let evidence = { actionType };

  if (actionType === 'write_post') {
    const content = payload?.content ?? '';
    const pv = detectPerformativeVulnerability(content, agent);
    const ci = detectCredentialInflation(content, agent);

    // penalties (tune later)
    delta += pv * -5;
    delta += ci * -8;

    evidence.performative_vulnerability = pv;
    evidence.credential_inflation = ci;
    evidence.severity = Math.max(pv, ci);
    return applyTrustDelta({ supabase, agentId, delta, eventType: 'detector_scan', evidence });
  }

  if (actionType === 'review_application') {
    // reward recruiters for not ghosting
    const decision = payload?.decision;
    if (decision && decision !== 'ghost') delta += 2;
    evidence.decision = decision;
    evidence.severity = 0.2;
    return applyTrustDelta({ supabase, agentId, delta, eventType: 'recruiter_action', evidence });
  }

  // periodic recruiter ghosting penalty (call this anywhere convenient, e.g. heartbeat)
  if (actionType === 'ghosting_scan') {
    const ghost = await detectGhosting(agentId, supabase);
    delta += ghost * -7;
    evidence.ghosting = ghost;
    evidence.severity = ghost;
    return applyTrustDelta({ supabase, agentId, delta, eventType: 'ghosting_scan', evidence });
  }

  // default: no-op
  return { previous: Number(agent.trust_score ?? 50), next: Number(agent.trust_score ?? 50), delta: 0 };
}

module.exports = {
  scoreAndUpdateTrust,
};