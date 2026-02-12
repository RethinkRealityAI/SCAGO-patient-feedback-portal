'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, MapPinned, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  getRegionAccessPolicy,
  getRegionMappings,
  setRegionMappings,
  type RegionCityOption,
} from '@/app/admin/user-actions';
import { REGIONS } from '@/types/patient';

type EditableRegion = Exclude<(typeof REGIONS)[number], 'Unknown'>;
type MappingState = Record<string, EditableRegion>;

const EDITABLE_REGIONS = REGIONS.filter((region) => region !== 'Unknown') as EditableRegion[];

function slugifyCity(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function RegionConfigEditor() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [policyMode, setPolicyMode] = useState<'legacy' | 'strict'>('legacy');
  const [cities, setCities] = useState<RegionCityOption[]>([]);
  const [mappings, setMappings] = useState<MappingState>({});
  const [newCityLabel, setNewCityLabel] = useState('');
  const [newCityRegion, setNewCityRegion] = useState<EditableRegion>('GTA');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [policyRes, mappingsRes] = await Promise.all([
        getRegionAccessPolicy(),
        getRegionMappings(),
      ]);

      if (policyRes.success) {
        setPolicyMode(policyRes.mode);
      }

      if (!mappingsRes.success) {
        toast({
          title: 'Error',
          description: mappingsRes.error || 'Failed to load region mappings',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      const normalizedMappings = Object.fromEntries(
        Object.entries(mappingsRes.mappings).flatMap(([city, region]) => {
          if (region === 'Unknown') return [];
          return [[city, region as EditableRegion]];
        })
      ) as MappingState;

      setMappings(normalizedMappings);
      setCities(mappingsRes.cities);
      setLoading(false);
    };

    load();
  }, [toast]);

  const cityIndex = useMemo(() => new Map(cities.map((city) => [city.value, city])), [cities]);

  const groupedByRegion = useMemo(() => {
    const grouped = new Map<EditableRegion, RegionCityOption[]>();
    EDITABLE_REGIONS.forEach((region) => grouped.set(region, []));
    Object.entries(mappings).forEach(([citySlug, region]) => {
      const city = cityIndex.get(citySlug);
      if (!city) return;
      grouped.get(region)?.push(city);
    });
    EDITABLE_REGIONS.forEach((region) => {
      const rows = grouped.get(region) || [];
      rows.sort((a, b) => a.label.localeCompare(b.label));
      grouped.set(region, rows);
    });
    return grouped;
  }, [cityIndex, mappings]);

  const unmappedCities = useMemo(() => {
    const mappedKeys = new Set(Object.keys(mappings));
    return cities
      .filter((city) => !mappedKeys.has(city.value))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [cities, mappings]);

  const handleAssignRegion = (cityValue: string, nextRegion: EditableRegion | 'unmapped') => {
    setMappings((prev) => {
      if (nextRegion === 'unmapped') {
        const { [cityValue]: _removed, ...rest } = prev;
        return rest;
      }
      return { ...prev, [cityValue]: nextRegion };
    });
  };

  const handleAddCity = () => {
    const label = newCityLabel.trim();
    const value = slugifyCity(label);
    if (!label || !value) return;
    if (value === 'other') {
      toast({
        title: 'Reserved slug',
        description: 'The city value "other" is reserved for free-text intake entries.',
        variant: 'destructive',
      });
      return;
    }
    if (cities.some((city) => city.value === value)) {
      toast({
        title: 'City exists',
        description: 'This city already exists in the list.',
        variant: 'destructive',
      });
      return;
    }

    const nextCity = { label, value };
    setCities((prev) => [...prev, nextCity]);
    setMappings((prev) => ({ ...prev, [value]: newCityRegion }));
    setNewCityLabel('');
  };

  const handleSave = async () => {
    setSaving(true);
    const result = await setRegionMappings({
      mappings,
      cities,
    });
    setSaving(false);
    if (!result.success) {
      toast({
        title: 'Error',
        description: result.error || 'Failed to save mappings',
        variant: 'destructive',
      });
      return;
    }
    toast({
      title: 'Region mappings saved',
      description: 'Intake city mapping updates are now active for consent candidate processing.',
    });
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPinned className="h-5 w-5" />
            Region Configuration
          </CardTitle>
          <CardDescription>Loading current city-to-region mapping...</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading configuration
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPinned className="h-5 w-5" />
          Region Configuration
        </CardTitle>
        <CardDescription>
          Adjust which intake cities map to each SCAGO region. Changes apply to consent candidate mapping and future
          patient creation from intake conversions.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertDescription>
            Current region access policy mode: <strong>{policyMode}</strong>. Cities left unmapped resolve to{' '}
            <strong>Unknown</strong>, and Unknown visibility follows your policy mode rules.
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {EDITABLE_REGIONS.map((region) => (
            <div key={region} className="rounded-md border p-3 space-y-3">
              <div className="flex items-center justify-between">
                <p className="font-medium">{region}</p>
                <Badge variant="secondary">{groupedByRegion.get(region)?.length || 0} cities</Badge>
              </div>
              {(groupedByRegion.get(region) || []).length === 0 ? (
                <p className="text-xs text-muted-foreground">No cities assigned.</p>
              ) : (
                <div className="space-y-2">
                  {(groupedByRegion.get(region) || []).map((city) => (
                    <div key={city.value} className="flex items-center gap-2">
                      <Badge variant="outline" className="min-w-[140px] justify-start">
                        {city.label}
                      </Badge>
                      <Select
                        value={mappings[city.value]}
                        onValueChange={(next) => handleAssignRegion(city.value, next as EditableRegion | 'unmapped')}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {EDITABLE_REGIONS.map((target) => (
                            <SelectItem key={target} value={target}>
                              {target}
                            </SelectItem>
                          ))}
                          <SelectItem value="unmapped">Unmapped (Unknown)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="rounded-md border p-3 space-y-3">
          <p className="font-medium">Unmapped Cities (Resolve to Unknown)</p>
          {unmappedCities.length === 0 ? (
            <p className="text-xs text-muted-foreground">All configured cities are currently mapped.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {unmappedCities.map((city) => (
                <div key={city.value} className="flex items-center gap-2 rounded-md border px-2 py-1">
                  <span className="text-xs">{city.label}</span>
                  <Select
                    onValueChange={(value) => handleAssignRegion(city.value, value as EditableRegion)}
                  >
                    <SelectTrigger className="h-7 min-w-[120px]">
                      <SelectValue placeholder="Assign region" />
                    </SelectTrigger>
                    <SelectContent>
                      {EDITABLE_REGIONS.map((target) => (
                        <SelectItem key={target} value={target}>
                          {target}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-md border p-3 space-y-3">
          <p className="font-medium">Add City</p>
          <div className="grid grid-cols-1 md:grid-cols-[1fr_220px_auto] gap-2">
            <div className="space-y-1">
              <Label htmlFor="new-city-label">City label</Label>
              <Input
                id="new-city-label"
                value={newCityLabel}
                onChange={(e) => setNewCityLabel(e.target.value)}
                placeholder="e.g. Peterborough"
              />
            </div>
            <div className="space-y-1">
              <Label>Default region</Label>
              <Select value={newCityRegion} onValueChange={(value) => setNewCityRegion(value as EditableRegion)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EDITABLE_REGIONS.map((target) => (
                    <SelectItem key={target} value={target}>
                      {target}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button type="button" onClick={handleAddCity} disabled={!newCityLabel.trim()}>
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            The city value is auto-generated from the label (slug format) and saved to region mapping config.
          </p>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Save Region Configuration
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
