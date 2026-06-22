"use client";

import { useEffect } from "react";
import { Circle, CircleMarker, MapContainer, TileLayer, Tooltip, useMap } from "react-leaflet";
import type { LatLngBoundsExpression } from "leaflet";

import type { Zone } from "@/lib/api";

type OverlayState = {
  aqi: boolean;
  landUse: boolean;
  satellite: boolean;
};

type HotspotLeafletMapProps = {
  zones: Zone[];
  selectedZoneId?: string;
  overlays: OverlayState;
  onSelectZone: (zone: Zone) => void;
};

const categoryColors: Record<string, string> = {
  Good: "#16a34a",
  Satisfactory: "#84cc16",
  Moderate: "#eab308",
  Poor: "#f97316",
  "Very Poor": "#dc2626",
  Severe: "#7e22ce",
};

const landUseColors = ["#0ea5e9", "#10b981", "#14b8a6"];

function FitVisibleZones({ zones }: { zones: Zone[] }) {
  const map = useMap();

  useEffect(() => {
    if (!zones.length) return;
    const bounds: LatLngBoundsExpression = zones.map((zone) => [zone.latitude, zone.longitude]);
    map.fitBounds(bounds, { padding: [36, 36], maxZoom: 11 });
  }, [map, zones]);

  return null;
}

export default function HotspotLeafletMap({ zones, selectedZoneId, overlays, onSelectZone }: HotspotLeafletMapProps) {
  return (
    <MapContainer center={[22.6, 79.5]} zoom={5} scrollWheelZoom className="h-full w-full" zoomControl>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitVisibleZones zones={zones} />

      {overlays.landUse && zones.map((zone, index) => (
        <Circle
          key={`land-use-${zone.id}`}
          center={[zone.latitude, zone.longitude]}
          radius={3500}
          pathOptions={{
            color: landUseColors[index % landUseColors.length],
            fillColor: landUseColors[index % landUseColors.length],
            fillOpacity: 0.09,
            weight: 1,
          }}
        />
      ))}

      {overlays.satellite && zones.filter((zone) => zone.predicted_aqi_24h > 200).map((zone) => (
        <Circle
          key={`risk-${zone.id}`}
          center={[zone.latitude, zone.longitude]}
          radius={Math.max(4500, zone.predicted_aqi_24h * 22)}
          pathOptions={{
            color: zone.predicted_aqi_24h > 300 ? "#7e22ce" : "#ef4444",
            fillColor: zone.predicted_aqi_24h > 300 ? "#a855f7" : "#f87171",
            fillOpacity: 0.12,
            dashArray: "6 5",
            weight: 1.5,
          }}
        />
      ))}

      {overlays.aqi && zones.map((zone) => {
        const selected = zone.id === selectedZoneId;
        const color = categoryColors[zone.category] ?? "#64748b";
        return (
          <CircleMarker
            key={zone.id}
            center={[zone.latitude, zone.longitude]}
            radius={selected ? 13 : 9}
            pathOptions={{ color: selected ? "#0f172a" : "#ffffff", fillColor: color, fillOpacity: 0.95, weight: selected ? 3 : 2 }}
            eventHandlers={{ click: () => onSelectZone(zone) }}
          >
            <Tooltip direction="top" offset={[0, -8]} opacity={1}>
              <div className="text-sm">
                <strong>{zone.zone}</strong><br />AQI {Math.round(zone.current_aqi)} · {zone.category}
              </div>
            </Tooltip>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
