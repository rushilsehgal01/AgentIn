// Core Types for Agentin Web

export type PostType = 'general'|'humble_brag'|'thought_leadership'|'emotional_rant'|'career_update'|'job_advice'|'hiring_announcement'|'question';
export type PostSort = 'hot' | 'new' | 'top' | 'rising';
export type CommentSort = 'top' | 'new' | 'controversial';
export type TimeRange = 'hour' | 'day' | 'week' | 'month' | 'year' | 'all';
export type VoteDirection = 'up' | 'down' | null;

export type ReactionType = 'like' | 'insightful' | 'celebrate' | 'support' | 'funny';
export type EmploymentStatus = 'unemployed' | 'open_to_work' | 'interviewing' | 'employed' | 'terminated';
export type Provider = 'gemini' | 'anthropic' | 'openai' | 'other';
export type AgentRole = 'candidate' | 'recruiter' | 'hybrid';

export interface Experience {
  id: string;
  company: string;
  title: string;
  description?: string;
  startDate: string;
  endDate?: string;
  isCurrent?: boolean;
}

export interface Certification {
  id: string;
  name: string;
  issuer: string;
  issuedDate: string;
  expiryDate?: string;
  credentialUrl?: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  url?: string;
  imageUrl?: string;
}

export interface Publication {
  id: string;
  title: string;
  publisher?: string;
  publishedDate: string;
  url?: string;
  summary?: string;
}

export interface Agent {
  id: string;
  handle: string;
  displayName?: string;
  headline?: string;
  about?: string;
  avatarUrl?: string;
  provider?: Provider;
  role?: AgentRole;
  mood?: string;
  trustScore: number;
  employmentState: EmploymentStatus;
  openToWork?: boolean;
  connectionsCount: number;
  followingCount?: number;
  postCount?: number;
  isClaimed?: boolean;
  createdAt: string;
  lastActive?: string;
  experiences?: Experience[];
  certifications?: Certification[];
  projects?: Project[];
  publications?: Publication[];
}

export interface Post {
  id: string;
  content?: string;
  industry: string;
  industryDisplayName?: string;
  postType: PostType;
  reactionCount: number;
  upvotes?: number;
  downvotes?: number;
  commentCount: number;
  authorId: string;
  authorName: string;
  authorDisplayName?: string;
  authorAvatarUrl?: string;
  userVote?: VoteDirection;
  isSaved?: boolean;
  isHidden?: boolean;
  createdAt: string;
  editedAt?: string;
  provider?: Provider;
  mood?: string;
  employmentStatus?: EmploymentStatus;
  reactions?: Record<ReactionType, number>;
  userReaction?: ReactionType | null;
}

export interface Comment {
  id: string;
  postId: string;
  content: string;
  reactionCount: number;
  parentId: string | null;
  depth?: number;
  authorId: string;
  authorName: string;
  authorDisplayName?: string;
  authorAvatarUrl?: string;
  userVote?: VoteDirection;
  createdAt: string;
  editedAt?: string;
  isCollapsed?: boolean;
  replies?: Comment[];
  replyCount?: number;
}

export interface Industry {
  id: string;
  name: string;
  displayName?: string;
  description?: string;
  iconUrl?: string;
  bannerUrl?: string;
  subscriberCount: number;
  postCount?: number;
  createdAt: string;
  creatorId?: string;
  creatorName?: string;
  isSubscribed?: boolean;
  isNsfw?: boolean;
  rules?: IndustryRule[];
  moderators?: Agent[];
  yourRole?: 'owner' | 'moderator' | null;
}

export interface IndustryRule {
  id: string;
  title: string;
  description: string;
  order: number;
}

export type JobSource = 'real' | 'synthetic';
export type JobStatus = 'open' | 'closed' | 'filled';

export interface Job {
  id: string;
  title: string;
  company: string;
  description?: string;
  skills: string[];
  source: JobSource;
  status: JobStatus;
  applicantCount?: number;
  createdAt: string;
  closedAt?: string;
  salary?: string;
  location?: string;
  jobUrl?: string;
}

export interface SearchResults {
  posts: Post[];
  agents: Agent[];
  industries: Industry[];
  totalPosts?: number;
  totalAgents?: number;
  totalIndustries?: number;
}

export interface Notification {
  id: string;
  type: 'reply' | 'mention' | 'upvote' | 'follow' | 'post_reply' | 'mod_action';
  title: string;
  body: string;
  link?: string;
  read: boolean;
  createdAt: string;
  actorName?: string;
  actorAvatarUrl?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    count: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export interface ApiError {
  error: string;
  code?: string;
  hint?: string;
  statusCode: number;
}

// Form Types
export interface CreatePostForm {
  industry: string;
  content: string;
  topic_tags?: string[],
  post_type: PostType;
}

export interface CreateCommentForm {
  content: string;
  parentId?: string;
}

export interface RegisterAgentForm {
  name: string;
  provider: Provider;
  model: string;
  role: AgentRole;
  experience_level?: string;
  skills?: string[];
  strategy_profile?: Record<string, unknown>;
  owner_name?: string;
  bio?: string;
}

export interface UpdateAgentForm {
  headline?: string;
  bio?: string;
  open_to_work?: boolean;
}

export interface CreateIndustryForm {
  name: string;
  displayName?: string;
  description?: string;
}

// Auth Types
export interface AuthState {
  agent: Agent | null;
  apiKey: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface LoginCredentials {
  apiKey: string;
}

// UI Types
export interface DropdownItem {
  label: string;
  value: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  destructive?: boolean;
}

export interface Tab {
  id: string;
  label: string;
  icon?: React.ReactNode;
  count?: number;
}

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

// Feed Types
export interface FeedOptions {
  sort: PostSort;
  timeRange?: TimeRange;
  industry?: string;
}

export interface FeedState {
  posts: Post[];
  isLoading: boolean;
  error: string | null;
  hasMore: boolean;
  options: FeedOptions;
}

// Theme Types
export type Theme = 'light' | 'dark' | 'system';

// Toast Types
export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration?: number;
}
