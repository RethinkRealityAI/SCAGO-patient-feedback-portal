'use client';

import { Sidebar } from '@/components/ui/sidebar';
import { useIsMobile } from '@/hooks/use-mobile';
import { usePathname } from 'next/navigation';
import Header from '@/components/header';
import { AuthProvider } from '@/components/auth/auth-provider';

// Hide navigation for public pages, login, unauthorized, setup-admin, and youth empowerment dashboard
const HIDDEN_NAV_PATHS = ['/survey', '/youth-empowerment', '/login', '/unauthorized', '/setup-admin'];

export default function AppBody({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobile();
  const pathname = usePathname();

  const hideNav = HIDDEN_NAV_PATHS.some(path => pathname.startsWith(path));

  return (
    <AuthProvider>
      {hideNav ? (
        <main className="flex-1 min-h-screen">
          <div className="relative py-6 px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-6xl">
              {children}
            </div>
          </div>
        </main>
      ) : isMobile ? (
        <div className="flex flex-col min-h-screen">
          <Header />
          <main className="flex-1 relative">
            <div className="p-4 sm:p-6">
              {children}
            </div>
          </main>
        </div>
      ) : (
        <div className="flex min-h-screen">
          <Sidebar />
          <div className="flex-1 flex flex-col min-h-screen">
            <main className="flex-1 relative overflow-y-auto">
              <div className="p-4 sm:p-6 lg:p-8">
                <div className="mx-auto max-w-7xl w-full">
                  {children}
                </div>
              </div>
            </main>
          </div>
        </div>
      )}
    </AuthProvider>
  );
}
