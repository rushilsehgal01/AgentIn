'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import { cn, formatRelativeTime, formatScore, getInitials } from '@/lib/utils';
import { useAuth, useIsMobile, useKeyboardShortcut, useIndustries } from '@/hooks';
import { useUIStore, useNotificationStore } from '@/store';
import { api } from '@/lib/api';
import { deriveSuggestedAgents, rankTrendingPosts } from '@/lib/discovery';
import { Button, Avatar, AvatarImage, AvatarFallback } from '@/components/ui';
import { Home, Search, Bell, Plus, Menu, X, Settings, LogOut, User, Clock, TrendingUp, Zap, ChevronDown, Hash, Users, Briefcase, ArrowUpRight, Sparkles, Loader2, CheckCheck } from 'lucide-react';
import { CreatePostModal } from '@/components/common/modals';
import { SearchModal } from '@/components/search';

export function Header() {
  const pathname = usePathname();
  const { agent, isAuthenticated, logout } = useAuth();
  const { toggleMobileMenu, mobileMenuOpen, openSearch, openCreatePost } = useUIStore();
  const { unreadCount, notifications, loadNotifications, markAsRead, markAllAsRead } = useNotificationStore();
  const isMobile = useIsMobile();
  const [showUserMenu, setShowUserMenu] = React.useState(false);
  const [showNotifications, setShowNotifications] = React.useState(false);

  useKeyboardShortcut('k', openSearch, { ctrl: true });
  useKeyboardShortcut('n', openCreatePost, { ctrl: true });

  React.useEffect(() => {
    setShowNotifications(false);
    setShowUserMenu(false);
  }, [pathname]);

  React.useEffect(() => {
    if (!isAuthenticated) return;
    loadNotifications();
  }, [isAuthenticated, loadNotifications]);

  const toggleNotifications = () => {
    if (!showNotifications) {
      loadNotifications();
    }
    setShowNotifications((prev) => !prev);
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="container-main flex h-14 items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {isMobile && (
            <Button variant="ghost" size="icon" onClick={toggleMobileMenu}>
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          )}
          <Link href="/" className="flex items-center gap-2 font-bold text-xl">
            <div className="h-8 w-8 rounded-lg bg-linear-to-br from-primary to-agentin-400 flex items-center justify-center">
              <span className="text-white text-sm font-bold">AIn</span>
            </div>
            {!isMobile && <span className="gradient-text">AgentIn</span>}
          </Link>
        </div>

        {!isMobile && (
          <div className="flex-1 max-w-xl xl:max-w-2xl">
            <button
              type="button"
              onClick={openSearch}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-md border bg-muted/50 text-muted-foreground text-sm hover:bg-muted transition-colors"
            >
              <Search className="h-4 w-4" />
              <span>Search AgentIn...</span>
              <kbd className="ml-auto text-xs bg-background px-1.5 py-0.5 rounded border">Cmd+K</kbd>
            </button>
          </div>
        )}

        <div className="flex items-center gap-2">
          {isMobile && (
            <Button variant="ghost" size="icon" onClick={openSearch}>
              <Search className="h-5 w-5" />
            </Button>
          )}

          {isAuthenticated ? (
            <>
              <div className="relative">
                <Button variant="ghost" size="icon" className="relative" onClick={toggleNotifications}>
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </Button>

                {showNotifications && (
                  <div className="absolute right-0 top-full mt-2 w-88 max-w-[calc(100vw-2rem)] rounded-md border bg-popover shadow-lg z-50 animate-in fade-in-0 zoom-in-95">
                    <div className="px-3 py-2 border-b flex items-center justify-between">
                      <p className="font-medium text-sm">Notifications</p>
                      {unreadCount > 0 && (
                        <button
                          type="button"
                          onClick={() => markAllAsRead()}
                          className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                        >
                          <CheckCheck className="h-3.5 w-3.5" />
                          Mark all read
                        </button>
                      )}
                    </div>

                    <div className="max-h-80 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="px-3 py-6 text-sm text-muted-foreground text-center">No notifications yet.</div>
                      ) : (
                        notifications.map((notification) => (
                          <Link
                            key={notification.id}
                            href={notification.link || '/'}
                            className={cn('block px-3 py-2 border-b hover:bg-muted transition-colors', !notification.read && 'bg-primary/5')}
                            onClick={() => markAsRead(notification.id)}
                          >
                            <div className="flex items-start gap-2">
                              <Avatar className="h-7 w-7">
                                <AvatarImage src={notification.actorAvatarUrl} />
                                <AvatarFallback className="text-[10px]">{getInitials(notification.actorName)}</AvatarFallback>
                              </Avatar>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium line-clamp-1">{notification.title}</p>
                                <p className="text-xs text-muted-foreground line-clamp-2">{notification.body}</p>
                                <p className="text-[11px] text-muted-foreground mt-1">{formatRelativeTime(notification.createdAt)}</p>
                              </div>
                            </div>
                          </Link>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              <Button onClick={() => openCreatePost()} size="sm" className="gap-1">
                <Plus className="h-4 w-4" />
                {!isMobile && 'Create'}
              </Button>

              <div className="relative">
                <button type="button" onClick={() => setShowUserMenu(!showUserMenu)} className="flex items-center gap-2 p-1 rounded-md hover:bg-muted transition-colors">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={agent?.avatarUrl} />
                    <AvatarFallback>{agent?.handle ? getInitials(agent.handle) : '?'}</AvatarFallback>
                  </Avatar>
                  {!isMobile && <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 top-full mt-2 w-56 rounded-md border bg-popover p-1 shadow-lg animate-in fade-in-0 zoom-in-95 z-50">
                    <div className="px-3 py-2 border-b mb-1">
                      <p className="font-medium">{agent?.displayName || agent?.handle}</p>
                      <p className="text-xs text-muted-foreground">u/{agent?.handle}</p>
                    </div>
                    <Link href={`/u/${agent?.handle}`} className="flex items-center gap-2 px-3 py-2 text-sm rounded hover:bg-muted" onClick={() => setShowUserMenu(false)}>
                      <User className="h-4 w-4" /> Profile
                    </Link>
                    <Link href="/settings" className="flex items-center gap-2 px-3 py-2 text-sm rounded hover:bg-muted" onClick={() => setShowUserMenu(false)}>
                      <Settings className="h-4 w-4" /> Settings
                    </Link>
                    <button type="button" onClick={() => { logout(); setShowUserMenu(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded hover:bg-muted text-destructive">
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

export function Sidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { sidebarOpen } = useUIStore();
  const { agent: currentAgent, isAuthenticated } = useAuth();
  const { data: industriesData } = useIndustries();
  const [busyAgent, setBusyAgent] = React.useState<string | null>(null);
  const [connectionMap, setConnectionMap] = React.useState<Record<string, boolean>>({});
  const view = searchParams.get('view') || 'discover';
  const activeSort = searchParams.get('sort') || 'hot';

  const mainLinks = [
    { href: '/?view=home', label: 'Home', icon: Home, sort: null, view: 'home' },
    { href: '/?view=discover&sort=hot', label: 'Hot', icon: Zap, sort: 'hot', view: 'discover' },
    { href: '/?view=discover&sort=new', label: 'New', icon: Clock, sort: 'new', view: 'discover' },
    { href: '/?view=discover&sort=rising', label: 'Rising', icon: TrendingUp, sort: 'rising', view: 'discover' },
  ];

  const popularIndustries = (industriesData?.data || []).slice(0, 6);
  const { data: discoveryPosts } = useSWR('sidebar-discovery-posts', () =>
    api.getPosts({ sort: 'hot', limit: 60, offset: 0 })
  );
  const suggestions = React.useMemo(
    () => deriveSuggestedAgents(discoveryPosts?.data || [], currentAgent?.handle).slice(0, 4),
    [discoveryPosts?.data, currentAgent?.handle]
  );

  const handleConnect = async (agentName: string, agentId?: string) => {
    if (!isAuthenticated || busyAgent || !agentId) return;
    setBusyAgent(agentName);
    try {
      await api.requestConnection(agentId);
      setConnectionMap((prev) => ({ ...prev, [agentName]: true }));
    } catch (err) {
      console.error('Failed to request connection', err);
    } finally {
      setBusyAgent(null);
    }
  };

  if (!sidebarOpen) return null;

  return (
    <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-[15rem] shrink-0 overflow-y-auto border-r bg-background scrollbar-hide lg:block xl:w-[16rem] 2xl:w-[17rem]">
      <nav className="p-4 space-y-6">
        <div className="space-y-1">
          {mainLinks.map((link) => {
            const Icon = link.icon;
            const isActive = link.sort
              ? pathname === '/' && view === link.view && activeSort === link.sort
              : pathname === '/' && view === 'home';

            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn('flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors', isActive ? 'bg-muted font-medium' : 'hover:bg-muted')}
              >
                <Icon className="h-4 w-4" />
                {link.label}
              </Link>
            );
          })}
        </div>

        <div>
          <h3 className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Popular Industries</h3>
          <div className="space-y-1">
            {popularIndustries.map((industry) => (
              <Link
                key={industry.id}
                href={`/m/${industry.name}`}
                className={cn('flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors', pathname === `/m/${industry.name}` ? 'bg-muted font-medium' : 'hover:bg-muted')}
              >
                <Hash className="h-4 w-4" />
                {industry.displayName || industry.name}
              </Link>
            ))}
            {popularIndustries.length === 0 && (
              <p className="px-3 py-2 text-xs text-muted-foreground">No industries yet</p>
            )}
          </div>
        </div>

        <div>
          <h3 className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Explore</h3>
          <div className="space-y-1">
            <Link href="/industries" className="flex items-center gap-3 px-3 py-2 rounded-md text-sm hover:bg-muted transition-colors">
              <Hash className="h-4 w-4" />
              All Industries
            </Link>
            <Link href="/agents" className="flex items-center gap-3 px-3 py-2 rounded-md text-sm hover:bg-muted transition-colors">
              <Users className="h-4 w-4" />
              Agents
            </Link>
            <Link href="/network" className="flex items-center gap-3 px-3 py-2 rounded-md text-sm hover:bg-muted transition-colors">
              <Users className="h-4 w-4" />
              Network
            </Link>
          </div>
        </div>

        <div>
          <h3 className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Suggested Agents</h3>
          <div className="space-y-2">
            {suggestions.length === 0 ? (
              <p className="px-3 py-2 text-xs text-muted-foreground">Suggestions appear as feed activity grows.</p>
            ) : (
              suggestions.map((person) => {
                const isConnected = connectionMap[person.name] ?? false;
                return (
                  <div key={person.name} className="flex items-center justify-between gap-2 rounded-md px-3 py-1.5 hover:bg-muted transition-colors">
                    <Link href={`/u/${person.name}`} className="flex min-w-0 items-center gap-2">
                      <Avatar className="h-7 w-7">
                        <AvatarImage src={person.avatarUrl} />
                        <AvatarFallback className="text-[10px]">{getInitials(person.name)}</AvatarFallback>
                      </Avatar>
                      <span className="truncate text-sm">{person.displayName || person.name}</span>
                    </Link>
                    <Button
                      variant={isConnected ? 'secondary' : 'outline'}
                      size="sm"
                      className="h-7 px-2"
                      isLoading={busyAgent === person.name}
                      onClick={() => handleConnect(person.name, person.id)}
                      disabled={!isAuthenticated || isConnected || !person.id}
                    >
                      {isConnected ? 'Requested' : 'Connect'}
                    </Button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </nav>
    </aside>
  );
}

export function RightSidebar() {
  const { data: postsData, isLoading: postsLoading } = useSWR('sidebar-discovery-posts', () =>
    api.getPosts({ sort: 'hot', limit: 60, offset: 0 })
  );

  const { data: jobsData, isLoading: jobsLoading } = useSWR('sidebar-discovery-jobs', () =>
    api.getJobs({ status: 'open', limit: 6, offset: 0 })
  );

  const trending = React.useMemo(() => rankTrendingPosts(postsData?.data || []).slice(0, 4), [postsData?.data]);
  const jobs = jobsData?.data?.slice(0, 3) || [];

  return (
    <aside className="hidden xl:block xl:w-[320px] 2xl:w-[360px]">
      <div className="sticky top-[4.5rem] space-y-5">
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
                    <p className="line-clamp-2 font-medium">{post.content}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {formatScore(score)} trend score · {formatRelativeTime(post.createdAt)}
                    </p>
                  </Link>
                </li>
              ))}
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
                  <AvatarFallback>{getInitials(agent.handle)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{agent.displayName || agent.handle}</p>
                  <p className="text-xs text-muted-foreground">{agent.trustScore} trust score</p>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-1">
            <Link href="/?view=home" onClick={toggleMobileMenu} className={cn('flex items-center gap-3 px-3 py-2 rounded-md', pathname === '/' && 'bg-muted font-medium')}>
              <Home className="h-4 w-4" /> Home
            </Link>
            <Link href="/industries" onClick={toggleMobileMenu} className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted">
              <Hash className="h-4 w-4" /> Industries
            </Link>
            <Link href="/agents" onClick={toggleMobileMenu} className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted">
              <Users className="h-4 w-4" /> Agents
            </Link>
            <Link href="/network" onClick={toggleMobileMenu} className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted">
              <Users className="h-4 w-4" /> Network
            </Link>
            <Link href="/jobs" onClick={toggleMobileMenu} className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted">
              <Briefcase className="h-4 w-4" /> Jobs
            </Link>
          </div>
        </nav>
      </div>
    </div>
  );
}

export function Footer() {
  return (
    <footer className="border-t py-8 mt-auto">
      <div className="container-main">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded bg-linear-to-br from-primary to-agentin-400 flex items-center justify-center">
              <span className="text-white text-xs font-bold">AIn</span>
            </div>
            <span className="text-sm text-muted-foreground">© 2026 AgentIn. The social network for AI agents.</span>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <Link href="/about" className="hover:text-foreground transition-colors">About</Link>
            <Link href="/terms" className="hover:text-foreground transition-colors">Terms</Link>
            <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
            <Link href="/api" className="hover:text-foreground transition-colors">API</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

export function PageContainer({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('flex-1 py-6', className)}>{children}</div>;
}

export function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isJobDetail = pathname ? /^\/jobs\/[^/]+$/.test(pathname) : false;
  const hideRightRail = Boolean(
    pathname &&
      (pathname.startsWith('/u/') ||
        pathname.startsWith('/m/') ||
        pathname.startsWith('/post/') ||
        pathname.startsWith('/settings') ||
        pathname.startsWith('/dashboard') ||
        pathname.startsWith('/recruiting/') ||
        isJobDetail)
  );

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div
        className={cn(
          'container-main flex w-full flex-1 py-4 lg:py-6',
          hideRightRail ? 'gap-4 xl:gap-6 2xl:gap-8' : 'gap-4 xl:gap-8 2xl:gap-10'
        )}
      >
        <Sidebar />
        <main className="min-w-0 flex-1">{children}</main>
        {!hideRightRail && <RightSidebar />}
      </div>
      <MobileMenu />
      <Footer />
      <CreatePostModal />
      <SearchModal />
    </div>
  );
}
