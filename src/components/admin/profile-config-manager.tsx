'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import {
  Settings,
  Plus,
  Trash2,
  Save,
  RotateCcw,
  Loader2,
  AlertCircle,
  CheckCircle,
  MoveUp,
  MoveDown
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  getProfilePageConfig,
  updateProfilePageConfig,
  resetProfilePageConfig,
  type DocumentRequirement,
  type ProfilePageConfig,
} from '@/app/youth-empowerment/profile-config-actions';

export function ProfileConfigManager() {
  const [config, setConfig] = useState<ProfilePageConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setIsLoading(true);
    try {
      const result = await getProfilePageConfig();
      if (result.success && result.config) {
        setConfig(result.config);
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to load configuration',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error loading config:', error);
      toast({
        title: 'Error',
        description: 'Failed to load configuration',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!config) return;

    setIsSaving(true);
    try {
      const result = await updateProfilePageConfig({
        participantDocuments: config.participantDocuments,
        mentorDocuments: config.mentorDocuments,
        pageTitle: config.pageTitle,
        documentsCardTitle: config.documentsCardTitle,
        documentsCardDescription: config.documentsCardDescription,
        additionalDocumentsTitle: config.additionalDocumentsTitle,
        additionalDocumentsDescription: config.additionalDocumentsDescription,
      });

      if (result.success) {
        toast({
          title: 'Success',
          description: 'Configuration saved successfully',
        });
        await loadConfig(); // Reload to get updated timestamp
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to save configuration',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error saving config:', error);
      toast({
        title: 'Error',
        description: 'Failed to save configuration',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    if (!confirm('Are you sure you want to reset to default configuration? This cannot be undone.')) {
      return;
    }

    setIsSaving(true);
    try {
      const result = await resetProfilePageConfig();
      if (result.success) {
        toast({
          title: 'Success',
          description: 'Configuration reset to defaults',
        });
        await loadConfig();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to reset configuration',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error resetting config:', error);
      toast({
        title: 'Error',
        description: 'Failed to reset configuration',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const addDocument = (role: 'participant' | 'mentor') => {
    if (!config) return;

    const docs = role === 'participant' ? config.participantDocuments : config.mentorDocuments;
    const newDoc: DocumentRequirement = {
      id: `custom_${Date.now()}`,
      name: 'New Document',
      description: 'Description of the document',
      required: false,
      order: docs.length + 1,
    };

    setConfig({
      ...config,
      [role === 'participant' ? 'participantDocuments' : 'mentorDocuments']: [...docs, newDoc],
    });
  };

  const removeDocument = (role: 'participant' | 'mentor', index: number) => {
    if (!config) return;

    const docs = role === 'participant' ? config.participantDocuments : config.mentorDocuments;
    const updated = docs.filter((_, i) => i !== index).map((doc, i) => ({ ...doc, order: i + 1 }));

    setConfig({
      ...config,
      [role === 'participant' ? 'participantDocuments' : 'mentorDocuments']: updated,
    });
  };

  const updateDocument = (
    role: 'participant' | 'mentor',
    index: number,
    field: keyof DocumentRequirement,
    value: any
  ) => {
    if (!config) return;

    const docs = role === 'participant' ? config.participantDocuments : config.mentorDocuments;
    const updated = [...docs];
    updated[index] = { ...updated[index], [field]: value };

    setConfig({
      ...config,
      [role === 'participant' ? 'participantDocuments' : 'mentorDocuments']: updated,
    });
  };

  const moveDocument = (role: 'participant' | 'mentor', index: number, direction: 'up' | 'down') => {
    if (!config) return;

    const docs = role === 'participant' ? config.participantDocuments : config.mentorDocuments;
    const newIndex = direction === 'up' ? index - 1 : index + 1;

    if (newIndex < 0 || newIndex >= docs.length) return;

    const updated = [...docs];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    // Update order numbers
    updated.forEach((doc, i) => (doc.order = i + 1));

    setConfig({
      ...config,
      [role === 'participant' ? 'participantDocuments' : 'mentorDocuments']: updated,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!config) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>Failed to load configuration</AlertDescription>
      </Alert>
    );
  }

  const renderDocumentList = (role: 'participant' | 'mentor') => {
    const docs = role === 'participant' ? config.participantDocuments : config.mentorDocuments;

    return (
      <div className="space-y-4">
        {docs.map((doc, index) => (
          <Card key={doc.id}>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor={`${role}-${index}-name`}>Document Name *</Label>
                        <Input
                          id={`${role}-${index}-name`}
                          value={doc.name}
                          onChange={(e) => updateDocument(role, index, 'name', e.target.value)}
                          placeholder="e.g., Health Card"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`${role}-${index}-id`}>ID (unique) *</Label>
                        <Input
                          id={`${role}-${index}-id`}
                          value={doc.id}
                          onChange={(e) => updateDocument(role, index, 'id', e.target.value)}
                          placeholder="e.g., health_card"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`${role}-${index}-description`}>Description</Label>
                      <Textarea
                        id={`${role}-${index}-description`}
                        value={doc.description}
                        onChange={(e) => updateDocument(role, index, 'description', e.target.value)}
                        placeholder="Describe what this document is"
                        rows={2}
                      />
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id={`${role}-${index}-required`}
                        checked={doc.required}
                        onCheckedChange={(checked) => updateDocument(role, index, 'required', checked)}
                      />
                      <Label htmlFor={`${role}-${index}-required`}>Required document</Label>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => moveDocument(role, index, 'up')}
                      disabled={index === 0}
                    >
                      <MoveUp className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => moveDocument(role, index, 'down')}
                      disabled={index === docs.length - 1}
                    >
                      <MoveDown className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => removeDocument(role, index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        <Button onClick={() => addDocument(role)} variant="outline" className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          Add Document Requirement
        </Button>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Profile Page Configuration</h2>
          <p className="text-muted-foreground">
            Customize the profile page without changing code
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleReset} variant="outline" disabled={isSaving}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset to Defaults
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>

      <Alert>
        <Settings className="h-4 w-4" />
        <AlertDescription>
          Changes will apply immediately after saving. Users will see the updated configuration on their profile pages.
          {config.updatedAt && (
            <span className="block mt-2 text-xs">
              Last updated: {new Date(config.updatedAt).toLocaleString()} by {config.updatedBy}
            </span>
          )}
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="page-settings" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="page-settings">Page Settings</TabsTrigger>
          <TabsTrigger value="participant-docs">Participant Documents</TabsTrigger>
          <TabsTrigger value="mentor-docs">Mentor Documents</TabsTrigger>
        </TabsList>

        <TabsContent value="page-settings">
          <Card>
            <CardHeader>
              <CardTitle>Page Text & Labels</CardTitle>
              <CardDescription>Customize text shown on the profile page</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="pageTitle">Page Title</Label>
                <Input
                  id="pageTitle"
                  value={config.pageTitle}
                  onChange={(e) => setConfig({ ...config, pageTitle: e.target.value })}
                  placeholder="Documents"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="documentsCardTitle">Documents Card Title</Label>
                <Input
                  id="documentsCardTitle"
                  value={config.documentsCardTitle}
                  onChange={(e) => setConfig({ ...config, documentsCardTitle: e.target.value })}
                  placeholder="Required Documents"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="documentsCardDescription">Documents Card Description</Label>
                <Textarea
                  id="documentsCardDescription"
                  value={config.documentsCardDescription}
                  onChange={(e) => setConfig({ ...config, documentsCardDescription: e.target.value })}
                  placeholder="Upload and manage your program documents"
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="additionalDocumentsTitle">Additional Documents Title</Label>
                <Input
                  id="additionalDocumentsTitle"
                  value={config.additionalDocumentsTitle}
                  onChange={(e) => setConfig({ ...config, additionalDocumentsTitle: e.target.value })}
                  placeholder="Additional Documents"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="additionalDocumentsDescription">Additional Documents Description</Label>
                <Textarea
                  id="additionalDocumentsDescription"
                  value={config.additionalDocumentsDescription}
                  onChange={(e) =>
                    setConfig({ ...config, additionalDocumentsDescription: e.target.value })
                  }
                  placeholder="Upload any additional documents you'd like to share (optional)"
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="participant-docs">
          <Card>
            <CardHeader>
              <CardTitle>Participant Document Requirements</CardTitle>
              <CardDescription>
                Define what documents participants need to upload
              </CardDescription>
            </CardHeader>
            <CardContent>{renderDocumentList('participant')}</CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mentor-docs">
          <Card>
            <CardHeader>
              <CardTitle>Mentor Document Requirements</CardTitle>
              <CardDescription>Define what documents mentors need to upload</CardDescription>
            </CardHeader>
            <CardContent>{renderDocumentList('mentor')}</CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
