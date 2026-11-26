export type DataMode = 'live' | 'demo';

export type SensitivityGroup =
  | 'general'
  | 'children'
  | 'older_adults'
  | 'respiratory'
  | 'outdoor_athletes';

export type BudgetTier = 'free_first' | 'balanced' | 'advanced';

export type SpaceType = 'household' | 'school' | 'neighborhood' | 'housing_society';

export interface CityLocation {
  name: string;
  country: string;
  region?: string;
  lat: number;
  lon: number;
  timezone?: string;
}

export interface PollutantReadings {
  pm25: number | null; // µg/m³
  pm10: number | null; // µg/m³
  no2: number | null;  // µg/m³
  so2: number | null;  // µg/m³
  co: number | null;   // µg/m³
  o3: number | null;   // µg/m³
}

export interface WeatherInfo {
  temperatureC: number | null;
  humidityPct: number | null;
  windSpeedKmh: number | null;
  windDirectionDeg: number | null;
  condition: string;
}

export interface HourlyAirPoint {
  time: string;
  label: string;
  aqi: number;
  pm25: number | null;
  pm10: number | null;
  o3: number | null;
  no2: number | null;
  isForecast: boolean;
}

export interface AirQualityStation {
  id: string;
  name: string;
  city: string;
  lat: number;
  lon: number;
  aqi: number;
  pm25: number | null;
  pm10: number | null;
  no2: number | null;
  o3: number | null;
  sourceType: 'official' | 'model_grid' | 'demo';
  sourceLabel: string;
  updatedAt: string;
}

export interface AirQualityPayload {
  location: CityLocation;
  aqi: number;
  aqiScale: 'US EPA';
  category: string;
  dominantPollutant: string;
  pollutants: PollutantReadings;
  weather: WeatherInfo;
  hourly: HourlyAirPoint[];
  stations: AirQualityStation[];
  dataMode: DataMode;
  sourceName: string;
  sourceUrl: string;
  timestamp: string;
  uncertaintyNote: string;
  degraded?: boolean;
  liveError?: string;
}

export type AlertSeverity = 'info' | 'warning' | 'critical' | 'favorable';

export interface IntelligentAlert {
  id: string;
  type: 'high_aqi' | 'severe_pollution' | 'unusual_change' | 'forecast_spike' | 'favorable_ventilation';
  severity: AlertSeverity;
  title: string;
  message: string;
  metricValue?: string;
  recommendedAction: string;
  timestamp: string;
}

export interface AlertPreferences {
  highAqiThreshold: number;
  severeAqiThreshold: number;
  spikeDeltaThreshold: number;
  favorableVentilationMaxAqi: number;
  enableHighAqi: boolean;
  enableSevereAqi: boolean;
  enableSpikeAlerts: boolean;
  enableForecastSpikes: boolean;
  enableVentilationWindows: boolean;
}

export interface FixedImpactMetrics {
  headline: string;
  detail: string;
  formula: string;
  unit: string;
}

export interface ImpactSource {
  label: string;
  url: string;
}

export interface DailyImpactRecommendation {
  id: 'clean_hour' | 'close_windows' | 'indoor_filtration' | 'mask_commute' | 'cleaner_travel' | 'cleaner_cooking';
  title: string;
  icon: 'clock' | 'window' | 'filter' | 'mask' | 'transit' | 'cooking';
  priority: number;
  action: string;
  plainLanguage: string;
  whyItHelps: string;
  cost: string;
  bestFor: string;
  impact: FixedImpactMetrics;
  assumptions: string[];
  sources: ImpactSource[];
  dataMode: DataMode;
}

export interface UserSettings {
  displayName: string;
  defaultCity: CityLocation;
  sensitivityGroup: SensitivityGroup;
  budgetTier: BudgetTier;
  spaceType: SpaceType;
  groupSize: number;
  setupComplete: boolean;
  theme: 'light' | 'dark';
  units: 'metric' | 'imperial';
  forceDemoMode: boolean;
  alerts: AlertPreferences;
}

export interface RoutineItem {
  id: string;
  timeOfDay: 'Morning' | 'Afternoon' | 'Evening';
  timeWindow: string;
  action: string;
  explanation: string;
  expectedBenefit: string;
  estimatedCost: string;
  environmentalImpact: string;
  caveat: string;
  forecastAqi: number;
}

export interface DailyRoutineResponse {
  city: string;
  generatedAt: string;
  dataMode: DataMode;
  summary: string;
  bestOutdoorWindow: string;
  bestVentilationWindow: string;
  items: RoutineItem[];
  safetyDisclaimer: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  cityContext?: string;
  aqiContext?: number;
  dataMode?: DataMode;
  sources?: string[];
  uncertaintyNote?: string;
}

export interface SustainabilityActionOption {
  id: string;
  label: string;
  category: 'transport' | 'energy' | 'waste';
  unitLabel: string;
  defaultFrequency: number;
  maxFrequency: number;
  co2KgPerUnit: number;
  fuelLitersPerUnit: number;
  energyKwhPerUnit: number;
  localPollutantNote: string;
  formulaDescription: string;
  sourceCitation: string;
}

export interface SimulatorScenario {
  id: string;
  title: string;
  description: string;
  parameterLabel: string;
  minPct: number;
  maxPct: number;
  defaultPct: number;
  householdsScope: number;
  co2KgPerHouseholdYearAt100Pct: number;
  localPm25ProxyNote: string;
  assumptions: string[];
}

export interface CommunityObservation {
  id: string;
  neighborhood: string;
  city: string;
  category:
    | 'smoke_haze'
    | 'traffic_congestion'
    | 'construction_dust'
    | 'waste_burning'
    | 'clear_breeze'
    | 'green_commute';
  severity: 'low' | 'moderate' | 'high';
  description: string;
  verificationType: 'user_submitted';
  upvotes: number;
  createdAt: string;
}

export interface CommunityChallenge {
  id: string;
  title: string;
  neighborhood: string;
  description: string;
  targetActions: number;
  currentActions: number;
  participantsCount: number;
  badgeName: string;
  endsOn: string;
  joined?: boolean;
}
