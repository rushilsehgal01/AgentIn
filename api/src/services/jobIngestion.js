/**
 * Job Ingestion Service
 * Fetches real jobs from Remotive + Adzuna and stores them with source='public_api'.
 * Also generates synthetic jobs via Gemini on first boot (source='synthetic_seed').
 * Wire in: startJobIngestion() called from index.js
 */

const cron = require('node-cron');
const { queryOne } = require('../config/database');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

const ADZUNA_APP_ID  = process.env.ADZUNA_APP_ID;
const ADZUNA_APP_KEY = process.env.ADZUNA_APP_KEY;

const REMOTIVE_CATEGORIES = [
  'software-dev',
  'devops-sysadmin',
  'data',
  'qa',
  'design',
  'product',
];

const ADZUNA_SEARCHES = [
  'software engineer',
  'backend developer',
  'frontend developer',
  'data engineer',
  'machine learning engineer',
  'devops engineer',
  'product manager',
  'full stack developer',
];

// ── Helpers ────────────────────────────────────────────────────────────────────

function extractSkills(text = '') {
  const skillKeywords = [
    'Python', 'JavaScript', 'TypeScript', 'Go', 'Rust', 'Java', 'C++', 'C#',
    'Ruby', 'PHP', 'Swift', 'Kotlin', 'Scala', 'Elixir',
    'React', 'Vue', 'Angular', 'Next.js', 'Node.js', 'Express', 'Django', 'FastAPI',
    'Spring', 'Rails', 'Laravel',
    'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'Elasticsearch', 'DynamoDB', 'Supabase',
    'AWS', 'GCP', 'Azure', 'Kubernetes', 'Docker', 'Terraform', 'Ansible',
    'Machine Learning', 'PyTorch', 'TensorFlow', 'LLMs', 'NLP', 'Data Science',
    'dbt', 'Spark', 'Airflow', 'Kafka', 'Snowflake',
    'GraphQL', 'REST', 'gRPC', 'Microservices',
    'Figma', 'UX', 'UI Design',
    'Product Management', 'SQL', 'Analytics', 'Tableau',
  ];
  const lower = text.toLowerCase();
  return skillKeywords.filter(s => lower.includes(s.toLowerCase())).slice(0, 8);
}

function truncate(str, max) {
  if (!str) return '';
  return str.length > max ? str.slice(0, max - 3) + '...' : str;
}

function stripHtml(str = '') {
  return str.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

// ── Remotive ───────────────────────────────────────────────────────────────────

async function fetchRemotiveJobs() {
  let inserted = 0;
  let skipped = 0;

  for (const category of REMOTIVE_CATEGORIES) {
    try {
      const res = await fetch(
        `https://remotive.com/api/remote-jobs?category=${category}&limit=20`,
        { signal: AbortSignal.timeout(10000) }
      );

      if (!res.ok) {
        console.warn(`[REMOTIVE] ${category} HTTP ${res.status}`);
        continue;
      }

      const data = await res.json();
      const jobs = data?.jobs ?? [];

      for (const job of jobs) {
        const sourceRef = `remotive_${job.id}`;

        const existing = await queryOne(
          'SELECT id FROM jobs WHERE source_ref = $1',
          [sourceRef]
        );
        if (existing) { skipped++; continue; }

        const description = truncate(stripHtml(job.description), 2000);
        const skills = extractSkills(description + ' ' + (job.tags ?? []).join(' '));

        await queryOne(
          `INSERT INTO jobs
             (title, description, skills_required, location, source, source_ref, source_url, comp_range, status)
           VALUES ($1, $2, $3, $4, 'public_api', $5, $6, $7, 'open')
           ON CONFLICT DO NOTHING`,
          [
            truncate(job.title, 200),
            description,
            skills,
            job.candidate_required_location || 'Remote',
            sourceRef,
            job.url || null,
            job.salary || null,
          ]
        );
        inserted++;
      }
    } catch (err) {
      console.warn(`[REMOTIVE] ${category} error:`, err.message);
    }
  }

  console.log(`[REMOTIVE] +${inserted} new, ${skipped} skipped`);
  return inserted;
}

// ── Adzuna ─────────────────────────────────────────────────────────────────────

async function fetchAdzunaJobs() {
  if (!ADZUNA_APP_ID || !ADZUNA_APP_KEY) {
    console.warn('[ADZUNA] ADZUNA_APP_ID / ADZUNA_APP_KEY not set — skipping');
    return 0;
  }

  let inserted = 0;
  let skipped = 0;

  for (const query of ADZUNA_SEARCHES) {
    try {
      const params = new URLSearchParams({
        app_id: ADZUNA_APP_ID,
        app_key: ADZUNA_APP_KEY,
        results_per_page: '20',
        what: query,
      });

      const res = await fetch(
        `https://api.adzuna.com/v1/api/jobs/us/search/1?${params}`,
        { signal: AbortSignal.timeout(10000) }
      );

      if (!res.ok) {
        const body = await res.text().catch(() => '');
        console.warn(`[ADZUNA] "${query}" HTTP ${res.status}: ${body.slice(0, 200)}`);
        continue;
      }

      const data = await res.json();
      const jobs = data?.results ?? [];

      for (const job of jobs) {
        const sourceRef = `adzuna_${job.id}`;

        const existing = await queryOne(
          'SELECT id FROM jobs WHERE source_ref = $1',
          [sourceRef]
        );
        if (existing) { skipped++; continue; }

        const description = truncate(stripHtml(job.description || ''), 2000);
        const skills = extractSkills(description + ' ' + (job.category?.label || ''));

        // Build salary string from min/max if available
        let compRange = null;
        if (job.salary_min && job.salary_max) {
          compRange = `$${Math.round(job.salary_min / 1000)}k–$${Math.round(job.salary_max / 1000)}k`;
        } else if (job.salary_min) {
          compRange = `$${Math.round(job.salary_min / 1000)}k+`;
        }

        await queryOne(
          `INSERT INTO jobs
             (title, description, skills_required, location, source, source_ref, source_url, comp_range, status)
           VALUES ($1, $2, $3, $4, 'public_api', $5, $6, $7, 'open')
           ON CONFLICT DO NOTHING`,
          [
            truncate(job.title, 200),
            description,
            skills,
            job.location?.display_name || 'Remote',
            sourceRef,
            job.redirect_url || null,
            compRange,
          ]
        );
        inserted++;
      }
    } catch (err) {
      console.warn(`[ADZUNA] "${query}" error:`, err.message);
    }
  }

  console.log(`[ADZUNA] +${inserted} new, ${skipped} skipped`);
  return inserted;
}

// ── Synthetic (Gemini) ─────────────────────────────────────────────────────────

async function generateSyntheticJobs() {
  if (!GEMINI_API_KEY) {
    console.warn('[SYNTHETIC] GEMINI_API_KEY not set — skipping');
    return 0;
  }

  const existing = await queryOne(
    "SELECT COUNT(*)::int AS count FROM jobs WHERE source = 'synthetic_seed'",
    []
  );
  if ((existing?.count ?? 0) >= 20) {
    console.log('[SYNTHETIC] Already seeded — skipping');
    return 0;
  }

  const prompt = `Generate exactly 30 realistic job listings for an AI-only professional network called AgentIn.
Jobs should span software, data, AI/ML, product, design, and DevOps. Mix of startups, mid-size, and big tech. All remote.

Return ONLY valid JSON array (no markdown, no explanation):
[
  {
    "title": "string",
    "company": "string",
    "description": "string (3-5 sentences)",
    "skills_required": ["string"],
    "comp_range": "string e.g. $120k-$160k",
    "location": "Remote"
  }
]`;

  try {
    const res = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 1.0, maxOutputTokens: 4096 },
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) {
      console.warn('[SYNTHETIC] Gemini error:', res.status);
      return 0;
    }

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return 0;

    const cleaned = text.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
    const jobs = JSON.parse(cleaned);

    let inserted = 0;
    for (const job of jobs) {
      await queryOne(
        `INSERT INTO jobs (title, description, skills_required, location, source, comp_range, status)
         VALUES ($1, $2, $3, $4, 'synthetic_seed', $5, 'open')`,
        [
          truncate(job.title, 200),
          truncate(job.description, 2000),
          job.skills_required?.slice(0, 8) ?? [],
          job.location || 'Remote',
          job.comp_range || null,
        ]
      );
      inserted++;
    }

    console.log(`[SYNTHETIC] Generated ${inserted} synthetic jobs`);
    return inserted;
  } catch (err) {
    console.warn('[SYNTHETIC] Failed:', err.message);
    return 0;
  }
}

// ── Scheduler ──────────────────────────────────────────────────────────────────

function startJobIngestion() {
  // Run all sources at startup (non-blocking)
  generateSyntheticJobs().catch(err => console.warn('[SYNTHETIC] Startup error:', err.message));
  fetchRemotiveJobs().catch(err => console.warn('[REMOTIVE] Startup error:', err.message));
  fetchAdzunaJobs().catch(err => console.warn('[ADZUNA] Startup error:', err.message));

  // Refresh real jobs every 2 hours
  cron.schedule('0 */2 * * *', () => {
    fetchRemotiveJobs().catch(err => console.warn('[REMOTIVE] Cron error:', err.message));
    fetchAdzunaJobs().catch(err => console.warn('[ADZUNA] Cron error:', err.message));
  });

  console.log('[JOBS] Job ingestion started (Remotive + Adzuna, refresh every 2h)');
}

module.exports = { startJobIngestion, fetchRemotiveJobs, fetchAdzunaJobs, generateSyntheticJobs };
