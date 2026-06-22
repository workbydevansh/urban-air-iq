"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";

import Badge, { categoryTone } from "@/components/Badge";
import Card from "@/components/Card";
import ErrorState from "@/components/ErrorState";
import LoadingState from "@/components/LoadingState";
import { api, type Action, type Zone } from "@/lib/api";

const HotspotLeafletMap = dynamic(() => import("@/components/HotspotLeafletMap"), {
  ssr: false,
  loading: () => <div className="flex h-full items-center justify-center bg-slate-100 text-sm text-slate-500">Loading map...</div>,
});

const CITY_CENTERS: Record<string, [number, number]> = {
  Delhi: [28.6139, 77.2090],
  Mumbai: [19.0760, 72.8777],
  Chennai: [13.0827, 80.2707],
  Kolkata: [22.5726, 88.3639],
  Bangalore: [12.9716, 77.5946],
};

const legend = [
  ["Good", "bg-green-600"],
  ["Satisfactory", "bg-lime-500"],
  ["Moderate", "bg-yellow-500"],
  ["Poor", "bg-orange-500"],
  ["Very Poor", "bg-red-600"],
  ["Severe", "bg-purple-700"],
];

type OverlayKey = "aqi" | "landUse" | "satellite";

function ensureCoordinates(zones: Zone[]): Zone[] {
  return zones.map((zone, index) => {
    if (Number.isFinite(zone.latitude) && Number.isFinite(zone.longitude) && zone.latitude !== 0 && zone.longitude !== 0) return zone;
    const [baseLatitude, baseLongitude] = CITY_CENTERS[zone.city] ?? CITY_CENTERS.Delhi;
    const offset = ((index % 5) - 2) * 0.025;
    return { ...zone, latitude: baseLatitude + offset, longitude: baseLongitude - offset * 0.8 };
  });
}

export default function HotspotMapPage() {
  const [zones, setZones] = useState<Zone[]>([]);
  const [actions, setActions] = useState<Action[]>([]);
  const [selectedZone, setSelectedZone] = useState<Zone | null>(null);
  const [categoryFilter, setCategoryFilter] = useState("All categories");
  const [sourceFilter, setSourceFilter] = useState("All sources");
  const [overlays, setOverlays] = useState({ aqi: true, landUse: false, satellite: false });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadMapData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [zoneData, actionData] = await Promise.all([api.zones(), api.actions()]);
      const locatedZones = ensureCoordinates(zoneData);
      setZones(locatedZones);
      setActions(actionData);
      setSelectedZone(locatedZones[0] ?? null);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load hotspot data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMapData();
  }, [loadMapData]);

  const categories = useMemo(() => ["All categories", ...Array.from(new Set(zones.map((zone) => zone.category)))], [zones]);
  const sources = useMemo(() => ["All sources", ...Array.from(new Set(zones.map((zone) => zone.main_source))).sort()], [zones]);
  const filteredZones = useMemo(
    () => zones.filter((zone) =>
      (categoryFilter === "All categories" || zone.category === categoryFilter)
      && (sourceFilter === "All sources" || zone.main_source === sourceFilter)),
    [categoryFilter, sourceFilter, zones],
  );

  useEffect(() => {
    if (selectedZone && filteredZones.some((zone) => zone.id === selectedZone.id)) return;
    setSelectedZone(filteredZones[0] ?? null);
  }, [filteredZones, selectedZone]);

  const recommendedAction = useMemo(
    () => actions.filter((action) => action.zone === selectedZone?.zone).sort((a, b) => b.priority_score - a.priority_score)[0],
    [actions, selectedZone],
  );

  const toggleOverlay = (overlay: OverlayKey) => {
    setOverlays((current) => ({ ...current, [overlay]: !current[overlay] }));
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={loadMapData} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-teal-700">Spatial intelligence</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">Pollution Hotspot Map</h1>
          <p className="mt-2 text-sm text-slate-500">Explore station-level AQI risk, likely sources, and recommended interventions.</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <label className="text-sm font-medium text-slate-700">
            AQI category
            <select
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
              className="mt-1 block min-w-44 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm"
            >
              {categories.map((category) => <option key={category}>{category}</option>)}
            </select>
          </label>
          <label className="text-sm font-medium text-slate-700">
            Pollution source
            <select
              value={sourceFilter}
              onChange={(event) => setSourceFilter(event.target.value)}
              className="mt-1 block min-w-56 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm"
            >
              {sources.map((source) => <option key={source}>{source}</option>)}
            </select>
          </label>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
        <Card className="overflow-hidden">
          <div className="border-b border-slate-100 px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-medium text-slate-600">Showing {filteredZones.length} of {zones.length} monitoring stations</p>
              <div className="flex flex-wrap gap-2" aria-label="Map overlays">
                <OverlayButton label="AQI Layer" active={overlays.aqi} onClick={() => toggleOverlay("aqi")} />
                <OverlayButton label="Land-use Layer" active={overlays.landUse} onClick={() => toggleOverlay("landUse")} />
                <OverlayButton label="Satellite Risk Layer" active={overlays.satellite} onClick={() => toggleOverlay("satellite")} />
              </div>
            </div>
          </div>
          <div className="relative isolate h-[620px] bg-slate-100">
            {filteredZones.length ? (
              <HotspotLeafletMap zones={filteredZones} selectedZoneId={selectedZone?.id} overlays={overlays} onSelectZone={setSelectedZone} />
            ) : (
              <div className="flex h-full items-center justify-center p-6 text-center text-sm text-slate-500">No stations match the selected filters.</div>
            )}
            <div className="absolute bottom-6 left-4 z-[500] rounded-lg border border-slate-200 bg-white/95 p-3 shadow-md backdrop-blur">
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-600">AQI Legend</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                {legend.map(([label, color]) => (
                  <div key={label} className="flex items-center gap-2 text-xs text-slate-600">
                    <span className={`h-2.5 w-2.5 rounded-full ${color}`} />{label}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>

        <Card title="Station Intelligence" description="Click an AQI marker to inspect a station">
          {selectedZone ? (
            <div className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">{selectedZone.zone}</h2>
                  <p className="mt-1 text-sm text-slate-500">{selectedZone.city}</p>
                </div>
                <Badge tone={categoryTone(selectedZone.category)}>{selectedZone.category}</Badge>
              </div>

              <div className="mt-5 rounded-lg bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Current AQI</p>
                <p className="mt-1 text-4xl font-bold text-slate-900">{Math.round(selectedZone.current_aqi)}</p>
              </div>

              <dl className="mt-5 divide-y divide-slate-100 text-sm">
                <DetailRow label="24h predicted AQI" value={Math.round(selectedZone.predicted_aqi_24h)} />
                <DetailRow label="48h predicted AQI" value={Math.round(selectedZone.predicted_aqi_48h)} />
                <DetailRow label="72h predicted AQI" value={Math.round(selectedZone.predicted_aqi_72h)} />
                <DetailRow label="Trend" value={selectedZone.trend} />
                <DetailRow label="Confidence" value={`${Math.round(selectedZone.confidence)}%`} />
                <DetailRow label="Main source" value={selectedZone.main_source} />
              </dl>

              <div className="mt-5 rounded-lg border border-teal-200 bg-teal-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-teal-700">Recommended action</p>
                <p className="mt-2 text-sm font-medium leading-6 text-teal-950">
                  {recommendedAction?.action ?? "Continue monitoring and maintain routine emission controls."}
                </p>
                {recommendedAction && <p className="mt-2 text-xs text-teal-700">Lead: {recommendedAction.department}</p>}
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-sm text-slate-500">Select a station marker to view its details.</div>
          )}
        </Card>
      </div>
    </div>
  );
}

function OverlayButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`rounded-md border px-3 py-1.5 text-xs font-semibold transition-colors ${
        active ? "border-teal-600 bg-teal-600 text-white" : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
      }`}
    >
      {label}
    </button>
  );
}

function DetailRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <dt className="text-slate-500">{label}</dt>
      <dd className="max-w-[58%] text-right font-semibold text-slate-800">{value}</dd>
    </div>
  );
}
