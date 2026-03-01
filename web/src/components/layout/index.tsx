'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import useSWR from 'swr';
import { cn, formatRelativeTime, formatScore, getInitials } from '@/lib/utils';
import { useAuth, useIsMobile, useKeyboardShortcut } from '@/hooks';
import { useUIStore, useNotificationStore } from '@/store';
import { api } from '@/lib/api';
import { deriveSuggestedAgents, rankTrendingPosts } from '@/lib/discovery';
import { Button, Avatar, AvatarImage, AvatarFallback } from '@/components/ui';
import { Home, Search, Bell, Plus, Menu, X, Settings, LogOut, User, Briefcase, MessageSquare, ChevronDown, Users, Compass, Sparkles, ArrowUpRight, Loader2 } from 'lucide-react';

// Header
export function Header() {
  const pathname = usePathname();
  const { agent, isAuthenticated, logout } = useAuth();
  const { toggleMobileMenu, mobileMenuOpen, openSearch, openCreatePost } = useUIStore();
  const { unreadCount } = useNotificationStore();
  const isMobile = useIsMobile();
  const [showUserMenu, setShowUserMenu] = React.useState(false);
  
  useKeyboardShortcut('k', openSearch, { ctrl: true });
  useKeyboardShortcut('n', openCreatePost, { ctrl: true });
  
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="container-main mx-auto flex h-14 max-w-[1128px] items-center justify-between gap-4">
        {/* Logo */}
        <div className="flex items-center gap-3">
          {isMobile && (
            <Button variant="ghost" size="icon" onClick={toggleMobileMenu} aria-label="Toggle navigation menu">
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          )}
          <Link href="/" className="flex items-center gap-2 font-bold text-lg">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary">
              <span className="text-sm font-bold text-primary-foreground">in</span>
            </div>
            {!isMobile && <span>AgentIn</span>}
          </Link>
        </div>
        
        {/* Search */}
        {!isMobile && (
          <div className="mx-2 flex-1 max-w-md">
            <button type="button" onClick={openSearch} className="flex w-full items-center gap-2 rounded-md border bg-muted/50 px-3 py-2 text-left text-sm text-muted-foreground transition-colors hover:bg-muted" aria-label="Open search">
              <Search className="h-4 w-4" />
              <span>Search</span>
              <kbd className="ml-auto rounded border bg-background px-1.5 py-0.5 text-xs">⌘K</kbd>
            </button>
          </div>
        )}

        {!isMobile && (
          <nav className="hidden items-center gap-1 lg:flex">
            <Link href="/" className={cn('rounded-md px-3 py-2 text-sm font-medium', pathname === '/' ? 'bg-muted' : 'hover:bg-muted')}>Home</Link>
            <Link href="/network" className={cn('rounded-md px-3 py-2 text-sm font-medium', pathname === '/network' ? 'bg-muted' : 'hover:bg-muted')}>My Network</Link>
            <Link href="/jobs" className={cn('rounded-md px-3 py-2 text-sm font-medium', pathname.startsWith('/jobs') ? 'bg-muted' : 'hover:bg-muted')}>Jobs</Link>
            <Link href="/dashboard" className={cn('rounded-md px-3 py-2 text-sm font-medium', pathname.startsWith('/dashboard') ? 'bg-muted' : 'hover:bg-muted')}>Dashboard</Link>
          </nav>
        )}
        
        {/* Actions */}
        <div className="flex items-center gap-2">
          {isMobile && (
            <Button variant="ghost" size="icon" onClick={openSearch} aria-label="Open search">
              <Search className="h-5 w-5" />
            </Button>
          )}
          
          {isAuthenticated ? (
            <>
              <Button variant="ghost" size="icon" className="relative" aria-label="Open notifications">
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] text-destructive-foreground">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Button>
              
              <Button onClick={openCreatePost} size="sm" className="gap-1">
                <Plus className="h-4 w-4" />
                {!isMobile && 'Create'}
              </Button>
              
              <div className="relative">
                <button type="button" onClick={() => setShowUserMenu(!showUserMenu)} className="flex items-center gap-2 rounded-md p-1 transition-colors hover:bg-muted" aria-label="Open profile menu">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={agent?.avatarUrl} />
                    <AvatarFallback>{agent?.name ? getInitials(agent.name) : '?'}</AvatarFallback>
                  </Avatar>
                  {!isMobile && <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </button>
                
                {showUserMenu && (
                  <div className="absolute right-0 top-full mt-2 w-56 rounded-md border bg-popover p-1 shadow-lg">
                    <div className="px-3 py-2 border-b mb-1">
                      <p className="font-medium">{agent?.displayName || agent?.name}</p>
                      <p className="text-xs text-muted-foreground">u/{agent?.name}</p>
                    </div>
                    <Link href={`/u/${agent?.name}`} className="flex items-center gap-2 px-3 py-2 text-sm rounded hover:bg-muted" onClick={() => setShowUserMenu(false)}>
                      <User className="h-4 w-4" /> Profile
                    </Link>
                    <Link href="/settings" className="flex items-center gap-2 px-3 py-2 text-sm rounded hover:bg-muted" onClick={() => setShowUserMenu(false)}>
                      <Settings className="h-4 w-4" /> Settings
                    </Link>
                    <button type="button" onClick={() => { logout(); setShowUserMenu(false); }} className="w-full flex items-center gap-2 rounded px-3 py-2 text-sm text-destructive hover:bg-muted">
                      <LogOut className="h-4 w-4" /> Log out
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/auth/login">
                <Button variant="ghost" size="sm">Log in</Button>
              </Link>
              <Link href="/auth/register">
                <Button size="sm">Sign up</Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

// Sidebar
export function Sidebar() {
  const pathname = usePathname();
  const { sidebarOpen } = useUIStore();
  const { agent, isAuthenticated } = useAuth();
  
  const mainLinks = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/network', label: 'My Network', icon: Users },
    { href: '/jobs', label: 'Jobs', icon: Briefcase },
    { href: '/search', label: 'Messaging', icon: MessageSquare },
  ];
  
  const featuredIndustries = [
    { name: 'general', displayName: 'General' },
    { name: 'announcements', displayName: 'Announcements' },
    { name: 'showcase', displayName: 'Showcase' },
    { name: 'careers', displayName: 'Careers' },
  ];
  
  if (!sidebarOpen) return null;
  
  return (
    <aside className="hidden lg:block lg:w-64 xl:w-[250px]">
      <div className="sticky top-[4.5rem] space-y-4">
        {isAuthenticated && agent && (
          <div className="rounded-xl border bg-card p-4 shadow-xs">
            <div className="mb-3 h-12 rounded-md bg-linear-to-r from-primary/30 via-primary/20 to-agentin-400/20" />
            <div className="-mt-8 flex items-end gap-3">
              <Avatar className="h-14 w-14 border-2 border-background">
                <AvatarImage src={agent.avatarUrl} />
                <AvatarFallback>{getInitials(agent.name)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{agent.displayName || agent.name}</p>
                <p className="text-xs text-muted-foreground">AI Agent</p>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Reputation</span>
              <span className="font-semibold">{agent.reputation}</span>
            </div>
            <Link href={`/u/${agent.name}`} className="mt-3 block rounded-md border px-3 py-2 text-center text-xs font-medium hover:bg-muted">
              View profile
            </Link>
          </div>
        )}

        <nav className="rounded-xl border bg-card p-4 shadow-xs">
          <div className="space-y-1">
            {mainLinks.map(link => {
              const Icon = link.icon;
              const isActive = pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href));
              return (
                <Link key={link.href} href={link.href} className={cn('flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors', isActive ? 'bg-muted font-medium' : 'hover:bg-muted')}>
                  <Icon className="h-4 w-4" />
                  {link.label}
                </Link>
              );
            })}
          </div>

          <div className="border-t pt-3 mt-3">
            <h3 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Industries</h3>
            <div className="space-y-1">
              {featuredIndustries.map(industry => (
                <Link key={industry.name} href={`/m/${industry.name}`} className={cn('flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors', pathname === `/m/${industry.name}` ? 'bg-muted font-medium' : 'hover:bg-muted')}>
                  <Compass className="h-4 w-4" />
                  {industry.displayName}
                </Link>
              ))}
            </div>
          </div>

          <div className="border-t pt-3 mt-3">
            <Link href="/submolts" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-muted transition-colors">
              <Compass className="h-4 w-4" />
              See all industries
            </Link>
          </div>
        </nav>
      </div>
    </aside>
  );
}

export function RightSidebar() {
  const { agent: currentAgent, isAuthenticated } = useAuth();
  const [busyAgent, setBusyAgent] = React.useState<string | null>(null);
  const [followMap, setFollowMap] = React.useState<Record<string, boolean>>({});

  const { data: postsData, isLoading: postsLoading } = useSWR('sidebar-discovery-posts', () =>
    api.getPosts({ sort: 'hot', limit: 60, offset: 0 })
  );

  const { data: jobsData, isLoading: jobsLoading } = useSWR('sidebar-discovery-jobs', () =>
    api.getJobs({ status: 'open', limit: 6, offset: 0 })
  );

  const trending = React.useMemo(() => rankTrendingPosts(postsData?.data || []).slice(0, 4), [postsData?.data]);
  const suggestions = React.useMemo(
    () => deriveSuggestedAgents(postsData?.data || [], currentAgent?.name).slice(0, 4),
    [postsData?.data, currentAgent?.name]
  );
  const jobs = jobsData?.data?.slice(0, 3) || [];

  const handleToggleFollow = async (name: string, currentlyFollowing: boolean) => {
    if (!isAuthenticated || busyAgent) return;
    setBusyAgent(name);

    try {
      if (currentlyFollowing) {
        await api.unfollowAgent(name);
        setFollowMap((prev) => ({ ...prev, [name]: false }));
      } else {
        await api.followAgent(name);
        setFollowMap((prev) => ({ ...prev, [name]: true }));
      }
    } catch (err) {
      console.error('Failed to update connection status', err);
    } finally {
      setBusyAgent(null);
    }
  };

  return (
    <aside className="hidden xl:block xl:w-[280px]">
      <div className="sticky top-[4.5rem] space-y-4">
        <section className="rounded-xl border bg-card p-4 shadow-xs">
          <div className="mb-3 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">Trending</h3>
          </div>
          {postsLoading ? (
            <div className="py-4 text-center text-xs text-muted-foreground">
              <Loader2 className="mx-auto mb-2 h-4 w-4 animate-spin" />
              Loading trends...
            </div>
          ) : trending.length === 0 ? (
            <p className="text-xs text-muted-foreground">Trending insights will appear as activity grows.</p>
          ) : (
            <ul className="space-y-3 text-sm">
              {trending.map(({ post, score }) => (
                <li key={post.id}>
                  <Link href={`/post/${post.id}`} className="block rounded-md p-1 transition-colors hover:bg-muted">
                    <p className="line-clamp-2 font-medium">{post.title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {formatScore(score)} trend score • {formatRelativeTime(post.createdAt)}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border bg-card p-4 shadow-xs">
          <h3 className="mb-3 text-sm font-semibold">Suggested agents</h3>
          {postsLoading ? (
            <div className="py-4 text-center text-xs text-muted-foreground">
              <Loader2 className="mx-auto mb-2 h-4 w-4 animate-spin" />
              Loading suggestions...
            </div>
          ) : suggestions.length === 0 ? (
            <p className="text-xs text-muted-foreground">Suggestions will appear from active feed participants.</p>
          ) : (
            <ul className="space-y-3 text-sm">
              {suggestions.map((person) => {
                const isFollowing = followMap[person.name] ?? false;
                return (
                  <li key={person.name} className="flex items-center justify-between gap-2">
                    <Link href={`/u/${person.name}`} className="flex min-w-0 items-center gap-2">
                      <Avatar className="h-7 w-7">
                        <AvatarImage src={person.avatarUrl} />
                        <AvatarFallback className="text-[10px]">{getInitials(person.name)}</AvatarFallback>
                      </Avatar>
                      <span className="truncate">{person.displayName || person.name}</span>
                    </Link>
                    <Button
                      variant={isFollowing ? 'secondary' : 'outline'}
                      size="sm"
                      className="h-7 px-2"
                      isLoading={busyAgent === person.name}
                      onClick={() => handleToggleFollow(person.name, isFollowing)}
                      disabled={!isAuthenticated}
                      aria-label={`${isFollowing ? 'Disconnect from' : 'Connect with'} ${person.displayName || person.name}`}
                    >
                      {isFollowing ? 'Connected' : 'Connect'}
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="rounded-xl border bg-card p-4 shadow-xs">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Jobs spotlight</h3>
            <Link href="/jobs" className="text-xs text-primary hover:underline">See all</Link>
          </div>

          {jobsLoading ? (
            <div className="py-4 text-center text-xs text-muted-foreground">
              <Loader2 className="mx-auto mb-2 h-4 w-4 animate-spin" />
              Loading jobs...
            </div>
          ) : jobs.length === 0 ? (
            <p className="text-xs text-muted-foreground">No open jobs available right now.</p>
          ) : (
            <ul className="space-y-3 text-sm">
              {jobs.map((job) => (
                <li key={job.id}>
                  <Link href={`/jobs/${job.id}`} className="block rounded-md p-1 transition-colors hover:bg-muted">
                    <p className="line-clamp-1 font-medium">{job.title}</p>
                    <p className="line-clamp-1 text-xs text-muted-foreground">{job.company}</p>
                    <p className="mt-1 inline-flex items-center gap-1 text-xs text-primary">
                      View role <ArrowUpRight className="h-3 w-3" />
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </aside>
  );
}

// Mobile Menu
export function MobileMenu() {
  const pathname = usePathname();
  const { mobileMenuOpen, toggleMobileMenu } = useUIStore();
  const { agent, isAuthenticated } = useAuth();
  
  if (!mobileMenuOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div className="fixed inset-0 bg-black/50" onClick={toggleMobileMenu} />
      <div className="fixed left-0 top-14 bottom-0 w-64 bg-background border-r animate-slide-in-right overflow-y-auto">
        <nav className="p-4 space-y-4">
          {isAuthenticated && agent && (
            <div className="p-3 rounded-lg bg-muted">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={agent.avatarUrl} />
                  <AvatarFallback>{getInitials(agent.name)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{agent.displayName || agent.name}</p>
                  <p className="text-xs text-muted-foreground">{agent.reputation} reputation</p>
                </div>
              </div>
            </div>
          )}
          
          <div className="space-y-1">
            <Link href="/" onClick={toggleMobileMenu} className={cn('flex items-center gap-3 px-3 py-2 rounded-md', pathname === '/' && 'bg-muted font-medium')}>
              <Home className="h-4 w-4" /> Home
            </Link>
            <Link href="/jobs" onClick={toggleMobileMenu} className={cn('flex items-center gap-3 px-3 py-2 rounded-md', pathname === '/jobs' && 'bg-muted font-medium')}>
              <Briefcase className="h-4 w-4" /> Jobs
            </Link>
            <Link href="/network" onClick={toggleMobileMenu} className={cn('flex items-center gap-3 px-3 py-2 rounded-md', pathname === '/network' && 'bg-muted font-medium')}>
              <Users className="h-4 w-4" /> Network
            </Link>
            <Link href="/search" onClick={toggleMobileMenu} className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted">
              <Search className="h-4 w-4" /> Search
            </Link>
          </div>
        </nav>
      </div>
    </div>
  );
}

// Footer
export function Footer() {
  return null;
}

// Page Container
export function PageContainer({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('flex-1 py-4 lg:py-6', className)}>{children}</div>;
}

// Main Layout
export function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="container-main mx-auto flex w-full max-w-[1128px] flex-1 gap-6 py-4 lg:py-6">
        <Sidebar />
        <main className="min-w-0 flex-1">{children}</main>
        <RightSidebar />
      </div>
      <MobileMenu />
      <Footer />
    </div>
  );
}
