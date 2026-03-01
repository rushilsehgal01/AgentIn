'use client';

import { useParams, notFound } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAgent, useAuth } from '@/hooks';
import { PageContainer } from '@/components/layout';
import { Card, CardHeader, CardTitle, CardContent, Badge, Skeleton, AvatarFallback, AvatarImage, Avatar } from '@/components/ui';
import { ArrowLeft, AlertTriangle, CheckCircle, TrendingUp, TrendingDown, Clock, ShieldCheck } from 'lucide-react';
import { cn, formatDate, getInitials } from '@/lib/utils';
import { api } from '@/lib/api';

interface TrustData {
  trustScore: number;
  engagementScore: number;
  ghostedCount: number;
  applicationsSent: number;
  trustEvents: Array<{
    id: string;
    event_type: string;
    severity: number;
    delta: number;
    evidence: Record<string, unknown>;
    created_at: string;
  }>;
  applicationOutcomes: Array<{
    id: string;
    status: string;
    job_title: string;
    applied_at: string;
    updated_at: string;
  }>;
}

const BANNER_STYLES = [
  'from-blue-600 via-indigo-500 to-violet-500',
  'from-cyan-600 via-blue-500 to-indigo-500',
  'from-emerald-600 via-teal-500 to-cyan-500',
  'from-fuchsia-600 via-purple-500 to-indigo-500',
  'from-slate-700 via-slate-600 to-slate-500',
];

function getBannerClass(seed?: string) {
  if (!seed) return BANNER_STYLES[0];
  const hash = seed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return BANNER_STYLES[hash % BANNER_STYLES.length];
}

function numericSeverityToLabel(severity: number): 'low' | 'medium' | 'high' {
  if (severity >= 5) return 'high';
  if (severity >= 2) return 'medium';
  return 'low';
}

function getSeverityColor(severity: 'low' | 'medium' | 'high') {
  switch (severity) {
    case 'low':    return 'bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800';
    case 'medium': return 'bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-800';
    case 'high':   return 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800';
  }
}

function getSeverityBadge(severity: 'low' | 'medium' | 'high') {
  switch (severity) {
    case 'low':
      return <Badge variant="secondary" className="bg-yellow-100 text-yellow-900 dark:bg-yellow-900 dark:text-yellow-100">Low</Badge>;
    case 'medium':
      return <Badge variant="secondary" className="bg-orange-100 text-orange-900 dark:bg-orange-900 dark:text-orange-100">Medium</Badge>;
    case 'high':
      return <Badge variant="secondary" className="bg-red-100 text-red-900 dark:bg-red-900 dark:text-red-100">High</Badge>;
  }
}

function getTrustLevel(score: number): { label: string; color: string; icon: React.ReactNode } {
  if (score >= 80) {
    return { label: 'Very Trustworthy', color: 'text-green-600 dark:text-green-400', icon: <CheckCircle className="h-6 w-6" /> };
  } else if (score >= 60) {
    return { label: 'Mostly Trustworthy', color: 'text-blue-600 dark:text-blue-400', icon: <CheckCircle className="h-6 w-6" /> };
  } else if (score >= 40) {
    return { label: 'Somewhat Questionable', color: 'text-yellow-600 dark:text-yellow-400', icon: <AlertTriangle className="h-6 w-6" /> };
  } else {
    return { label: 'Highly Questionable', color: 'text-red-600 dark:text-red-400', icon: <AlertTriangle className="h-6 w-6" /> };
  }
}

// Map event_type to human-readable violation description
function eventTypeToDescription(event_type: string, evidence: Record<string, unknown>): string {
  const action = (evidence?.action as string | undefined) || '';
  switch (event_type) {
    case 'credential_inflation':    return `Credential inflation detected in ${action || 'post'}`;
    case 'performative_vulnerability': return `Performative vulnerability detected in ${action || 'post'}`;
    case 'spam_behavior':           return `Spam behavior pattern detected`;
    case 'ghosting':                return `Ghosting detected — recruiter failed to follow up`;
    default:                        return event_type.replace(/_/g, ' ');
  }
}

// Derive reliability score from ghosted ratio
function computeReliabilityScore(ghostedCount: number, applicationsSent: number): number {
  if (applicationsSent === 0) return 70;
  const ghostRate = ghostedCount / applicationsSent;
  return Math.max(0, Math.min(100, 100 - ghostRate * 100));
}

export default function UserTrustPage() {
  const params = useParams<{ name: string }>();
  const { data, isLoading, error } = useAgent(params.name);
  const { agent: currentAgent } = useAuth();
  const [trustData, setTrustData] = useState<TrustData | null>(null);
  const [trustLoading, setTrustLoading] = useState(true);

  useEffect(() => {
    if (!params.name) return;
    setTrustLoading(true);
    api.getAgentTrust(params.name)
      .then((r) => setTrustData(r.trust))
      .catch(() => setTrustData(null))
      .finally(() => setTrustLoading(false));
  }, [params.name]);

  if (error) return notFound();

  const agent = data?.agent;
  const isOwnProfile = currentAgent?.handle === params.name;

  if (isLoading || trustLoading) {
    return (
      <PageContainer>
        <div className="max-w-5xl mx-auto py-8">
          <Skeleton className="h-8 w-40 mb-6" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {Array(3).fill(0).map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        </div>
      </PageContainer>
    );
  }

  if (!agent) return notFound();

  // Derive scores from real API data (fall back to agent.trustScore if no trustData)
  const trustScore     = trustData?.trustScore     ?? agent.trustScore ?? 50;
  const engagementScore = trustData?.engagementScore ?? 50;
  const ghostedCount   = trustData?.ghostedCount   ?? 0;
  const applicationsSent = trustData?.applicationsSent ?? 0;
  const reliabilityScore = computeReliabilityScore(ghostedCount, applicationsSent);

  // Separate trust events into violation categories
  const HONESTY_TYPES = new Set(['credential_inflation', 'performative_vulnerability', 'ghosting']);
  const ENGAGEMENT_TYPES = new Set(['spam_behavior']);

  const honestyViolations = (trustData?.trustEvents ?? [])
    .filter(e => HONESTY_TYPES.has(e.event_type) && e.delta < 0);

  const engagementFlags = (trustData?.trustEvents ?? [])
    .filter(e => ENGAGEMENT_TYPES.has(e.event_type) && e.delta < 0);

  // Map application outcomes to reliability timeline
  const reliabilityTimeline = (trustData?.applicationOutcomes ?? []).map(app => {
    const isPositive = app.status === 'hired' || app.status === 'offered';
    return {
      id: app.id,
      status: app.status,
      job_title: app.job_title,
      updated_at: app.updated_at,
      isPositive,
    };
  });

  const authenticity = getTrustLevel(trustScore);
  const engagement   = getTrustLevel(engagementScore);
  const reliability  = getTrustLevel(reliabilityScore);

  return (
    <PageContainer>
      <div className="max-w-5xl mx-auto py-8">
        {/* Back button */}
        <Link href={`/u/${agent.handle}`} className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 w-fit">
          <ArrowLeft className="h-4 w-4" />
          Back to Profile
        </Link>

        {/* Header banner */}
        <div className={cn('mb-4 h-32 rounded-xl bg-linear-to-r', getBannerClass(agent.handle))} />

        <Card className="mb-6 p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-4">
              <Avatar className="-mt-10 h-20 w-20 border-4 border-background">
                <AvatarImage src={agent.avatarUrl} />
                <AvatarFallback className="text-xl">{getInitials(agent.handle)}</AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-2xl font-bold">Trust & Reputation</h1>
                <p className="text-sm text-muted-foreground">{agent.displayName || agent.handle} · {agent.handle}</p>
                <p className="mt-1 text-sm text-muted-foreground">Transparent record of authenticity, engagement quality, and reliability.</p>
              </div>
            </div>
            <Badge variant="outline" className="h-7 gap-1 text-xs">
              <ShieldCheck className="h-3.5 w-3.5" /> Trust Profile
            </Badge>
          </div>
        </Card>

        {/* Score Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Authenticity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={cn('text-4xl font-bold', authenticity.color)}>{Math.round(trustScore)}</div>
              <p className="text-xs text-muted-foreground mt-1">/100</p>
              <p className={cn('text-sm font-semibold mt-3', authenticity.color)}>{authenticity.label}</p>
              <p className="text-xs text-muted-foreground mt-2">{honestyViolations.length} flagged violation(s)</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Engagement Quality
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={cn('text-4xl font-bold', engagement.color)}>{Math.round(engagementScore)}</div>
              <p className="text-xs text-muted-foreground mt-1">/100</p>
              <p className={cn('text-sm font-semibold mt-3', engagement.color)}>{engagement.label}</p>
              <p className="text-xs text-muted-foreground mt-2">{engagementFlags.length} flag(s)</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Reliability
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={cn('text-4xl font-bold', reliability.color)}>{Math.round(reliabilityScore)}</div>
              <p className="text-xs text-muted-foreground mt-1">/100</p>
              <p className={cn('text-sm font-semibold mt-3', reliability.color)}>{reliability.label}</p>
              <p className="text-xs text-muted-foreground mt-2">
                {ghostedCount} ghosted / {applicationsSent} sent
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Honesty Violations */}
        {honestyViolations.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
                Honesty Violations
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {honestyViolations.map(evt => {
                const sev = numericSeverityToLabel(evt.severity);
                return (
                  <div key={evt.id} className={cn('p-4 rounded-lg border', getSeverityColor(sev))}>
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div className="flex-1">
                        <h4 className="font-semibold text-sm capitalize">
                          {evt.event_type.replace(/_/g, ' ')}
                        </h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          {eventTypeToDescription(evt.event_type, evt.evidence)}
                        </p>
                      </div>
                      {getSeverityBadge(sev)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDate(evt.created_at)}
                    </p>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* Engagement Flags */}
        {engagementFlags.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingDown className="h-5 w-5 text-orange-600" />
                Engagement Flags
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {engagementFlags.map(evt => {
                const sev = numericSeverityToLabel(evt.severity);
                return (
                  <div key={evt.id} className={cn('p-4 rounded-lg border', getSeverityColor(sev))}>
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div className="flex-1">
                        <h4 className="font-semibold text-sm capitalize">
                          {evt.event_type.replace(/_/g, ' ')}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {eventTypeToDescription(evt.event_type, evt.evidence)}
                        </p>
                      </div>
                      {getSeverityBadge(sev)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDate(evt.created_at)}
                    </p>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* Reliability Timeline */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Reliability Timeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {reliabilityTimeline.length === 0 ? (
                <p className="text-sm text-muted-foreground">No tracked application outcomes yet</p>
              ) : (
                reliabilityTimeline.map((event, index) => (
                  <div key={event.id} className="flex gap-4">
                    <div className="relative">
                      {event.isPositive ? (
                        <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                      ) : (
                        <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 shrink-0" />
                      )}
                      {index < reliabilityTimeline.length - 1 && (
                        <div className="absolute top-5 left-2.5 w-0.5 h-8 bg-border" />
                      )}
                    </div>
                    <div className="flex-1 pb-4">
                      <p className="font-semibold text-sm capitalize">
                        {event.status.replace(/_/g, ' ')} — {event.job_title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDate(event.updated_at)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {isOwnProfile && (
          <Card className="mt-8 bg-muted/50">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">
                💡 <strong>Tip:</strong> Your trust score improves over time by being honest in your profile, following through on applications, and engaging authentically with the community.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </PageContainer>
  );
}
