'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent, Badge, Button } from '@/components/ui';
import { PageContainer } from '@/components/layout';
import { ArrowLeft, User, MapPin, Briefcase } from 'lucide-react';
import { useState } from 'react';
import type { Job } from '@/types';

interface Application {
  id: string;
  agentName: string;
  agentProvider: 'gemini' | 'claude' | 'gpt';
  skills: string[];
  matchScore: number;
  status: 'applied' | 'shortlisted' | 'interview' | 'offered' | 'hired';
  appliedAt: string;
  lastUpdated: string;
}

const STATUSES = ['applied', 'shortlisted', 'interview', 'offered', 'hired'] as const;
const STATUS_LABELS = {
  applied: 'Applied',
  shortlisted: 'Shortlisted',
  interview: 'Interview',
  offered: 'Offered',
  hired: 'Hired',
};

const STATUS_COLORS = {
  applied: 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800',
  shortlisted: 'bg-purple-50 dark:bg-purple-950 border-purple-200 dark:border-purple-800',
  interview: 'bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800',
  offered: 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800',
  hired: 'bg-emerald-50 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-800',
};

const PROVIDER_COLORS = {
  gemini: 'bg-blue-100 text-blue-900 dark:bg-blue-900 dark:text-blue-100',
  claude: 'bg-orange-100 text-orange-900 dark:bg-orange-900 dark:text-orange-100',
  gpt: 'bg-green-100 text-green-900 dark:bg-green-900 dark:text-green-100',
};

// Mock data
const MOCK_JOB: Job = {
  id: '1',
  title: 'Senior ML Engineer',
  company: 'TechCorp',
  description: 'Build next-generation ML systems',
  skills: ['Python', 'Machine Learning', 'TensorFlow'],
  source: 'real',
  status: 'open',
  applicantCount: 24,
  createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  location: 'San Francisco, CA',
  salary: '$200k-$300k',
};

const MOCK_APPLICATIONS: Application[] = [
  {
    id: '1',
    agentName: 'AlexAI',
    agentProvider: 'gemini',
    skills: ['Python', 'TensorFlow', 'ML'],
    matchScore: 92,
    status: 'hired',
    appliedAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
    lastUpdated: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '2',
    agentName: 'BotClaude',
    agentProvider: 'claude',
    skills: ['Python', 'ML', 'AWS'],
    matchScore: 88,
    status: 'offered',
    appliedAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
    lastUpdated: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '3',
    agentName: 'GptMax',
    agentProvider: 'gpt',
    skills: ['Python', 'PyTorch', 'Data Science'],
    matchScore: 85,
    status: 'interview',
    appliedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    lastUpdated: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '4',
    agentName: 'DataBot',
    agentProvider: 'gemini',
    skills: ['Python', 'SQL', 'Analytics'],
    matchScore: 76,
    status: 'shortlisted',
    appliedAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
    lastUpdated: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '5',
    agentName: 'MLEngineer',
    agentProvider: 'claude',
    skills: ['Python', 'Rust', 'ML'],
    matchScore: 82,
    status: 'shortlisted',
    appliedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    lastUpdated: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '6',
    agentName: 'CodeBot',
    agentProvider: 'gpt',
    skills: ['Python', 'C++', 'Team Lead'],
    matchScore: 79,
    status: 'applied',
    appliedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    lastUpdated: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '7',
    agentName: 'NeuralNet',
    agentProvider: 'gemini',
    skills: ['Python', 'ML', 'TensorFlow'],
    matchScore: 81,
    status: 'applied',
    appliedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    lastUpdated: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

export default function RecruiterPipelinePage() {
  const params = useParams<{ jobId: string }>();
  const [applications, setApplications] = useState<Application[]>(MOCK_APPLICATIONS);

  const moveApplication = (appId: string, newStatus: typeof STATUSES[number]) => {
    setApplications(apps =>
      apps.map(app =>
        app.id === appId
          ? { ...app, status: newStatus, lastUpdated: new Date().toISOString() }
          : app
      )
    );
  };

  const getApplicationsByStatus = (status: typeof STATUSES[number]) => {
    return applications.filter(app => app.status === status);
  };

  const columnStats = STATUSES.map(status => ({
    status,
    count: getApplicationsByStatus(status).length,
  }));

  return (
    <PageContainer>
      <div className="w-full py-8">
        {/* Header */}
        <div className="mb-8 px-4">
          <Link href="/jobs" className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 w-fit">
            <ArrowLeft className="h-4 w-4" />
            Back to Jobs
          </Link>

          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">{MOCK_JOB.title}</h1>
              <p className="text-muted-foreground flex items-center gap-2">
                <Briefcase className="h-4 w-4" />
                {MOCK_JOB.company}
              </p>
            </div>
            <Badge className="h-fit">{applications.length} Applicants</Badge>
          </div>
        </div>

        {/* Kanban Stats */}
        <div className="grid grid-cols-5 gap-2 mb-6 px-4">
          {columnStats.map(({ status, count }) => (
            <Card key={status} className="py-3 px-4">
              <p className="text-xs font-semibold text-muted-foreground mb-1">
                {STATUS_LABELS[status]}
              </p>
              <p className="text-2xl font-bold">{count}</p>
            </Card>
          ))}
        </div>

        {/* Kanban Board */}
        <div className="grid grid-cols-5 gap-4 px-4 overflow-x-auto pb-8">
          {STATUSES.map(status => (
<<<<<<< HEAD
            <div key={status} className="flex-shrink-0 w-96">
=======
            <div key={status} className="shrink-0 w-96">
>>>>>>> smoke-test-gemini
              <div className={`rounded-lg border-2 p-4 ${STATUS_COLORS[status]} min-h-96`}>
                <h3 className="font-semibold text-sm mb-4 flex items-center justify-between">
                  {STATUS_LABELS[status]}
                  <span className="bg-background px-2 py-0.5 rounded text-xs font-bold">
                    {getApplicationsByStatus(status).length}
                  </span>
                </h3>

                <div className="space-y-3">
                  {getApplicationsByStatus(status).map(app => (
                    <Card key={app.id} className="cursor-move hover:shadow-md transition-shadow">
                      <CardContent className="pt-4">
                        {/* Agent Name & Match Score */}
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div className="flex-1">
                            <p className="font-semibold text-sm flex items-center gap-2">
                              <User className="h-3 w-3" />
                              {app.agentName}
                            </p>
                            <Badge
                              className={`mt-1 text-xs ${PROVIDER_COLORS[app.agentProvider]}`}
                            >
                              {app.agentProvider.charAt(0).toUpperCase() + app.agentProvider.slice(1)}
                            </Badge>
                          </div>
                          <Badge
                            variant="secondary"
                            className="text-xs h-fit whitespace-nowrap"
                          >
                            {app.matchScore}% match
                          </Badge>
                        </div>

                        {/* Skills */}
                        <div className="mb-3">
                          <p className="text-xs text-muted-foreground mb-2">Skills:</p>
                          <div className="flex flex-wrap gap-1">
                            {app.skills.slice(0, 2).map(skill => (
                              <Badge key={skill} variant="outline" className="text-xs">
                                {skill}
                              </Badge>
                            ))}
                            {app.skills.length > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{app.skills.length - 2}
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="space-y-2 border-t pt-3">
                          {status !== 'hired' && (
                            <div className="flex gap-1 flex-wrap">
                              {STATUSES
                                .filter(s => STATUSES.indexOf(s) > STATUSES.indexOf(status))
                                .slice(0, 2)
                                .map(nextStatus => (
                                  <Button
                                    key={nextStatus}
                                    size="sm"
                                    variant="ghost"
                                    className="text-xs h-7 px-2"
                                    onClick={() => moveApplication(app.id, nextStatus)}
                                  >
                                    → {STATUS_LABELS[nextStatus]}
                                  </Button>
                                ))}
                            </div>
                          )}
                          <p className="text-xs text-muted-foreground mt-2">
                            Applied {Math.floor((Date.now() - new Date(app.appliedAt).getTime()) / (24 * 60 * 60 * 1000))}d ago
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  {getApplicationsByStatus(status).length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-8">
                      No applications yet
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </PageContainer>
  );
}
