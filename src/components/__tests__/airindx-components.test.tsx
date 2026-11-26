// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, cleanup } from '@testing-library/react';
import axe from 'axe-core';
import { AirIndxDialog } from '@/components/airindx/AirIndxDialog';
import { AirIndxNav } from '@/components/airindx/AirIndxNav';
import { AirIndxStats } from '@/components/airindx/AirIndxStats';
import {
  AirIndxMarkerShortcuts,
  AirIndxStatusBadges,
  AirIndxViewControls,
} from '@/components/airindx/AirIndxControls';
import { useAirIndxData } from '@/components/airindx/hooks/useAirIndxData';
import { renderHook } from '@testing-library/react';
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

function payload() {
  return {
    markers: [{ ...marker }],
    dataMode: 'live',
    degraded: false,
    fetchedAt: '2026-11-27T10:01:00Z',
  };
}

async function expectNoAxeViolations(container: HTMLElement) {
  const results = await axe.run(container, {
    rules: {
      'color-contrast': { enabled: false },
      region: { enabled: false },
    },
  });
  expect(results.violations.map((violation) => violation.id)).toEqual([]);
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('AirIndx component accessibility and interactions', () => {
  it('exposes mobile navigation state and closes on Escape', () => {
    const onToggleMobile = vi.fn();
    const onCloseMobile = vi.fn();
    const onNavigate = vi.fn();
    const { container } = render(
      <AirIndxNav
        mobileOpen
        onToggleMobile={onToggleMobile}
        onCloseMobile={onCloseMobile}
        onNavigate={onNavigate}
      />
    );

    const toggle = screen.getByRole('button', { name: 'Close navigation' });
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(toggle.getAttribute('aria-controls')).toBe('airindx-mobile-nav');
    expect(document.getElementById('airindx-mobile-nav')).not.toBeNull();

    fireEvent.click(screen.getAllByRole('button', { name: 'About' })[0]);
    expect(onNavigate).toHaveBeenCalledWith('about');
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onCloseMobile).toHaveBeenCalledTimes(1);
    fireEvent.click(toggle);
    expect(onToggleMobile).toHaveBeenCalledTimes(1);
    return expectNoAxeViolations(container);
  });

  it('reports view and control state accessibly', () => {
    const onViewChange = vi.fn();
    const onZoom = vi.fn();
    const onToggleRotation = vi.fn();
    const { container } = render(
      <AirIndxViewControls
        viewMode="globe"
        onViewChange={onViewChange}
        onZoom={onZoom}
        rotationPaused={false}
        onToggleRotation={onToggleRotation}
      />
    );

    expect(screen.getByRole('button', { name: '3D GLOBE' }).getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: 'IQ AIR MAP' }));
    expect(onViewChange).toHaveBeenCalledWith('map');
    fireEvent.click(screen.getByRole('button', { name: 'Zoom in on globe' }));
    expect(onZoom).toHaveBeenCalledWith(1);
    fireEvent.click(screen.getByRole('button', { name: 'Pause globe rotation' }));
    expect(onToggleRotation).toHaveBeenCalledTimes(1);
    return expectNoAxeViolations(container);
  });

  it('focuses the dialog, traps Escape, and selects markers', () => {
    const onClose = vi.fn();
    const onSelectMarker = vi.fn();
    render(
      <AirIndxDialog
        kind="monitors"
        markers={[marker]}
        selectedMarker={marker}
        riskPercent={52}
        onSelectMarker={onSelectMarker}
        onClose={onClose}
      />
    );

    const dialog = screen.getByRole('dialog', { name: 'Global monitor network' });
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Close dialog' }));

    fireEvent.click(screen.getByRole('button', { name: /Jakarta/ }));
    expect(onSelectMarker).toHaveBeenCalledWith('jakarta');
    expect(onClose).toHaveBeenCalledTimes(1);

    cleanup();
    const second = render(
      <AirIndxDialog
        kind="about"
        markers={[marker]}
        selectedMarker={marker}
        riskPercent={52}
        onSelectMarker={onSelectMarker}
        onClose={onClose}
      />
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(2);
    return expectNoAxeViolations(second.container);
  });

  it('renders statistics and share actions accessibly', () => {
    const onRiskDetails = vi.fn();
    const onShare = vi.fn();
    const { container } = render(
      <AirIndxStats marker={marker} onRiskDetails={onRiskDetails} onShare={onShare} />
    );

    expect(screen.getByText('156')).toBeTruthy();
    expect(screen.getByText('52%')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Details' }));
    expect(onRiskDetails).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Share on X' }));
    expect(onShare).toHaveBeenCalledWith('x');
    return expectNoAxeViolations(container);
  });

  it('labels data mode and keyboard location shortcuts', () => {
    const onSelect = vi.fn();
    const { container } = render(
      <>
        <AirIndxStatusBadges dataMode="live" degraded markerCount={1} />
        <AirIndxMarkerShortcuts markers={[marker]} selectedId="jakarta" onSelect={onSelect} />
      </>
    );

    expect(screen.getByText('SAMPLE DATA')).toBeTruthy();
    expect(screen.getByText(/Showing labeled sample data/)).toBeTruthy();
    const shortcut = screen.getByRole('button', { name: /Select Jakarta/ });
    expect(shortcut.getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(shortcut);
    expect(onSelect).toHaveBeenCalledWith('jakarta');
    return expectNoAxeViolations(container);
  });
});

describe('useAirIndxData', () => {
  it('loads validated readings without storing an abort as an error', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => payload(),
    });
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useAirIndxData());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBeNull();
    expect(result.current.data.markers[0].name).toBe('Jakarta');
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/airindx/markers',
      expect.objectContaining({ cache: 'no-store' })
    );
  });

  it('surfaces failures and clears them on retry', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false })
      .mockResolvedValueOnce({ ok: true, json: async () => payload() });
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useAirIndxData());
    await waitFor(() => expect(result.current.error).not.toBeNull());

    result.current.retry();
    await waitFor(() => expect(result.current.data.markers).toHaveLength(1));
    expect(result.current.error).toBeNull();
  });
});
