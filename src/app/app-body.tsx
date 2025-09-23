'use client';

import { usePathname } from 'next/navigation';
import Header from '@/components/header';

export default function AppBody({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const showHeader = !pathname.startsWith('/survey');

  return (
    <div className="relative flex min-h-screen flex-col">
      {showHeader && <Header />}
      <main className="flex-1">{children}</main>
    </div>
  );
}
