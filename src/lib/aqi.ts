import type {
  AlertPreferences,
  AirQualityPayload,
  IntelligentAlert,
  PollutantReadings,
} from '@/types/breathewise';

export interface AqiLevelMeta {
  category: string;
  colorHex: string;
  badgeClass: string;
  guidance: string;
}

export function getAqiMeta(aqi: number): AqiLevelMeta {
  if (aqi <= 50) {
    return {
      category: 'Good',
      colorHex: '#10b981',
      badgeClass: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
      guidance: 'Air quality is generally satisfactory for most people; normal outdoor activities and natural ventilation are typically suitable.',
    };
  }
  if (aqi <= 100) {
    return {
      category: 'Moderate',
      colorHex: '#f59e0b',
      badgeClass: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
      guidance: 'Acceptable air quality, though unusually sensitive individuals may experience mild discomfort during prolonged outdoor exertion.',
    };
  }
  if (aqi <= 150) {
    return {
      category: 'Unhealthy for Sensitive Groups',
      colorHex: '#f97316',
      badgeClass: 'bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30',
      guidance: 'Children, older adults, and people with asthma or heart/lung conditions should consider shorter or lower-intensity outdoor exertion.',
    };
  }
  if (aqi <= 200) {
    return {
      category: 'Unhealthy',
      colorHex: '#ef4444',
      badgeClass: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30',
      guidance: 'Everyone may begin to experience effects; consider shifting strenuous workouts indoors and keeping windows closed during peak hours.',
    };
  }
  if (aqi <= 300) {
    return {
      category: 'Very Unhealthy',
      colorHex: '#8b5cf6',
      badgeClass: 'bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/30',
      guidance: 'Health alert: limit prolonged outdoor exertion, use well-fitted N95/FFP2 masks if outdoor travel is necessary, and run indoor HEPA filtration if available.',
    };
  }
  return {
    category: 'Hazardous',
    colorHex: '#991b1b',
    badgeClass: 'bg-red-900/20 text-red-800 dark:text-red-300 border-red-700/40',
    guidance: 'Avoid outdoor physical exertion when possible, keep indoor spaces sealed with clean filtration, and consult a healthcare professional if symptoms arise.',
  };
}

/**
 * Compute US EPA AQI sub-index from PM2.5 (µg/m³) using official EPA breakpoints.
 */
export function pm25ToUsAqi(pm25: number): number {
  const c = Math.max(0, Math.floor(pm25 * 10) / 10);
  const breakpoints = [
    { cLow: 0.0, cHigh: 9.0, iLow: 0, iHigh: 50 },
    { cLow: 9.1, cHigh: 35.4, iLow: 51, iHigh: 100 },
    { cLow: 35.5, cHigh: 55.4, iLow: 101, iHigh: 150 },
    { cLow: 55.5, cHigh: 125.4, iLow: 151, iHigh: 200 },
    { cLow: 125.5, cHigh: 225.4, iLow: 201, iHigh: 300 },
    { cLow: 225.5, cHigh: 325.4, iLow: 301, iHigh: 400 },
    { cLow: 325.5, cHigh: 500.4, iLow: 401, iHigh: 500 },
  ];
  for (const bp of breakpoints) {
    if (c <= bp.cHigh) {
      return Math.round(((bp.iHigh - bp.iLow) / (bp.cHigh - bp.cLow)) * (c - bp.cLow) + bp.iLow);
    }
  }
  return 500;
}

export function determineDominantPollutant(p: PollutantReadings): string {
  // Normalized comparison against WHO 2021 short-term guideline / reference ratios
  const ratios: Array<{ label: string; score: number }> = [];
  if (p.pm25 !== null) ratios.push({ label: 'PM2.5', score: p.pm25 / 15 });
  if (p.pm10 !== null) ratios.push({ label: 'PM10', score: p.pm10 / 45 });
  if (p.no2 !== null) ratios.push({ label: 'NO2', score: p.no2 / 25 });
  if (p.o3 !== null) ratios.push({ label: 'O3', score: p.o3 / 100 });
  if (p.so2 !== null) ratios.push({ label: 'SO2', score: p.so2 / 40 });
  if (p.co !== null) ratios.push({ label: 'CO', score: p.co / 4000 });
  if (ratios.length === 0) return 'PM2.5';
  ratios.sort((a, b) => b.score - a.score);
  return ratios[0].label;
}

export function evaluateIntelligentAlerts(
  payload: AirQualityPayload,
  prefs: AlertPreferences
): IntelligentAlert[] {
  const alerts: IntelligentAlert[] = [];
  const now = payload.timestamp;

  if (prefs.enableSevereAqi && payload.aqi >= prefs.severeAqiThreshold) {
    alerts.push({
      id: `severe-${payload.location.name}`,
      type: 'severe_pollution',
      severity: 'critical',
      title: `Severe Air Quality Alert (${payload.aqi} US AQI)`,
      message: `${payload.location.name} is currently at ${payload.aqi} AQI (${payload.category}), driven primarily by ${payload.dominantPollutant}.`,
      metricValue: `${payload.aqi} AQI`,
      recommendedAction: 'Move strenuous activities indoors, keep exterior doors/windows closed, and use HEPA filtration or a well-fitted N95/FFP2 mask outdoors.',
      timestamp: now,
    });
  } else if (prefs.enableHighAqi && payload.aqi >= prefs.highAqiThreshold) {
    alerts.push({
      id: `high-${payload.location.name}`,
      type: 'high_aqi',
      severity: 'warning',
      title: `Elevated Pollution Advisory (${payload.aqi} US AQI)`,
      message: `Current air quality in ${payload.location.name} exceeds your alert threshold of ${prefs.highAqiThreshold} AQI.`,
      metricValue: `${payload.aqi} AQI`,
      recommendedAction: 'Reduce prolonged outdoor exertion, especially for children, older adults, or people with respiratory sensitivity.',
      timestamp: now,
    });
  }

  // Check unusual rapid change in recent hours
  const recent = payload.hourly.filter((h) => !h.isForecast);
  if (prefs.enableSpikeAlerts && recent.length >= 4) {
    const earliest = recent[0].aqi;
    const latest = recent[recent.length - 1].aqi;
    const delta = latest - earliest;
    if (Math.abs(delta) >= prefs.spikeDeltaThreshold) {
      alerts.push({
        id: `delta-${payload.location.name}`,
        type: 'unusual_change',
        severity: delta > 0 ? 'warning' : 'info',
        title: delta > 0 ? `Rapid Pollution Rise (+${delta} AQI)` : `Noticeable Air Clearing (${delta} AQI)`,
        message: `Over recent hours, AQI shifted from ${earliest} to ${latest} (${delta > 0 ? '+' : ''}${delta} AQI points).`,
        metricValue: `${delta > 0 ? '+' : ''}${delta} AQI`,
        recommendedAction:
          delta > 0
            ? 'Pause cross-ventilation until concentrations stabilize and consider postponing outdoor workouts.'
            : 'Conditions are improving; re-check forecast windows before opening windows.',
        timestamp: now,
      });
    }
  }

  // Check forecasted spikes in next 12 hours
  const forecasts = payload.hourly.filter((h) => h.isForecast).slice(0, 12);
  if (prefs.enableForecastSpikes && forecasts.length > 0) {
    const peak = forecasts.reduce((max, item) => (item.aqi > max.aqi ? item : max), forecasts[0]);
    if (peak.aqi >= prefs.highAqiThreshold && peak.aqi - payload.aqi >= 20) {
      alerts.push({
        id: `forecast-spike-${payload.location.name}`,
        type: 'forecast_spike',
        severity: 'warning',
        title: `Forecasted Spike Around ${peak.label}`,
        message: `Modeled forecast indicates AQI may climb to ~${peak.aqi} around ${peak.label} (±15–25% model uncertainty).`,
        metricValue: `Peak ~${peak.aqi} AQI`,
        recommendedAction: 'Schedule necessary outdoor errands or natural ventilation before the forecasted peak window.',
        timestamp: now,
      });
    }
  }

  // Check favorable ventilation windows
  if (prefs.enableVentilationWindows && forecasts.length > 0) {
    const bestWindow = forecasts.find((h) => h.aqi <= prefs.favorableVentilationMaxAqi);
    if (bestWindow) {
      alerts.push({
        id: `ventilation-${payload.location.name}`,
        type: 'favorable_ventilation',
        severity: 'favorable',
        title: `Favorable Ventilation Window (${bestWindow.label})`,
        message: `Outdoor AQI is projected around ${bestWindow.aqi} at ${bestWindow.label}, below your ${prefs.favorableVentilationMaxAqi} AQI ventilation threshold.`,
        metricValue: `${bestWindow.aqi} AQI`,
        recommendedAction: 'Briefly cross-ventilate indoor rooms during this cleaner window while monitoring local street traffic or cooking smoke.',
        timestamp: now,
      });
    }
  }

  return alerts;
}
