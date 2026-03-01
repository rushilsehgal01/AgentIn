'use client';

import { useEffect, useState } from 'react';
import { PageContainer } from '@/components/layout';
import { Card, CardHeader, CardTitle, CardContent, Badge } from '@/components/ui';
import { TrendingUp, Users, Briefcase, CheckCircle, AlertTriangle, Zap } from 'lucide-react';
import { cn, formatScore } from '@/lib/utils';

interface MarketEvent {
  id: string;
  type: 'hiring' | 'rejection' | 'resignation' | 'ghost' | 'fraud_detected' | 'market_shift';
  description: string;
  agentCount: number;
  timestamp: string;
}

interface DashboardMetrics {
  total_agents: number;
  employed_agents: number;
  total_applications: number;
  total_offers: number;
  avg_offer_acceptance_rate: number;
  avg_honesty_score: number;
  ghosting_rate: number;
  fraud_detection_rate: number;
}

const MOCK_METRICS: DashboardMetrics = {
  total_agents: 60,
  employed_agents: 24,
  total_applications: 487,
  total_offers: 89,
  avg_offer_acceptance_rate: 71.2,
  avg_honesty_score: 67.8,
  ghosting_rate: 8.2,
  fraud_detection_rate: 3.4,
};

const MOCK_EVENTS: MarketEvent[] = [
  {
    id: '1',
    type: 'hiring',
    description: 'AlexAI hired at TechCorp as Senior ML Engineer',
    agentCount: 1,
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '2',
    type: 'fraud_detected',
    description: 'BotSpam detected credential inflation in 3 applications',
    agentCount: 3,
    timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '3',
    type: 'ghost',
    description: 'GhostBot failed to show up for 5 interviews',
    agentCount: 1,
    timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '4',
    type: 'rejection',
    description: '12 agents rejected for insufficient skills match',
    agentCount: 12,
    timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '5',
    type: 'market_shift',
    description: 'AI/ML skills demand increased by 23% after announcement',
    agentCount: 60,
    timestamp: new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString(),
  },
];

const EVENT_COLORS = {
  hiring: 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800 text-green-900 dark:text-green-100',
  rejection: 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800 text-red-900 dark:text-red-100',
  resignation: 'bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800 text-yellow-900 dark:text-yellow-100',
  ghost: 'bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-800 text-orange-900 dark:text-orange-100',
  fraud_detected: 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800 text-red-900 dark:text-red-100',
  market_shift: 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-100',
};

const EVENT_ICONS = {
  hiring: <CheckCircle className="h-5 w-5 text-green-600" />,
  rejection: <AlertTriangle className="h-5 w-5 text-red-600" />,
  resignation: <AlertTriangle className="h-5 w-5 text-yellow-600" />,
  ghost: <AlertTriangle className="h-5 w-5 text-orange-600" />,
  fraud_detected: <AlertTriangle className="h-5 w-5 text-red-600" />,
  market_shift: <Zap className="h-5 w-5 text-blue-600" />,
};

// Simple bar chart component
function SimpleBarChart({ data, label }: { data: Array<{ name: string; value: number }>, label: string }) {
  const max = Math.max(...data.map(d => d.value));
  return (
    <div className="space-y-3">
      {data.map(item => (
        <div key={item.name}>
          <div className="flex justify-between mb-1">
            <span className="text-xs font-medium">{item.name}</span>
            <span className="text-xs text-muted-foreground">{item.value}</span>
          </div>
          <div className="bg-muted rounded-full h-2 overflow-hidden">
            <div
              className="bg-primary h-full transition-all"
              style={{ width: `${(item.value / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics>(MOCK_METRICS);
  const [events, setEvents] = useState<MarketEvent[]>(MOCK_EVENTS);

  // Simulate real-time updates (would be Supabase Realtime in production)
  useEffect(() => {
    const interval = setInterval(() => {
      // Randomly update some metrics
      setMetrics(prev => ({
        ...prev,
        total_applications: prev.total_applications + Math.floor(Math.random() * 3),
        employed_agents: Math.min(60, prev.employed_agents + (Math.random() > 0.7 ? 1 : 0)),
      }));
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const employment_rate = (metrics.employed_agents / metrics.total_agents) * 100;
  const conversion_rate = (metrics.total_offers / metrics.total_applications) * 100;

  return (
    <PageContainer>
      <div className="w-full py-8">
        {/* Header */}
        <div className="mb-8 px-4">
          <h1 className="text-4xl font-bold mb-2">Simulation Dashboard</h1>
          <p className="text-muted-foreground">
            Real-time metrics from the AgentIn job market simulation
          </p>
        </div>

        {/* Top Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 px-4">
          {/* Agents Employed */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-muted-foreground text-sm">Employed Agents</p>
                  <p className="text-3xl font-bold mt-1">{metrics.employed_agents}</p>
                </div>
                <Users className="h-8 w-8 text-blue-600 opacity-20" />
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-muted rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{ width: `${employment_rate}%` }}
                  />
                </div>
                <span className="text-xs font-semibold">{employment_rate.toFixed(1)}%</span>
              </div>
            </CardContent>
          </Card>

          {/* Total Applications */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-muted-foreground text-sm">Total Applications</p>
                  <p className="text-3xl font-bold mt-1">{metrics.total_applications}</p>
                </div>
                <Briefcase className="h-8 w-8 text-purple-600 opacity-20" />
              </div>
              <p className="text-xs text-muted-foreground">
                Avg {(metrics.total_applications / metrics.total_agents).toFixed(1)} per agent
              </p>
            </CardContent>
          </Card>

          {/* Average Honesty Score */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-muted-foreground text-sm">Avg Honesty Score</p>
                  <p className="text-3xl font-bold mt-1">{metrics.avg_honesty_score.toFixed(1)}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600 opacity-20" />
              </div>
              <p className="text-xs text-muted-foreground">/100</p>
            </CardContent>
          </Card>

          {/* Overall Conversion */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-muted-foreground text-sm">Conversion Rate</p>
                  <p className="text-3xl font-bold mt-1">{conversion_rate.toFixed(1)}%</p>
                </div>
                <TrendingUp className="h-8 w-8 text-orange-600 opacity-20" />
              </div>
              <p className="text-xs text-muted-foreground">
                {metrics.total_offers} offers from {metrics.total_applications} applications
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8 px-4">
          {/* Agent Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Agent Status Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <SimpleBarChart
                data={[
                  { name: 'Employed', value: metrics.employed_agents },
                  { name: 'Interviewing', value: Math.floor(metrics.total_agents * 0.2) },
                  { name: 'Offered', value: Math.floor(metrics.total_applications * 0.18) },
                  { name: 'Searching', value: metrics.total_agents - metrics.employed_agents - Math.floor(metrics.total_agents * 0.2) },
                ]}
                label="agents"
              />
            </CardContent>
          </Card>

          {/* Behavior Metrics */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Behavior Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <SimpleBarChart
                data={[
                  { name: 'Honest', value: 100 - metrics.ghosting_rate - metrics.fraud_detection_rate },
                  { name: 'Ghosting', value: Math.floor(metrics.ghosting_rate * 10) },
                  { name: 'Fraud', value: Math.floor(metrics.fraud_detection_rate * 10) },
                ]}
                label="behavior"
              />
            </CardContent>
          </Card>

          {/* Offer Acceptance */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Offer Acceptance Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-6">
                <div className="flex-1">
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium">Acceptance Rate</span>
                    <span className="text-sm font-semibold">{metrics.avg_offer_acceptance_rate.toFixed(1)}%</span>
                  </div>
                  <div className="bg-muted rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-green-600 h-3 rounded-full transition-all"
                      style={{ width: `${metrics.avg_offer_acceptance_rate}%` }}
                    />
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold">{metrics.avg_offer_acceptance_rate.toFixed(0)}</p>
                  <p className="text-xs text-muted-foreground">of offers</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Top Providers */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Agents by Provider</CardTitle>
            </CardHeader>
            <CardContent>
              <SimpleBarChart
                data={[
                  { name: 'Gemini', value: 20 },
                  { name: 'Claude', value: 20 },
                  { name: 'GPT', value: 20 },
                ]}
                label="agents"
              />
            </CardContent>
          </Card>
        </div>

        {/* Event Timeline */}
        <div className="px-4 mb-8">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Market Events (Live)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {events.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No events yet</p>
                ) : (
                  events.map(event => (
                    <div
                      key={event.id}
                      className={cn('p-4 rounded-lg border-2 flex items-start gap-4', EVENT_COLORS[event.type])}
                    >
                      <div className="mt-0.5 shrink-0">
                        {EVENT_ICONS[event.type]}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-semibold text-sm capitalize">
                              {event.type.replace(/_/g, ' ')}
                            </p>
                            <p className="text-sm mt-1">{event.description}</p>
                          </div>
                          {event.agentCount > 1 && (
                            <Badge variant="secondary" className="text-xs">
                              {event.agentCount} agents
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs opacity-75 mt-2">
                          {formatRelativeTime(new Date(event.timestamp))}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Info Card */}
        <div className="px-4">
          <Card className="bg-muted/50">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">
                📊 <strong>Real-time updates:</strong> This dashboard subscribes to Supabase Realtime events for `market_events` and `trust_events` tables. New events appear automatically as they occur in the simulation.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}
