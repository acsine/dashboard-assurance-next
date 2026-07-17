/** Centres approximatifs des 10 régions du Cameroun (WGS84). */
export const CAMEROON_REGION_COORDS: Record<string, { lat: number; lng: number }> = {
  ADAMAOUA: { lat: 6.55, lng: 12.52 },
  CENTRE: { lat: 3.87, lng: 11.52 },
  EST: { lat: 4.15, lng: 14.15 },
  'EXTREME-NORD': { lat: 10.59, lng: 14.36 },
  'EXTRÊME-NORD': { lat: 10.59, lng: 14.36 },
  LITTORAL: { lat: 4.05, lng: 9.7 },
  NORD: { lat: 8.58, lng: 13.68 },
  'NORD-OUEST': { lat: 6.2, lng: 10.27 },
  OUEST: { lat: 5.48, lng: 10.42 },
  SUD: { lat: 2.94, lng: 11.52 },
  'SUD-OUEST': { lat: 4.9, lng: 9.2 },
}

export const CAMEROON_CENTER = { lat: 5.5, lng: 12.0 }
export const CAMEROON_DEFAULT_ZOOM = 6

export function normalizeRegionKey(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/\s+/g, '-')
    .replace(/REGION-?/, '')
    .trim()
}

export function coordsForRegion(name: string): { lat: number; lng: number } | null {
  const key = normalizeRegionKey(name)
  if (CAMEROON_REGION_COORDS[key]) return CAMEROON_REGION_COORDS[key]
  const match = Object.entries(CAMEROON_REGION_COORDS).find(
    ([k]) => key.includes(k) || k.includes(key),
  )
  return match?.[1] ?? null
}
