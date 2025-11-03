'use client';

import React, { useState, useTransition } from 'react';
import { useForm, useFieldArray, Controller, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { arrayMove } from '@dnd-kit/sortable';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { PlusCircle, GripVertical, Trash2, Eye, Save, Loader2, XCircle, Settings, Layout, List, Type, Code } from 'lucide-react';
import { YEPFormTemplate, yepFormTemplateSchema, YEPFormField as YEPField, YEPFormSection as YEPSection, YEPFieldType, YEPFormCategory } from '@/lib/yep-forms-types';
import { useToast } from '@/hooks/use-toast';
import { updateYEPFormTemplate } from '@/app/yep-forms/actions';
import { SortableSection } from './sortable-section';
import { FieldEditor } from './field-editor';
import { YEPFormRenderer } from './yep-form-renderer';

interface YEPFormEditorProps {
  formTemplate: YEPFormTemplate;
}

export default function YEPFormEditor({ formTemplate }: YEPFormEditorProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState('details');
  const [previewMode, setPreviewMode] = useState(false);

  const form = useForm<YEPFormTemplate>({
    resolver: zodResolver(yepFormTemplateSchema as any),
    defaultValues: formTemplate,
    mode: 'onChange',
  });

  const { fields: sections, append: appendSection, remove: removeSection, move: moveSection } = useFieldArray({
    control: form.control,
    name: 'sections',
  });

  // Field management functions
  const addField = (sectionIndex: number) => {
    const newField: YEPField = {
      id: `field_${Date.now()}`,
      type: 'text',
      label: 'New Field',
      placeholder: '',
      required: false,
      validation: {},
    };
    
    const currentSection = sections[sectionIndex];
    if (currentSection) {
      form.setValue(`sections.${sectionIndex}.fields`, [
        ...(currentSection.fields || []),
        newField
      ]);
    }
  };

  const removeField = (sectionIndex: number, fieldIndex: number) => {
    const currentSection = sections[sectionIndex];
    if (currentSection && currentSection.fields) {
      const updatedFields = currentSection.fields.filter((_, index) => index !== fieldIndex);
      form.setValue(`sections.${sectionIndex}.fields`, updatedFields);
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      const oldIndex = sections.findIndex(section => section.id === active.id);
      const newIndex = sections.findIndex(section => section.id === over?.id);
      if (oldIndex !== -1 && newIndex !== -1) {
        moveSection(oldIndex, newIndex);
      }
    }
  };

  const onSubmit = async (data: YEPFormTemplate) => {
    startTransition(async () => {
      const result = await updateYEPFormTemplate(formTemplate.id!, data as any);
      if (result.success) {
        toast({
          title: 'Success',
          description: 'YEP Form updated successfully.',
        });
        if ((result as any).data) form.reset((result as any).data as any);
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to update YEP Form.',
          variant: 'destructive',
        });
      }
    });
  };

  const onInvalid = (errors: any) => {
    console.error('Form validation errors:', errors);
    toast({
      title: 'Validation Error',
      description: 'Please fix the errors in the form.',
      variant: 'destructive',
    });
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">YEP Form Editor: {form.watch('name')}</h1>
          <p className="text-muted-foreground mt-2">{form.watch('description')}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setPreviewMode(!previewMode)}>
            {previewMode ? <Settings className="mr-2 h-4 w-4" /> : <Eye className="mr-2 h-4 w-4" />}
            {previewMode ? 'Edit Mode' : 'Preview'}
          </Button>
          <Button onClick={form.handleSubmit(onSubmit as any, onInvalid)} disabled={isPending}>
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save Form
          </Button>
        </div>
      </div>

      {previewMode ? (
        <Card className="p-6">
          <CardTitle className="mb-4">Form Preview</CardTitle>
          <YEPFormRenderer formTemplate={form.watch()} />
        </Card>
      ) : (
        <FormProvider {...form}>
          <form onSubmit={form.handleSubmit(onSubmit as any, onInvalid)} className="space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="details"><List className="mr-2 h-4 w-4" /> Details</TabsTrigger>
              <TabsTrigger value="sections"><Layout className="mr-2 h-4 w-4" /> Sections</TabsTrigger>
              <TabsTrigger value="settings"><Code className="mr-2 h-4 w-4" /> Settings</TabsTrigger>
            </TabsList>

            <TabsContent value="details">
              <Card>
                <CardHeader>
                  <CardTitle>Form Details</CardTitle>
                  <CardDescription>Basic information about your YEP form.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Form Name</Label>
                    <Input id="name" {...form.register('name')} />
                    {form.formState.errors.name && (
                      <p className="text-sm text-red-500">{form.formState.errors.name.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea id="description" {...form.register('description')} />
                    {form.formState.errors.description && (
                      <p className="text-sm text-red-500">{form.formState.errors.description.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Controller
                      control={form.control}
                      name="category"
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a category" />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.values(YEPFormCategory).map((category) => (
                              <SelectItem key={category} value={category}>
                                {category.replace(/([A-Z])/g, ' $1').trim()}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {form.formState.errors.category && (
                      <p className="text-sm text-red-500">{form.formState.errors.category.message}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="sections">
              <Card>
                <CardHeader>
                  <CardTitle>Form Sections</CardTitle>
                  <CardDescription>Organize your form into logical sections.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={sections.map(s => s.id)} strategy={verticalListSortingStrategy}>
                      {sections.map((section, index) => (
                        <SortableSection
                          key={section.id}
                          section={section}
                          index={index}
                          control={form.control}
                          removeSection={removeSection}
                          formName="sections"
                          addField={addField}
                          removeField={removeField}
                        />
                      ))}
                    </SortableContext>
                  </DndContext>
                  <Button type="button" variant="outline" onClick={() => appendSection({ id: `section-${Date.now()}`, title: 'New Section', fields: [] })}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Section
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="settings">
              <Card>
                <CardHeader>
                  <CardTitle>Form Settings</CardTitle>
                  <CardDescription>Advanced settings for your YEP form.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Controller
                      control={form.control}
                      name="isActive"
                      render={({ field }) => (
                        <Switch
                          id="isPublished"
                          checked={Boolean(field.value)}
                          onCheckedChange={field.onChange}
                        />
                      )}
                    />
                    <Label htmlFor="isPublished">Publish Form</Label>
                  </div>
                  {form.formState.errors.isActive && (
                    <p className="text-sm text-red-500">{(form.formState.errors as any).isActive.message}</p>
                  )}
                  <div className="flex items-center space-x-2">
                    <Controller
                      control={form.control}
                      name="showInParticipantProfile"
                      render={({ field }) => (
                        <Switch
                          id="showInParticipantProfile"
                          checked={Boolean(field.value)}
                          onCheckedChange={field.onChange}
                        />
                      )}
                    />
                    <div className="space-y-0.5">
                      <Label htmlFor="showInParticipantProfile">Show in Participant Profile</Label>
                      <p className="text-xs text-muted-foreground">
                        Display this form in the Forms tab of participant profiles
                      </p>
                    </div>
                  </div>
                  {form.formState.errors.showInParticipantProfile && (
                    <p className="text-sm text-red-500">{(form.formState.errors as any).showInParticipantProfile.message}</p>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="targetEntity">Target Entity</Label>
                    <Controller
                      control={form.control}
                      name="targetEntity"
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value || undefined}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select target entity (optional)" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="participant">Participant</SelectItem>
                            <SelectItem value="mentor">Mentor</SelectItem>
                            <SelectItem value="workshop">Workshop</SelectItem>
                            <SelectItem value="meeting">Meeting</SelectItem>
                            <SelectItem value="attendance">Attendance</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {form.formState.errors.targetEntity && (
                      <p className="text-sm text-red-500">{form.formState.errors.targetEntity.message}</p>
                    )}
                    <p className="text-sm text-muted-foreground">
                      Specify which YEP entity this form is primarily intended to create or update.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
          </form>
        </FormProvider>
      )}
    </div>
  );
}