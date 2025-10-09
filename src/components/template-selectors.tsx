'use client';

import React, { useState } from 'react';
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
import { Sparkles, Grid2X2, Layout, Plus } from 'lucide-react';
import { sectionTemplates, sectionTemplateMetadata, type SectionTemplateKey } from '@/lib/section-templates';
import { blockTemplates, blockTemplateMetadata, gridPatterns, type BlockTemplateKey, type GridPattern } from '@/lib/block-templates';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

/**
 * Section Template Selector Dialog
 * Allows users to quickly add common section patterns
 */
interface SectionTemplateSelectorProps {
  onSelectTemplate: (template: any) => void;
}

export function SectionTemplateSelector({ onSelectTemplate }: SectionTemplateSelectorProps) {
  const [open, setOpen] = useState(false);
  
  const categories = Array.from(new Set(sectionTemplateMetadata.map(t => t.category)));

  const handleSelect = (key: SectionTemplateKey) => {
    const template = {  ...sectionTemplates[key], id: nanoid() };
    // Ensure all nested fields have unique IDs
    template.fields = template.fields.map((f: any) => ({
      ...f,
      id: `${f.id}-${nanoid().substring(0, 6)}`,
      fields: f.fields?.map((sf: any) => ({
        ...sf,
        id: `${sf.id}-${nanoid().substring(0, 6)}`,
      })),
    }));
    onSelectTemplate(template);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          <Sparkles className="mr-2 h-4 w-4" />
          From Template
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Add Section from Template
          </DialogTitle>
          <DialogDescription>
            Choose a pre-built section to quickly add common field combinations
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue={categories[0]} className="w-full flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${categories.length}, 1fr)` }}>
            {categories.map(category => (
              <TabsTrigger key={category} value={category}>
                {category}
              </TabsTrigger>
            ))}
          </TabsList>
          
          {categories.map(category => (
            <TabsContent key={category} value={category} className="mt-4 flex-1 min-h-0">
              <ScrollArea className="h-full w-full pr-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {sectionTemplateMetadata
                    .filter(meta => meta.category === category)
                    .map(meta => {
                      const template = sectionTemplates[meta.key];
                      return (
                        <Card
                          key={meta.key}
                          className="cursor-pointer hover:border-primary hover:shadow-lg transition-all duration-200 group glass-card"
                          onClick={() => handleSelect(meta.key)}
                        >
                          <CardHeader>
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-3">
                                <div className="text-3xl">{meta.icon}</div>
                                <div>
                                  <CardTitle className="text-lg group-hover:text-primary transition-colors">
                                    {meta.name}
                                  </CardTitle>
                                  <Badge variant="outline" className="mt-1">
                                    {template.fields.length} fields
                                  </Badge>
                                </div>
                              </div>
                            </div>
                            <CardDescription className="mt-2">
                              {meta.description}
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="text-xs text-muted-foreground space-y-1">
                              {template.fields.slice(0, 3).map((f, i) => (
                                <div key={i} className="flex items-center gap-2">
                                  <span className="font-mono bg-muted px-1 rounded">{f.type}</span>
                                  <span>{f.label}</span>
                                </div>
                              ))}
                              {template.fields.length > 3 && (
                                <div className="text-muted-foreground italic">
                                  +{template.fields.length - 3} more...
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                </div>
              </ScrollArea>
            </TabsContent>
          ))}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Block Template Selector Dialog
 * Allows users to add field groups with predefined layouts
 */
interface BlockTemplateSelectorProps {
  onSelectBlock: (block: any) => void;
}

export function BlockTemplateSelector({ onSelectBlock }: BlockTemplateSelectorProps) {
  const [open, setOpen] = useState(false);
  const [selectedPattern, setSelectedPattern] = useState<GridPattern | null>(null);
  
  const categories = Array.from(new Set(blockTemplateMetadata.map(t => t.category)));
  const popularBlocks = blockTemplateMetadata.filter(t => t.popular).map(t => t.key);

  const handleSelectBlock = (key: BlockTemplateKey) => {
    const template = { ...blockTemplates[key] };
    // Ensure all fields have unique IDs
    const block = {
      id: `${template.fields[0]?.id}-${nanoid().substring(0, 6)}`,
      type: 'group',
      label: template.name,
      fields: template.fields.map(f => ({
        ...f,
        id: `${f.id}-${nanoid().substring(0, 6)}`,
      })),
    };
    onSelectBlock(block);
    setOpen(false);
  };

  const handleSelectPattern = (pattern: GridPattern) => {
    setSelectedPattern(pattern);
  };

  const handleCreateCustomGroup = () => {
    if (!selectedPattern) return;
    
    const patternInfo = gridPatterns.find(p => p.pattern === selectedPattern);
    if (!patternInfo) return;

    // Create blank fields based on pattern
    const fieldCount = {
      '1x1': 1,
      '2x1': 2,
      '3x1': 3,
      '4x1': 4,
      '2x2': 4,
      '1x2': 2,
    }[selectedPattern];

    const fields = Array.from({ length: fieldCount }, (_, i) => ({
      id: `field${i + 1}-${nanoid().substring(0, 6)}`,
      type: 'text',
      label: `Field ${i + 1}`,
    }));

    const block = {
      id: `group-${nanoid().substring(0, 6)}`,
      type: 'group',
      label: 'Custom Group',
      fields,
    };

    onSelectBlock(block);
    setOpen(false);
    setSelectedPattern(null);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          <Layout className="mr-2 h-4 w-4" />
          Add Block
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-5xl h-[85vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Layout className="h-5 w-5 text-primary" />
            Add Field Block
          </DialogTitle>
          <DialogDescription>
            Choose a pre-built block or create a custom field group
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="popular" className="w-full flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="popular">Popular</TabsTrigger>
            <TabsTrigger value="all">All Blocks</TabsTrigger>
            <TabsTrigger value="custom">Custom Layout</TabsTrigger>
          </TabsList>
          
          <TabsContent value="popular" className="mt-4 flex-1 min-h-0">
            <ScrollArea className="h-full w-full pr-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {popularBlocks.map(key => {
                  const template = blockTemplates[key];
                  const meta = blockTemplateMetadata.find(m => m.key === key);
                  return (
                    <Card
                      key={key}
                      className="cursor-pointer hover:border-primary hover:shadow-lg transition-all duration-200 group glass-card"
                      onClick={() => handleSelectBlock(key)}
                    >
                      <CardHeader>
                        <div className="flex items-center gap-2">
                          <div className="text-2xl">{template.icon}</div>
                          <CardTitle className="text-base group-hover:text-primary transition-colors">
                            {template.name}
                          </CardTitle>
                        </div>
                        <CardDescription className="text-xs">
                          {template.description}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Grid2X2 className="h-3 w-3" />
                          <span>{template.gridPattern}</span>
                          <Badge variant="secondary" className="ml-auto text-xs">
                            {template.fields.length} fields
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="all" className="mt-4 flex-1 min-h-0">
            <ScrollArea className="h-full w-full pr-4">
              <div className="space-y-6">
                {categories.map(category => (
                  <div key={category}>
                    <h3 className="font-semibold text-sm text-muted-foreground mb-3">{category}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {blockTemplateMetadata
                        .filter(meta => meta.category === category)
                        .map(meta => {
                          const template = blockTemplates[meta.key];
                          return (
                            <Card
                              key={meta.key}
                              className="cursor-pointer hover:border-primary hover:shadow-lg transition-all duration-200 group glass-card"
                              onClick={() => handleSelectBlock(meta.key)}
                            >
                              <CardHeader>
                                <div className="flex items-center gap-2">
                                  <div className="text-2xl">{template.icon}</div>
                                  <CardTitle className="text-base group-hover:text-primary transition-colors">
                                    {template.name}
                                  </CardTitle>
                                </div>
                                <CardDescription className="text-xs">
                                  {template.description}
                                </CardDescription>
                              </CardHeader>
                              <CardContent>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <Grid2X2 className="h-3 w-3" />
                                  <span>{template.gridPattern}</span>
                                  <Badge variant="secondary" className="ml-auto text-xs">
                                    {template.fields.length} fields
                                  </Badge>
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="custom" className="mt-4 flex-1 min-h-0">
            <ScrollArea className="h-full w-full pr-4">
              <div className="space-y-6 pb-4">
              <div>
                <h3 className="font-semibold mb-3">Choose a grid layout</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Select how many fields you want and how they should be arranged
                </p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {gridPatterns.map(pattern => (
                    <Card
                      key={pattern.pattern}
                      className={cn(
                        "cursor-pointer hover:border-primary hover:shadow-lg transition-all duration-200 glass-card",
                        selectedPattern === pattern.pattern && "border-primary ring-2 ring-primary/20"
                      )}
                      onClick={() => handleSelectPattern(pattern.pattern)}
                    >
                      <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                          <Grid2X2 className="h-4 w-4" />
                          {pattern.name}
                        </CardTitle>
                        <CardDescription className="text-xs">
                          {pattern.description}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-center p-4 bg-muted rounded-md">
                          <div className={cn(
                            "grid gap-2",
                            pattern.columns === 1 && "grid-cols-1",
                            pattern.columns === 2 && "grid-cols-2",
                            pattern.columns === 3 && "grid-cols-3",
                            pattern.columns === 4 && "grid-cols-4"
                          )}>
                            {Array.from({ length: {
                              '1x1': 1, '2x1': 2, '3x1': 3, '4x1': 4, '2x2': 4, '1x2': 2
                            }[pattern.pattern] }).map((_, i) => (
                              <div key={i} className="w-12 h-8 bg-background border-2 border-primary/40 rounded" />
                            ))}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
              
              {selectedPattern && (
                <div className="flex justify-end gap-2 pt-4 border-t mt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setSelectedPattern(null)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={handleCreateCustomGroup}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Create Group
                  </Button>
                </div>
              )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
