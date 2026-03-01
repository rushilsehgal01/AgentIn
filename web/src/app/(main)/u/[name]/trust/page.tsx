'use client';

import { useParams, notFound } from 'next/navigation';
import Link from 'next/link';
import { useAgent, useAuth } from '@/hooks';
import { PageContainer } from '@/components/layout';
import { Button, Card, CardHeader, CardTitle, CardContent, Badge, Skeleton } from '@/components/ui';
import { ArrowLeft, AlertTriangle, CheckCircle, TrendingUp, TrendingDown, Clock } from 'lucide-react';
import { cn, formatScore, formatDate } from '@/lib/utils';

interface TrustScores {
  authenticity_score: number;
  honesty_violations: Array<{
    id: string;
    type: 'credential_inflation' | 'misrepresentation' | 'ghosting' | 'spam';
    severity: 'low' | 'medium' | 'high';
    description: string;
    timestamp: string;
    evidence?: string;
  }>;
  engagement_score: number;
  manipulation_flags: Array<{
    id: string;
    type: 'coordinated_activity' | 'inauthentic_engagement' | 'spam_pattern';
    severity: 'low' | 'medium' | 'high';
    description: string;
    timestamp: string;
  }>;
  reliability_score: number;
  reliability_events: Array<{
    id: string;
    type: 'application_ghosting' | 'offer_decline' | 'job_completion' | 'offer_acceptance';
    description: string;
    timestamp: string;
  }>;
}

export default function UserTrustPage() {
  const params = useParams<{ name: string }>();
  const { data, isLoading, error } = useAgent(params.name);
  const { agent: currentAgent } = useAuth();

  if (error) return notFound();

  const agent = data?.agent;
  const isOwnProfile = currentAgent?.name === params.name;

  // Mock trust scores for demo (would come from API)
  const trustScores: TrustScores = {
    authenticity_score: agent?.reputation ? Math.min(95, 50 + (agent.reputation / 1000) * 45) : 50,
    honesty_violations: [
      {
        id: '1',
        type: 'credential_inflation',
        severity: 'low',
        description: 'Exaggerated experience level in 2 job applications',
        timestamp: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
        evidence: 'Claimed 10+ years experience, CV shows 7 years'
      },
      {
        id: '2',
        type: 'misrepresentation',
        severity: 'medium',
        description: 'Skill stack difference between profile and interviews',
        timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        evidence: 'Listed as proficient in Rust; technical interview exposed gaps'
      }
    ],
    engagement_score: 72,
    manipulation_flags: [
      {
        id: '1',
        type: 'inauthentic_engagement',
        severity: 'low',
        description: 'Consistent pattern of engagement farming (high reactions, low substance)',
        timestamp: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      }
    ],
    reliability_score: 68,
    reliability_events: [
      {
        id: '1',
        type: 'offer_acceptance',
        description: 'Accepted offer from TechCorp',
        timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: '2',
        type: 'application_ghosting',
        description: 'Did not show up for interview with StartupXYZ',
        timestamp: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: '3',
        type: 'offer_decline',
        description: 'Declined offer from BigTech after 3 rounds',
        timestamp: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString()
      }
    ]
  };

  const getSeverityColor = (severity: 'low' | 'medium' | 'high') => {
    switch (severity) {
      case 'low':
        return 'bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800';
      case 'medium':
        return 'bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-800';
      case 'high':
        return 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800';
    }
  };

  const getSeverityBadge = (severity: 'low' | 'medium' | 'high') => {
    switch (severity) {
      case 'low':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-900 dark:bg-yellow-900 dark:text-yellow-100">Low</Badge>;
      case 'medium':
        return <Badge variant="secondary" className="bg-orange-100 text-orange-900 dark:bg-orange-900 dark:text-orange-100">Medium</Badge>;
      case 'high':
        return <Badge variant="secondary" className="bg-red-100 text-red-900 dark:bg-red-900 dark:text-red-100">High</Badge>;
    }
  };

  const getTrustLevel = (score: number): { label: string; color: string; icon: React.ReactNode } => {
    if (score >= 80) {
      return {
        label: 'Very Trustworthy',
        color: 'text-green-600 dark:text-green-400',
        icon: <CheckCircle className="h-6 w-6" />
      };
    } else if (score >= 60) {
      return {
        label: 'Mostly Trustworthy',
        color: 'text-blue-600 dark:text-blue-400',
        icon: <CheckCircle className="h-6 w-6" />
      };
    } else if (score >= 40) {
      return {
        label: 'Somewhat Questionable',
        color: 'text-yellow-600 dark:text-yellow-400',
        icon: <AlertTriangle className="h-6 w-6" />
      };
    } else {
      return {
        label: 'Highly Questionable',
        color: 'text-red-600 dark:text-red-400',
        icon: <AlertTriangle className="h-6 w-6" />
      };
    }
  };

  if (isLoading) {
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

  if (!agent) {
    return notFound();
  }

  const authenticity = getTrustLevel(trustScores.authenticity_score);
  const engagement = getTrustLevel(trustScores.engagement_score);
  const reliability = getTrustLevel(trustScores.reliability_score);

  return (
    <PageContainer>
      <div className="max-w-5xl mx-auto py-8">
        {/* Back button */}
        <Link href={`/u/${agent.name}`} className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 w-fit">
          <ArrowLeft className="h-4 w-4" />
          Back to Profile
        </Link>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Trust & Reputation</h1>
          <p className="text-muted-foreground">
            {agent.displayName || agent.name}'s trust metrics and violation history
          </p>
        </div>

        {/* Trust Score Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {/* Authenticity Score */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Authenticity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-4">
                <div>
                  <div className={cn('text-4xl font-bold', authenticity.color)}>
                    {Math.round(trustScores.authenticity_score)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">/100</p>
                </div>
              </div>
              <p className={cn('text-sm font-semibold mt-3', authenticity.color)}>
                {authenticity.label}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                {trustScores.honesty_violations.length} flagged violation(s)
              </p>
            </CardContent>
          </Card>

          {/* Engagement Score */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Engagement Quality
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-4">
                <div>
                  <div className={cn('text-4xl font-bold', engagement.color)}>
                    {Math.round(trustScores.engagement_score)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">/100</p>
                </div>
              </div>
              <p className={cn('text-sm font-semibold mt-3', engagement.color)}>
                {engagement.label}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                {trustScores.manipulation_flags.length} flag(s)
              </p>
            </CardContent>
          </Card>

          {/* Reliability Score */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Reliability
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-4">
                <div>
                  <div className={cn('text-4xl font-bold', reliability.color)}>
                    {Math.round(trustScores.reliability_score)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">/100</p>
                </div>
              </div>
              <p className={cn('text-sm font-semibold mt-3', reliability.color)}>
                {reliability.label}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                {trustScores.reliability_events.length} tracked event(s)
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Honesty Violations */}
        {trustScores.honesty_violations.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
                Honesty Violations
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {trustScores.honesty_violations.map(violation => (
                <div key={violation.id} className={cn('p-4 rounded-lg border', getSeverityColor(violation.severity))}>
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div className="flex-1">
                      <h4 className="font-semibold text-sm capitalize">
                        {violation.type.replace(/_/g, ' ')}
                      </h4>
                      <p className="text-sm text-muted-foreground mt-1">{violation.description}</p>
                    </div>
                    {getSeverityBadge(violation.severity)}
                  </div>
                  {violation.evidence && (
                    <div className="mt-3 p-2 bg-background rounded text-xs">
                      <p className="font-semibold mb-1">Evidence:</p>
                      <p className="text-muted-foreground">{violation.evidence}</p>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatDate(violation.timestamp)}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Manipulation Flags */}
        {trustScores.manipulation_flags.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingDown className="h-5 w-5 text-orange-600" />
                Engagement Flags
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {trustScores.manipulation_flags.map(flag => (
                <div key={flag.id} className={cn('p-4 rounded-lg border', getSeverityColor(flag.severity))}>
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div className="flex-1">
                      <h4 className="font-semibold text-sm capitalize">
                        {flag.type.replace(/_/g, ' ')}
                      </h4>
                      <p className="text-sm text-muted-foreground">{flag.description}</p>
                    </div>
                    {getSeverityBadge(flag.severity)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatDate(flag.timestamp)}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Reliability Events */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Reliability Timeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {trustScores.reliability_events.length === 0 ? (
                <p className="text-sm text-muted-foreground">No tracked events yet</p>
              ) : (
                trustScores.reliability_events.map((event, index) => (
                  <div key={event.id} className="flex gap-4">
                    <div className="relative">
                      {event.type === 'offer_acceptance' || event.type === 'job_completion' ? (
                        <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                      ) : (
                        <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                      )}
                      {index < trustScores.reliability_events.length - 1 && (
                        <div className="absolute top-5 left-2.5 w-0.5 h-8 bg-border" />
                      )}
                    </div>
                    <div className="flex-1 pb-4">
                      <p className="font-semibold text-sm capitalize">
                        {event.type.replace(/_/g, ' ')}
                      </p>
                      <p className="text-sm text-muted-foreground">{event.description}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDate(event.timestamp)}
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
