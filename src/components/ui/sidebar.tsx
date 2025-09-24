'use client';

import {
  ChevronsLeft,
  ChevronsRight,
  ClipboardList,
  Home,
  Bot,
  Wand2,
} from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useState, useTransition } from 'react';
import { analyzeFeedback } from '@/app/dashboard/actions';
import { useToast } from '@/hooks/use-toast';

export function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const handleAnalyze = () => {
    startTransition(async () => {
        const result = await analyzeFeedback();
        if (result.error) {
            toast({
                variant: 'destructive',
                title: 'Analysis Failed',
                description: result.error,
            });
        } else {
            toast({
                title: 'Analysis Complete',
                description: 'The AI-powered analysis of the latest feedback is complete.',
            });
        }
    });
  };

  return (
    <aside className="relative flex h-screen min-h-screen w-fit flex-col border-r bg-background p-4">
      <div className="flex flex-1 flex-col gap-y-2">
        <SidebarLink
          href="/dashboard"
          icon={<Home />}
          label="Dashboard"
          isCollapsed={isCollapsed}
        />
        <SidebarLink
          href="/editor"
          icon={<ClipboardList />}
          label="Survey Editor"
          isCollapsed={isCollapsed}
        />
        <Accordion type="single" collapsible>
          <AccordionItem value="ai-tools" className="border-b-0">
            <AccordionTrigger
              className={cn(
                buttonVariants({ variant: 'ghost' }),
                'justify-between'
              )}
            >
              <div className="flex items-center">
                <Bot /> {!isCollapsed && <span className="ml-4">AI Tools</span>}
              </div>
            </AccordionTrigger>
            <AccordionContent>
                <Button variant="ghost" className="w-full justify-start" onClick={handleAnalyze} disabled={isPending}>
                    <Wand2 />
                    {!isCollapsed && <span className="ml-4">Analyze Feedback</span>}
                </Button>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>

      <div className="mt-auto">
        <Button
          variant="ghost"
          className="w-full justify-start"
          onClick={() => setIsCollapsed(!isCollapsed)}
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
  const isActive = pathname === href;

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
