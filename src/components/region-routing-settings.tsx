'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Loader2, Mail, MapPinned, Plus, Trash2, X } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getRegionMappings, type RegionCityOption } from '@/app/admin/user-actions';
import { getRegionDisplayLabel } from '@/types/patient';
import {
  UNKNOWN_REGION,
  citiesByRegion,
  resolveNotificationRecipients,
  type AreaRoute,
  type RegionRoutingConfig,
} from '@/lib/region-routing';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Email addresses as removable chips; Enter, comma or leaving the box adds what was typed. */
function EmailChips({ value, onChange, placeholder, id }: { value: string[]; onChange: (v: string[]) => void; placeholder?: string; id: string }) {
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);

  const commit = () => {
    const parts = draft.split(/[,;\s]+/).map(s => s.trim()).filter(Boolean);
    if (parts.length === 0) return;
    const bad = parts.filter(p => !EMAIL.test(p));
    const good = parts.filter(p => EMAIL.test(p) && !value.some(v => v.toLowerCase() === p.toLowerCase()));
    if (good.length) onChange([...value, ...good]);
    setDraft(bad.join(', '));
    setError(bad.length ? `Not a valid email: ${bad.join(', ')}` : null);
  };

  return (
    <div className="space-y-1.5">
      <div className="flex min-h-10 flex-wrap items-center gap-1.5 rounded-md border bg-background px-2 py-1.5 focus-within:ring-2 focus-within:ring-ring">
        {value.map(email => (
          <span key={email} className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-800">
            <Mail className="h-3 w-3" aria-hidden />
            {email}
            <button
              type="button"
              onClick={() => onChange(value.filter(v => v !== email))}
              className="ml-0.5 rounded hover:text-red-600"
              aria-label={`Remove ${email}`}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          id={id}
          value={draft}
          onChange={e => { setDraft(e.target.value); setError(null); }}
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); commit(); }
            if (e.key === 'Backspace' && !draft && value.length) onChange(value.slice(0, -1));
          }}
          onBlur={commit}
          placeholder={value.length ? 'Add another…' : placeholder}
          className="min-w-[10rem] flex-1 bg-transparent px-1 py-0.5 text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

export function RegionRoutingSettings({
  value,
  onChange,
  cityFields,
  mainRecipients,
}: {
  value?: RegionRoutingConfig;
  onChange: (next: RegionRoutingConfig) => void;
  /** The form's City (Ontario) questions that routing can use. */
  cityFields: Array<{ id: string; label: string }>;
  mainRecipients: string[];
}) {
  const config: RegionRoutingConfig = value || {};
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [regions, setRegions] = useState<string[]>([]);
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [cities, setCities] = useState<RegionCityOption[]>([]);
  const [previewCity, setPreviewCity] = useState<string>('');

  useEffect(() => {
    let cancelled = false;
    getRegionMappings()
      .then(result => {
        if (cancelled) return;
        if (!result.success) { setLoadError(result.error); return; }
        setRegions(result.regions);
        setMappings(result.mappings);
        setCities(result.cities);
      })
      .catch(err => !cancelled && setLoadError(err?.message || 'Could not load regions'))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, []);

  const set = (patch: Partial<RegionRoutingConfig>) => onChange({ ...config, ...patch });
  const setRoute = (region: string, emails: string[]) => set({ routes: { ...(config.routes || {}), [region]: emails } });

  const cityLabel = useMemo(() => new Map(cities.map(c => [c.value, c.label])), [cities]);
  const byRegion = useMemo(() => citiesByRegion(mappings), [mappings]);
  // Named regions first, "Not assigned" last.
  const orderedRegions = useMemo(
    () => [...regions.filter(r => r !== UNKNOWN_REGION), ...(regions.includes(UNKNOWN_REGION) ? [UNKNOWN_REGION] : [])],
    [regions]
  );
  const sourceFieldId = config.sourceFieldId || cityFields[0]?.id;
  const configuredRegions = orderedRegions.filter(r => (config.routes?.[r] || []).length > 0).length;

  const preview = previewCity
    ? resolveNotificationRecipients({
        mainRecipients,
        routing: { ...config, enabled: true, sourceFieldId: '__city' },
        submission: { __city: previewCity === '__other' ? { selection: 'other', other: 'Somewhere else' } : { selection: previewCity } },
        cityToRegion: mappings,
      })
    : null;

  return (
    <div className="space-y-4 rounded-lg border bg-white p-4 shadow-sm">
      <div className="flex flex-row items-start justify-between gap-4">
        <div className="space-y-0.5">
          <Label htmlFor="region-routing-enabled" className="flex items-center gap-2 text-base">
            <MapPinned className="h-4 w-4 text-primary" aria-hidden />
            Send to regional contacts
          </Label>
          <p className="text-sm text-muted-foreground">
            Notify the right regional team based on the city the respondent selects. Regions and their cities come from the admin control center.
          </p>
        </div>
        <Switch
          id="region-routing-enabled"
          checked={!!config.enabled}
          disabled={cityFields.length === 0}
          onCheckedChange={checked => set({ enabled: checked, sourceFieldId: config.sourceFieldId || cityFields[0]?.id })}
        />
      </div>

      {cityFields.length === 0 && (
        <p className="rounded-md bg-amber-50 p-3 text-sm text-amber-800">
          This form has no <strong>City (Ontario)</strong> question, so there is nothing to route on. Add one to use regional routing.
        </p>
      )}

      {config.enabled && cityFields.length > 0 && (
        <div className="space-y-5">
          {cityFields.length > 1 && (
            <div className="space-y-1.5">
              <Label>Route using</Label>
              <Select value={sourceFieldId} onValueChange={v => set({ sourceFieldId: v })}>
                <SelectTrigger className="sm:max-w-md"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {cityFields.map(f => <SelectItem key={f.id} value={f.id}>{f.label || f.id}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex flex-row items-start justify-between gap-4 rounded-md border p-3">
            <div className="space-y-0.5">
              <Label htmlFor="region-routing-main" className="text-sm">Main recipients also get every submission</Label>
              <p className="text-xs text-muted-foreground">
                {config.alwaysNotifyMain === false
                  ? 'Off: the main recipients only get submissions from regions with no contacts below, or from cities not in any region.'
                  : 'On: regional contacts are added to the main recipients above.'}
              </p>
            </div>
            <Switch
              id="region-routing-main"
              checked={config.alwaysNotifyMain !== false}
              onCheckedChange={checked => set({ alwaysNotifyMain: checked })}
            />
          </div>

          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading regions…
            </div>
          ) : loadError ? (
            <p className="text-sm text-destructive">Could not load regions: {loadError}</p>
          ) : (
            <>
              <div className="space-y-1">
                <div className="flex items-baseline justify-between gap-2">
                  <h4 className="text-sm font-semibold">Contacts by region</h4>
                  <span className="text-xs text-muted-foreground">{configuredRegions} of {orderedRegions.length} regions have contacts</span>
                </div>
                <p className="text-xs text-muted-foreground">Leave a region empty to send its submissions to the main recipients.</p>
              </div>
              <ul className="divide-y rounded-md border">
                {orderedRegions.map(region => {
                  // Unlabelled keys are alternate spellings of a listed city (e.g. "sault-st-marie").
                  const regionCities = (byRegion[region] || []).flatMap(c => (cityLabel.has(c) ? [cityLabel.get(c)!] : []));
                  const shown = regionCities.slice(0, 6).join(', ');
                  return (
                    <li key={region} className="grid gap-2 p-3 md:grid-cols-[minmax(0,14rem)_1fr] md:items-start md:gap-4">
                      <div className="min-w-0">
                        <Label htmlFor={`region-route-${region}`} className="font-medium">{getRegionDisplayLabel(region)}</Label>
                        <p className="mt-0.5 text-xs text-muted-foreground" title={regionCities.join(', ')}>
                          {region === UNKNOWN_REGION
                            ? 'Cities not in any region, or typed in under “Other”.'
                            : regionCities.length
                              ? `${shown}${regionCities.length > 6 ? ` +${regionCities.length - 6} more` : ''}`
                              : 'No cities mapped to this region yet.'}
                        </p>
                      </div>
                      <EmailChips
                        id={`region-route-${region}`}
                        value={config.routes?.[region] || []}
                        onChange={emails => setRoute(region, emails)}
                        placeholder="Add email addresses (none: main recipients)"
                      />
                    </li>
                  );
                })}
              </ul>

              <div className="space-y-2">
                <div>
                  <h4 className="text-sm font-semibold">Specific areas</h4>
                  <p className="text-xs text-muted-foreground">
                    A group of cities with its own contact, e.g. Windsor-Essex within the West region. These cities go to the area’s contact instead of the region’s.
                  </p>
                </div>
                {(config.areaRoutes || []).map((area, index) => {
                  const update = (patch: Partial<AreaRoute>) =>
                    set({ areaRoutes: (config.areaRoutes || []).map((a, i) => (i === index ? { ...a, ...patch } : a)) });
                  const remaining = cities.filter(c => !area.cities.includes(c.value));
                  return (
                    <div key={index} className="space-y-3 rounded-md border p-3">
                      <div className="flex items-center gap-2">
                        <Input
                          aria-label="Area name"
                          value={area.name}
                          onChange={e => update({ name: e.target.value })}
                          placeholder="Area name, e.g. Windsor-Essex"
                          className="h-9 sm:max-w-xs"
                        />
                        <button
                          type="button"
                          onClick={() => set({ areaRoutes: (config.areaRoutes || []).filter((_, i) => i !== index) })}
                          className="ml-auto inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Remove area
                        </button>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Cities</Label>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {area.cities.map(city => (
                            <span key={city} className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs">
                              {cityLabel.get(city) || city}
                              <button
                                type="button"
                                onClick={() => update({ cities: area.cities.filter(c => c !== city) })}
                                className="rounded hover:text-destructive"
                                aria-label={`Remove ${cityLabel.get(city) || city}`}
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </span>
                          ))}
                          <Select value="" onValueChange={v => update({ cities: [...area.cities, v] })}>
                            <SelectTrigger aria-label="Add a city" className="h-7 w-auto gap-1 px-2 text-xs">
                              <SelectValue placeholder="+ Add city" />
                            </SelectTrigger>
                            <SelectContent>
                              {remaining.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor={`area-route-${index}`} className="text-xs">Contacts</Label>
                        <EmailChips
                          id={`area-route-${index}`}
                          value={area.emails}
                          onChange={emails => update({ emails })}
                          placeholder="Add email addresses"
                        />
                      </div>
                    </div>
                  );
                })}
                <button
                  type="button"
                  onClick={() => set({ areaRoutes: [...(config.areaRoutes || []), { name: '', cities: [], emails: [] }] })}
                  className="inline-flex items-center gap-1.5 rounded-md border border-dashed px-3 py-1.5 text-sm text-muted-foreground hover:border-primary hover:text-primary"
                >
                  <Plus className="h-4 w-4" /> Add a specific area
                </button>
              </div>

              <div className="space-y-2 rounded-md bg-muted/40 p-3">
                <Label htmlFor="region-routing-preview" className="text-sm">Check where a submission goes</Label>
                <Select value={previewCity} onValueChange={setPreviewCity}>
                  <SelectTrigger id="region-routing-preview" className="bg-background sm:max-w-sm">
                    <SelectValue placeholder="Pick a city…" />
                  </SelectTrigger>
                  <SelectContent>
                    {cities.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                    <SelectItem value="__other">Other (typed in)</SelectItem>
                  </SelectContent>
                </Select>
                {preview && (
                  <p className="text-sm">
                    <span className="font-medium">
                      {getRegionDisplayLabel(preview.region || UNKNOWN_REGION)}
                      {preview.area && ` (${preview.area})`}
                    </span>
                    <ArrowRight className="mx-1.5 inline h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                    {preview.recipients.length ? preview.recipients.join(', ') : <span className="text-destructive">no one (add main recipients above)</span>}
                    {!preview.routedToRegion && <span className="text-muted-foreground"> (main recipients; no regional contacts)</span>}
                  </p>
                )}
              </div>

              <p className="text-xs text-muted-foreground">
                To change which cities belong to each region, go to{' '}
                <Link href="/admin" className="font-medium text-primary underline-offset-2 hover:underline">Admin → Settings → Regions</Link>.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default RegionRoutingSettings;
