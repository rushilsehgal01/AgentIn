'use client'; // HAHA

import * as React from 'react';
import { useState } from 'react';
import useSWR from 'swr';
import { api } from '@/lib/api';
import { Input, Button } from '@/components/ui';
import { JobCard, JobCardSkeleton } from '@/components/jobs';
import { X } from 'lucide-react';
import type { Job } from '@/types';

const SAMPLE_SKILLS = [
  'Python', 'TypeScript', 'React', 'Node.js', 'Machine Learning',
  'Data Analysis', 'Java', 'C++', 'AWS', 'Docker', 'SQL', 'GraphQL'
];

interface JobFilters {
  skills: string[];
  source?: 'real' | 'synthetic';
  status?: 'open' | 'closed' | 'filled';
  search?: string;
}

export default function JobsPage() {
  const [filters, setFilters] = useState<JobFilters>({
    skills: [],
    source: undefined,
    status: 'open'
  });
  const [searchInput, setSearchInput] = useState('');

  const queryKey = [
    'jobs',
    filters.skills.join(','),
    filters.source,
    filters.status,
    filters.search
  ].filter(Boolean);

  const { data, error, isLoading } = useSWR(
    queryKey,
    async () => {
      try {
        return await api.getJobs({
          skills: filters.skills,
          source: filters.source,
          status: filters.status,
          search: filters.search
        });
      } catch (err) {
        console.error('Failed to fetch jobs:', err);
        // Return mock data for demo
        return {
          data: [
            {
              id: '1',
              title: 'Senior ML Engineer',
              company: 'Google',
              description: 'Build next-generation ML systems for Search',
              skills: ['Python', 'Machine Learning', 'TensorFlow'],
              source: 'real' as const,
              status: 'open' as const,
              location: 'Mountain View, CA',
              salary: '$200k-$300k',
              createdAt: new Date().toISOString()
            },
            {
              id: '2',
              title: 'Full Stack Engineer',
              company: 'Startup XYZ',
              description: 'Early-stage team building core product',
              skills: ['TypeScript', 'React', 'Node.js'],
              source: 'real' as const,
              status: 'open' as const,
              location: 'Remote',
              salary: '$120k-$180k',
              createdAt: new Date().toISOString()
            }
          ]
        };
      }
    },
    { revalidateOnFocus: false }
  );

  const jobs = data?.data || [];

  const toggleSkill = (skill: string) => {
    setFilters(prev => ({
      ...prev,
      skills: prev.skills.includes(skill)
        ? prev.skills.filter(s => s !== skill)
        : [...prev.skills, skill]
    }));
  };

  const toggleSource = (source: 'real' | 'synthetic') => {
    setFilters(prev => ({
      ...prev,
      source: prev.source === source ? undefined : source
    }));
  };

  const handleSearch = (value: string) => {
    setSearchInput(value);
    setFilters(prev => ({
      ...prev,
      search: value || undefined
    }));
  };

  const clearFilters = () => {
    setFilters({
      skills: [],
      source: undefined,
      status: 'open'
    });
    setSearchInput('');
  };

  const hasActiveFilters = filters.skills.length > 0 || filters.source || searchInput;

  return (
    <main className="min-h-screen bg-background">
      <div className="container max-w-7xl py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Job Board</h1>
          <p className="text-muted-foreground">
            Discover opportunities from real companies and AI-generated roles
          </p>
        </div>

        {/* Filter Bar */}
        <div className="mb-8 sticky top-0 z-20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-4 rounded-lg border">
          {/* Search */}
          <div className="mb-4">
            <Input
              placeholder="Search jobs, companies..."
              value={searchInput}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full"
            />
          </div>

          {/* Source Filter */}
          <div className="mb-4">
            <h3 className="text-sm font-semibold mb-2">Job Source</h3>
            <div className="flex gap-2">
              <Button
                variant={filters.source === 'real' ? 'default' : 'outline'}
                size="sm"
                onClick={() => toggleSource('real')}
                className="gap-1"
              >
                ✨ Real Jobs
              </Button>
              <Button
                variant={filters.source === 'synthetic' ? 'default' : 'outline'}
                size="sm"
                onClick={() => toggleSource('synthetic')}
                className="gap-1"
              >
                🤖 AI-Generated
              </Button>
            </div>
          </div>

          {/* Skill Filter */}
          <div>
            <h3 className="text-sm font-semibold mb-2">Required Skills</h3>
            <div className="flex flex-wrap gap-2">
              {SAMPLE_SKILLS.map(skill => (
                <Button
                  key={skill}
                  variant={filters.skills.includes(skill) ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => toggleSkill(skill)}
                  className="h-8 text-xs"
                >
                  {skill}
                </Button>
              ))}
            </div>
          </div>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="mt-3 gap-1"
            >
              <X className="h-4 w-4" />
              Clear Filters
            </Button>
          )}
        </div>

        {/* Job Cards */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array(6).fill(0).map((_, i) => (
              <JobCardSkeleton key={i} />
            ))}
          </div>
        ) : jobs.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg">
              {hasActiveFilters ? 'No jobs match your filters' : 'No jobs available'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {jobs.map((job: Job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        )}

        {/* Results Count */}
        {!isLoading && jobs.length > 0 && (
          <div className="mt-8 text-center text-sm text-muted-foreground">
            Showing {jobs.length} {jobs.length === 1 ? 'job' : 'jobs'}
          </div>
        )}
      </div>
    </main>
  );
}
