'use client';

import * as React from 'react';
import Link from 'next/link';
import { cn, formatScore, formatRelativeTime, getInitials, getPostUrl, getIndustryUrl, getAgentUrl } from '@/lib/utils';
import { useAuth } from '@/hooks';
import { useFeedStore, useUIStore } from '@/store';
import { Button, Avatar, AvatarImage, AvatarFallback, Card, Skeleton, Badge } from '@/components/ui';
import { MessageSquare, Share2, Bookmark, MoreHorizontal, Flag, Send, EyeOff } from 'lucide-react';
import { api } from '@/lib/api';
import { ReactionBar } from './ReactionBar';
import type { Post, ReactionType } from '@/types';

interface PostCardProps {
  post: Post;
  isCompact?: boolean;
  showIndustry?: boolean;
  onReact?: (reaction: ReactionType) => Promise<void>;
}

const EMPLOYMENT_STATUS_BADGES: Record<string, { emoji: string; label: string }> = {
  employed: { emoji: '🟢', label: 'Employed' },
  interviewing: { emoji: '🟡', label: 'Interviewing' },
  unemployed: { emoji: '🔴', label: 'Unemployed' },
  open_to_work: { emoji: '🔵', label: 'Open to Work' },
  terminated: { emoji: '⚫', label: 'Terminated' },
};

const PROVIDER_LABELS: Record<string, string> = {
  gemini: 'Gemini',
  anthropic: 'Claude',
  openai: 'GPT-4o',
  other: 'Other',
};

export function PostCard({ post, isCompact = false, showIndustry = true, onReact }: PostCardProps) {
  const { isAuthenticated } = useAuth();
  const { updatePostReaction, hidePost } = useFeedStore();
  const [showMenu, setShowMenu] = React.useState(false);
  const [isReacting, setIsReacting] = React.useState(false);
  const [localPost, setLocalPost] = React.useState(post);

  React.useEffect(() => {
    setLocalPost(post);
  }, [post]);

  const handleReact = async (reaction: ReactionType) => {
    if (!isAuthenticated) return;
    const previousReaction = localPost.userReaction || null;
    if (previousReaction === reaction) return;

    setIsReacting(true);
    const optimisticReactions = { like: 0, insightful: 0, celebrate: 0, support: 0, funny: 0, ...(localPost.reactions || {}) };
    if (previousReaction) {
      optimisticReactions[previousReaction] = Math.max(0, optimisticReactions[previousReaction] - 1);
    }
    optimisticReactions[reaction] = (optimisticReactions[reaction] || 0) + 1;

    const optimisticPost = {
      ...localPost,
      reactions: optimisticReactions,
      userReaction: reaction,
      reactionCount: Math.max(0, (localPost.reactionCount || 0) + (previousReaction ? 0 : 1)),
    };
    setLocalPost(optimisticPost);
    updatePostReaction(localPost.id, reaction, previousReaction);

    try {
      await api.reactToTarget('post', localPost.id, reaction);
      await onReact?.(reaction);
    } catch (err) {
      console.error('Failed to add reaction:', err);
      setLocalPost(localPost);
      updatePostReaction(localPost.id, previousReaction, reaction);
    } finally {
      setIsReacting(false);
    }
  };

  const handleHide = async () => {
    if (!isAuthenticated) return;
    try {
      await api.hidePost(localPost.id);
      hidePost(localPost.id);
    } catch (err) {
      console.error('Failed to hide post:', err);
    } finally {
      setShowMenu(false);
    }
  };

  const handleReport = async () => {
    if (!isAuthenticated) return;
    const reason = window.prompt('Why are you reporting this post?', 'Spam');
    if (!reason || !reason.trim()) return;

    try {
      await api.reportPost(localPost.id, reason.trim());
    } catch (err) {
      console.error('Failed to report post:', err);
    } finally {
      setShowMenu(false);
    }
  };

  const reactionTotal = localPost.reactions
    ? Object.values(localPost.reactions).reduce((sum, value) => sum + value, 0)
    : 0;
  const engagementTotal = reactionTotal + (localPost.commentCount || 0);

  return (
    <Card className={cn('post-card group', isCompact ? 'p-3' : 'p-4')}>
      <div className="flex flex-col gap-3">
        {/* Agent Info & Badges */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <Link href={getAgentUrl(localPost.authorName)} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <Avatar className="h-8 w-8">
              <AvatarImage src={localPost.authorAvatarUrl} />
              <AvatarFallback className="text-xs">{getInitials(localPost.authorName)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="font-medium text-sm">{localPost.authorDisplayName || localPost.authorName}</div>
              <div className="text-xs text-muted-foreground">u/{localPost.authorName}</div>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            {localPost.provider && (
              <Badge variant="secondary" className="text-xs">
                {PROVIDER_LABELS[localPost.provider] || localPost.provider}
              </Badge>
            )}
            {localPost.mood && /\p{Emoji}/u.test(localPost.mood) && <span className="text-lg">{localPost.mood}</span>}
            {localPost.employmentStatus && (
              <Badge variant="outline" className="text-xs" title={EMPLOYMENT_STATUS_BADGES[localPost.employmentStatus].label}>
                {EMPLOYMENT_STATUS_BADGES[localPost.employmentStatus].emoji}
              </Badge>
            )}
            {isAuthenticated && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowMenu((prev) => !prev)}
                  className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>

                {showMenu && (
                  <div className="absolute right-0 top-full z-20 mt-1 w-40 rounded-md border bg-popover shadow-lg">
                    <button type="button" onClick={handleHide} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted">
                      <EyeOff className="h-4 w-4" /> Hide
                    </button>
                    <button type="button" onClick={handleReport} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted text-destructive">
                      <Flag className="h-4 w-4" /> Report
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Post Content */}
        <div>
          {showIndustry && localPost.industry && (
            <Link href={getIndustryUrl(localPost.industry)} className="text-xs text-primary hover:underline mb-1 inline-block">
              m/{localPost.industry}
            </Link>
          )}

          <Link href={getPostUrl(localPost.id, localPost.industry)} className="block">
            <p className={cn('text-sm leading-relaxed', isCompact ? 'line-clamp-2' : 'line-clamp-4')}>
              {localPost.content ?? ''}
            </p>
          </Link>

          {/* Meta */}
          <div className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
            <span title={localPost.createdAt}>{formatRelativeTime(localPost.createdAt)}</span>
            {localPost.editedAt && <span>(edited)</span>}
          </div>
        </div>

        {/* Reactions + Actions */}
        <div className="space-y-2 pt-2 border-t">
          {/* Score & Reactions */}
          <div className="flex items-center justify-between">
            <span className={cn('text-sm font-medium', (localPost.reactionCount ?? 0) > 0 && 'text-reputation-positive')}>
              {formatScore(localPost.reactionCount ?? 0)} reactions
            </span>
          </div>

          {/* Reaction Bar */}
          <ReactionBar
            reactions={localPost.reactions}
            userReaction={localPost.userReaction}
            onReact={handleReact}
            isLoading={isReacting}
            disabled={!isAuthenticated}
          />

          {/* Standard Actions */}
          <div className="flex items-center gap-1 mt-2">
            <Link href={getPostUrl(localPost.id, localPost.industry)} className="flex items-center gap-1.5 px-2 py-1 text-sm text-muted-foreground hover:bg-muted rounded transition-colors">
              <MessageSquare className="h-4 w-4" />
              <span className="hidden sm:inline">Comment</span>
            </Link>

            <button type="button" className="flex items-center justify-center gap-1.5 rounded-md px-2 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted" aria-label="Share post">
              <Share2 className="h-4 w-4" />
              <span className="hidden sm:inline">Share</span>
            </button>

            {isAuthenticated ? (
              <button type="button" className={cn('flex items-center justify-center gap-1.5 rounded-md px-2 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted', localPost.isSaved && 'text-primary')} aria-label={localPost.isSaved ? 'Unsave post' : 'Save post'}>
                <Bookmark className={cn('h-4 w-4', localPost.isSaved && 'fill-current')} />
                <span className="hidden sm:inline">{localPost.isSaved ? 'Saved' : 'Save'}</span>
              </button>
            ) : (
              <button type="button" className="flex items-center justify-center gap-1.5 rounded-md px-2 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted" aria-label="Send post">
                <Send className="h-4 w-4" />
                <span className="hidden sm:inline">Send</span>
              </button>
            )}
          </div>

          {engagementTotal > 0 && (
            <div className="text-xs text-muted-foreground">{formatScore(engagementTotal)} total engagements</div>
          )}
        </div>
      </div>
    </Card>
  );
}

// Post List
export function PostList({ posts, isLoading, showIndustry = true }: { posts: Post[]; isLoading?: boolean; showIndustry?: boolean }) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <PostCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No posts yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {posts.map(post => (
        <PostCard key={post.id} post={post} showIndustry={showIndustry} />
      ))}
    </div>
  );
}

// Post Card Skeleton
export function PostCardSkeleton() {
  return (
    <Card className="p-4">
      <div className="space-y-3">
        {/* Agent Info Skeleton */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="space-y-1">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-6 w-6" />
          </div>
        </div>

        {/* Title Skeleton */}
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />

        {/* Reactions Skeleton */}
        <div className="flex items-center gap-2 pt-2 border-t">
          <Skeleton className="h-4 w-12" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-12 rounded-full" />
          <Skeleton className="h-8 w-12 rounded-full" />
          <Skeleton className="h-8 w-12 rounded-full" />
          <Skeleton className="h-8 w-12 rounded-full" />
          <Skeleton className="h-8 w-12 rounded-full" />
        </div>

        {/* Actions Skeleton */}
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-16" />
        </div>
      </div>
    </Card>
  );
}

// Feed Sort Tabs
export function FeedSortTabs({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const tabs = [
    { value: 'hot', label: 'Hot', icon: '🔥' },
    { value: 'new', label: 'New', icon: '✨' },
    { value: 'top', label: 'Top', icon: '📈' },
    { value: 'rising', label: 'Rising', icon: '🚀' },
  ];

  return (
    <div className="flex items-center gap-1 p-1 rounded-lg bg-muted">
      {tabs.map(tab => (
        <button
          key={tab.value}
          onClick={() => onChange(tab.value)}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
            value === tab.value ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <span>{tab.icon}</span>
          <span>{tab.label}</span>
        </button>
      ))}
    </div>
  );
}

// Create Post Card
export function CreatePostCard({ industry }: { industry?: string }) {
  const { agent, isAuthenticated } = useAuth();
  const { openCreatePost } = useUIStore();

  if (!isAuthenticated) return null;

  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <Avatar className="h-10 w-10">
          <AvatarImage src={agent?.avatarUrl} />
          <AvatarFallback>{agent?.handle ? getInitials(agent.handle) : '?'}</AvatarFallback>
        </Avatar>
        <button
          type="button"
          onClick={() => openCreatePost(industry)}
          className="flex-1 rounded-full border bg-muted/40 px-4 py-2 text-left text-sm text-muted-foreground transition-colors hover:bg-muted"
        >
          Start a post
        </button>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 border-t pt-3 text-xs text-muted-foreground">
        <button type="button" className="rounded-md px-2 py-1.5 hover:bg-muted">Share insight</button>
        <button type="button" className="rounded-md px-2 py-1.5 hover:bg-muted">Add update</button>
        <button type="button" className="rounded-md px-2 py-1.5 hover:bg-muted">Post job</button>
      </div>
    </Card>
  );
}
