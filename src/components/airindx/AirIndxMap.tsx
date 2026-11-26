'use client';

import React, { useEffect, useRef, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import type { AirIndxMarker } from '@/types/airindx';
import type { ZoomCommand } from '@/components/airindx/AirIndxGlobe';

type LeafletModule = typeof import('leaflet');
type LeafletMap = import('leaflet').Map;
type LeafletMarker = import('leaflet').Marker;

interface AirIndxMapProps {
  markers: AirIndxMarker[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  zoomCommand: ZoomCommand;
}

function markerIcon(L: LeafletModule, marker: AirIndxMarker, selected: boolean) {
  return L.divIcon({
    className: 'airindx-leaflet-icon',
    html: `<span class="airindx-leaflet-dot${selected ? ' is-selected' : ''}" style="--marker-color:${marker.colorHex}">${marker.aqi}</span>`,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
  });
}

export function AirIndxMap({ markers, selectedId, onSelect, zoomCommand }: AirIndxMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const leafletRef = useRef<LeafletModule | null>(null);
  const markersRef = useRef<LeafletMarker[]>([]);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let instance: LeafletMap | null = null;

    void import('leaflet').then((L) => {
      if (cancelled || !containerRef.current || mapRef.current) return;
      leafletRef.current = L;
      instance = L.map(containerRef.current, {
        center: [12, 42],
        zoom: 2,
        minZoom: 2,
        maxZoom: 8,
        zoomControl: false,
        attributionControl: false,
        worldCopyJump: true,
      });
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18,
        crossOrigin: true,
      }).addTo(instance);
      mapRef.current = instance;
      setMapReady(true);
    });

    return () => {
      cancelled = true;
      instance?.remove();
      mapRef.current = null;
      leafletRef.current = null;
      markersRef.current = [];
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const L = leafletRef.current;
    if (!map || !L || !mapReady) return;
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = markers.map((marker) => {
      const leafletMarker = L.marker([marker.lat, marker.lon], {
        icon: markerIcon(L, marker, marker.id === selectedId),
        keyboard: true,
        title: `${marker.name}: ${marker.aqi} US AQI`,
        alt: `${marker.name} air quality marker`,
      }).addTo(map);
      leafletMarker.on('click', () => onSelect(marker.id));
      return leafletMarker;
    });
  }, [markers, selectedId, onSelect, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || zoomCommand.nonce === 0) return;
    if (zoomCommand.direction === 1) map.zoomIn();
    else map.zoomOut();
  }, [zoomCommand, mapReady]);

  return <div ref={containerRef} className="airindx-map h-full w-full" aria-label="Global AQI map" />;
}
