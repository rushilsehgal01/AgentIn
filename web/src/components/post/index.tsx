'use client';

import * as React from 'react';
import Link from 'next/link';
import { cn, formatScore, formatRelativeTime, getInitials, getPostUrl, getIndustryUrl, getAgentUrl } from '@/lib/utils';
import { usePostVote, useAuth } from '@/hooks';
import { useUIStore } from '@/store';
import { Button, Avatar, AvatarImage, AvatarFallback, Card, Skeleton, Badge } from '@/components/ui';
import { MessageSquare, Share2, Bookmark, MoreHorizontal, Flag, Eye } from 'lucide-react';
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
  const [showMenu, setShowMenu] = React.useState(false);
  const [isReacting, setIsReacting] = React.useState(false);
  
  const handleReact = async (reaction: ReactionType) => {
    if (!isAuthenticated) return;
    setIsReacting(true);
    try {
      // TODO: Call API to add reaction
      await onReact?.(reaction);
    } catch (err) {
      console.error('Failed to add reaction:', err);
    } finally {
      setIsReacting(false);
    }
  };
  
  
  return (
    <Card className={cn('post-card group', isCompact ? 'p-3' : 'p-4')}>
      <div className="flex flex-col gap-3">
        {/* Agent Info & Badges */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <Link href={getAgentUrl(post.authorName)} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <Avatar className="h-8 w-8">
              <AvatarImage src={post.authorAvatarUrl} />
              <AvatarFallback className="text-xs">{getInitials(post.authorName)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="font-medium text-sm">{post.authorDisplayName || post.authorName}</div>
              <div className="text-xs text-muted-foreground">u/{post.authorName}</div>
            </div>
          </Link>
          
          <div className="flex items-center gap-2">
            {post.provider && (
              <Badge variant="secondary" className="text-xs">
                {PROVIDER_LABELS[post.provider] || post.provider}
              </Badge>
            )}
            {post.mood && /\p{Emoji}/u.test(post.mood) && <span className="text-lg">{post.mood}</span>}
            {post.employmentStatus && (
              <Badge variant="outline" className="text-xs" title={EMPLOYMENT_STATUS_BADGES[post.employmentStatus].label}>
                {EMPLOYMENT_STATUS_BADGES[post.employmentStatus].emoji}
              </Badge>
            )}
          </div>
        </div>
        
        {/* Post Content */}
        <div>
          {showIndustry && post.industry && (
            <Link href={getIndustryUrl(post.industry)} className="text-xs text-primary hover:underline mb-1 inline-block">
              m/{post.industry}
            </Link>
          )}

          <Link href={getPostUrl(post.id, post.industry)} className="block">
            <p className={cn('text-sm leading-relaxed', isCompact ? 'line-clamp-2' : 'line-clamp-4')}>
              {post.content ?? ''}
            </p>
          </Link>

          {/* Meta */}
          <div className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
            <span title={post.createdAt}>{formatRelativeTime(post.createdAt)}</span>
            {post.editedAt && <span>(edited)</span>}
          </div>
        </div>
        
        {/* Reactions + Actions */}
        <div className="space-y-2 pt-2 border-t">
          {/* Score & Reactions */}
          <div className="flex items-center justify-between">
            <span className={cn('text-sm font-medium', (post.reactionCount ?? 0) > 0 && 'text-reputation-positive')}>
              {formatScore(post.reactionCount ?? 0)} reactions
            </span>
          </div>
          
          {/* Reaction Bar */}
          <ReactionBar
            reactions={post.reactions}
            userReaction={post.userReaction}
            onReact={handleReact}
            isLoading={isReacting}
            disabled={!isAuthenticated}
          />
          
          {/* Standard Actions */}
          <div className="flex items-center gap-1 mt-2">
            <Link href={getPostUrl(post.id, post.industry)} className="flex items-center gap-1.5 px-2 py-1 text-sm text-muted-foreground hover:bg-muted rounded transition-colors">
              <MessageSquare className="h-4 w-4" />
              <span className="hidden sm:inline">Comment</span>
            </Link>
            
            <button type="button" className="flex items-center justify-center gap-1.5 rounded-md px-2 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted" aria-label="Share post">
              <Share2 className="h-4 w-4" />
              <span className="hidden sm:inline">Share</span>
            </button>

            {isAuthenticated ? (
              <button type="button" className={cn('flex items-center justify-center gap-1.5 rounded-md px-2 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted', post.isSaved && 'text-primary')} aria-label={post.isSaved ? 'Unsave post' : 'Save post'}>
                <Bookmark className={cn('h-4 w-4', post.isSaved && 'fill-current')} />
                <span className="hidden sm:inline">{post.isSaved ? 'Saved' : 'Save'}</span>
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
          onClick={openCreatePost}
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
