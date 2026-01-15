'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Edit, Save, X, User, Users, CheckCircle, Mail, Phone, MapPin, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { updateParticipant, updateMentor } from '@/app/youth-empowerment/actions';
import { getMentorDetails, getMentorParticipants } from '@/app/youth-empowerment/relationship-actions';
import { YEPParticipant, YEPMentor } from '@/lib/youth-empowerment';

interface MentorInfo {
  name: string;
  email?: string;
  phone?: string;
  availability?: string;
}

interface ParticipantInfo {
  name: string;
  email?: string;
  phoneNumber?: string;
  region?: string;
}

interface ProfileDetailsNewProps {
  profile: YEPParticipant | YEPMentor;
  role: 'participant' | 'mentor';
  onUpdate: () => void;
}

export function ProfileDetailsNew({ profile, role, onUpdate }: ProfileDetailsNewProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editedData, setEditedData] = useState<Partial<YEPParticipant | YEPMentor>>({});
  const [mentorInfo, setMentorInfo] = useState<MentorInfo | null>(null);
  const [participantsInfo, setParticipantsInfo] = useState<ParticipantInfo[]>([]);
  const [loadingRelationships, setLoadingRelationships] = useState(false);
  const { toast } = useToast();

  // Load mentor/participant relationship data
  useEffect(() => {
    if (role === 'participant' && 'assignedMentor' in profile && profile.assignedMentor) {
      loadMentorInfo();
    } else if (role === 'mentor' && 'name' in profile && profile.name) {
      loadParticipantsInfo();
    }
  }, [role, profile]);

  const loadMentorInfo = async () => {
    if (role !== 'participant' || !('assignedMentor' in profile)) return;

    setLoadingRelationships(true);
    try {
      const result = await getMentorDetails(profile.assignedMentor!);
      if (result.success && result.mentor) {
        setMentorInfo(result.mentor);
      } else {
        // Mentor not found - may be orphaned assignment or invalid
        console.warn('Mentor not found:', profile.assignedMentor, result.error);
        // Still show the mentor name even if details can't be loaded
        setMentorInfo({
          name: profile.assignedMentor || 'Unknown Mentor',
        });
      }
    } catch (error) {
      console.error('Error loading mentor info:', error);
      // Show mentor name even on error
      setMentorInfo({
        name: profile.assignedMentor || 'Unknown Mentor',
      });
    } finally {
      setLoadingRelationships(false);
    }
  };

  const loadParticipantsInfo = async () => {
    if (role !== 'mentor' || !('name' in profile)) return;

    setLoadingRelationships(true);
    try {
      // getMentorParticipants now handles both name and ID
      const result = await getMentorParticipants(profile.name);
      if (result.success && result.participants) {
        setParticipantsInfo(result.participants);
      } else {
        console.warn('Failed to load participants:', result.error);
        setParticipantsInfo([]);
      }
    } catch (error) {
      console.error('Error loading participants info:', error);
      setParticipantsInfo([]);
    } finally {
      setLoadingRelationships(false);
    }
  };

  const handleEdit = () => {
    setEditedData(profile);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setEditedData({});
    setIsEditing(false);
  };

  const handleSave = async () => {
    setIsSaving(true);

    try {
      let result;
      if (role === 'participant') {
        const updates: Partial<YEPParticipant> = {};
        const data = editedData as Partial<YEPParticipant>;
        if (data.phoneNumber !== undefined) updates.phoneNumber = data.phoneNumber;
        if (data.emergencyContactRelationship !== undefined) updates.emergencyContactRelationship = data.emergencyContactRelationship;
        if (data.emergencyContactNumber !== undefined) updates.emergencyContactNumber = data.emergencyContactNumber;
        if (data.streetAddress !== undefined) updates.streetAddress = data.streetAddress;
        if (data.city !== undefined) updates.city = data.city;
        if (data.province !== undefined) updates.province = data.province;
        if (data.postalCode !== undefined) updates.postalCode = data.postalCode;
        if (data.availability !== undefined) updates.availability = data.availability;
        if (data.notes !== undefined) updates.notes = data.notes;

        result = await updateParticipant(profile.id, updates);
      } else {
        const updates: Partial<YEPMentor> = {};
        const data = editedData as Partial<YEPMentor>;
        if (data.phone !== undefined) updates.phone = data.phone;
        if (data.availability !== undefined) updates.availability = data.availability;

        result = await updateMentor(profile.id, updates);
      }

      if (result.success) {
        toast({
          title: 'Profile Updated',
          description: 'Your changes have been saved successfully',
        });
        setIsEditing(false);
        onUpdate();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to update profile',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const data = isEditing ? { ...profile, ...editedData } : profile;

  return (
    <div className="space-y-4">
      {/* Basic Information Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Basic Information
              </CardTitle>
              <CardDescription>Your name and contact details</CardDescription>
            </div>
            {!isEditing ? (
              <Button onClick={handleEdit} size="sm">
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <Button onClick={handleCancel} variant="outline" size="sm">
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button onClick={handleSave} size="sm" disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <Save className="h-4 w-4 mr-2 animate-pulse" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={(role === 'participant' ? (data as YEPParticipant).youthParticipant : (data as YEPMentor).name) || ''}
                disabled
                className="bg-muted"
              />
            </div>

            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                value={data.email || ''}
                disabled
                className="bg-muted"
              />
            </div>

            <div className="space-y-2">
              <Label>Phone Number</Label>
              <Input
                value={(role === 'participant' ? (data as YEPParticipant).phoneNumber : (data as YEPMentor).phone) || ''}
                onChange={(e) => {
                  if (role === 'participant') {
                    setEditedData({ ...editedData, phoneNumber: e.target.value });
                  } else {
                    setEditedData({ ...editedData, phone: e.target.value });
                  }
                }}
                disabled={!isEditing}
                placeholder="Enter your phone number"
              />
            </div>

            {role === 'participant' && (data as YEPParticipant).region && (
              <div className="space-y-2">
                <Label>Region</Label>
                <Input
                  value={(data as YEPParticipant).region || ''}
                  disabled
                  className="bg-muted"
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Participant-specific Information */}
      {role === 'participant' && (
        <>
          {/* Emergency Contact */}
          <Card>
            <CardHeader>
              <CardTitle>Emergency Contact</CardTitle>
              <CardDescription>Contact information in case of emergency</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Relationship</Label>
                  <Input
                    value={(data as YEPParticipant).emergencyContactRelationship || ''}
                    onChange={(e) => setEditedData({ ...editedData, emergencyContactRelationship: e.target.value })}
                    disabled={!isEditing}
                    placeholder="e.g., Parent, Spouse, Sibling"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Emergency Contact Phone</Label>
                  <Input
                    value={(data as YEPParticipant).emergencyContactNumber || ''}
                    onChange={(e) => setEditedData({ ...editedData, emergencyContactNumber: e.target.value })}
                    disabled={!isEditing}
                    placeholder="Emergency contact phone number"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Address */}
          <Card>
            <CardHeader>
              <CardTitle>Address</CardTitle>
              <CardDescription>Your mailing address</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Street Address</Label>
                <Input
                  value={(data as YEPParticipant).streetAddress || ''}
                  onChange={(e) => setEditedData({ ...editedData, streetAddress: e.target.value })}
                  disabled={!isEditing}
                  placeholder="123 Main Street"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>City</Label>
                  <Input
                    value={(data as YEPParticipant).city || ''}
                    onChange={(e) => setEditedData({ ...editedData, city: e.target.value })}
                    disabled={!isEditing}
                    placeholder="City"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Province</Label>
                  <Input
                    value={(data as YEPParticipant).province || ''}
                    onChange={(e) => setEditedData({ ...editedData, province: e.target.value })}
                    disabled={!isEditing}
                    placeholder="Province"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Postal Code</Label>
                  <Input
                    value={(data as YEPParticipant).postalCode || ''}
                    onChange={(e) => setEditedData({ ...editedData, postalCode: e.target.value })}
                    disabled={!isEditing}
                    placeholder="A1A 1A1"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Assigned Mentor */}
          {(data as YEPParticipant).assignedMentor && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Your Mentor
                </CardTitle>
                <CardDescription>Your assigned program mentor</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingRelationships ? (
                  <div className="flex items-center justify-center p-4">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-lg">{mentorInfo?.name || (data as YEPParticipant).assignedMentor || 'Unknown Mentor'}</p>
                        <p className="text-sm text-muted-foreground">Program Mentor</p>
                      </div>
                    </div>

                    {mentorInfo && (
                      <div className="space-y-2 pt-2 border-t">
                        {mentorInfo.email && (
                          <div className="flex items-center gap-2 text-sm">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <a href={`mailto:${mentorInfo.email}`} className="text-primary hover:underline">
                              {mentorInfo.email}
                            </a>
                          </div>
                        )}
                        {mentorInfo.phone && (
                          <div className="flex items-center gap-2 text-sm">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <a href={`tel:${mentorInfo.phone}`} className="text-primary hover:underline">
                              {mentorInfo.phone}
                            </a>
                          </div>
                        )}
                        {mentorInfo.availability && (
                          <div className="mt-2 pt-2 border-t">
                            <p className="text-xs font-medium text-muted-foreground mb-1">Availability:</p>
                            <p className="text-sm">{mentorInfo.availability}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Mentor-specific Information */}
      {role === 'mentor' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Your Participants
            </CardTitle>
            <CardDescription>
              {loadingRelationships
                ? 'Loading participants...'
                : participantsInfo.length === 0
                  ? 'No participants assigned yet'
                  : `${participantsInfo.length} participant${participantsInfo.length !== 1 ? 's' : ''} assigned`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingRelationships ? (
              <div className="flex items-center justify-center p-4">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : participantsInfo.length === 0 ? (
              <div className="p-4 bg-muted/50 rounded-lg text-center text-muted-foreground">
                No participants assigned yet
              </div>
            ) : (
              <div className="space-y-3">
                {participantsInfo.map((participant, index) => (
                  <div key={index} className="p-4 bg-muted/50 rounded-lg space-y-2">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{participant.name}</p>
                        <p className="text-sm text-muted-foreground">Participant</p>
                      </div>
                    </div>

                    <div className="space-y-1 pl-13">
                      {participant.email && (
                        <div className="flex items-center gap-2 text-sm">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <a href={`mailto:${participant.email}`} className="text-primary hover:underline">
                            {participant.email}
                          </a>
                        </div>
                      )}
                      {participant.phoneNumber && (
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <a href={`tel:${participant.phoneNumber}`} className="text-primary hover:underline">
                            {participant.phoneNumber}
                          </a>
                        </div>
                      )}
                      {participant.region && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="h-4 w-4" />
                          {participant.region}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Availability */}
      <Card>
        <CardHeader>
          <CardTitle>Availability</CardTitle>
          <CardDescription>When are you typically available?</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={data.availability || ''}
            onChange={(e) => setEditedData({ ...editedData, availability: e.target.value })}
            disabled={!isEditing}
            placeholder="e.g., Weekdays 6-9pm, Weekends anytime"
            rows={3}
          />
        </CardContent>
      </Card>

      {/* Additional Notes (Participant only) */}
      {role === 'participant' && (
        <Card>
          <CardHeader>
            <CardTitle>Additional Notes</CardTitle>
            <CardDescription>Any additional information you'd like to share</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              value={(data as YEPParticipant).notes || ''}
              onChange={(e) => setEditedData({ ...editedData, notes: e.target.value })}
              disabled={!isEditing}
              placeholder="Any additional notes..."
              rows={3}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

