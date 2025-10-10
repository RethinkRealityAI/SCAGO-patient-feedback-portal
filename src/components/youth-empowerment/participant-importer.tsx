'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import Papa from 'papaparse';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { upsertParticipantByEmail } from '@/app/youth-empowerment/actions';

const TargetFields = [
  'youthParticipant','age','email','etransferEmailAddress','phoneNumber','emergencyContactRelationship','emergencyContactNumber','region','mailingAddress','projectCategory','projectInANutshell','contractSigned','signedSyllabus','availability','assignedMentor','idProvided','canadianStatus','sin','sinNumber','youthProposal','affiliationWithSCD','proofOfAffiliationWithSCD','scagoCounterpart','dob','file',
  // Additional fields
  'approved','canadianStatusOther','citizenshipStatus','location','duties','notes','nextSteps','interviewed','interviewNotes','recruited'
] as const;
type TargetField = typeof TargetFields[number];

interface ParticipantImporterProps {
  isOpen: boolean;
  onClose: () => void;
  onImported?: () => void;
}

type RowObject = Record<string, string>;

export function ParticipantImporter({ isOpen, onClose, onImported }: ParticipantImporterProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [rawCsv, setRawCsv] = useState('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<RowObject[]>([]);
  const [mapping, setMapping] = useState<Record<string, TargetField | 'skip'>>({});
  const [isMappingLoading, setIsMappingLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [validationStatus, setValidationStatus] = useState<{
    isValid: boolean;
    message: string;
    warnings: string[];
    missingRequired: string[];
  } | null>(null);

  const hasData = rows.length > 0 && headers.length > 0;

  // Validation function to check data quality and required fields
  const validateData = useCallback((headers: string[], rows: any[], mapping: Record<string, TargetField | 'skip'>) => {
    const requiredFields = ['youthParticipant']; // Only name is required
    const warnings: string[] = [];
    const missingRequired: string[] = [];
    
    // Check if required fields are mapped
    const mappedFields = Object.values(mapping).filter(field => field !== 'skip');
    const missingFields = requiredFields.filter(field => !mappedFields.includes(field as TargetField));
    
    if (missingFields.length > 0) {
      missingRequired.push(`Missing required fields: ${missingFields.join(', ')}`);
    }
    
    // Check data quality
    if (rows.length === 0) {
      warnings.push('No data rows found');
    }
    
    // Check for empty required fields in data
    const emailColumn = Object.keys(mapping).find(key => mapping[key] === 'email');
    if (emailColumn) {
      const emptyEmails = rows.filter(row => !row[emailColumn] || row[emailColumn].trim() === '').length;
      if (emptyEmails > 0) {
        warnings.push(`${emptyEmails} rows have empty email addresses`);
      }
    }
    
    const nameColumn = Object.keys(mapping).find(key => mapping[key] === 'youthParticipant');
    if (nameColumn) {
      const emptyNames = rows.filter(row => !row[nameColumn] || row[nameColumn].trim() === '').length;
      if (emptyNames > 0) {
        warnings.push(`${emptyNames} rows have empty participant names`);
      }
    }
    
    const isValid = missingRequired.length === 0 && warnings.length === 0;
    const message = isValid 
      ? 'Data is valid and ready for import!'
      : missingRequired.length > 0 
        ? 'Please map all required fields before importing'
        : 'Data has some issues that should be reviewed';
    
    return { isValid, message, warnings, missingRequired };
  }, []);

  const parseCsv = useCallback((csvText: string) => {
    // Enhanced CSV parsing with better error handling and data cleaning
    const result = Papa.parse<RowObject>(csvText, { 
      header: true, 
      skipEmptyLines: true,
      transformHeader: (header) => header.trim(), // Clean headers
      transform: (value) => value?.toString().trim() || '', // Clean values
    });
    
    if (result.errors?.length) {
      // Try alternative parsing methods for malformed CSV
      const alternativeResult = Papa.parse<RowObject>(csvText, { 
        header: true, 
        skipEmptyLines: true,
        delimiter: '\t', // Try tab-delimited
        transformHeader: (header) => header.trim(),
        transform: (value) => value?.toString().trim() || '',
      });
      
      if (alternativeResult.errors?.length) {
        toast({ title: 'CSV Parse Error', description: result.errors[0].message, variant: 'destructive' });
        return;
      } else {
        // Use alternative parsing result
        const data = (alternativeResult.data || []).filter((r: any) => Object.values(r).some(v => (v ?? '').toString().trim() !== ''));
        const cols = alternativeResult.meta.fields || Object.keys(data[0] || {});
        setHeaders(cols);
        setRows(data.slice(0, 500));
        setMapping(Object.fromEntries(cols.map((h: string) => [h, 'skip' as const])));
        return;
      }
    }
    
    const data = (result.data || []).filter((r: any) => Object.values(r).some(v => (v ?? '').toString().trim() !== ''));
    const cols = result.meta.fields || Object.keys(data[0] || {});
    setHeaders(cols);
    setRows(data.slice(0, 500)); // safety cap
    setMapping(Object.fromEntries(cols.map((h: string) => [h, 'skip' as const])));
  }, [toast]);

  const handleFile = useCallback((file: File) => {
    Papa.parse<RowObject>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim(), // Clean headers
      transform: (value) => value?.toString().trim() || '', // Clean values
      complete: (res) => {
        if (res.errors?.length) {
          // Try alternative parsing for malformed files
          Papa.parse<RowObject>(file, {
            header: true,
            skipEmptyLines: true,
            delimiter: '\t', // Try tab-delimited
            transformHeader: (header) => header.trim(),
            transform: (value) => value?.toString().trim() || '',
            complete: (altRes) => {
              if (altRes.errors?.length) {
                toast({ title: 'CSV Parse Error', description: res.errors[0].message, variant: 'destructive' });
                return;
              }
              const data = (altRes.data || []).filter((r: any) => Object.values(r).some(v => (v ?? '').toString().trim() !== ''));
              const cols = altRes.meta.fields || Object.keys(data[0] || {});
              setHeaders(cols);
              setRows(data.slice(0, 500));
              setMapping(Object.fromEntries(cols.map((h: string) => [h, 'skip' as const])));
            },
          });
          return;
        }
        const data = (res.data || []).filter((r: any) => Object.values(r).some(v => (v ?? '').toString().trim() !== ''));
        const cols = res.meta.fields || Object.keys(data[0] || {});
        setHeaders(cols);
        setRows(data.slice(0, 500));
        setMapping(Object.fromEntries(cols.map((h: string) => [h, 'skip' as const])));
      },
    });
  }, [toast]);

  const requestAiMapping = useCallback(async () => {
    if (!hasData) return;
    setIsMappingLoading(true);
    try {
      const sampleRows = rows.slice(0, 3);
      const resp = await fetch('/api/yep/csv-map', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ headers, sampleRows }),
      });
      const json = await resp.json();
      if (!json.success) throw new Error(json.error || 'Mapping failed');
      const aiMap: Record<string, string> = json.data.mapping || {};
      const next: Record<string, TargetField | 'skip'> = {};
      for (const h of headers) {
        const proposed = aiMap[h];
        next[h] = (TargetFields as readonly string[]).includes(proposed) ? (proposed as TargetField) : 'skip';
      }
      setMapping(next);
      
      // Validate the AI mapping
      const validation = validateData(headers, rows, next);
      setValidationStatus(validation);
    } catch (e) {
      toast({ title: 'Mapping Error', description: e instanceof Error ? e.message : 'Unknown error', variant: 'destructive' });
    } finally {
      setIsMappingLoading(false);
    }
  }, [headers, rows, hasData, toast, validateData]);

  const mappedPreview = useMemo(() => {
    return rows.slice(0, 5).map((r) => {
      const obj: Record<string, string> = {};
      for (const [col, target] of Object.entries(mapping)) {
        if (!target || target === 'skip') continue;
        obj[target] = (r[col] ?? '').toString();
      }
      return obj;
    });
  }, [rows, mapping]);

  // Enhanced boolean normalization with comprehensive pattern matching
  const normalizeBoolean = (val: string): { value: boolean | undefined; original: string; transformed: boolean } => {
    const original = (val || '').toString().trim();
    const s = original.toLowerCase();
    
    if (!s) return { value: undefined, original, transformed: false };
    
    // Positive boolean patterns
    const positivePatterns = [
      'true', 'yes', 'y', '1', 'approved', 'signed', 'provided', 'completed', 'done',
      'contract signed', 'signed contract', 'provided signed', 'signed syllabus',
      'passport provided', 'drivers license provided', 'id provided',
      'proof provided', 'affiliation provided', 'yes', 'yep', 'yeah', 'yup',
      'confirmed', 'verified', 'accepted', 'valid', 'active', 'enabled',
      'on', 'enabled', 'checked', 'marked', 'ticked', 'selected'
    ];
    
    // Negative boolean patterns
    const negativePatterns = [
      'false', 'no', 'n', '0', 'pending', 'not provided', 'not signed',
      'not completed', 'missing', 'incomplete', 'unavailable', 'none',
      'nope', 'nah', 'negative', 'rejected', 'declined', 'inactive',
      'disabled', 'off', 'unchecked', 'unmarked', 'deselected', 'empty'
    ];
    
    // Check for positive patterns
    for (const pattern of positivePatterns) {
      if (s.includes(pattern) || pattern.includes(s)) {
        return { value: true, original, transformed: true };
      }
    }
    
    // Check for negative patterns
    for (const pattern of negativePatterns) {
      if (s.includes(pattern) || pattern.includes(s)) {
        return { value: false, original, transformed: true };
      }
    }
    
    return { value: undefined, original, transformed: false };
  };

  // Enhanced Canadian status normalization
  const normalizeCanadianStatus = (val: string): { value: string; original: string; transformed: boolean } => {
    const original = (val || '').toString().trim();
    const s = original.toLowerCase();
    
    if (!s) return { value: '', original, transformed: false };
    
    // Canadian Citizen patterns
    if (s.includes('citizen') || s.includes('canadian citizen') || s.includes('citizenship')) {
      return { value: 'Canadian Citizen', original, transformed: true };
    }
    
    // Permanent Resident patterns
    if (s.includes('permanent') || s.includes('pr status') || s.includes('pr') || s.includes('permanent resident')) {
      return { value: 'Permanent Resident', original, transformed: true };
    }
    
    return { value: original, original, transformed: false };
  };

  const importRows = useCallback(async () => {
    if (!hasData) return;
    setIsImporting(true);
    
    // Track transformations for user feedback
    const transformations: Array<{
      row: number;
      field: string;
      original: string;
      transformed: string | boolean | number;
      type: 'boolean' | 'canadian_status' | 'age' | 'email';
    }> = [];
    
    try {
      let createdCount = 0;
      let updatedCount = 0;
      let skippedCount = 0;
      let failedCount = 0;

      // Upsert by email
      for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
        const r = rows[rowIndex];
        const obj: any = {};
        for (const [col, target] of Object.entries(mapping)) {
          if (!target || target === 'skip') continue;
          obj[target] = (r[col] ?? '').toString().trim();
        }

        // Enhanced boolean conversion with transformation tracking
        for (const b of ['approved','contractSigned','signedSyllabus','idProvided','proofOfAffiliationWithSCD','interviewed','recruited'] as const) {
          // Set default values for boolean fields that might be missing
          obj[b] = obj[b] ?? false;
          if (obj[b] !== undefined) {
            const normalized = normalizeBoolean(obj[b]);
            if (normalized.value !== undefined) {
              obj[b] = normalized.value;
              if (normalized.transformed) {
                transformations.push({
                  row: rowIndex + 1,
                  field: b,
                  original: normalized.original,
                  transformed: normalized.value,
                  type: 'boolean'
                });
              }
            }
          }
        }

        // Ensure only name is required - handle empty data gracefully
        if (!obj.youthParticipant || obj.youthParticipant.trim() === '') {
          skippedCount += 1; // skip rows without name
          continue;
        }
        
        // Enhanced age conversion with transformation tracking
        if (typeof obj.age === 'string') {
          const trimmed = obj.age.trim();
          if (trimmed === '') {
            delete obj.age; // drop blank ages
          } else {
            const ageNum = parseInt(trimmed, 10);
            if (!isNaN(ageNum) && ageNum >= 16 && ageNum <= 30) {
              obj.age = ageNum;
              transformations.push({
                row: rowIndex + 1,
                field: 'age',
                original: trimmed,
                transformed: ageNum,
                type: 'age'
              });
            } else {
              delete obj.age; // Remove invalid age values
            }
          }
        }
        
        // Enhanced Canadian status normalization with transformation tracking
        if (obj.canadianStatus) {
          const normalized = normalizeCanadianStatus(obj.canadianStatus);
          obj.canadianStatus = normalized.value;
          if (normalized.transformed) {
            transformations.push({
              row: rowIndex + 1,
              field: 'canadianStatus',
              original: normalized.original,
              transformed: normalized.value,
              type: 'canadian_status'
            });
          }
        }
        
        // Enhanced email cleaning with transformation tracking
        if (obj.email && !obj.email.includes('@')) {
          const originalEmail = obj.email;
          obj.email = '';
          transformations.push({
            row: rowIndex + 1,
            field: 'email',
            original: originalEmail,
            transformed: '',
            type: 'email'
          });
        }
        if (obj.etransferEmailAddress && !obj.etransferEmailAddress.includes('@')) {
          const originalEmail = obj.etransferEmailAddress;
          obj.etransferEmailAddress = '';
          transformations.push({
            row: rowIndex + 1,
            field: 'etransferEmailAddress',
            original: originalEmail,
            transformed: '',
            type: 'email'
          });
        }
        
        // Provide safe defaults for empty fields
        obj.email = obj.email || '';
        obj.etransferEmailAddress = obj.etransferEmailAddress || '';
        obj.region = obj.region || '';
        obj.dob = obj.dob || '';
        obj.canadianStatus = obj.canadianStatus || 'Other';
        obj.contractSigned = obj.contractSigned ?? false;
        obj.signedSyllabus = obj.signedSyllabus ?? false;
        obj.idProvided = obj.idProvided ?? false;
        obj.proofOfAffiliationWithSCD = obj.proofOfAffiliationWithSCD ?? false;
        obj.approved = obj.approved ?? false;

        // Handle SIN - normalize: keep only 9 digits, else clear
        const normalizeDigits = (v: string) => (v || '').replace(/\D/g, '');
        const sinDigits = normalizeDigits(obj.sin);
        const sinNumDigits = normalizeDigits(obj.sinNumber);
        if (sinDigits.length === 9) {
          obj.sin = sinDigits;
        } else if (sinNumDigits.length === 9) {
          obj.sin = sinNumDigits; // prefer a valid 9-digit from sinNumber
        } else {
          obj.sin = '';
        }
        obj.sinNumber = sinNumDigits.length === 9 ? sinNumDigits : '';

        try {
          const res: any = await upsertParticipantByEmail(obj);
          if (res?.success) {
            if (res.action === 'updated') updatedCount += 1;
            else createdCount += 1;
          } else if (res?.error) {
            failedCount += 1;
          } else {
            createdCount += 1; // default to created if unspecified
          }
        } catch (_) {
          failedCount += 1;
        }
      }

      // Show transformation summary if any transformations occurred
      if (transformations.length > 0) {
        const transformationSummary = transformations.slice(0, 10).map(t => 
          `Row ${t.row} ${t.field}: "${t.original}" → ${t.transformed}`
        ).join('\n');
        
        toast({
          title: 'Data Transformations Applied',
          description: `Applied ${transformations.length} data transformations:\n${transformationSummary}${transformations.length > 10 ? '\n... and more' : ''}`,
          duration: 8000,
        });
      }

      const totalProcessed = createdCount + updatedCount + skippedCount + failedCount;
      toast({ 
        title: 'Import complete', 
        description: `Created ${createdCount}, Updated ${updatedCount}, Skipped ${skippedCount}, Failed ${failedCount} (from ${totalProcessed} rows)${transformations.length > 0 ? ` • ${transformations.length} data fixes` : ''}` 
      });
      onImported?.();
      onClose();
    } catch (e) {
      toast({ title: 'Import Error', description: e instanceof Error ? e.message : 'Unknown error', variant: 'destructive' });
    } finally {
      setIsImporting(false);
    }
  }, [rows, mapping, hasData, toast, onImported, onClose]);

  return (
    <Dialog open={isOpen} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="w-[95vw] max-w-5xl h-[90vh] max-h-[1200px] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Import YEP Participants from CSV</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col space-y-4">
          {/* File Upload Section */}
          <div className="flex-shrink-0 space-y-4">
            <div className="flex gap-2 items-center">
              <Input type="file" accept=".csv" ref={fileInputRef} onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }} />
              <Button variant="outline" onClick={() => fileInputRef.current?.click()}>Choose CSV</Button>
            </div>

            <div>
              <label className="block text-sm mb-2">Or paste CSV</label>
              <Textarea 
                value={rawCsv} 
                onChange={(e) => setRawCsv(e.target.value)} 
                rows={8} 
                placeholder="Paste CSV here..." 
                className="resize-none"
              />
              <div className="mt-2 flex gap-2">
                <Button onClick={() => parseCsv(rawCsv)} disabled={!rawCsv.trim()}>
                  Parse
                </Button>
                <Button 
                  variant="secondary" 
                  onClick={() => {
                    parseCsv(rawCsv);
                    setTimeout(() => requestAiMapping(), 200);
                  }} 
                  disabled={!rawCsv.trim() || isMappingLoading}
                >
                  {isMappingLoading ? 'Processing with AI...' : 'Import with AI'}
                </Button>
              </div>
            </div>
          </div>

          {/* Validation Status */}
          {validationStatus && (
            <div className={`p-4 rounded-lg border ${
              validationStatus.isValid 
                ? 'bg-green-50 border-green-200 text-green-800' 
                : 'bg-yellow-50 border-yellow-200 text-yellow-800'
            }`}>
              <div className="flex items-center gap-2">
                {validationStatus.isValid ? (
                  <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                ) : (
                  <div className="w-5 h-5 rounded-full bg-yellow-500 flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
                <span className="font-medium">{validationStatus.message}</span>
              </div>
              
              {validationStatus.missingRequired.length > 0 && (
                <div className="mt-2">
                  <div className="text-sm font-medium text-red-700">Required fields missing:</div>
                  <ul className="text-sm text-red-600 list-disc list-inside ml-2">
                    {validationStatus.missingRequired.map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {validationStatus.warnings.length > 0 && (
                <div className="mt-2">
                  <div className="text-sm font-medium text-yellow-700">Warnings:</div>
                  <ul className="text-sm text-yellow-600 list-disc list-inside ml-2">
                    {validationStatus.warnings.map((warning, index) => (
                      <li key={index}>{warning}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Data Mapping Section */}
          {hasData && (
            <div className="flex-1 flex flex-col space-y-4 min-h-0">
              <div className="flex justify-between items-center flex-shrink-0">
                <div className="font-medium">Map columns</div>
                <Button variant="secondary" onClick={requestAiMapping} disabled={isMappingLoading}>
                  {isMappingLoading ? 'Processing with AI...' : 'Suggest with AI'}
                </Button>
              </div>
              
              {/* Mapping Table - Scrollable */}
              <div className="flex-1 overflow-auto border rounded-md">
                <Table>
                  <TableHeader className="sticky top-0 bg-background z-10">
                    <TableRow>
                      <TableHead className="w-1/3">CSV Column</TableHead>
                      <TableHead className="w-2/3">Map to Field</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {headers.map((h) => (
                      <TableRow key={h}>
                        <TableCell className="font-medium">{h}</TableCell>
                        <TableCell>
                          <Select 
                            value={mapping[h] || 'skip'} 
                            onValueChange={(v) => {
                              const newMapping = { ...mapping, [h]: v as TargetField | 'skip' };
                              setMapping(newMapping);
                              // Update validation when mapping changes
                              const validation = validateData(headers, rows, newMapping);
                              setValidationStatus(validation);
                            }}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Do not import" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="skip">Do not import</SelectItem>
                              {TargetFields.map(tf => (
                                <SelectItem key={tf} value={tf}>{tf}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Preview Section - Collapsible */}
              <div className="flex-shrink-0">
                <details className="group">
                  <summary className="cursor-pointer font-medium text-sm text-muted-foreground hover:text-foreground transition-colors">
                    Preview (first 5 rows) <span className="group-open:hidden">▼</span><span className="hidden group-open:inline">▲</span>
                  </summary>
                  <div className="mt-2">
                    <pre className="bg-muted p-3 rounded text-xs overflow-auto max-h-48 border">{JSON.stringify(mappedPreview, null, 2)}</pre>
                  </div>
                </details>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex-shrink-0 border-t pt-4">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={importRows} disabled={!hasData || isImporting}>{isImporting ? 'Importing…' : 'Import'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


