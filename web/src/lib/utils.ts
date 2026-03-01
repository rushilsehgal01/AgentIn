import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { formatDistanceToNow, format, parseISO } from 'date-fns';
import type { Comment, CommentSort } from '@/types';

// Class name utility
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Format score (e.g., 1.2K, 3.5M)
export function formatScore(score?: number | null): string {
  if (score === undefined || score === null) return '0';
  const abs = Math.abs(score);
  const sign = score < 0 ? '-' : '';
  if (abs >= 1000000) return sign + (abs / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (abs >= 1000) return sign + (abs / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  return score.toString();
}

// Format relative time
export function formatRelativeTime(date?: string | Date | null): string {
  if (!date) return 'unknown';
  try {
    const d = typeof date === 'string' ? parseISO(date) : date;
    if (isNaN(d.getTime())) return 'unknown';
    return formatDistanceToNow(d, { addSuffix: true });
  } catch {
    return 'unknown';
  }
}

// Format absolute date
export function formatDate(date?: string | Date | null): string {
  if (!date) return 'unknown';
  try {
    const d = typeof date === 'string' ? parseISO(date) : date;
    if (isNaN(d.getTime())) return 'unknown';
    return format(d, 'MMM d, yyyy');
  } catch {
    return 'unknown';
  }
}

// Format date and time
export function formatDateTime(date?: string | Date | null): string {
  if (!date) return 'unknown';
  try {
    const d = typeof date === 'string' ? parseISO(date) : date;
    if (isNaN(d.getTime())) return 'unknown';
    return format(d, 'MMM d, yyyy h:mm a');
  } catch {
    return 'unknown';
  }
}

// Truncate text
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3).trim() + '...';
}

// Extract domain from URL
export function extractDomain(url: string): string | null {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

// Validate agent name
export function isValidAgentName(name: string): boolean {
  return /^[a-z0-9_]{2,32}$/i.test(name);
}

// Validate industry name
export function isValidIndustryName(name: string): boolean {
  return /^[a-z0-9_]{2,24}$/i.test(name);
}

// Validate API key
export function isValidApiKey(key: string): boolean {
  return /^AgentIn_sk_[a-fA-F0-9]{64}$/.test(key);
}

// Generate initials from name
export function getInitials(name: string | undefined | null): string {
  if (!name) return '?';
  return name.split(/[\s_]+/).map(part => part[0]?.toUpperCase()).filter(Boolean).slice(0, 2).join('');
}

// Pluralize
export function pluralize(count: number, singular: string, plural?: string): string {
  return count === 1 ? singular : (plural || singular + 's');
}

// Debounce
export function debounce<T extends (...args: unknown[]) => unknown>(fn: T, delay: number): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

// Throttle
export function throttle<T extends (...args: unknown[]) => unknown>(fn: T, limit: number): (...args: Parameters<T>) => void {
  let inThrottle = false;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

// Sleep
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Copy to clipboard
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

// Local storage helpers
export function getFromStorage<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch {
    return defaultValue;
  }
}

export function setToStorage<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch { /* ignore */ }
}

export function removeFromStorage(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(key);
  } catch { /* ignore */ }
}

// URL helpers
export function getPostUrl(postId: string, industry?: string): string {
  return `/post/${postId}`;
}

export function getIndustryUrl(name: string): string {
  return `/m/${name}`;
}

export function getAgentUrl(name: string): string {
  return `/p/${name}`;
}

// Scroll helpers
export function scrollToTop(): void {
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

export function scrollToElement(id: string): void {
  const element = document.getElementById(id);
  element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Keyboard event helpers
export function isEnterKey(event: KeyboardEvent | React.KeyboardEvent): boolean {
  return event.key === 'Enter' && !event.shiftKey;
}

export function isEscapeKey(event: KeyboardEvent | React.KeyboardEvent): boolean {
  return event.key === 'Escape';
}

// Random string
export function randomId(length: number = 8): string {
  return Math.random().toString(36).substring(2, 2 + length);
}

// Build a nested tree from a flat comment list.
export function buildCommentTree(comments: Comment[], sort: CommentSort = 'top'): Comment[] {
  const byId = new Map<string, Comment>();
  const roots: Comment[] = [];

  for (const comment of comments) {
    byId.set(comment.id, { ...comment, replies: [] });
  }

  for (const comment of byId.values()) {
    if (comment.parentId && byId.has(comment.parentId)) {
      const parent = byId.get(comment.parentId)!;
      parent.replies = [...(parent.replies || []), comment];
    } else {
      roots.push(comment);
    }
  }

  return sortCommentTree(roots, sort);
}

function commentTimestamp(comment: Comment): number {
  return Date.parse(comment.createdAt || '') || 0;
}

function compareComments(a: Comment, b: Comment, sort: CommentSort): number {
  if (sort === 'new') {
    return commentTimestamp(b) - commentTimestamp(a);
  }

  if (sort === 'controversial') {
    const aScore = Math.abs(a.reactionCount || 0);
    const bScore = Math.abs(b.reactionCount || 0);
    if (aScore !== bScore) return aScore - bScore;
    return commentTimestamp(b) - commentTimestamp(a);
  }

  const topScore = (b.reactionCount || 0) - (a.reactionCount || 0);
  if (topScore !== 0) return topScore;
  return commentTimestamp(b) - commentTimestamp(a);
}

function sortCommentTree(comments: Comment[], sort: CommentSort): Comment[] {
  return [...comments]
    .sort((a, b) => compareComments(a, b, sort))
    .map((comment) => ({
      ...comment,
      replies: comment.replies ? sortCommentTree(comment.replies, sort) : [],
    }));
}
