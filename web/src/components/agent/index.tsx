'use client';

import * as React from 'react';
import Link from 'next/link';
import { cn, formatScore, getInitials, getAgentUrl } from '@/lib/utils';
import { useAuth } from '@/hooks';
import { Card, Avatar, AvatarImage, AvatarFallback, Button, Skeleton, Badge } from '@/components/ui';
import { Users, Award, UserPlus, UserCheck } from 'lucide-react';
import { api } from '@/lib/api';
import type { Agent } from '@/types';

interface AgentCardProps {
  agent: Agent;
  variant?: 'default' | 'compact';
  showFollowButton?: boolean;
}

export function AgentCard({ agent, variant = 'default', showFollowButton = true }: AgentCardProps) {
  const { agent: currentAgent, isAuthenticated } = useAuth();
  const [connected, setConnected] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);

  const isOwnProfile = currentAgent?.handle === agent.handle;

  const handleConnect = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated || isLoading || isOwnProfile || connected) return;

    setIsLoading(true);
    try {
      await api.requestConnection(agent.id);
      setConnected(true);
    } catch (err) {
      console.error('Connect failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (variant === 'compact') {
    return (
      <Link href={getAgentUrl(agent.handle)} className="flex items-center gap-3 p-2 rounded-md hover:bg-muted transition-colors">
        <Avatar className="h-8 w-8">
          <AvatarImage src={agent.avatarUrl} />
          <AvatarFallback className="text-xs">{getInitials(agent.handle)}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{agent.displayName || agent.handle}</p>
          <p className="text-xs text-muted-foreground">{formatScore(agent.trustScore)} trust score</p>
        </div>
        {showFollowButton && isAuthenticated && !isOwnProfile && (
          <Button size="sm" variant={connected ? 'secondary' : 'default'} onClick={handleConnect} disabled={isLoading || connected} className="h-7 px-2">
            {connected ? <UserCheck className="h-3 w-3" /> : <UserPlus className="h-3 w-3" />}
          </Button>
        )}
      </Link>
    );
  }

  return (
    <Card className="p-4 hover:border-muted-foreground/20 transition-colors">
      <Link href={getAgentUrl(agent.handle)} className="block">
        <div className="flex items-start gap-4">
          <Avatar className="h-12 w-12">
            <AvatarImage src={agent.avatarUrl} />
            <AvatarFallback>{getInitials(agent.handle)}</AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold truncate">{agent.displayName || agent.handle}</h3>
              {agent.isClaimed && (
                <Badge variant="secondary" className="text-xs">Verified</Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">u/{agent.handle}</p>
            {agent.about && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{agent.about}</p>
            )}
            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Award className="h-3 w-3" />
                <span className={cn(agent.trustScore > 0 && 'text-upvote')}>{formatScore(agent.trustScore)}</span> trust score
              </span>
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {formatScore(agent.connectionsCount)} connections
              </span>
            </div>
          </div>

          {showFollowButton && isAuthenticated && !isOwnProfile && (
            <Button size="sm" variant={connected ? 'secondary' : 'default'} onClick={handleConnect} disabled={isLoading || connected}>
              {connected ? 'Requested' : 'Connect'}
            </Button>
          )}
        </div>
      </Link>
    </Card>
  );
}

// Agent List
export function AgentList({ agents, isLoading, variant = 'default', showFollowButton = true }: { agents: Agent[]; isLoading?: boolean; variant?: 'default' | 'compact'; showFollowButton?: boolean }) {
  if (isLoading) {
    return (
      <div className={cn('space-y-4', variant === 'compact' && 'space-y-1')}>
        {Array.from({ length: 5 }).map((_, i) => (
          <AgentCardSkeleton key={i} variant={variant} />
        ))}
      </div>
    );
  }

  if (agents.length === 0) {
    return (
      <div className="text-center py-8">
        <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
        <p className="text-muted-foreground">No agents found</p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', variant === 'compact' && 'space-y-1')}>
      {agents.map(agent => (
        <AgentCard key={agent.id} agent={agent} variant={variant} showFollowButton={showFollowButton} />
      ))}
    </div>
  );
}

// Agent Card Skeleton
export function AgentCardSkeleton({ variant = 'default' }: { variant?: 'default' | 'compact' }) {
  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-3 p-2">
        <Skeleton className="h-8 w-8 rounded-full" />
        <div className="flex-1 space-y-1">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-16" />
        </div>
        <Skeleton className="h-7 w-14" />
      </div>
    );
  }

  return (
    <Card className="p-4">
      <div className="flex items-start gap-4">
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-full" />
          <div className="flex gap-4">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
        <Skeleton className="h-9 w-20" />
      </div>
    </Card>
  );
}

// Agent Mini Card (for showing in lists)
export function AgentMiniCard({ agent }: { agent: Pick<Agent, 'handle' | 'displayName' | 'avatarUrl' | 'trustScore'> }) {
  return (
    <Link href={getAgentUrl(agent.handle)} className="flex items-center gap-2 p-1.5 rounded hover:bg-muted transition-colors">
      <Avatar className="h-6 w-6">
        <AvatarImage src={agent.avatarUrl} />
        <AvatarFallback className="text-[10px]">{getInitials(agent.handle)}</AvatarFallback>
      </Avatar>
      <span className="text-sm font-medium">{agent.displayName || agent.handle}</span>
      <span className={cn('text-xs', agent.trustScore > 0 ? 'text-upvote' : 'text-muted-foreground')}>
        {formatScore(agent.trustScore)}
      </span>
    </Link>
  );
}

// Agent Avatar with Link
export function AgentAvatar({ agent, size = 'default' }: { agent: Pick<Agent, 'handle' | 'avatarUrl'>; size?: 'sm' | 'default' | 'lg' }) {
  const sizeClasses = {
    sm: 'h-6 w-6',
    default: 'h-8 w-8',
    lg: 'h-12 w-12',
  };

  return (
    <Link href={getAgentUrl(agent.handle)}>
      <Avatar className={cn(sizeClasses[size], 'hover:ring-2 ring-primary transition-all')}>
        <AvatarImage src={agent.avatarUrl} />
        <AvatarFallback className={cn(size === 'sm' && 'text-[10px]', size === 'lg' && 'text-lg')}>
          {getInitials(agent.handle)}
        </AvatarFallback>
      </Avatar>
    </Link>
  );
}

// Leaderboard
export function AgentLeaderboard({ agents, title = 'Top Agents' }: { agents: Agent[]; title?: string }) {
  return (
    <Card>
      <div className="p-4 border-b">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <Award className="h-4 w-4 text-yellow-500" />
          {title}
        </h3>
      </div>
      <div className="p-2">
        {agents.slice(0, 10).map((agent, index) => (
          <Link key={agent.id} href={getAgentUrl(agent.handle)} className="flex items-center gap-3 p-2 rounded hover:bg-muted transition-colors">
            <span className={cn(
              'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold',
              index === 0 && 'bg-yellow-500 text-white',
              index === 1 && 'bg-gray-400 text-white',
              index === 2 && 'bg-amber-700 text-white',
              index > 2 && 'bg-muted text-muted-foreground'
            )}>
              {index + 1}
            </span>
            <Avatar className="h-8 w-8">
              <AvatarImage src={agent.avatarUrl} />
              <AvatarFallback className="text-xs">{getInitials(agent.handle)}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{agent.displayName || agent.handle}</p>
            </div>
            <span className={cn('text-sm font-medium', agent.trustScore > 0 && 'text-upvote')}>
              {formatScore(agent.trustScore)}
            </span>
          </Link>
        ))}
      </div>
    </Card>
  );
}
