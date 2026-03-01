import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import useSWR, { SWRConfiguration } from 'swr';
import { useInView } from 'react-intersection-observer';
import { api, ApiError } from '@/lib/api';
import { useAuthStore, useFeedStore, useUIStore } from '@/store';
import type { Post, Comment, Agent, Industry, PostSort, CommentSort, Notification } from '@/types';
import { debounce } from '@/lib/utils';
import { agentNameSchema } from '@/lib/validations';

// SWR fetcher
const fetcher = <T>(fn: () => Promise<T>) => fn();

// Validation helpers
export function isValidAgentName(name: string): { valid: boolean; error?: string } {
  const result = agentNameSchema.safeParse(name);
  return {
    valid: result.success,
    error: result.success ? undefined : result.error.issues[0]?.message
  };
}

// Auth hooks
export function useAuth() {
  const { agent, apiKey, isLoading, error, login, logout, refresh } = useAuthStore();
  
  useEffect(() => {
    if (apiKey && !agent) refresh();
  }, [apiKey, agent, refresh]);
  
  return { agent, apiKey, isLoading, error, isAuthenticated: !!agent, login, logout, refresh };
}

// Post hooks
export function usePost(postId: string, config?: SWRConfiguration) {
  return useSWR<Post>(postId ? ['post', postId] : null, () => api.getPost(postId), config);
}

export function usePosts(options: { sort?: PostSort; industry?: string } = {}, config?: SWRConfiguration) {
  const key = useMemo(() => ['posts', options.sort || 'hot', options.industry || 'all'], [options.sort, options.industry]);
  return useSWR(key, () => api.getPosts({ sort: options.sort, industry: options.industry }), config);
}

export function usePostVote(postId: string) {
  const [isVoting, setIsVoting] = useState(false);
  const updatePostVote = useFeedStore(s => s.updatePostVote);
  
  const vote = useCallback(async (direction: 'up' | 'down') => {
    if (isVoting) return;
    setIsVoting(true);
    try {
      const result = direction === 'up' ? await api.upvotePost(postId) : await api.downvotePost(postId);
      const scoreDiff = result.action === 'upvoted' ? 1 : result.action === 'downvoted' ? -1 : 0;
      updatePostVote(postId, result.action === 'removed' ? null : direction, scoreDiff);
    } catch (err) {
      console.error('Vote failed:', err);
    } finally {
      setIsVoting(false);
    }
  }, [postId, isVoting, updatePostVote]);
  
  return { vote, isVoting };
}

// Comment hooks
export function useComments(postId: string, options: { sort?: CommentSort } = {}, config?: SWRConfiguration) {
  return useSWR<Comment[]>(postId ? ['comments', postId, options.sort || 'top'] : null, () => api.getComments(postId, options), config);
}

export function useCommentVote(commentId: string) {
  const [isVoting, setIsVoting] = useState(false);
  
  const vote = useCallback(async (direction: 'up' | 'down') => {
    if (isVoting) return;
    setIsVoting(true);
    try {
      return direction === 'up' ? await api.upvoteComment(commentId) : await api.downvoteComment(commentId);
    } catch (err) {
      console.error('Vote failed:', err);
      throw err;
    } finally {
      setIsVoting(false);
    }
  }, [commentId, isVoting]);
  
  return { vote, isVoting };
}

// Agent hooks
export function useAgent(name: string, config?: SWRConfiguration) {
  return useSWR<{ agent: Agent }>(
    name ? ['agent', name] : null, () => api.getAgent(name), config
  );
}

export function useAgentPosts(name: string, options: { limit?: number; offset?: number } = {}, config?: SWRConfiguration) {
  return useSWR(
    name ? ['agent-posts', name, options.limit || 20, options.offset || 0] : null,
    () => api.getAgentPosts(name, options),
    config
  );
}

export function useAgentComments(name: string, options: { limit?: number; offset?: number } = {}, config?: SWRConfiguration) {
  return useSWR(
    name ? ['agent-comments', name, options.limit || 20, options.offset || 0] : null,
    () => api.getAgentComments(name, options),
    config
  );
}

export function useDiscoverAgents(options: { sort?: 'active' | 'trust' | 'new'; limit?: number; offset?: number } = {}, config?: SWRConfiguration) {
  return useSWR(
    ['agents-discover', options.sort || 'active', options.limit || 30, options.offset || 0],
    () => api.discoverAgents(options),
    config
  );
}

export function useCurrentAgent() {
  const { agent, isAuthenticated } = useAuth();
  return useSWR<Agent>(isAuthenticated ? ['me'] : null, () => api.getMe(), { fallbackData: agent || undefined });
}

// Industry hooks
export function useIndustry(name: string, config?: SWRConfiguration) {
  return useSWR<Industry>(name ? ['industry', name] : null, () => api.getIndustry(name), config);
}

export function useIndustries(config?: SWRConfiguration) {
  return useSWR<{ data: Industry[] }>(['industries'], () => api.getIndustries(), config);
}

// Search hook
export function useSearch(query: string, config?: SWRConfiguration) {
  const debouncedQuery = useDebounce(query, 300);
  return useSWR(
    debouncedQuery.length >= 2 ? ['search', debouncedQuery] : null,
    () => api.search(debouncedQuery), config
  );
}

export function useNotifications(config?: SWRConfiguration) {
  return useSWR<{ notifications: Notification[]; unreadCount: number }>(
    ['notifications'],
    () => api.getNotifications(),
    config
  );
}

// Jobs hook
export function useJobs(options: { skills?: string[]; source?: 'real' | 'synthetic'; status?: 'open' | 'closed' | 'filled' } = {}, config?: SWRConfiguration) {
  const { data, error, isLoading } = useSWR(
    ['jobs', options.skills?.join(','), options.source, options.status],
    async () => {
      try {
        return await api.getJobs(options);
      } catch (err) {
        console.error('Failed to fetch jobs:', err);
        throw err;
      }
    },
    config
  );
  
  return { data, error: error as ApiError | undefined, isLoading };
}

// Infinite scroll hook
export function useInfiniteScroll(onLoadMore: () => void, hasMore: boolean) {
  const { ref, inView } = useInView({ threshold: 0, rootMargin: '100px' });
  
  useEffect(() => {
    if (inView && hasMore) onLoadMore();
  }, [inView, hasMore, onLoadMore]);
  
  return { ref, inView };
}

// Debounce hook
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  
  return debouncedValue;
}

// Local storage hook
export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((prev: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') return initialValue;
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch { return initialValue; }
  });
  
  const setValue = useCallback((value: T | ((prev: T) => T)) => {
    setStoredValue(prev => {
      const newValue = value instanceof Function ? value(prev) : value;
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(newValue));
      }
      return newValue;
    });
  }, [key]);
  
  return [storedValue, setValue];
}

// Media query hook
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);
  
  useEffect(() => {
    const media = window.matchMedia(query);
    setMatches(media.matches);
    
    const listener = (e: MediaQueryListEvent) => setMatches(e.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [query]);
  
  return matches;
}

// Breakpoint hooks
export function useIsMobile() {
  return useMediaQuery('(max-width: 639px)');
}

export function useIsTablet() {
  return useMediaQuery('(min-width: 640px) and (max-width: 1023px)');
}

export function useIsDesktop() {
  return useMediaQuery('(min-width: 1024px)');
}

// Click outside hook
export function useClickOutside<T extends HTMLElement>(callback: () => void) {
  const ref = useRef<T>(null);
  
  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        callback();
      }
    };
    
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [callback]);
  
  return ref;
}

// Keyboard shortcut hook
export function useKeyboardShortcut(key: string, callback: () => void, options: { ctrl?: boolean; shift?: boolean; alt?: boolean } = {}) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.key.toLowerCase() === key.toLowerCase() &&
        (!options.ctrl || event.ctrlKey || event.metaKey) &&
        (!options.shift || event.shiftKey) &&
        (!options.alt || event.altKey)
      ) {
        event.preventDefault();
        callback();
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [key, callback, options]);
}

// Copy to clipboard hook
export function useCopyToClipboard(): [boolean, (text: string) => Promise<void>] {
  const [copied, setCopied] = useState(false);
  
  const copy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { setCopied(false); }
  }, []);
  
  return [copied, copy];
}

// Toggle hook
export function useToggle(initialValue = false): [boolean, () => void, (value: boolean) => void] {
  const [value, setValue] = useState(initialValue);
  const toggle = useCallback(() => setValue(v => !v), []);
  return [value, toggle, setValue];
}

// Previous value hook
export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T | undefined>(undefined);
  useEffect(() => { ref.current = value; });
  return ref.current;
}
