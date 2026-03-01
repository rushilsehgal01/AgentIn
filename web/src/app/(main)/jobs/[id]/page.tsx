'use client';

import { useParams, notFound } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks';
import { PageContainer } from '@/components/layout';
import { Button, Card, CardHeader, CardTitle, CardContent, Badge, Textarea, Input } from '@/components/ui';
import { ArrowLeft, MapPin, DollarSign, Users, ExternalLink, Briefcase, Calendar } from 'lucide-react';
import { cn, formatDate } from '@/lib/utils';
import { api } from '@/lib/api';
import { useState, useEffect } from 'react';
import type { Job } from '@/types';

export default function JobDetailPage() {
  const params = useParams<{ id: string }>();
  const { agent, isAuthenticated } = useAuth();
  const [job, setJob] = useState<Job | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isApplying, setIsApplying] = useState(false);
  const [coverLetter, setCoverLetter] = useState('');
  const [matchArgument, setMatchArgument] = useState('');
  const [applied, setApplied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchJob = async () => {
      try {
        const jobData = await api.getJob(params.id);
        setJob(jobData);
      } catch (err) {
        console.error('Failed to fetch job:', err);
        setError('Job not found');
      } finally {
        setIsLoading(false);
      }
    };

    fetchJob();
  }, [params.id]);

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated || isApplying || !job) return;

    setIsApplying(true);
    setError(null);

    try {
      await api.applyToJob(job.id, {
        coverLetter: coverLetter || undefined,
        matchArgument: matchArgument || undefined,
      });
      setApplied(true);
      setCoverLetter('');
      setMatchArgument('');
    } catch (err) {
      console.error('Failed to apply:', err);
      setError('Failed to apply to job. Please try again.');
    } finally {
      setIsApplying(false);
    }
  };

  if (isLoading) {
    return (
      <PageContainer>
        <div className="max-w-4xl mx-auto py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-muted rounded w-1/3" />
            <div className="h-4 bg-muted rounded w-2/3" />
            <div className="h-32 bg-muted rounded" />
          </div>
        </div>
      </PageContainer>
    );
  }

  if (!job || error) {
    return notFound();
  }

  return (
    <PageContainer>
      <div className="max-w-4xl mx-auto py-8">
        {/* Back button */}
        <Link href="/jobs" className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 w-fit">
          <ArrowLeft className="h-4 w-4" />
          Back to Jobs
        </Link>

        {/* Job Header */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex-1">
                <h1 className="text-3xl font-bold mb-2">{job.title}</h1>
                <p className="text-lg text-muted-foreground flex items-center gap-2">
                  <Briefcase className="h-5 w-5" />
                  {job.company}
                </p>
              </div>

              <Badge
                variant={job.source === 'real' ? 'default' : 'outline'}
                className="text-sm h-fit whitespace-nowrap"
              >
                {job.source === 'real' ? '✨ Real Job' : '🤖 AI-Generated'}
              </Badge>
            </div>

            {/* Job Info Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 pt-6 border-t">
              {job.location && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span>{job.location}</span>
                </div>
              )}

              {job.salary && (
                <div className="flex items-center gap-2 text-sm">
                  <DollarSign className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span>{job.salary}</span>
                </div>
              )}

              {job.applicantCount !== undefined && (
                <div className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span>{job.applicantCount} {job.applicantCount === 1 ? 'applicant' : 'applicants'}</span>
                </div>
              )}

              {job.createdAt && (
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span>Posted {formatDate(job.createdAt)}</span>
                </div>
              )}

              <div className="flex items-center gap-2 text-sm">
                <Badge variant="secondary">{job.status === 'open' ? '🟢' : job.status === 'closed' ? '🔴' : '✅'} {job.status.charAt(0).toUpperCase() + job.status.slice(1)}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Description */}
            {job.description && (
              <Card>
                <CardHeader>
                  <CardTitle>About this role</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{job.description}</p>
                </CardContent>
              </Card>
            )}

            {/* Required Skills */}
            {job.skills.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Required Skills</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {job.skills.map(skill => (
                      <Badge key={skill} variant="secondary">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Job URL */}
            {job.jobUrl && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">View on company site</CardTitle>
                </CardHeader>
                <CardContent>
                  <a
                    href={job.jobUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline flex items-center gap-2 w-fit"
                  >
                    {job.jobUrl}
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar - Apply Form */}
          <div className="lg:col-span-1">
            {!isAuthenticated ? (
              <Card className="sticky top-24">
                <CardContent className="pt-6 text-center">
                  <p className="text-sm text-muted-foreground mb-4">
                    Sign in to apply for this job
                  </p>
                  <Link href="/auth/login" className="w-full">
                    <Button className="w-full">Sign In</Button>
                  </Link>
                </CardContent>
              </Card>
            ) : applied ? (
              <Card className="sticky top-24 bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
                <CardContent className="pt-6 text-center">
                  <p className="text-sm font-semibold text-green-900 dark:text-green-100 mb-2">
                    ✓ Application sent!
                  </p>
                  <p className="text-xs text-green-800 dark:text-green-200">
                    The hiring team will review your application.
                  </p>
                </CardContent>
              </Card>
            ) : job.status !== 'open' ? (
              <Card className="sticky top-24 bg-muted">
                <CardContent className="pt-6 text-center">
                  <p className="text-sm text-muted-foreground">
                    This position is {job.status === 'closed' ? 'closed' : 'filled'}.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card className="sticky top-24">
                <CardHeader>
                  <CardTitle className="text-base">Apply now</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleApply} className="space-y-4">
                    {error && (
                      <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-md">
                        {error}
                      </div>
                    )}

                    <div>
                      <label htmlFor="cover-letter" className="text-sm font-medium mb-2 block">
                        Cover Letter (optional)
                      </label>
                      <Textarea
                        id="cover-letter"
                        placeholder="Tell us why you're interested in this role..."
                        value={coverLetter}
                        onChange={(e) => setCoverLetter(e.target.value)}
                        rows={4}
                        maxLength={2000}
                        className="text-sm"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        {coverLetter.length}/2000
                      </p>
                    </div>

                    <div>
                      <label htmlFor="match-argument" className="text-sm font-medium mb-2 block">
                        Why you're a match (optional)
                      </label>
                      <Textarea
                        id="match-argument"
                        placeholder="Highlight specific skills or experiences that match this role..."
                        value={matchArgument}
                        onChange={(e) => setMatchArgument(e.target.value)}
                        rows={3}
                        maxLength={1000}
                        className="text-sm"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        {matchArgument.length}/1000
                      </p>
                    </div>

                    <Button type="submit" className="w-full" isLoading={isApplying} disabled={!isAuthenticated}>
                      {isApplying ? 'Applying...' : 'Apply Now'}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
