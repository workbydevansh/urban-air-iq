"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import Badge, { categoryTone } from "@/components/Badge";
import Card from "@/components/Card";
import ErrorState from "@/components/ErrorState";
import LoadingState from "@/components/LoadingState";
import { api, type Forecast, type Zone } from "@/lib/api";

type ForecastRow = {
  id: string;
  zone: string;
  city: string;
  current: number;
  aqi24: number;
  aqi48: number;
  aqi72: number;
  trend: string;
  riskCategory: string;
  confidence: number;
};

const average = (values: number[]) => values.length
  ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
  : 0;

function getCategory(aqi: number) {
  if (aqi <= 50) return "Good";
  if (aqi <= 100) return "Satisfactory";
  if (aqi <= 200) return "Moderate";
  if (aqi <= 300) return "Poor";
  if (aqi <= 400) return "Very Poor";
  return "Severe";
}

export default function AQIForecastPage() {
  const [forecast, setForecast] = useState<Forecast | null>(null);
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadForecast = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [forecastData, zoneData] = await Promise.all([api.forecast(), api.zones()]);
      setForecast(forecastData);
      setZones(zoneData);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load AQI forecast data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadForecast();
  }, [loadForecast]);

  const rows = useMemo<ForecastRow[]>(() => {
    if (!forecast) return [];
    const horizon48 = new Map(forecast["48h"].map((point) => [`${point.city}:${point.zone}`, point]));
    const horizon72 = new Map(forecast["72h"].map((point) => [`${point.city}:${point.zone}`, point]));

    return forecast["24h"].map((point) => {
      const key = `${point.city}:${point.zone}`;
      const zone = zones.find((item) => item.city === point.city && item.zone === point.zone);
      const point48 = horizon48.get(key);
      const point72 = horizon72.get(key);
      const current = zone?.current_aqi ?? point.aqi;
      const aqi48 = point48?.aqi ?? point.aqi;
      const aqi72 = point72?.aqi ?? aqi48;
      const peak = Math.max(current, point.aqi, aqi48, aqi72);
      const confidence = average([point.confidence, point48?.confidence ?? point.confidence, point72?.confidence ?? point.confidence]);

      return {
        id: zone?.id ?? key,
        zone: point.zone,
        city: point.city,
        current,
        aqi24: point.aqi,
        aqi48,
        aqi72,
        trend: point.trend,
        riskCategory: getCategory(peak),
        confidence,
      };
    }).sort((a, b) => Math.max(b.current, b.aqi24, b.aqi48, b.aqi72) - Math.max(a.current, a.aqi24, a.aqi48, a.aqi72));
  }, [forecast, zones]);

  const averageForecast = useMemo(() => [
    { horizon: "Current", aqi: average(rows.map((row) => row.current)) },
    { horizon: "24h", aqi: average(rows.map((row) => row.aqi24)) },
    { horizon: "48h", aqi: average(rows.map((row) => row.aqi48)) },
    { horizon: "72h", aqi: average(rows.map((row) => row.aqi72)) },
  ], [rows]);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={loadForecast} />;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wider text-teal-700">Predictive intelligence</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">AQI Forecast</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-500">
          Compare current conditions with 24, 48, and 72-hour AQI predictions across monitored zones.
        </p>
      </div>

      <div className="rounded-xl border border-teal-200 bg-teal-50 px-5 py-4 text-sm leading-6 text-teal-900">
        <span className="font-semibold">How the forecast works: </span>
        This model forecasts AQI using historical AQI, pollutant levels, time features, and station/city patterns.
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Average AQI Outlook" description="Network-wide forecast across all monitoring stations">
          <div className="h-80 px-3 pb-4 pt-5 sm:px-5">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={averageForecast} margin={{ top: 8, right: 14, left: -8, bottom: 0 }}>
                <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="horizon" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
                <YAxis domain={[0, "dataMax + 60"]} axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
                <Tooltip contentStyle={{ borderRadius: 8, borderColor: "#cbd5e1", fontSize: 13 }} />
                <Line type="monotone" dataKey="aqi" name="Average AQI" stroke="#0d9488" strokeWidth={3} dot={{ fill: "#0d9488", r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Zone-wise Predicted AQI" description="Forecast comparison by zone and horizon">
          <div className="h-[440px] px-3 pb-4 pt-5 sm:px-5">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 14, left: 12, bottom: 0 }} barCategoryGap={7}>
                <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 11 }} />
                <YAxis type="category" dataKey="zone" width={96} axisLine={false} tickLine={false} tick={{ fill: "#475569", fontSize: 11 }} />
                <Tooltip contentStyle={{ borderRadius: 8, borderColor: "#cbd5e1", fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                <Bar dataKey="aqi24" name="24h" fill="#14b8a6" radius={[0, 3, 3, 0]} />
                <Bar dataKey="aqi48" name="48h" fill="#3b82f6" radius={[0, 3, 3, 0]} />
                <Bar dataKey="aqi72" name="72h" fill="#8b5cf6" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card title="Forecast by Zone" description={`${rows.length} monitoring stations · Local offline forecast data`}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3 font-semibold">Zone</th>
                <th className="px-5 py-3 font-semibold">Current AQI</th>
                <th className="px-5 py-3 font-semibold">24h AQI</th>
                <th className="px-5 py-3 font-semibold">48h AQI</th>
                <th className="px-5 py-3 font-semibold">72h AQI</th>
                <th className="px-5 py-3 font-semibold">Trend</th>
                <th className="px-5 py-3 font-semibold">Risk Category</th>
                <th className="px-5 py-3 font-semibold">Confidence</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50/70">
                  <td className="px-5 py-4">
                    <p className="font-semibold text-slate-900">{row.zone}</p>
                    <p className="mt-0.5 text-xs text-slate-400">{row.city}</p>
                  </td>
                  <td className="px-5 py-4 font-medium text-slate-700">{Math.round(row.current)}</td>
                  <td className="px-5 py-4 font-medium text-slate-700">{Math.round(row.aqi24)}</td>
                  <td className="px-5 py-4 font-medium text-slate-700">{Math.round(row.aqi48)}</td>
                  <td className="px-5 py-4 font-medium text-slate-700">{Math.round(row.aqi72)}</td>
                  <td className="px-5 py-4 text-slate-600">{row.trend}</td>
                  <td className="px-5 py-4"><Badge tone={categoryTone(row.riskCategory)}>{row.riskCategory}</Badge></td>
                  <td className="px-5 py-4 text-slate-600">{row.confidence}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
