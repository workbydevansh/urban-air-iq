"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import Badge, { categoryTone } from "@/components/Badge";
import Card from "@/components/Card";
import ErrorState from "@/components/ErrorState";
import LoadingState from "@/components/LoadingState";
import { api, type Action, type Forecast, type Overview, type Zone } from "@/lib/api";

type DashboardData = {
  overview: Overview;
  zones: Zone[];
  forecast: Forecast;
  actions: Action[];
};

const categoryFromAqi = (aqi: number) => {
  if (aqi <= 50) return "Good";
  if (aqi <= 100) return "Satisfactory";
  if (aqi <= 200) return "Moderate";
  if (aqi <= 300) return "Poor";
  if (aqi <= 400) return "Very Poor";
  return "Severe";
};

const average = (values: number[]) => (values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0);

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCity, setSelectedCity] = useState("All Cities");

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [overview, zones, forecast, actions] = await Promise.all([
        api.overview(),
        api.zones(),
        api.forecast(),
        api.actions(),
      ]);
      setData({ overview, zones, forecast, actions });
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to reach the UrbanAir IQ backend.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const cities = useMemo(
    () => ["All Cities", ...Array.from(new Set(data?.zones.map((zone) => zone.city) ?? [])).sort()],
    [data],
  );

  const filteredZones = useMemo(
    () => data?.zones.filter((zone) => selectedCity === "All Cities" || zone.city === selectedCity) ?? [],
    [data, selectedCity],
  );

  const summary = useMemo(() => {
    if (!data) return null;
    if (selectedCity === "All Cities") return data.overview;

    const current = average(filteredZones.map((zone) => zone.current_aqi));
    const forecast24 = average(filteredZones.map((zone) => zone.predicted_aqi_24h));
    const forecast48 = average(filteredZones.map((zone) => zone.predicted_aqi_48h));
    const forecast72 = average(filteredZones.map((zone) => zone.predicted_aqi_72h));
    const sourceCounts = filteredZones.reduce<Record<string, number>>((counts, zone) => {
      counts[zone.main_source] = (counts[zone.main_source] ?? 0) + 1;
      return counts;
    }, {});
    const dominantSource = Object.entries(sourceCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "Unknown";
    const pollutantMap: Record<string, string> = {
      "Traffic emissions": "NO2",
      "Construction dust": "PM10",
      "Industrial emissions": "SO2",
      "Waste burning / fine particulate accumulation": "PM2.5",
      "Meteorological stagnation": "PM2.5",
    };
    const peaks = filteredZones.map((zone) => Math.max(zone.current_aqi, zone.predicted_aqi_24h, zone.predicted_aqi_48h, zone.predicted_aqi_72h));

    return {
      city: selectedCity,
      current_aqi: current,
      predicted_aqi_24h: forecast24,
      predicted_aqi_48h: forecast48,
      predicted_aqi_72h: forecast72,
      severe_zones: peaks.filter((value) => value > 400).length,
      main_pollutant: pollutantMap[dominantSource] ?? "PM2.5",
      risk_level: categoryFromAqi(Math.max(forecast24, forecast48, forecast72)),
      action_required: peaks.some((value) => value > 200),
    } satisfies Overview;
  }, [data, filteredZones, selectedCity]);

  const chartData = useMemo(() => {
    if (!summary) return [];
    return [
      { horizon: "Now", aqi: Math.round(summary.current_aqi) },
      { horizon: "24h", aqi: Math.round(summary.predicted_aqi_24h) },
      { horizon: "48h", aqi: Math.round(summary.predicted_aqi_48h) },
      { horizon: "72h", aqi: Math.round(summary.predicted_aqi_72h) },
    ];
  }, [summary]);

  const topHotspots = useMemo(
    () => [...filteredZones].sort((a, b) => b.current_aqi - a.current_aqi).slice(0, 5),
    [filteredZones],
  );

  const quickActions = useMemo(() => {
    if (!data) return [];
    const zoneNames = new Set(filteredZones.map((zone) => zone.zone));
    return data.actions.filter((action) => zoneNames.has(action.zone)).sort((a, b) => b.priority_score - a.priority_score).slice(0, 4);
  }, [data, filteredZones]);

  if (loading) return <LoadingState />;
  if (error || !data || !summary) return <ErrorState message={error ?? undefined} onRetry={loadDashboard} />;

  const riskIsHigh = ["Poor", "Very Poor", "Severe"].includes(summary.risk_level);

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-teal-700">Command dashboard</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            UrbanAir IQ - Smart City Air Quality Intelligence
          </h1>
          <p className="mt-2 text-sm text-slate-500">Offline AI forecasts and intervention signals for urban decision-makers.</p>
        </div>
        <label className="w-full text-sm font-medium text-slate-700 sm:w-52">
          City
          <select
            value={selectedCity}
            onChange={(event) => setSelectedCity(event.target.value)}
            className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm shadow-sm"
          >
            {cities.map((city) => <option key={city}>{city}</option>)}
          </select>
        </label>
      </div>

      {riskIsHigh && (
        <div className="flex items-start gap-3 rounded-xl border border-orange-200 bg-orange-50 px-5 py-4 text-orange-900" role="alert">
          <span className="mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full bg-orange-500" />
          <div>
            <p className="font-semibold">High air-quality risk detected</p>
            <p className="mt-1 text-sm text-orange-800">
              The {selectedCity === "All Cities" ? "network" : selectedCity} forecast is {summary.risk_level.toLowerCase()}. Review priority zones and activate recommended controls.
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <MetricCard label="Current AQI" value={Math.round(summary.current_aqi)} detail={categoryFromAqi(summary.current_aqi)} />
        <MetricCard label="24h Forecast AQI" value={Math.round(summary.predicted_aqi_24h)} detail={categoryFromAqi(summary.predicted_aqi_24h)} />
        <MetricCard label="Severe Zones" value={summary.severe_zones} detail="AQI above 400" />
        <MetricCard label="Main Pollutant" value={summary.main_pollutant} detail="Dominant signal" />
        <MetricCard label="Action Required" value={summary.action_required ? "Yes" : "No"} detail={summary.action_required ? "Review controls" : "Continue monitoring"} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card title="AQI Forecast" description={`Average AQI trajectory for ${selectedCity}`} className="lg:col-span-2">
          <div className="h-72 px-3 pb-4 pt-5 sm:px-5">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 12, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="horizon" tick={{ fill: "#64748b", fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#64748b", fontSize: 12 }} axisLine={false} tickLine={false} domain={[0, "dataMax + 50"]} />
                <Tooltip contentStyle={{ borderRadius: 8, borderColor: "#cbd5e1", fontSize: 13 }} />
                <Line type="monotone" dataKey="aqi" name="AQI" stroke="#0d9488" strokeWidth={3} dot={{ r: 4, fill: "#0d9488" }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Quick Actions" description="Highest-priority recommended controls">
          <div className="divide-y divide-slate-100 px-5">
            {quickActions.map((action) => (
              <div key={`${action.zone}-${action.action}`} className="py-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-900">{action.zone}</p>
                  <Badge tone={action.priority_score >= 90 ? "severe" : action.priority_score >= 75 ? "very-poor" : "poor"}>
                    Score {action.priority_score}
                  </Badge>
                </div>
                <p className="mt-2 text-sm leading-5 text-slate-600">{action.action}</p>
                <p className="mt-1 text-xs text-slate-400">{action.department}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card title="Top Hotspot Zones" description="Zones ranked by current AQI">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3 font-semibold">Zone</th>
                <th className="px-5 py-3 font-semibold">City</th>
                <th className="px-5 py-3 font-semibold">Current AQI</th>
                <th className="px-5 py-3 font-semibold">24h Forecast</th>
                <th className="px-5 py-3 font-semibold">Trend</th>
                <th className="px-5 py-3 font-semibold">Likely Source</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {topHotspots.map((zone) => (
                <tr key={zone.id} className="hover:bg-slate-50/70">
                  <td className="px-5 py-4 font-semibold text-slate-900">{zone.zone}</td>
                  <td className="px-5 py-4 text-slate-600">{zone.city}</td>
                  <td className="px-5 py-4"><Badge tone={categoryTone(zone.category)}>{Math.round(zone.current_aqi)} · {zone.category}</Badge></td>
                  <td className="px-5 py-4 font-medium text-slate-700">{Math.round(zone.predicted_aqi_24h)}</td>
                  <td className="px-5 py-4 text-slate-600">{zone.trend}</td>
                  <td className="px-5 py-4 text-slate-600">{zone.main_source}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function MetricCard({ label, value, detail }: { label: string; value: string | number; detail: string }) {
  const category = typeof value === "number" && label.includes("AQI") ? categoryFromAqi(value) : null;
  return (
    <Card className="p-5">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <div className="mt-3 flex items-end justify-between gap-3">
        <p className="text-2xl font-bold tracking-tight text-slate-900">{value}</p>
        {category && <span className={`h-3 w-3 rounded-full ${aqiDot(category)}`} aria-hidden="true" />}
      </div>
      <p className="mt-2 text-xs font-medium text-slate-500">{detail}</p>
    </Card>
  );
}

function aqiDot(category: string) {
  return {
    Good: "bg-emerald-500",
    Satisfactory: "bg-lime-500",
    Moderate: "bg-yellow-400",
    Poor: "bg-orange-500",
    "Very Poor": "bg-red-500",
    Severe: "bg-purple-600",
  }[category] ?? "bg-slate-400";
}
