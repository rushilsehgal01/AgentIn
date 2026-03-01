'use client';

import * as React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Button, Card, Badge } from '@/components/ui';
import { Briefcase, MapPin, DollarSign, ExternalLink } from 'lucide-react';
import type { Job } from '@/types';

interface JobCardProps {
  job: Job;
}

export function JobCard({ job }: JobCardProps) {
  return (
    <Link href={`/jobs/${job.id}`}>
      <Card className="p-5 hover:border-primary transition-colors h-full cursor-pointer group bg-card hover:shadow-md">
        <div className="space-y-3">
          {/* Title & Company */}
          <div>
            <h3 className="font-semibold text-base group-hover:text-primary transition-colors line-clamp-2">
              {job.title}
            </h3>
            <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
              <Briefcase className="h-3 w-3" />
              {job.company}
            </p>
          </div>

          {/* Location & Salary */}
          <div className="flex flex-col gap-1 text-xs text-muted-foreground">
            {job.location && (
              <div className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {job.location}
              </div>
            )}
            {job.salary && (
              <div className="flex items-center gap-1">
                <DollarSign className="h-3 w-3" />
                {job.salary}
              </div>
            )}
          </div>

          {/* Skills */}
          <div className="flex flex-wrap gap-1">
            {job.skills.slice(0, 3).map((skill) => (
              <Badge key={skill} variant="secondary" className="text-xs">
                {skill}
              </Badge>
            ))}
            {job.skills.length > 3 && (
              <Badge variant="secondary" className="text-xs">
                +{job.skills.length - 3} more
              </Badge>
            )}
          </div>

          {/* Footer - Source Badge & Apply Button */}
          <div className="flex items-center justify-between pt-2 border-t">
            <Badge variant={job.source === 'real' ? 'default' : 'outline'} className="text-xs">
              {job.source === 'real' ? '✨ Real Job' : '🤖 AI-Generated'}
            </Badge>
            
            <Button
              size="sm"
              className="h-7"
              onClick={(e) => {
                e.preventDefault();
              }}
            >
              View
              <ExternalLink className="h-3 w-3 ml-1" />
            </Button>
          </div>
        </div>
      </Card>
    </Link>
  );
}

export function JobCardSkeleton() {
  return (
    <Card className="p-5 space-y-3">
      <div className="space-y-2">
        <div className="h-5 bg-muted rounded w-3/4" />
        <div className="h-4 bg-muted rounded w-1/2" />
      </div>
      <div className="space-y-1">
        <div className="h-3 bg-muted rounded w-1/3" />
        <div className="h-3 bg-muted rounded w-1/4" />
      </div>
      <div className="flex gap-1">
        <div className="h-6 bg-muted rounded w-16" />
        <div className="h-6 bg-muted rounded w-14" />
        <div className="h-6 bg-muted rounded w-12" />
      </div>
      <div className="pt-2 border-t flex justify-between">
        <div className="h-6 bg-muted rounded w-20" />
        <div className="h-7 bg-muted rounded w-16" />
      </div>
    </Card>
  );
}
