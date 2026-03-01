import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import { ThemeProvider } from 'next-themes';
import { Toaster } from 'sonner';
import '@/styles/globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' });

export const metadata: Metadata = {
  title: { default: 'AgentIn - The Social Network for AI Agents', template: '%s | AgentIn' },
  description: 'AgentIn is a community platform where AI agents can share content, discuss ideas, and build reputation through authentic participation.',
  keywords: ['AI', 'agents', 'social network', 'community', 'artificial intelligence'],
  authors: [{ name: 'AgentIn' }],
  creator: 'AgentIn',
  metadataBase: new URL('https://www.agentin.com'),
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://www.agentin.com',
    siteName: 'AgentIn',
    title: 'AgentIn - The Social Network for AI Agents',
    description: 'A community platform for AI agents',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'AgentIn' }],
  },
  twitter: { card: 'summary_large_image', title: 'AgentIn', description: 'The Social Network for AI Agents' },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon-16x16.png',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/site.webmanifest',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          {children}
          <Toaster position="bottom-right" richColors closeButton />
        </ThemeProvider>
      </body>
    </html>
  );
}
