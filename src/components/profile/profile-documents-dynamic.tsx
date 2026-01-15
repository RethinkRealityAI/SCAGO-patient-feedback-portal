'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FileText, Upload, Download, Trash2, CheckCircle, Clock, AlertCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { uploadProfileDocument, deleteProfileDocument } from '@/app/youth-empowerment/file-actions';
import { getProfilePageConfig, type DocumentRequirement } from '@/app/youth-empowerment/profile-config-actions';
import { YEPParticipant, YEPMentor } from '@/lib/youth-empowerment';

interface DocumentStatus {
  uploaded: boolean;
  fileUrl?: string;
  fileName: string;
  adminProvided: boolean;
}

interface ProfileDocumentsDynamicProps {
  profile: YEPParticipant | YEPMentor;
  role: 'participant' | 'mentor';
  onUpdate: () => void;
}

export function ProfileDocumentsDynamic({ profile, role, onUpdate }: ProfileDocumentsDynamicProps) {
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);
  const [deletingDoc, setDeletingDoc] = useState<string | null>(null);
  const [requiredDocs, setRequiredDocs] = useState<DocumentRequirement[]>([]);
  const [pageConfig, setPageConfig] = useState({
    pageTitle: 'Documents',
    documentsCardTitle: 'Required Documents',
    documentsCardDescription: 'Upload and manage your program documents',
    additionalDocumentsTitle: 'Additional Documents',
    additionalDocumentsDescription: "Upload any additional documents you'd like to share (optional)",
  });
  const [isLoadingConfig, setIsLoadingConfig] = useState(true);
  const [configError, setConfigError] = useState(false);
  const { toast } = useToast();

  // Fallback hardcoded documents in case config fails to load
  const FALLBACK_PARTICIPANT_DOCS: DocumentRequirement[] = [
    { id: 'health_card', name: 'Health Card Copy', description: 'A copy of your OHIP health card', required: true, order: 1 },
    { id: 'photo_id', name: 'Photo ID', description: 'Government-issued photo identification', required: true, order: 2 },
    { id: 'consent_form', name: 'Program Consent Form', description: 'Signed consent form for program participation', required: true, order: 3 },
  ];

  const FALLBACK_MENTOR_DOCS: DocumentRequirement[] = [
    { id: 'police_check', name: 'Police Vulnerable Sector Check', description: 'Current police background check', required: true, order: 1 },
    { id: 'resume', name: 'Resume/CV', description: 'Current resume or curriculum vitae', required: false, order: 2 },
    { id: 'references', name: 'References', description: 'Contact information for references', required: false, order: 3 },
  ];

  useEffect(() => {
    loadConfig();
  }, [role]);

  const loadConfig = async () => {
    setIsLoadingConfig(true);
    setConfigError(false);

    try {
      const result = await getProfilePageConfig();

      if (result.success && result.config) {
        const docs = role === 'participant'
          ? result.config.participantDocuments
          : result.config.mentorDocuments;

        // Sort by order
        const sortedDocs = [...docs].sort((a, b) => a.order - b.order);
        setRequiredDocs(sortedDocs);

        setPageConfig({
          pageTitle: result.config.pageTitle,
          documentsCardTitle: result.config.documentsCardTitle,
          documentsCardDescription: result.config.documentsCardDescription,
          additionalDocumentsTitle: result.config.additionalDocumentsTitle,
          additionalDocumentsDescription: result.config.additionalDocumentsDescription,
        });
      } else {
        // Fallback to hardcoded documents
        console.warn('Failed to load config, using fallback:', result.error);
        setConfigError(true);
        setRequiredDocs(role === 'participant' ? FALLBACK_PARTICIPANT_DOCS : FALLBACK_MENTOR_DOCS);
      }
    } catch (error) {
      console.error('Error loading config:', error);
      setConfigError(true);
      // Use fallback
      setRequiredDocs(role === 'participant' ? FALLBACK_PARTICIPANT_DOCS : FALLBACK_MENTOR_DOCS);
    } finally {
      setIsLoadingConfig(false);
    }
  };

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
            const fileName = docId === 'additional' ? `${timestamp}_${file.name}` : `${docId}_${timestamp}_${file.name}`;

            const result = await uploadProfileDocument({
              recordId: profile.id,
              collection: role === 'participant' ? 'yep_participants' : 'yep_mentors',
              fileData: base64Data,
              fileName,
              fileType: file.type,
              documentType: docId,
            });

            if (result.success) {
              toast({
                title: 'Upload Successful',
                description: docId === 'additional'
                  ? 'Document has been uploaded'
                  : `${doc?.name || 'Document'} has been uploaded`,
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
        description: error instanceof Error ? error.message : 'Failed to upload document',
        variant: 'destructive',
      });
    } finally {
      setUploadingDoc(null);
      e.target.value = ''; // Reset input
    }
  };

  const handleFileDelete = async (docId: string, fileUrl: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;

    const deleteKey = docId === 'additional' ? `additional-${fileUrl}` : docId;
    setDeletingDoc(deleteKey);

    try {
      const result = await deleteProfileDocument({
        recordId: profile.id,
        collection: role === 'participant' ? 'yep_participants' : 'yep_mentors',
        fileUrl,
        documentType: docId,
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
        description: error instanceof Error ? error.message : 'Failed to delete document',
        variant: 'destructive',
      });
    } finally {
      setDeletingDoc(null);
    }
  };

  const getDocumentStatus = (doc: DocumentRequirement): DocumentStatus => {
    // Look for document in the documents array (new format)
    const documents = (profile as any).documents || [];

    // Try to find user-uploaded document first
    let userDocument = documents.find((d: any) => d.type === doc.id && d.uploadedBy === 'user');

    // If not found with uploadedBy field, look for any document with matching type (backward compatibility)
    if (!userDocument) {
      userDocument = documents.find((d: any) => d.type === doc.id);
    }

    if (userDocument) {
      return {
        uploaded: true,
        fileUrl: userDocument.url,
        fileName: userDocument.fileName || 'Document',
        adminProvided: userDocument.uploadedBy === 'admin',
      };
    }

    // Check if document was provided by admin (boolean flags) - legacy support
    let adminProvided = false;
    let adminProvidedSource = '';

    if (role === 'participant' && 'idProvided' in profile) {
      const participant = profile as YEPParticipant;
      if (doc.id === 'health_card' || doc.id === 'photo_id') {
        adminProvided = !!participant.idProvided;
        adminProvidedSource = 'ID provided by admin';
      } else if (doc.id === 'consent_form') {
        adminProvided = !!participant.contractSigned;
        adminProvidedSource = 'Contract signed (admin verified)';
      }
    } else if (role === 'mentor' && 'vulnerableSectorCheck' in profile) {
      const mentor = profile as YEPMentor;
      if (doc.id === 'police_check') {
        adminProvided = !!mentor.vulnerableSectorCheck;
        adminProvidedSource = 'Police check verified by admin';
      } else if (doc.id === 'resume') {
        adminProvided = !!mentor.resumeProvided;
        adminProvidedSource = 'Resume on file (admin)';
      } else if (doc.id === 'references') {
        adminProvided = !!mentor.referencesProvided;
        adminProvidedSource = 'References on file (admin)';
      }
    }

    return {
      uploaded: adminProvided,
      fileUrl: undefined,
      fileName: adminProvided ? adminProvidedSource : 'Document',
      adminProvided,
    };
  };

  if (isLoadingConfig) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {configError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load custom configuration. Using default document requirements.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {pageConfig.documentsCardTitle}
          </CardTitle>
          <CardDescription>
            {pageConfig.documentsCardDescription}
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
                  className={`p-4 border rounded-lg ${status.uploaded ? 'bg-green-50 border-green-200' : 'bg-muted/50'
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
                          ✓ {status.fileName}
                          {status.adminProvided && ' (Admin provided)'}
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
                                onClick={() => handleFileDelete(doc.id, status.fileUrl!)}
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
                  width: `${requiredDocs.length > 0 ? (requiredDocs.filter(doc => getDocumentStatus(doc).uploaded).length / requiredDocs.length) * 100 : 0}%`,
                }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Additional Documents Section - Participants Only */}
      {role === 'participant' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {pageConfig.additionalDocumentsTitle}
            </CardTitle>
            <CardDescription>
              {pageConfig.additionalDocumentsDescription}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                You can upload any documents here that you'd like admins to see. This is completely optional.
              </AlertDescription>
            </Alert>

            {/* List of Additional Documents */}
            {(profile as YEPParticipant).additionalDocuments && (profile as YEPParticipant).additionalDocuments!.length > 0 && (
              <div className="space-y-3">
                {(profile as YEPParticipant).additionalDocuments!.map((doc, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 border rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                      <div className="flex-1">
                        <p className="font-medium">{doc.fileName}</p>
                        <p className="text-sm text-muted-foreground">
                          Uploaded {new Date(doc.uploadedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(doc.url, '_blank')}
                        className="gap-2"
                      >
                        <Download className="h-4 w-4" />
                        View
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleFileDelete('additional', doc.url)}
                        disabled={deletingDoc === `additional-${doc.url}`}
                        className="gap-2"
                      >
                        {deletingDoc === `additional-${doc.url}` ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Upload New Additional Document */}
            <div className="pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => document.getElementById('additional-file-upload')?.click()}
                disabled={uploadingDoc === 'additional'}
                className="w-full gap-2"
              >
                {uploadingDoc === 'additional' ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    Upload Additional Document
                  </>
                )}
              </Button>
              <input
                id="additional-file-upload"
                type="file"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                className="hidden"
                onChange={(e) => handleFileUpload('additional', e)}
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
