'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { FileText, Upload, Trash2, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { uploadDocument, deleteDocument } from '@/app/patients/actions';
import { PatientDocument, DOCUMENT_TYPES } from '@/types/patient';

interface PatientDocumentsProps {
    patientId: string;
    documents: PatientDocument[];
    onUpdate: () => void;
}

export function PatientDocuments({ patientId, documents, onUpdate }: PatientDocumentsProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [docType, setDocType] = useState<string>('other');
    const [docName, setDocName] = useState('');
    const { toast } = useToast();

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            if (file.size > 10 * 1024 * 1024) { // 10MB limit
                toast({
                    title: 'File too large',
                    description: 'Maximum file size is 10MB',
                    variant: 'destructive',
                });
                return;
            }
            setSelectedFile(file);
            if (!docName) {
                setDocName(file.name.split('.')[0]);
            }
        }
    };

    const handleUpload = async () => {
        if (!selectedFile || !docName) return;

        setIsUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', selectedFile);
            formData.append('patientId', patientId);
            formData.append('type', docType);
            formData.append('name', docName);

            const result = await uploadDocument(formData);

            if (result.success) {
                toast({
                    title: 'Document Uploaded',
                    description: 'File has been successfully uploaded.',
                });
                setIsOpen(false);
                setSelectedFile(null);
                setDocName('');
                setDocType('other');
                onUpdate();
            } else {
                toast({
                    title: 'Error',
                    description: result.error || 'Failed to upload document',
                    variant: 'destructive',
                });
            }
        } catch (error) {
            console.error('Error uploading document:', error);
            toast({
                title: 'Error',
                description: 'An unexpected error occurred',
                variant: 'destructive',
            });
        } finally {
            setIsUploading(false);
        }
    };

    const handleDelete = async (docId: string, path: string) => {
        if (!confirm('Are you sure you want to delete this document?')) return;

        try {
            const result = await deleteDocument(patientId, docId, path);
            if (result.success) {
                toast({
                    title: 'Document Deleted',
                    description: 'File has been removed.',
                });
                onUpdate();
            } else {
                toast({
                    title: 'Error',
                    description: result.error || 'Failed to delete document',
                    variant: 'destructive',
                });
            }
        } catch (error) {
            console.error('Error deleting document:', error);
            toast({
                title: 'Error',
                description: 'An unexpected error occurred',
                variant: 'destructive',
            });
        }
    };

    return (
        <Card className="h-full flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="space-y-1">
                    <CardTitle>Documents</CardTitle>
                    <CardDescription>
                        Manage patient files and records.
                    </CardDescription>
                </div>
                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                    <DialogTrigger asChild>
                        <Button size="sm">
                            <Upload className="mr-2 h-4 w-4" />
                            Upload Document
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Upload Document</DialogTitle>
                            <DialogDescription>
                                Upload a new file to the patient's record.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>File *</Label>
                                <Input type="file" onChange={handleFileSelect} accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" />
                            </div>

                            <div className="space-y-2">
                                <Label>Document Name *</Label>
                                <Input
                                    value={docName}
                                    onChange={(e) => setDocName(e.target.value)}
                                    placeholder="e.g. Referral Letter"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Document Type *</Label>
                                <Select value={docType} onValueChange={setDocType}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {DOCUMENT_TYPES.map((type) => (
                                            <SelectItem key={type} value={type}>
                                                {type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex justify-end gap-2 pt-4">
                                <Button variant="outline" onClick={() => setIsOpen(false)}>
                                    Cancel
                                </Button>
                                <Button onClick={handleUpload} disabled={isUploading || !selectedFile || !docName}>
                                    {isUploading ? 'Uploading...' : 'Upload'}
                                </Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            </CardHeader>
            <CardContent className="flex-1 min-h-0">
                {documents.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                        No documents uploaded yet.
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {documents.map((doc) => (
                                <TableRow key={doc.id}>
                                    <TableCell className="font-medium flex items-center gap-2">
                                        <FileText className="h-4 w-4 text-muted-foreground" />
                                        {doc.fileName}
                                    </TableCell>
                                    <TableCell className="capitalize">
                                        {doc.type.replace(/_/g, ' ')}
                                    </TableCell>
                                    <TableCell>
                                        {format(new Date(doc.uploadedAt), 'MMM d, yyyy')}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button variant="ghost" size="icon" asChild>
                                                <a href={doc.url} target="_blank" rel="noopener noreferrer">
                                                    <Eye className="h-4 w-4" />
                                                </a>
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => handleDelete(doc.id!, doc.path)}>
                                                <Trash2 className="h-4 w-4 text-destructive" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </CardContent>
        </Card>
    );
}
