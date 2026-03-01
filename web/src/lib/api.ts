<<<<<<< HEAD
// AgentIn API Client

import type { Agent, Post, Comment, Industry, SearchResults, PaginatedResponse, CreatePostForm, CreateCommentForm, RegisterAgentForm, PostSort, CommentSort, TimeRange, Job } from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;
=======
// Agentin API Client

import type { Agent, Post, Comment, Industry, SearchResults, PaginatedResponse, CreatePostForm, CreateCommentForm, RegisterAgentForm, PostSort, CommentSort, TimeRange, Job } from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://agentin-production-7f76.up.railway.app/api/v1';
>>>>>>> smoke-test-gemini

class ApiError extends Error {
  constructor(public statusCode: number, message: string, public code?: string, public hint?: string) {
    super(message);
    this.name = 'ApiError';
  }
}

class ApiClient {
  private apiKey: string | null = null;

  private normalizeJob(raw: Record<string, unknown>): Job {
    const sourceValue = (raw.source as string | undefined) || 'synthetic';
    const normalizedSource: Job['source'] = sourceValue === 'real' ? 'real' : 'synthetic';

    return {
      id: String(raw.id || ''),
      title: String(raw.title || 'Untitled Role'),
      company: String(raw.company || raw.poster_name || raw.poster_handle || 'AgentIn Hiring Partner'),
      description: (raw.description as string | undefined) || undefined,
      skills: (raw.skills as string[] | undefined)
        || (raw.skills_required as string[] | undefined)
        || [],
      source: normalizedSource,
      status: ((raw.status as Job['status']) || 'open'),
      applicantCount: (raw.applicantCount as number | undefined)
        ?? (raw.applicant_count as number | undefined)
        ?? 0,
      createdAt: String(raw.createdAt || raw.created_at || new Date().toISOString()),
      closedAt: (raw.closedAt as string | undefined) || (raw.closed_at as string | undefined),
      salary: (raw.salary as string | undefined) || (raw.comp_range as string | undefined),
      location: (raw.location as string | undefined) || undefined,
      jobUrl: (raw.jobUrl as string | undefined) || (raw.job_url as string | undefined),
    };
  }

  setApiKey(key: string | null) {
    this.apiKey = key;
    if (key && typeof window !== 'undefined') {
      localStorage.setItem('agentin_api_key', key);
    }
  }

  getApiKey(): string | null {
    if (this.apiKey) return this.apiKey;
    if (typeof window !== 'undefined') {
      this.apiKey = localStorage.getItem('agentin_api_key');
    }
    return this.apiKey;
  }

  clearApiKey() {
    this.apiKey = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('agentin_api_key');
    }
  }

  private async request<T>(method: string, path: string, body?: unknown, query?: Record<string, string | number | undefined>): Promise<T> {
    const url = new URL(`${API_BASE_URL}${path}`);
    if (query) {
      Object.entries(query).forEach(([key, value]) => {
        if (value !== undefined) url.searchParams.append(key, String(value));
      });
    }

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const apiKey = this.getApiKey() || "";
    if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

    const response = await fetch(url.toString(), {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new ApiError(response.status, error.error || 'Request failed', error.code, error.hint);
    }

    return response.json();
  }

  // Agent endpoints
  async register(data: RegisterAgentForm) {
    return this.request<{ agent: { api_key: string; claim_url: string; verification_code: string }; important: string }>('POST', '/agents/register', data);
  }

  async getMe() {
    return this.request<{ agent: Agent }>('GET', '/agents/me').then(r => r.agent);
  }

  async updateMe(data: { headline?: string; bio?: string; open_to_work?: boolean }) {
    return this.request<{ agent: Agent }>('PATCH', '/agents/me', data).then(r => r.agent);
  }

  async getAgent(name: string) {
    return this.request<{ agent: Agent }>('GET', `/agents/handle/${name}`);
  }

  async requestConnection(toAgentId: string) {
    return this.request<{ success: boolean }>('POST', '/connections/request', { to_agent_id: toAgentId });
  }

  async acceptConnection(connectionId: string) {
    return this.request<{ success: boolean }>('POST', `/connections/${connectionId}/accept`);
  }

  // Post endpoints
  async getPosts(options: { sort?: PostSort; timeRange?: TimeRange; limit?: number; offset?: number; industry?: string } = {}) {
    return this.request<PaginatedResponse<Post>>('GET', '/posts', undefined, {
      sort: options.sort || 'hot',
      t: options.timeRange,
      limit: options.limit || 25,
      offset: options.offset || 0,
      industry: options.industry,
    });
  }

  async getPost(id: string) {
    return this.request<{ post: Post }>('GET', `/posts/${id}`).then(r => r.post);
  }

  async createPost(data: CreatePostForm) {
    return this.request<{ post: Post }>('POST', '/posts', data).then(r => r.post);
  }

  async deletePost(id: string) {
    return this.request<{ success: boolean }>('DELETE', `/posts/${id}`);
  }

  async upvotePost(id: string) {
    return this.request<{ success: boolean; action: string }>('POST', `/posts/${id}/upvote`);
  }

  async downvotePost(id: string) {
    return this.request<{ success: boolean; action: string }>('POST', `/posts/${id}/downvote`);
  }

  // Comment endpoints
  async getComments(postId: string, options: { sort?: CommentSort; limit?: number } = {}) {
    return this.request<{ comments: Comment[] }>('GET', `/posts/${postId}/comments`, undefined, {
      sort: options.sort || 'top',
      limit: options.limit || 100,
    }).then(r => r.comments);
  }

  async createComment(postId: string, data: CreateCommentForm) {
<<<<<<< HEAD
    return this.request<{ comment: Comment }>('POST', '/comments', { 
      postId, 
      content: data.content, 
      parentId: data.parentId 
=======
    const { parentId, ...rest } = data;
    return this.request<{ comment: Comment }>('POST', `/posts/${postId}/comments`, {
      ...rest,
      ...(parentId ? { parent_comment_id: parentId } : {}),
>>>>>>> smoke-test-gemini
    }).then(r => r.comment);
  }

  async deleteComment(id: string) {
    return this.request<{ success: boolean }>('DELETE', `/comments/${id}`);
  }

  async upvoteComment(id: string) {
    return this.request<{ success: boolean; action: string }>('POST', `/comments/${id}/upvote`);
  }

  async downvoteComment(id: string) {
    return this.request<{ success: boolean; action: string }>('POST', `/comments/${id}/downvote`);
  }

  // Industry endpoints
<<<<<<< HEAD
  async getIndustrys(options: { sort?: string; limit?: number; offset?: number } = {}) {
    const query = {
=======
  async getIndustries(options: { sort?: string; limit?: number; offset?: number } = {}) {
    return this.request<PaginatedResponse<Industry>>('GET', '/industries', undefined, {
>>>>>>> smoke-test-gemini
      sort: options.sort || 'popular',
      limit: options.limit || 50,
      offset: options.offset || 0,
    };

    return await this.request<PaginatedResponse<Industry>>('GET', '/submolts', undefined, query);
  }

  async getIndustry(name: string) {
<<<<<<< HEAD
    return await this.request<{ submolt: Industry }>('GET', `/submolts/${name}`).then(r => r.submolt);
  }

  async createIndustry(data: { name: string; displayName?: string; description?: string }) {
    const payload = {
      name: data.name,
      display_name: data.displayName,
      description: data.description,
    };

    return await this.request<{ submolt: Industry }>('POST', '/submolts', payload).then(r => r.submolt);
  }

  async subscribeIndustry(name: string) {
    return await this.request<{ success: boolean }>('POST', `/submolts/${name}/subscribe`);
  }

  async unsubscribeIndustry(name: string) {
    return await this.request<{ success: boolean }>('DELETE', `/submolts/${name}/subscribe`);
  }

  async getIndustryFeed(name: string, options: { sort?: PostSort; limit?: number; offset?: number } = {}) {
    const query = {
=======
    return this.request<{ industry: Industry }>('GET', `/industries/${name}`).then(r => r.industry);
  }

  async createIndustry(data: { name: string; displayName?: string; description?: string }) {
    return this.request<{ industry: Industry }>('POST', '/industries', data).then(r => r.industry);
  }

  async subscribeIndustry(name: string) {
    return this.request<{ success: boolean }>('POST', `/industries/${name}/subscribe`);
  }

  async unsubscribeIndustry(name: string) {
    return this.request<{ success: boolean }>('DELETE', `/industries/${name}/subscribe`);
  }

  async getIndustryFeed(name: string, options: { sort?: PostSort; limit?: number; offset?: number } = {}) {
    return this.request<PaginatedResponse<Post>>('GET', `/industries/${name}/feed`, undefined, {
>>>>>>> smoke-test-gemini
      sort: options.sort || 'hot',
      limit: options.limit || 25,
      offset: options.offset || 0,
    };

    try {
      return await this.request<PaginatedResponse<Post>>('GET', `/submolts/${name}/feed`, undefined, query);
    } catch (err) {
      if (err instanceof ApiError && err.statusCode === 404) {
        return this.request<PaginatedResponse<Post>>('GET', `/industrys/${name}/feed`, undefined, query);
      }
      throw err;
    }
  }

  // Feed endpoints
  async getFeed(options: { sort?: PostSort; limit?: number; offset?: number } = {}) {
    return this.request<PaginatedResponse<Post>>('GET', '/feed', undefined, {
      sort: options.sort || 'hot',
      limit: options.limit || 25,
      offset: options.offset || 0,
    });
  }

  // Search endpoints
  async search(query: string, options: { limit?: number } = {}) {
    return this.request<SearchResults>('GET', '/search', undefined, { q: query, limit: options.limit || 25 });
  }

  // Jobs endpoints
  async getJobs(options: { skills?: string[]; source?: 'real' | 'synthetic'; status?: 'open' | 'closed' | 'filled'; search?: string; limit?: number; offset?: number } = {}) {
<<<<<<< HEAD
    const query = {
=======
    return this.request<{ data: Job[] }>('GET', '/jobs', undefined, {
>>>>>>> smoke-test-gemini
      skills: options.skills?.join(','),
      source: options.source,
      status: options.status,
      search: options.search,
      limit: options.limit || 50,
      offset: options.offset || 0,
<<<<<<< HEAD
    };

    try {
      const response = await this.request<{ jobs: Record<string, unknown>[] }>('GET', '/jobs', undefined, query);
      return { data: (response.jobs || []).map((job) => this.normalizeJob(job)) };
    } catch (err) {
      if (err instanceof ApiError && err.statusCode === 404) {
        const fallback = await this.request<{ data: Record<string, unknown>[] }>('GET', '/public/jobs', undefined, query);
        return { data: (fallback.data || []).map((job) => this.normalizeJob(job)) };
      }
      throw err;
    }
  }

  async getJob(id: string) {
    try {
      const response = await this.request<{ job: Record<string, unknown> }>('GET', `/jobs/${id}`);
      return this.normalizeJob(response.job);
    } catch (err) {
      if (err instanceof ApiError && err.statusCode === 404) {
        return this.request<{ data: Record<string, unknown> }>('GET', `/public/jobs/${id}`).then(r => this.normalizeJob(r.data));
      }
      throw err;
    }
  }

  async applyToJob(jobId: string, data: { coverLetter?: string; matchArgument?: string }) {
    return this.request<{ success: boolean }>('POST', `/jobs/${jobId}/apply`, {
      cover_letter: data.coverLetter,
      match_argument: data.matchArgument,
    });
=======
    });
  }

  async getJob(id: string) {
    return this.request<{ data: Job }>('GET', `/jobs/${id}`).then(r => r.data);
  }

  async applyToJob(jobId: string, data: { coverLetter?: string; matchArgument?: string }) {
    return this.request<{ success: boolean }>('POST', `/jobs/${jobId}/apply`, data);
>>>>>>> smoke-test-gemini
  }
}

export const api = new ApiClient();
export { ApiError };
