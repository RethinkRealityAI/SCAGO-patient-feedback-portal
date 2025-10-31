'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Webhook, CheckCircle2, XCircle, Trash2, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { collection, doc, getDoc, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface WebhookConfig {
  url: string;
  enabled: boolean;
  secret?: string;
  lastTriggered?: Date;
  lastError?: string;
}

export function WebhookSettings() {
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'config', 'webhooks'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as WebhookConfig;
        setWebhookUrl(data.url || '');
        setWebhookSecret(data.secret || '');
        setEnabled(data.enabled || false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleSave = async () => {
    if (!webhookUrl.trim()) {
      toast({
        title: 'Error',
        description: 'Webhook URL is required',
        variant: 'destructive',
      });
      return;
    }

    // Validate URL
    try {
      new URL(webhookUrl);
    } catch {
      toast({
        title: 'Error',
        description: 'Please enter a valid webhook URL',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      const config: WebhookConfig = {
        url: webhookUrl.trim(),
        enabled,
        secret: webhookSecret.trim() || undefined,
      };

      await setDoc(doc(db, 'config', 'webhooks'), config);
      
      toast({
        title: 'Success',
        description: 'Webhook configuration saved successfully',
      });
      
      setStatus('success');
      setStatusMessage('Configuration saved');
      setTimeout(() => {
        setStatus('idle');
        setStatusMessage('');
      }, 3000);
    } catch (error) {
      console.error('Error saving webhook config:', error);
      toast({
        title: 'Error',
        description: 'Failed to save webhook configuration',
        variant: 'destructive',
      });
      setStatus('error');
      setStatusMessage('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!webhookUrl.trim()) {
      toast({
        title: 'Error',
        description: 'Please save a webhook URL first',
        variant: 'destructive',
      });
      return;
    }

    setTesting(true);
    try {
      const testPayload = {
        event: 'test',
        timestamp: new Date().toISOString(),
        data: {
          message: 'This is a test webhook from SCAGO Portal',
        },
      };

      const response = await fetch('/api/webhooks/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: webhookUrl,
          secret: webhookSecret || undefined,
          payload: testPayload,
        }),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Webhook test sent successfully',
        });
        setStatus('success');
        setStatusMessage('Test webhook sent successfully');
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Test failed');
      }
    } catch (error) {
      console.error('Error testing webhook:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to test webhook',
        variant: 'destructive',
      });
      setStatus('error');
      setStatusMessage(error instanceof Error ? error.message : 'Test failed');
    } finally {
      setTesting(false);
      setTimeout(() => {
        setStatus('idle');
        setStatusMessage('');
      }, 5000);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete the webhook configuration?')) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'config', 'webhooks'));
      setWebhookUrl('');
      setWebhookSecret('');
      setEnabled(false);
      toast({
        title: 'Success',
        description: 'Webhook configuration deleted',
      });
    } catch (error) {
      console.error('Error deleting webhook config:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete webhook configuration',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Webhook className="h-5 w-5" />
          Webhook Configuration
        </CardTitle>
        <CardDescription>
          Configure webhooks to receive real-time notifications when survey submissions are received.
          Submissions will be sent as JSON to your configured endpoint.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="webhook-url">Webhook URL</Label>
          <Input
            id="webhook-url"
            type="url"
            placeholder="https://your-api.com/webhooks/survey-submissions"
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            The endpoint where submission data will be sent via POST request
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="webhook-secret">Webhook Secret (Optional)</Label>
          <Input
            id="webhook-secret"
            type="password"
            placeholder="Your secret key for webhook authentication"
            value={webhookSecret}
            onChange={(e) => setWebhookSecret(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Optional secret key that will be sent in the X-Webhook-Secret header for authentication
          </p>
        </div>

        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="space-y-0.5">
            <Label htmlFor="webhook-enabled">Enable Webhooks</Label>
            <p className="text-sm text-muted-foreground">
              When enabled, submissions will automatically be sent to your webhook URL
            </p>
          </div>
          <Switch
            id="webhook-enabled"
            checked={enabled}
            onCheckedChange={setEnabled}
          />
        </div>

        {status !== 'idle' && (
          <Alert variant={status === 'success' ? 'default' : 'destructive'}>
            {status === 'success' ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <XCircle className="h-4 w-4" />
            )}
            <AlertDescription>{statusMessage}</AlertDescription>
          </Alert>
        )}

        <div className="flex gap-2 pt-4">
          <Button onClick={handleSave} disabled={saving || !webhookUrl.trim()}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Configuration
              </>
            )}
          </Button>
          {webhookUrl && (
            <Button
              variant="outline"
              onClick={handleTest}
              disabled={testing || saving}
            >
              {testing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Testing...
                </>
              ) : (
                'Test Webhook'
              )}
            </Button>
          )}
          {webhookUrl && (
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={saving}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          )}
        </div>

        <div className="mt-6 p-4 bg-muted rounded-lg">
          <h4 className="font-semibold mb-2">Webhook Payload Format</h4>
          <pre className="text-xs overflow-x-auto">
{`{
  "event": "survey.submission.created",
  "timestamp": "2024-01-15T10:30:00Z",
  "data": {
    "submissionId": "...",
    "surveyId": "...",
    "submittedAt": "2024-01-15T10:30:00Z",
    "fields": {
      // All submission fields here
    }
  }
}`}
          </pre>
        </div>
      </CardContent>
    </Card>
  );
}
