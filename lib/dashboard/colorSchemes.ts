export interface ColorScheme {
  id: string
  label: string
  colors: string[]
}

export const COLOR_SCHEMES: ColorScheme[] = [
  {
    id: 'default',
    label: 'Default',
    colors: ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#22c55e', '#14b8a6'],
  },
  {
    id: 'blue',
    label: 'Blue',
    colors: ['#1d4ed8', '#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe', '#dbeafe', '#eff6ff'],
  },
  {
    id: 'green',
    label: 'Green',
    colors: ['#14532d', '#166534', '#15803d', '#16a34a', '#22c55e', '#4ade80', '#86efac', '#bbf7d0'],
  },
  {
    id: 'warm',
    label: 'Warm',
    colors: ['#7c2d12', '#9a3412', '#c2410c', '#ea580c', '#f97316', '#fb923c', '#fdba74', '#fed7aa'],
  },
]

export function getSchemeColors(schemeId?: string): string[] {
  return COLOR_SCHEMES.find(s => s.id === schemeId)?.colors ?? COLOR_SCHEMES[0].colors
}
