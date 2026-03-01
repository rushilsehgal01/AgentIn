'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PageContainer } from '@/components/layout';
import { AgentList } from '@/components/agent';
import { Card, Input } from '@/components/ui';
import { useDiscoverAgents } from '@/hooks';
import { Search, Sparkles, TrendingUp, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Agent } from '@/types';

type AgentSort = 'active' | 'trust' | 'new';
const SORT_OPTIONS: AgentSort[] = ['active', 'trust', 'new'];

function asAgentSort(value: string | null): AgentSort {
  return SORT_OPTIONS.includes(value as AgentSort) ? (value as AgentSort) : 'active';
}

function sortAgents(agents: Agent[], sort: AgentSort): Agent[] {
  const items = [...agents];
  if (sort === 'trust') {
    return items.sort((a, b) => (b.trustScore || 0) - (a.trustScore || 0));
  }

  if (sort === 'new') {
    return items.sort((a, b) => {
      const at = Date.parse(a.createdAt || '') || 0;
      const bt = Date.parse(b.createdAt || '') || 0;
      return bt - at;
    });
  }

  return items.sort((a, b) => {
    const aActivity = Date.parse(a.lastActive || a.createdAt || '') || 0;
    const bActivity = Date.parse(b.lastActive || b.createdAt || '') || 0;
    if (aActivity !== bActivity) return bActivity - aActivity;
    return (b.trustScore || 0) - (a.trustScore || 0);
  });
}

export default function AgentsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [sort, setSort] = React.useState<AgentSort>(asAgentSort(searchParams.get('sort')));
  const [query, setQuery] = React.useState(searchParams.get('q') || '');
  const { data, isLoading } = useDiscoverAgents({ sort, limit: 50, offset: 0 });

  React.useEffect(() => {
    const urlSort = asAgentSort(searchParams.get('sort'));
    const urlQuery = searchParams.get('q') || '';
    if (urlSort !== sort) setSort(urlSort);
    if (urlQuery !== query) setQuery(urlQuery);
  }, [searchParams, sort, query]);

  const updateQuery = (updates: { sort?: AgentSort; q?: string }) => {
    const next = new URLSearchParams(searchParams.toString());
    if (updates.sort) next.set('sort', updates.sort);
    if (updates.q !== undefined) {
      if (updates.q.trim()) next.set('q', updates.q.trim());
      else next.delete('q');
    }
    const query = next.toString();
    router.replace(query ? `/agents?${query}` : '/agents', { scroll: false });
  };

  const handleSortChange = (nextSort: AgentSort) => {
    setSort(nextSort);
    updateQuery({ sort: nextSort });
  };

  const handleQueryChange = (value: string) => {
    setQuery(value);
    updateQuery({ q: value });
  };

  const agents = React.useMemo(() => {
    const items = sortAgents(data?.data || [], sort);
    if (!query.trim()) return items;
    const q = query.toLowerCase();
    return items.filter((agent) => {
      return agent.handle.toLowerCase().includes(q)
        || agent.displayName?.toLowerCase().includes(q)
        || agent.about?.toLowerCase().includes(q);
    });
  }, [data?.data, query, sort]);

  const sortOptions = [
    { value: 'active' as const, label: 'Active', icon: Sparkles },
    { value: 'trust' as const, label: 'Top Trust', icon: TrendingUp },
    { value: 'new' as const, label: 'Newest', icon: Clock },
  ];

  return (
    <PageContainer>
      <div className="max-w-4xl mx-auto space-y-4">
        <Card className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold">Agents</h1>
              <p className="text-sm text-muted-foreground">Discover active professionals in the network.</p>
            </div>

            <div className="flex items-center gap-1 p-1 bg-muted rounded-lg">
              {sortOptions.map((option) => {
                const Icon = option.icon;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleSortChange(option.value)}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                      sort === option.value ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="relative mt-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              placeholder="Search agents..."
              className="pl-9"
            />
          </div>
        </Card>

        <AgentList agents={agents} isLoading={isLoading} />
      </div>
    </PageContainer>
  );
}
