'use client';

import { useState, useEffect, useContext } from 'react';
import {
  ChevronsLeft,
  ChevronsRight,
  ClipboardList,
  Home,
  Book,
  FileText,
  LogOut,
  User,
  Shield,
  Users,
  GraduationCap,
} from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { AuthContext } from '@/components/auth/auth-provider';
import { signOut } from '@/lib/firebase-auth';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [isPinned, setIsPinned] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const { user, isAdmin, isYEPManager, userRole } = useContext(AuthContext);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    try {
      const stored = localStorage.getItem('sidebarPinned');
      if (stored !== null) {
        const pinned = stored === 'true';
        setIsPinned(pinned);
        setIsCollapsed(!pinned);
      }
    } catch {}
  }, []);

  const togglePin = () => {
    const nextPinned = !isPinned;
    setIsPinned(nextPinned);
    setIsCollapsed(!nextPinned);
    try {
      localStorage.setItem('sidebarPinned', String(nextPinned));
    } catch {}
  };

  const handleMouseEnter = () => {
    if (!isPinned) {
      setIsHovering(true);
      setIsCollapsed(false);
    }
  };

  const handleMouseLeave = () => {
    if (!isPinned) {
      setIsHovering(false);
      setIsCollapsed(true);
    }
  };

  const shouldShowExpanded = !isCollapsed || isHovering;

  const handleLogout = async () => {
    const result = await signOut();
    if (result.error) {
      toast({
        title: 'Error',
        description: result.error,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Logged out',
        description: 'You have been successfully logged out.',
      });
      router.push('/login');
    }
  };

  const getUserInitials = (email: string | null) => {
    if (!email) return 'U';
    return email.substring(0, 2).toUpperCase();
  };

  const getRoleBadge = () => {
    if (isAdmin) return { icon: <Shield className="h-3 w-3" />, label: 'Admin', color: 'text-blue-600' };
    if (isYEPManager) return { icon: <Users className="h-3 w-3" />, label: 'YEP Manager', color: 'text-green-600' };
    return { icon: <User className="h-3 w-3" />, label: 'User', color: 'text-gray-600' };
  };

  return (
    <aside 
      className={cn(
        "sticky top-0 flex h-screen flex-col border-r bg-background p-4 overflow-y-auto transition-all duration-300 ease-in-out",
        shouldShowExpanded ? "w-64" : "w-fit"
      )}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="flex flex-1 flex-col gap-y-2">
        <SidebarLink
          href="/"
          icon={<FileText />}
          label="Surveys"
          isCollapsed={!shouldShowExpanded}
        />
        <SidebarLink
          href="/dashboard"
          icon={<Home />}
          label="Dashboard"
          isCollapsed={!shouldShowExpanded}
        />
        <SidebarLink
          href="/editor"
          icon={<ClipboardList />}
          label="Survey Editor"
          isCollapsed={!shouldShowExpanded}
        />
        <SidebarLink
          href="/resources"
          icon={<Book />}
          label="Resources"
          isCollapsed={!shouldShowExpanded}
        />
        {(isAdmin || isYEPManager) && (
          <SidebarLink
            href="/youth-empowerment"
            icon={<GraduationCap />}
            label="YEP Dashboard"
            isCollapsed={!shouldShowExpanded}
          />
        )}
        {isAdmin && (
          <SidebarLink
            href="/admin"
            icon={<Shield />}
            label="Admin Panel"
            isCollapsed={!shouldShowExpanded}
          />
        )}
        <SidebarLink
          href="/profile"
          icon={<User />}
          label="Profile"
          isCollapsed={!shouldShowExpanded}
        />
      </div>

      <div className="mt-auto space-y-2">
        {user && (
          <div className="border-t pt-2">
            {!shouldShowExpanded ? (
              <TooltipProvider>
                <Tooltip delayDuration={0}>
                  <TooltipTrigger asChild>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="w-full p-2 h-auto">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-xs">
                              {getUserInitials(user.email)}
                            </AvatarFallback>
                          </Avatar>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent side="right" align="end" className="w-56">
                        <DropdownMenuLabel className="font-normal">
                          <div className="flex flex-col space-y-1">
                            <p className="text-sm font-medium leading-none">{user.email}</p>
                            <p className="text-xs leading-none text-muted-foreground flex items-center gap-1 mt-1">
                              {getRoleBadge().icon}
                              {getRoleBadge().label}
                            </p>
                          </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={handleLogout} className="text-red-600 cursor-pointer">
                          <LogOut className="mr-2 h-4 w-4" />
                          <span>Log out</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <div className="text-xs">
                      <div className="font-medium">{user.email}</div>
                      <div className="text-muted-foreground">{getRoleBadge().label}</div>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="w-full justify-start p-2 h-auto hover:bg-accent">
                    <Avatar className="h-8 w-8 mr-3">
                      <AvatarFallback className="text-xs">
                        {getUserInitials(user.email)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col items-start flex-1 min-w-0">
                      <span className="text-sm font-medium truncate w-full">{user.email}</span>
                      <span className={cn("text-xs flex items-center gap-1", getRoleBadge().color)}>
                        {getRoleBadge().icon}
                        {getRoleBadge().label}
                      </span>
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent side="right" align="end" className="w-56">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{user.email}</p>
                      <p className="text-xs leading-none text-muted-foreground flex items-center gap-1 mt-1">
                        {getRoleBadge().icon}
                        {getRoleBadge().label}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-red-600 cursor-pointer">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        )}
        
        {shouldShowExpanded && (
          <TooltipProvider>
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={togglePin}
                >
                  {isPinned ? (
                    <>
                      <ChevronsLeft className="h-4 w-4" />
                      <span className="ml-2">Unpin</span>
                    </>
                  ) : (
                    <>
                      <ChevronsRight className="h-4 w-4" />
                      <span className="ml-2">Pin Open</span>
                    </>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                {isPinned ? "Unpin sidebar" : "Pin sidebar open"}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
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
      {icon} 
      <span className="ml-4 whitespace-nowrap overflow-hidden transition-opacity duration-200">
        {label}
      </span>
    </Link>
  );
};
