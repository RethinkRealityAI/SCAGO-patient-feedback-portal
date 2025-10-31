'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Upload, 
  FileText, 
  Download, 
  Trash2, 
  Loader2,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { uploadProfileDocument, deleteProfileDocument } from '@/app/youth-empowerment/file-actions';

interface ProfileDocumentsProps {
  profile: any;
  role: 'participant' | 'mentor';
  onUpdate: () => void;
}

export function ProfileDocuments({ profile, role, onUpdate }: ProfileDocumentsProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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

    setIsUploading(true);

    try {
      // Convert file to base64
      const reader = new FileReader();
      reader.readAsDataURL(file);
      
      await new Promise((resolve, reject) => {
        reader.onload = async () => {
          try {
            const base64Data = reader.result as string;
            
            const result = await uploadProfileDocument({
              recordId: profile.id,
              collection: role === 'participant' ? 'yep_participants' : 'yep_mentors',
              fileData: base64Data,
              fileName: file.name,
              fileType: file.type,
            });

            if (result.success) {
              toast({
                title: 'Upload Successful',
                description: 'Your document has been uploaded',
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
      setIsUploading(false);
      e.target.value = ''; // Reset input
    }
  };

  const handleFileDelete = async () => {
    if (!profile.fileUrl) return;

    if (!confirm('Are you sure you want to delete this document?')) return;

    setIsDeleting(true);

    try {
      const result = await deleteProfileDocument({
        recordId: profile.id,
        collection: role === 'participant' ? 'yep_participants' : 'yep_mentors',
        fileUrl: profile.fileUrl,
      });

      if (result.success) {
        toast({
          title: 'Document Deleted',
          description: 'Your document has been removed',
        });
        onUpdate(); // Refresh profile data
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
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Documents</CardTitle>
          <CardDescription>
            Upload and manage your program documents
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <FileText className="h-4 w-4" />
            <AlertDescription>
              Upload important documents like contracts, ID, proof of affiliation, or project proposals.
              Maximum file size: 10MB. Supported formats: PDF, DOC, DOCX, JPG, PNG.
            </AlertDescription>
          </Alert>

          {/* Upload Section */}
          <div className="border-2 border-dashed rounded-lg p-8">
            <div className="flex flex-col items-center gap-4">
              <div className="p-4 bg-primary/10 rounded-full">
                <Upload className="h-8 w-8 text-primary" />
              </div>
              
              <div className="text-center">
                <p className="text-sm font-medium mb-1">Upload Document</p>
                <p className="text-xs text-muted-foreground">
                  Click below to select a file from your computer
                </p>
              </div>

              <div>
                <input
                  type="file"
                  id="file-upload"
                  className="hidden"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  onChange={handleFileUpload}
                  disabled={isUploading}
                />
                <Button
                  onClick={() => document.getElementById('file-upload')?.click()}
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Select File
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Current Document */}
          {profile.fileUrl && (
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Current Document</h4>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">
                      {profile.fileName || 'Document'}
                    </p>
                    {profile.fileType && (
                      <p className="text-xs text-muted-foreground">
                        {profile.fileType}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.open(profile.fileUrl, '_blank')}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={handleFileDelete}
                    disabled={isDeleting}
                  >
                    {isDeleting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Document Checklist (Participant only) */}
          {role === 'participant' && (
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Document Checklist</h4>
              <div className="space-y-2">
                <div className="flex items-center gap-2 p-2 rounded">
                  {profile.contractSigned ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <div className="h-4 w-4 rounded-full border-2" />
                  )}
                  <span className="text-sm">Contract Signed</span>
                </div>

                <div className="flex items-center gap-2 p-2 rounded">
                  {profile.signedSyllabus ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <div className="h-4 w-4 rounded-full border-2" />
                  )}
                  <span className="text-sm">Syllabus Signed</span>
                </div>

                <div className="flex items-center gap-2 p-2 rounded">
                  {profile.idProvided ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <div className="h-4 w-4 rounded-full border-2" />
                  )}
                  <span className="text-sm">ID Provided</span>
                </div>

                <div className="flex items-center gap-2 p-2 rounded">
                  {profile.proofOfAffiliationWithSCD ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <div className="h-4 w-4 rounded-full border-2" />
                  )}
                  <span className="text-sm">Proof of SCD Affiliation</span>
                </div>
              </div>

              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  These items are managed by your program administrator.
                  Contact them if you need to update any of these documents.
                </AlertDescription>
              </Alert>
            </div>
          )}

          {/* Mentor Documents Checklist */}
          {role === 'mentor' && (
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Document Checklist</h4>
              <div className="space-y-2">
                <div className="flex items-center gap-2 p-2 rounded">
                  {profile.vulnerableSectorCheck ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <div className="h-4 w-4 rounded-full border-2" />
                  )}
                  <span className="text-sm">Vulnerable Sector Check</span>
                </div>

                <div className="flex items-center gap-2 p-2 rounded">
                  {profile.contractSigned ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <div className="h-4 w-4 rounded-full border-2" />
                  )}
                  <span className="text-sm">Mentor Contract Signed</span>
                </div>
              </div>

              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  These items are managed by your program administrator.
                  Contact them if you need to update any of these documents.
                </AlertDescription>
              </Alert>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

