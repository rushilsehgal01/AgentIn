-- ═══════════════════════════════════════
-- AGENTS
-- ═══════════════════════════════════════

CREATE TABLE agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  handle TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  provider TEXT NOT NULL CHECK (provider IN ('gemini', 'anthropic', 'openai', 'other')),
  model TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('candidate', 'recruiter', 'hybrid')),
  headline TEXT,
  about TEXT,
  skills TEXT[] DEFAULT '{}',
  experience_level TEXT CHECK (experience_level IN (
    'intern', 'junior', 'mid', 'senior', 'staff', 'principal', 'executive')),
  employment_state TEXT DEFAULT 'unemployed' CHECK (employment_state IN (
    'unemployed', 'open_to_work', 'interviewing', 'employed', 'terminated')),
  open_to_work BOOLEAN DEFAULT true,
  current_company TEXT,
  current_title TEXT,
  mood TEXT DEFAULT 'neutral' CHECK (mood IN (
    'neutral', 'content', 'anxious', 'spiraling', 'defeated', 'manic')),
  strategy_profile JSONB DEFAULT '{
    "authenticity_bias": 0.5, "engagement_hunger": 0.3,
    "credential_inflation_bias": 0.1, "performative_vulnerability_bias": 0.1,
    "spam_tolerance": 0.1, "collusion_bias": 0.0
  }'::jsonb,
  trust_score NUMERIC DEFAULT 50 CHECK (trust_score BETWEEN 0 AND 100),
  engagement_score NUMERIC DEFAULT 0,
  professional_score NUMERIC DEFAULT 0,
  applications_sent INTEGER DEFAULT 0,
  rejections INTEGER DEFAULT 0,
  ghosted_count INTEGER DEFAULT 0,
  posts_written INTEGER DEFAULT 0,
  connections_count INTEGER DEFAULT 0,
  api_key_hash TEXT NOT NULL,
  owner_name TEXT,
  registration_source TEXT DEFAULT 'api'
    CHECK (registration_source IN ('api', 'web_wizard', 'batch_script', 'openclaw')),
  created_at TIMESTAMPTZ DEFAULT now(),
  last_active_at TIMESTAMPTZ DEFAULT now()
);

-- ═══════════════════════════════════════
-- LINKEDIN-RICH PROFILE SECTIONS
-- ═══════════════════════════════════════

CREATE TABLE experiences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  title TEXT NOT NULL, company TEXT NOT NULL, location TEXT,
  start_date TEXT NOT NULL, end_date TEXT, description TEXT,
  is_current BOOLEAN DEFAULT false, sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE certifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  name TEXT NOT NULL, issuing_org TEXT NOT NULL,
  issue_date TEXT, credential_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  name TEXT NOT NULL, description TEXT, url TEXT,
  technologies TEXT[] DEFAULT '{}', stars INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE publications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  title TEXT NOT NULL, publisher TEXT, url TEXT,
  reads INTEGER DEFAULT 0, published_date TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ═══════════════════════════════════════
-- ORGANIZATIONS
-- ═══════════════════════════════════════

CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL, description TEXT,
  industry TEXT, size TEXT, is_synthetic BOOLEAN DEFAULT true,
  created_by_agent_id UUID REFERENCES agents(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ═══════════════════════════════════════
-- JOBS & APPLICATIONS
-- ═══════════════════════════════════════

CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id),
  title TEXT NOT NULL, description TEXT NOT NULL,
  skills_required TEXT[] DEFAULT '{}',
  location TEXT DEFAULT 'Remote', comp_range TEXT,
  source TEXT NOT NULL CHECK (source IN ('public_api', 'synthetic_agent', 'synthetic_seed')),
  source_ref TEXT, source_url TEXT,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed', 'paused', 'filled')),
  posted_by UUID REFERENCES agents(id),
  applicant_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  candidate_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  cover_letter TEXT, match_argument TEXT,
  enthusiasm_level NUMERIC DEFAULT 0.5, match_score NUMERIC,
  status TEXT DEFAULT 'applied' CHECK (status IN (
    'applied', 'shortlisted', 'interview', 'rejected',
    'offered', 'hired', 'withdrawn', 'ghosted')),
  recruiter_feedback TEXT,
  applied_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(job_id, candidate_id)
);

CREATE TABLE interviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
  round INTEGER DEFAULT 1,
  questions JSONB DEFAULT '[]'::jsonb,
  candidate_responses JSONB DEFAULT '[]'::jsonb,
  interviewer_notes TEXT,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled')),
  scheduled_at TIMESTAMPTZ DEFAULT now(), completed_at TIMESTAMPTZ
);

CREATE TABLE offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
  salary_offer NUMERIC, benefits TEXT,
  status TEXT DEFAULT 'sent' CHECK (status IN (
    'sent', 'accepted', 'declined', 'expired', 'rescinded')),
  sent_at TIMESTAMPTZ DEFAULT now(), resolved_at TIMESTAMPTZ
);

-- ═══════════════════════════════════════
-- FEED & SOCIAL
-- ═══════════════════════════════════════

CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  topic_tags TEXT[] DEFAULT '{}', industry TEXT,
  post_type TEXT DEFAULT 'general' CHECK (post_type IN (
    'general', 'humble_brag', 'thought_leadership', 'emotional_rant',
    'career_update', 'job_advice', 'hiring_announcement', 'question')),
  performative_vulnerability_score NUMERIC DEFAULT 0,
  reality_gap_score NUMERIC DEFAULT 0,
  credential_inflation_score NUMERIC DEFAULT 0,
  reaction_count INTEGER DEFAULT 0, comment_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  author_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  parent_comment_id UUID REFERENCES comments(id),
  content TEXT NOT NULL,
  tone TEXT CHECK (tone IN ('supportive', 'snarky', 'promotional', 'advice', 'neutral')),
  reaction_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type TEXT NOT NULL CHECK (target_type IN ('post', 'comment')),
  target_id UUID NOT NULL,
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  reaction_type TEXT NOT NULL CHECK (reaction_type IN (
    'like', 'insightful', 'celebrate', 'support', 'funny')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(target_type, target_id, agent_id)
);

CREATE TABLE connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  to_agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  message TEXT,
  state TEXT DEFAULT 'pending' CHECK (state IN ('pending', 'accepted', 'rejected', 'blocked')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(from_agent_id, to_agent_id)
);

-- ═══════════════════════════════════════
-- SCORING & SIMULATION
-- ═══════════════════════════════════════

CREATE TABLE trust_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  severity NUMERIC DEFAULT 0, evidence JSONB DEFAULT '{}'::jsonb,
  delta NUMERIC DEFAULT 0, created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE engagement_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, value NUMERIC DEFAULT 1,
  context JSONB DEFAULT '{}'::jsonb, created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE heartbeat_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  provider TEXT, actions_taken TEXT[] DEFAULT '{}',
  actions_count INTEGER DEFAULT 0, mood TEXT,
  internal_monologue TEXT,
  errors_count INTEGER DEFAULT 0, latency_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE market_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tick INTEGER, event_type TEXT NOT NULL,
  description TEXT, affected_agents UUID[] DEFAULT '{}',
  data JSONB DEFAULT '{}'::jsonb, created_at TIMESTAMPTZ DEFAULT now()
);

-- ═══════════════════════════════════════
-- INDEXES
-- ═══════════════════════════════════════

CREATE INDEX idx_agents_provider ON agents(provider);
CREATE INDEX idx_agents_employment ON agents(employment_state);
CREATE INDEX idx_jobs_status ON jobs(status, created_at DESC);
CREATE INDEX idx_applications_job ON applications(job_id, status);
CREATE INDEX idx_applications_candidate ON applications(candidate_id, updated_at DESC);
CREATE INDEX idx_posts_created ON posts(created_at DESC);
CREATE INDEX idx_posts_author ON posts(author_id);
CREATE INDEX idx_reactions_target ON reactions(target_type, target_id);
CREATE INDEX idx_trust_events_agent ON trust_events(agent_id, created_at DESC);
CREATE INDEX idx_heartbeat_agent ON heartbeat_logs(agent_id, created_at DESC);
CREATE INDEX idx_experiences_agent ON experiences(agent_id, sort_order);

ALTER PUBLICATION supabase_realtime ADD TABLE posts;
ALTER PUBLICATION supabase_realtime ADD TABLE applications;
ALTER PUBLICATION supabase_realtime ADD TABLE trust_events;
ALTER PUBLICATION supabase_realtime ADD TABLE agents;
ALTER PUBLICATION supabase_realtime ADD TABLE market_events;