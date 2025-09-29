'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Send, 
  Sparkles, 
  TrendingUp, 
  AlertTriangle, 
  Heart, 
  Hospital, 
  Users, 
  BarChart3,
  MessageSquare,
  Loader2,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface PredefinedQuery {
  id: string;
  icon: React.ReactNode;
  label: string;
  query: string;
  category: 'performance' | 'quality' | 'trends' | 'insights';
  color: string;
}

const predefinedQueries: PredefinedQuery[] = [
  {
    id: 'high-pain-scores',
    icon: <AlertTriangle className="h-4 w-4" />,
    label: 'High Pain Scores',
    query: 'How many patients reported high pain scores (7+ out of 10)? Show me the breakdown and any patterns.',
    category: 'quality',
    color: 'from-red-500/10 to-red-600/5'
  },
  {
    id: 'low-ratings',
    icon: <TrendingUp className="h-4 w-4" />,
    label: 'Subpar Hospitals',
    query: 'Which hospitals received ratings below 5/10? Show me the hospitals ranked from lowest to highest rating.',
    category: 'performance',
    color: 'from-orange-500/10 to-orange-600/5'
  },
  {
    id: 'top-performers',
    icon: <Heart className="h-4 w-4" />,
    label: 'Top Performers',
    query: 'Which hospitals are performing best? Show me the top 5 hospitals by rating with their average scores.',
    category: 'performance',
    color: 'from-green-500/10 to-green-600/5'
  },
  {
    id: 'wait-times',
    icon: <Hospital className="h-4 w-4" />,
    label: 'Wait Time Issues',
    query: 'Analyze feedback mentioning wait times. How many patients complained about long waits and which departments?',
    category: 'insights',
    color: 'from-blue-500/10 to-blue-600/5'
  },
  {
    id: 'patient-satisfaction',
    icon: <Users className="h-4 w-4" />,
    label: 'Patient Satisfaction',
    query: 'What is the overall patient satisfaction rate? Show me promoters (9-10), passives (7-8), and detractors (<7).',
    category: 'performance',
    color: 'from-purple-500/10 to-purple-600/5'
  },
  {
    id: 'common-complaints',
    icon: <MessageSquare className="h-4 w-4" />,
    label: 'Common Complaints',
    query: 'What are the most common complaints or issues mentioned in the feedback? Group by theme.',
    category: 'insights',
    color: 'from-yellow-500/10 to-yellow-600/5'
  },
  {
    id: 'emergency-vs-outpatient',
    icon: <BarChart3 className="h-4 w-4" />,
    label: 'Visit Type Comparison',
    query: 'Compare ratings between emergency department visits and outpatient clinic visits. Which has better satisfaction?',
    category: 'trends',
    color: 'from-indigo-500/10 to-indigo-600/5'
  },
  {
    id: 'recent-trends',
    icon: <TrendingUp className="h-4 w-4" />,
    label: 'Recent Trends',
    query: 'What are the trends in patient feedback over the last 30 days? Are ratings improving or declining?',
    category: 'trends',
    color: 'from-cyan-500/10 to-cyan-600/5'
  },
  {
    id: 'caregiver-vs-patient',
    icon: <Users className="h-4 w-4" />,
    label: 'Patient vs Caregiver',
    query: 'Compare feedback from patients vs caregivers. Are there differences in their ratings and concerns?',
    category: 'insights',
    color: 'from-pink-500/10 to-pink-600/5'
  },
  {
    id: 'positive-experiences',
    icon: <Heart className="h-4 w-4" />,
    label: 'Positive Highlights',
    query: 'Show me the most positive experiences. What are patients praising the most?',
    category: 'quality',
    color: 'from-emerald-500/10 to-emerald-600/5'
  },
  {
    id: 'staff-interactions',
    icon: <Users className="h-4 w-4" />,
    label: 'Staff Interactions',
    query: 'Analyze mentions of staff interactions. Are there patterns in positive or negative staff-related feedback?',
    category: 'quality',
    color: 'from-violet-500/10 to-violet-600/5'
  },
  {
    id: 'urgent-actions',
    icon: <AlertTriangle className="h-4 w-4" />,
    label: 'Urgent Actions Needed',
    query: 'What issues require immediate attention? Identify critical feedback with ratings below 3.',
    category: 'performance',
    color: 'from-rose-500/10 to-rose-600/5'
  }
];

interface AIChatInterfaceProps {
  onSendQuery: (query: string) => Promise<string>;
  surveyId?: string;
}

export default function AIChatInterface({ onSendQuery, surveyId }: AIChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages]);

  const handleSendMessage = async (query: string) => {
    if (!query.trim() || isLoading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      type: 'user',
      content: query,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await onSendQuery(query);
      
      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        type: 'assistant',
        content: response,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        type: 'assistant',
        content: 'Sorry, I encountered an error processing your request. Please try again.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handlePredefinedQuery = (query: string) => {
    handleSendMessage(query);
  };

  const filteredQueries = selectedCategory === 'all' 
    ? predefinedQueries 
    : predefinedQueries.filter(q => q.category === selectedCategory);

  const clearChat = () => {
    setMessages([]);
  };

  return (
    <div className="w-full h-full flex flex-col bg-transparent rounded-3xl overflow-hidden">
      {/* Glassmorphic Header */}
      <div className={cn(
        "p-4 sm:p-6 rounded-t-3xl",
        "bg-gradient-to-br from-white/80 via-white/60 to-white/40",
        "dark:from-gray-800/80 dark:via-gray-800/60 dark:to-gray-900/40",
        "backdrop-blur-2xl backdrop-saturate-200",
        "border-b border-white/20 dark:border-gray-700/20",
        "shadow-[0_8px_32px_rgba(0,0,0,0.08)]"
      )}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-[#C8262A]/15 to-[#D34040]/10 border border-[#C8262A]/20 backdrop-blur-xl shadow-lg">
              <Sparkles className="h-5 w-5 text-[#C8262A]" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-[#C8262A] via-[#D34040] to-[#C8262A] bg-clip-text text-transparent">
                AI Insights Chat
              </h2>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Get instant answers from your data</p>
            </div>
          </div>
          {messages.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearChat}
              className="rounded-xl text-gray-600 dark:text-gray-400 hover:text-[#C8262A] hover:bg-[#C8262A]/10 transition-all"
            >
              <X className="h-4 w-4 mr-2" />
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {messages.length === 0 ? (
          <div className="flex-1 p-4 sm:p-6 overflow-auto bg-gradient-to-br from-blue-50/20 via-white/40 to-purple-50/20 dark:from-gray-900/50 dark:via-gray-800/30 dark:to-gray-900/50">
            {/* Welcome Card */}
            <div className={cn(
              "mb-6 p-6 rounded-2xl",
              "bg-gradient-to-br from-[#C8262A]/8 via-white/80 to-[#D34040]/5",
              "dark:from-[#C8262A]/10 dark:via-gray-800/80 dark:to-[#D34040]/5",
              "backdrop-blur-xl border border-white/40 dark:border-gray-700/40",
              "shadow-[0_8px_32px_rgba(200,38,42,0.12)]"
            )}>
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-gradient-to-br from-[#C8262A]/20 to-[#D34040]/10 backdrop-blur-sm">
                  <Sparkles className="h-6 w-6 text-[#C8262A]" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold mb-2 text-gray-900 dark:text-white">Get Instant Insights</h3>
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                    Select a predefined query below or type your own question to analyze your feedback data with AI.
                  </p>
                </div>
              </div>
            </div>

            {/* Category Filter */}
            <div className="flex flex-wrap gap-2 justify-center mb-6">
              {['all', 'performance', 'quality', 'trends', 'insights'].map((category) => (
                <Badge
                  key={category}
                  variant={selectedCategory === category ? 'default' : 'outline'}
                  className={cn(
                    "cursor-pointer capitalize px-4 py-2 rounded-xl transition-all duration-200",
                    "backdrop-blur-md border-white/40 dark:border-gray-700/40",
                    selectedCategory === category 
                      ? "bg-gradient-to-r from-[#C8262A] to-[#D34040] text-white shadow-lg hover:shadow-xl" 
                      : "bg-white/60 dark:bg-gray-800/60 hover:bg-white/80 dark:hover:bg-gray-800/80"
                  )}
                  onClick={() => setSelectedCategory(category)}
                >
                  {category === 'all' ? 'All Queries' : category}
                </Badge>
              ))}
            </div>

            {/* Predefined Queries Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredQueries.map((query) => (
                <button
                  key={query.id}
                  onClick={() => handlePredefinedQuery(query.query)}
                  className={cn(
                    "group relative p-4 rounded-2xl text-left transition-all duration-200",
                    "bg-gradient-to-br backdrop-blur-xl",
                    "border border-white/40 dark:border-gray-700/40",
                    "shadow-[0_4px_16px_rgba(0,0,0,0.06)]",
                    "hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)]",
                    "hover:scale-105 hover:-translate-y-1",
                    query.color,
                    "from-white/70 to-white/50 dark:from-gray-800/70 dark:to-gray-800/50"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-xl bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm group-hover:scale-110 transition-transform">
                      {query.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-xs sm:text-sm text-gray-900 dark:text-white leading-tight">
                        {query.label}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <ScrollArea ref={scrollAreaRef} className="flex-1 p-4 sm:p-6 bg-gradient-to-br from-blue-50/20 via-white/40 to-purple-50/20 dark:from-gray-900/50 dark:via-gray-800/30 dark:to-gray-900/50">
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex gap-2 sm:gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300",
                    message.type === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  {message.type === 'assistant' && (
                    <div className="flex-shrink-0 w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-br from-[#C8262A]/15 to-[#D34040]/10 border border-[#C8262A]/20 backdrop-blur-xl flex items-center justify-center shadow-lg">
                      <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-[#C8262A]" />
                    </div>
                  )}
                  <div
                    className={cn(
                      "rounded-2xl px-4 py-3 sm:px-5 sm:py-4 max-w-[85%] sm:max-w-[75%]",
                      "backdrop-blur-xl border shadow-lg",
                      message.type === 'user'
                        ? 'bg-gradient-to-br from-[#C8262A] via-[#D34040] to-[#C8262A] text-white border-[#C8262A]/20 shadow-[0_4px_16px_rgba(200,38,42,0.3)] ml-auto'
                        : 'bg-white/80 dark:bg-gray-800/80 border-white/40 dark:border-gray-700/40 shadow-[0_4px_16px_rgba(0,0,0,0.08)]'
                    )}
                  >
                    {message.type === 'assistant' ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none text-xs sm:text-sm text-gray-800 dark:text-gray-200">
                        <ReactMarkdown>{message.content}</ReactMarkdown>
                      </div>
                    ) : (
                      <p className="text-xs sm:text-sm font-medium">{message.content}</p>
                    )}
                    <p className="text-[10px] sm:text-xs opacity-60 mt-2 font-medium">
                      {message.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                  {message.type === 'user' && (
                    <div className="flex-shrink-0 w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-br from-[#C8262A] to-[#D34040] flex items-center justify-center shadow-lg">
                      <Users className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                    </div>
                  )}
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-2 sm:gap-3 justify-start animate-in fade-in duration-300">
                  <div className="flex-shrink-0 w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-br from-[#C8262A]/15 to-[#D34040]/10 border border-[#C8262A]/20 backdrop-blur-xl flex items-center justify-center shadow-lg">
                    <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-[#C8262A] animate-pulse" />
                  </div>
                  <div className="rounded-2xl px-4 py-3 sm:px-5 sm:py-4 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-white/40 dark:border-gray-700/40 shadow-lg">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-[#C8262A]" />
                      <span className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">Analyzing your data...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        )}

        {/* Glassmorphic Input Area */}
        <div className={cn(
          "p-4 sm:p-5 rounded-b-3xl",
          "bg-gradient-to-br from-white/80 via-white/60 to-white/40",
          "dark:from-gray-800/80 dark:via-gray-800/60 dark:to-gray-900/40",
          "backdrop-blur-2xl backdrop-saturate-200",
          "border-t border-white/20 dark:border-gray-700/20",
          "shadow-[0_-8px_32px_rgba(0,0,0,0.08)]"
        )}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage(inputValue);
            }}
            className="flex gap-3"
          >
            <Input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Ask a question about your feedback data..."
              disabled={isLoading}
              className={cn(
                "flex-1 text-sm rounded-2xl h-12",
                "bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm",
                "border-white/60 dark:border-gray-700/60",
                "focus-visible:ring-2 focus-visible:ring-[#C8262A]/30",
                "shadow-inner placeholder:text-gray-400 dark:placeholder:text-gray-500"
              )}
            />
            <Button
              type="submit"
              disabled={!inputValue.trim() || isLoading}
              className={cn(
                "h-12 w-12 rounded-2xl",
                "bg-gradient-to-br from-[#C8262A] via-[#D34040] to-[#C8262A]",
                "hover:shadow-[0_4px_24px_rgba(200,38,42,0.4)]",
                "hover:scale-105 active:scale-95",
                "transition-all duration-200",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}