'use client'

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix for default marker icons in Leaflet with Next.js/bundlers
const customIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

interface SinistreMapPreviewProps {
  lat: number
  lng: number
  address?: string
  reference?: string
}

export default function SinistreMapPreview({
  lat,
  lng,
  address,
  reference,
}: SinistreMapPreviewProps) {
  return (
    <div className="relative w-full h-56 rounded-2xl overflow-hidden border border-amber-200/80 shadow-xs z-10">
      <MapContainer
        center={[lat, lng]}
        zoom={14}
        scrollWheelZoom={false}
        className="w-full h-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={[lat, lng]} icon={customIcon}>
          <Popup>
            <div className="text-xs font-sans p-1">
              <p className="font-bold text-slate-900">{reference || 'Lieu du Sinistre'}</p>
              {address && <p className="text-slate-600 mt-1">{address}</p>}
              <p className="text-[10px] text-amber-700 mt-1 font-mono font-bold">
                GPS: {lat.toFixed(5)}, {lng.toFixed(5)}
              </p>
            </div>
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  )
}

