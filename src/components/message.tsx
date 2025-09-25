'use client';

import { IconUser, IconAssistant } from '@/components/ui/icons'; // Assuming you have these icons

export function Message({
  role,
  children,
}: {
  role: 'user' | 'assistant';
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-4 p-4">
      <div
        className={`flex h-8 w-8 items-center justify-center rounded-full border ${
          role === 'user' ? 'bg-background' : 'bg-primary text-primary-foreground'
        }`}
      >
        {role === 'user' ? <IconUser /> : <IconAssistant />}
      </div>
      <div className="flex-1 space-y-2 overflow-hidden pt-1">{children}</div>
    </div>
  );
}