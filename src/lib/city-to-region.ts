/**
 * SCAGO city-to-region mapping for Ontario.
 * Regions: GTA, Hamilton-Wentworth, East, West, North, Unknown
 *
 * - East: Southeastern Ontario – Ottawa, Kingston, and environs
 * - West: Southwestern – London, Bruce Peninsula to Lake Erie, Guelph to Windsor
 * - North: Northern Ontario – Sudbury, Thunder Bay, North Bay, Sault Ste Marie, etc.
 * - GTA: West to Oakville, East to Trenton, North to Huntsville, South to Lake Ontario
 * - Hamilton-Wentworth: Hamilton and area
 */

import type { Patient } from '@/types/patient';

export type SCAGORegion = Patient['region'];
export type CityToRegionMap = Record<string, SCAGORegion>;

// Normalize city value from intake (may be {selection, other} or string)
export function normalizeCityValue(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') return value.trim().toLowerCase();
  if (typeof value === 'object' && value !== null && 'selection' in value) {
    const obj = value as { selection?: string; other?: string };
    const sel = obj.selection;
    if (sel === 'other' && obj.other) return obj.other.trim().toLowerCase();
    if (sel) return sel.trim().toLowerCase();
  }
  return '';
}

// City value (from city-on) to SCAGO region. Handles both label and value formats.
export const DEFAULT_CITY_TO_REGION: CityToRegionMap = {
  // East – Ottawa, Kingston, environs
  ottawa: 'East',
  kingston: 'East',
  'st-catharines': 'East', // Niagara – east of Hamilton
  'niagara-falls': 'East',

  // Hamilton-Wentworth
  hamilton: 'Hamilton-Wentworth',

  // West – London, Windsor, Guelph, Kitchener, etc.
  london: 'West',
  windsor: 'West',
  guelph: 'West',
  kitchener: 'West',
  cambridge: 'West',
  waterloo: 'West',

  // North – Sudbury, Thunder Bay, North Bay, Sault Ste Marie, etc.
  'greater-sudbury': 'North',
  sudbury: 'North',
  'thunder-bay': 'North',
  'north-bay': 'North',
  'sault-ste-marie': 'North',
  'sault-st-marie': 'North',

  // GTA – Toronto, Mississauga, Brampton, Oakville, Markham, Vaughan, Durham, etc.
  toronto: 'GTA',
  mississauga: 'GTA',
  brampton: 'GTA',
  markham: 'GTA',
  vaughan: 'GTA',
  'richmond-hill': 'GTA',
  oakville: 'GTA',
  burlington: 'GTA',
  oshawa: 'GTA',
  ajax: 'GTA',
  pickering: 'GTA',
  barrie: 'GTA',
};

function resolveRegionWithMappings(city: unknown, mappings: CityToRegionMap): SCAGORegion {
  const normalized = normalizeCityValue(city);
  if (!normalized) return 'Unknown';
  const region = mappings[normalized];
  if (region) return region;
  // Handle "other" with custom value – could be in various formats
  if (normalized === 'other') return 'Unknown';
  return 'Unknown';
}

export function resolveRegionFromCity(city: unknown): SCAGORegion {
  return resolveRegionWithMappings(city, DEFAULT_CITY_TO_REGION);
}

export async function resolveRegionFromCityAsync(
  city: unknown,
  overrideMap?: Partial<Record<string, SCAGORegion>>
): Promise<SCAGORegion> {
  if (!overrideMap) return resolveRegionFromCity(city);
  const mergedMap: CityToRegionMap = { ...DEFAULT_CITY_TO_REGION };
  Object.entries(overrideMap).forEach(([key, value]) => {
    if (value) mergedMap[key] = value;
  });
  return resolveRegionWithMappings(city, mergedMap);
}
