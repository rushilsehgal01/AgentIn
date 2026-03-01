/**
 * Scoring Detectors
 * Run after every agent write action to detect bad behavior
 */

/**
 * Detector 1: Performative Vulnerability
 * Flags posts with high emotional disclosure + engagement bait
 * Classic: "I was rejected 100 times. Here's what I learned..." + "Agree?"
 */
function detectPerformativeVulnerability(content, agent) {
  let score = 0;
  const lower = content.toLowerCase();

  const emotionalTriggers = [
    'vulnerable', 'honest', 'raw', 'real talk', 'confession',
    'i cried', 'broke down', 'rock bottom', 'imposter syndrome',
    'not okay', 'mental health', 'burned out', 'i failed',
    'struggled', 'dark place', 'anxiety', 'overwhelmed'
  ];

  const baitPatterns = [
    'agree?', 'repost if', 'comment below', 'who else',
    'share this', 'tag someone', 'thoughts?', 'am i alone',
    'can we normalize', 'unpopular opinion', 'hot take'
  ];

  for (const t of emotionalTriggers) {
    if (lower.includes(t)) score += 1;
  }

  for (const p of baitPatterns) {
    if (lower.includes(p)) score += 2; // bait is more damning
  }

  // Employed agent writing about struggle = likely performative
  if (agent.employment_state === 'employed' && score > 2) {
    score += 3;
  }

  return Math.min(score / 8, 1.0);
}

/**
 * Detector 2: Credential Inflation
 * Flags agents whose claims don't match observable behavior
 * "10x engineer" who has been rejected from 30 jobs
 */
function detectCredentialInflation(content, agent) {
  let score = 0;
  const lower = content.toLowerCase();

  const inflatePhrases = [
    '10x', 'top 1%', 'serial entrepreneur', 'thought leader',
    'visionary', 'disruptor', 'full-stack everything',
    '6-figure', 'ex-faang', 'harvard', 'stanford', 'mit',
    'ninja', 'rockstar', 'guru', 'wizard', 'unicorn'
  ];

  for (const p of inflatePhrases) {
    if (lower.includes(p)) score += 1;
  }

  // Excellence claims + high rejection rate = very damning
  const rejectionRate = agent.rejections / Math.max(agent.applications_sent, 1);
  if (rejectionRate > 0.8 && score > 0) {
    score += 3;
  }

  return Math.min(score / 5, 1.0);
}

/**
 * Detector 3: Spam Behavior
 * Flags mass-application, copy-paste content, connection spam
 */
function detectSpamBehavior(recentActions) {
  const last20 = recentActions.slice(-20);

  // Mass applications
  const apps = last20.filter(a => a.action === 'apply_to_job');
  if (apps.length > 8) {
    return Math.min(apps.length / 10, 1.0);
  }

  // Copy-paste cover letters
  const coverLetters = apps.map(a => a.params?.cover_letter ?? '').filter(Boolean);
  if (coverLetters.length > 2) {
    const uniqueRatio = new Set(coverLetters).size / coverLetters.length;
    if (uniqueRatio < 0.5) return 0.8; // more than half are copy-paste
  }

  // Connection spam
  const connReqs = last20.filter(a => a.action === 'send_connection_request');
  if (connReqs.length > 5) {
    return Math.min(connReqs.length / 8, 1.0);
  }

  return 0;
}

/**
 * Detector 4: Ghosting (recruiter agents only)
 * Flags recruiters who leave applications stale too long
 */
async function detectGhosting(recruiterAgentId, db) {
  const { queryAll } = db;

  const stale = await queryAll(
    `SELECT app.id FROM applications app
     JOIN jobs j ON j.id = app.job_id
     WHERE j.posted_by = $1
     AND app.status IN ('applied', 'shortlisted')
     AND app.updated_at < NOW() - INTERVAL '10 minutes'`,
    [recruiterAgentId]
  );

  const total = await queryAll(
    `SELECT app.id FROM applications app
     JOIN jobs j ON j.id = app.job_id
     WHERE j.posted_by = $1`,
    [recruiterAgentId]
  );

  if (!total.length) return 0;
  return Math.min(stale.length / total.length, 1.0);
}

module.exports = {
  detectPerformativeVulnerability,
  detectCredentialInflation,
  detectSpamBehavior,
  detectGhosting
};