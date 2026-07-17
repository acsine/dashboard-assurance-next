'use client'

import { useEffect, useMemo } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet'
import type { GeoRegion } from '@/lib/api/mobi-assur'
import {
  CAMEROON_CENTER,
  CAMEROON_DEFAULT_ZOOM,
  coordsForRegion,
} from '@/lib/geo/cameroon-regions'
import 'leaflet/dist/leaflet.css'

type MapPoint = {
  name: string
  lat: number
  lng: number
}

function FitSelected({ points, selected }: { points: MapPoint[]; selected: string[] }) {
  const map = useMap()
  useEffect(() => {
    const selectedPoints = points.filter((p) => selected.includes(p.name))
    if (selectedPoints.length === 0) {
      map.setView([CAMEROON_CENTER.lat, CAMEROON_CENTER.lng], CAMEROON_DEFAULT_ZOOM)
      return
    }
    if (selectedPoints.length === 1) {
      map.setView([selectedPoints[0].lat, selectedPoints[0].lng], 7)
      return
    }
    const lats = selectedPoints.map((p) => p.lat)
    const lngs = selectedPoints.map((p) => p.lng)
    map.fitBounds(
      [
        [Math.min(...lats), Math.min(...lngs)],
        [Math.max(...lats), Math.max(...lngs)],
      ],
      { padding: [40, 40] },
    )
  }, [map, points, selected])
  return null
}

export default function CameroonZonesMap({
  regions,
  selectedCities,
  onToggleCity,
}: {
  regions: GeoRegion[]
  selectedCities: string[]
  onToggleCity: (city: string) => void
}) {
  const points = useMemo(() => {
    const fromApi = (Array.isArray(regions) ? regions : [])
      .map((r) => {
        const name = r.name?.trim()
        if (!name) return null
        const coords = coordsForRegion(name)
        if (!coords) return null
        return { name, ...coords }
      })
      .filter(Boolean) as MapPoint[]

    if (fromApi.length > 0) return fromApi

    // Fallback : 10 régions standards si l’API n’a pas encore de données
    return Object.entries({
      Adamaoua: coordsForRegion('Adamaoua')!,
      Centre: coordsForRegion('Centre')!,
      Est: coordsForRegion('Est')!,
      'Extrême-Nord': coordsForRegion('Extrême-Nord')!,
      Littoral: coordsForRegion('Littoral')!,
      Nord: coordsForRegion('Nord')!,
      'Nord-Ouest': coordsForRegion('Nord-Ouest')!,
      Ouest: coordsForRegion('Ouest')!,
      Sud: coordsForRegion('Sud')!,
      'Sud-Ouest': coordsForRegion('Sud-Ouest')!,
    }).map(([name, coords]) => ({ name, ...coords }))
  }, [regions])

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200">
      <MapContainer
        center={[CAMEROON_CENTER.lat, CAMEROON_CENTER.lng]}
        zoom={CAMEROON_DEFAULT_ZOOM}
        scrollWheelZoom={false}
        className="h-72 w-full z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitSelected points={points} selected={selectedCities} />
        {points.map((point) => {
          const selected = selectedCities.includes(point.name)
          return (
            <CircleMarker
              key={point.name}
              center={[point.lat, point.lng]}
              radius={selected ? 12 : 8}
              pathOptions={{
                color: selected ? '#1d4ed8' : '#64748b',
                fillColor: selected ? '#2563eb' : '#94a3b8',
                fillOpacity: selected ? 0.9 : 0.55,
                weight: selected ? 3 : 2,
              }}
              eventHandlers={{
                click: () => onToggleCity(point.name),
              }}
            >
              <Popup>
                <div className="text-xs">
                  <p className="font-bold">{point.name}</p>
                  <button
                    type="button"
                    className="mt-1 text-blue-600 underline"
                    onClick={() => onToggleCity(point.name)}
                  >
                    {selected ? 'Retirer de la zone' : 'Ajouter à la zone'}
                  </button>
                </div>
              </Popup>
            </CircleMarker>
          )
        })}
      </MapContainer>
      <p className="bg-slate-50 px-3 py-2 text-[11px] text-slate-500">
        Cliquez sur une région de la carte pour l’ajouter ou la retirer de la zone.
      </p>
    </div>
  )
}
