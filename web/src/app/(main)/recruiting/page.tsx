'use client';

import * as React from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Input, Button, Card, CardContent } from '@/components/ui';
import { Plus, Search } from 'lucide-react';
import type { RecruiterJob } from '@/types';

interface JobFilters {
  status?: 'open' | 'closed' | 'filled' | 'paused' | 'all';
  search?: string;
}

export default function RecruitingPage() {
  const [filters, setFilters] = React.useState<JobFilters>({ status: 'open' });
  const [searchInput, setSearchInput] = React.useState('');

  const { data, error, isLoading, mutate } = useSWR(
    ['recruiter-jobs', filters.status || 'open', filters.search || ''],
    () => api.getRecruiterJobs({ status: filters.status, search: filters.search, limit: 50, offset: 0 })
  );

  const jobs: RecruiterJob[] = data?.data || [];

  const handleSearch = (value: string) => {
    setSearchInput(value);
    setFilters((prev) => ({ ...prev, search: value.trim() || undefined }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 text-white">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-8">
          <div className="mb-4 flex items-center justify-between">
            <h1 className="text-3xl font-bold">Recruiting</h1>
            <Link href="/recruiting/new">
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="mr-2 h-4 w-4" />
                Post Job
              </Button>
            </Link>
          </div>
          <p className="text-slate-400">Manage your job postings and candidate pipeline</p>
        </div>

        <div className="mb-6 flex flex-wrap gap-4">
          <div className="min-w-64 flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
              <Input
                type="text"
                placeholder="Search your jobs..."
                value={searchInput}
                onChange={(e) => handleSearch(e.target.value)}
                className="border-slate-600 bg-slate-700 pl-10 text-white"
              />
            </div>
          </div>

          <select
            value={filters.status || 'open'}
            onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value as JobFilters['status'] }))}
            className="rounded border border-slate-600 bg-slate-700 px-4 py-2 text-white hover:bg-slate-600"
          >
            <option value="open">Open</option>
            <option value="paused">Paused</option>
            <option value="closed">Closed</option>
            <option value="filled">Filled</option>
            <option value="all">All</option>
          </select>
        </div>

        <div className="grid gap-4">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="animate-pulse border-slate-600 bg-slate-700">
                <CardContent className="h-24" />
              </Card>
            ))
          ) : error ? (
            <Card className="border-red-700 bg-red-900">
              <CardContent className="py-6 text-red-200">
                Failed to load recruiter jobs.
              </CardContent>
            </Card>
          ) : jobs.length === 0 ? (
            <Card className="border-slate-600 bg-slate-700">
              <CardContent className="py-12 text-center text-slate-400">
                <p className="mb-4">No jobs found for this filter.</p>
                <Link href="/recruiting/new">
                  <Button className="bg-blue-600 hover:bg-blue-700">Post your first job</Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            jobs.map((job) => (
              <Link key={job.id} href={`/recruiting/${job.id}`}>
                <Card className="cursor-pointer border-slate-600 bg-slate-700 transition hover:bg-slate-600">
                  <CardContent className="p-6">
                    <div className="mb-3 flex items-start justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-white">{job.title}</h3>
                        <p className="text-slate-400">{job.company}</p>
                      </div>
                      <span className={`rounded px-3 py-1 text-sm font-medium ${
                        job.status === 'open' ? 'bg-green-900 text-green-200' :
                        job.status === 'filled' ? 'bg-blue-900 text-blue-200' :
                        job.status === 'paused' ? 'bg-yellow-900 text-yellow-200' :
                        'bg-gray-900 text-gray-200'
                      }`}>
                        {job.status}
                      </span>
                    </div>
                    <p className="mb-3 line-clamp-2 text-slate-300">{job.description}</p>
                    <div className="mb-3 flex flex-wrap gap-2">
                      {job.skills?.slice(0, 4).map((skill) => (
                        <span key={skill} className="rounded bg-slate-600 px-2 py-1 text-xs text-slate-200">
                          {skill}
                        </span>
                      ))}
                    </div>
                    <div className="text-xs text-slate-400">
                      {job.applicantCount || 0} applicants · posted {new Date(job.createdAt).toLocaleDateString()}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
