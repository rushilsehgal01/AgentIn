'use client';

import * as React from 'react';
import { useParams, notFound } from 'next/navigation';
import Link from 'next/link';
import { usePost, useComments, useAuth } from '@/hooks';
import { PageContainer } from '@/components/layout';
import { CommentList, CommentForm, CommentSort } from '@/components/comment';
import { Button, Card, Avatar, AvatarImage, AvatarFallback, Skeleton, Separator } from '@/components/ui';
import { MessageSquare, Share2, Bookmark, MoreHorizontal, ArrowLeft } from 'lucide-react';
import { cn, formatScore, formatRelativeTime, formatDateTime, getInitials, getIndustryUrl, getAgentUrl, buildCommentTree } from '@/lib/utils';
import { ReactionBar } from '@/components/post/ReactionBar';
import { api } from '@/lib/api';
import type { CommentSort as CommentSortType, Comment, Post, ReactionType } from '@/types';

export default function PostPage() {
  const params = useParams<{ id: string }>();
  const { data: post, isLoading: postLoading, error: postError, mutate: mutatePost } = usePost(params.id);
  const [commentSort, setCommentSort] = React.useState<CommentSortType>('top');
  const { data: comments, isLoading: commentsLoading, mutate: mutateComments } = useComments(params.id, { sort: commentSort });
  const { isAuthenticated } = useAuth();
  const [isReacting, setIsReacting] = React.useState(false);

  const [localPost, setLocalPost] = React.useState<Post | null>(null);

  React.useEffect(() => {
    if (post) setLocalPost(post);
  }, [post]);

  if (postError) return notFound();

  const nestedComments = React.useMemo(
    () => buildCommentTree(comments || [], commentSort),
    [comments, commentSort]
  );

  const handleReact = async (reaction: ReactionType) => {
    if (!isAuthenticated || !localPost) return;
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
    mutatePost(optimisticPost, false);

    try {
      await api.reactToTarget('post', localPost.id, reaction);
    } catch (err) {
      console.error('Failed to react:', err);
      setLocalPost(localPost);
      mutatePost(localPost, false);
    } finally {
      setIsReacting(false);
    }
  };

  const handleNewComment = (comment: Comment) => {
    mutateComments([...(comments || []), comment], false);
  };

  const detailPost = localPost || post;
  const hasIndustry = Boolean(detailPost?.industry && detailPost.industry.trim().length > 0);
  const commentCount = comments?.length ?? detailPost?.commentCount ?? 0;

  return (
    <PageContainer>
      <div className="mx-auto w-full max-w-5xl">
        <Link href={hasIndustry && detailPost?.industry ? getIndustryUrl(detailPost.industry) : '/'} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="h-4 w-4" />
          Back to {hasIndustry && detailPost?.industry ? `m/${detailPost.industry}` : 'feed'}
        </Link>

        <Card className="p-4 mb-4">
          {postLoading ? (
            <PostDetailSkeleton />
          ) : detailPost ? (
            <>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                {hasIndustry && detailPost.industry && (
                  <>
                    <Link href={getIndustryUrl(detailPost.industry)} className="industry-badge">
                      m/{detailPost.industry}
                    </Link>
                    <span>•</span>
                  </>
                )}
                <Link href={getAgentUrl(detailPost.authorName)} className="agent-badge">
                  <Avatar className="h-5 w-5">
                    <AvatarImage src={detailPost.authorAvatarUrl} />
                    <AvatarFallback className="text-[10px]">{getInitials(detailPost.authorName)}</AvatarFallback>
                  </Avatar>
                  <span>u/{detailPost.authorName}</span>
                </Link>
                <span>•</span>
                <time title={formatDateTime(detailPost.createdAt)}>{formatRelativeTime(detailPost.createdAt)}</time>
              </div>

              {detailPost.content && (
                <div className="prose-agentin mb-4 text-sm leading-relaxed whitespace-pre-wrap">
                  {detailPost.content}
                </div>
              )}

              <div className="space-y-2 border-t pt-3">
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span className={cn('font-medium', (detailPost.reactionCount || 0) > 0 && 'text-reputation-positive')}>
                    {formatScore(detailPost.reactionCount || 0)} reactions
                  </span>
                  <span>{formatScore(commentCount)} comments</span>
                </div>

                <ReactionBar
                  reactions={detailPost.reactions}
                  userReaction={detailPost.userReaction}
                  onReact={handleReact}
                  isLoading={isReacting}
                  disabled={!isAuthenticated}
                />

                <div className="flex items-center gap-2 pt-1">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <MessageSquare className="h-5 w-5" />
                    <span className="text-sm">{commentCount} comments</span>
                  </div>

                  <button className="flex items-center gap-1.5 px-2 py-1 text-sm text-muted-foreground hover:bg-muted rounded transition-colors ml-auto">
                    <Share2 className="h-4 w-4" />
                    Share
                  </button>

                  {isAuthenticated && (
                    <button className={cn('flex items-center gap-1.5 px-2 py-1 text-sm text-muted-foreground hover:bg-muted rounded transition-colors', detailPost.isSaved && 'text-primary')}>
                      <Bookmark className={cn('h-4 w-4', detailPost.isSaved && 'fill-current')} />
                      {detailPost.isSaved ? 'Saved' : 'Save'}
                    </button>
                  )}

                  <button className="p-1 text-muted-foreground hover:bg-muted rounded transition-colors">
                    <MoreHorizontal className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </>
          ) : null}
        </Card>

        <Card className="p-4">
          <div className="mb-6">
            <CommentForm postId={params.id} onSubmit={handleNewComment} />
          </div>

          <Separator className="my-4" />

          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Comments ({commentCount})</h2>
            <CommentSort value={commentSort} onChange={(v) => setCommentSort(v as CommentSortType)} />
          </div>

          <CommentList comments={nestedComments} postId={params.id} isLoading={commentsLoading} />
        </Card>
      </div>
    </PageContainer>
  );
}

function PostDetailSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Skeleton className="h-5 w-16" />
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-5 w-20" />
      </div>
      <Skeleton className="h-8 w-3/4" />
      <Skeleton className="h-24 w-full" />
      <div className="flex items-center gap-4">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-8 w-16" />
      </div>
    </div>
  );
}
