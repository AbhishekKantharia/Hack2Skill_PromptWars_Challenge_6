import { describe, expect, it } from 'vitest';
import {
  aqiTextColor,
  buildShareUrl,
  coordinateLabel,
  formatTimestamp,
  getDialogTitle,
  riskMessage,
  riskPercentFor,
  statusMessage,
  valueOrDash,
} from '@/components/airindx/format';
import {
  parseAirIndxMarkersResponse,
  parseFrequencies,
  validateAlertOrder,
} from '@/lib/validation';
import { safeEqual } from '@/lib/security';
import { SUSTAINABILITY_ACTIONS } from '@/lib/calculations';
import { DEFAULT_USER_SETTINGS } from '@/lib/demo-data';
import type { AirIndxMarker } from '@/types/airindx';

const marker: AirIndxMarker = {
  id: 'jakarta',
  name: 'Jakarta',
  country: 'Indonesia',
  countryCode: 'ID',
  timezone: 'Asia/Jakarta',
  lat: -6.2,
  lon: 106.8,
  aqi: 156,
  category: 'Unhealthy',
  colorHex: '#ef4444',
  dominantPollutant: 'PM2.5',
  temperatureC: 30,
  humidityPct: 70,
  windSpeedKmh: 12,
  dataMode: 'live',
  sourceName: 'Open-Meteo CAMS',
  sourceUrl: 'https://air-quality.open-meteo.com/v1/forecast?latitude=-6.2',
  timestamp: '2026-11-27T10:00:00Z',
};

function validPayload() {
  return {
    markers: [{ ...marker }],
    dataMode: 'live',
    degraded: false,
    fetchedAt: '2026-11-27T10:01:00Z',
  };
}

describe('AirIndx pure helpers', () => {
  it('formats values and coordinates safely', () => {
    expect(valueOrDash(null, '%')).toBe('N/A');
    expect(valueOrDash(42, '%')).toBe('42%');
    expect(coordinateLabel(marker)).toBe('6.20° S / 106.80° E');
    expect(coordinateLabel(null)).toBe('— / —');
  });

  it('computes and explains the presentation-only risk indicator', () => {
    expect(riskPercentFor(marker)).toBe(52);
    expect(riskPercentFor(null)).toBe(0);
    expect(riskMessage(20)).toContain('Lower pollution pressure');
    expect(riskMessage(50)).toContain('Moderate pollution pressure');
    expect(riskMessage(80)).toContain('Elevated pollution pressure');
  });

  it('chooses readable badge text colors', () => {
    expect(aqiTextColor('#8B5CF6')).toBe('#ffffff');
    expect(aqiTextColor('#991B1B')).toBe('#ffffff');
    expect(aqiTextColor('#EF4444')).toBe('#071022');
  });

  it('formats timestamps and falls back for invalid input', () => {
    expect(formatTimestamp('invalid', 'Asia/Jakarta')).toBe('Time unavailable');
    expect(formatTimestamp(marker.timestamp, 'Invalid/Zone')).not.toBe('Time unavailable');
  });

  it('maps dialog titles and status messages', () => {
    expect(getDialogTitle('about', null)).toBe('About AirIndx');
    expect(getDialogTitle('technology', null)).toBe('Technology & data sources');
    expect(getDialogTitle('monitors', null)).toBe('Global monitor network');
    expect(getDialogTitle('discover', null)).toBe('Discover air-quality patterns');
    expect(getDialogTitle('risk', null)).toBe('How the pollution risk indicator works');
    expect(getDialogTitle('location', marker)).toBe('Jakarta air quality details');
    expect(statusMessage(marker, 'live', false)).toContain('live CAMS feed');
    expect(statusMessage(marker, 'live', true)).toContain('sample data');
    expect(statusMessage(null, 'demo', false)).toBe('No global readings are available.');
  });

  it('builds encoded share URLs and rejects non-http URLs', () => {
    const url = 'https://example.com/airindx?city=Jakarta&aqi=156';
    expect(buildShareUrl('x', url, 'Clean air')).toContain('twitter.com/intent/tweet');
    expect(buildShareUrl('facebook', url, 'Clean air')).toContain('u=https%3A%2F%2Fexample.com');
    expect(buildShareUrl('whatsapp', url, 'Clean air')).toContain('api.whatsapp.com/send');
    expect(buildShareUrl('x', 'javascript:alert(1)', 'Clean air')).toBeNull();
  });
});

describe('AirIndx response validation', () => {
  it('accepts a well-formed response with allowlisted sources', () => {
    expect(parseAirIndxMarkersResponse(validPayload())).toEqual(validPayload());
  });

  it('rejects disallowed source hosts', () => {
    const payload = validPayload();
    payload.markers[0].sourceUrl = 'https://evil.example/collect?city=Jakarta';
    expect(parseAirIndxMarkersResponse(payload)).toBeNull();
  });

  it('rejects unsafe colors, coordinates, and oversized marker lists', () => {
    const badColor = validPayload();
    badColor.markers[0].colorHex = 'red';
    expect(parseAirIndxMarkersResponse(badColor)).toBeNull();

    const badCoordinate = validPayload();
    badCoordinate.markers[0].lat = 999;
    expect(parseAirIndxMarkersResponse(badCoordinate)).toBeNull();

    const oversized = validPayload();
    oversized.markers = Array.from({ length: 65 }, () => marker);
    expect(parseAirIndxMarkersResponse(oversized)).toBeNull();
  });

  it('accepts nullable weather values and defaults invalid timezones', () => {
    const payload = validPayload();
    payload.markers[0] = {
      ...marker,
      timezone: 'Not/AZone',
      temperatureC: null,
      humidityPct: null,
      windSpeedKmh: null,
    };
    const parsed = parseAirIndxMarkersResponse(payload);
    expect(parsed?.markers[0].timezone).toBe('UTC');
    expect(parsed?.markers[0].temperatureC).toBeNull();
  });
});

describe('Validation and security helpers', () => {
  it('validates alert ordering', () => {
    expect(validateAlertOrder(DEFAULT_USER_SETTINGS.alerts)).toBe(true);
    expect(
      validateAlertOrder({
        ...DEFAULT_USER_SETTINGS.alerts,
        severeAqiThreshold: DEFAULT_USER_SETTINGS.alerts.highAqiThreshold,
      })
    ).toBe(false);
  });

  it('ignores string frequencies and clamps valid numeric values', () => {
    const id = SUSTAINABILITY_ACTIONS[0].id;
    expect(parseFrequencies({ [id]: '7' })).toEqual({});
    expect(parseFrequencies({ [id]: 999 })).toEqual({
      [id]: SUSTAINABILITY_ACTIONS[0].maxFrequency,
    });
  });

  it('compares secrets in constant time regardless of input length', () => {
    expect(safeEqual('preview-token', 'preview-token')).toBe(true);
    expect(safeEqual('a', 'aaaaaaaaaaaaaaaa')).toBe(false);
    expect(safeEqual('preview-token', 'preview-token!')).toBe(false);
    expect(safeEqual(null, 'preview-token')).toBe(false);
  });
});
