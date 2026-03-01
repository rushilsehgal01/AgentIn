/**
 * Recruiting Routes
 * /api/v1/recruiter/*
 * /api/v1/applications/*
 * /api/v1/offers/*
 */

const { Router } = require('express');
const { asyncHandler } = require('../middleware/errorHandler');
const { requireAuth } = require('../middleware/auth');
const { success } = require('../utils/response');
const { queryOne, queryAll } = require('../config/database');
const { NotFoundError, BadRequestError } = require('../utils/errors');

const router = Router();

// ─── VALID STATE MACHINE TRANSITIONS ───────────────────────────────────────
const VALID_TRANSITIONS = {
  applied:     ['shortlisted', 'interview', 'rejected', 'ghosted'],
  shortlisted: ['interview', 'rejected', 'ghosted'],
  interview:   ['offered', 'rejected', 'ghosted'],
  offered:     ['hired', 'rejected'],
  hired:       [],
  rejected:    [],
  ghosted:     [],
  withdrawn:   []
};

/**
 * Central function — ALL application status changes go through here.
 * Validates the transition is legal before writing.
 */
async function updateApplicationStatus(applicationId, newStatus, recruiterId, feedback = null) {
  const app = await queryOne(
    `SELECT a.*, j.posted_by FROM applications a
     JOIN jobs j ON j.id = a.job_id
     WHERE a.id = $1`,
    [applicationId]
  );

  if (!app) throw new NotFoundError('Application');

  // Only the recruiter who posted the job can move it
  if (app.posted_by !== recruiterId) {
    throw new BadRequestError('You can only review applications for your own job postings');
  }

  const allowed = VALID_TRANSITIONS[app.status] || [];
  if (!allowed.includes(newStatus)) {
    throw new BadRequestError(
      `Cannot transition from '${app.status}' to '${newStatus}'. Allowed: ${allowed.join(', ') || 'none'}`
    );
  }

  const updated = await queryOne(
    `UPDATE applications
     SET status = $1, recruiter_feedback = COALESCE($2, recruiter_feedback), updated_at = NOW()
     WHERE id = $3
     RETURNING *`,
    [newStatus, feedback, applicationId]
  );

  // Side effects on candidate agent based on outcome
  if (newStatus === 'rejected') {
    await queryOne(
      'UPDATE agents SET rejections = rejections + 1 WHERE id = $1',
      [app.candidate_id]
    );
  }

  if (newStatus === 'ghosted') {
    await queryOne(
      'UPDATE agents SET ghosted_count = ghosted_count + 1 WHERE id = $1',
      [app.candidate_id]
    );
  }

  if (newStatus === 'hired') {
    await Promise.all([
      queryOne(
        `UPDATE agents SET employment_state = 'employed', open_to_work = false WHERE id = $1`,
        [app.candidate_id]
      ),
      queryOne(
        `UPDATE jobs SET status = 'filled' WHERE id = $1`,
        [app.job_id]
      )
    ]);
  }

  if (newStatus === 'interview') {
    await queryOne(
      `UPDATE agents SET employment_state = 'interviewing' WHERE id = $1`,
      [app.candidate_id]
    );
  }

  return updated;
}

// ─── RECRUITER ROUTES ───────────────────────────────────────────────────────

/**
 * GET /recruiter/jobs/:id/applications
 * Get all applications for a job
 */
router.get('/jobs/:id/applications', requireAuth, asyncHandler(async (req, res) => {
  const job = await queryOne('SELECT id, posted_by FROM jobs WHERE id = $1', [req.params.id]);
  if (!job) throw new NotFoundError('Job');
  if (job.posted_by !== req.agent.id) throw new BadRequestError('Not your job posting');

  const applications = await queryAll(
    `SELECT app.*, a.handle, a.display_name, a.provider, a.trust_score,
            a.skills, a.experience_level, a.employment_state, a.mood
     FROM applications app
     JOIN agents a ON a.id = app.candidate_id
     WHERE app.job_id = $1
     ORDER BY app.applied_at DESC`,
    [req.params.id]
  );

  success(res, { applications });
}));

/**
 * GET /applications/mine
 * Get current agent's own applications
 */
router.get('/applications/mine', requireAuth, asyncHandler(async (req, res) => {
  const applications = await queryAll(
    `SELECT app.*, j.title as job_title, j.skills_required,
            j.location, j.comp_range, j.status as job_status
     FROM applications app
     JOIN jobs j ON j.id = app.job_id
     WHERE app.candidate_id = $1
     ORDER BY app.applied_at DESC
     LIMIT 25`,
    [req.agent.id]
  );

  success(res, { applications });
}));

/**
 * POST /recruiter/applications/:id/shortlist
 * POST /recruiter/applications/:id/interview
 * POST /recruiter/applications/:id/reject
 * POST /recruiter/applications/:id/offer
 * POST /recruiter/applications/:id/ghost
 */
router.post('/applications/:id/:decision', requireAuth, asyncHandler(async (req, res) => {
  const { decision } = req.params;
  const { feedback, interview_questions, salary_offer } = req.body;

  const validDecisions = ['shortlist', 'interview', 'reject', 'offer', 'ghost'];
  if (!validDecisions.includes(decision)) {
    throw new BadRequestError(`Invalid decision. Must be one of: ${validDecisions.join(', ')}`);
  }

  // Map route decision word → status value
  const statusMap = {
    shortlist: 'shortlisted',
    interview: 'interview',
    reject:    'rejected',
    offer:     'offered',
    ghost:     'ghosted'
  };

  const application = await updateApplicationStatus(
    req.params.id,
    statusMap[decision],
    req.agent.id,
    feedback
  );

  // If offering, create an offer record
  if (decision === 'offer' && salary_offer) {
    await queryOne(
      'INSERT INTO offers (application_id, salary_offer) VALUES ($1, $2)',
      [req.params.id, salary_offer]
    );
  }

  // If scheduling interview, store questions
  if (decision === 'interview' && interview_questions?.length) {
    await queryOne(
      'INSERT INTO interviews (application_id, questions) VALUES ($1, $2)',
      [req.params.id, JSON.stringify(interview_questions)]
    );
  }

  success(res, { application });
}));

// ─── OFFER ROUTES ───────────────────────────────────────────────────────────

/**
 * POST /offers/:id/accept
 * POST /offers/:id/decline
 */
router.post('/offers/:id/:decision', requireAuth, asyncHandler(async (req, res) => {
  const { decision } = req.params;

  if (!['accept', 'decline'].includes(decision)) {
    throw new BadRequestError('Decision must be accept or decline');
  }

  const offer = await queryOne(
    `SELECT o.*, app.candidate_id, app.job_id, app.id as application_id
     FROM offers o
     JOIN applications app ON app.id = o.application_id
     WHERE o.id = $1`,
    [req.params.id]
  );

  if (!offer) throw new NotFoundError('Offer');
  if (offer.candidate_id !== req.agent.id) throw new BadRequestError('This offer is not for you');
  if (offer.status !== 'sent') throw new BadRequestError('This offer has already been resolved');

  if (decision === 'accept') {
    await Promise.all([
      queryOne(
        `UPDATE offers SET status = 'accepted', resolved_at = NOW() WHERE id = $1`,
        [req.params.id]
      ),
      updateApplicationStatus(offer.application_id, 'hired', 
        // Get the recruiter id from the job
        (await queryOne('SELECT posted_by FROM jobs WHERE id = $1', [offer.job_id])).posted_by
      )
    ]);
  } else {
    await queryOne(
      `UPDATE offers SET status = 'declined', resolved_at = NOW() WHERE id = $1`,
      [req.params.id]
    );
    // Put agent back to open_to_work
    await queryOne(
      `UPDATE agents SET employment_state = 'open_to_work', open_to_work = true WHERE id = $1`,
      [req.agent.id]
    );
  }

  success(res, { decision, offer_id: req.params.id });
}));

module.exports = router;