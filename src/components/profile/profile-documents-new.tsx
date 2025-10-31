'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FileText, Upload, Download, Trash2, CheckCircle, Clock, AlertCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { uploadProfileDocument, deleteProfileDocument } from '@/app/youth-empowerment/file-actions';
import { YEPParticipant, YEPMentor } from '@/lib/youth-empowerment';

interface RequiredDocument {
  id: string;
  name: string;
  description: string;
  required: boolean;
  fileField?: string; // Field name in Firestore for this document
}

interface DocumentStatus {
  uploaded: boolean;
  fileUrl?: string;
  fileName: string;
  adminProvided: boolean;
}

// Document requirements for participants
const PARTICIPANT_DOCUMENTS: RequiredDocument[] = [
  {
    id: 'health_card',
    name: 'Health Card Copy',
    description: 'A copy of your OHIP health card',
    required: true,
    fileField: 'healthCardUrl',
  },
  {
    id: 'photo_id',
    name: 'Photo ID',
    description: 'Government-issued photo identification',
    required: true,
    fileField: 'photoIdUrl',
  },
  {
    id: 'consent_form',
    name: 'Program Consent Form',
    description: 'Signed consent form for program participation',
    required: true,
    fileField: 'consentFormUrl',
  },
];

// Document requirements for mentors
const MENTOR_DOCUMENTS: RequiredDocument[] = [
  {
    id: 'police_check',
    name: 'Police Vulnerable Sector Check',
    description: 'Current police background check',
    required: true,
    fileField: 'policeCheckUrl',
  },
  {
    id: 'resume',
    name: 'Resume/CV',
    description: 'Current resume or curriculum vitae',
    required: false,
    fileField: 'resumeUrl',
  },
  {
    id: 'references',
    name: 'References',
    description: 'Contact information for references',
    required: false,
    fileField: 'referencesUrl',
  },
];

interface ProfileDocumentsNewProps {
  profile: YEPParticipant | YEPMentor;
  role: 'participant' | 'mentor';
  onUpdate: () => void;
}

export function ProfileDocumentsNew({ profile, role, onUpdate }: ProfileDocumentsNewProps) {
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);
  const [deletingDoc, setDeletingDoc] = useState<string | null>(null);
  const { toast } = useToast();

  const requiredDocs = role === 'participant' ? PARTICIPANT_DOCUMENTS : MENTOR_DOCUMENTS;

  const handleFileUpload = async (docId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/jpg',
      'image/png',
    ];
    
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: 'Invalid File Type',
        description: 'Please upload PDF, DOC, DOCX, JPG, or PNG files only',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: 'File Too Large',
        description: 'Maximum file size is 10MB',
        variant: 'destructive',
      });
      return;
    }

    setUploadingDoc(docId);

    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      
      await new Promise((resolve, reject) => {
        reader.onload = async () => {
          try {
            const base64Data = reader.result as string;
            
            // Create a document-specific filename
            const doc = requiredDocs.find(d => d.id === docId);
            const timestamp = Date.now();
            const fileName = `${docId}_${timestamp}_${file.name}`;
            
            const result = await uploadProfileDocument({
              recordId: profile.id,
              collection: role === 'participant' ? 'yep_participants' : 'yep_mentors',
              fileData: base64Data,
              fileName,
              fileType: file.type,
              documentType: docId, // Pass document type for proper field mapping
            });

            if (result.success) {
              toast({
                title: 'Upload Successful',
                description: `${doc?.name || 'Document'} has been uploaded`,
              });
              onUpdate(); // Refresh profile data
              resolve(null);
            } else {
              toast({
                title: 'Upload Failed',
                description: result.error || 'Failed to upload document',
                variant: 'destructive',
              });
              reject(new Error(result.error));
            }
          } catch (error) {
            reject(error);
          }
        };
        reader.onerror = reject;
      });
    } catch (error) {
      console.error('Error uploading file:', error);
      toast({
        title: 'Upload Failed',
        description: 'Failed to upload document',
        variant: 'destructive',
      });
    } finally {
      setUploadingDoc(null);
      e.target.value = ''; // Reset input
    }
  };

  const handleFileDelete = async (docId: string, fileUrl: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;

    setDeletingDoc(docId);

    try {
      const result = await deleteProfileDocument({
        recordId: profile.id,
        collection: role === 'participant' ? 'yep_participants' : 'yep_mentors',
        fileUrl,
        documentType: docId, // Pass document type for proper field mapping
      });

      if (result.success) {
        toast({
          title: 'Document Deleted',
          description: 'Document has been removed',
        });
        onUpdate();
      } else {
        toast({
          title: 'Delete Failed',
          description: result.error || 'Failed to delete document',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error deleting file:', error);
      toast({
        title: 'Delete Failed',
        description: 'Failed to delete document',
        variant: 'destructive',
      });
    } finally {
      setDeletingDoc(null);
    }
  };

  const getDocumentStatus = (doc: RequiredDocument): DocumentStatus => {
    const fileField = doc.fileField || `${doc.id}Url`;
    const fileUrl = (profile as Record<string, any>)[fileField] as string | undefined;
    const fileName = (profile as Record<string, any>)[`${doc.id}FileName`] || 
                     (profile as Record<string, any>)[fileField.replace('Url', 'Name')] as string | undefined;
    
    // Check if document was provided by admin (boolean flags)
    let adminProvided = false;
    let adminProvidedSource = '';
    
    if (role === 'participant' && 'idProvided' in profile) {
      const participant = profile as YEPParticipant;
      if (doc.id === 'health_card' || doc.id === 'photo_id') {
        adminProvided = !!participant.idProvided && !fileUrl;
        adminProvidedSource = 'ID provided by admin';
      } else if (doc.id === 'consent_form') {
        adminProvided = !!participant.contractSigned && !fileUrl;
        adminProvidedSource = 'Contract signed (admin verified)';
      }
    } else if (role === 'mentor' && 'vulnerableSectorCheck' in profile) {
      const mentor = profile as YEPMentor;
      if (doc.id === 'police_check') {
        adminProvided = !!mentor.vulnerableSectorCheck && !fileUrl;
        adminProvidedSource = 'Police check verified by admin';
      } else if (doc.id === 'resume') {
        adminProvided = !!mentor.resumeProvided && !fileUrl;
        adminProvidedSource = 'Resume on file (admin)';
      } else if (doc.id === 'references') {
        adminProvided = !!mentor.referencesProvided && !fileUrl;
        adminProvidedSource = 'References on file (admin)';
      }
    }
    
    return {
      uploaded: !!fileUrl || adminProvided,
      fileUrl,
      fileName: fileName || (adminProvided ? adminProvidedSource : 'Document'),
      adminProvided,
    };
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Required Documents
        </CardTitle>
        <CardDescription>
          Upload and manage your program documents
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Please upload clear, readable copies of all required documents. 
            Accepted formats: PDF, DOC, DOCX, JPG, PNG (max 10MB)
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          {requiredDocs.map((doc) => {
            const status = getDocumentStatus(doc);
            const isUploading = uploadingDoc === doc.id;
            const isDeleting = deletingDoc === doc.id;

            return (
              <div
                key={doc.id}
                className={`p-4 border rounded-lg ${
                  status.uploaded ? 'bg-green-50 border-green-200' : 'bg-muted/50'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {status.uploaded ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : doc.required ? (
                        <Clock className="h-5 w-5 text-orange-500" />
                      ) : (
                        <FileText className="h-5 w-5 text-muted-foreground" />
                      )}
                      <h3 className="font-medium">
                        {doc.name}
                        {doc.required && (
                          <span className="text-red-500 ml-1">*</span>
                        )}
                      </h3>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {doc.description}
                    </p>
                    {status.uploaded && (
                      <p className="text-sm text-green-600 mt-1 font-medium">
                        ✓ Uploaded: {status.fileName}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {status.uploaded ? (
                      <>
                        {status.fileUrl ? (
                          // User uploaded document - can view and delete
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => window.open(status.fileUrl, '_blank')}
                              className="gap-2"
                            >
                              <Download className="h-4 w-4" />
                              View
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleFileDelete(doc.id, status.fileUrl)}
                              disabled={isDeleting}
                              className="gap-2"
                            >
                              {isDeleting ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                              Delete
                            </Button>
                          </>
                        ) : status.adminProvided ? (
                          // Admin verified - show as complete but allow user to upload their own
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => document.getElementById(`file-upload-${doc.id}`)?.click()}
                            disabled={isUploading}
                            className="gap-2"
                          >
                            {isUploading ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Uploading...
                              </>
                            ) : (
                              <>
                                <Upload className="h-4 w-4" />
                                Upload Your Copy
                              </>
                            )}
                          </Button>
                        ) : null}
                      </>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => document.getElementById(`file-upload-${doc.id}`)?.click()}
                        disabled={isUploading}
                        className="gap-2"
                      >
                        {isUploading ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <Upload className="h-4 w-4" />
                            Upload
                          </>
                        )}
                      </Button>
                    )}
                    <input
                      id={`file-upload-${doc.id}`}
                      type="file"
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      className="hidden"
                      onChange={(e) => handleFileUpload(doc.id, e)}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="pt-4 border-t">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Document Completion</span>
            <span className="font-medium">
              {requiredDocs.filter(doc => getDocumentStatus(doc).uploaded).length} / {requiredDocs.length}
            </span>
          </div>
          <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-500"
              style={{
                width: `${(requiredDocs.filter(doc => getDocumentStatus(doc).uploaded).length / requiredDocs.length) * 100}%`,
              }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

