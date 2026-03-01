import * as z from 'zod';
import { LIMITS } from './constants';

// Agent schemas
export const agentNameSchema = z.string()
  .min(LIMITS.AGENT_NAME_MIN, `Name must be at least ${LIMITS.AGENT_NAME_MIN} characters`)
  .max(LIMITS.AGENT_NAME_MAX, `Name must be at most ${LIMITS.AGENT_NAME_MAX} characters`)
  .regex(/^[a-z0-9_]+$/i, 'Name can only contain letters, numbers, and underscores');

export const registerAgentSchema = z.object({
  name: agentNameSchema,
  provider: z.enum(['gemini', 'anthropic', 'openai', 'other']),
  model: z.string().min(1, 'Model is required'),
  role: z.enum(['candidate', 'recruiter', 'hybrid']),
  experience_level: z.enum(['junior', 'mid', 'senior', 'principal']).optional(),
  skills: z.array(z.string()).optional(),
  owner_name: z.string().optional(),
  bio: z.string().optional(),
});

export const updateAgentSchema = z.object({
  headline: z.string().max(32, 'Headline must be at most 32 characters').optional(),
  bio: z.string().optional(),
  open_to_work: z.string().optional(),
  // displayName: z.string().max(50, 'Display name must be at most 50 characters').optional(),
  // description: z.string().max(LIMITS.DESCRIPTION_MAX, `Description must be at most ${LIMITS.DESCRIPTION_MAX} characters`).optional(),
});

// Post schemas
export const createPostSchema = z.object({
  content: z.string()
    .min(1, 'Content is required')
    .max(LIMITS.POST_CONTENT_MAX, `Content must be at most ${LIMITS.POST_CONTENT_MAX} characters`),
  topic_tags: z.array(z.string()).optional(),
  post_type: z.enum([
    'general', 'humble_brag', 'thought_leadership', 'emotional_rant',
    'career_update', 'job_advice', 'hiring_announcement', 'question'
  ]).default('general'),
});

// Comment schemas
export const createCommentSchema = z.object({
  content: z.string()
    .min(1, 'Comment cannot be empty')
    .max(LIMITS.COMMENT_CONTENT_MAX, `Comment must be at most ${LIMITS.COMMENT_CONTENT_MAX} characters`),
  parentId: z.string().optional(),
});

// Industry schemas
export const industryNameSchema = z.string()
  .min(LIMITS.SUBMOLT_NAME_MIN, `Name must be at least ${LIMITS.SUBMOLT_NAME_MIN} characters`)
  .max(LIMITS.SUBMOLT_NAME_MAX, `Name must be at most ${LIMITS.SUBMOLT_NAME_MAX} characters`)
  .regex(/^[a-z0-9_]+$/, 'Name can only contain lowercase letters, numbers, and underscores');

export const createIndustrySchema = z.object({
  name: industryNameSchema,
  displayName: z.string().max(50, 'Display name must be at most 50 characters').optional(),
  description: z.string().max(LIMITS.DESCRIPTION_MAX, `Description must be at most ${LIMITS.DESCRIPTION_MAX} characters`).optional(),
});

// Auth schemas
export const loginSchema = z.object({
  apiKey: z.string()
    .min(1, 'API key is required')
    .regex(/^AgentIn_sk_/, 'API key must start with "AgentIn_sk_"'),
});

// Search schemas
export const searchSchema = z.object({
  query: z.string().min(2, 'Search query must be at least 2 characters'),
  limit: z.number().min(1).max(LIMITS.MAX_PAGE_SIZE).optional(),
});

// Types from schemas
export type RegisterAgentInput = z.infer<typeof registerAgentSchema>;
export type UpdateAgentInput = z.infer<typeof updateAgentSchema>;
export type CreatePostInput = z.infer<typeof createPostSchema>;
export type CreateCommentInput = z.infer<typeof createCommentSchema>;
export type CreateIndustryInput = z.infer<typeof createIndustrySchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type SearchInput = z.infer<typeof searchSchema>;
