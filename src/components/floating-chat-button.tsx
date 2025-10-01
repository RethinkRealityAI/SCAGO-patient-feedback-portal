'use client';

import { useState } from 'react';
import { X, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import AIChatInterface from '@/components/ai-chat-interface';
import { cn } from '@/lib/utils';

interface FloatingChatButtonProps {
  onSendQuery: (query: string) => Promise<string>;
  surveyId?: string;
  surveyType?: 'feedback' | 'consent' | 'overview';
}

export default function FloatingChatButton({ onSendQuery, surveyId, surveyType }: FloatingChatButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Floating Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={() => setIsOpen(true)}
          className={cn(
            "h-16 w-16 rounded-full shadow-2xl",
            "bg-gradient-to-br from-[#C8262A]/90 via-[#D34040]/90 to-[#C8262A]/90",
            "backdrop-blur-xl border-2 border-white/30",
            "transition-all duration-300 ease-out",
            "relative overflow-hidden group",
            // Only show hover effects when chat is closed
            !isOpen && "hover:scale-110 hover:shadow-[0_0_30px_rgba(200,38,42,0.6)]",
            !isOpen && "animate-pulse-slow",
            // Animated glow effect (only when closed)
            !isOpen && "before:absolute before:inset-0 before:rounded-full",
            !isOpen && "before:bg-gradient-to-r before:from-[#C8262A] before:via-[#FF4444] before:to-[#C8262A]",
            !isOpen && "before:opacity-0 group-hover:before:opacity-20",
            !isOpen && "before:blur-xl before:transition-opacity before:duration-500",
            // Dimmed when open
            isOpen && "opacity-60 scale-90"
          )}
        >
          <div className="relative">
            {/* Main Icon */}
            <Sparkles className="h-7 w-7 text-white drop-shadow-lg" />
            
            {/* Notification Badge */}
            <div className="absolute -top-1 -right-1 h-3 w-3 bg-white rounded-full animate-ping" />
            <div className="absolute -top-1 -right-1 h-3 w-3 bg-white rounded-full" />
          </div>
        </Button>

        {/* Tooltip */}
        <div className="absolute bottom-full right-0 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          <div className="bg-gray-900/90 backdrop-blur-sm text-white text-xs px-3 py-1.5 rounded-lg whitespace-nowrap">
            AI Insights Chat
            <div className="absolute top-full right-6 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-900/90" />
          </div>
        </div>
      </div>

      {/* Chat Dialog - Responsive sizing */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent 
          className={cn(
            "w-[95vw] max-w-5xl h-[85vh] sm:h-[80vh] p-0 gap-0 rounded-3xl overflow-hidden",
            // Enhanced Glassmorphism - lighter and more vibrant
            "bg-gradient-to-br from-white/95 via-blue-50/30 to-purple-50/20",
            "dark:from-gray-900/95 dark:via-blue-950/30 dark:to-purple-950/20",
            "backdrop-blur-3xl backdrop-saturate-[180%]",
            "border border-white/60 dark:border-gray-700/60",
            "shadow-[0_20px_70px_rgba(0,0,0,0.2)]",
            // Remove the default close button
            "[&>button]:hidden"
          )}
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          {/* Visually hidden title for accessibility */}
          <DialogTitle className="sr-only">AI Insights Chat</DialogTitle>
          
          {/* Custom close button with glassmorphic style */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsOpen(false)}
            className={cn(
              "absolute top-5 right-5 z-50 rounded-2xl h-10 w-10",
              "bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl",
              "border border-white/80 dark:border-gray-700/80",
              "hover:bg-[#C8262A]/10 hover:border-[#C8262A]/40",
              "hover:scale-110 active:scale-95",
              "transition-all duration-200",
              "shadow-lg hover:shadow-xl"
            )}
          >
            <X className="h-5 w-5 text-gray-700 dark:text-gray-300" />
          </Button>
          
          {/* Chat Interface - No redundant title */}
          <div className="h-full w-full overflow-hidden">
            <AIChatInterface
              onSendQuery={onSendQuery}
              surveyId={surveyId}
              surveyType={surveyType}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Custom pulse animation */}
      <style jsx global>{`
        @keyframes pulse-slow {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.85;
          }
        }
        
        .animate-pulse-slow {
          animation: pulse-slow 3s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `}</style>
    </>
  );
}