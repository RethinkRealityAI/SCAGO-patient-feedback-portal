'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Edit, Save, X, AlertTriangle, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { updateParticipant, updateMentor } from '@/app/youth-empowerment/actions';

interface ProfileDetailsProps {
  profile: any;
  role: 'participant' | 'mentor';
  onUpdate: () => void;
}

// Fields that users can edit themselves
const PARTICIPANT_EDITABLE_FIELDS = [
  'phoneNumber',
  'emergencyContactRelationship',
  'emergencyContactNumber',
  'mailingAddress',
  'streetAddress',
  'city',
  'province',
  'postalCode',
  'availability',
  'notes',
];

const MENTOR_EDITABLE_FIELDS = [
  'phone',
  'availability',
];

export function ProfileDetails({ profile, role, onUpdate }: ProfileDetailsProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editedData, setEditedData] = useState<any>({});
  const { toast } = useToast();

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
        // Only update editable fields
        const updates: any = {};
        PARTICIPANT_EDITABLE_FIELDS.forEach(field => {
          if (editedData[field] !== undefined) {
            updates[field] = editedData[field];
          }
        });
        result = await updateParticipant(profile.id, updates);
      } else {
        // Only update editable fields for mentors
        const updates: any = {};
        MENTOR_EDITABLE_FIELDS.forEach(field => {
          if (editedData[field] !== undefined) {
            updates[field] = editedData[field];
          }
        });
        result = await updateMentor(profile.id, updates);
      }

      if (result.success) {
        toast({
          title: 'Profile Updated',
          description: 'Your profile has been updated successfully',
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

  const data = isEditing ? editedData : profile;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Profile Information</CardTitle>
            <CardDescription>
              View and update your profile details
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {!isEditing ? (
              <Button onClick={handleEdit} size="sm">
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            ) : (
              <>
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
                      Save Changes
                    </>
                  )}
                </Button>
              </>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Some fields are managed by administrators and cannot be edited here.
            Contact your program coordinator for changes to those fields.
          </AlertDescription>
        </Alert>

        {/* Basic Info (Read-only) */}
        <div className="space-y-4">
          <h3 className="font-semibold text-lg">Basic Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={role === 'participant' ? data.youthParticipant : data.name}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">Managed by administrator</p>
            </div>

            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                value={data.email || ''}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">Managed by administrator</p>
            </div>

            {role === 'participant' && data.region && (
              <div className="space-y-2">
                <Label>Region</Label>
                <Input
                  value={data.region}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">Managed by administrator</p>
              </div>
            )}
          </div>
        </div>

        {/* Editable Contact Info */}
        <div className="space-y-4">
          <h3 className="font-semibold text-lg">Contact Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Phone Number</Label>
              <Input
                value={data[role === 'participant' ? 'phoneNumber' : 'phone'] || ''}
                onChange={(e) => setEditedData({ ...editedData, [role === 'participant' ? 'phoneNumber' : 'phone']: e.target.value })}
                disabled={!isEditing}
                placeholder="Enter your phone number"
              />
            </div>

            {role === 'participant' && (
              <>
                <div className="space-y-2">
                  <Label>Emergency Contact Relationship</Label>
                  <Input
                    value={data.emergencyContactRelationship || ''}
                    onChange={(e) => setEditedData({ ...editedData, emergencyContactRelationship: e.target.value })}
                    disabled={!isEditing}
                    placeholder="e.g., Parent, Spouse"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Emergency Contact Number</Label>
                  <Input
                    value={data.emergencyContactNumber || ''}
                    onChange={(e) => setEditedData({ ...editedData, emergencyContactNumber: e.target.value })}
                    disabled={!isEditing}
                    placeholder="Emergency contact phone"
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Editable Address (Participant only) */}
        {role === 'participant' && (
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Address</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label>Street Address</Label>
                <Input
                  value={data.streetAddress || ''}
                  onChange={(e) => setEditedData({ ...editedData, streetAddress: e.target.value })}
                  disabled={!isEditing}
                  placeholder="Street address"
                />
              </div>

              <div className="space-y-2">
                <Label>City</Label>
                <Input
                  value={data.city || ''}
                  onChange={(e) => setEditedData({ ...editedData, city: e.target.value })}
                  disabled={!isEditing}
                  placeholder="City"
                />
              </div>

              <div className="space-y-2">
                <Label>Province</Label>
                <Input
                  value={data.province || ''}
                  onChange={(e) => setEditedData({ ...editedData, province: e.target.value })}
                  disabled={!isEditing}
                  placeholder="Province"
                />
              </div>

              <div className="space-y-2">
                <Label>Postal Code</Label>
                <Input
                  value={data.postalCode || ''}
                  onChange={(e) => setEditedData({ ...editedData, postalCode: e.target.value })}
                  disabled={!isEditing}
                  placeholder="Postal code"
                />
              </div>
            </div>
          </div>
        )}

        {/* Availability */}
        <div className="space-y-4">
          <h3 className="font-semibold text-lg">Availability</h3>
          <div className="space-y-2">
            <Label>When are you available?</Label>
            <Textarea
              value={data.availability || ''}
              onChange={(e) => setEditedData({ ...editedData, availability: e.target.value })}
              disabled={!isEditing}
              placeholder="Describe your availability..."
              rows={3}
            />
          </div>
        </div>

        {/* Notes (Participant only) */}
        {role === 'participant' && (
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Additional Notes</h3>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={data.notes || ''}
                onChange={(e) => setEditedData({ ...editedData, notes: e.target.value })}
                disabled={!isEditing}
                placeholder="Any additional information..."
                rows={4}
              />
            </div>
          </div>
        )}

        {/* Read-only Program Info (Participant only) */}
        {role === 'participant' && (
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Program Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.assignedMentor && (
                <div className="space-y-2">
                  <Label>Assigned Mentor</Label>
                  <Input
                    value={data.assignedMentor}
                    disabled
                    className="bg-muted"
                  />
                </div>
              )}

              {data.approved && (
                <div className="space-y-2">
                  <Label>Status</Label>
                  <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-900/20 rounded-md">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium text-green-900 dark:text-green-100">
                      Approved
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}















