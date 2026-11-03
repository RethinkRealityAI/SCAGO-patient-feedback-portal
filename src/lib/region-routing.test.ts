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

describe('citiesByRegion', () => {
  it('groups cities under their region, sorted', () => {
    expect(citiesByRegion(cityToRegion)).toEqual({ GTA: ['mississauga', 'toronto'], 'Hamilton-Wentworth': ['hamilton'], East: ['ottawa'] });
  });
});
