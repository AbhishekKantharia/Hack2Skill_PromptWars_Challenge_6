import type { SensitivityGroup } from '@/types/breathewise';

export function getPlanningThreshold(group: SensitivityGroup): number {
  switch (group) {
    case 'children':
    case 'older_adults':
    case 'respiratory':
      return 75;
    case 'outdoor_athletes':
      return 85;
    default:
      return 100;
  }
}

export function getSensitiveMargin(group: SensitivityGroup): number {
  return 100 - getPlanningThreshold(group);
}

export function getVentilationThreshold(group: SensitivityGroup): number {
  return Math.max(50, getPlanningThreshold(group) - 15);
}
