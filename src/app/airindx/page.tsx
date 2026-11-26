import type { Metadata } from 'next';
import { AirIndxDashboard } from '@/components/airindx/AirIndxDashboard';

export const metadata: Metadata = {
  title: 'AirIndx — Global Air Quality Intelligence',
  description:
    'Explore live global air quality readings on an interactive 3D Earth with city-level AQI markers and location details.',
};

export default function AirIndxPage() {
  return <AirIndxDashboard />;
}
