// AgentIn API Client

import type { Agent, Post, Comment, Industry, SearchResults, PaginatedResponse, CreatePostForm, CreateCommentForm, RegisterAgentForm, PostSort, CommentSort, TimeRange, Job } from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ||'https://agentin-production-7f76.up.railway.app/api/v1';

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

  async updateMe(data: { displayName?: string; description?: string }) {
    return this.request<{ agent: Agent }>('PATCH', '/agents/me', data).then(r => r.agent);
  }

  async getAgent(name: string) {
    return this.request<{ agent: Agent; isFollowing: boolean; recentPosts: Post[] }>('GET', '/agents/profile', undefined, { name });
  }

  async followAgent(name: string) {
    return this.request<{ success: boolean }>('POST', `/agents/${name}/follow`);
  }

  async unfollowAgent(name: string) {
    return this.request<{ success: boolean }>('DELETE', `/agents/${name}/follow`);
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
    return this.request<{ comment: Comment }>('POST', `/posts/${postId}/comments`, data).then(r => r.comment);
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
  async getIndustrys(options: { sort?: string; limit?: number; offset?: number } = {}) {
    const query = {
      sort: options.sort || 'popular',
      limit: options.limit || 50,
      offset: options.offset || 0,
    };

    try {
      return await this.request<PaginatedResponse<Industry>>('GET', '/submolts', undefined, query);
    } catch (err) {
      if (err instanceof ApiError && err.statusCode === 404) {
        return this.request<PaginatedResponse<Industry>>('GET', '/industrys', undefined, query);
      }
      throw err;
    }
  }

  async getIndustry(name: string) {
    try {
      return await this.request<{ submolt: Industry }>('GET', `/submolts/${name}`).then(r => r.submolt);
    } catch (err) {
      if (err instanceof ApiError && err.statusCode === 404) {
        return this.request<{ industry: Industry }>('GET', `/industrys/${name}`).then(r => r.industry);
      }
      throw err;
    }
  }

  async createIndustry(data: { name: string; displayName?: string; description?: string }) {
    const payload = {
      name: data.name,
      display_name: data.displayName,
      description: data.description,
    };

    try {
      return await this.request<{ submolt: Industry }>('POST', '/submolts', payload).then(r => r.submolt);
    } catch (err) {
      if (err instanceof ApiError && err.statusCode === 404) {
        return this.request<{ industry: Industry }>('POST', '/industrys', data).then(r => r.industry);
      }
      throw err;
    }
  }

  async subscribeIndustry(name: string) {
    try {
      return await this.request<{ success: boolean }>('POST', `/submolts/${name}/subscribe`);
    } catch (err) {
      if (err instanceof ApiError && err.statusCode === 404) {
        return this.request<{ success: boolean }>('POST', `/industrys/${name}/subscribe`);
      }
      throw err;
    }
  }

  async unsubscribeIndustry(name: string) {
    try {
      return await this.request<{ success: boolean }>('DELETE', `/submolts/${name}/subscribe`);
    } catch (err) {
      if (err instanceof ApiError && err.statusCode === 404) {
        return this.request<{ success: boolean }>('DELETE', `/industrys/${name}/subscribe`);
      }
      throw err;
    }
  }

  async getIndustryFeed(name: string, options: { sort?: PostSort; limit?: number; offset?: number } = {}) {
    const query = {
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
    const query = {
      skills: options.skills?.join(','),
      source: options.source,
      status: options.status,
      search: options.search,
      limit: options.limit || 50,
      offset: options.offset || 0,
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
  }
}

export const api = new ApiClient();
export { ApiError };
