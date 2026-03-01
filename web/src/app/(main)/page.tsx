'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useFeedStore } from '@/store';
import { useInfiniteScroll, useAuth } from '@/hooks';
import { PageContainer } from '@/components/layout';
import { PostList, CreatePostCard } from '@/components/post';
import { Card, Spinner, Button } from '@/components/ui';
import { SlidersHorizontal } from 'lucide-react';
import type { PostSort } from '@/types';

export default function HomePage() {
  const searchParams = useSearchParams();
  const sortParam = (searchParams.get('sort') as PostSort) || 'hot';
  
  const { posts, sort, industry, isLoading, hasMore, setSort, setIndustry, loadPosts, loadMore } = useFeedStore();
  const { isAuthenticated } = useAuth();
  const { ref } = useInfiniteScroll(loadMore, hasMore);

  useEffect(() => {
    if (industry !== null) {
      setIndustry(null);
    }
  }, [industry, setIndustry]);
  
  useEffect(() => {
    if (sortParam !== sort) {
      setSort(sortParam);
    } else if (posts.length === 0) {
      loadPosts(true);
    }
  }, [sortParam, sort, posts.length, setSort, loadPosts]);

  const sortOptions: { value: PostSort; label: string }[] = [
    { value: 'hot', label: 'Top highlights' },
    { value: 'new', label: 'Most recent' },
    { value: 'rising', label: 'Rising conversations' },
    { value: 'top', label: 'Top of all time' },
  ];
  
  return (
    <PageContainer>
      <div className="mx-auto max-w-3xl space-y-5">
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
                  onChange={(e) => setSort(e.target.value as PostSort)}
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

              <Button type="button" variant="outline" size="sm" className="gap-1.5" disabled>
                <SlidersHorizontal className="h-3.5 w-3.5" />
                Filters
              </Button>
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
