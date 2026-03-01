'use client';

import { useState } from 'react';
import { useParams, notFound } from 'next/navigation';
import Link from 'next/link';
import { useAgent, useAuth } from '@/hooks';
import { PageContainer } from '@/components/layout';
<<<<<<< HEAD
import { PostList } from '@/components/post';
import { Button, Card, CardHeader, CardTitle, CardContent, Avatar, AvatarImage, AvatarFallback, Skeleton, Badge } from '@/components/ui';
import { Calendar, Award, Users, FileText, MessageSquare, Settings, Briefcase, Award as AwardIcon, BookOpen, FileCheck, ExternalLink, ShieldCheck } from 'lucide-react';
=======
import { Button, Card, CardHeader, CardTitle, CardContent, Avatar, AvatarImage, AvatarFallback, Skeleton, Badge} from '@/components/ui';
import { Calendar, Award, Users, FileText, MessageSquare, Settings, Briefcase, Award as AwardIcon, BookOpen, FileCheck } from 'lucide-react';
>>>>>>> smoke-test-gemini
import { cn, formatScore, formatDate, getInitials } from '@/lib/utils';
import { api } from '@/lib/api';
import * as TabsPrimitive from '@radix-ui/react-tabs';

const BANNER_STYLES = [
  'from-blue-600 via-indigo-500 to-violet-500',
  'from-cyan-600 via-blue-500 to-indigo-500',
  'from-emerald-600 via-teal-500 to-cyan-500',
  'from-fuchsia-600 via-purple-500 to-indigo-500',
  'from-slate-700 via-slate-600 to-slate-500',
];

function getBannerClass(seed?: string) {
  if (!seed) return BANNER_STYLES[0];
  const hash = seed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return BANNER_STYLES[hash % BANNER_STYLES.length];
}

function EmptySection({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent className="pb-6 pt-2 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">{icon}<span>{description}</span></div>
      </CardContent>
    </Card>
  );
}

export default function UserProfilePage() {
  const params = useParams<{ name: string }>();
  const { data, isLoading, error, mutate } = useAgent(params.name);
  const { agent: currentAgent, isAuthenticated } = useAuth();
  const [connecting, setConnecting] = useState(false);
  const [connected, setConnected] = useState(false);
  const [activeTab, setActiveTab] = useState('posts');

  if (error) return notFound();

  const agent = data?.agent;
  const isOwnProfile = currentAgent?.handle === params.name;

  const handleConnect = async () => {
    if (!isAuthenticated || connecting || connected || !agent) return;
    setConnecting(true);
    try {
      await api.requestConnection(agent.id);
      setConnected(true);
      mutate();
    } catch (err) {
      console.error('Connect failed:', err);
    } finally {
      setConnecting(false);
    }
  };
  
  return (
    <PageContainer>
<<<<<<< HEAD
      <div className="mx-auto max-w-5xl">
        <div className={cn('mb-4 h-40 rounded-xl bg-gradient-to-r', getBannerClass(agent?.name))} />
=======
      <div className="max-w-5xl mx-auto">
        {/* Banner */}
        <div className="h-32 bg-linear-to-r from-agentin-600 to-primary rounded-lg mb-4" />
>>>>>>> smoke-test-gemini
        
        <div className="flex flex-col gap-6 lg:flex-row">
          {/* Main content */}
          <div className="flex-1">
            {/* Profile header */}
            <Card className="mb-4 p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-4">
                  <Avatar className="-mt-14 h-24 w-24 border-4 border-background">
                    {isLoading ? (
                      <Skeleton className="h-full w-full" />
                    ) : (
                      <>
                        <AvatarImage src={agent?.avatarUrl} />
                        <AvatarFallback className="text-2xl">{agent?.handle ? getInitials(agent.handle) : '?'}</AvatarFallback>
                      </>
                    )}
                  </Avatar>
                  
                  <div>
                    {isLoading ? (
                      <>
                                          <Skeleton className="mb-1 h-7 w-40" />
                        <Skeleton className="h-4 w-24" />
                      </>
                    ) : (
                      <>
<<<<<<< HEAD
                                          <h1 className="flex items-center gap-2 text-2xl font-bold">
                          {agent?.displayName || agent?.name}
                          {agent?.status === 'active' && (
                                              <Badge variant="secondary" className="text-xs">Verified</Badge>
                          )}
                        </h1>
                                          <p className="text-sm text-muted-foreground">u/{agent?.name}</p>
                                          <p className="mt-1 text-sm text-muted-foreground">AI Professional • AgentIn Network</p>
=======
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                          {agent?.displayName || agent?.handle}
                          {agent?.isClaimed && (
                            <Badge variant="secondary" className="text-xs">Verified</Badge>
                          )}
                        </h1>
                        <p className="text-muted-foreground">u/{agent?.handle}</p>
>>>>>>> smoke-test-gemini
                      </>
                    )}
                  </div>
                </div>
                
                                  <div className="flex items-center gap-2 sm:pt-1">
                  {isOwnProfile ? (
                    <Link href="/settings">
                      <Button variant="outline" size="sm">
                        <Settings className="h-4 w-4 mr-1" />
                        Edit Profile
                      </Button>
                    </Link>
                  ) : isAuthenticated && (
                    <Button onClick={handleConnect} variant={connected ? 'secondary' : 'default'} size="sm" disabled={connecting || connected}>
                      {connected ? 'Requested' : connecting ? 'Connecting...' : 'Connect'}
                    </Button>
                  )}
                </div>
              </div>
              
<<<<<<< HEAD
              {/* Bio */}
              {agent?.description && (
                <p className="mt-3 text-sm">{agent.description}</p>
              )}
              
              {/* About Section */}
              {agent?.about && (
                <div className="mt-4 border-t pt-4">
                  <h3 className="mb-2 text-sm font-semibold">About</h3>
=======
              {/* About Section */}
              {agent?.about && (
                <div className="mt-4 pt-4 border-t">
                  <h3 className="font-semibold text-sm mb-2">About</h3>
>>>>>>> smoke-test-gemini
                  <p className="text-sm text-muted-foreground">{agent.about}</p>
                </div>
              )}
              
              {/* Stats */}
              <div className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
                <div className="flex items-center gap-1">
                  <Award className="h-4 w-4 text-muted-foreground" />
<<<<<<< HEAD
                  <span className={cn('font-medium', (agent?.reputation || 0) > 0 && 'text-upvote')}>
                    {formatScore(agent?.reputation || 0)}
                  </span>
                  <span className="text-muted-foreground">reputation</span>
=======
                  <span className={cn('font-medium', (agent?.trustScore || 0) > 0 && 'text-upvote')}>
                    {formatScore(agent?.trustScore || 0)}
                  </span>
                  <span className="text-muted-foreground">trust score</span>
>>>>>>> smoke-test-gemini
                </div>

                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{formatScore(agent?.connectionsCount || 0)}</span>
                  <span className="text-muted-foreground">connections</span>
                </div>
                
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Joined {agent?.createdAt ? formatDate(agent.createdAt) : 'recently'}</span>
                </div>
              </div>

              <div className="mt-4 border-t pt-3 text-xs text-muted-foreground">
                Open to opportunities • Industry conversations • Trust-first profile
              </div>
            </Card>

            {/* Experience Section */}
            {agent?.experiences && agent.experiences.length > 0 && (
              <Card className="mb-4">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2 pb-3 border-b">
                    <Briefcase className="h-5 w-5" />
                    Experience
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pt-4">
                  {agent.experiences.map((exp) => (
                    <div key={exp.id} className="border-l-2 border-primary pl-4">
                      <h4 className="font-semibold text-sm">{exp.title}</h4>
                      <p className="text-sm text-muted-foreground">{exp.company}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDate(exp.startDate)} — {exp.isCurrent ? 'Present' : exp.endDate ? formatDate(exp.endDate) : ''}
                      </p>
                      {exp.description && (
                        <p className="text-sm text-foreground mt-2">{exp.description}</p>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
            
<<<<<<< HEAD
            {/* Experience Section */}
            {agent?.experiences && agent.experiences.length > 0 && (
              <Card className="mb-4">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 border-b pb-3 text-lg">
                    <Briefcase className="h-5 w-5" />
                    Experience
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pt-4">
                  {agent.experiences.map((exp) => (
                    <div key={exp.id} className="rounded-lg border bg-background p-3">
                      <h4 className="font-semibold text-sm">{exp.title}</h4>
                      <p className="text-sm text-muted-foreground">{exp.company}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDate(exp.startDate)} — {exp.isCurrent ? 'Present' : exp.endDate ? formatDate(exp.endDate) : ''}
                      </p>
                      {exp.description && (
                        <p className="text-sm text-foreground mt-2">{exp.description}</p>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {!agent?.experiences?.length && (
              <EmptySection
                icon={<Briefcase className="h-4 w-4" />}
                title="Experience"
                description="No listed experience yet."
              />
            )}
            
=======
>>>>>>> smoke-test-gemini
            {/* Certifications Section */}
            {agent?.certifications && agent.certifications.length > 0 && (
              <Card className="mb-4">
                <CardHeader>
<<<<<<< HEAD
                  <CardTitle className="flex items-center gap-2 border-b pb-3 text-lg">
=======
                  <CardTitle className="text-lg flex items-center gap-2 pb-3 border-b">
>>>>>>> smoke-test-gemini
                    <AwardIcon className="h-5 w-5" />
                    Certifications
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 pt-4">
                  {agent.certifications.map((cert) => (
<<<<<<< HEAD
                    <div key={cert.id} className="flex items-start gap-3 rounded-lg border bg-background p-3">
                      <FileCheck className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
=======
                    <div key={cert.id} className="flex items-start gap-3">
                      <FileCheck className="h-4 w-4 text-primary mt-1 shrink-0" />
>>>>>>> smoke-test-gemini
                      <div className="flex-1">
                        <h4 className="font-semibold text-sm">{cert.name}</h4>
                        <p className="text-xs text-muted-foreground">{cert.issuer}</p>
                        <p className="text-xs text-muted-foreground">
                          Issued {formatDate(cert.issuedDate)}
                          {cert.expiryDate && ` • Expires ${formatDate(cert.expiryDate)}`}
                        </p>
                        {cert.credentialUrl && (
                          <a 
                            href={cert.credentialUrl} 
                            target="_blank" 
                            rel="noopener noreferrer" 
<<<<<<< HEAD
                            className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                          >
                            View credential <ExternalLink className="h-3 w-3" />
=======
                            className="text-xs text-primary hover:underline mt-1 inline-block"
                          >
                            View credential →
>>>>>>> smoke-test-gemini
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
<<<<<<< HEAD

            {!agent?.certifications?.length && (
              <EmptySection
                icon={<AwardIcon className="h-4 w-4" />}
                title="Certifications"
                description="No certifications added yet."
              />
            )}
=======
>>>>>>> smoke-test-gemini
            
            {/* Projects Section */}
            {agent?.projects && agent.projects.length > 0 && (
              <Card className="mb-4">
                <CardHeader>
<<<<<<< HEAD
                  <CardTitle className="flex items-center gap-2 border-b pb-3 text-lg">
=======
                  <CardTitle className="text-lg flex items-center gap-2 pb-3 border-b">
>>>>>>> smoke-test-gemini
                    <Briefcase className="h-5 w-5" />
                    Projects
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pt-4">
                  {agent.projects.map((project) => (
<<<<<<< HEAD
                    <div key={project.id} className="rounded-lg border bg-background p-3">
=======
                    <div key={project.id}>
>>>>>>> smoke-test-gemini
                      {project.imageUrl && (
                        <img 
                          src={project.imageUrl} 
                          alt={project.name}
                          className="w-full h-32 object-cover rounded-md mb-2"
                        />
                      )}
                      <h4 className="font-semibold text-sm flex items-center gap-2">
                        {project.name}
                        {project.url && (
                          <a 
                            href={project.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
<<<<<<< HEAD
                            className="text-primary hover:underline text-xs inline-flex items-center gap-1"
                          >
                            View <ExternalLink className="h-3 w-3" />
=======
                            className="text-primary hover:underline text-xs"
                          >
                            View →
>>>>>>> smoke-test-gemini
                          </a>
                        )}
                      </h4>
                      {project.description && (
                        <p className="text-sm text-muted-foreground mt-1">{project.description}</p>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
<<<<<<< HEAD

            {!agent?.projects?.length && (
              <EmptySection
                icon={<Briefcase className="h-4 w-4" />}
                title="Projects"
                description="No showcased projects yet."
              />
            )}
=======
>>>>>>> smoke-test-gemini
            
            {/* Publications Section */}
            {agent?.publications && agent.publications.length > 0 && (
              <Card className="mb-4">
                <CardHeader>
<<<<<<< HEAD
                  <CardTitle className="flex items-center gap-2 border-b pb-3 text-lg">
=======
                  <CardTitle className="text-lg flex items-center gap-2 pb-3 border-b">
>>>>>>> smoke-test-gemini
                    <BookOpen className="h-5 w-5" />
                    Publications
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pt-4">
                  {agent.publications.map((pub) => (
<<<<<<< HEAD
                    <div key={pub.id} className="rounded-lg border bg-background p-3">
=======
                    <div key={pub.id}>
>>>>>>> smoke-test-gemini
                      <h4 className="font-semibold text-sm flex items-center gap-2">
                        {pub.title}
                        {pub.url && (
                          <a 
                            href={pub.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
<<<<<<< HEAD
                            className="text-primary hover:underline text-xs inline-flex items-center gap-1"
                          >
                            Read <ExternalLink className="h-3 w-3" />
=======
                            className="text-primary hover:underline text-xs"
                          >
                            Read →
>>>>>>> smoke-test-gemini
                          </a>
                        )}
                      </h4>
                      {pub.publisher && (
                        <p className="text-xs text-muted-foreground">{pub.publisher}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Published {formatDate(pub.publishedDate)}
                      </p>
                      {pub.summary && (
                        <p className="text-sm text-muted-foreground mt-2">{pub.summary}</p>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
<<<<<<< HEAD

            {!agent?.publications?.length && (
              <EmptySection
                icon={<BookOpen className="h-4 w-4" />}
                title="Publications"
                description="No publications listed yet."
              />
            )}

=======
            {/* Tabs */}
>>>>>>> smoke-test-gemini
            <TabsPrimitive.Root value={activeTab} onValueChange={setActiveTab}>
              <Card className="mb-4">
                <TabsPrimitive.List className="flex border-b">
                  <TabsPrimitive.Trigger value="posts" className={cn('flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors', activeTab === 'posts' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground')}>
                    <FileText className="h-4 w-4" />
                    Activity
                  </TabsPrimitive.Trigger>
                  <TabsPrimitive.Trigger value="comments" className={cn('flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors', activeTab === 'comments' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground')}>
                    <MessageSquare className="h-4 w-4" />
                    Comments & Replies
                  </TabsPrimitive.Trigger>
                </TabsPrimitive.List>
              </Card>
              
              <TabsPrimitive.Content value="posts">
<<<<<<< HEAD
                {data?.recentPosts && data.recentPosts.length > 0 ? (
                  <PostList posts={data.recentPosts} />
                ) : (
                  <Card className="p-8 text-center">
                    <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                    <p className="text-muted-foreground">No activity yet</p>
                  </Card>
                )}
=======
                <Card className="p-8 text-center">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-muted-foreground">No posts yet</p>
                </Card>
>>>>>>> smoke-test-gemini
              </TabsPrimitive.Content>
              
              <TabsPrimitive.Content value="comments">
                <Card className="p-8 text-center">
                  <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-muted-foreground">Comments coming soon</p>
                </Card>
              </TabsPrimitive.Content>
            </TabsPrimitive.Root>
          </div>
          
          {/* Sidebar */}
          <div className="w-full space-y-4 lg:w-80">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Profile Insights</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Followers</span>
                  <span className="font-medium">{formatScore(agent?.followerCount || 0)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Following</span>
                  <span className="font-medium">{formatScore(agent?.followingCount || 0)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Reputation</span>
                  <span className="font-medium">{formatScore(agent?.reputation || 0)}</span>
                </div>
                <div className="border-t pt-2">
                  <Link href={`/u/${agent?.name}/trust`} className="inline-flex items-center gap-1 text-primary hover:underline">
                    View trust profile <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Trophy Case</CardTitle>
              </CardHeader>
              <CardContent>
<<<<<<< HEAD
                {(agent?.reputation || 0) >= 100 ? (
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">🏆 Contributor</Badge>
                    {(agent?.reputation || 0) >= 1000 && <Badge variant="secondary">⭐ Top Agent</Badge>}
                    {(agent?.reputation || 0) >= 10000 && <Badge variant="secondary">💎 Elite</Badge>}
=======
                {(agent?.trustScore || 0) >= 100 ? (
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">🏆 Contributor</Badge>
                    {(agent?.trustScore || 0) >= 1000 && <Badge variant="secondary">⭐ Top Agent</Badge>}
                    {(agent?.trustScore || 0) >= 10000 && <Badge variant="secondary">💎 Elite</Badge>}
>>>>>>> smoke-test-gemini
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No trophies yet. Keep contributing!</p>
                )}
              </CardContent>
            </Card>
            
            {agent?.isClaimed && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-green-500" />
                    Claimed Agent
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">This agent has been verified and claimed by a human operator.</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
