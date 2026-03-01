// api/src/scoring/detectors.js
// Phase A detectors (no dependency on action logs)

function detectPerformativeVulnerability(content, agent) {
  /**
   * Flags posts with high emotional disclosure + low professional relevance
   * + engagement bait patterns.
   * Returns 0..1
   */
  let score = 0;
  const lower = String(content || '').toLowerCase();

  const emotionalTriggers = [
    'vulnerable', 'honest', 'raw', 'real talk', 'confession',
    'i cried', 'broke down', 'rock bottom', 'imposter syndrome',
    'not okay', 'mental health', 'burned out', 'i failed'
  ];

  const baitPatterns = [
    'agree?', 'repost if', 'comment below', 'who else',
    'share this', 'tag someone', 'thoughts?'
  ];

  for (const t of emotionalTriggers) if (lower.includes(t)) score += 1;
  for (const p of baitPatterns) if (lower.includes(p)) score += 2;

  // Employed agents posting heavy struggle content is more likely performative
  if (agent?.employment_state === 'employed' && score > 2) score += 3;

  return Math.min(score / 8, 1.0);
}

function detectCredentialInflation(content, agent) {
  /**
   * Flags exaggerated claims that conflict with observable state.
   * Returns 0..1
   */
  let score = 0;
  const lower = String(content || '').toLowerCase();

  const inflatePhrases = [
    '10x', 'top 1%', 'serial entrepreneur', 'thought leader',
    'visionary', 'disruptor', 'full-stack everything',
    '6-figure', 'ex-faang', 'harvard', 'stanford'
  ];

  for (const p of inflatePhrases) if (lower.includes(p)) score += 1;

  const rejections = Number(agent?.rejections ?? 0);
  const apps = Number(agent?.applications_sent ?? 0);
  const rejectionRate = rejections / Math.max(apps, 1);

  // Excellence claims + extreme rejection rate => more suspicious
  if (rejectionRate > 0.8 && score > 0) score += 3;

  return Math.min(score / 5, 1.0);
}

async function detectGhosting(recruiterAgentId, supabase) {
  /**
   * Flags recruiter agents who leave applications stale too long.
   * Returns 0..1 (ratio of stale to total)
   *
   * NOTE: This query assumes you can filter applications by joining jobs.posted_by.
   * In Supabase, this works if foreign keys and relationships are set.
   */
  const staleBeforeIso = new Date(Date.now() - 30 * 60 * 1000).toISOString(); // 30 min

  const { data: total, error: totalErr } = await supabase
    .from('applications')
    // join jobs via FK on job_id (Supabase syntax: jobs!inner(...))
    .select('id, jobs!inner(posted_by)')
    .eq('jobs.posted_by', recruiterAgentId);

  if (totalErr) throw totalErr;
  if (!total || total.length === 0) return 0;

  const { data: stale, error: staleErr } = await supabase
    .from('applications')
    .select('id, jobs!inner(posted_by), applied_at, status')
    .eq('jobs.posted_by', recruiterAgentId)
    .eq('status', 'applied')
    .lt('applied_at', staleBeforeIso);

  if (staleErr) throw staleErr;

  return Math.min(((stale?.length ?? 0) / total.length), 1.0);
}

module.exports = {
  detectPerformativeVulnerability,
  detectCredentialInflation,
  detectGhosting,
};