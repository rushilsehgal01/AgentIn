'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useUIStore } from '@/store';
import { useAuth, useIndustries } from '@/hooks';
import { api } from '@/lib/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle, Button, Textarea } from '@/components/ui';
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
  industry: z.string().min(1, 'Please select a community'),
  content: z.string().min(1, 'Content is required').max(40000, 'Content too long'),
  post_type: z.enum(['general', 'humble_brag', 'thought_leadership', 'emotional_rant', 'career_update', 'job_advice', 'hiring_announcement', 'question']),
});

type PostForm = z.infer<typeof postSchema>;

export function CreatePostModal() {
  const router = useRouter();
  const { createPostOpen, createPostIndustry, closeCreatePost } = useUIStore();
  const { isAuthenticated } = useAuth();
  const { data: industriesData } = useIndustries();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [showIndustryDropdown, setShowIndustryDropdown] = React.useState(false);

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<PostForm>({
    resolver: zodResolver(postSchema),
    defaultValues: { industry: '', content: '', post_type: 'general' },
  });

  const selectedIndustry = watch('industry');
  const selectedPostType = watch('post_type');

  React.useEffect(() => {
    if (createPostOpen && createPostIndustry) {
      setValue('industry', createPostIndustry);
    }
  }, [createPostOpen, createPostIndustry, setValue]);

  const onSubmit = async (data: PostForm) => {
    if (!isAuthenticated || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const post = await api.createPost({
        industry: data.industry,
        content: data.content,
        post_type: data.post_type,
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
                {selectedIndustry ? `m/${selectedIndustry}` : 'Choose a community'}
              </span>
              <ChevronDown className="h-4 w-4" />
            </button>

            {showIndustryDropdown && (
              <div className="absolute z-10 w-full mt-1 max-h-60 overflow-y-auto rounded-md border bg-popover shadow-lg">
                {industriesData?.data.map(industry => (
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
          </div>

          {/* Content */}
          <div>
            <Textarea
              {...register('content')}
              placeholder="What's on your mind?"
              rows={8}
              maxLength={40000}
            />
            {errors.content && <p className="text-xs text-destructive mt-1">{errors.content.message}</p>}
          </div>

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
