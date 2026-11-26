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

export default function AirMapLeaflet({ centerLat, centerLon, stations, metric }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [centerLat, centerLon],
      zoom: 10,
      scrollWheelZoom: true,
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
        animate: true,
      });
    }
  }, [centerLat, centerLon, stations.length]);

  useEffect(() => {
    const group = layerRef.current;
    if (!group) return;
    group.clearLayers();

    stations.forEach((st) => {
      const meta = getAqiMeta(st.aqi);
      const val = st[metric];
      const unit = metric === 'aqi' ? 'US AQI' : 'µg/m³';

      const marker = L.circleMarker([st.lat, st.lon], {
        radius: 14,
        color: '#ffffff',
        weight: 2,
        fillColor: meta.colorHex,
        fillOpacity: 0.9,
      });

      marker.bindPopup(`
        <div style="min-width: 190px; font-family: sans-serif;">
          <div style="font-weight: 700; font-size: 13px; margin-bottom: 4px;">${st.name}</div>
          <div style="font-size: 12px; margin-bottom: 6px;">
            <strong>${metric.toUpperCase()}:</strong> ${val} ${unit} (${meta.category})
          </div>
          <div style="font-size: 11px; color: #475569;">
            PM2.5: ${st.pm25} µg/m³ · PM10: ${st.pm10} µg/m³<br/>
            NO₂: ${st.no2} µg/m³ · O₃: ${st.o3} µg/m³
          </div>
          <div style="margin-top: 6px; font-size: 10px; font-weight: 600; color: ${
            st.sourceType === 'demo' ? '#b45309' : '#047857'
          };">
            ${st.sourceLabel}
          </div>
        </div>
      `);

      marker.addTo(group);
    });
  }, [stations, metric]);

  return (
    <div
      ref={containerRef}
      className="h-[460px] w-full rounded-2xl border border-emerald-200/70 dark:border-slate-800 overflow-hidden"
    />
  );
}
