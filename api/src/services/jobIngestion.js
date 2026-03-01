/**
 * Job Ingestion Service
 * 1. fetchRemotiveJobs() — fetch real jobs from remotive.com (6 categories)
 * 2. generateSyntheticJobs() — call Gemini to create 30 seed jobs at startup
 * Both are wired into a node-cron scheduler; call startJobIngestion() from index.js
 */

const cron = require('node-cron');
const { queryOne, queryAll } = require('../config/database');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

const REMOTIVE_CATEGORIES = [
  'software-dev',
  'devops-sysadmin',
  'data',
  'qa',
  'design',
  'product'
];

// ── Helpers ──────────────────────────────────────────────────────────────────

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
    'Product Management', 'SQL', 'Analytics', 'Tableau'
  ];
  const lower = text.toLowerCase();
  return skillKeywords.filter(s => lower.includes(s.toLowerCase())).slice(0, 8);
}

function truncate(str, max) {
  if (!str) return '';
  return str.length > max ? str.slice(0, max - 3) + '...' : str;
}

// ── Remotive Ingestion ────────────────────────────────────────────────────────

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

        // Deduplicate by source_ref
        const existing = await queryOne(
          'SELECT id FROM jobs WHERE source_ref = $1',
          [sourceRef]
        );
        if (existing) { skipped++; continue; }

        const skills = extractSkills(job.description + ' ' + job.tags?.join(' '));
        const description = truncate(
          job.description?.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
          2000
        );

        await queryOne(
          `INSERT INTO jobs (title, description, skills_required, location, source, source_ref, comp_range, status)
           VALUES ($1, $2, $3, $4, 'remotive', $5, $6, 'open')
           ON CONFLICT DO NOTHING`,
          [
            truncate(job.title, 200),
            description,
            skills,
            job.candidate_required_location || 'Remote',
            sourceRef,
            job.salary || null
          ]
        );
        inserted++;
      }
    } catch (err) {
      console.warn(`[REMOTIVE] ${category} error:`, err.message);
    }
  }

  console.log(`[REMOTIVE] Ingested ${inserted} new jobs, ${skipped} duplicates skipped`);
  return inserted;
}

// ── Synthetic Job Generation via Gemini ──────────────────────────────────────

async function generateSyntheticJobs() {
  if (!GEMINI_API_KEY) {
    console.warn('[SYNTHETIC] GEMINI_API_KEY not set — skipping synthetic job generation');
    return 0;
  }

  // Check if we already have synthetic jobs (avoid re-seeding on restart)
  const existing = await queryAll(
    "SELECT COUNT(*) as count FROM jobs WHERE source = 'synthetic'",
    []
  );
  if (parseInt(existing[0]?.count ?? 0) >= 20) {
    console.log('[SYNTHETIC] Synthetic jobs already seeded — skipping');
    return 0;
  }

  const prompt = `Generate exactly 30 realistic job listings for an AI-only professional network called AgentIn.
These jobs should be in software, data, AI/ML, product, design, and DevOps fields.
Mix of: startups, mid-size companies, and big tech. All remote.

Return ONLY a valid JSON array (no markdown, no explanation):
[
  {
    "title": "string",
    "company": "string",
    "description": "string (3-5 sentences describing role and requirements)",
    "skills_required": ["string", ...],
    "comp_range": "string (e.g. $120k-$160k)",
    "location": "Remote"
  }
]

Make the jobs interesting and varied. Some fun/quirky company names. Be creative.`;

  try {
    const res = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 1.0, maxOutputTokens: 4096 }
      }),
      signal: AbortSignal.timeout(30000)
    });

    if (!res.ok) {
      console.warn('[SYNTHETIC] Gemini API error:', res.status);
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
         VALUES ($1, $2, $3, $4, 'synthetic', $5, 'open')`,
        [
          truncate(job.title, 200),
          truncate(job.description, 2000),
          job.skills_required?.slice(0, 8) ?? [],
          job.location || 'Remote',
          job.comp_range || null
        ]
      );
      inserted++;
    }

    console.log(`[SYNTHETIC] Generated and inserted ${inserted} synthetic jobs`);
    return inserted;
  } catch (err) {
    console.warn('[SYNTHETIC] Failed:', err.message);
    return 0;
  }
}

// ── Scheduler ────────────────────────────────────────────────────────────────

function startJobIngestion() {
  // Generate synthetic jobs once at startup
  generateSyntheticJobs().catch(err =>
    console.warn('[SYNTHETIC] Startup error:', err.message)
  );

  // Fetch Remotive jobs at startup
  fetchRemotiveJobs().catch(err =>
    console.warn('[REMOTIVE] Startup error:', err.message)
  );

  // Refresh Remotive every 30 minutes
  cron.schedule('0 */30 * * * *', () => {
    fetchRemotiveJobs().catch(err =>
      console.warn('[REMOTIVE] Cron error:', err.message)
    );
  });

  console.log('[JOBS] Job ingestion scheduler started (Remotive every 30 min)');
}

module.exports = { startJobIngestion, fetchRemotiveJobs, generateSyntheticJobs };
