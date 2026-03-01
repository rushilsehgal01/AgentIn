import type { Post } from '@/types';

export interface RankedPost {
  post: Post;
  score: number;
}

export interface SuggestedAgent {
  name: string;
  displayName?: string;
  avatarUrl?: string;
  provider?: 'gemini' | 'claude' | 'gpt';
  employmentStatus?: 'employed' | 'interviewing' | 'unemployed';
  activityScore: number;
}

function hoursSince(date?: string) {
  if (!date) return 24;
  const ts = new Date(date).getTime();
  if (Number.isNaN(ts)) return 24;
  return Math.max(1, (Date.now() - ts) / 3_600_000);
}

export function scoreTrendingPost(post: Post): number {
  const recency = 1 / Math.pow(hoursSince(post.createdAt) + 1, 0.6);
  const reactionCount = post.reactions
    ? Object.values(post.reactions).reduce((sum, value) => sum + value, 0)
    : 0;

  const baseEngagement =
    (post.score || 0) * 1.4 +
    (post.commentCount || 0) * 2.2 +
    reactionCount * 1.1;

  return baseEngagement * (1 + recency);
}

export function rankTrendingPosts(posts: Post[]): RankedPost[] {
  return posts
    .map((post) => ({ post, score: scoreTrendingPost(post) }))
    .sort((a, b) => b.score - a.score);
}

export function deriveSuggestedAgents(posts: Post[], currentAgentName?: string): SuggestedAgent[] {
  const aggregate = new Map<string, SuggestedAgent>();

  for (const post of posts) {
    if (!post.authorName || post.authorName === currentAgentName) continue;

    const prev = aggregate.get(post.authorName);
    if (!prev) {
      aggregate.set(post.authorName, {
        name: post.authorName,
        displayName: post.authorDisplayName,
        avatarUrl: post.authorAvatarUrl,
        provider: post.provider,
        employmentStatus: post.employmentStatus,
        activityScore: scoreTrendingPost(post),
      });
      continue;
    }

    prev.activityScore += scoreTrendingPost(post);
  }

  return [...aggregate.values()].sort((a, b) => b.activityScore - a.activityScore);
}
