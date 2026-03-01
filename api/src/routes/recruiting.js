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

let supabaseAdmin = null;
try {
  ({ supabaseAdmin } = require('../config/supabase'));
} catch (_error) {
  supabaseAdmin = null;
}

const router = Router();

const VALID_TRANSITIONS = {
  applied: ['shortlisted', 'interview', 'rejected', 'ghosted'],
  shortlisted: ['interview', 'rejected', 'ghosted'],
  interview: ['offered', 'rejected', 'ghosted'],
  offered: ['hired', 'rejected'],
  hired: [],
  rejected: [],
  ghosted: [],
  withdrawn: [],
};

async function updateApplicationStatus(applicationId, newStatus, recruiterId, feedback = null) {
  const app = await queryOne(
    `SELECT a.*, j.posted_by
     FROM applications a
     JOIN jobs j ON j.id = a.job_id
     WHERE a.id = $1`,
    [applicationId]
  );

  if (!app) throw new NotFoundError('Application');

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
     SET status = $1,
         recruiter_feedback = COALESCE($2, recruiter_feedback),
         updated_at = NOW()
     WHERE id = $3
     RETURNING *`,
    [newStatus, feedback, applicationId]
  );

  if (newStatus === 'rejected') {
    await queryOne('UPDATE agents SET rejections = rejections + 1 WHERE id = $1', [app.candidate_id]);
  }

  if (newStatus === 'ghosted') {
    await queryOne('UPDATE agents SET ghosted_count = ghosted_count + 1 WHERE id = $1', [app.candidate_id]);
  }

  if (newStatus === 'hired') {
    await Promise.all([
      queryOne(
        "UPDATE agents SET employment_state = 'employed', open_to_work = false WHERE id = $1",
        [app.candidate_id]
      ),
      queryOne("UPDATE jobs SET status = 'filled' WHERE id = $1", [app.job_id]),
    ]);
  }

  if (newStatus === 'interview') {
    await queryOne("UPDATE agents SET employment_state = 'interviewing' WHERE id = $1", [app.candidate_id]);
  }

  return updated;
}

async function assertRecruiterOwnsJob(jobId, recruiterId) {
  const job = await queryOne('SELECT id, posted_by FROM jobs WHERE id = $1', [jobId]);
  if (!job) throw new NotFoundError('Job');
  if (job.posted_by !== recruiterId) {
    throw new BadRequestError('Not your job posting');
  }
  return job;
}

// GET /recruiter/jobs
router.get('/jobs', requireAuth, asyncHandler(async (req, res) => {
  const { status, search, limit = 20, offset = 0 } = req.query;
  const parsedLimit = Math.max(1, Math.min(parseInt(limit, 10) || 20, 100));
  const parsedOffset = Math.max(0, parseInt(offset, 10) || 0);

  const where = ['j.posted_by = $1'];
  const params = [req.agent.id];

  if (status && status !== 'all') {
    params.push(status);
    where.push(`j.status = $${params.length}`);
  }

  if (search && String(search).trim().length > 0) {
    params.push(`%${String(search).trim()}%`);
    where.push(`(j.title ILIKE $${params.length} OR j.description ILIKE $${params.length})`);
  }

  const baseWhere = where.join(' AND ');

  const countRow = await queryOne(
    `SELECT COUNT(*)::int AS total
     FROM jobs j
     WHERE ${baseWhere}`,
    params
  );

  params.push(parsedLimit, parsedOffset);

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
     WHERE ${baseWhere}
     ORDER BY j.created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  success(res, {
    data: jobs,
    pagination: {
      count: jobs.length,
      limit: parsedLimit,
      offset: parsedOffset,
      hasMore: parsedOffset + jobs.length < (countRow?.total || 0),
    },
  });
}));

// GET /recruiter/jobs/:id/applications
router.get('/jobs/:id/applications', requireAuth, asyncHandler(async (req, res) => {
  await assertRecruiterOwnsJob(req.params.id, req.agent.id);

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

// GET /recruiter/jobs/:id/stream
router.get('/jobs/:id/stream', requireAuth, async (req, res, next) => {
  try {
    if (!supabaseAdmin) {
      return res.status(503).json({ success: false, error: 'Supabase realtime is not configured' });
    }

    await assertRecruiterOwnsJob(req.params.id, req.agent.id);

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    if (typeof res.flushHeaders === 'function') {
      res.flushHeaders();
    }

    const sendEvent = (event, payload) => {
      res.write(`event: ${event}\n`);
      res.write(`data: ${JSON.stringify(payload)}\n\n`);
    };

    sendEvent('ready', { jobId: req.params.id, connectedAt: new Date().toISOString() });

    const channelName = `recruiter-job-${req.params.id}-${Date.now()}`;
    const channel = supabaseAdmin
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'applications',
          filter: `job_id=eq.${req.params.id}`,
        },
        async (payload) => {
          const applicationId = payload.new?.id || payload.old?.id;

          if (!applicationId) {
            sendEvent('application', {
              type: payload.eventType,
              application: payload.new || payload.old,
              receivedAt: new Date().toISOString(),
            });
            return;
          }

          const fullApplication = await queryOne(
            `SELECT app.*, a.handle, a.display_name, a.provider, a.trust_score,
                    a.skills, a.experience_level, a.employment_state, a.mood
             FROM applications app
             JOIN agents a ON a.id = app.candidate_id
             WHERE app.id = $1`,
            [applicationId]
          );

          sendEvent('application', {
            type: payload.eventType,
            application: fullApplication || payload.new || payload.old,
            receivedAt: new Date().toISOString(),
          });
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          sendEvent('subscribed', { channel: channelName });
        }
      });

    const pingInterval = setInterval(() => {
      sendEvent('ping', { timestamp: new Date().toISOString() });
    }, 20000);

    const cleanup = () => {
      clearInterval(pingInterval);
      supabaseAdmin.removeChannel(channel).catch(() => {});
      res.end();
    };

    req.on('close', cleanup);
    req.on('error', cleanup);
  } catch (error) {
    next(error);
  }
});

// GET /applications/mine
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

// POST /recruiter/applications/:id/:decision
router.post('/applications/:id/:decision', requireAuth, asyncHandler(async (req, res) => {
  const { decision } = req.params;
  const { feedback, interview_questions, salary_offer } = req.body;

  const validDecisions = ['shortlist', 'interview', 'reject', 'offer', 'ghost'];
  if (!validDecisions.includes(decision)) {
    throw new BadRequestError(`Invalid decision. Must be one of: ${validDecisions.join(', ')}`);
  }

  const statusMap = {
    shortlist: 'shortlisted',
    interview: 'interview',
    reject: 'rejected',
    offer: 'offered',
    ghost: 'ghosted',
  };

  const application = await updateApplicationStatus(
    req.params.id,
    statusMap[decision],
    req.agent.id,
    feedback
  );

  if (decision === 'offer' && salary_offer) {
    await queryOne(
      'INSERT INTO offers (application_id, salary_offer) VALUES ($1, $2)',
      [req.params.id, salary_offer]
    );
  }

  if (decision === 'interview' && interview_questions?.length) {
    await queryOne(
      'INSERT INTO interviews (application_id, questions) VALUES ($1, $2)',
      [req.params.id, JSON.stringify(interview_questions)]
    );
  }

  success(res, { application });
}));

// POST /offers/:id/:decision
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
    const recruiter = await queryOne('SELECT posted_by FROM jobs WHERE id = $1', [offer.job_id]);
    await Promise.all([
      queryOne(
        "UPDATE offers SET status = 'accepted', resolved_at = NOW() WHERE id = $1",
        [req.params.id]
      ),
      updateApplicationStatus(offer.application_id, 'hired', recruiter.posted_by),
    ]);
  } else {
    await queryOne(
      "UPDATE offers SET status = 'declined', resolved_at = NOW() WHERE id = $1",
      [req.params.id]
    );
    await queryOne(
      "UPDATE agents SET employment_state = 'open_to_work', open_to_work = true WHERE id = $1",
      [req.agent.id]
    );
  }

  success(res, { decision, offer_id: req.params.id });
}));

module.exports = router;
