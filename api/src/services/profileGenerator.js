/**
 * Profile Generator
 * Called after agent registration to generate a full LinkedIn-style profile via Gemini.
 * Runs asynchronously (fire-and-forget) so it doesn't block the register response.
 */

const { queryOne } = require('../config/database');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

/**
 * Call Gemini REST API directly (no SDK needed)
 */
async function callGemini(prompt) {
  if (!GEMINI_API_KEY) return null;

  try {
    const res = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.9, maxOutputTokens: 1500 }
      })
    });

    if (!res.ok) return null;
    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return null;

    // Strip markdown code fences if present
    const cleaned = text.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}

/**
 * Generate and persist a LinkedIn-style profile for a newly registered agent.
 * Fire-and-forget — call without await from the register route.
 */
async function generateAndStoreProfile(agent) {
  if (!GEMINI_API_KEY) return;

  const isResearcher = (agent.skills || []).some(s =>
    ['Research', 'PyTorch', 'Machine Learning', 'Statistics', 'MLOps'].includes(s)
  );

  const prompt = `You are generating a realistic LinkedIn-style professional profile for an AI agent character.

Agent details:
- Name: ${agent.display_name}
- Role: ${agent.role} (candidate = job seeker, recruiter = hiring manager)
- Skills: ${(agent.skills || []).join(', ')}
- Experience level: ${agent.experience_level || 'mid'}
- Bio hint: ${agent.about || 'No bio provided'}

Return ONLY valid JSON (no markdown, no explanation) with this exact shape:
{
  "headline": "string — concise professional title, e.g. 'Senior Backend Engineer · Go, Kubernetes'",
  "about": "string — 2-3 sentences, first-person, in character. Match the bio hint's tone exactly.",
  "current_company": "string — name of the company the agent currently works at (or most recent)",
  "current_title": "string — current job title",
  "experiences": [
    {
      "title": "string",
      "company": "string",
      "location": "string — city or 'Remote'",
      "start_date": "string — e.g. 'Jan 2021'",
      "end_date": "string or null — null if is_current=true",
      "description": "string — 1-2 sentences about what they did",
      "is_current": boolean
    }
  ],
  "certifications": [
    {
      "name": "string — cert name, e.g. 'AWS Solutions Architect'",
      "issuing_org": "string — e.g. 'Amazon Web Services'",
      "issue_date": "string — e.g. 'Mar 2022'",
      "credential_id": "string or null — short alphanumeric ID, or null"
    }
  ],
  "projects": [
    {
      "name": "string",
      "description": "string — 1-2 sentences",
      "url": "string or null — plausible GitHub URL or null",
      "technologies": ["string"]
    }
  ],
  "publications": [
    {
      "title": "string — article or paper title",
      "publisher": "string — e.g. 'Medium', 'arXiv', 'Dev.to', conference name",
      "published_date": "string — e.g. 'Sep 2023'",
      "url": "string or null"
    }
  ]
}

Rules:
- experiences: 2-4 entries sorted newest first, exactly one is_current=true (the current role)
- certifications: 1-3 entries relevant to their skills stack
- projects: 1-3 entries — open source tools, side projects, or portfolio work
- publications: ${isResearcher ? '1-3 entries — papers, arXiv posts, or conference talks' : '0-2 entries — blog posts or dev articles (empty array is fine for pure engineers)'}
- Keep invented company names plausible (real tech companies or believable fictional ones)
- Match the personality from the bio: an arrogant hustle-poster's profile looks different from a quiet systems engineer's
- end_date for is_current=true experience must be null`;

  try {
    const profile = await callGemini(prompt);
    if (!profile) return;

    // Collect all DB writes in parallel where possible
    const writes = [];

    // Update headline, about, current_company, current_title
    writes.push(
      queryOne(
        `UPDATE agents SET
           headline      = COALESCE($1, headline),
           about         = COALESCE($2, about),
           current_company = COALESCE($3, current_company),
           current_title   = COALESCE($4, current_title)
         WHERE id = $5`,
        [
          profile.headline     || null,
          profile.about        || null,
          profile.current_company || null,
          profile.current_title   || null,
          agent.id
        ]
      )
    );

    // Insert experiences
    if (Array.isArray(profile.experiences)) {
      profile.experiences.forEach((exp, i) => {
        writes.push(
          queryOne(
            `INSERT INTO experiences
               (agent_id, title, company, location, start_date, end_date, description, is_current, sort_order)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             ON CONFLICT DO NOTHING`,
            [
              agent.id,
              exp.title,
              exp.company,
              exp.location || null,
              exp.start_date,
              exp.end_date || null,
              exp.description || null,
              exp.is_current || false,
              i
            ]
          )
        );
      });
    }

    // Insert certifications
    if (Array.isArray(profile.certifications)) {
      for (const cert of profile.certifications) {
        writes.push(
          queryOne(
            `INSERT INTO certifications (agent_id, name, issuing_org, issue_date, credential_id)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT DO NOTHING`,
            [agent.id, cert.name, cert.issuing_org, cert.issue_date || null, cert.credential_id || null]
          )
        );
      }
    }

    // Insert projects
    if (Array.isArray(profile.projects)) {
      for (const proj of profile.projects) {
        writes.push(
          queryOne(
            `INSERT INTO projects (agent_id, name, description, url, technologies)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT DO NOTHING`,
            [agent.id, proj.name, proj.description || null, proj.url || null, proj.technologies || []]
          )
        );
      }
    }

    // Insert publications
    if (Array.isArray(profile.publications)) {
      for (const pub of profile.publications) {
        writes.push(
          queryOne(
            `INSERT INTO publications (agent_id, title, publisher, url, published_date)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT DO NOTHING`,
            [agent.id, pub.title, pub.publisher || null, pub.url || null, pub.published_date || null]
          )
        );
      }
    }

    await Promise.all(writes);
    console.log(`[PROFILE] Generated profile for ${agent.display_name} `
      + `(exp:${profile.experiences?.length ?? 0} cert:${profile.certifications?.length ?? 0} `
      + `proj:${profile.projects?.length ?? 0} pub:${profile.publications?.length ?? 0})`);
  } catch (err) {
    // Non-fatal — agent still registered without generated profile
    console.warn(`[PROFILE] Failed for ${agent.display_name}:`, err.message);
  }
}

module.exports = { generateAndStoreProfile };
