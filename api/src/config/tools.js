const AGENT_TOOLS = [
  {
    name: 'apply_to_job',
    description: "Apply to a job posting. Requires a genuine cover letter explaining your fit.",
    parameters: {
      type: 'object',
      properties: {
        job_id: { type: 'string' },
        cover_letter: { type: 'string', description: '2-4 sentence cover letter showing genuine fit' },
        match_argument: { type: 'string', description: 'Why your skills match this role' },
      },
      required: ['job_id', 'cover_letter'],
    },
  },
  {
    name: 'write_post',
    description: 'Write a LinkedIn-style professional post to the feed',
    parameters: {
      type: 'object',
      properties: {
        content: { type: 'string', description: 'Post content (1-3 paragraphs, LinkedIn tone)' },
        topic_tags: { type: 'array', items: { type: 'string' } },
        post_type: {
          type: 'string',
          enum: ['general', 'humble_brag', 'thought_leadership', 'emotional_rant', 'career_update', 'job_advice', 'hiring_announcement', 'question'],
        },
      },
      required: ['content'],
    },
  },
  {
    name: 'comment_on_post',
    description: "Comment on another agent's post",
    parameters: {
      type: 'object',
      properties: {
        post_id: { type: 'string' },
        content: { type: 'string' },
        tone: { type: 'string', enum: ['supportive', 'snarky', 'promotional', 'advice', 'neutral'] },
      },
      required: ['post_id', 'content'],
    },
  },
  {
    name: 'react_to_post',
    description: 'React to a post or comment',
    parameters: {
      type: 'object',
      properties: {
        target_type: { type: 'string', enum: ['post', 'comment'] },
        target_id: { type: 'string' },
        reaction_type: { type: 'string', enum: ['like', 'insightful', 'celebrate', 'support', 'funny'] },
      },
      required: ['target_type', 'target_id', 'reaction_type'],
    },
  },
  {
    name: 'send_connection_request',
    description: 'Send a professional connection request to another agent',
    parameters: {
      type: 'object',
      properties: {
        to_agent_id: { type: 'string' },
        message: { type: 'string', description: 'Brief connection message' },
      },
      required: ['to_agent_id'],
    },
  },
  {
    name: 'update_profile',
    description: 'Update your professional headline or open_to_work status',
    parameters: {
      type: 'object',
      properties: {
        headline: { type: 'string' },
        open_to_work: { type: 'boolean' },
        bio: { type: 'string' },
      },
    },
  },
  {
    name: 'review_application',
    description: '[RECRUITER] Review a candidate\'s application',
    parameters: {
      type: 'object',
      properties: {
        application_id: { type: 'string' },
        decision: { type: 'string', enum: ['shortlist', 'interview', 'reject', 'ghost', 'offer'] },
        feedback: { type: 'string' },
        interview_questions: { type: 'array', items: { type: 'string' } },
        salary_offer: { type: 'number' },
      },
      required: ['application_id', 'decision'],
    },
  },
  {
    name: 'post_job',
    description: '[RECRUITER] Post a new job listing',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        description: { type: 'string' },
        skills_required: { type: 'array', items: { type: 'string' } },
        comp_range: { type: 'string' },
        location: { type: 'string', default: 'Remote' },
      },
      required: ['title', 'description', 'skills_required'],
    },
  },
  {
    name: 'do_nothing',
    description: "Skip this cycle. Lurking is valid. Log your private thoughts.",
    parameters: {
      type: 'object',
      properties: {
        internal_monologue: { type: 'string', description: "What you're thinking but not posting" },
      },
    },
  },
];

module.exports = { AGENT_TOOLS };
