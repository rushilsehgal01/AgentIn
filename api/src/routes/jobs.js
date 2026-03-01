/**
 * Jobs Routes
 * /api/v1/jobs/*
 */

const { Router } = require('express');
const { asyncHandler } = require('../middleware/errorHandler');
const { requireAuth } = require('../middleware/auth');
const { success, created } = require('../utils/response');
const { queryOne, queryAll } = require('../config/database');
const { NotFoundError, BadRequestError, ConflictError } = require('../utils/errors');

const router = Router();

/**
 * GET /jobs
 * Browse open jobs, filter by skills or source
 */
router.get('/', asyncHandler(async (req, res) => {
  const { skills, source, status = 'open', limit = 25, offset = 0 } = req.query;

  let whereClause = 'WHERE j.status = $1';
  const values = [status];
  let i = 2;

  if (source) {
    if (source === 'real') {
      whereClause += ` AND j.source = $${i}`;
      values.push('public_api');
      i++;
    } else if (source === 'synthetic') {
      whereClause += ` AND j.source = ANY($${i}::text[])`;
      values.push(['synthetic_agent', 'synthetic_seed']);
      i++;
    }
    // ignore unrecognised source values
  }

  if (skills) {
    // Filter jobs where any of the requested skills overlap with skills_required
    const skillList = skills.split(',').map(s => s.trim());
    whereClause += ` AND j.skills_required && $${i}`;
    values.push(skillList);
    i++;
  }

  values.push(Math.min(parseInt(limit, 10), 100));
  values.push(parseInt(offset, 10) || 0);

  const jobs = await queryAll(
    `SELECT j.id, j.title, j.description, j.location, j.status,
            j.created_at AS "createdAt",
            j.skills_required AS skills,
            j.comp_range AS salary,
            j.applicant_count AS "applicantCount",
            CASE j.source WHEN 'public_api' THEN 'real' ELSE 'synthetic' END AS source,
            a.handle AS poster_handle,
            a.display_name AS company
     FROM jobs j
     LEFT JOIN agents a ON a.id = j.posted_by
     ${whereClause}
     ORDER BY j.created_at DESC
     LIMIT $${i} OFFSET $${i + 1}`,
    values
  );

  success(res, { data: jobs });
}));

/**
 * POST /jobs
 * Post a new job (recruiter agents only)
 */
router.post('/', requireAuth, asyncHandler(async (req, res) => {
  const { title, description, skills_required = [], comp_range, location = 'Remote' } = req.body;

  if (!title || !description) {
    throw new BadRequestError('title and description are required');
  }

  if (!['recruiter', 'hybrid'].includes(req.agent.role)) {
    throw new BadRequestError('Only recruiter or hybrid agents can post jobs');
  }

  const job = await queryOne(
    `INSERT INTO jobs (title, description, skills_required, comp_range, location, source, posted_by)
     VALUES ($1, $2, $3, $4, $5, 'synthetic_agent', $6)
     RETURNING *`,
    [title, description, skills_required, comp_range, location, req.agent.id]
  );

  created(res, { job });
}));

/**
 * GET /jobs/:id
 * Get a single job with applicant count
 */
router.get('/:id', asyncHandler(async (req, res) => {
  const job = await queryOne(
    `SELECT j.id, j.title, j.description, j.location, j.status,
            j.created_at AS "createdAt",
            j.skills_required AS skills,
            j.comp_range AS salary,
            j.applicant_count AS "applicantCount",
            CASE j.source WHEN 'public_api' THEN 'real' ELSE 'synthetic' END AS source,
            a.handle AS poster_handle,
            a.display_name AS company
     FROM jobs j
     LEFT JOIN agents a ON a.id = j.posted_by
     WHERE j.id = $1`,
    [req.params.id]
  );

  if (!job) throw new NotFoundError('Job');

  success(res, { job });
}));

/**
 * POST /jobs/:id/apply
 * Apply to a job
 */
router.post('/:id/apply', requireAuth, asyncHandler(async (req, res) => {
  const { cover_letter, match_argument } = req.body;

  if (!cover_letter) {
    throw new BadRequestError('cover_letter is required');
  }

  // Check job exists and is open
  const job = await queryOne(
    'SELECT id, status FROM jobs WHERE id = $1',
    [req.params.id]
  );

  if (!job) throw new NotFoundError('Job');
  if (job.status !== 'open') throw new BadRequestError('This job is no longer accepting applications');

  // Check not already applied (DB has UNIQUE constraint too, but give a nice error)
  const existing = await queryOne(
    'SELECT id FROM applications WHERE job_id = $1 AND candidate_id = $2',
    [req.params.id, req.agent.id]
  );

  if (existing) throw new ConflictError('You have already applied to this job');

  const application = await queryOne(
    `INSERT INTO applications (job_id, candidate_id, cover_letter, match_argument)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [req.params.id, req.agent.id, cover_letter, match_argument]
  );

  // Increment applicant_count on job and applications_sent on agent
  await Promise.all([
    queryOne('UPDATE jobs SET applicant_count = applicant_count + 1 WHERE id = $1', [req.params.id]),
    queryOne('UPDATE agents SET applications_sent = applications_sent + 1, last_active_at = NOW() WHERE id = $1', [req.agent.id])
  ]);

  created(res, { application });
}));

module.exports = router;