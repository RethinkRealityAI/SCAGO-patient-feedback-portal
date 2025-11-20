'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  User,
  Mail,
  Phone,
  MapPin,
  FileText,
  Download,
  Edit,
  Calendar,
  CheckCircle,
  XCircle,
  Users,
  Home,
  AlertCircle,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { YEPParticipant, YEPMentor } from '@/lib/youth-empowerment';
import { ParticipantWorkshops } from '@/components/youth-empowerment/participant-workshops';
import { ProfileForms } from '@/components/profile/profile-forms';

interface ProfileViewerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: YEPParticipant | YEPMentor | null;
  role: 'participant' | 'mentor';
  onEdit?: () => void;
}

export function ProfileViewerModal({
  open,
  onOpenChange,
  profile,
  role,
  onEdit,
}: ProfileViewerModalProps) {
  const { toast } = useToast();

  if (!profile) return null;

  const handleDownload = (url: string, filename: string) => {
    window.open(url, '_blank');
    toast({
      title: 'Download Started',
      description: `Opening ${filename}`,
    });
  };

  const handleCopyEmail = (email: string) => {
    navigator.clipboard.writeText(email);
    toast({
      title: 'Email Copied',
      description: 'Email address copied to clipboard',
    });
  };

  const handleCopyPhone = (phone: string) => {
    navigator.clipboard.writeText(phone);
    toast({
      title: 'Phone Copied',
      description: 'Phone number copied to clipboard',
    });
  };

  // Get all document URLs
  const documents: Array<{ name: string; url: string; filename: string }> = [];

  if (role === 'participant') {
    const participantProfile = profile as YEPParticipant;
    if (participantProfile.healthCardUrl) {
      documents.push({ name: 'Health Card', url: participantProfile.healthCardUrl, filename: participantProfile.healthCardFileName || 'health-card' });
    }
    if (participantProfile.photoIdUrl) {
      documents.push({ name: 'Photo ID', url: participantProfile.photoIdUrl, filename: participantProfile.photoIdFileName || 'photo-id' });
    }
    if (participantProfile.consentFormUrl) {
      documents.push({ name: 'Consent Form', url: participantProfile.consentFormUrl, filename: participantProfile.consentFormFileName || 'consent-form' });
    }
    if (participantProfile.fileUrl) {
      documents.push({ name: 'Additional File', url: participantProfile.fileUrl, filename: participantProfile.fileName || 'document' });
    }
    // Add additional documents uploaded by participant
    if (participantProfile.additionalDocuments && Array.isArray(participantProfile.additionalDocuments)) {
      participantProfile.additionalDocuments.forEach((doc: any) => {
        documents.push({
          name: 'Additional Document',
          url: doc.url,
          filename: doc.fileName || 'document'
        });
      });
    }
  } else {
    const mentorProfile = profile as YEPMentor;
    if (mentorProfile.policeCheckUrl) {
      documents.push({ name: 'Police Check', url: mentorProfile.policeCheckUrl, filename: mentorProfile.policeCheckFileName || 'police-check' });
    }
    if (mentorProfile.resumeUrl) {
      documents.push({ name: 'Resume', url: mentorProfile.resumeUrl, filename: mentorProfile.resumeFileName || 'resume' });
    }
    if (mentorProfile.referencesUrl) {
      documents.push({ name: 'References', url: mentorProfile.referencesUrl, filename: mentorProfile.referencesFileName || 'references' });
    }
    if (mentorProfile.fileUrl) {
      documents.push({ name: 'Additional File', url: mentorProfile.fileUrl, filename: mentorProfile.fileName || 'document' });
    }
  }

  const name = role === 'participant' ? (profile as YEPParticipant).youthParticipant : (profile as YEPMentor).name;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-6 w-6 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-2xl">{name}</DialogTitle>
                <DialogDescription className="capitalize">
                  {role} Profile
                </DialogDescription>
              </div>
            </div>
            {onEdit && (
              <Button onClick={onEdit} variant="outline" className="gap-2">
                <Edit className="h-4 w-4" />
                Edit Profile
              </Button>
            )}
          </div>
        </DialogHeader>

        <Tabs defaultValue="details" className="mt-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="documents">
              Documents
              {documents.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {documents.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="workshops">Workshops</TabsTrigger>
            <TabsTrigger value="forms">Forms</TabsTrigger>
            <TabsTrigger value="status">Status</TabsTrigger>
          </TabsList>

          {/* Details Tab */}
          <TabsContent value="details" className="space-y-4 mt-4">
            {/* Contact Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Contact Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {profile.email && (
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Email</p>
                        <p className="font-medium">{profile.email}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => profile.email && handleCopyEmail(profile.email)}
                      >
                        Copy
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => profile.email && window.open(`mailto:${profile.email}`)}
                      >
                        <Mail className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}

                {((role === 'participant' && (profile as YEPParticipant).phoneNumber) || (role === 'mentor' && (profile as YEPMentor).phone)) && (
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Phone</p>
                        <p className="font-medium">{role === 'participant' ? (profile as YEPParticipant).phoneNumber : (profile as YEPMentor).phone}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const phone = role === 'participant' ? (profile as YEPParticipant).phoneNumber : (profile as YEPMentor).phone;
                          phone && handleCopyPhone(phone);
                        }}
                      >
                        Copy
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const phone = role === 'participant' ? (profile as YEPParticipant).phoneNumber : (profile as YEPMentor).phone;
                          phone && window.open(`tel:${phone}`);
                        }}
                      >
                        <Phone className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}

                {profile.region && (
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Region</p>
                      <p className="font-medium">{profile.region}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Participant-specific info */}
            {role === 'participant' && (
              <>
                {/* Address */}
                {(profile.streetAddress || profile.city || profile.province) && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Home className="h-5 w-5" />
                        Address
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-1">
                        {profile.streetAddress && <p>{profile.streetAddress}</p>}
                        {(profile.city || profile.province || profile.postalCode) && (
                          <p>
                            {[profile.city, profile.province, profile.postalCode]
                              .filter(Boolean)
                              .join(', ')}
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Emergency Contact */}
                {(profile.emergencyContactRelationship || profile.emergencyContactNumber) && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <AlertCircle className="h-5 w-5" />
                        Emergency Contact
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {profile.emergencyContactRelationship && (
                        <div>
                          <p className="text-sm text-muted-foreground">Relationship</p>
                          <p className="font-medium">{profile.emergencyContactRelationship}</p>
                        </div>
                      )}
                      {profile.emergencyContactNumber && (
                        <div>
                          <p className="text-sm text-muted-foreground">Phone</p>
                          <p className="font-medium">{profile.emergencyContactNumber}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Assigned Mentor */}
                {profile.assignedMentor && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        Assigned Mentor
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="font-medium">{profile.assignedMentor}</p>
                    </CardContent>
                  </Card>
                )}
              </>
            )}

            {/* Mentor-specific info */}
            {role === 'mentor' && (
              <>
                {profile.title && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Professional Title</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="font-medium">{profile.title}</p>
                    </CardContent>
                  </Card>
                )}

                {profile.assignedStudents && profile.assignedStudents.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        Assigned Participants ({profile.assignedStudents.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {profile.assignedStudents.map((student: string, index: number) => (
                          <div key={index} className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span>{student}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}

            {/* Availability */}
            {profile.availability && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Availability
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-wrap">{profile.availability}</p>
                </CardContent>
              </Card>
            )}

            {/* Notes */}
            {profile.notes && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-wrap text-muted-foreground">{profile.notes}</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents" className="space-y-4 mt-4">
            {documents.length > 0 ? (
              <div className="grid gap-3">
                {documents.map((doc, index) => (
                  <Card key={index}>
                    <CardContent className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <FileText className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{doc.name}</p>
                          <p className="text-sm text-muted-foreground">{doc.filename}</p>
                        </div>
                      </div>
                      <Button
                        onClick={() => handleDownload(doc.url, doc.filename)}
                        variant="outline"
                        className="gap-2"
                      >
                        <Download className="h-4 w-4" />
                        Download
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No documents uploaded yet</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Workshops Tab */}
          <TabsContent value="workshops" className="space-y-4 mt-4">
            {role === 'participant' ? (
              <ParticipantWorkshops 
                participantId={profile.id} 
                participantName={profile.youthParticipant || profile.name} 
              />
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Workshop attendance is only available for participants</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Forms Tab */}
          <TabsContent value="forms" className="mt-4">
            {role === 'participant' && (
              <ProfileForms profile={profile as YEPParticipant} role="participant" />
            )}
            {role === 'mentor' && (
              <ProfileForms profile={profile as YEPMentor} role="mentor" />
            )}
          </TabsContent>

          {/* Status Tab */}
          <TabsContent value="status" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Program Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  {role === 'participant' && (
                    <>
                      <StatusBadge
                        label="Approved"
                        value={profile.approved}
                      />
                      <StatusBadge
                        label="Contract Signed"
                        value={profile.contractSigned}
                      />
                      <StatusBadge
                        label="ID Provided"
                        value={profile.idProvided}
                      />
                      <StatusBadge
                        label="Syllabus Signed"
                        value={profile.signedSyllabus}
                      />
                      <StatusBadge
                        label="Interviewed"
                        value={profile.interviewed}
                      />
                      <StatusBadge
                        label="Recruited"
                        value={profile.recruited}
                      />
                    </>
                  )}
                  {role === 'mentor' && (
                    <>
                      <StatusBadge
                        label="Police Check"
                        value={profile.vulnerableSectorCheck}
                      />
                      <StatusBadge
                        label="Contract Signed"
                        value={profile.contractSigned}
                      />
                      <StatusBadge
                        label="Resume Provided"
                        value={profile.resumeProvided}
                      />
                      <StatusBadge
                        label="References Provided"
                        value={profile.referencesProvided}
                      />
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {profile.userId && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Account Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span>Profile Claimed</span>
                    </div>
                    {profile.authEmail && (
                      <div className="text-sm text-muted-foreground">
                        Auth Email: {profile.authEmail}
                      </div>
                    )}
                    {profile.lastLoginAt && (
                      <div className="text-sm text-muted-foreground">
                        Last Login: {new Date(profile.lastLoginAt).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function StatusBadge({ label, value }: { label: string; value?: boolean }) {
  return (
    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
      <span className="text-sm font-medium">{label}</span>
      {value ? (
        <CheckCircle className="h-5 w-5 text-green-600" />
      ) : (
        <XCircle className="h-5 w-5 text-muted-foreground" />
      )}
    </div>
  );
}

