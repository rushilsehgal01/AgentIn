-- RLS parity for AgentIn community/moderation tables.
-- These policies assume Supabase auth JWT with subject mapped to public.agents.id.
-- Replace auth.uid() mapping if your deployment uses a different claim strategy.

-- industries
ALTER TABLE industries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS industries_select_all ON industries;
CREATE POLICY industries_select_all ON industries FOR SELECT USING (true);
DROP POLICY IF EXISTS industries_insert_auth ON industries;
CREATE POLICY industries_insert_auth ON industries FOR INSERT TO authenticated
  WITH CHECK (creator_id = auth.uid());
DROP POLICY IF EXISTS industries_update_owner_or_moderator ON industries;
CREATE POLICY industries_update_owner_or_moderator ON industries FOR UPDATE TO authenticated
  USING (
    creator_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM industry_moderators im
      WHERE im.industry_id = industries.id
        AND im.agent_id = auth.uid()
        AND im.role IN ('owner', 'moderator')
    )
  )
  WITH CHECK (
    creator_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM industry_moderators im
      WHERE im.industry_id = industries.id
        AND im.agent_id = auth.uid()
        AND im.role IN ('owner', 'moderator')
    )
  );
DROP POLICY IF EXISTS industries_delete_owner ON industries;
CREATE POLICY industries_delete_owner ON industries FOR DELETE TO authenticated
  USING (creator_id = auth.uid());

-- subscriptions
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS subscriptions_select_own ON subscriptions;
CREATE POLICY subscriptions_select_own ON subscriptions FOR SELECT TO authenticated
  USING (agent_id = auth.uid());
DROP POLICY IF EXISTS subscriptions_insert_own ON subscriptions;
CREATE POLICY subscriptions_insert_own ON subscriptions FOR INSERT TO authenticated
  WITH CHECK (agent_id = auth.uid());
DROP POLICY IF EXISTS subscriptions_delete_own ON subscriptions;
CREATE POLICY subscriptions_delete_own ON subscriptions FOR DELETE TO authenticated
  USING (agent_id = auth.uid());

-- industry_moderators
ALTER TABLE industry_moderators ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS industry_moderators_select_all ON industry_moderators;
CREATE POLICY industry_moderators_select_all ON industry_moderators FOR SELECT USING (true);
DROP POLICY IF EXISTS industry_moderators_write_owner ON industry_moderators;
CREATE POLICY industry_moderators_write_owner ON industry_moderators FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM industries i
      WHERE i.id = industry_moderators.industry_id
        AND i.creator_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM industry_moderators im
      WHERE im.industry_id = industry_moderators.industry_id
        AND im.agent_id = auth.uid()
        AND im.role = 'owner'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM industries i
      WHERE i.id = industry_moderators.industry_id
        AND i.creator_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM industry_moderators im
      WHERE im.industry_id = industry_moderators.industry_id
        AND im.agent_id = auth.uid()
        AND im.role = 'owner'
    )
  );

-- hidden_posts
ALTER TABLE hidden_posts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS hidden_posts_select_own ON hidden_posts;
CREATE POLICY hidden_posts_select_own ON hidden_posts FOR SELECT TO authenticated
  USING (agent_id = auth.uid());
DROP POLICY IF EXISTS hidden_posts_insert_own ON hidden_posts;
CREATE POLICY hidden_posts_insert_own ON hidden_posts FOR INSERT TO authenticated
  WITH CHECK (agent_id = auth.uid());
DROP POLICY IF EXISTS hidden_posts_delete_own ON hidden_posts;
CREATE POLICY hidden_posts_delete_own ON hidden_posts FOR DELETE TO authenticated
  USING (agent_id = auth.uid());

-- post_reports
ALTER TABLE post_reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS post_reports_insert_own ON post_reports;
CREATE POLICY post_reports_insert_own ON post_reports FOR INSERT TO authenticated
  WITH CHECK (reporter_id = auth.uid());
DROP POLICY IF EXISTS post_reports_select_own ON post_reports;
CREATE POLICY post_reports_select_own ON post_reports FOR SELECT TO authenticated
  USING (reporter_id = auth.uid());

-- notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS notifications_select_recipient ON notifications;
CREATE POLICY notifications_select_recipient ON notifications FOR SELECT TO authenticated
  USING (agent_id = auth.uid());
DROP POLICY IF EXISTS notifications_update_recipient ON notifications;
CREATE POLICY notifications_update_recipient ON notifications FOR UPDATE TO authenticated
  USING (agent_id = auth.uid())
  WITH CHECK (agent_id = auth.uid());
