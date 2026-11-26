'use client';

import { useEffect, useRef, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import type { AirIndxMarker, ZoomCommand } from '@/types/airindx';

type LeafletModule = typeof import('leaflet');
type LeafletMap = import('leaflet').Map;
type LeafletMarker = import('leaflet').Marker;

interface AirIndxMapProps {
  markers: AirIndxMarker[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  zoomCommand: ZoomCommand;
  active: boolean;
}

interface MarkerRecord {
  marker: LeafletMarker;
  data: AirIndxMarker;
}

const HTML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => HTML_ESCAPES[character] ?? character);
}

function safeColor(colorHex: string): string {
  return /^#[0-9a-f]{6}$/i.test(colorHex) ? colorHex : '#22d3ee';
}

function markerIcon(L: LeafletModule, marker: AirIndxMarker, selected: boolean) {
  const color = safeColor(marker.colorHex);
  const accessibleName = `${escapeHtml(marker.name)}: ${marker.aqi} US AQI, ${escapeHtml(marker.category)}`;
  return L.divIcon({
    className: 'airindx-leaflet-icon',
    html: `<span class="sr-only">${accessibleName}</span><span class="airindx-leaflet-dot${selected ? ' is-selected' : ''}${marker.aqi > 200 ? ' is-high-aqi' : ''}" style="--marker-color:${color}" aria-hidden="true">${marker.aqi}</span>`,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
  });
}

export function AirIndxMap({
  markers,
  selectedId,
  onSelect,
  zoomCommand,
  active,
}: AirIndxMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const leafletRef = useRef<LeafletModule | null>(null);
  const markerRecordsRef = useRef<Map<string, MarkerRecord>>(new Map());
  const [mapReady, setMapReady] = useState(false);
  const [importError, setImportError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let instance: LeafletMap | null = null;
    const records = markerRecordsRef.current;

    void import('leaflet')
      .then((L) => {
        if (cancelled || !containerRef.current || mapRef.current) return;
        leafletRef.current = L;
        instance = L.map(containerRef.current, {
          center: [12, 42],
          zoom: 2,
          minZoom: 2,
          maxZoom: 8,
          zoomControl: false,
          attributionControl: true,
          worldCopyJump: true,
        });
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 18,
          crossOrigin: true,
          attribution: '&copy; OpenStreetMap contributors',
        }).addTo(instance);
        mapRef.current = instance;
        setMapReady(true);
      })
      .catch(() => {
        if (!cancelled) setImportError(true);
      });

    return () => {
      cancelled = true;
      instance?.remove();
      mapRef.current = null;
      leafletRef.current = null;
      records.clear();
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const L = leafletRef.current;
    if (!map || !L || !mapReady) return;

    const records = markerRecordsRef.current;
    const incoming = new Set(markers.map((marker) => marker.id));
    for (const [id, record] of records) {
      if (!incoming.has(id)) {
        record.marker.remove();
        records.delete(id);
      }
    }
    for (const marker of markers) {
      const existing = records.get(marker.id);
      if (existing) {
        existing.data = marker;
        existing.marker.setLatLng([marker.lat, marker.lon]);
        continue;
      }
      const leafletMarker = L.marker([marker.lat, marker.lon], {
        icon: markerIcon(L, marker, marker.id === selectedId),
        keyboard: true,
        title: `${marker.name}: ${marker.aqi} US AQI, ${marker.category}`,
      })
        .addTo(map)
        .on('click', () => onSelect(marker.id));
      records.set(marker.id, { marker: leafletMarker, data: marker });
    }
  }, [markers, selectedId, onSelect, mapReady]);

  useEffect(() => {
    const L = leafletRef.current;
    if (!L || !mapReady) return;
    for (const [id, record] of markerRecordsRef.current) {
      record.marker.setIcon(markerIcon(L, record.data, id === selectedId));
    }
  }, [selectedId, mapReady]);

  useEffect(() => {
    if (!active || !mapReady) return;
    const frame = window.requestAnimationFrame(() => mapRef.current?.invalidateSize());
    return () => window.cancelAnimationFrame(frame);
  }, [active, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || zoomCommand.nonce === 0) return;
    if (zoomCommand.direction === 1) map.zoomIn();
    else map.zoomOut();
  }, [zoomCommand, mapReady]);

  return (
    <div ref={containerRef} role="region" aria-label="Global AQI map" className="airindx-map h-full w-full">
      {importError && (
        <p role="alert" className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-amber-200">
          The 2D map could not be loaded. Use the globe view or the keyboard location list instead.
        </p>
      )}
    </div>
  );
}
