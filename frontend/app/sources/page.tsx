"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import Badge, { categoryTone } from "@/components/Badge";
import Card from "@/components/Card";
import ErrorState from "@/components/ErrorState";
import LoadingState from "@/components/LoadingState";
import { api, type SourceAttribution, type Zone } from "@/lib/api";

const SOURCE_CHART_COLORS = ["#0d9488", "#f59e0b", "#3b82f6", "#ef4444", "#8b5cf6"];

const SOURCE_PROFILES: Record<string, number[]> = {
  "Traffic emissions": [62, 12, 8, 8, 10],
  "Construction dust": [15, 58, 8, 7, 12],
  "Industrial emissions": [12, 8, 61, 7, 12],
  "Waste burning / fine particulate accumulation": [12, 10, 9, 53, 16],
  "Meteorological stagnation": [18, 12, 11, 15, 44],
};

const SOURCE_LABELS = [
  "Traffic",
  "Construction Dust",
  "Industrial Emissions",
  "Waste Burning",
  "Meteorological Stagnation",
];

const evidenceRules = [
  {
    signal: "NO2 and CO",
    source: "Traffic emissions",
    reason: "These gases commonly rise together near vehicle exhaust and congested roads.",
  },
  {
    signal: "PM10",
    source: "Construction dust",
    reason: "High coarse particles are consistent with exposed soil, road dust, and construction activity.",
  },
  {
    signal: "SO2",
    source: "Industrial emissions",
    reason: "Elevated SO2 can indicate fuel combustion from industrial units.",
  },
  {
    signal: "PM2.5 and high AQI",
    source: "Waste burning",
    reason: "Fine-particle buildup is consistent with local burning or accumulated combustion pollution.",
  },
  {
    signal: "AQI trend and dispersion",
    source: "Meteorological stagnation",
    reason: "Rising AQI with weak dispersion allows pollution to accumulate across a wider area.",
  },
];

function sourceMatches(mainSource: string, likelySource: string) {
  if (likelySource === "Waste burning") return mainSource.startsWith("Waste burning");
  return mainSource === likelySource;
}

export default function SourceAttributionPage() {
  const [attributions, setAttributions] = useState<SourceAttribution[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [selectedZoneName, setSelectedZoneName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAttribution = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [attributionData, zoneData] = await Promise.all([api.sourceAttribution(), api.zones()]);
      setAttributions(attributionData);
      setZones(zoneData);
      setSelectedZoneName((current) => current || attributionData[0]?.zone || "");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load source-attribution data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAttribution();
  }, [loadAttribution]);

  const selectedAttribution = useMemo(
    () => attributions.find((item) => item.zone === selectedZoneName) ?? attributions[0],
    [attributions, selectedZoneName],
  );
  const selectedZone = useMemo(
    () => zones.find((zone) => zone.zone === selectedAttribution?.zone),
    [selectedAttribution, zones],
  );

  const chartData = useMemo(() => {
    const profile = SOURCE_PROFILES[selectedAttribution?.main_source ?? ""] ?? [20, 20, 20, 20, 20];
    return SOURCE_LABELS.map((source, index) => ({ source, contribution: profile[index] }));
  }, [selectedAttribution]);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={loadAttribution} />;
  if (!selectedAttribution) return <ErrorState message="No source-attribution records are available." onRetry={loadAttribution} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-teal-700">Emission intelligence</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">Source Attribution</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-500">
            Understand the strongest pollution signals behind each monitoring zone.
          </p>
        </div>
        <label className="w-full text-sm font-medium text-slate-700 sm:w-64">
          Select zone
          <select
            value={selectedAttribution.zone}
            onChange={(event) => setSelectedZoneName(event.target.value)}
            className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm shadow-sm"
          >
            {attributions.map((item) => <option key={item.zone}>{item.zone}</option>)}
          </select>
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-5 sm:col-span-1">
          <p className="text-sm font-medium text-slate-500">Main pollution source</p>
          <p className="mt-3 text-xl font-bold leading-7 text-slate-900">{selectedAttribution.main_source}</p>
          <p className="mt-2 text-xs text-slate-400">Strongest rule-based attribution</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm font-medium text-slate-500">Confidence score</p>
          <p className="mt-3 text-3xl font-bold text-slate-900">{Math.round(selectedAttribution.confidence)}%</p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-teal-600" style={{ width: `${Math.min(selectedAttribution.confidence, 100)}%` }} />
          </div>
        </Card>
        <Card className="p-5">
          <p className="text-sm font-medium text-slate-500">AQI category</p>
          <div className="mt-4">
            <Badge tone={categoryTone(selectedZone?.category ?? "Unknown")}>{selectedZone?.category ?? "Unknown"}</Badge>
          </div>
          <p className="mt-3 text-xs text-slate-400">Current AQI: {Math.round(selectedZone?.current_aqi ?? 0)}</p>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,1fr)]">
        <Card title="Estimated Source Contribution" description="Relative contribution profile for the selected zone">
          <div className="h-[360px] px-3 pb-4 pt-5 sm:px-5">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 28, left: 32, bottom: 0 }} barCategoryGap={12}>
                <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} unit="%" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 11 }} />
                <YAxis type="category" dataKey="source" width={145} axisLine={false} tickLine={false} tick={{ fill: "#475569", fontSize: 11 }} />
                <Tooltip formatter={(value) => [`${value}%`, "Contribution"]} contentStyle={{ borderRadius: 8, borderColor: "#cbd5e1", fontSize: 12 }} />
                <Bar dataKey="contribution" radius={[0, 5, 5, 0]}>
                  {chartData.map((entry, index) => <Cell key={entry.source} fill={SOURCE_CHART_COLORS[index]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Evidence Summary" description="Signals supporting this attribution">
          <div className="space-y-3 p-5">
            {selectedAttribution.evidence.map((evidence, index) => (
              <div key={`${index}-${evidence}`} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-100 text-xs font-bold text-teal-700">{index + 1}</span>
                  <p className="text-sm leading-6 text-slate-700">{evidence}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card title="Evidence Rules" description="Simple signals used by the attribution engine">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3 font-semibold">Signal</th>
                <th className="px-5 py-3 font-semibold">Observation</th>
                <th className="px-5 py-3 font-semibold">Likely source</th>
                <th className="px-5 py-3 font-semibold">Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {evidenceRules.map((rule) => {
                const dominant = sourceMatches(selectedAttribution.main_source, rule.source);
                return (
                  <tr key={rule.signal} className={dominant ? "bg-teal-50/60" : "hover:bg-slate-50/70"}>
                    <td className="px-5 py-4 font-semibold text-slate-900">{rule.signal}</td>
                    <td className="px-5 py-4 text-slate-600">{dominant ? "Strongest signal for this zone" : "Rule checked; not dominant"}</td>
                    <td className="px-5 py-4"><Badge tone={dominant ? "poor" : "neutral"}>{rule.source}</Badge></td>
                    <td className="max-w-md px-5 py-4 leading-6 text-slate-600">{rule.reason}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
