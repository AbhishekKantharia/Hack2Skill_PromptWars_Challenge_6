export interface IndoorRecommendation {
  id: string;
  tier: 'free' | 'affordable' | 'advanced';
  category: 'filtration' | 'ventilation' | 'cooking' | 'dust' | 'smoke';
  title: string;
  estimatedCost: string;
  actionSteps: string[];
  whyItWorks: string;
  limitations: string;
}

export const INDOOR_RECOMMENDATIONS: IndoorRecommendation[] = [
  {
    id: 'indoor-vent-timing',
    tier: 'free',
    category: 'ventilation',
    title: 'Smart Cross-Ventilation Timing',
    estimatedCost: '$0 (Free)',
    actionSteps: [
      'Check BreatheWise AI’s hourly forecast before opening windows.',
      'Open windows on opposite sides of the room for 15–20 minutes during low-AQI midday windows.',
      'Keep windows latched during rush-hour traffic peaks, evening inversions, or nearby smoke events.',
    ],
    whyItWorks:
      'Flushes accumulated indoor CO2, humidity, and cooking VOCs when outdoor air is cleaner than indoor air, without consuming electricity.',
    limitations:
      'Not effective if outdoor AQI remains elevated (>100) all day or if your home faces a congested arterial road or active construction.',
  },
  {
    id: 'indoor-smoke-elimination',
    tier: 'free',
    category: 'smoke',
    title: 'Eliminate Avoidable Indoor Combustion',
    estimatedCost: '$0 (Free)',
    actionSteps: [
      'Avoid burning candles, incense sticks, mosquito coils, or tobacco indoors.',
      'Move any ritual/fragrance burning outdoors or switch to flameless/unscented options.',
      'Keep interior doors closed between smoky areas and bedrooms.',
    ],
    whyItWorks:
      'A single incense stick or candle in a closed room can spike indoor PM2.5 above 100 µg/m³—higher than many polluted city streets.',
    limitations:
      'Source removal prevents new smoke from forming, but does not clear outdoor PM2.5 that infiltrates through leaky window frames.',
  },
  {
    id: 'indoor-cooking-practices',
    tier: 'free',
    category: 'cooking',
    title: 'Cleaner Cooking & Lid Habits',
    estimatedCost: '$0 (Free)',
    actionSteps: [
      'Always switch on your kitchen exhaust fan before turning on the stove, and run it 10 minutes after finishing.',
      'Use pot lids and moderate heat to minimize oil aerosolization and steam.',
      'Cook on back burners under the hood capture zone whenever possible.',
    ],
    whyItWorks:
      'High-heat frying and gas burners generate high bursts of ultrafine particles (PM2.5) and NO2; hood capture removes pollutants at the source.',
    limitations:
      'Recirculating range hoods (that blow air back into the kitchen through a thin mesh) trap grease droplets but do NOT vent NO2 or ultrafine PM2.5 outdoors.',
  },
  {
    id: 'indoor-damp-dusting',
    tier: 'affordable',
    category: 'dust',
    title: 'Damp Microfiber Cleaning & Entry Matting',
    estimatedCost: '$5–$20',
    actionSteps: [
      'Replace dry brooms and feather dusters with damp microfiber cloths and wet mopping.',
      'Adopt a shoes-off entryway rule with a washable doormat.',
      'Wash bedding weekly in warm water to reduce settled allergens and dust.',
    ],
    whyItWorks:
      'Dry sweeping kicks settled PM10 and heavy dust back into breathing height; damp wiping binds particles directly into the cloth.',
    limitations:
      'Controls coarse resuspended dust and allergens well, but cannot capture sub-micron airborne PM2.5 floating in room air.',
  },
  {
    id: 'indoor-diy-cr-box',
    tier: 'affordable',
    category: 'filtration',
    title: 'DIY Box-Fan MERV-13 Filter (Corsi-Rosenthal Style)',
    estimatedCost: '$30–$55',
    actionSteps: [
      'Tape 1–4 pleated MERV-13 HVAC filters (20×20 in) to a modern thermally-protected box fan.',
      'Seal cardboard base and corners cleanly with duct tape so air passes through the filter media.',
      'Run on low/medium speed in living areas or bedrooms during smog or wildfire smoke days.',
    ],
    whyItWorks:
      'Provides high Clean Air Delivery Rate (CADR) for fine PM2.5 particles at a fraction of commercial purifier pricing.',
    limitations:
      'Louder than purpose-built purifiers, bulkier footprint, and MERV-13 media does not remove gaseous pollutants (CO, NO2, VOCs).',
  },
  {
    id: 'indoor-draft-sealing',
    tier: 'affordable',
    category: 'ventilation',
    title: 'Weatherstripping & Door Draft Sweeps',
    estimatedCost: '$10–$30',
    actionSteps: [
      'Apply foam weatherstripping tape along rattling window sashes.',
      'Install rubber door sweeps under exterior doors facing hallways or streets.',
    ],
    whyItWorks:
      'Reduces passive infiltration of outdoor PM2.5 during severe pollution alerts and lowers heating/cooling energy waste.',
    limitations:
      'Tightly sealed rooms build up exhaled CO2 and indoor humidity if occupied for long hours; pair with periodic safe ventilation or filtration.',
  },
  {
    id: 'indoor-hepa-purifier',
    tier: 'advanced',
    category: 'filtration',
    title: 'True HEPA Portable Air Purifier (Room-Sized CADR)',
    estimatedCost: '$110–$280 + $30–$60/yr filter',
    actionSteps: [
      'Check the Clean Air Delivery Rate (CADR) — target at least 2/3 of room area in sq ft (or 4+ air changes/hour).',
      'Place in the bedroom with doors closed overnight for lowest continuous sleep exposure.',
      'Avoid "ionizer", "plasma", or "ozone generator" modes, which can emit lung-irritating ozone.',
    ],
    whyItWorks:
      'Certified True HEPA H13/H14 media captures ≥99.95% of 0.3 µm particles on each pass with quiet overnight operation.',
    limitations:
      'Standard thin carbon pre-filters saturate quickly and provide minimal gas/NO2 removal; purifiers must stay running and filters replaced on schedule.',
  },
  {
    id: 'indoor-induction-vented',
    tier: 'advanced',
    category: 'cooking',
    title: 'Ducted Range Hood + Electric/Induction Cooking',
    estimatedCost: '$120 (portable induction) – $1,000+ (ducted hood)',
    actionSteps: [
      'Use a portable countertop induction burner ($60–$120) for everyday boiling/simmering to eliminate indoor gas NO2.',
      'Ensure kitchen exhaust vents directly outside rather than recirculating indoors.',
    ],
    whyItWorks:
      'Eliminates indoor nitrogen dioxide (NO2) and carbon monoxide (CO) combustion byproducts from gas/kerosene stoves.',
    limitations:
      'Induction still produces cooking aerosol PM2.5 from heated oils and foods—external ventilation or kitchen filtration remains essential.',
  },
];

export interface PollutantGuide {
  id: string;
  symbol: string;
  name: string;
  sources: string;
  whyItMatters: string;
  whoGuideline24h: string;
  practicalTip: string;
}

export const POLLUTANT_GUIDES: PollutantGuide[] = [
  {
    id: 'pm25',
    symbol: 'PM2.5',
    name: 'Fine Particulate Matter (≤ 2.5 µm)',
    sources: 'Vehicle exhaust, power plants, wood/waste burning, cooking aerosols, secondary haze.',
    whyItMatters:
      'Microscopic particles (~30× thinner than a human hair) can bypass upper airway defenses and reach deep lung alveoli.',
    whoGuideline24h: 'WHO 2021 24-hour guideline: 15 µg/m³ (annual: 5 µg/m³)',
    practicalTip: 'Best mitigated outdoors with well-fitted N95/FFP2 masks and indoors with MERV-13 / True HEPA filtration.',
  },
  {
    id: 'pm10',
    symbol: 'PM10',
    name: 'Coarse Particulate Matter (≤ 10 µm)',
    sources: 'Road dust resuspension, construction sites, soil wind erosion, pollen fragments.',
    whyItMatters:
      'Irritates eyes, nose, and upper airways; often spikes alongside dry windy conditions and heavy truck traffic.',
    whoGuideline24h: 'WHO 2021 24-hour guideline: 45 µg/m³ (annual: 15 µg/m³)',
    practicalTip: 'Damp mopping indoors and avoiding active construction corridors reduces coarse dust exposure.',
  },
  {
    id: 'no2',
    symbol: 'NO₂',
    name: 'Nitrogen Dioxide',
    sources: 'Diesel/gasoline vehicles, gas stoves, industrial boilers, power generation.',
    whyItMatters:
      'Sharp traffic-corridor pollutant that irritates airways and increases susceptibility to respiratory infections; drops rapidly just 50–100m away from highways.',
    whoGuideline24h: 'WHO 2021 24-hour guideline: 25 µg/m³ (annual: 10 µg/m³)',
    practicalTip: 'Walk or cycle on quiet side streets rather than major arterials, and vent gas stoves outdoors.',
  },
  {
    id: 'o3',
    symbol: 'O₃',
    name: 'Ground-Level Ozone',
    sources: 'Formed photochemically when sunlight reacts with vehicle/industrial NOx and VOCs.',
    whyItMatters:
      'Peaks on hot, sunny afternoons; causes airway inflammation even in healthy runners and cannot be filtered by basic dust masks.',
    whoGuideline24h: 'WHO 2021 8-hour peak guideline: 100 µg/m³',
    practicalTip: 'On hot sunny smog days, morning workouts often have lower ozone than late-afternoon heat peaks.',
  },
  {
    id: 'so2',
    symbol: 'SO₂',
    name: 'Sulfur Dioxide',
    sources: 'Coal/heavy-fuel combustion, refineries, shipping ports, industrial smelting.',
    whyItMatters:
      'Triggers bronchoconstriction quickly in sensitive airways and contributes to secondary sulfate PM2.5 haze.',
    whoGuideline24h: 'WHO 2021 24-hour guideline: 40 µg/m³',
    practicalTip: 'Monitor industrial wind directions and keep windows closed during port/industrial plumes.',
  },
  {
    id: 'co',
    symbol: 'CO',
    name: 'Carbon Monoxide',
    sources: 'Incomplete combustion in idling traffic, generators, charcoal heaters, faulty appliances.',
    whyItMatters:
      'Colorless, odorless gas that impairs oxygen transport in blood; deadly indoors at high concentrations.',
    whoGuideline24h: 'WHO 2021 24-hour guideline: 4 mg/m³ (4,000 µg/m³)',
    practicalTip: 'Never run generators or charcoal grills indoors/garages and maintain working CO alarms.',
  },
];
