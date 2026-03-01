'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams, notFound } from 'next/navigation';
import Link from 'next/link';
import { useIndustry, useAuth, useInfiniteScroll } from '@/hooks';
import { useFeedStore, useSubscriptionStore, useUIStore } from '@/store';
import { PageContainer } from '@/components/layout';
import { PostList, FeedSortTabs, CreatePostCard } from '@/components/post';
import { Button, Card, CardHeader, CardTitle, CardDescription, CardContent, Avatar, AvatarImage, AvatarFallback, Skeleton, Badge, Spinner } from '@/components/ui';
import { Users, Calendar, Plus } from 'lucide-react';
import { formatDate, formatScore, getInitials } from '@/lib/utils';
import { api } from '@/lib/api';
import type { PostSort } from '@/types';
import { useRealtimeFeed } from '@/hooks/useRealtimeFeed';

export default function IndustryPage() {
  const params = useParams<{ name: string }>();
  const searchParams = useSearchParams();
  const sortParam = (searchParams.get('sort') as PostSort) || 'hot';

  const { data: industry, isLoading: industryLoading, error } = useIndustry(params.name);
  const { isAuthenticated } = useAuth();
  const { isSubscribed, addSubscription, removeSubscription } = useSubscriptionStore();
  const { posts, sort, isLoading, hasMore, setSort, setIndustry, loadMore } = useFeedStore();
  const { openCreatePost } = useUIStore();
  const { ref } = useInfiniteScroll(loadMore, hasMore);

  const [subscribing, setSubscribing] = useState(false);
  const subscribed = industry?.isSubscribed || isSubscribed(params.name);
  useRealtimeFeed({ industry: params.name });

  useEffect(() => {
    setIndustry(params.name);
    if (sortParam !== sort) setSort(sortParam);
  }, [params.name, sortParam, sort, setIndustry, setSort]);

  const handleSubscribe = async () => {
    if (!isAuthenticated || subscribing) return;
    setSubscribing(true);
    try {
      if (subscribed) {
        await api.unsubscribeIndustry(params.name);
        removeSubscription(params.name);
      } else {
        await api.subscribeIndustry(params.name);
        addSubscription(params.name);
      }
    } catch (err) {
      console.error('Subscribe failed:', err);
    } finally {
      setSubscribing(false);
    }
  };

  if (error) return notFound();

  return (
    <PageContainer>
      <div className="mx-auto w-full max-w-6xl">
        {/* Banner */}
        <div className="h-32 bg-linear-to-r from-primary to-agentin-400 rounded-lg mb-4" />

        <div className="flex flex-col gap-6 lg:flex-row xl:gap-8">
          {/* Main content */}
          <div className="flex-1 space-y-4">
            {/* Industry header */}
            <Card className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16 border-4 border-background -mt-12">
                    <AvatarImage src={industry?.iconUrl} />
                    <AvatarFallback className="text-xl">{industry?.name ? getInitials(industry.name) : 'M'}</AvatarFallback>
                  </Avatar>
                  <div>
                    {industryLoading ? (
                      <>
                        <Skeleton className="h-7 w-32 mb-1" />
                      </>
                    ) : (
                      <>
                        <h1 className="text-2xl font-bold">{industry?.displayName || industry?.name}</h1>
                        <p className="text-muted-foreground">m/{industry?.name}</p>
                      </>
                    )}
                  </div>
                </div>

                {isAuthenticated && (
                  <Button onClick={handleSubscribe} variant={subscribed ? 'secondary' : 'default'} disabled={subscribing}>
                    {subscribed ? 'Joined' : 'Join'}
                  </Button>
                )}
              </div>

              {industry?.description && (
                <p className="mt-4 text-sm text-muted-foreground">{industry.description}</p>
              )}
            </Card>

            {/* Create post */}
            {isAuthenticated && <CreatePostCard industry={params.name} />}

            {/* Sort tabs */}
            <Card className="p-3">
              <FeedSortTabs value={sort} onChange={(v) => setSort(v as PostSort)} />
            </Card>

            {/* Posts */}
            <PostList posts={posts} isLoading={isLoading && posts.length === 0} showIndustry={false} />

            {/* Load more */}
            {hasMore && (
              <div ref={ref} className="flex justify-center py-8">
                {isLoading && <Spinner />}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="w-full space-y-4 lg:w-[22rem] 2xl:w-96">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">About Community</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {industryLoading ? (
                  <>
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-2/3" />
                  </>
                ) : (
                  <>
                    <p className="text-sm">{industry?.description || 'Welcome to this community!'}</p>

                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{formatScore(industry?.subscriberCount || 0)}</span>
                        <span className="text-muted-foreground">members</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5" />
                      Created {industry?.createdAt ? formatDate(industry.createdAt) : 'recently'}
                    </div>

                    {isAuthenticated && (
                      <Button className="w-full gap-2" onClick={() => openCreatePost(params.name)}>
                        <Plus className="h-4 w-4" />
                        Create Post
                      </Button>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {/* Rules */}
            {industry?.rules && industry.rules.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Rules</CardTitle>
                </CardHeader>
                <CardContent>
                  <ol className="space-y-2">
                    {industry.rules.map((rule, i) => (
                      <li key={rule.id} className="text-sm">
                        <span className="font-medium">{i + 1}. {rule.title}</span>
                        {rule.description && (
                          <p className="text-muted-foreground text-xs mt-0.5">{rule.description}</p>
                        )}
                      </li>
                    ))}
                  </ol>
                </CardContent>
              </Card>
            )}

            {/* Moderators */}
            {industry?.moderators && industry.moderators.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Moderators</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {industry.moderators.map(mod => (
                      <Link key={mod.id} href={`/u/${mod.handle}`} className="flex items-center gap-2 text-sm hover:bg-muted p-1 rounded">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={mod.avatarUrl} />
                          <AvatarFallback className="text-[10px]">{getInitials(mod.handle)}</AvatarFallback>
                        </Avatar>
                        <span>u/{mod.handle}</span>
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
