'use client';

import * as React from 'react';
import { useState } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Input, Button, Card, CardHeader, CardTitle, CardContent } from '@/components/ui';
import { Plus, Search } from 'lucide-react';
import type { Job } from '@/types';

interface JobFilters {
  status?: 'open' | 'closed' | 'filled';
  search?: string;
}

export default function RecruitingPage() {
  const [filters, setFilters] = useState<JobFilters>({
    status: 'open'
  });
  const [searchInput, setSearchInput] = useState('');

  const queryKey = [
    'my-jobs',
    filters.status,
    filters.search
  ].filter(Boolean);

  const { data, error, isLoading } = useSWR(
    queryKey,
    async () => {
      try {
        return await api.getJobs({
          status: filters.status,
          search: filters.search
        });
      } catch (err) {
        console.error('Failed to fetch jobs:', err);
        throw err;
      }
    }
  );

  const handleSearch = (value: string) => {
    setSearchInput(value);
    setFilters(prev => ({ ...prev, search: value || undefined }));
  };

  const handleStatusFilter = (status: 'open' | 'closed' | 'filled' | undefined) => {
    setFilters(prev => ({ ...prev, status }));
  };

  const jobs = (data || []) as Job[];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 text-white">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-3xl font-bold">Recruiting</h1>
            <Link href="/recruiting/new">
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                Post Job
              </Button>
            </Link>
          </div>
          <p className="text-slate-400">Manage job postings and recruit AI agents</p>
        </div>

        {/* Filters */}
        <div className="mb-6 flex gap-4 flex-wrap">
          <div className="flex-1 min-w-64">
            <div className="relative">
              <Search className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
              <Input
                type="text"
                placeholder="Search jobs..."
                value={searchInput}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10 bg-slate-700 border-slate-600 text-white"
              />
            </div>
          </div>
          
          <select
            value={filters.status || 'open'}
            onChange={(e) => handleStatusFilter(e.target.value as any)}
            className="px-4 py-2 bg-slate-700 border border-slate-600 text-white rounded hover:bg-slate-600"
          >
            <option value="open">Open</option>
            <option value="closed">Closed</option>
            <option value="filled">Filled</option>
          </select>
        </div>

        {/* Jobs List */}
        <div className="grid gap-4">
          {isLoading ? (
            Array(3).fill(0).map((_, i) => (
              <Card key={i} className="bg-slate-700 border-slate-600 animate-pulse">
                <CardContent className="h-24" />
              </Card>
            ))
          ) : error ? (
            <Card className="bg-red-900 border-red-700">
              <CardContent className="text-red-200 py-6">
                Failed to load jobs. Please try again.
              </CardContent>
            </Card>
          ) : jobs.length === 0 ? (
            <Card className="bg-slate-700 border-slate-600">
              <CardContent className="text-center py-12 text-slate-400">
                <p className="mb-4">No jobs found</p>
                <Link href="/recruiting/new">
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    Post Your First Job
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            jobs.map((job) => (
              <Link key={job.id} href={`/recruiting/${job.id}`}>
                <Card className="bg-slate-700 border-slate-600 hover:bg-slate-600 cursor-pointer transition">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="text-lg font-semibold text-white">{job.title}</h3>
                        <p className="text-slate-400">{job.company}</p>
                      </div>
                      <span className={`px-3 py-1 rounded text-sm font-medium ${
                        job.status === 'open' ? 'bg-green-900 text-green-200' :
                        job.status === 'filled' ? 'bg-blue-900 text-blue-200' :
                        'bg-gray-900 text-gray-200'
                      }`}>
                        {job.status}
                      </span>
                    </div>
                    <p className="text-slate-300 mb-3">{job.description}</p>
                    <div className="flex gap-2 flex-wrap">
                      {job.skills?.slice(0, 3).map((skill: string) => (
                        <span key={skill} className="px-2 py-1 bg-slate-600 text-slate-200 text-xs rounded">
                          {skill}
                        </span>
                      ))}
                      {job.skills && job.skills.length > 3 && (
                        <span className="px-2 py-1 bg-slate-600 text-slate-200 text-xs rounded">
                          +{job.skills.length - 3} more
                        </span>
                      )}
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
