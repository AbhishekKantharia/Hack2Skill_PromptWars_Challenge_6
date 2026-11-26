'use client';

import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { AirQualityStation } from '@/types/breathewise';
import { getAqiMeta } from '@/lib/aqi';

interface Props {
  centerLat: number;
  centerLon: number;
  stations: AirQualityStation[];
  metric: 'aqi' | 'pm25' | 'pm10' | 'no2' | 'o3';
}

const POLLUTANT_GUIDELINES: Record<Exclude<Props['metric'], 'aqi'>, number> = {
  pm25: 15,
  pm10: 45,
  no2: 25,
  o3: 100,
};

function markerColor(st: AirQualityStation, metric: Props['metric']): string {
  if (metric === 'aqi') return getAqiMeta(st.aqi).colorHex;
  const value = st[metric];
  if (value === null) return '#64748b';
  const ratio = value / POLLUTANT_GUIDELINES[metric];
  if (ratio <= 0.5) return '#10b981';
  if (ratio <= 1) return '#f59e0b';
  if (ratio <= 2) return '#f97316';
  return '#ef4444';
}

function buildPopup(st: AirQualityStation, metric: Props['metric']): HTMLElement {
  const root = document.createElement('div');
  root.style.maxWidth = 'min(240px, 70vw)';
  root.style.overflowWrap = 'anywhere';

  const title = document.createElement('div');
  title.style.cssText = 'font-weight:700;font-size:13px;margin-bottom:4px';
  title.textContent = st.name;
  root.appendChild(title);

  const value = document.createElement('div');
  value.style.cssText = 'font-size:12px;margin-bottom:6px';
  const reading = metric === 'aqi' ? `${st.aqi} US AQI` : `${st[metric] ?? 'N/A'} µg/m³`;
  value.textContent = `${metric.toUpperCase()}: ${reading}`;
  root.appendChild(value);

  const detail = document.createElement('div');
  detail.style.cssText = 'font-size:11px;color:#475569';
  detail.textContent = `PM2.5: ${st.pm25 ?? 'N/A'} µg/m³ · PM10: ${st.pm10 ?? 'N/A'} µg/m³ · NO₂: ${st.no2 ?? 'N/A'} µg/m³ · O₃: ${st.o3 ?? 'N/A'} µg/m³`;
  root.appendChild(detail);

  const source = document.createElement('div');
  source.style.cssText = `margin-top:6px;font-size:10px;font-weight:600;color:${st.sourceType === 'demo' ? '#b45309' : '#047857'}`;
  source.textContent = `${st.sourceLabel} · ${new Date(st.updatedAt).toLocaleString()}`;
  root.appendChild(source);

  return root;
}

function AirMapLeaflet({ centerLat, centerLon, stations, metric }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [centerLat, centerLon],
      zoom: 10,
      scrollWheelZoom: false,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 18,
    }).addTo(map);

    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.setView([centerLat, centerLon], stations.length > 5 ? 3 : 10, {
        animate: false,
      });
    }
  }, [centerLat, centerLon, stations.length]);

  useEffect(() => {
    const group = layerRef.current;
    if (!group) return;
    group.clearLayers();

    stations.forEach((st) => {
      const marker = L.circleMarker([st.lat, st.lon], {
        radius: 14,
        color: '#ffffff',
        weight: 2,
        fillColor: markerColor(st, metric),
        fillOpacity: 0.9,
      });
      marker.bindPopup(buildPopup(st, metric));
      marker.addTo(group);
    });
  }, [stations, metric]);

  return (
    <div
      ref={containerRef}
      className="h-[460px] w-full max-w-full overflow-hidden rounded-2xl border border-emerald-200/70 dark:border-slate-800"
    />
  );
}

export default React.memo(AirMapLeaflet);
