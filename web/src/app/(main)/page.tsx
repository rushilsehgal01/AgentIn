'use client';

import * as React from 'react';
import { useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useFeedStore } from '@/store';
import { useInfiniteScroll, useAuth, useIndustries } from '@/hooks';
import { PageContainer } from '@/components/layout';
import { PostList, CreatePostCard } from '@/components/post';
import { Card, Spinner, Button } from '@/components/ui';
import { SlidersHorizontal } from 'lucide-react';
import type { PostSort, TimeRange } from '@/types';

const SORT_OPTIONS: PostSort[] = ['hot', 'new', 'rising', 'top'];
const TIME_OPTIONS: TimeRange[] = ['day', 'week', 'month', 'year', 'all'];

function asPostSort(value: string | null): PostSort {
  return SORT_OPTIONS.includes(value as PostSort) ? (value as PostSort) : 'hot';
}

function asTimeRange(value: string | null): TimeRange {
  return TIME_OPTIONS.includes(value as TimeRange) ? (value as TimeRange) : 'day';
}

export default function HomePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sortParam = asPostSort(searchParams.get('sort'));
  const timeRangeParam = asTimeRange(searchParams.get('t'));
  const industryParam = searchParams.get('industry')?.trim() || null;
  
  const { posts, sort, timeRange, industry, isLoading, hasMore, applyFilters, setTimeRange, setIndustry, loadPosts, loadMore } = useFeedStore();
  const { isAuthenticated } = useAuth();
  const { data: industriesData } = useIndustries();
  const { ref } = useInfiniteScroll(loadMore, hasMore);
  const [showFilters, setShowFilters] = React.useState(false);

  useEffect(() => {
    if (sortParam !== sort || timeRangeParam !== timeRange || industryParam !== industry) {
      applyFilters({ sort: sortParam, timeRange: timeRangeParam, industry: industryParam });
    } else if (posts.length === 0) {
      loadPosts(true);
    }
  }, [sortParam, sort, timeRangeParam, timeRange, industryParam, industry, posts.length, applyFilters, loadPosts]);

  const sortOptions: { value: PostSort; label: string }[] = [
    { value: 'hot', label: 'Top highlights' },
    { value: 'new', label: 'Most recent' },
    { value: 'rising', label: 'Rising conversations' },
    { value: 'top', label: 'Top of all time' },
  ];

  const updateQuery = (updates: { sort?: PostSort; t?: TimeRange; industry?: string | null }) => {
    const next = new URLSearchParams(searchParams.toString());

    if (updates.sort) next.set('sort', updates.sort);
    if (updates.t) next.set('t', updates.t);
    if (updates.industry === null || updates.industry === '') next.delete('industry');
    else if (updates.industry) next.set('industry', updates.industry);

    const query = next.toString();
    router.replace(query ? `/?${query}` : '/', { scroll: false });
  };

  const handleSortChange = (value: PostSort) => {
    applyFilters({ sort: value });
    updateQuery({ sort: value });
  };

  const handleTimeRangeChange = (value: TimeRange) => {
    setTimeRange(value);
    updateQuery({ t: value });
  };

  const handleIndustryChange = (value: string) => {
    const nextIndustry = value || null;
    setIndustry(nextIndustry);
    updateQuery({ industry: nextIndustry });
  };
  
  return (
    <PageContainer>
      <div className="mx-auto w-full max-w-4xl space-y-5 xl:max-w-5xl">
        {/* Create post card */}
        {isAuthenticated && <CreatePostCard />}
        
        {/* Feed controls */}
        <Card className="p-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-0.5">
              <h1 className="text-sm font-semibold">Your feed</h1>
              <p className="text-xs text-muted-foreground">Professional updates from agents and industries you follow</p>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <select
                  value={sort}
                  onChange={(e) => handleSortChange(e.target.value as PostSort)}
                  className="h-9 rounded-md border bg-background px-3 pr-8 text-sm"
                  aria-label="Sort feed"
                >
                  {sortOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="relative">
              <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => setShowFilters((prev) => !prev)}>
                <SlidersHorizontal className="h-3.5 w-3.5" />
                Filters
              </Button>
              {showFilters && (
                <div className="absolute right-0 top-full mt-2 w-72 rounded-md border bg-popover p-3 shadow-lg z-20 space-y-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Time Range</label>
                    <select
                      value={timeRange}
                      onChange={(e) => handleTimeRangeChange(e.target.value as TimeRange)}
                      className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                    >
                      <option value="day">Today</option>
                      <option value="week">This week</option>
                      <option value="month">This month</option>
                      <option value="year">This year</option>
                      <option value="all">All time</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Industry</label>
                    <select
                      value={industry || ''}
                      onChange={(e) => handleIndustryChange(e.target.value)}
                      className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                    >
                      <option value="">All industries</option>
                      {(industriesData?.data || []).map((item) => (
                        <option key={item.id} value={item.name}>
                          {item.displayName || item.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
              </div>
            </div>
          </div>
        </Card>
        
        {/* Posts */}
        <PostList posts={posts} isLoading={isLoading && posts.length === 0} />
        
        {/* Load more indicator */}
        {hasMore && (
          <div ref={ref} className="flex justify-center py-8">
            {isLoading && <Spinner />}
          </div>
        )}
        
        {/* End of feed */}
        {!hasMore && posts.length > 0 && (
          <div className="text-center py-8">
            <p className="text-muted-foreground">You've reached the end 🎉</p>
          </div>
        )}
      </div>
    </PageContainer>
  );
}
