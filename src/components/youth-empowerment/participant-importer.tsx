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
  'youthParticipant','email','etransferEmailAddress','mailingAddress','phoneNumber','region','approved','contractSigned','signedSyllabus','availability','assignedMentor','idProvided','canadianStatus','canadianStatusOther','sin','youthProposal','proofOfAffiliationWithSCD','scagoCounterpart','dob',
  // New fields from current participants data
  'age','citizenshipStatus','location','projectCategory','duties','affiliationWithSCD','notes','nextSteps','interviewed','interviewNotes','recruited'
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

  const hasData = rows.length > 0 && headers.length > 0;

  const parseCsv = useCallback((csvText: string) => {
    const result = Papa.parse<RowObject>(csvText, { header: true, skipEmptyLines: true });
    if (result.errors?.length) {
      toast({ title: 'CSV Parse Error', description: result.errors[0].message, variant: 'destructive' });
      return;
    }
    const data = (result.data || []).filter(r => Object.values(r).some(v => (v ?? '').toString().trim() !== ''));
    const cols = result.meta.fields || Object.keys(data[0] || {});
    setHeaders(cols);
    setRows(data.slice(0, 500)); // safety cap
    setMapping(Object.fromEntries(cols.map(h => [h, 'skip' as const])));
  }, [toast]);

  const handleFile = useCallback((file: File) => {
    Papa.parse<RowObject>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        if (res.errors?.length) {
          toast({ title: 'CSV Parse Error', description: res.errors[0].message, variant: 'destructive' });
          return;
        }
        const data = (res.data || []).filter(r => Object.values(r).some(v => (v ?? '').toString().trim() !== ''));
        const cols = res.meta.fields || Object.keys(data[0] || {});
        setHeaders(cols);
        setRows(data.slice(0, 500));
        setMapping(Object.fromEntries(cols.map(h => [h, 'skip' as const])));
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
    } catch (e) {
      toast({ title: 'Mapping Error', description: e instanceof Error ? e.message : 'Unknown error', variant: 'destructive' });
    } finally {
      setIsMappingLoading(false);
    }
  }, [headers, rows, hasData, toast]);

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

  const normalizeBoolean = (val: string): boolean | undefined => {
    const s = (val || '').toString().trim().toLowerCase();
    if (!s) return undefined;
    if (['true','yes','y','1','approved'].includes(s)) return true;
    if (['false','no','n','0','pending'].includes(s)) return false;
    return undefined;
  };

  const importRows = useCallback(async () => {
    if (!hasData) return;
    setIsImporting(true);
    try {
      // Upsert by email
      for (const r of rows) {
        const obj: any = {};
        for (const [col, target] of Object.entries(mapping)) {
          if (!target || target === 'skip') continue;
          obj[target] = (r[col] ?? '').toString().trim();
        }

        // Convert booleans
        for (const b of ['approved','contractSigned','signedSyllabus','idProvided','proofOfAffiliationWithSCD'] as const) {
          if (obj[b] !== undefined) {
            const parsed = normalizeBoolean(obj[b]);
            if (parsed !== undefined) obj[b] = parsed;
          }
        }

        // Ensure required minimal fields
        if (!obj.youthParticipant || !obj.email || !obj.region || !obj.dob) {
          continue; // skip incomplete rows
        }

        // Pass raw sin; server will hash
        if (obj.sin) {
          obj.sin = obj.sin;
        }

        await upsertParticipantByEmail(obj);
      }

      toast({ title: 'Import complete', description: 'Participants imported.' });
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
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle>Import YEP Participants from CSV</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2 items-center">
            <Input type="file" accept=".csv" ref={fileInputRef} onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }} />
            <Button variant="outline" onClick={() => fileInputRef.current?.click()}>Choose CSV</Button>
          </div>

          <div>
            <label className="block text-sm mb-2">Or paste CSV</label>
            <Textarea value={rawCsv} onChange={(e) => setRawCsv(e.target.value)} rows={6} placeholder="Paste CSV here..." />
            <div className="mt-2">
              <Button onClick={() => parseCsv(rawCsv)} disabled={!rawCsv.trim()}>Parse</Button>
            </div>
          </div>

          {hasData && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div className="font-medium">Map columns</div>
                <Button variant="secondary" onClick={requestAiMapping} disabled={isMappingLoading}>
                  {isMappingLoading ? 'Suggesting…' : 'Suggest with AI'}
                </Button>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>CSV Column</TableHead>
                      <TableHead>Map to Field</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {headers.map((h) => (
                      <TableRow key={h}>
                        <TableCell>{h}</TableCell>
                        <TableCell>
                          <Select value={mapping[h] || 'skip'} onValueChange={(v) => setMapping((m) => ({ ...m, [h]: v as TargetField | 'skip' }))}>
                            <SelectTrigger className="w-72">
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

              <div>
                <div className="font-medium mb-2">Preview (first 5 rows after mapping)</div>
                <pre className="bg-muted p-3 rounded text-xs overflow-auto max-h-60">{JSON.stringify(mappedPreview, null, 2)}</pre>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={importRows} disabled={!hasData || isImporting}>{isImporting ? 'Importing…' : 'Import'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


