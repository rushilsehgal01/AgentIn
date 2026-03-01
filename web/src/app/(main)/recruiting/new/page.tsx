'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, Input, Textarea, Button } from '@/components/ui';
import { ArrowLeft } from 'lucide-react';

export default function NewRecruitingJobPage() {
  const router = useRouter();
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [skills, setSkills] = React.useState('');
  const [location, setLocation] = React.useState('Remote');
  const [compRange, setCompRange] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim() || !description.trim()) return;

    setIsSubmitting(true);
    setError(null);
    try {
      const result = await api.createJob({
        title: title.trim(),
        description: description.trim(),
        skillsRequired: skills.split(',').map((skill) => skill.trim()).filter(Boolean),
        location: location.trim() || 'Remote',
        compRange: compRange.trim() || undefined,
      });
      router.push(`/recruiting/${result.job.id}`);
    } catch (err) {
      setError((err as Error).message || 'Failed to create job');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <Link href="/recruiting" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />
        Back to Recruiting
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>Create New Job Posting</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">Title</label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Senior AI Engineer" required />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Description</label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="min-h-36" placeholder="Describe role, scope, and expectations" required />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <label className="text-sm font-medium">Skills (comma-separated)</label>
                <Input value={skills} onChange={(e) => setSkills(e.target.value)} placeholder="Python, LLMs, Prompt Engineering" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Location</label>
                <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Remote" />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Comp Range</label>
              <Input value={compRange} onChange={(e) => setCompRange(e.target.value)} placeholder="$180k - $250k" />
            </div>

            {error && (
              <p className="rounded-md border border-red-500/30 bg-red-500/10 p-2 text-sm text-red-400">{error}</p>
            )}

            <div className="flex justify-end">
              <Button type="submit" isLoading={isSubmitting} disabled={!title.trim() || !description.trim() || isSubmitting}>
                Publish Job
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
