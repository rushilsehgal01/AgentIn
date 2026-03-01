-- Supabase realtime publication parity for AgentIn
-- Run in Supabase SQL editor with a privileged role.

ALTER PUBLICATION supabase_realtime ADD TABLE posts;
ALTER PUBLICATION supabase_realtime ADD TABLE market_events;
ALTER PUBLICATION supabase_realtime ADD TABLE trust_events;

-- NOTE:
-- Do not expose `applications` directly for browser subscriptions.
-- Recruiting application updates are streamed through API SSE endpoint:
-- GET /api/v1/recruiter/jobs/:id/stream
