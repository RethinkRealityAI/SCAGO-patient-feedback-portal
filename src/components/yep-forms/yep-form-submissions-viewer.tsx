'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Download,
  FileText,
  Search,
  RefreshCw,
  ExternalLink,
  Eye,
  Loader2,
  ChevronDown,
  Calendar,
  User,
  Mail,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { YEPFormSubmission, YEPFormTemplate } from '@/lib/yep-forms-types';
import { getYEPFormSubmissions, getAllYEPFormSubmissions, exportYEPSubmissionPdf } from '@/app/yep-forms/actions';
import { getQuestionText } from '@/lib/question-mapping';

interface YEPFormSubmissionsViewerProps {
  templates?: YEPFormTemplate[];
}

// Helper to render a single field value from a YEP submission's data object
function renderFieldValue(
  fieldKey: string,
  value: any,
  compact = false
): React.ReactNode {
  if (value === null || value === undefined || value === '') return null;

  // File upload arrays: array of objects with {name, url, ...}
  if (
    Array.isArray(value) &&
    value.length > 0 &&
    typeof value[0] === 'object' &&
    value[0] !== null &&
    value[0].url
  ) {
    return (
      <div className="space-y-1.5">
        {value.map((file: any, i: number) => (
          <a
            key={i}
            href={file.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2.5 p-2 rounded-md border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 hover:bg-red-50 hover:border-red-300 dark:hover:bg-red-950/20 transition-colors group"
          >
            <div className="flex-shrink-0 w-7 h-7 rounded bg-[#C8262A]/10 flex items-center justify-center">
              <FileText className="h-3.5 w-3.5 text-[#C8262A]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[#C8262A] group-hover:text-[#a51f22] truncate">
                {file.name || `File ${i + 1}`}
              </p>
              {!compact && file.type && (
                <p className="text-xs text-gray-400">{file.type}</p>
              )}
            </div>
            <ExternalLink className="h-3.5 w-3.5 text-gray-400 group-hover:text-[#C8262A] flex-shrink-0" />
          </a>
        ))}
      </div>
    );
  }

  // Single file upload object with url
  if (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    value.url
  ) {
    return (
      <a
        href={value.url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2.5 p-2 rounded-md border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 hover:bg-red-50 hover:border-red-300 dark:hover:bg-red-950/20 transition-colors group"
      >
        <div className="flex-shrink-0 w-7 h-7 rounded bg-[#C8262A]/10 flex items-center justify-center">
          <FileText className="h-3.5 w-3.5 text-[#C8262A]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[#C8262A] group-hover:text-[#a51f22] truncate">
            {value.name || 'View Document'}
          </p>
        </div>
        <ExternalLink className="h-3.5 w-3.5 text-gray-400 group-hover:text-[#C8262A] flex-shrink-0" />
      </a>
    );
  }

  // Empty array (file field with no upload)
  if (Array.isArray(value) && value.length === 0) {
    return <span className="text-sm text-gray-400 italic">No file uploaded</span>;
  }

  // Array of strings/primitives
  if (Array.isArray(value)) {
    const items = value.map((v: any) =>
      typeof v === 'object' ? JSON.stringify(v) : String(v)
    );
    return <span className="text-sm text-gray-900 dark:text-gray-100">{items.join(', ')}</span>;
  }

  // Boolean
  if (typeof value === 'boolean') {
    return (
      <Badge variant={value ? 'default' : 'secondary'} className="text-xs">
        {value ? 'Yes' : 'No'}
      </Badge>
    );
  }

  // Plain object (e.g. matrix data)
  if (typeof value === 'object' && value !== null) {
    return (
      <div className="text-sm text-gray-900 dark:text-gray-100 space-y-1">
        {Object.entries(value).map(([k, v]) => (
          <div key={k} className="flex gap-2">
            <span className="text-gray-500 min-w-20">{k}:</span>
            <span>{typeof v === 'object' ? JSON.stringify(v) : String(v)}</span>
          </div>
        ))}
      </div>
    );
  }

  return <span className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap">{String(value)}</span>;
}

// Detect if a field value contains a file upload
function isFileField(value: any): boolean {
  if (Array.isArray(value) && value.length > 0 && value[0]?.url) return true;
  if (typeof value === 'object' && value !== null && !Array.isArray(value) && value.url) return true;
  return false;
}

// Convert submissions to CSV string
function submissionsToCSV(submissions: YEPFormSubmission[]): string {
  if (submissions.length === 0) return '';

  // Collect all unique field keys across all submissions
  const allKeys = new Set<string>();
  submissions.forEach(sub => {
    const data = (sub as any).data || {};
    Object.keys(data).forEach(k => allKeys.add(k));
  });
  const fieldKeys = Array.from(allKeys);

  // Build headers
  const metaHeaders = ['Date', 'Submitter Email', 'Form Name', 'Status'];
  const fieldHeaders = fieldKeys.map(k => getQuestionText(k));
  const headers = [...metaHeaders, ...fieldHeaders];

  // Build rows
  const rows = submissions.map(sub => {
    const data = (sub as any).data || {};
    const metaCells = [
      new Date(sub.submittedAt as any).toLocaleDateString(),
      sub.submittedBy || '',
      sub.formTemplateName || '',
      sub.processingStatus || '',
    ];
    const fieldCells = fieldKeys.map(key => {
      const val = data[key];
      if (val === null || val === undefined) return '';
      // File upload arrays
      if (Array.isArray(val) && val.length > 0 && val[0]?.url) {
        return val.map((f: any) => (f.name ? `${f.name}: ${f.url}` : f.url)).join(' | ');
      }
      // Single file
      if (typeof val === 'object' && val !== null && !Array.isArray(val) && val.url) {
        return val.name ? `${val.name}: ${val.url}` : val.url;
      }
      // Array of primitives
      if (Array.isArray(val)) return val.join('; ');
      // Object
      if (typeof val === 'object') return JSON.stringify(val);
      return String(val);
    });
    return [...metaCells, ...fieldCells];
  });

  const escape = (cell: string) => `"${String(cell).replace(/"/g, '""')}"`;
  const csvLines = [
    headers.map(escape).join(','),
    ...rows.map(row => row.map(escape).join(',')),
  ];
  return csvLines.join('\n');
}

export default function YEPFormSubmissionsViewer({ templates = [] }: YEPFormSubmissionsViewerProps) {
  const [submissions, setSubmissions] = useState<YEPFormSubmission[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSubmission, setActiveSubmission] = useState<YEPFormSubmission | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const { toast } = useToast();

  const loadSubmissions = useCallback(async () => {
    setIsLoading(true);
    try {
      let result;
      if (selectedTemplateId === 'all') {
        result = await getAllYEPFormSubmissions();
      } else {
        result = await getYEPFormSubmissions(selectedTemplateId);
      }
      if (result.success && result.data) {
        setSubmissions(result.data);
      } else {
        toast({
          title: 'Error',
          description: (result as any).error || 'Failed to load submissions',
          variant: 'destructive',
        });
        setSubmissions([]);
      }
    } catch (err) {
      console.error('Error loading submissions:', err);
      toast({
        title: 'Error',
        description: 'Failed to load submissions',
        variant: 'destructive',
      });
      setSubmissions([]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedTemplateId, toast]);

  useEffect(() => {
    loadSubmissions();
  }, [loadSubmissions]);

  const filtered = submissions.filter(sub => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const data = (sub as any).data || {};
    const searchStr = [
      sub.submittedBy,
      sub.formTemplateName,
      data.fullName,
      data.email,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return searchStr.includes(q);
  });

  const handleExportCSV = () => {
    const csv = submissionsToCSV(filtered);
    if (!csv) {
      toast({ title: 'No data to export', variant: 'destructive' });
      return;
    }
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `board-recruitment-submissions-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast({ title: 'CSV exported successfully' });
  };

  const handleExportPDF = async (sub: YEPFormSubmission) => {
    setIsPdfLoading(true);
    try {
      const result = await exportYEPSubmissionPdf({ submission: sub });
      if (result.error || !result.pdfBase64) {
        toast({ title: 'PDF export failed', description: result.error, variant: 'destructive' });
        return;
      }
      // Decode base64 and trigger download
      const byteChars = atob(result.pdfBase64);
      const byteNums = new Array(byteChars.length);
      for (let i = 0; i < byteChars.length; i++) {
        byteNums[i] = byteChars.charCodeAt(i);
      }
      const blob = new Blob([new Uint8Array(byteNums)], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const data = (sub as any).data || {};
      const name = (data.fullName as string) || sub.submittedBy || 'submission';
      link.download = `${name.replace(/\s+/g, '_')}_${new Date(sub.submittedAt as any).toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast({ title: 'PDF downloaded successfully' });
    } catch (err) {
      console.error('PDF export error:', err);
      toast({ title: 'PDF export failed', variant: 'destructive' });
    } finally {
      setIsPdfLoading(false);
    }
  };

  const openModal = (sub: YEPFormSubmission) => {
    setActiveSubmission(sub);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setActiveSubmission(null);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-700 border-green-200">Completed</Badge>;
      case 'processing':
        return <Badge className="bg-blue-100 text-blue-700 border-blue-200">Processing</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="secondary">Pending</Badge>;
    }
  };

  // Build field labels map from the selected template
  const fieldLabelsMap: Record<string, string> = {};
  if (selectedTemplateId !== 'all') {
    const tpl = templates.find(t => t.id === selectedTemplateId);
    if (tpl) {
      tpl.sections?.forEach(section => {
        section.fields?.forEach(field => {
          fieldLabelsMap[field.id] = field.label;
        });
      });
    }
  }

  const getFieldLabel = (key: string) => fieldLabelsMap[key] || getQuestionText(key);

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <select
          value={selectedTemplateId}
          onChange={e => setSelectedTemplateId(e.target.value)}
          className="px-3 py-2 border rounded-md text-sm bg-background"
        >
          <option value="all">All Forms</option>
          {templates.map(t => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>

        <Button variant="outline" size="sm" onClick={loadSubmissions} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>

        <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={filtered.length === 0}>
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Submissions table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mr-2" />
          <span className="text-muted-foreground">Loading submissions...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {submissions.length === 0
            ? 'No submissions found for this form.'
            : 'No submissions match your search.'}
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Applicant</th>
                <th className="px-4 py-3 text-left font-medium hidden sm:table-cell">Form</th>
                <th className="px-4 py-3 text-left font-medium hidden md:table-cell">Date</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-left font-medium">Files</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map(sub => {
                const data = (sub as any).data || {};
                const name = (data.fullName as string) || sub.submittedBy || 'Unknown';
                const email = (data.email as string) || sub.submittedBy || '';
                const hasFiles = Object.values(data).some(isFileField);

                return (
                  <tr key={sub.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium truncate max-w-48">{name}</p>
                        {email && email !== name && (
                          <p className="text-xs text-muted-foreground truncate max-w-48">{email}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className="text-muted-foreground">{sub.formTemplateName || '—'}</span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">
                      {new Date(sub.submittedAt as any).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">{getStatusBadge(sub.processingStatus)}</td>
                    <td className="px-4 py-3">
                      {hasFiles ? (
                        <Badge className="bg-green-100 text-green-700 border-green-200 text-xs">
                          Has files
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button size="sm" variant="outline" onClick={() => openModal(sub)} className="h-7 px-2.5">
                        <Eye className="h-3.5 w-3.5 mr-1" />
                        View
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Submission detail modal */}
      <Dialog open={isModalOpen} onOpenChange={open => !open && closeModal()}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0">
          {activeSubmission && (() => {
            const data = (activeSubmission as any).data || {};
            const name = (data.fullName as string) || activeSubmission.submittedBy || 'Unknown';
            const submittedDate = new Date(activeSubmission.submittedAt as any);

            // Separate file fields and text fields for prioritized display
            const fileEntries: [string, any][] = [];
            const otherEntries: [string, any][] = [];
            Object.entries(data).forEach(([key, val]) => {
              if (val === null || val === undefined) return;
              if (isFileField(val)) {
                fileEntries.push([key, val]);
              } else {
                otherEntries.push([key, val]);
              }
            });

            return (
              <>
                <DialogHeader className="px-6 pt-6 pb-4 border-b">
                  <DialogTitle className="text-xl">{name}</DialogTitle>
                  <DialogDescription className="flex flex-wrap gap-3 mt-1">
                    <span className="flex items-center gap-1 text-xs">
                      <Mail className="h-3 w-3" />
                      {activeSubmission.submittedBy}
                    </span>
                    <span className="flex items-center gap-1 text-xs">
                      <Calendar className="h-3 w-3" />
                      {submittedDate.toLocaleString()}
                    </span>
                    <span className="flex items-center gap-1 text-xs">
                      <User className="h-3 w-3" />
                      {activeSubmission.formTemplateName || 'Board Recruitment'}
                    </span>
                    <span>{getStatusBadge(activeSubmission.processingStatus)}</span>
                  </DialogDescription>
                </DialogHeader>

                <ScrollArea className="flex-1 overflow-auto">
                  <div className="px-6 py-4 space-y-5">
                    {/* File uploads section — shown prominently first */}
                    {fileEntries.length > 0 && (
                      <div className="space-y-3">
                        <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                          Uploaded Documents
                        </h3>
                        {fileEntries.map(([key, val]) => (
                          <div key={key} className="space-y-1.5">
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              {getFieldLabel(key)}
                            </p>
                            {renderFieldValue(key, val)}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Divider if both sections have content */}
                    {fileEntries.length > 0 && otherEntries.length > 0 && (
                      <hr className="border-gray-200 dark:border-gray-700" />
                    )}

                    {/* Other form fields */}
                    {otherEntries.map(([key, val]) => {
                      const rendered = renderFieldValue(key, val);
                      if (!rendered) return null;
                      return (
                        <div key={key} className="border-b border-gray-100 dark:border-gray-700 pb-4 last:border-b-0 last:pb-0">
                          <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-1">
                            {getFieldLabel(key)}
                          </h4>
                          {rendered}
                        </div>
                      );
                    })}

                    {fileEntries.length === 0 && otherEntries.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">No form data available.</p>
                    )}
                  </div>
                </ScrollArea>

                <DialogFooter className="px-6 py-4 border-t bg-muted/30 flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleExportPDF(activeSubmission)}
                    disabled={isPdfLoading}
                    className="flex-1 sm:flex-none"
                  >
                    {isPdfLoading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <FileText className="h-4 w-4 mr-2" />
                    )}
                    Export PDF
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const csv = submissionsToCSV([activeSubmission]);
                      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                      const url = URL.createObjectURL(blob);
                      const link = document.createElement('a');
                      link.href = url;
                      link.download = `submission_${activeSubmission.id}.csv`;
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                      URL.revokeObjectURL(url);
                    }}
                    className="flex-1 sm:flex-none"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV
                  </Button>
                  <Button variant="secondary" size="sm" onClick={closeModal} className="flex-1 sm:flex-none">
                    Close
                  </Button>
                </DialogFooter>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
