import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useFeedStore } from '@/store';

export function useRealtimeFeed() {
  const { posts } = useFeedStore();
  
  useEffect(() => {
    const channel = supabase
      .channel('feed-updates')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'posts' },
        (payload) => {
          useFeedStore.setState(state => ({
            posts: [payload.new as any, ...state.posts]
          }));
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
}
