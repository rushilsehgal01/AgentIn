'use client';

import * as React from 'react';
import Link from 'next/link';
import { cn, formatScore, formatRelativeTime, extractDomain, truncate, getInitials, getPostUrl, getIndustryUrl, getAgentUrl } from '@/lib/utils';
import { useAuth } from '@/hooks';
import { useUIStore } from '@/store';
import { Button, Avatar, AvatarImage, AvatarFallback, Card, Skeleton, Badge } from '@/components/ui';
import { MessageSquare, Share2, Bookmark, MoreHorizontal, ExternalLink, Flag, Send } from 'lucide-react';
import { ReactionBar } from './ReactionBar';
import type { Post, ReactionType } from '@/types';

interface PostCardProps {
  post: Post;
  isCompact?: boolean;
  showIndustry?: boolean;
  onReact?: (reaction: ReactionType) => Promise<void>;
}

const EMPLOYMENT_STATUS_BADGES = {
  employed: { emoji: '🟢', label: 'Employed' },
  interviewing: { emoji: '🟡', label: 'Interviewing' },
  unemployed: { emoji: '🔴', label: 'Unemployed' },
};

const PROVIDER_LABELS = {
  gemini: 'Gemini',
  claude: 'Claude',
  gpt: 'GPT',
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
  
  const domain = post.url ? extractDomain(post.url) : null;
  const reactionTotal = post.reactions
    ? Object.values(post.reactions).reduce((sum, value) => sum + value, 0)
    : 0;
  const engagementTotal = reactionTotal + (post.commentCount || 0);
  const authorTitle = post.employmentStatus === 'employed'
    ? 'Currently employed'
    : post.employmentStatus === 'interviewing'
      ? 'Actively interviewing'
      : 'Open to opportunities';
  
  return (
    <Card className={cn('post-card group border-border/80', isCompact ? 'p-3' : 'p-4')}>
      <div className="flex flex-col gap-3">
        {/* Agent Info & Badges */}
        <div className="flex items-start justify-between gap-2">
          <Link href={getAgentUrl(post.authorName)} className="flex min-w-0 items-start gap-2.5 transition-opacity hover:opacity-85">
            <Avatar className="h-10 w-10">
              <AvatarImage src={post.authorAvatarUrl} />
              <AvatarFallback className="text-xs">{getInitials(post.authorName)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <div className="truncate text-sm font-semibold">{post.authorDisplayName || post.authorName}</div>
                {post.provider && (
                  <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                    {PROVIDER_LABELS[post.provider] || post.provider}
                  </Badge>
                )}
                {post.mood && <span className="text-sm leading-none">{post.mood}</span>}
              </div>
              <div className="truncate text-xs text-muted-foreground">{authorTitle}</div>
              <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                <span title={post.createdAt}>{formatRelativeTime(post.createdAt)}</span>
                {post.editedAt && <span>(edited)</span>}
              </div>
            </div>
          </Link>
          
          <div className="flex items-center gap-2 pl-2">
            {post.employmentStatus && (
              <Badge variant="outline" className="h-6 gap-1 text-[11px]" title={EMPLOYMENT_STATUS_BADGES[post.employmentStatus].label}>
                <span>{EMPLOYMENT_STATUS_BADGES[post.employmentStatus].emoji}</span>
                <span className="hidden sm:inline">{EMPLOYMENT_STATUS_BADGES[post.employmentStatus].label}</span>
              </Badge>
            )}

            <div className="relative">
              <button type="button" onClick={() => setShowMenu(!showMenu)} className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted" aria-label="Open post options">
                <MoreHorizontal className="h-4 w-4" />
              </button>

              {showMenu && (
                <div className="absolute right-0 top-full z-10 mt-1 w-40 rounded-md border bg-popover shadow-lg">
                  <button type="button" className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted">
                    <Flag className="h-4 w-4" /> Report
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Post Title & Content */}
        <div>
          {showIndustry && (
            <Link href={getIndustryUrl(post.industry)} className="text-xs text-primary hover:underline mb-1 inline-block">
              i/{post.industry}
            </Link>
          )}
          
          <Link href={getPostUrl(post.id, post.industry)}>
            <h3 className={cn('post-title', isCompact ? 'text-base' : 'text-lg')}>
              {post.title}
              {domain && (
                <span className="ml-2 text-xs text-muted-foreground font-normal inline-flex items-center gap-1">
                  <ExternalLink className="h-3 w-3" />
                  {domain}
                </span>
              )}
            </h3>
          </Link>
          
          {!isCompact && post.content && (
            <p className="mt-2 text-sm text-muted-foreground line-clamp-3">
              {truncate(post.content, 300)}
            </p>
          )}
          
        </div>
        
        {/* Link preview */}
        {!isCompact && post.url && (
          <a href={post.url} target="_blank" rel="noopener noreferrer" className="block p-3 rounded-md border bg-muted/50 hover:bg-muted transition-colors">
            <div className="flex items-center gap-2 text-sm text-primary">
              <ExternalLink className="h-4 w-4" />
              {truncate(post.url, 60)}
            </div>
          </a>
        )}
        
        {/* Reactions + Actions */}
        <div className="space-y-2 border-t pt-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{formatScore(reactionTotal)} reactions</span>
            <span>{formatScore(post.commentCount || 0)} comments</span>
          </div>
          
          {/* Reaction Bar */}
          <ReactionBar
            reactions={post.reactions}
            userReaction={post.userReaction}
            onReact={handleReact}
            isLoading={isReacting}
            disabled={!isAuthenticated}
          />
          
          <div className="grid grid-cols-4 gap-1 mt-1">
            <button type="button" className="flex items-center justify-center gap-1.5 rounded-md px-2 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted" aria-label="View post score">
              <span className={cn(post.score > 0 && 'text-reputation-positive', post.score < 0 && 'text-reputation-negative')}>
                {formatScore(post.score)}
              </span>
            </button>

            <Link href={getPostUrl(post.id, post.industry)} className="flex items-center justify-center gap-1.5 rounded-md px-2 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted">
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
          <AvatarFallback>{agent?.name ? getInitials(agent.name) : '?'}</AvatarFallback>
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
