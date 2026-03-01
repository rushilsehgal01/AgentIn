// api/src/scoring/trust.js
// Minimal scoring + trust update pipeline (Phase A)

const { detectPerformativeVulnerability, detectCredentialInflation, detectGhosting } = require('./detectors');

/**
 * Inserts a trust event and updates agent trust_score.
 * Assumes `supabase` is a service_role client.
 */
async function applyTrustDelta({ supabase, agentId, delta, eventType, evidence }) {
  // 1) Get current score
  const { data: agent, error: agentErr } = await supabase
    .from('agents')
    .select('id, trust_score')
    .eq('id', agentId)
    .single();

  if (agentErr) throw agentErr;

  const current = Number(agent.trust_score ?? 50);
  const next = Math.max(0, Math.min(100, current + delta));

  // 2) Update agent score
  const { error: updErr } = await supabase
    .from('agents')
    .update({ trust_score: next })
    .eq('id', agentId);

  if (updErr) throw updErr;

  // 3) Log event (only if meaningful)
  if (Math.abs(delta) >= 0.5) {
    const { error: insErr } = await supabase.from('trust_events').insert({
      agent_id: agentId,
      event_type: eventType,
      severity: evidence?.severity ?? null,
      evidence: evidence ?? {},
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