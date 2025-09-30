'use client';

import React, { useState, useMemo } from 'react';
import { nanoid } from 'nanoid';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, Search, Star, Tag, ChevronDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { cn } from '@/lib/utils';
import {
  allQuestions,
  getQuestionsByCategory,
  getPopularQuestions,
  searchQuestions,
  getCategories,
  getAllTags,
  type QuestionTemplate,
} from '@/lib/question-bank';

/**
 * Maps tag names to Tailwind CSS color classes for visual categorization
 * 
 * @param tag - The tag string to map (case-insensitive)
 * @returns Tailwind CSS classes for background, text, border, and hover states
 * 
 * @example
 * getTagColor('required') // returns 'bg-red-100 text-red-700 border-red-300 hover:bg-red-200'
 * getTagColor('hospital') // returns 'bg-purple-100 text-purple-700...'
 * 
 * Color Categories:
 * - Red: Required & Validation
 * - Blue: Name & Personal
 * - Cyan: Contact (email, phone)
 * - Purple: Healthcare
 * - Green: Location
 * - Amber: Feedback & Rating
 * - Rose: Consent & Legal
 * - Indigo: Date & Time
 * - Pink: Privacy
 * - Gray: Optional
 * - Slate: Default fallback
 */
function getTagColor(tag: string): string {
  const colorMap: Record<string, string> = {
    // Required & Validation
    'required': 'bg-red-100 text-red-700 border-red-300 hover:bg-red-200',
    'validation': 'bg-red-100 text-red-700 border-red-300 hover:bg-red-200',
    
    // Contact & Personal
    'name': 'bg-blue-100 text-blue-700 border-blue-300 hover:bg-blue-200',
    'personal': 'bg-blue-100 text-blue-700 border-blue-300 hover:bg-blue-200',
    'email': 'bg-cyan-100 text-cyan-700 border-cyan-300 hover:bg-cyan-200',
    'phone': 'bg-cyan-100 text-cyan-700 border-cyan-300 hover:bg-cyan-200',
    'contact': 'bg-cyan-100 text-cyan-700 border-cyan-300 hover:bg-cyan-200',
    
    // Healthcare
    'hospital': 'bg-purple-100 text-purple-700 border-purple-300 hover:bg-purple-200',
    'healthcare': 'bg-purple-100 text-purple-700 border-purple-300 hover:bg-purple-200',
    'patient': 'bg-purple-100 text-purple-700 border-purple-300 hover:bg-purple-200',
    'provider': 'bg-purple-100 text-purple-700 border-purple-300 hover:bg-purple-200',
    'medical': 'bg-purple-100 text-purple-700 border-purple-300 hover:bg-purple-200',
    
    // Location
    'location': 'bg-green-100 text-green-700 border-green-300 hover:bg-green-200',
    'address': 'bg-green-100 text-green-700 border-green-300 hover:bg-green-200',
    'ontario': 'bg-green-100 text-green-700 border-green-300 hover:bg-green-200',
    'canada': 'bg-green-100 text-green-700 border-green-300 hover:bg-green-200',
    
    // Feedback & Rating
    'rating': 'bg-amber-100 text-amber-700 border-amber-300 hover:bg-amber-200',
    'satisfaction': 'bg-amber-100 text-amber-700 border-amber-300 hover:bg-amber-200',
    'feedback': 'bg-amber-100 text-amber-700 border-amber-300 hover:bg-amber-200',
    'experience': 'bg-amber-100 text-amber-700 border-amber-300 hover:bg-amber-200',
    
    // Consent & Legal
    'consent': 'bg-rose-100 text-rose-700 border-rose-300 hover:bg-rose-200',
    'legal': 'bg-rose-100 text-rose-700 border-rose-300 hover:bg-rose-200',
    'signature': 'bg-rose-100 text-rose-700 border-rose-300 hover:bg-rose-200',
    'age': 'bg-rose-100 text-rose-700 border-rose-300 hover:bg-rose-200',
    
    // Date & Time
    'date': 'bg-indigo-100 text-indigo-700 border-indigo-300 hover:bg-indigo-200',
    'time': 'bg-indigo-100 text-indigo-700 border-indigo-300 hover:bg-indigo-200',
    'duration': 'bg-indigo-100 text-indigo-700 border-indigo-300 hover:bg-indigo-200',
    
    // Other
    'optional': 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200',
    'privacy': 'bg-pink-100 text-pink-700 border-pink-300 hover:bg-pink-200',
  };
  
  return colorMap[tag.toLowerCase()] || 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200';
}

/**
 * Question Bank Selector Dialog
 * Allows users to browse and select pre-configured questions
 */
interface QuestionBankSelectorProps {
  onSelectQuestion: (question: any) => void;
}

export function QuestionBankSelector({ onSelectQuestion }: QuestionBankSelectorProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  
  const categories = getCategories();
  const allTags = getAllTags();
  const popularQuestions = getPopularQuestions();

  // Filter questions based on search and tags
  const filteredQuestions = useMemo(() => {
    let questions = allQuestions;

    // Apply search filter
    if (searchTerm.trim()) {
      questions = searchQuestions(searchTerm);
    }

    // Apply tag filter
    if (selectedTags.length > 0) {
      questions = questions.filter(q =>
        selectedTags.some(tag => q.tags.includes(tag))
      );
    }

    return questions;
  }, [searchTerm, selectedTags]);

  const handleSelectQuestion = (question: QuestionTemplate) => {
    // Deep clone the field config and ensure unique IDs
    const fieldConfig = JSON.parse(JSON.stringify(question.fieldConfig));
    fieldConfig.id = `${fieldConfig.id}-${nanoid().substring(0, 6)}`;
    
    // Ensure options have unique IDs if they exist
    if (fieldConfig.options) {
      fieldConfig.options = fieldConfig.options.map((opt: any) => ({
        ...opt,
        id: nanoid(),
      }));
    }

    onSelectQuestion(fieldConfig);
    setOpen(false);
    setSearchTerm('');
    setSelectedTags([]);
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          <BookOpen className="mr-2 h-4 w-4" />
          From Question Bank
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-6xl h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            Question Bank
          </DialogTitle>
          <DialogDescription>
            Browse {allQuestions.length}+ pre-configured questions from proven templates
          </DialogDescription>
        </DialogHeader>

        {/* Search and Filters */}
        <div className="space-y-3 flex-shrink-0 pb-4">
          <div className="relative" role="search">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              aria-label="Search questions by name, description, or tags"
              placeholder="Search questions by name, description, or tags..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Tag Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <Tag className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Filter by tags:</span>
            {allTags.slice(0, 12).map(tag => (
              <Badge
                key={tag}
                variant="outline"
                className={cn(
                  "cursor-pointer transition-all duration-200 border",
                  selectedTags.includes(tag) 
                    ? "ring-2 ring-primary/50 scale-105 font-semibold" 
                    : "",
                  getTagColor(tag)
                )}
                onClick={() => toggleTag(tag)}
              >
                {tag}
              </Badge>
            ))}
            {selectedTags.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedTags([])}
                className="h-6 text-xs"
              >
                Clear filters
              </Button>
            )}
          </div>
        </div>

        <Tabs defaultValue="popular" className="w-full flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-3 flex-shrink-0">
            <TabsTrigger value="popular" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Star className="h-4 w-4 mr-2" />
              Popular
            </TabsTrigger>
            <TabsTrigger value="all" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              All Questions
            </TabsTrigger>
            <TabsTrigger value="by-category" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              By Category
            </TabsTrigger>
          </TabsList>

          {/* Popular Questions */}
          <TabsContent value="popular" className="mt-4 flex-1 min-h-0">
            <ScrollArea className="h-full w-full pr-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {popularQuestions
                  .filter(q => {
                    if (searchTerm) return filteredQuestions.includes(q);
                    if (selectedTags.length > 0) return selectedTags.some(tag => q.tags.includes(tag));
                    return true;
                  })
                  .map(question => (
                    <QuestionCard
                      key={question.id}
                      question={question}
                      onSelect={handleSelectQuestion}
                    />
                  ))}
              </div>
              {popularQuestions.filter(q => {
                if (searchTerm) return filteredQuestions.includes(q);
                if (selectedTags.length > 0) return selectedTags.some(tag => q.tags.includes(tag));
                return true;
              }).length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  No popular questions match your filters
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* All Questions */}
          <TabsContent value="all" className="mt-4 flex-1 min-h-0">
            <ScrollArea className="h-full w-full pr-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredQuestions.map(question => (
                  <QuestionCard
                    key={question.id}
                    question={question}
                    onSelect={handleSelectQuestion}
                  />
                ))}
              </div>
              {filteredQuestions.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No questions found matching your search</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    onClick={() => {
                      setSearchTerm('');
                      setSelectedTags([]);
                    }}
                  >
                    Clear search
                  </Button>
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* By Category */}
          <TabsContent value="by-category" className="mt-4 flex-1 min-h-0">
            <ScrollArea className="h-full w-full pr-4">
              <Accordion type="multiple" className="space-y-2">
                {categories.map(category => {
                  const categoryQuestions = getQuestionsByCategory(category).filter(q => {
                    if (searchTerm) return filteredQuestions.includes(q);
                    if (selectedTags.length > 0) return selectedTags.some(tag => q.tags.includes(tag));
                    return true;
                  });

                  if (categoryQuestions.length === 0) return null;

                  return (
                    <AccordionItem 
                      key={category} 
                      value={category}
                      className="border rounded-lg px-4 glass-card"
                    >
                      <AccordionTrigger className="hover:no-underline py-4">
                        <div className="flex items-center justify-between w-full pr-4">
                          <div className="flex items-center gap-3">
                            <div className="text-2xl">
                              {category === 'Contact' && '👤'}
                              {category === 'Healthcare' && '🏥'}
                              {category === 'Date & Time' && '📅'}
                              {category === 'Feedback' && '⭐'}
                              {category === 'Consent' && '✅'}
                              {category === 'Yes/No' && '✓✗'}
                              {category === 'Demographics' && '📊'}
                              {category === 'Communication' && '📱'}
                            </div>
                            <div>
                              <h3 className="font-semibold text-base text-left">
                                {category}
                              </h3>
                              <p className="text-xs text-muted-foreground text-left">
                                {categoryQuestions.length} question{categoryQuestions.length !== 1 ? 's' : ''}
                              </p>
                            </div>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pb-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
                          {categoryQuestions.map(question => (
                            <QuestionCard
                              key={question.id}
                              question={question}
                              onSelect={handleSelectQuestion}
                            />
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Individual Question Card Component
 */
interface QuestionCardProps {
  question: QuestionTemplate;
  onSelect: (question: QuestionTemplate) => void;
}

function QuestionCard({ question, onSelect }: QuestionCardProps) {
  return (
    <Card
      className="cursor-pointer hover:border-primary hover:shadow-lg transition-all duration-200 group glass-card"
      onClick={() => onSelect(question)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="text-2xl flex-shrink-0">{question.icon}</div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-sm group-hover:text-primary transition-colors leading-tight">
                {question.name}
              </CardTitle>
            </div>
          </div>
          {question.popular && (
            <Star className="h-4 w-4 text-yellow-500 fill-yellow-500 flex-shrink-0" />
          )}
        </div>
        <CardDescription className="text-xs line-clamp-2">
          {question.description}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-2">
          {/* Field Type Badge */}
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs font-mono">
              {question.fieldConfig.type}
            </Badge>
            {question.fieldConfig.validation?.required && (
              <Badge variant="outline" className="text-xs">
                Required
              </Badge>
            )}
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-1">
            {question.tags.slice(0, 3).map(tag => (
              <Badge 
                key={tag} 
                variant="outline" 
                className={cn(
                  "text-[10px] py-0 px-1.5 border",
                  getTagColor(tag)
                )}
              >
                {tag}
              </Badge>
            ))}
            {question.tags.length > 3 && (
              <Badge variant="outline" className="text-[10px] py-0 px-1.5 bg-gray-100 text-gray-700 border-gray-300">
                +{question.tags.length - 3}
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
