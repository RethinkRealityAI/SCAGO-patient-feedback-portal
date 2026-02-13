'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Loader2, MapPinned, Plus, Search, ArrowRight, CheckSquare, Square, Pencil, Trash2, Save, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  getRegionAccessPolicy,
  getRegionMappings,
  setRegionMappings,
  getRegions,
  setRegions,
  type RegionCityOption,
} from '@/app/admin/user-actions';
import { ontarioCities } from '@/lib/location-data';
import { getRegionDisplayLabel } from '@/types/patient';

type MappingState = Record<string, string>;

/** Per-region bulk-move selection state */
type RegionMoveState = Record<string, {
  selected: Set<string>;
  targetRegion: string | null;
}>;

function slugifyCity(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** All Ontario cities for the dropdown (excludes "other") */
const ONTARIO_CITIES_FOR_REGION: RegionCityOption[] = ontarioCities
  .filter((c) => c.value !== 'other')
  .map((c) => ({ label: c.label, value: slugifyCity(c.value || c.label) }))
  .sort((a, b) => a.label.localeCompare(b.label));

export function RegionConfigEditor() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [policyMode, setPolicyMode] = useState<'legacy' | 'strict'>('legacy');
  const [regions, setRegionsState] = useState<string[]>([]);
  const [cities, setCities] = useState<RegionCityOption[]>([]);
  const [mappings, setMappings] = useState<MappingState>({});
  const [newCityLabel, setNewCityLabel] = useState('');
  const [newCityRegion, setNewCityRegion] = useState<string>('GTA');

  // Track unsaved changes
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Region management state
  const [newRegionName, setNewRegionName] = useState('');
  const [editingRegion, setEditingRegion] = useState<string | null>(null);
  const [editingRegionValue, setEditingRegionValue] = useState('');

  // Bulk add state
  const [bulkAddOpen, setBulkAddOpen] = useState(false);
  const [bulkAddSearch, setBulkAddSearch] = useState('');
  const [bulkAddSelected, setBulkAddSelected] = useState<Set<string>>(new Set());
  const [bulkAddTargetRegion, setBulkAddTargetRegion] = useState<string>('GTA');

  // Per-region bulk move state (scoped to each region card)
  const [regionMoveState, setRegionMoveState] = useState<RegionMoveState>({});

  const editableRegions = useMemo(() => regions.filter((r) => r !== 'Unknown'), [regions]);

  // Mark changes any time regions or mappings change (after initial load)
  const markDirty = useCallback(() => {
    if (!loading) setHasUnsavedChanges(true);
  }, [loading]);

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
          return [[city, region]];
        })
      ) as MappingState;

      setMappings(normalizedMappings);
      setCities(mappingsRes.cities);
      const regionList = mappingsRes.regions || [];
      setRegionsState(regionList);
      const firstEditable = regionList.filter((r) => r !== 'Unknown')[0];
      if (firstEditable) {
        setNewCityRegion(firstEditable);
        setBulkAddTargetRegion(firstEditable);
      }
      setLoading(false);
      setHasUnsavedChanges(false);
    };

    load();
  }, [toast]);

  const cityIndex = useMemo(() => new Map(cities.map((city) => [city.value, city])), [cities]);

  // Merge stored cities with Ontario list so dropdown always has full set
  const allCitiesForDropdown = useMemo(() => {
    const byValue = new Map<string, RegionCityOption>();
    ONTARIO_CITIES_FOR_REGION.forEach((c) => byValue.set(c.value, c));
    cities.forEach((c) => byValue.set(c.value, c));
    return Array.from(byValue.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [cities]);

  const groupedByRegion = useMemo(() => {
    const grouped = new Map<string, RegionCityOption[]>();
    editableRegions.forEach((region) => grouped.set(region, []));
    Object.entries(mappings).forEach(([citySlug, region]) => {
      const city = cityIndex.get(citySlug) ?? allCitiesForDropdown.find((c) => c.value === citySlug);
      if (!city) return;
      grouped.get(region)?.push(city);
    });
    editableRegions.forEach((region) => {
      const rows = grouped.get(region) || [];
      rows.sort((a, b) => a.label.localeCompare(b.label));
      grouped.set(region, rows);
    });
    return grouped;
  }, [cityIndex, mappings, allCitiesForDropdown, editableRegions]);

  const unmappedCities = useMemo(() => {
    const mappedKeys = new Set(Object.keys(mappings));
    return allCitiesForDropdown
      .filter((city) => !mappedKeys.has(city.value))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [allCitiesForDropdown, mappings]);

  const filteredCitiesForBulkAdd = useMemo(() => {
    const q = bulkAddSearch.trim().toLowerCase();
    if (!q) return allCitiesForDropdown;
    return allCitiesForDropdown.filter(
      (c) =>
        c.label.toLowerCase().includes(q) ||
        c.value.toLowerCase().includes(q)
    );
  }, [allCitiesForDropdown, bulkAddSearch]);

  // --- Per-region move helpers ---
  const getRegionMove = (region: string) =>
    regionMoveState[region] ?? { selected: new Set<string>(), targetRegion: null };

  const toggleRegionMoveSelection = (region: string, cityValue: string) => {
    setRegionMoveState((prev) => {
      const current = prev[region] ?? { selected: new Set<string>(), targetRegion: null };
      const next = new Set(current.selected);
      if (next.has(cityValue)) next.delete(cityValue);
      else next.add(cityValue);
      return { ...prev, [region]: { ...current, selected: next } };
    });
  };

  const setRegionMoveTarget = (region: string, target: string) => {
    setRegionMoveState((prev) => {
      const current = prev[region] ?? { selected: new Set<string>(), targetRegion: null };
      return { ...prev, [region]: { ...current, targetRegion: target } };
    });
  };

  const clearRegionMoveState = (region: string) => {
    setRegionMoveState((prev) => {
      const next = { ...prev };
      delete next[region];
      return next;
    });
  };

  const handleBulkMoveForRegion = (sourceRegion: string) => {
    const state = getRegionMove(sourceRegion);
    if (state.selected.size === 0 || !state.targetRegion) return;
    const toMove = Array.from(state.selected);
    const target = state.targetRegion;
    setMappings((prev) => {
      const next = { ...prev };
      toMove.forEach((cityValue) => {
        next[cityValue] = target;
      });
      return next;
    });
    clearRegionMoveState(sourceRegion);
    markDirty();
    toast({
      title: 'Cities moved',
      description: `${toMove.length} city${toMove.length > 1 ? 'ies' : ''} moved to ${target}.`,
    });
  };

  // --- Standard handlers ---
  const handleAssignRegion = (cityValue: string, nextRegion: string | 'unmapped') => {
    setMappings((prev) => {
      if (nextRegion === 'unmapped') {
        const { [cityValue]: _removed, ...rest } = prev;
        return rest;
      }
      return { ...prev, [cityValue]: nextRegion };
    });
    markDirty();
  };

  const handleBulkAddToRegion = () => {
    if (bulkAddSelected.size === 0) return;
    const toAdd = Array.from(bulkAddSelected);
    setMappings((prev) => {
      const next = { ...prev };
      toAdd.forEach((cityValue) => {
        next[cityValue] = bulkAddTargetRegion;
      });
      return next;
    });
    setCities((prev) => {
      const next = new Map(prev.map((c) => [c.value, c]));
      toAdd.forEach((cityValue) => {
        const city = allCitiesForDropdown.find((c) => c.value === cityValue);
        if (city && !next.has(cityValue)) next.set(cityValue, city);
      });
      return Array.from(next.values()).sort((a, b) => a.label.localeCompare(b.label));
    });
    setBulkAddSelected(new Set());
    setBulkAddOpen(false);
    setBulkAddSearch('');
    markDirty();
    toast({
      title: 'Cities added',
      description: `${toAdd.length} city${toAdd.length > 1 ? 'ies' : ''} assigned to ${bulkAddTargetRegion}.`,
    });
  };

  const toggleBulkAddSelection = (cityValue: string) => {
    setBulkAddSelected((prev) => {
      const next = new Set(prev);
      if (next.has(cityValue)) next.delete(cityValue);
      else next.add(cityValue);
      return next;
    });
  };

  const toggleBulkAddSelectAll = () => {
    if (bulkAddSelected.size === filteredCitiesForBulkAdd.length) {
      setBulkAddSelected(new Set());
    } else {
      setBulkAddSelected(new Set(filteredCitiesForBulkAdd.map((c) => c.value)));
    }
  };

  const handleAddRegion = () => {
    const name = newRegionName.trim();
    if (!name) return;
    if (regions.includes(name)) {
      toast({ title: 'Region exists', description: 'This region already exists.', variant: 'destructive' });
      return;
    }
    setRegionsState((prev) => {
      const withoutUnknown = prev.filter((r) => r !== 'Unknown');
      return [...withoutUnknown, name, 'Unknown'];
    });
    setNewRegionName('');
    markDirty();
    toast({ title: 'Region added', description: `"${name}" added. Click Save to persist.` });
  };

  const handleUpdateRegion = (oldName: string, newName: string) => {
    if (oldName === 'Unknown') return;
    const trimmed = newName.trim();
    if (!trimmed || trimmed === oldName) {
      setEditingRegion(null);
      return;
    }
    if (regions.includes(trimmed)) {
      toast({ title: 'Region exists', description: 'Another region with this name already exists.', variant: 'destructive' });
      return;
    }
    setRegionsState((prev) => prev.map((r) => (r === oldName ? trimmed : r)));
    setMappings((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((city) => {
        if (next[city] === oldName) next[city] = trimmed;
      });
      return next;
    });
    setEditingRegion(null);
    markDirty();
    toast({ title: 'Region renamed', description: `"${oldName}" renamed to "${trimmed}". Click Save to persist.` });
  };

  const handleDeleteRegion = (name: string) => {
    if (name === 'Unknown') return;
    const cityCount = Object.values(mappings).filter((r) => r === name).length;
    if (cityCount > 0 && !window.confirm(
      `Delete "${name}"? ${cityCount} city${cityCount > 1 ? 'ies' : ''} will become unmapped (Not assigned region).`
    )) return;
    setRegionsState((prev) => prev.filter((r) => r !== name));
    setMappings((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((city) => {
        if (next[city] === name) delete next[city];
      });
      return next;
    });
    setEditingRegion(null);
    markDirty();
    toast({ title: 'Region removed', description: `"${name}" removed. Click Save to persist.` });
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
    markDirty();
  };

  const citiesToSave = useMemo(() => {
    const byValue = new Map(cities.map((c) => [c.value, c]));
    Object.keys(mappings).forEach((cityValue) => {
      const city = allCitiesForDropdown.find((c) => c.value === cityValue);
      if (city && !byValue.has(cityValue)) byValue.set(cityValue, city);
    });
    return Array.from(byValue.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [cities, mappings, allCitiesForDropdown]);

  const handleSave = async () => {
    setSaving(true);

    // Save regions first
    const regionsResult = await setRegions(regions);
    if (!regionsResult.success) {
      setSaving(false);
      toast({ title: 'Error saving regions', description: regionsResult.error, variant: 'destructive' });
      return;
    }

    // Save mappings (server re-reads regions to validate)
    const mappingsResult = await setRegionMappings({
      mappings,
      cities: citiesToSave,
    });
    setSaving(false);

    if (!mappingsResult.success) {
      // Regions saved but mappings failed — alert user to retry
      toast({
        title: 'Partial save',
        description: 'Regions were saved but city mappings failed. Please try saving again.',
        variant: 'destructive',
      });
      return;
    }

    setHasUnsavedChanges(false);
    toast({
      title: 'Region configuration saved',
      description: 'Regions and city mappings are now active.',
    });
  };

  // Total mapped cities count
  const totalMappedCount = Object.keys(mappings).length;

  if (loading) {
    return (
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <MapPinned className="h-5 w-5 text-primary" />
            </div>
            Region Configuration
          </CardTitle>
          <CardDescription>Loading current city-to-region mapping...</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          Loading configuration
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <MapPinned className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Region Configuration</CardTitle>
              <CardDescription className="mt-1">
                Manage regions and map Ontario cities. Changes apply to consent candidate mapping and patient creation.
              </CardDescription>
            </div>
          </div>
          {hasUnsavedChanges && (
            <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-700 shrink-0">
              <AlertCircle className="h-3 w-3 mr-1" />
              Unsaved changes
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert variant="default" className="border-border/50 bg-muted/30">
          <AlertDescription className="text-sm">
            Policy mode: <strong className="font-semibold">{policyMode}</strong>
            {' '}&middot;{' '}
            <strong>{editableRegions.length}</strong> regions
            {' '}&middot;{' '}
            <strong>{totalMappedCount}</strong> mapped cities
            {' '}&middot;{' '}
            <strong>{unmappedCities.length}</strong> unmapped
          </AlertDescription>
        </Alert>

        {/* Region Management */}
        <div className="rounded-xl border border-border/50 bg-card p-5 space-y-4">
          <div>
            <h3 className="text-sm font-semibold tracking-tight">Regions</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Add, rename, or remove regions. &ldquo;Not assigned region&rdquo; is always present and cannot be removed.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {regions.map((region) => (
              <div
                key={region}
                className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 transition-colors ${
                  region === 'Unknown'
                    ? 'border-dashed border-muted-foreground/30 bg-muted/30'
                    : 'border-border hover:border-primary/30 hover:bg-accent/30'
                }`}
              >
                {editingRegion === region ? (
                  <>
                    <Input
                      value={editingRegionValue}
                      onChange={(e) => setEditingRegionValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleUpdateRegion(region, editingRegionValue);
                        if (e.key === 'Escape') setEditingRegion(null);
                      }}
                      className="h-7 w-36 text-sm"
                      autoFocus
                    />
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-green-600 hover:text-green-700 hover:bg-green-50" onClick={() => handleUpdateRegion(region, editingRegionValue)}>
                      ✓
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEditingRegion(null)}>
                      ✕
                    </Button>
                  </>
                ) : (
                  <>
                    <span className={`text-sm ${region === 'Unknown' ? 'text-muted-foreground italic' : 'font-medium'}`}>{getRegionDisplayLabel(region)}</span>
                    {region !== 'Unknown' && (
                      <Badge variant="secondary" className="text-[10px] ml-1 px-1.5">
                        {(groupedByRegion.get(region) || []).length}
                      </Badge>
                    )}
                    {region !== 'Unknown' && (
                      <div className="flex items-center ml-1 gap-0.5">
                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0 rounded-md" onClick={() => { setEditingRegion(region); setEditingRegionValue(region); }}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0 rounded-md text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDeleteRegion(region)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="New region name..."
              value={newRegionName}
              onChange={(e) => setNewRegionName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddRegion()}
              className="max-w-[220px]"
            />
            <Button size="sm" onClick={handleAddRegion} disabled={!newRegionName.trim()}>
              <Plus className="h-4 w-4 mr-1" />
              Add Region
            </Button>
          </div>
        </div>

        {/* Bulk Add Section */}
        <div className="rounded-xl border border-border/50 bg-card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold tracking-tight">Bulk Add Cities</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Search and multi-select Ontario cities, then assign them to a region.
              </p>
            </div>
            <Popover open={bulkAddOpen} onOpenChange={setBulkAddOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="shrink-0">
                  <Plus className="h-4 w-4 mr-1.5" />
                  Select Cities
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[340px] p-0" align="end">
                <div className="p-3 border-b bg-muted/30">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search Ontario cities..."
                      value={bulkAddSearch}
                      onChange={(e) => setBulkAddSearch(e.target.value)}
                      className="pl-9 h-9"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between px-3 py-2 border-b">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={toggleBulkAddSelectAll}
                  >
                    {bulkAddSelected.size === filteredCitiesForBulkAdd.length ? (
                      <CheckSquare className="h-3.5 w-3.5 mr-1.5" />
                    ) : (
                      <Square className="h-3.5 w-3.5 mr-1.5" />
                    )}
                    {bulkAddSelected.size === filteredCitiesForBulkAdd.length ? 'Deselect all' : 'Select all'}
                  </Button>
                  <Badge variant="secondary" className="text-xs">
                    {bulkAddSelected.size} selected
                  </Badge>
                </div>
                <ScrollArea className="h-[260px]">
                  <div className="p-2 space-y-0.5">
                    {filteredCitiesForBulkAdd.map((city) => (
                      <label
                        key={city.value}
                        className="flex items-center gap-2.5 py-1.5 px-2.5 rounded-lg hover:bg-accent/50 cursor-pointer transition-colors"
                      >
                        <Checkbox
                          checked={bulkAddSelected.has(city.value)}
                          onCheckedChange={() => toggleBulkAddSelection(city.value)}
                        />
                        <span className="text-sm flex-1">{city.label}</span>
                        {mappings[city.value] && (
                          <Badge variant="secondary" className="text-[10px] shrink-0">
                            {mappings[city.value]}
                          </Badge>
                        )}
                      </label>
                    ))}
                    {filteredCitiesForBulkAdd.length === 0 && (
                      <p className="text-xs text-muted-foreground py-6 text-center">No cities match your search</p>
                    )}
                  </div>
                </ScrollArea>
                <div className="p-3 border-t bg-muted/30 flex items-center gap-2">
                  <Select value={bulkAddTargetRegion} onValueChange={(v) => setBulkAddTargetRegion(v)}>
                    <SelectTrigger className="h-9 flex-1">
                      <SelectValue placeholder="Target region" />
                    </SelectTrigger>
                    <SelectContent>
                      {editableRegions.map((r) => (
                        <SelectItem key={r} value={r}>{r}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    onClick={handleBulkAddToRegion}
                    disabled={bulkAddSelected.size === 0}
                    className="shrink-0"
                  >
                    Add {bulkAddSelected.size > 0 ? `(${bulkAddSelected.size})` : ''}
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <Separator />

        {/* Region Cards with Per-Region Bulk Move */}
        <div>
          <h3 className="text-sm font-semibold tracking-tight mb-3">City Assignments by Region</h3>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {editableRegions.map((region) => {
              const regionCities = groupedByRegion.get(region) || [];
              const moveState = getRegionMove(region);
              const selectedCount = regionCities.filter((c) => moveState.selected.has(c.value)).length;
              const hasSelection = selectedCount > 0;
              return (
                <div key={region} className="rounded-xl border border-border/50 p-4 space-y-3 bg-card hover:shadow-sm transition-shadow">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-sm">{region}</p>
                    <Badge variant="secondary" className="text-xs">{regionCities.length} cities</Badge>
                  </div>
                  {regionCities.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic py-2">No cities assigned to this region.</p>
                  ) : (
                    <>
                      {hasSelection && (
                        <div className="flex flex-wrap items-center gap-2 p-2.5 rounded-lg bg-accent/40 border border-accent">
                          <Select
                            value={moveState.targetRegion ?? ''}
                            onValueChange={(v) => setRegionMoveTarget(region, v)}
                          >
                            <SelectTrigger className="h-8 w-[150px]">
                              <SelectValue placeholder="Move to..." />
                            </SelectTrigger>
                            <SelectContent>
                              {editableRegions.filter((r) => r !== region).map((r) => (
                                <SelectItem key={r} value={r}>{r}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            size="sm"
                            variant="default"
                            className="h-8"
                            onClick={() => handleBulkMoveForRegion(region)}
                            disabled={!moveState.targetRegion || moveState.targetRegion === region}
                          >
                            <ArrowRight className="h-3.5 w-3.5 mr-1" />
                            Move {selectedCount}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 text-xs"
                            onClick={() => clearRegionMoveState(region)}
                          >
                            Clear
                          </Button>
                        </div>
                      )}
                      <ScrollArea className="max-h-[220px]">
                        <div className="space-y-1">
                          {regionCities.map((city) => (
                            <div key={city.value} className="flex items-center gap-2 py-1 px-1 rounded-md hover:bg-accent/30 transition-colors">
                              <Checkbox
                                checked={moveState.selected.has(city.value)}
                                onCheckedChange={() => toggleRegionMoveSelection(region, city.value)}
                                id={`move-${region}-${city.value}`}
                              />
                              <label
                                htmlFor={`move-${region}-${city.value}`}
                                className="flex-1 cursor-pointer flex items-center gap-2"
                              >
                                <span className="text-sm">{city.label}</span>
                              </label>
                              <Select
                                value={mappings[city.value]}
                                onValueChange={(next) => handleAssignRegion(city.value, next as string | 'unmapped')}
                              >
                                <SelectTrigger className="h-7 w-[130px] text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {editableRegions.map((target) => (
                                    <SelectItem key={target} value={target}>
                                      {target}
                                    </SelectItem>
                                  ))}
                                  <SelectItem value="unmapped">Unmapped</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Unmapped Cities */}
        {unmappedCities.length > 0 && (
          <>
            <Separator />
            <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20 p-5 space-y-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <p className="font-semibold text-sm">Unmapped Cities ({unmappedCities.length})</p>
              </div>
              <p className="text-xs text-muted-foreground">
                These cities resolve to &ldquo;Not assigned region&rdquo;. Assign them to a region for proper routing.
              </p>
              <div className="flex flex-wrap gap-2">
                {unmappedCities.map((city) => (
                  <div key={city.value} className="flex items-center gap-2 rounded-lg border bg-background px-3 py-1.5">
                    <span className="text-xs font-medium">{city.label}</span>
                    <Select
                      value={mappings[city.value] || ''}
                      onValueChange={(value) => handleAssignRegion(city.value, value)}
                    >
                      <SelectTrigger className="h-7 min-w-[120px] text-xs">
                        <SelectValue placeholder="Assign..." />
                      </SelectTrigger>
                      <SelectContent>
                        {editableRegions.map((target) => (
                          <SelectItem key={target} value={target}>
                            {target}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        <Separator />

        {/* Add Single City */}
        <div className="rounded-xl border border-border/50 bg-card p-5 space-y-3">
          <div>
            <h3 className="text-sm font-semibold tracking-tight">Add Custom City</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Add a city not in the Ontario list. The slug value is auto-generated from the name.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-[1fr_200px_auto] gap-3">
            <div className="space-y-1">
              <Label htmlFor="new-city-label" className="text-xs">City name</Label>
              <Input
                id="new-city-label"
                value={newCityLabel}
                onChange={(e) => setNewCityLabel(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddCity()}
                placeholder="e.g. Peterborough"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Default region</Label>
              <Select value={newCityRegion} onValueChange={(value) => setNewCityRegion(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {editableRegions.map((target) => (
                    <SelectItem key={target} value={target}>
                      {target}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button type="button" onClick={handleAddCity} disabled={!newCityLabel.trim()} variant="secondary">
                <Plus className="h-4 w-4 mr-1" />
                Add City
              </Button>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-muted-foreground">
            {hasUnsavedChanges
              ? 'You have unsaved changes. Click Save to apply.'
              : 'All changes are saved.'}
          </p>
          <Button
            onClick={handleSave}
            disabled={saving || !hasUnsavedChanges}
            size="lg"
            className="min-w-[220px] shadow-lg shadow-primary/10"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {saving ? 'Saving...' : 'Save Region Configuration'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
