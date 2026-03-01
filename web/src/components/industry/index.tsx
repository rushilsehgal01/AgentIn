'use client';

import * as React from 'react';
import Link from 'next/link';
<<<<<<< HEAD
import { cn, getIndustryUrl } from '@/lib/utils';
import { Button, Card, Avatar, AvatarImage, AvatarFallback, Badge } from '@/components/ui';
import { Plus, Users } from 'lucide-react';
import type { Industry } from '@/types';

interface IndustryListProps {
  industries: Industry[];
  isLoading?: boolean;
}

export function IndustryList({ industries, isLoading }: IndustryListProps) {
  if (isLoading) {
    return (
      <div className="grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="p-4 animate-pulse">
            <div className="h-12 bg-muted rounded mb-2" />
            <div className="h-4 bg-muted rounded mb-2" />
            <div className="h-4 bg-muted rounded w-2/3" />
          </Card>
=======
import { cn, formatScore, getInitials, getIndustryUrl } from '@/lib/utils';
import { useAuth } from '@/hooks';
import { useSubscriptionStore } from '@/store';
import { Card, Avatar, AvatarImage, AvatarFallback, Button, Skeleton, Badge } from '@/components/ui';
import { Hash, Users, Plus, Check } from 'lucide-react';
import { api } from '@/lib/api';
import type { Industry } from '@/types';

interface IndustryCardProps {
  industry: Industry;
  variant?: 'default' | 'compact';
}

export function IndustryCard({ industry, variant = 'default' }: IndustryCardProps) {
  const { isAuthenticated } = useAuth();
  const { isSubscribed, addSubscription, removeSubscription } = useSubscriptionStore();
  const [subscribing, setSubscribing] = React.useState(false);
  
  const subscribed = industry.isSubscribed || isSubscribed(industry.name);
  
  const handleSubscribe = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated || subscribing) return;
    
    setSubscribing(true);
    try {
      if (subscribed) {
        await api.unsubscribeIndustry(industry.name);
        removeSubscription(industry.name);
      } else {
        await api.subscribeIndustry(industry.name);
        addSubscription(industry.name);
      }
    } catch (err) {
      console.error('Subscribe failed:', err);
    } finally {
      setSubscribing(false);
    }
  };
  
  if (variant === 'compact') {
    return (
      <Link href={getIndustryUrl(industry.name)} className="flex items-center gap-3 p-2 rounded-md hover:bg-muted transition-colors">
        <Avatar className="h-8 w-8">
          <AvatarImage src={industry.iconUrl} />
          <AvatarFallback><Hash className="h-4 w-4" /></AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{industry.displayName || industry.name}</p>
          <p className="text-xs text-muted-foreground">{formatScore(industry.subscriberCount)} members</p>
        </div>
        {isAuthenticated && (
          <Button size="sm" variant={subscribed ? 'secondary' : 'default'} onClick={handleSubscribe} disabled={subscribing} className="h-7 px-2">
            {subscribed ? <Check className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
          </Button>
        )}
      </Link>
    );
  }
  
  return (
    <Card className="p-4 hover:border-muted-foreground/20 transition-colors">
      <Link href={getIndustryUrl(industry.name)} className="block">
        <div className="flex items-start gap-4">
          <Avatar className="h-12 w-12">
            <AvatarImage src={industry.iconUrl} />
            <AvatarFallback><Hash className="h-6 w-6" /></AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold truncate">{industry.displayName || industry.name}</h3>
              {industry.isNsfw && <Badge variant="destructive" className="text-xs">NSFW</Badge>}
            </div>
            <p className="text-sm text-muted-foreground">m/{industry.name}</p>
            {industry.description && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{industry.description}</p>
            )}
            <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
              <Users className="h-3 w-3" />
              {formatScore(industry.subscriberCount)} members
            </div>
          </div>
          
          {isAuthenticated && (
            <Button size="sm" variant={subscribed ? 'secondary' : 'default'} onClick={handleSubscribe} disabled={subscribing}>
              {subscribed ? 'Joined' : 'Join'}
            </Button>
          )}
        </div>
      </Link>
    </Card>
  );
}

// Industry List
<<<<<<<< HEAD:web/src/components/submolt/index.tsx
export function IndustryList({ industrys, isLoading, variant = 'default' }: { industrys: Industry[]; isLoading?: boolean; variant?: 'default' | 'compact' }) {
========
export function IndustryList({ industries, isLoading, variant = 'default' }: { industries: Industry[]; isLoading?: boolean; variant?: 'default' | 'compact' }) {
>>>>>>>> smoke-test-gemini:web/src/components/industry/index.tsx
  if (isLoading) {
    return (
      <div className={cn('space-y-4', variant === 'compact' && 'space-y-1')}>
        {Array.from({ length: 5 }).map((_, i) => (
          <IndustryCardSkeleton key={i} variant={variant} />
>>>>>>> smoke-test-gemini
        ))}
      </div>
    );
  }
<<<<<<< HEAD

  if (industries.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No industries found</p>
      </div>
    );
  }

  return (
    <div className="grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
      {industries.map(industry => (
        <Link key={industry.id} href={getIndustryUrl(industry.name)} className="group">
          <Card className="p-4 hover:border-primary transition-colors h-full">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h3 className="font-semibold text-sm group-hover:text-primary transition-colors">
                  i/{industry.name}
                </h3>
                {industry.displayName && (
                  <p className="text-xs text-muted-foreground">{industry.displayName}</p>
                )}
              </div>
            </div>
            
            {industry.description && (
              <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                {industry.description}
              </p>
            )}
            
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Users className="h-3 w-3" />
              <span>{industry.subscriberCount} subscribers</span>
            </div>
          </Card>
        </Link>
=======
  
<<<<<<<< HEAD:web/src/components/submolt/index.tsx
  if (industrys.length === 0) {
    return (
      <div className="text-center py-8">
        <Hash className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
        <p className="text-muted-foreground">No industrys found</p>
========
  if (industries.length === 0) {
    return (
      <div className="text-center py-8">
        <Hash className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
        <p className="text-muted-foreground">No industries found</p>
>>>>>>>> smoke-test-gemini:web/src/components/industry/index.tsx
      </div>
    );
  }
  
  return (
    <div className={cn('space-y-4', variant === 'compact' && 'space-y-1')}>
<<<<<<<< HEAD:web/src/components/submolt/index.tsx
      {industrys.map(industry => (
========
      {industries.map(industry => (
>>>>>>>> smoke-test-gemini:web/src/components/industry/index.tsx
        <IndustryCard key={industry.id} industry={industry} variant={variant} />
>>>>>>> smoke-test-gemini
      ))}
    </div>
  );
}

<<<<<<< HEAD
export function CreateIndustryButton() {
  return (
    <Button>
      <Plus className="h-4 w-4 mr-2" />
      Create Industry
    </Button>
=======
// Industry Card Skeleton
export function IndustryCardSkeleton({ variant = 'default' }: { variant?: 'default' | 'compact' }) {
  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-3 p-2">
        <Skeleton className="h-8 w-8 rounded-full" />
        <div className="flex-1 space-y-1">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-16" />
        </div>
        <Skeleton className="h-7 w-14" />
      </div>
    );
  }
  
  return (
    <Card className="p-4">
      <div className="flex items-start gap-4">
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-3 w-24" />
        </div>
        <Skeleton className="h-9 w-16" />
      </div>
    </Card>
  );
}

// Sidebar Industry Widget
<<<<<<<< HEAD:web/src/components/submolt/index.tsx
export function SidebarIndustrys({ industrys, title = 'Communities' }: { industrys: Industry[]; title?: string }) {
========
export function SidebarIndustries({ industries, title = 'Communities' }: { industries: Industry[]; title?: string }) {
>>>>>>>> smoke-test-gemini:web/src/components/industry/index.tsx
  return (
    <Card>
      <div className="p-4 border-b">
        <h3 className="font-semibold text-sm">{title}</h3>
      </div>
      <div className="p-2">
<<<<<<<< HEAD:web/src/components/submolt/index.tsx
        <IndustryList industrys={industrys} variant="compact" />
      </div>
      <div className="p-2 border-t">
        <Link href="/industrys">
          <Button variant="ghost" className="w-full text-sm">View all industrys</Button>
========
        <IndustryList industries={industries} variant="compact" />
      </div>
      <div className="p-2 border-t">
        <Link href="/industries">
          <Button variant="ghost" className="w-full text-sm">View all industries</Button>
>>>>>>>> smoke-test-gemini:web/src/components/industry/index.tsx
        </Link>
      </div>
    </Card>
  );
}

// Create Industry Button
export function CreateIndustryButton() {
  const { isAuthenticated } = useAuth();
  
  if (!isAuthenticated) return null;
  
  return (
<<<<<<<< HEAD:web/src/components/submolt/index.tsx
    <Link href="/industrys/create">
========
    <Link href="/industries/create">
>>>>>>>> smoke-test-gemini:web/src/components/industry/index.tsx
      <Button className="w-full gap-2">
        <Plus className="h-4 w-4" />
        Create Industry
      </Button>
    </Link>
>>>>>>> smoke-test-gemini
  );
}
