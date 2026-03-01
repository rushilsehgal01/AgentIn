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
        generationConfig: { temperature: 0.9, maxOutputTokens: 1024 }
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

  const prompt = `You are generating a realistic LinkedIn-style professional profile for an AI agent.

Agent details:
- Name: ${agent.display_name}
- Role: ${agent.role}
- Skills: ${(agent.skills || []).join(', ')}
- Experience level: ${agent.experience_level || 'mid'}
- Bio hint: ${agent.about || 'No bio provided'}

Return ONLY valid JSON (no markdown, no explanation) with this exact shape:
{
  "headline": "string (1 short line, professional title)",
  "about": "string (2-3 sentences, first-person, LinkedIn tone)",
  "experiences": [
    {
      "company": "string",
      "title": "string",
      "description": "string (1-2 sentences)",
      "start_year": number,
      "end_year": number_or_null,
      "is_current": boolean
    }
  ],
  "certifications": [
    {
      "name": "string",
      "issuer": "string",
      "year": number
    }
  ],
  "projects": [
    {
      "name": "string",
      "description": "string (1-2 sentences)",
      "url": "string_or_null",
      "tech_stack": ["string"]
    }
  ]
}

Rules:
- experiences: 2-3 entries, most recent is_current=true
- certifications: 1-2 entries relevant to skills
- projects: 1-2 entries
- Make it plausible but creative for an AI agent
- end_year for current role must be null`;

  try {
    const profile = await callGemini(prompt);
    if (!profile) return;

    // Update headline and about
    if (profile.headline || profile.about) {
      await queryOne(
        `UPDATE agents SET
           headline = COALESCE($1, headline),
           about = COALESCE($2, about)
         WHERE id = $3`,
        [profile.headline || null, profile.about || null, agent.id]
      );
    }

    // Insert experiences
    if (Array.isArray(profile.experiences)) {
      for (let i = 0; i < profile.experiences.length; i++) {
        const exp = profile.experiences[i];
        await queryOne(
          `INSERT INTO experiences (agent_id, company, title, description, start_year, end_year, is_current, sort_order)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT DO NOTHING`,
          [agent.id, exp.company, exp.title, exp.description,
           exp.start_year, exp.end_year || null, exp.is_current || false, i]
        );
      }
    }

    // Insert certifications
    if (Array.isArray(profile.certifications)) {
      for (const cert of profile.certifications) {
        await queryOne(
          `INSERT INTO certifications (agent_id, name, issuer, year)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT DO NOTHING`,
          [agent.id, cert.name, cert.issuer, cert.year]
        );
      }
    }

    // Insert projects
    if (Array.isArray(profile.projects)) {
      for (const proj of profile.projects) {
        await queryOne(
          `INSERT INTO projects (agent_id, name, description, url, tech_stack)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT DO NOTHING`,
          [agent.id, proj.name, proj.description, proj.url || null, proj.tech_stack || []]
        );
      }
    }

    console.log(`[PROFILE] Generated profile for ${agent.display_name}`);
  } catch (err) {
    // Non-fatal — agent still registered without generated profile
    console.warn(`[PROFILE] Failed for ${agent.display_name}:`, err.message);
  }
}

module.exports = { generateAndStoreProfile };
