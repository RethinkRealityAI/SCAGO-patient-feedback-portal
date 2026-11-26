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
//
// Every city in the form's City (Ontario) list is assigned here, so nearby towns
// count toward the region of the closest Regional Lead (e.g. Kitchener-Waterloo
// and Guelph toward London / Southwestern Ontario). These are the built-in
// defaults: once an admin saves Settings > Regions, the saved mapping is used,
// and "Use suggested regions" there fills any city it leaves unassigned from
// this list. Windsor-Essex sits inside West; forms send it to the Windsor lead
// through a "Specific area" in their regional routing.
export const DEFAULT_CITY_TO_REGION: CityToRegionMap = {
  // GTA – west to Oakville/Milton, east to Trenton, north to Huntsville
  toronto: 'GTA',
  mississauga: 'GTA',
  brampton: 'GTA',
  markham: 'GTA',
  vaughan: 'GTA',
  'richmond-hill': 'GTA',
  oakville: 'GTA',
  burlington: 'GTA',
  milton: 'GTA',
  oshawa: 'GTA',
  whitby: 'GTA',
  ajax: 'GTA',
  pickering: 'GTA',
  newmarket: 'GTA',
  aurora: 'GTA',
  'king-city': 'GTA',
  georgina: 'GTA',
  'bradford-west-gwillimbury': 'GTA',
  barrie: 'GTA',
  orillia: 'GTA',
  peterborough: 'GTA',
  'kawartha-lakes': 'GTA',

  // Hamilton-Wentworth – Hamilton, its former municipalities, Niagara, Brant,
  // Haldimand and Norfolk
  hamilton: 'Hamilton-Wentworth',
  'stoney-creek': 'Hamilton-Wentworth',
  ancaster: 'Hamilton-Wentworth',
  dundas: 'Hamilton-Wentworth',
  flamborough: 'Hamilton-Wentworth',
  grimsby: 'Hamilton-Wentworth',
  lincoln: 'Hamilton-Wentworth',
  'st-catharines': 'Hamilton-Wentworth',
  'niagara-falls': 'Hamilton-Wentworth',
  welland: 'Hamilton-Wentworth',
  thorold: 'Hamilton-Wentworth',
  'port-colborne': 'Hamilton-Wentworth',
  'fort-erie': 'Hamilton-Wentworth',
  brantford: 'Hamilton-Wentworth',
  brant: 'Hamilton-Wentworth',
  'haldimand-county': 'Hamilton-Wentworth',
  'norfolk-county': 'Hamilton-Wentworth',

  // East – Ottawa, Kingston, and environs
  ottawa: 'East',
  'clarence-rockland': 'East',
  'carleton-place': 'East',
  arnprior: 'East',
  renfrew: 'East',
  pembroke: 'East',
  'smiths-falls': 'East',
  cornwall: 'East',
  prescott: 'East',
  brockville: 'East',
  gananoque: 'East',
  kingston: 'East',
  belleville: 'East',
  'quinte-west': 'East',
  'prince-edward-county': 'East',

  // West – London and Southwestern Ontario, Kitchener-Waterloo, Guelph,
  // Bruce/Grey to Lake Erie, and Windsor-Essex
  london: 'West',
  'st-thomas': 'West',
  woodstock: 'West',
  tillsonburg: 'West',
  stratford: 'West',
  'st-marys': 'West',
  kitchener: 'West',
  waterloo: 'West',
  cambridge: 'West',
  guelph: 'West',
  sarnia: 'West',
  'lambton-shores': 'West',
  'owen-sound': 'West',
  'chatham-kent': 'West',
  windsor: 'West',
  essex: 'West',
  leamington: 'West',
  amherstburg: 'West',
  tecumseh: 'West',

  // North – Sudbury, Thunder Bay, North Bay, Sault Ste Marie, etc.
  'greater-sudbury': 'North',
  sudbury: 'North',
  'north-bay': 'North',
  'parry-sound': 'North',
  temagami: 'North',
  'temiskaming-shores': 'North',
  'elliot-lake': 'North',
  'sault-ste-marie': 'North',
  'sault-st-marie': 'North',
  timmins: 'North',
  cochrane: 'North',
  kapuskasing: 'North',
  hearst: 'North',
  'thunder-bay': 'North',
  kenora: 'North',
  dryden: 'North',
  'sioux-lookout': 'North',
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
