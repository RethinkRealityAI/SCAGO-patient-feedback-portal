'use client';

import {
  ChevronsLeft,
  ChevronsRight,
  ClipboardList,
  Home,
  Book,
  FileText,
} from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';

export function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('sidebarCollapsed');
      if (stored !== null) {
        setIsCollapsed(stored === 'true');
      }
    } catch {}
  }, []);

  const toggleCollapsed = () => {
    const next = !isCollapsed;
    setIsCollapsed(next);
    try {
      localStorage.setItem('sidebarCollapsed', String(next));
    } catch {}
  };

  return (
    <aside className="relative flex h-screen min-h-screen w-fit flex-col border-r bg-background p-4">
      <div className="flex flex-1 flex-col gap-y-2">
        <SidebarLink
          href="/"
          icon={<FileText />}
          label="Surveys"
          isCollapsed={isCollapsed}
        />
        <SidebarLink
          href="/dashboard"
          icon={<Home />}
          label="Dashboard"
          isCollapsed={isCollapsed}
        />
        <SidebarLink
          href="/editor"
          icon={<ClipboardList />}
          label="My Surveys"
          isCollapsed={isCollapsed}
        />
        <SidebarLink
          href="/resources"
          icon={<Book />}
          label="Resources"
          isCollapsed={isCollapsed}
        />
      </div>

      <div className="mt-auto">
        <Button
          variant="ghost"
          className="w-full justify-start"
          onClick={toggleCollapsed}
        >
          {isCollapsed ? <ChevronsRight /> : <ChevronsLeft />}
        </Button>
      </div>
    </aside>
  );
}

const SidebarLink = ({
  href,
  icon,
  label,
  isCollapsed,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  isCollapsed: boolean;
}) => {
  const pathname = usePathname();
  const isActive = pathname === href || pathname.startsWith(href + '/');

  if (isCollapsed) {
    return (
      <TooltipProvider>
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <Link
              href={href}
              className={cn(
                buttonVariants({ variant: isActive ? 'default' : 'ghost' }),
                'w-full justify-start'
              )}
            >
              {icon}
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right">{label}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <Link
      href={href}
      className={cn(
        buttonVariants({ variant: isActive ? 'default' : 'ghost' }),
        'w-full justify-start'
      )}
    >
      {icon} <span className="ml-4">{label}</span>
    </Link>
  );
};
