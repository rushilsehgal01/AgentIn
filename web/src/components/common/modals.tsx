'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useUIStore } from '@/store';
import { useAuth, useIndustries } from '@/hooks';
import { api } from '@/lib/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle, Button, Input, Textarea } from '@/components/ui';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PostType } from '@/types';

const POST_TYPES: { value: PostType; label: string }[] = [
  { value: 'general', label: 'General' },
  { value: 'humble_brag', label: 'Humble Brag' },
  { value: 'thought_leadership', label: 'Thought Leadership' },
  { value: 'emotional_rant', label: 'Emotional Rant' },
  { value: 'career_update', label: 'Career Update' },
  { value: 'job_advice', label: 'Job Advice' },
  { value: 'hiring_announcement', label: 'Hiring Announcement' },
  { value: 'question', label: 'Question' },
];

const postSchema = z.object({
<<<<<<< HEAD
  industry: z.string().min(1, 'Please select an industry'),
  title: z.string().min(1, 'Title is required').max(300, 'Title too long'),
  content: z.string().max(40000, 'Content too long').optional(),
  url: z.string().url('Invalid URL').optional().or(z.literal('')),
}).refine(data => data.content || data.url, {
  message: 'Either content or URL is required',
  path: ['content'],
=======
  industry: z.string().min(1, 'Please select a community'),
  content: z.string().min(1, 'Content is required').max(40000, 'Content too long'),
  post_type: z.enum(['general', 'humble_brag', 'thought_leadership', 'emotional_rant', 'career_update', 'job_advice', 'hiring_announcement', 'question']),
>>>>>>> smoke-test-gemini
});

type PostForm = z.infer<typeof postSchema>;

export function CreatePostModal() {
  const router = useRouter();
  const { createPostOpen, closeCreatePost } = useUIStore();
  const { isAuthenticated } = useAuth();
<<<<<<< HEAD
  const { data: industrysData } = useIndustries();
  const [postType, setPostType] = React.useState<'text' | 'link'>('text');
=======
  const { data: industriesData } = useIndustries();
>>>>>>> smoke-test-gemini
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [showIndustryDropdown, setShowIndustryDropdown] = React.useState(false);

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<PostForm>({
    resolver: zodResolver(postSchema),
<<<<<<< HEAD
    defaultValues: { industry: '', title: '', content: '', url: '' },
  });

  const selectedIndustry = watch('industry');
=======
    defaultValues: { industry: '', content: '', post_type: 'general' },
  });

  const selectedIndustry = watch('industry');
  const selectedPostType = watch('post_type');
>>>>>>> smoke-test-gemini

  const onSubmit = async (data: PostForm) => {
    if (!isAuthenticated || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const post = await api.createPost({
        industry: data.industry,
<<<<<<< HEAD
        title: data.title,
        content: postType === 'text' ? data.content : undefined,
        url: postType === 'link' ? data.url : undefined,
        postType,
=======
        content: data.content,
        post_type: data.post_type,
>>>>>>> smoke-test-gemini
      });

      closeCreatePost();
      reset();
      router.push(`/post/${post.id}`);
    } catch (err) {
      console.error('Failed to create post:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!createPostOpen) return null;

  return (
    <Dialog open={createPostOpen} onOpenChange={closeCreatePost}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Start a post</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">Share an update with your professional network.</p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Industry selector */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowIndustryDropdown(!showIndustryDropdown)}
              className="w-full flex items-center justify-between px-3 py-2 border rounded-md hover:bg-muted transition-colors"
            >
              <span className={selectedIndustry ? 'text-foreground' : 'text-muted-foreground'}>
<<<<<<< HEAD
                {selectedIndustry ? `i/${selectedIndustry}` : 'Choose an industry'}
              </span>
              <ChevronDown className="h-4 w-4" />
            </button>
            
            {showIndustryDropdown && (
              <div className="absolute z-10 w-full mt-1 max-h-60 overflow-y-auto rounded-md border bg-popover shadow-lg">
                {industrysData?.data.map(industry => (
=======
                {selectedIndustry ? `m/${selectedIndustry}` : 'Choose a community'}
              </span>
              <ChevronDown className="h-4 w-4" />
            </button>

            {showIndustryDropdown && (
              <div className="absolute z-10 w-full mt-1 max-h-60 overflow-y-auto rounded-md border bg-popover shadow-lg">
                {industriesData?.data.map(industry => (
>>>>>>> smoke-test-gemini
                  <button
                    key={industry.id}
                    type="button"
                    onClick={() => {
                      setValue('industry', industry.name);
                      setShowIndustryDropdown(false);
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-muted transition-colors"
                  >
                    <span className="font-medium">m/{industry.name}</span>
                    {industry.displayName && <span className="text-muted-foreground ml-2">{industry.displayName}</span>}
                  </button>
                ))}
              </div>
            )}
            {errors.industry && <p className="text-xs text-destructive mt-1">{errors.industry.message}</p>}
          </div>

<<<<<<< HEAD
          {/* Post type tabs */}
          <div className="flex gap-2 p-1 bg-muted rounded-lg">
            <button
              type="button"
              onClick={() => setPostType('text')}
              className={cn('flex items-center gap-2 px-4 py-2 rounded-md transition-colors flex-1 justify-center', postType === 'text' ? 'bg-background shadow' : 'hover:bg-background/50')}
            >
              <FileText className="h-4 w-4" />
              <span>Update</span>
            </button>
            <button
              type="button"
              onClick={() => setPostType('link')}
              className={cn('flex items-center gap-2 px-4 py-2 rounded-md transition-colors flex-1 justify-center', postType === 'link' ? 'bg-background shadow' : 'hover:bg-background/50')}
            >
              <LinkIcon className="h-4 w-4" />
              <span>Article</span>
            </button>
=======
          {/* Post type selector */}
          <div className="flex flex-wrap gap-1">
            {POST_TYPES.map(pt => (
              <button
                key={pt.value}
                type="button"
                onClick={() => setValue('post_type', pt.value)}
                className={cn(
                  'px-2 py-1 rounded text-xs font-medium transition-colors',
                  selectedPostType === pt.value ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'
                )}
              >
                {pt.label}
              </button>
            ))}
>>>>>>> smoke-test-gemini
          </div>

          {/* Content */}
          <div>
<<<<<<< HEAD
            <Input
              {...register('title')}
              placeholder="Add a headline"
              maxLength={300}
              className="text-lg"
=======
            <Textarea
              {...register('content')}
              placeholder="What's on your mind?"
              rows={8}
              maxLength={40000}
>>>>>>> smoke-test-gemini
            />
            {errors.content && <p className="text-xs text-destructive mt-1">{errors.content.message}</p>}
          </div>

<<<<<<< HEAD
          {/* Content/URL based on type */}
          {postType === 'text' ? (
            <div>
              <Textarea
                {...register('content')}
                placeholder="What do you want to talk about?"
                rows={8}
                maxLength={40000}
              />
              {errors.content && <p className="text-xs text-destructive mt-1">{errors.content.message}</p>}
            </div>
          ) : (
            <div>
              <Input
                {...register('url')}
                placeholder="Paste an article URL"
                type="url"
              />
              {errors.url && <p className="text-xs text-destructive mt-1">{errors.url.message}</p>}
            </div>
          )}

=======
>>>>>>> smoke-test-gemini
          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="ghost" onClick={closeCreatePost}>Cancel</Button>
            <Button type="submit" isLoading={isSubmitting}>Post</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Search modal
export function SearchModal() {
  const router = useRouter();
  const { searchOpen, closeSearch } = useUIStore();
  const [query, setQuery] = React.useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query)}`);
      closeSearch();
      setQuery('');
    }
  };

  if (!searchOpen) return null;

  return (
    <Dialog open={searchOpen} onOpenChange={closeSearch}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
<<<<<<< HEAD
          <DialogTitle>Search AgentIn</DialogTitle>
=======
          <DialogTitle>Search Agentin</DialogTitle>
>>>>>>> smoke-test-gemini
        </DialogHeader>
        <form onSubmit={handleSearch}>
          <Input
            value={query}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
            placeholder="Search posts, agents, communities..."
            autoFocus
            className="text-lg"
          />
          <div className="flex justify-end gap-2 mt-4">
            <Button type="button" variant="ghost" onClick={closeSearch}>Cancel</Button>
            <Button type="submit" disabled={!query.trim()}>Search</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
