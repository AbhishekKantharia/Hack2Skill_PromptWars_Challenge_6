'use client';

import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { AirIndxMarker } from '@/types/airindx';
import type { ZoomCommand } from '@/components/airindx/AirIndxGlobe';

interface AirIndxMapProps {
  markers: AirIndxMarker[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  zoomCommand: ZoomCommand;
}

function markerIcon(marker: AirIndxMarker, selected: boolean) {
  return L.divIcon({
    className: 'airindx-leaflet-icon',
    html: `<span class="airindx-leaflet-dot${selected ? ' is-selected' : ''}" style="--marker-color:${marker.colorHex}">${marker.aqi}</span>`,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
  });
}

export function AirIndxMap({ markers, selectedId, onSelect, zoomCommand }: AirIndxMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
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
    }).addTo(map);
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      markersRef.current = [];
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = markers.map((marker) => {
      const leafletMarker = L.marker([marker.lat, marker.lon], {
        icon: markerIcon(marker, marker.id === selectedId),
        keyboard: true,
        title: `${marker.name}: ${marker.aqi} US AQI`,
        alt: `${marker.name} air quality marker`,
      }).addTo(map);
      leafletMarker.on('click', () => onSelect(marker.id));
      return leafletMarker;
    });
  }, [markers, selectedId, onSelect]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || zoomCommand.nonce === 0) return;
    if (zoomCommand.direction === 1) map.zoomIn();
    else map.zoomOut();
  }, [zoomCommand]);

  return <div ref={containerRef} className="airindx-map h-full w-full" aria-label="Global AQI map" />;
}
