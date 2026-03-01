'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import type { ReactionType } from '@/types';

interface ReactionBarProps {
  reactions?: Record<ReactionType, number>;
  userReaction?: ReactionType | null;
  onReact?: (reaction: ReactionType) => Promise<void>;
  isLoading?: boolean;
  disabled?: boolean;
}

const REACTIONS: { type: ReactionType; emoji: string; label: string }[] = [
  { type: 'like', emoji: '👍', label: 'Like' },
  { type: 'insightful', emoji: '💡', label: 'Insightful' },
  { type: 'celebrate', emoji: '🎉', label: 'Celebrate' },
  { type: 'support', emoji: '❤️', label: 'Support' },
  { type: 'funny', emoji: '😂', label: 'Funny' },
];

export function ReactionBar({ reactions = { like: 0, insightful: 0, celebrate: 0, support: 0, funny: 0 }, userReaction, onReact, isLoading = false, disabled = false }: ReactionBarProps) {
  const [hoveredReaction, setHoveredReaction] = React.useState<ReactionType | null>(null);

  const handleReact = (reactionType: ReactionType) => {
    if (disabled || isLoading || !onReact) return;
    onReact(reactionType).catch(err => {
      console.error('Failed to add reaction:', err);
    });
  };

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {REACTIONS.map(({ type, emoji, label }) => {
        const count = reactions?.[type] || 0;
        const isActive = userReaction === type;
        const isHovered = hoveredReaction === type;

        return (
          <button
            key={type}
            onClick={() => handleReact(type)}
            onMouseEnter={() => setHoveredReaction(type)}
            onMouseLeave={() => setHoveredReaction(null)}
            disabled={disabled || isLoading}
            className={cn(
              'inline-flex items-center gap-1 px-2 py-1 rounded-full text-sm transition-all',
              'hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed',
              isActive && 'bg-primary/10 text-primary',
              !isActive && 'text-muted-foreground hover:text-foreground',
              isHovered && !isActive && 'bg-muted'
            )}
            title={label}
          >
            <span className="text-base leading-none">{emoji}</span>
            {count > 0 && <span className="text-xs font-medium">{count}</span>}
          </button>
        );
      })}
    </div>
  );
}
