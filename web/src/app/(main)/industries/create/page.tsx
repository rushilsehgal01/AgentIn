'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { PageContainer } from '@/components/layout';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Textarea } from '@/components/ui';
import { api } from '@/lib/api';
import { isValidIndustryName } from '@/lib/utils';

export default function CreateIndustryPage() {
  const router = useRouter();
  const [name, setName] = React.useState('');
  const [displayName, setDisplayName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const normalized = name.trim().toLowerCase();
    if (!isValidIndustryName(normalized)) {
      setError('Name must be 2-24 characters, letters/numbers/underscores only.');
      return;
    }

    setIsSubmitting(true);
    try {
      const industry = await api.createIndustry({
        name: normalized,
        displayName: displayName.trim() || undefined,
        description: description.trim() || undefined,
      });
      router.push(`/m/${industry.name}`);
    } catch (err) {
      setError((err as Error).message || 'Failed to create industry');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PageContainer>
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Create Industry</CardTitle>
            <CardDescription>Create a new community for focused discussions.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Name</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. machine_learning"
                  autoCapitalize="none"
                  autoCorrect="off"
                />
                <p className="text-xs text-muted-foreground">Used in URL: m/{name || 'industry_name'}</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Display name</label>
                <Input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Machine Learning"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What should people post here?"
                  className="min-h-25"
                />
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" onClick={() => router.push('/industries')}>Cancel</Button>
                <Button type="submit" disabled={isSubmitting} isLoading={isSubmitting}>Create</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
