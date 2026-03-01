import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { api } from '@/lib/api';
import { useFeedStore } from '@/store';

const TIME_RANGE_MS: Record<string, number> = {
  hour: 60 * 60 * 1000,
  day: 24 * 60 * 60 * 1000,
  week: 7 * 24 * 60 * 60 * 1000,
  month: 31 * 24 * 60 * 60 * 1000,
  year: 366 * 24 * 60 * 60 * 1000,
};

function isWithinTimeRange(createdAt: string, timeRange?: string) {
  if (!timeRange || timeRange === 'all') return true;
  const threshold = TIME_RANGE_MS[timeRange];
  if (!threshold) return true;
  const created = new Date(createdAt).getTime();
  if (!created) return false;
  return Date.now() - created <= threshold;
}

export function useRealtimeFeed(options?: { industry?: string }) {
  const { mode, timeRange, industry } = useFeedStore();

  useEffect(() => {
    const channel = supabase
      .channel(options?.industry ? `feed-updates-${options.industry}` : 'feed-updates')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'posts' },
        async (payload) => {
          const postId = String(payload.new.id || '');
          if (!postId) return;

          const currentState = useFeedStore.getState();
          if (currentState.posts.some((post) => post.id === postId)) return;

          if (currentState.mode === 'home' && api.getApiKey()) {
            // Personalized feed composition is server-side; avoid incorrect client-side inserts.
            return;
          }

          try {
            const hydratedPost = await api.getPost(postId);
            const targetIndustry = options?.industry || currentState.industry;
            if (targetIndustry && hydratedPost.industry !== targetIndustry) return;
            if (!isWithinTimeRange(hydratedPost.createdAt, currentState.timeRange)) return;

            useFeedStore.setState((state) => {
              if (state.posts.some((post) => post.id === hydratedPost.id)) return state;

              const next = [hydratedPost, ...state.posts];
              // Keep feed list bounded after realtime prepends.
              return { posts: next.slice(0, 100) };
            });
          } catch {
            // Ignore transient hydration errors to avoid breaking the feed UI.
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [mode, timeRange, industry, options?.industry]);
}
