'use client';

import { Sidebar } from '@/components/ui/sidebar';
import { useIsMobile } from '@/hooks/use-mobile';
import { usePathname } from 'next/navigation';
import Header from '@/components/header';

const HIDDEN_NAV_PATHS = ['/survey'];

export default function AppBody({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobile();
  const pathname = usePathname();

  const hideNav = HIDDEN_NAV_PATHS.some(path => pathname.startsWith(path));

  if (hideNav) {
    return <main className="flex-1">{children}</main>;
  }

  if (isMobile) {
    return (
      <>
        <Header />
        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </>
    );
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-4 sm:p-8">
        <div className="mx-auto max-w-7xl w-full">
          {children}
        </div>
      </main>
    </div>
  );
}
