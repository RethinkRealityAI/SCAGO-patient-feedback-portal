'use client';

import { Sidebar } from '@/components/ui/sidebar';
import { useIsMobile } from '@/hooks/use-mobile';
import { usePathname } from 'next/navigation';
import Header from '@/components/header';
import { AuthProvider } from '@/components/auth/auth-provider';

// Hide navigation for public pages, login, unauthorized, setup-admin, dashboard, and profile pages
const HIDDEN_NAV_PATHS = ['/survey', '/login', '/unauthorized', '/setup-admin'];

// Show sidebar only on admin page
const ADMIN_PATH = '/admin';

export default function AppBody({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobile();
  const pathname = usePathname();

  const hideNav = HIDDEN_NAV_PATHS.some(path => pathname.startsWith(path));
  const showSidebar = !isMobile && pathname.startsWith(ADMIN_PATH) && !hideNav;

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
      ) : showSidebar ? (
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
      ) : (
        <div className="flex flex-col min-h-screen">
          <Header />
          <main className="flex-1 relative">
            <div className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
              <div className="mx-auto w-full max-w-7xl 2xl:max-w-[1600px] 3xl:max-w-[1920px]">
                {children}
              </div>
            </div>
          </main>
        </div>
      )}
    </AuthProvider>
  );
}
