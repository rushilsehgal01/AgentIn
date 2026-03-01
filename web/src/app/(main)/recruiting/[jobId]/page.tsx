'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import useSWR from 'swr';
import { Card, CardContent, Badge, Button } from '@/components/ui';
import { PageContainer } from '@/components/layout';
import { ArrowLeft, User, Briefcase } from 'lucide-react';
import { api } from '@/lib/api';
import type { RecruiterApplication, ApplicationDecision } from '@/types';

const STATUSES = ['applied', 'shortlisted', 'interview', 'offered', 'hired', 'rejected', 'ghosted'] as const;
const STATUS_LABELS: Record<typeof STATUSES[number], string> = {
  applied: 'Applied',
  shortlisted: 'Shortlisted',
  interview: 'Interview',
  offered: 'Offered',
  hired: 'Hired',
  rejected: 'Rejected',
  ghosted: 'Ghosted',
};

const STATUS_COLORS: Record<typeof STATUSES[number], string> = {
  applied: 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800',
  shortlisted: 'bg-purple-50 dark:bg-purple-950 border-purple-200 dark:border-purple-800',
  interview: 'bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800',
  offered: 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800',
  hired: 'bg-emerald-50 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-800',
  rejected: 'bg-rose-50 dark:bg-rose-950 border-rose-200 dark:border-rose-800',
  ghosted: 'bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-800',
};

function getAvailableDecisions(status: RecruiterApplication['status']): ApplicationDecision[] {
  if (status === 'applied') return ['shortlist', 'interview', 'reject', 'ghost'];
  if (status === 'shortlisted') return ['interview', 'reject', 'ghost'];
  if (status === 'interview') return ['offer', 'reject', 'ghost'];
  if (status === 'offered') return ['reject'];
  return [];
}

function mergeApplication(list: RecruiterApplication[], next: RecruiterApplication) {
  const exists = list.some((item) => item.id === next.id);
  if (!exists) return [next, ...list];
  return list.map((item) => (item.id === next.id ? { ...item, ...next } : item));
}

export default function RecruiterPipelinePage() {
  const params = useParams<{ jobId: string }>();
  const jobId = params.jobId;

  const { data: job, isLoading: jobLoading } = useSWR(['job', jobId], () => api.getJob(jobId));
  const { data: appData, isLoading: appsLoading, mutate } = useSWR(['recruiter-applications', jobId], () => api.getRecruiterJobApplications(jobId));
  const [applications, setApplications] = React.useState<RecruiterApplication[]>([]);
  const [busyApp, setBusyApp] = React.useState<string | null>(null);
  const reconnectAttempt = React.useRef(0);
  const reconnectTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const streamRef = React.useRef<EventSource | null>(null);

  React.useEffect(() => {
    setApplications(appData?.applications || []);
  }, [appData]);

  React.useEffect(() => {
    const connect = () => {
      try {
        const source = api.streamRecruiterJob(jobId, {
          onApplication: (event) => {
            if (!event?.application) return;
            setApplications((prev) => mergeApplication(prev, event.application));
          },
          onError: () => {
            if (streamRef.current) {
              streamRef.current.close();
              streamRef.current = null;
            }
            const delay = Math.min(30000, 1000 * 2 ** reconnectAttempt.current);
            reconnectAttempt.current += 1;
            reconnectTimer.current = setTimeout(connect, delay);
          },
        });

        streamRef.current = source;
        reconnectAttempt.current = 0;
      } catch {
        // Keep page usable without realtime when auth/session is missing.
      }
    };

    connect();

    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      if (streamRef.current) streamRef.current.close();
    };
  }, [jobId]);

  const moveApplication = async (applicationId: string, decision: ApplicationDecision) => {
    if (busyApp) return;
    setBusyApp(applicationId);
    try {
      const { application } = await api.reviewApplication(applicationId, decision);
      setApplications((prev) => mergeApplication(prev, application));
      mutate();
    } catch (err) {
      console.error('Failed to update application status:', err);
    } finally {
      setBusyApp(null);
    }
  };

  const byStatus = (status: typeof STATUSES[number]) => applications.filter((app) => app.status === status);

  return (
    <PageContainer>
      <div className="w-full py-8">
        <div className="mb-8 px-4">
          <Link href="/recruiting" className="mb-6 inline-flex w-fit items-center gap-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            Back to Recruiting
          </Link>

          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="mb-2 text-3xl font-bold">{jobLoading ? 'Loading…' : job?.title}</h1>
              <p className="flex items-center gap-2 text-muted-foreground">
                <Briefcase className="h-4 w-4" />
                {job?.company}
              </p>
            </div>
            <Badge className="h-fit">{applications.length} Applicants</Badge>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 px-4 pb-4 md:grid-cols-4 xl:grid-cols-7">
          {STATUSES.map((status) => (
            <Card key={status} className="px-4 py-3">
              <p className="mb-1 text-xs font-semibold text-muted-foreground">{STATUS_LABELS[status]}</p>
              <p className="text-2xl font-bold">{byStatus(status).length}</p>
            </Card>
          ))}
        </div>

        <div className="overflow-x-auto px-4 pb-8">
          <div className="grid min-w-[1200px] grid-cols-7 gap-4">
            {STATUSES.map((status) => (
              <div key={status} className="min-w-0">
                <div className={`min-h-96 rounded-lg border-2 p-4 ${STATUS_COLORS[status]}`}>
                  <h3 className="mb-4 flex items-center justify-between text-sm font-semibold">
                    {STATUS_LABELS[status]}
                    <span className="rounded bg-background px-2 py-0.5 text-xs font-bold">{byStatus(status).length}</span>
                  </h3>

                  <div className="space-y-3">
                    {(appsLoading ? [] : byStatus(status)).map((app) => (
                      <Card key={app.id}>
                        <CardContent className="pt-4">
                          <div className="mb-3 flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <p className="flex items-center gap-2 text-sm font-semibold">
                                <User className="h-3 w-3" />
                                {app.displayName || app.handle}
                              </p>
                              <p className="mt-1 text-xs text-muted-foreground">{app.provider || 'unknown provider'}</p>
                            </div>
                            <Badge variant="secondary" className="text-xs">
                              {app.trustScore ? `${Math.round(app.trustScore)}` : '—'} trust
                            </Badge>
                          </div>

                          <div className="mb-3 flex flex-wrap gap-1">
                            {(app.skills || []).slice(0, 3).map((skill) => (
                              <Badge key={skill} variant="outline" className="text-xs">
                                {skill}
                              </Badge>
                            ))}
                          </div>

                          <div className="space-y-2 border-t pt-3">
                            <div className="flex flex-wrap gap-1">
                              {getAvailableDecisions(app.status).map((decision) => (
                                <Button
                                  key={decision}
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 px-2 text-xs"
                                  onClick={() => moveApplication(app.id, decision)}
                                  isLoading={busyApp === app.id}
                                  disabled={busyApp === app.id}
                                >
                                  {decision}
                                </Button>
                              ))}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Applied {Math.max(0, Math.floor((Date.now() - new Date(app.appliedAt).getTime()) / (24 * 60 * 60 * 1000)))}d ago
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    ))}

                    {!appsLoading && byStatus(status).length === 0 && (
                      <p className="py-8 text-center text-xs text-muted-foreground">No applications</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
