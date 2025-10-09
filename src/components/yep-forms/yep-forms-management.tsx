'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { 
  FormInput, 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  Copy, 
  Search,
  Filter,
  FileText,
  Users,
  Calendar,
  MessageSquare,
  Clock,
  BarChart3,
  Settings,
  Play,
  Download,
  Upload
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { 
  getYEPFormTemplates
} from '@/app/yep-forms/actions';
import { createYEPFormTemplateClient } from '@/app/yep-forms/client';
import { duplicateYEPFormTemplate } from '@/app/yep-forms/duplicate-actions';
import { yepFormTemplates } from '@/lib/yep-form-templates';
import { YEPFormTemplate, YEPFormCategory } from '@/lib/yep-forms-types';
import { CreateYEPFormDropdown, DeleteYEPFormButton, DuplicateYEPFormButton } from '@/app/yep-forms/client';
import YEPFormEditor from './yep-form-editor';
import YEPFormSubmission from './yep-form-submission';

interface YEPFormsManagementProps {
  onClose?: () => void;
}

export default function YEPFormsManagement({ onClose }: YEPFormsManagementProps) {
  const [activeTab, setActiveTab] = useState('list');
  const [forms, setForms] = useState<YEPFormTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [editingForm, setEditingForm] = useState<YEPFormTemplate | null>(null);
  const [submittingForm, setSubmittingForm] = useState<YEPFormTemplate | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // We no longer need to fetch forms for the Forms List tab since it shows templates.
    setIsLoading(false);
  }, []);

  const loadForms = async () => {
    setIsLoading(true);
    try {
      const result = await getYEPFormTemplates();
      if (result.success) {
        setForms(result?.data || []);
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to load forms',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error loading forms:', error);
      toast({
        title: 'Error',
        description: 'Failed to load forms',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateForm = async (template: any) => {
    try {
      const result = await createYEPFormTemplateClient(template);
      if (result.success) {
        toast({
          title: 'Form Created',
          description: `Created "${template.name}" successfully.`,
        });
        loadForms();
        return result; // return created form so callers can immediately edit/use
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to create form',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error creating form:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    }
    return { success: false } as const;
  };

  const handleDeleteForm = async (formId: string) => {
    try {
      const result = await deleteYEPFormTemplate(formId);
      if (result.success) {
        toast({
          title: 'Form Deleted',
          description: 'The form has been deleted successfully.',
        });
        loadForms();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to delete form',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error deleting form:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    }
  };

  const handleDuplicateForm = async (formId: string, newName: string) => {
    try {
      const result = await duplicateYEPFormTemplate(formId, newName);
      if (result.success) {
        toast({
          title: 'Form Duplicated',
          description: `Created "${newName}" successfully.`,
        });
        loadForms();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to duplicate form',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error duplicating form:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    }
  };

  const getCategoryIcon = (category: YEPFormCategory) => {
    switch (category) {
      case YEPFormCategory.MENTOR:
        return <Users className="h-4 w-4" />;
      case YEPFormCategory.PARTICIPANT:
        return <Users className="h-4 w-4" />;
      case YEPFormCategory.WORKSHOP:
        return <Calendar className="h-4 w-4" />;
      case YEPFormCategory.MEETING:
        return <MessageSquare className="h-4 w-4" />;
      case YEPFormCategory.ATTENDANCE:
      case YEPFormCategory.BULK_ATTENDANCE:
        return <Clock className="h-4 w-4" />;
      case YEPFormCategory.BULK_MEETING:
        return <BarChart3 className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getCategoryLabel = (category: YEPFormCategory) => {
    switch (category) {
      case YEPFormCategory.MENTOR:
        return 'Mentor';
      case YEPFormCategory.PARTICIPANT:
        return 'Participant';
      case YEPFormCategory.WORKSHOP:
        return 'Workshop';
      case YEPFormCategory.MEETING:
        return 'Meeting';
      case YEPFormCategory.ATTENDANCE:
        return 'Attendance';
      case YEPFormCategory.BULK_ATTENDANCE:
        return 'Bulk Attendance';
      case YEPFormCategory.BULK_MEETING:
        return 'Bulk Meeting';
      default:
        return 'Form';
    }
  };

  // Per requirements, show the existing templates as the quick-access Forms List
  const filteredForms = yepFormTemplates.filter(form => {
    const matchesSearch = form.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         form.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || form.category === selectedCategory as any;
    return matchesSearch && matchesCategory;
  });

  const categories = [
    { value: 'all', label: 'All Forms' },
    { value: YEPFormCategory.MENTOR, label: 'Mentor Forms' },
    { value: YEPFormCategory.PARTICIPANT, label: 'Participant Forms' },
    { value: YEPFormCategory.WORKSHOP, label: 'Workshop Forms' },
    { value: YEPFormCategory.MEETING, label: 'Meeting Forms' },
    { value: YEPFormCategory.BULK_ATTENDANCE, label: 'Bulk Attendance' },
    { value: YEPFormCategory.BULK_MEETING, label: 'Bulk Meeting' },
  ];

  if (editingForm) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Edit Form: {editingForm.name}</h2>
            <p className="text-muted-foreground">Modify form fields and settings</p>
          </div>
          <Button variant="outline" onClick={() => setEditingForm(null)}>
            Back to Forms
          </Button>
        </div>
        <YEPFormEditor formTemplate={editingForm} />
      </div>
    );
  }

  if (submittingForm) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Submit Form: {submittingForm.name}</h2>
            <p className="text-muted-foreground">Fill out and submit the form</p>
          </div>
          <Button variant="outline" onClick={() => setSubmittingForm(null)}>
            Back to Forms
          </Button>
        </div>
        <YEPFormSubmission formTemplate={submittingForm} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">YEP Forms Management</h2>
          <p className="text-muted-foreground">Create and manage forms for the Youth Empowerment Program</p>
        </div>
        <div className="flex gap-2">
          {activeTab === 'templates' && (
            <CreateYEPFormDropdown onFormCreated={handleCreateForm} />
          )}
          {onClose && (
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="list">Forms List</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="submissions">Submissions</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4">
          {/* Search and Filter */}
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search forms..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 border rounded-md"
              >
                {categories.map((category) => (
                  <option key={category.value} value={category.value}>
                    {category.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Forms Grid: show templates for quick access */}
          {isLoading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader>
                    <div className="h-4 bg-muted rounded w-3/4"></div>
                    <div className="h-3 bg-muted rounded w-1/2"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="h-3 bg-muted rounded w-full mb-2"></div>
                    <div className="h-3 bg-muted rounded w-2/3"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
              {filteredForms.map((form) => (
                <Card key={form.id} className="group hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getCategoryIcon(form.category)}
                        <Badge variant="secondary" className="text-xs">
                          {getCategoryLabel(form.category)}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={async () => {
                            const created = await handleCreateForm(form);
                            if ((created as any)?.success && (created as any)?.data) {
                              setSubmittingForm((created as any).data as YEPFormTemplate);
                            }
                          }}
                        >
                          <Play className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={async () => {
                            const created = await handleCreateForm(form);
                            if ((created as any)?.success && (created as any)?.data) {
                              setEditingForm((created as any).data as YEPFormTemplate);
                            }
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        {/* Duplicate/Delete not applicable on template entries in the list tab */}
                      </div>
                    </div>
                    <CardTitle className="text-lg">{form.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {form.description || 'No description provided'}
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="text-sm text-muted-foreground">
                        {form.sections?.reduce((sum, section) => sum + (section.fields?.length || 0), 0) || 0} fields
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            const created = await handleCreateForm(form);
                            if ((created as any)?.success && (created as any)?.data) {
                              setSubmittingForm((created as any).data as YEPFormTemplate);
                            }
                          }}
                          className="flex-1"
                        >
                          <Play className="h-4 w-4 mr-2" />
                          Use Form
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            const created = await handleCreateForm(form);
                            if ((created as any)?.success && (created as any)?.data) {
                              setEditingForm((created as any).data as YEPFormTemplate);
                            }
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
          {/* Removed empty-state: the list tab should always surface templates */}
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
            {yepFormTemplates.map((template) => (
              <Card key={template.category} className="group hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    {getCategoryIcon(template.category)}
                    <Badge variant="secondary" className="text-xs">
                      {getCategoryLabel(template.category)}
                    </Badge>
                  </div>
                  <CardTitle className="text-lg">{template.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {template.description}
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="text-sm text-muted-foreground">
                      {template.sections?.reduce((sum, section) => sum + (section.fields?.length || 0), 0) || 0} fields
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCreateForm(template)}
                        className="flex-1"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Create
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={async () => {
                          const created = await handleCreateForm(template);
                          if ((created as any)?.success && (created as any)?.data) {
                            setEditingForm((created as any).data as YEPFormTemplate);
                          }
                        }}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="submissions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Form Submissions</CardTitle>
              <p className="text-muted-foreground">View and manage form submissions</p>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">Submissions Management</h3>
                <p className="text-muted-foreground mb-4">
                  Track and manage form submissions across all forms
                </p>
                <Button variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Export Submissions
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Form Settings</CardTitle>
              <p className="text-muted-foreground">Configure form behavior and preferences</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Auto-save Forms</h4>
                    <p className="text-sm text-muted-foreground">Automatically save form progress</p>
                  </div>
                  <Button variant="outline" size="sm">
                    <Settings className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Email Notifications</h4>
                    <p className="text-sm text-muted-foreground">Get notified of new submissions</p>
                  </div>
                  <Button variant="outline" size="sm">
                    <Settings className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Data Retention</h4>
                    <p className="text-sm text-muted-foreground">Configure data retention policies</p>
                  </div>
                  <Button variant="outline" size="sm">
                    <Settings className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
