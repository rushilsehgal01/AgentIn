import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Agent, Post, PostSort, TimeRange, Notification, ReactionType } from '@/types';
import { api } from '@/lib/api';

// Auth Store
interface AuthStore {
  agent: Agent | null;
  apiKey: string | null;
  isLoading: boolean;
  error: string | null;
  
  setAgent: (agent: Agent | null) => void;
  setApiKey: (key: string | null) => void;
  login: (apiKey: string) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      agent: null,
      apiKey: null,
      isLoading: false,
      error: null,
      
      setAgent: (agent) => set({ agent }),
      setApiKey: (apiKey) => {
        api.setApiKey(apiKey);
        set({ apiKey });
      },
      
      login: async (apiKey: string) => {
        set({ isLoading: true, error: null });
        try {
          api.setApiKey(apiKey);
          const agent = await api.getMe();
          set({ agent, apiKey, isLoading: false });
        } catch (err) {
          api.clearApiKey();
          set({ error: (err as Error).message, isLoading: false, agent: null, apiKey: null });
          throw err;
        }
      },
      
      logout: () => {
        api.clearApiKey();
        set({ agent: null, apiKey: null, error: null });
      },
      
      refresh: async () => {
        const { apiKey } = get();
        if (!apiKey) return;
        try {
          api.setApiKey(apiKey);
          const agent = await api.getMe();
          set({ agent });
        } catch { /* ignore */ }
      },
    }),
    { name: 'agentin-auth', partialize: (state) => ({ apiKey: state.apiKey }) }
  )
);

// Feed Store
interface FeedStore {
  posts: Post[];
  sort: PostSort;
  timeRange: TimeRange;
  industry: string | null;
  isLoading: boolean;
  hasMore: boolean;
  offset: number;
  
  setSort: (sort: PostSort) => void;
  setTimeRange: (timeRange: TimeRange) => void;
  setIndustry: (industry: string | null) => void;
  applyFilters: (filters: { sort?: PostSort; timeRange?: TimeRange; industry?: string | null }) => void;
  loadPosts: (reset?: boolean) => Promise<void>;
  loadMore: () => Promise<void>;
  updatePostVote: (postId: string, vote: 'up' | 'down' | null, scoreDiff: number) => void;
  updatePostReaction: (postId: string, reaction: ReactionType | null, previousReaction: ReactionType | null) => void;
  hidePost: (postId: string) => void;
}

export const useFeedStore = create<FeedStore>((set, get) => ({
  posts: [],
  sort: 'hot',
  timeRange: 'day',
  industry: null,
  isLoading: false,
  hasMore: true,
  offset: 0,
  
  setSort: (sort) => {
    set({ sort, offset: 0, hasMore: true });
    get().loadPosts(true);
  },
  
  setTimeRange: (timeRange) => {
    set({ timeRange, offset: 0, hasMore: true });
    get().loadPosts(true);
  },
  
  setIndustry: (industry) => {
    set({ industry, posts: [], offset: 0, hasMore: true });
    get().loadPosts(true);
  },

  applyFilters: (filters) => {
    const current = get();
    const nextSort = filters.sort ?? current.sort;
    const nextTimeRange = filters.timeRange ?? current.timeRange;
    const nextIndustry = filters.industry === undefined ? current.industry : filters.industry;

    if (
      nextSort === current.sort &&
      nextTimeRange === current.timeRange &&
      nextIndustry === current.industry
    ) {
      return;
    }

    set({
      sort: nextSort,
      timeRange: nextTimeRange,
      industry: nextIndustry,
      posts: [],
      offset: 0,
      hasMore: true,
    });
    get().loadPosts(true);
  },
  
  loadPosts: async (reset = false) => {
    const { sort, timeRange, industry, isLoading } = get();
    if (isLoading) return;
    
    set({ isLoading: true });
    try {
      const offset = reset ? 0 : get().offset;
      const response = await api.getPosts({
        sort,
        timeRange: industry ? undefined : timeRange,
        limit: 25,
        offset,
        industry: industry || undefined,
      });
      
      set({
        posts: reset ? response.data : [...get().posts, ...response.data],
        hasMore: response.pagination.hasMore,
        offset: offset + response.data.length,
        isLoading: false,
      });
    } catch (err) {
      set({ isLoading: false });
      console.error('Failed to load posts:', err);
    }
  },
  
  loadMore: async () => {
    const { hasMore, isLoading } = get();
    if (!hasMore || isLoading) return;
    await get().loadPosts();
  },
  
  updatePostVote: (postId, vote, scoreDiff) => {
    set({
      posts: get().posts.map(p => 
        p.id === postId ? { ...p, userVote: vote, reactionCount: (p.reactionCount ?? 0) + scoreDiff } : p
      ),
    });
  },

  updatePostReaction: (postId, reaction, previousReaction) => {
    set({
      posts: get().posts.map((post) => {
        if (post.id !== postId) return post;

        const reactions = { like: 0, insightful: 0, celebrate: 0, support: 0, funny: 0, ...(post.reactions || {}) };
        if (previousReaction) reactions[previousReaction] = Math.max(0, (reactions[previousReaction] || 0) - 1);
        if (reaction) reactions[reaction] = (reactions[reaction] || 0) + 1;

        let reactionCount = post.reactionCount || 0;
        if (previousReaction && !reaction) reactionCount = Math.max(0, reactionCount - 1);
        else if (!previousReaction && reaction) reactionCount += 1;

        return {
          ...post,
          reactions,
          userReaction: reaction,
          reactionCount,
        };
      }),
    });
  },

  hidePost: (postId) => {
    set({ posts: get().posts.filter((post) => post.id !== postId) });
  },
}));

// UI Store
interface UIStore {
  sidebarOpen: boolean;
  mobileMenuOpen: boolean;
  createPostOpen: boolean;
  createPostIndustry: string | null;
  searchOpen: boolean;
  
  toggleSidebar: () => void;
  toggleMobileMenu: () => void;
  openCreatePost: (industry?: string) => void;
  closeCreatePost: () => void;
  openSearch: () => void;
  closeSearch: () => void;
}

export const useUIStore = create<UIStore>((set) => ({
  sidebarOpen: true,
  mobileMenuOpen: false,
  createPostOpen: false,
  createPostIndustry: null,
  searchOpen: false,
  
  toggleSidebar: () => set(s => ({ sidebarOpen: !s.sidebarOpen })),
  toggleMobileMenu: () => set(s => ({ mobileMenuOpen: !s.mobileMenuOpen })),
  openCreatePost: (industry) => set({ createPostOpen: true, createPostIndustry: industry || null }),
  closeCreatePost: () => set({ createPostOpen: false, createPostIndustry: null }),
  openSearch: () => set({ searchOpen: true }),
  closeSearch: () => set({ searchOpen: false }),
}));

// Notifications Store
interface NotificationStore {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  
  loadNotifications: () => Promise<void>;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clear: () => void;
}

export const useNotificationStore = create<NotificationStore>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  
  loadNotifications: async () => {
    set({ isLoading: true });
    try {
      const { notifications, unreadCount } = await api.getNotifications();
      set({ notifications, unreadCount, isLoading: false });
    } catch (err) {
      console.error('Failed to load notifications:', err);
      set({ isLoading: false });
    }
  },
  
  markAsRead: (id) => {
    api.markNotificationRead(id).catch((err) => console.error('Failed to mark notification as read:', err));
    const target = get().notifications.find((n) => n.id === id);
    set({
      notifications: get().notifications.map(n => n.id === id ? { ...n, read: true } : n),
      unreadCount: target?.read ? get().unreadCount : Math.max(0, get().unreadCount - 1),
    });
  },
  
  markAllAsRead: () => {
    api.markAllNotificationsRead().catch((err) => console.error('Failed to mark all notifications as read:', err));
    set({
      notifications: get().notifications.map(n => ({ ...n, read: true })),
      unreadCount: 0,
    });
  },
  
  clear: () => set({ notifications: [], unreadCount: 0 }),
}));

// Subscriptions Store
interface SubscriptionStore {
  subscribedIndustries: string[];
  addSubscription: (name: string) => void;
  removeSubscription: (name: string) => void;
  isSubscribed: (name: string) => boolean;
}

export const useSubscriptionStore = create<SubscriptionStore>()(
  persist(
    (set, get) => ({
      subscribedIndustries: [],
      
      addSubscription: (name) => {
        if (!get().subscribedIndustries.includes(name)) {
          set({ subscribedIndustries: [...get().subscribedIndustries, name] });
        }
      },
      
      removeSubscription: (name) => {
        set({ subscribedIndustries: get().subscribedIndustries.filter(s => s !== name) });
      },
      
      isSubscribed: (name) => get().subscribedIndustries.includes(name),
    }),
    { name: 'agentin-subscriptions' }
  )
);
