'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  UserPlus, 
  Mail, 
  Users, 
  Loader2, 
  CheckCircle, 
  AlertTriangle,
  Copy,
  Trash2,
  Plus,
  Send
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { sendYEPInvite, sendBulkYEPInvites } from '@/app/youth-empowerment/invite-actions';
import { getParticipants, getMentors } from '@/app/youth-empowerment/actions';

interface InviteFormData {
  email: string;
  role: 'participant' | 'mentor';
  name: string;
  sendEmail: boolean;
}

export function YEPInvites() {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [singleInvite, setSingleInvite] = useState<InviteFormData>({
    email: '',
    role: 'participant',
    name: '',
    sendEmail: true,
  });
  const [bulkInvites, setBulkInvites] = useState<InviteFormData[]>([]);
  const [bulkCSV, setBulkCSV] = useState('');
  const [results, setResults] = useState<Array<{ email: string; success: boolean; error?: string }>>([]);
  const [participants, setParticipants] = useState<any[]>([]);
  const [mentors, setMentors] = useState<any[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const { toast } = useToast();

  // Load existing participants and mentors
  useEffect(() => {
    const loadData = async () => {
      setLoadingData(true);
      try {
        const [participantsResult, mentorsResult] = await Promise.all([
          getParticipants(),
          getMentors(),
        ]);

        if (participantsResult.participants) {
          setParticipants(participantsResult.participants);
        }
        if (mentorsResult.mentors) {
          setMentors(mentorsResult.mentors);
        }
      } catch (error) {
        console.error('Error loading data:', error);
        toast({
          title: 'Error',
          description: 'Failed to load existing users',
          variant: 'destructive',
        });
      } finally {
        setLoadingData(false);
      }
    };

    loadData();
  }, [toast]);

  const handleSendSingleInvite = async () => {
    if (!singleInvite.email || !singleInvite.name) {
      toast({
        title: 'Missing Information',
        description: 'Please provide both email and name',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const result = await sendYEPInvite(singleInvite);

      if (result.success) {
        toast({
          title: 'Invite Sent',
          description: `Successfully invited ${singleInvite.email} as ${singleInvite.role}`,
        });

        // Reset form
        setSingleInvite({
          email: '',
          role: 'participant',
          name: '',
          sendEmail: true,
        });
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to send invite',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error sending invite:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleParseBulkCSV = () => {
    try {
      const lines = bulkCSV.trim().split('\n');
      const invites: InviteFormData[] = [];

      for (const line of lines) {
        const [email, role, name] = line.split(',').map(s => s.trim());
        
        if (email && role && name) {
          invites.push({
            email,
            role: (role.toLowerCase() === 'mentor' ? 'mentor' : 'participant') as 'participant' | 'mentor',
            name,
            sendEmail: true,
          });
        }
      }

      setBulkInvites(invites);
      toast({
        title: 'CSV Parsed',
        description: `Found ${invites.length} valid invites`,
      });
    } catch (error) {
      toast({
        title: 'Parse Error',
        description: 'Failed to parse CSV. Please check format.',
        variant: 'destructive',
      });
    }
  };

  const handleAddBulkInvite = () => {
    setBulkInvites([...bulkInvites, {
      email: '',
      role: 'participant',
      name: '',
      sendEmail: true,
    }]);
  };

  const handleRemoveBulkInvite = (index: number) => {
    setBulkInvites(bulkInvites.filter((_, i) => i !== index));
  };

  const handleUpdateBulkInvite = (index: number, field: keyof InviteFormData, value: any) => {
    const updated = [...bulkInvites];
    updated[index] = { ...updated[index], [field]: value };
    setBulkInvites(updated);
  };

  const handleSelectExistingUser = (userId: string, role: 'participant' | 'mentor') => {
    // Set the selected value to match the select option format
    setSelectedUserId(`${role}-${userId}`);

    const user = role === 'participant'
      ? participants.find(p => p.id === userId)
      : mentors.find(m => m.id === userId);

    if (user) {
      setSingleInvite({
        email: user.email || '',
        role,
        name: role === 'participant' ? user.youthParticipant : user.name,
        sendEmail: true,
      });
    }
  };

  const handleBulkInviteAll = () => {
    const usersWithoutAuth = [
      ...participants
        .filter(p => !p.userId && !p.authEmail && p.email)
        .map(p => ({
          email: p.email,
          role: 'participant' as const,
          name: p.youthParticipant,
          sendEmail: true,
        })),
      ...mentors
        .filter(m => !m.userId && !m.authEmail && m.email)
        .map(m => ({
          email: m.email,
          role: 'mentor' as const,
          name: m.name,
          sendEmail: true,
        })),
    ];

    if (usersWithoutAuth.length === 0) {
      toast({
        title: 'No Users Found',
        description: 'All users with emails already have auth accounts',
      });
      return;
    }

    setBulkInvites(usersWithoutAuth);
    toast({
      title: 'Users Loaded',
      description: `Loaded ${usersWithoutAuth.length} users without auth accounts`,
    });
  };

  const handleSendBulkInvites = async () => {
    if (bulkInvites.length === 0) {
      toast({
        title: 'No Invites',
        description: 'Please add at least one invite',
        variant: 'destructive',
      });
      return;
    }

    // Validate all invites
    const invalid = bulkInvites.filter(inv => !inv.email || !inv.name);
    if (invalid.length > 0) {
      toast({
        title: 'Invalid Invites',
        description: `${invalid.length} invite(s) are missing required information`,
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    setResults([]);

    try {
      const result = await sendBulkYEPInvites(bulkInvites);

      if (result.success && result.results) {
        setResults(result.results);
        
        const successCount = result.results.filter(r => r.success).length;
        toast({
          title: 'Bulk Invite Complete',
          description: `Successfully sent ${successCount} of ${result.results.length} invites`,
        });

        // Clear successful invites
        if (successCount === bulkInvites.length) {
          setBulkInvites([]);
          setBulkCSV('');
        }
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to send bulk invites',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error sending bulk invites:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Get list of users without auth
  const usersWithoutAuth = [
    ...participants.filter(p => !p.userId && !p.authEmail && p.email),
    ...mentors.filter(m => !m.userId && !m.authEmail && m.email),
  ];

  return (
    <Tabs defaultValue="single" className="space-y-4">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="single">
          <UserPlus className="h-4 w-4 mr-2" />
          Single Invite
        </TabsTrigger>
        <TabsTrigger value="bulk">
          <Users className="h-4 w-4 mr-2" />
          Bulk Invites
        </TabsTrigger>
      </TabsList>

      {/* Single Invite Tab */}
      <TabsContent value="single">
        <Card>
          <CardHeader>
            <CardTitle>Send Single Invite</CardTitle>
            <CardDescription>
              Invite a participant or mentor to the Youth Empowerment Program
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <Mail className="h-4 w-4" />
              <AlertDescription>
                An email with a secure sign-in link will be sent to the recipient.
                They'll be able to set their password and complete their profile.
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              {/* Select Existing User */}
              <div className="space-y-2">
                <Label htmlFor="existingUser">Select Existing User (Optional)</Label>
                <Select
                  value={selectedUserId}
                  onValueChange={(value) => {
                    if (value === 'none') {
                      // Clear selection
                      setSelectedUserId('');
                      setSingleInvite({
                        email: '',
                        role: 'participant',
                        name: '',
                        sendEmail: true,
                      });
                    } else if (value.startsWith('participant-')) {
                      handleSelectExistingUser(value.replace('participant-', ''), 'participant');
                    } else if (value.startsWith('mentor-')) {
                      handleSelectExistingUser(value.replace('mentor-', ''), 'mentor');
                    }
                  }}
                >
                  <SelectTrigger id="existingUser">
                    <SelectValue placeholder="Or select from existing..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">-</SelectItem>
                    {participants.length > 0 && (
                      <>
                        <div className="px-2 py-1.5 text-sm font-semibold">Participants</div>
                        {participants.map(p => (
                          <SelectItem key={p.id} value={`participant-${p.id}`}>
                            {p.youthParticipant} {p.email ? `(${p.email})` : '(no email)'}
                            {p.userId && ' ✓'}
                          </SelectItem>
                        ))}
                      </>
                    )}
                    {mentors.length > 0 && (
                      <>
                        <div className="px-2 py-1.5 text-sm font-semibold">Mentors</div>
                        {mentors.map(m => (
                          <SelectItem key={m.id} value={`mentor-${m.id}`}>
                            {m.name} {m.email ? `(${m.email})` : '(no email)'}
                            {m.userId && ' ✓'}
                          </SelectItem>
                        ))}
                      </>
                    )}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Select a user without auth to auto-fill their details
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Role *</Label>
                <Select
                  value={singleInvite.role}
                  onValueChange={(value) => setSingleInvite({ ...singleInvite, role: value as 'participant' | 'mentor' })}
                >
                  <SelectTrigger id="role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="participant">Participant</SelectItem>
                    <SelectItem value="mentor">Mentor</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  placeholder="John Doe"
                  value={singleInvite.name}
                  onChange={(e) => setSingleInvite({ ...singleInvite, name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="john.doe@example.com"
                  value={singleInvite.email}
                  onChange={(e) => setSingleInvite({ ...singleInvite, email: e.target.value })}
                />
              </div>

              <Button
                onClick={handleSendSingleInvite}
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending Invite...
                  </>
                ) : (
                  <>
                    <Mail className="mr-2 h-4 w-4" />
                    Send Invite
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Bulk Invites Tab */}
      <TabsContent value="bulk" className="space-y-4">
        {/* Bulk Invite All Users */}
        {usersWithoutAuth.length > 0 && (
          <Card className="border-primary">
            <CardHeader>
              <CardTitle>Quick Bulk Invite</CardTitle>
              <CardDescription>
                {usersWithoutAuth.length} users in database without auth accounts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={handleBulkInviteAll} variant="default" className="w-full" size="lg">
                <Send className="mr-2 h-5 w-5" />
                Load All {usersWithoutAuth.length} Users Without Auth
              </Button>
              <p className="text-xs text-muted-foreground mt-2 text-center">
                This will load all participants and mentors who have emails but no auth accounts
              </p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Bulk Import from CSV</CardTitle>
            <CardDescription>
              Import multiple invites from CSV format: email, role, name
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="csv">CSV Data</Label>
              <Textarea
                id="csv"
                placeholder="john@example.com, participant, John Doe&#10;jane@example.com, mentor, Jane Smith"
                rows={5}
                value={bulkCSV}
                onChange={(e) => setBulkCSV(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Format: email, role (participant or mentor), full name
              </p>
            </div>

            <Button onClick={handleParseBulkCSV} variant="outline" className="w-full">
              <Copy className="mr-2 h-4 w-4" />
              Parse CSV
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Manual Bulk Entry</CardTitle>
                <CardDescription>
                  Add multiple invites manually ({bulkInvites.length} invites)
                </CardDescription>
              </div>
              <Button onClick={handleAddBulkInvite} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Invite
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {bulkInvites.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No invites added yet</p>
                <p className="text-sm">Click "Add Invite" to start or parse CSV data above</p>
              </div>
            ) : (
              <>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {bulkInvites.map((invite, index) => (
                    <div key={index} className="flex items-start gap-2 p-3 border rounded-lg">
                      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-2">
                        <Input
                          placeholder="Email"
                          value={invite.email}
                          onChange={(e) => handleUpdateBulkInvite(index, 'email', e.target.value)}
                        />
                        <Select
                          value={invite.role}
                          onValueChange={(value) => handleUpdateBulkInvite(index, 'role', value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="participant">Participant</SelectItem>
                            <SelectItem value="mentor">Mentor</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input
                          placeholder="Full Name"
                          value={invite.name}
                          onChange={(e) => handleUpdateBulkInvite(index, 'name', e.target.value)}
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveBulkInvite(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>

                <Button
                  onClick={handleSendBulkInvites}
                  disabled={isLoading || bulkInvites.length === 0}
                  className="w-full"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending {bulkInvites.length} Invites...
                    </>
                  ) : (
                    <>
                      <Mail className="mr-2 h-4 w-4" />
                      Send {bulkInvites.length} Invites
                    </>
                  )}
                </Button>
              </>
            )}

            {/* Results */}
            {results.length > 0 && (
              <div className="space-y-2 pt-4 border-t">
                <h4 className="font-medium">Results</h4>
                <div className="space-y-1 max-h-60 overflow-y-auto">
                  {results.map((result, index) => (
                    <div
                      key={index}
                      className={`flex items-center gap-2 p-2 rounded text-sm ${
                        result.success
                          ? 'bg-green-50 dark:bg-green-900/20 text-green-900 dark:text-green-100'
                          : 'bg-red-50 dark:bg-red-900/20 text-red-900 dark:text-red-100'
                      }`}
                    >
                      {result.success ? (
                        <CheckCircle className="h-4 w-4 flex-shrink-0" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                      )}
                      <span className="flex-1">{result.email}</span>
                      {result.error && (
                        <span className="text-xs">{result.error}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}

