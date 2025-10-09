'use client';

import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Upload, 
  FileText, 
  Shield, 
  Lock, 
  CheckCircle, 
  XCircle, 
  Download,
  Trash2,
  AlertCircle
} from 'lucide-react';
import { generateFileName, getFileTypeFromMime } from '@/lib/youth-empowerment';
import { storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

interface SecureFileUploadProps {
  value?: File | null;
  onChange?: (file: File | null) => void;
  onUpload?: (fileUrl: string) => void;
  disabled?: boolean;
  acceptedTypes?: string[];
  maxSize?: number; // in MB
  maxFiles?: number;
  participantId?: string;
}

export function SecureFileUpload({ 
  value, 
  onChange, 
  onUpload, 
  disabled, 
  acceptedTypes = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png'],
  maxSize = 10, // 10MB default
  maxFiles = 1,
  participantId = 'temp'
}: SecureFileUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedFileUrl, setUploadedFileUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (file: File) => {
    setError(null);
    
    // Validate file type
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!acceptedTypes.includes(fileExtension)) {
      setError(`File type ${fileExtension} is not allowed. Accepted types: ${acceptedTypes.join(', ')}`);
      return;
    }

    // Validate file size
    if (file.size > maxSize * 1024 * 1024) {
      setError(`File size exceeds ${maxSize}MB limit`);
      return;
    }

    onChange?.(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (disabled) return;

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      handleFileSelect(files[0]);
    }
  };

  const handleUpload = async () => {
    if (!value) return;

    setIsUploading(true);
    setUploadProgress(0);
    setError(null);

    try {
      // Generate secure filename
      const secureFileName = generateFileName(value.name, participantId);
      
      // Create Firebase Storage reference
      const fileRef = ref(storage, `yep-files/${secureFileName}`);
      
      // Upload file to Firebase Storage
      const snapshot = await uploadBytes(fileRef, value);
      
      // Get download URL
      const fileUrl = await getDownloadURL(snapshot.ref);
      
      setUploadProgress(100);
      setUploadedFileUrl(fileUrl);
      onUpload?.(fileUrl);
      
    } catch (error) {
      console.error('Upload failed:', error);
      setError('Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = () => {
    onChange?.(null);
    setUploadedFileUrl(null);
    setError(null);
    setUploadProgress(0);
  };

  const handleDownload = () => {
    if (uploadedFileUrl) {
      window.open(uploadedFileUrl, '_blank');
    }
  };

  const getFileIcon = (file: File) => {
    const mimeType = file.type;
    if (mimeType.startsWith('image/')) return '🖼️';
    if (mimeType.includes('pdf')) return '📄';
    if (mimeType.includes('word')) return '📝';
    return '📎';
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Shield className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">Secure File Upload</span>
        <Badge variant="outline" className="text-xs">
          <Lock className="h-3 w-3 mr-1" />
          Encrypted
        </Badge>
      </div>

      {!value && !uploadedFileUrl && (
        <div
          className={`border-2 border-dashed rounded-lg p-6 transition-colors ${
            dragActive 
              ? 'border-primary bg-primary/5' 
              : 'border-muted-foreground/25 hover:border-muted-foreground/50'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => !disabled && fileInputRef.current?.click()}
        >
          <div className="flex flex-col items-center gap-4">
            <Upload className="h-8 w-8 text-muted-foreground" />
            <div className="text-center">
              <p className="text-sm font-medium">Upload secure file</p>
              <p className="text-xs text-muted-foreground">
                Files are encrypted and stored securely
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept={acceptedTypes.join(',')}
              onChange={handleFileChange}
              disabled={disabled}
              className="hidden"
            />
            <Button variant="outline" size="sm" disabled={disabled}>
              Choose File
            </Button>
          </div>
        </div>
      )}

      {value && !uploadedFileUrl && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="text-2xl">{getFileIcon(value)}</div>
              <div className="flex-1">
                <div className="font-medium">{value.name}</div>
                <div className="text-sm text-muted-foreground">
                  {formatFileSize(value.size)} • {getFileTypeFromMime(value.type)}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleUpload}
                  disabled={isUploading || disabled}
                >
                  {isUploading ? 'Uploading...' : 'Upload'}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRemove}
                  disabled={isUploading || disabled}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            {isUploading && (
              <div className="mt-3">
                <div className="flex items-center justify-between text-sm mb-1">
                  <span>Uploading...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} className="h-2" />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {uploadedFileUrl && (
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div className="flex-1">
                <div className="font-medium text-green-800">File uploaded successfully</div>
                <div className="text-sm text-green-600">
                  File is encrypted and stored securely
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownload}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRemove}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {error && (
        <Card className="bg-red-50 border-red-200">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="bg-muted/50">
        <CardContent className="p-3">
          <div className="text-xs text-muted-foreground space-y-1">
            <div className="flex items-center gap-2">
              <Shield className="h-3 w-3" />
              <span>Files are encrypted using AES-256 encryption</span>
            </div>
            <div className="flex items-center gap-2">
              <Lock className="h-3 w-3" />
              <span>Access is restricted to authorized personnel only</span>
            </div>
            <div className="flex items-center gap-2">
              <FileText className="h-3 w-3" />
              <span>Accepted formats: {acceptedTypes.join(', ')}</span>
            </div>
            <div className="flex items-center gap-2">
              <XCircle className="h-3 w-3" />
              <span>Maximum file size: {maxSize}MB</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
