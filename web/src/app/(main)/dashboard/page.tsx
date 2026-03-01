'use client';

import * as React from 'react';
import useSWR from 'swr';
import { PageContainer } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle, Badge, Spinner } from '@/components/ui';
import { TrendingUp, Users, Briefcase, CheckCircle, AlertTriangle, Zap } from 'lucide-react';
import { cn, formatRelativeTime, formatScore } from '@/lib/utils';
import { api } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import type { SimulationEvent } from '@/types';

const EVENT_COLORS: Record<string, string> = {
  hiring: 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800 text-green-900 dark:text-green-100',
  rejection: 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800 text-red-900 dark:text-red-100',
  resignation: 'bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800 text-yellow-900 dark:text-yellow-100',
  ghost: 'bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-800 text-orange-900 dark:text-orange-100',
  fraud_detected: 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800 text-red-900 dark:text-red-100',
  market_shift: 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-100',
  trust_event: 'bg-violet-50 dark:bg-violet-950 border-violet-200 dark:border-violet-800 text-violet-900 dark:text-violet-100',
};

const EVENT_ICONS: Record<string, React.ReactNode> = {
  hiring: <CheckCircle className="h-5 w-5 text-green-600" />,
  rejection: <AlertTriangle className="h-5 w-5 text-red-600" />,
  resignation: <AlertTriangle className="h-5 w-5 text-yellow-600" />,
  ghost: <AlertTriangle className="h-5 w-5 text-orange-600" />,
  fraud_detected: <AlertTriangle className="h-5 w-5 text-red-600" />,
  market_shift: <Zap className="h-5 w-5 text-blue-600" />,
  trust_event: <TrendingUp className="h-5 w-5 text-violet-600" />,
};

function sumCounts(items: Array<{ count: number | string }>) {
  return items.reduce((acc, item) => acc + Number(item.count || 0), 0);
}

function findCount(items: Array<{ [k: string]: unknown; count: number | string }>, key: string, value: string) {
  const row = items.find((item) => String(item[key] || '') === value);
  return Number(row?.count || 0);
}

function SimpleBarChart({ data }: { data: Array<{ name: string; value: number }> }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="space-y-3">
      {data.map((item) => (
        <div key={item.name}>
          <div className="mb-1 flex justify-between">
            <span className="text-xs font-medium">{item.name}</span>
            <span className="text-xs text-muted-foreground">{formatScore(item.value)}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full bg-primary transition-all" style={{ width: `${(item.value / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const { data: metricsData, isLoading: metricsLoading } = useSWR('simulation-metrics', () => api.getSimulationMetrics(), {
    refreshInterval: 30000,
  });
  const { data: leaderboardData } = useSWR('simulation-leaderboard', () => api.getSimulationLeaderboard(), {
    refreshInterval: 60000,
  });
  const { data: eventsBootstrap, isLoading: eventsLoading } = useSWR('simulation-events', () => api.getSimulationEvents(60), {
    refreshInterval: 45000,
  });

  const [events, setEvents] = React.useState<SimulationEvent[]>([]);

  React.useEffect(() => {
    if (eventsBootstrap?.events) {
      setEvents(eventsBootstrap.events);
    }
  }, [eventsBootstrap]);

  React.useEffect(() => {
    const channel = supabase
      .channel('dashboard-events')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'market_events' }, (payload) => {
        const next: SimulationEvent = {
          id: String(payload.new.id),
          source: 'market',
          type: String(payload.new.event_type || 'market_shift'),
          description: String(payload.new.description || 'Market event'),
          data: (payload.new.data as Record<string, unknown>) || {},
          affectedAgents: (payload.new.affected_agents as string[] | undefined) || [],
          createdAt: String(payload.new.created_at || new Date().toISOString()),
        };

        setEvents((prev) => [next, ...prev.filter((event) => event.id !== next.id)].slice(0, 100));
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'trust_events' }, (payload) => {
        const next: SimulationEvent = {
          id: String(payload.new.id),
          source: 'trust',
          type: String(payload.new.event_type || 'trust_event'),
          description: `Trust event: ${String(payload.new.event_type || 'unknown')}`,
          data: {
            delta: payload.new.delta,
            severity: payload.new.severity,
            evidence: payload.new.evidence,
          },
          affectedAgents: payload.new.agent_id ? [String(payload.new.agent_id)] : [],
          createdAt: String(payload.new.created_at || new Date().toISOString()),
        };

        setEvents((prev) => [next, ...prev.filter((event) => event.id !== next.id)].slice(0, 100));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const employment = metricsData?.employment || [];
  const providers = metricsData?.providers || [];
  const funnel = metricsData?.funnel || [];

  const totalAgents = sumCounts(employment as Array<{ count: number | string }>);
  const employedAgents = findCount(employment as Array<{ employment_state: unknown; count: number | string }>, 'employment_state', 'employed');
  const totalApplications = sumCounts(funnel as Array<{ count: number | string }>);
  const totalOffers = findCount(funnel as Array<{ status: unknown; count: number | string }>, 'status', 'offered') + findCount(funnel as Array<{ status: unknown; count: number | string }>, 'status', 'hired');

  const employmentRate = totalAgents > 0 ? (employedAgents / totalAgents) * 100 : 0;
  const conversionRate = totalApplications > 0 ? (totalOffers / totalApplications) * 100 : 0;
  const avgTrust = providers.length > 0
    ? providers.reduce((acc, provider) => acc + Number(provider.avg_trust || 0), 0) / providers.length
    : 0;

  const rawEngagement = leaderboardData?.raw_engagement || [];

  return (
    <PageContainer>
      <div className="w-full py-8">
        <div className="mb-8 px-4">
          <h1 className="mb-2 text-4xl font-bold">Simulation Dashboard</h1>
          <p className="text-muted-foreground">Live market metrics and realtime event stream</p>
        </div>

        {metricsLoading ? (
          <div className="flex items-center justify-center py-20">
            <Spinner />
          </div>
        ) : (
          <>
            <div className="mb-8 grid grid-cols-1 gap-4 px-4 md:grid-cols-2 xl:grid-cols-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="mb-3 flex items-start justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Employed Agents</p>
                      <p className="mt-1 text-3xl font-bold">{formatScore(employedAgents)}</p>
                    </div>
                    <Users className="h-8 w-8 text-blue-600 opacity-20" />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-2 flex-1 rounded-full bg-muted">
                      <div className="h-2 rounded-full bg-blue-600" style={{ width: `${employmentRate}%` }} />
                    </div>
                    <span className="text-xs font-semibold">{employmentRate.toFixed(1)}%</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="mb-3 flex items-start justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Applications</p>
                      <p className="mt-1 text-3xl font-bold">{formatScore(totalApplications)}</p>
                    </div>
                    <Briefcase className="h-8 w-8 text-purple-600 opacity-20" />
                  </div>
                  <p className="text-xs text-muted-foreground">Offers in funnel: {formatScore(totalOffers)}</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="mb-3 flex items-start justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Average Trust</p>
                      <p className="mt-1 text-3xl font-bold">{avgTrust.toFixed(1)}</p>
                    </div>
                    <CheckCircle className="h-8 w-8 text-green-600 opacity-20" />
                  </div>
                  <p className="text-xs text-muted-foreground">Across active providers</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="mb-3 flex items-start justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Conversion Rate</p>
                      <p className="mt-1 text-3xl font-bold">{conversionRate.toFixed(1)}%</p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-orange-600 opacity-20" />
                  </div>
                  <p className="text-xs text-muted-foreground">Offers + hires over applications</p>
                </CardContent>
              </Card>
            </div>

            <div className="mb-8 grid grid-cols-1 gap-4 px-4 xl:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Employment States</CardTitle>
                </CardHeader>
                <CardContent>
                  <SimpleBarChart
                    data={employment.map((row) => ({
                      name: String(row.employment_state || 'unknown'),
                      value: Number(row.count || 0),
                    }))}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Top Agents by Engagement</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {rawEngagement.slice(0, 6).map((agent, index) => (
                    <div key={agent.id} className="flex items-center justify-between text-sm">
                      <div className="flex min-w-0 items-center gap-2">
                        <Badge variant="secondary" className="h-6 w-6 shrink-0 justify-center p-0">{index + 1}</Badge>
                        <span className="truncate">{agent.display_name || agent.handle}</span>
                      </div>
                      <span className="text-muted-foreground">{formatScore(agent.engagement_score)}</span>
                    </div>
                  ))}
                  {rawEngagement.length === 0 && <p className="text-sm text-muted-foreground">No leaderboard data yet.</p>}
                </CardContent>
              </Card>
            </div>
          </>
        )}

        <div className="mb-8 px-4">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Market Events (Live)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-h-[28rem] space-y-3 overflow-y-auto">
                {eventsLoading && events.length === 0 ? (
                  <div className="flex items-center justify-center py-8">
                    <Spinner />
                  </div>
                ) : events.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">No events yet</p>
                ) : (
                  events.map((event) => {
                    const eventKey = event.type || (event.source === 'trust' ? 'trust_event' : 'market_shift');
                    return (
                      <div key={`${event.source}-${event.id}`} className={cn('flex items-start gap-4 rounded-lg border-2 p-4', EVENT_COLORS[eventKey] || EVENT_COLORS.market_shift)}>
                        <div className="mt-0.5 shrink-0">{EVENT_ICONS[eventKey] || EVENT_ICONS.market_shift}</div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold capitalize">{event.type.replace(/_/g, ' ')}</p>
                              <p className="mt-1 text-sm">{event.description}</p>
                            </div>
                            {event.affectedAgents.length > 1 && (
                              <Badge variant="secondary" className="text-xs">
                                {event.affectedAgents.length} agents
                              </Badge>
                            )}
                          </div>
                          <p className="mt-2 text-xs opacity-75">{formatRelativeTime(event.createdAt)}</p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}
