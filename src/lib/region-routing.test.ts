import { describe, it, expect } from 'vitest';
import { citiesByRegion, regionForCity, resolveNotificationRecipients } from './region-routing';

const cityToRegion = { toronto: 'GTA', mississauga: 'GTA', hamilton: 'Hamilton-Wentworth', ottawa: 'East' };
const routing = {
  enabled: true,
  sourceFieldId: 'city',
  routes: { GTA: ['gta@scago.ca', 'lead@scago.ca'], East: ['east@scago.ca'] },
};
const main = ['tech@scago.ca'];

describe('regionForCity', () => {
  it('maps a city answer (slug or {selection}) to its region', () => {
    expect(regionForCity({ selection: 'toronto' }, cityToRegion)).toBe('GTA');
    expect(regionForCity('Hamilton', cityToRegion)).toBe('Hamilton-Wentworth');
  });
  it('treats unmapped, free-text and missing cities as Unknown', () => {
    expect(regionForCity({ selection: 'other', other: 'Montreal' }, cityToRegion)).toBe('Unknown');
    expect(regionForCity({ selection: 'kenora' }, cityToRegion)).toBe('Unknown');
    expect(regionForCity(undefined, cityToRegion)).toBe('Unknown');
  });
});

describe('resolveNotificationRecipients', () => {
  it('sends to the main recipients when routing is off', () => {
    expect(resolveNotificationRecipients({ mainRecipients: main, routing: { ...routing, enabled: false }, submission: { city: { selection: 'toronto' } }, cityToRegion }))
      .toEqual({ recipients: main, routedToRegion: false });
  });

  it('adds the region contacts to the main recipients by default', () => {
    const d = resolveNotificationRecipients({ mainRecipients: main, routing, submission: { city: { selection: 'toronto' } }, cityToRegion });
    expect(d).toEqual({ recipients: ['tech@scago.ca', 'gta@scago.ca', 'lead@scago.ca'], region: 'GTA', routedToRegion: true });
  });

  it('sends only to the region when the main list opts out', () => {
    const d = resolveNotificationRecipients({ mainRecipients: main, routing: { ...routing, alwaysNotifyMain: false }, submission: { city: { selection: 'ottawa' } }, cityToRegion });
    expect(d.recipients).toEqual(['east@scago.ca']);
  });

  it('falls back to the main recipients when the region has no contacts or the city is unknown', () => {
    const opts = { ...routing, alwaysNotifyMain: false };
    expect(resolveNotificationRecipients({ mainRecipients: main, routing: opts, submission: { city: { selection: 'hamilton' } }, cityToRegion }))
      .toEqual({ recipients: main, region: 'Hamilton-Wentworth', routedToRegion: false });
    expect(resolveNotificationRecipients({ mainRecipients: main, routing: opts, submission: {}, cityToRegion }).recipients).toEqual(main);
  });

  it('removes duplicate addresses regardless of case', () => {
    const d = resolveNotificationRecipients({ mainRecipients: ['GTA@scago.ca'], routing, submission: { city: { selection: 'toronto' } }, cityToRegion });
    expect(d.recipients).toEqual(['GTA@scago.ca', 'lead@scago.ca']);
  });
});

describe('specific areas', () => {
  const map = { ...cityToRegion, windsor: 'West', london: 'West', essex: 'West' };
  const withArea = {
    ...routing,
    routes: { ...routing.routes, West: ['swo@scago.ca'] },
    areaRoutes: [{ name: 'Windsor-Essex', cities: ['windsor', 'essex'], emails: ['windsor@scago.ca'] }],
  };

  it("sends an area's cities to the area contact instead of the region's", () => {
    const d = resolveNotificationRecipients({ mainRecipients: main, routing: withArea, submission: { city: { selection: 'windsor' } }, cityToRegion: map });
    expect(d).toEqual({ recipients: ['tech@scago.ca', 'windsor@scago.ca'], region: 'West', area: 'Windsor-Essex', routedToRegion: true });
  });

  it("sends the region's other cities to the region contact", () => {
    const d = resolveNotificationRecipients({ mainRecipients: main, routing: withArea, submission: { city: { selection: 'london' } }, cityToRegion: map });
    expect(d).toEqual({ recipients: ['tech@scago.ca', 'swo@scago.ca'], region: 'West', routedToRegion: true });
  });

  it('ignores an area with no contacts', () => {
    const empty = { ...withArea, areaRoutes: [{ name: 'Windsor-Essex', cities: ['windsor'], emails: [] }] };
    const d = resolveNotificationRecipients({ mainRecipients: main, routing: empty, submission: { city: { selection: 'windsor' } }, cityToRegion: map });
    expect(d.recipients).toEqual(['tech@scago.ca', 'swo@scago.ca']);
    expect(d.area).toBeUndefined();
  });
});

describe('citiesByRegion', () => {
  it('groups cities under their region, sorted', () => {
    expect(citiesByRegion(cityToRegion)).toEqual({ GTA: ['mississauga', 'toronto'], 'Hamilton-Wentworth': ['hamilton'], East: ['ottawa'] });
  });
});
