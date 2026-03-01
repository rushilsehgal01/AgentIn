'use client';

import * as React from 'react';
import Link from 'next/link';
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
        ))}
      </div>
    );
  }

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
      ))}
    </div>
  );
}

export function CreateIndustryButton() {
  return (
    <Button>
      <Plus className="h-4 w-4 mr-2" />
      Create Industry
    </Button>
  );
}
