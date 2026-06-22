"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import Card from "@/components/Card";
import ErrorState from "@/components/ErrorState";
import LoadingState from "@/components/LoadingState";
import { api, type ReportMetric } from "@/lib/api";

const evaluationStrategy = [
  "Forecast accuracy measured using RMSE and MAE",
  "Compared against persistence baseline",
  "Source attribution uses rule-based evidence confidence",
  "Recommendation quality based on AQI severity, trend, vulnerability, source confidence, feasibility",
  "Response time from signal to intervention is reduced by automated action center",
];

const average = (values: number[]) => values.length
  ? values.reduce((sum, value) => sum + value, 0) / values.length
  : 0;

export default function ReportsPage() {
  const [metrics, setMetrics] = useState<ReportMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadReports = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setMetrics(await api.reports());
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load model reports.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

  const summary = useMemo(() => ({
    model: Array.from(new Set(metrics.map((metric) => metric.model_name))).join(", ") || "Unavailable",
    rmse: average(metrics.map((metric) => metric.rmse)),
    improvement: average(metrics.map((metric) => metric.improvement_percentage)),
    confidence: average(metrics.map((metric) => metric.confidence)),
  }), [metrics]);

  const exportReport = () => {
    const report = {
      report_name: "UrbanAir IQ Model Evaluation Report",
      generated_at: new Date().toISOString(),
      model_metrics: metrics,
      evaluation_strategy: evaluationStrategy,
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "urban-air-iq-model-report.json";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={loadReports} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-teal-700">Model transparency</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">Reports</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-500">
            Review forecast accuracy, baseline improvement, and the UrbanAir IQ evaluation approach.
          </p>
        </div>
        <button
          type="button"
          onClick={exportReport}
          className="rounded-lg bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-teal-700"
        >
          Export Report
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Best model" value={summary.model} detail="Across all forecast horizons" />
        <MetricCard label="Average RMSE" value={summary.rmse.toFixed(2)} detail="Lower values indicate less error" />
        <MetricCard label="Average improvement" value={`${summary.improvement.toFixed(1)}%`} detail="Compared with persistence baseline" />
        <MetricCard label="Model confidence" value={`${summary.confidence.toFixed(0)}%`} detail="Default offline forecast confidence" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(340px,1fr)]">
        <Card title="RMSE by Forecast Horizon" description="Model error compared with the persistence baseline">
          <div className="h-80 px-3 pb-4 pt-5 sm:px-5">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics} margin={{ top: 8, right: 16, left: -4, bottom: 0 }} barGap={6}>
                <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="forecast" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 11 }} />
                <Tooltip formatter={(value) => Number(value).toFixed(2)} contentStyle={{ borderRadius: 8, borderColor: "#cbd5e1", fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                <Bar dataKey="rmse" name="Model RMSE" fill="#0d9488" radius={[5, 5, 0, 0]} />
                <Bar dataKey="baseline_rmse" name="Baseline RMSE" fill="#94a3b8" radius={[5, 5, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Evaluation Strategy" description="How system quality is measured">
          <div className="divide-y divide-slate-100 px-5">
            {evaluationStrategy.map((item, index) => (
              <div key={item} className="flex gap-3 py-4">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-100 text-xs font-bold text-teal-700">{index + 1}</span>
                <p className="text-sm leading-6 text-slate-700">{item}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card title="Model Performance Metrics" description="Values loaded from model_summary.csv through the offline FastAPI backend">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3 font-semibold">Forecast Horizon</th>
                <th className="px-5 py-3 font-semibold">Best Model</th>
                <th className="px-5 py-3 font-semibold">RMSE</th>
                <th className="px-5 py-3 font-semibold">MAE</th>
                <th className="px-5 py-3 font-semibold">R2</th>
                <th className="px-5 py-3 font-semibold">Baseline RMSE</th>
                <th className="px-5 py-3 font-semibold">Improvement %</th>
                <th className="px-5 py-3 font-semibold">Confidence</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {metrics.map((metric) => (
                <tr key={metric.forecast} className="hover:bg-slate-50/70">
                  <td className="px-5 py-4 font-semibold text-slate-900">{metric.forecast}</td>
                  <td className="px-5 py-4 text-slate-700">{metric.model_name}</td>
                  <td className="px-5 py-4 text-slate-600">{metric.rmse.toFixed(2)}</td>
                  <td className="px-5 py-4 text-slate-600">{metric.mae.toFixed(2)}</td>
                  <td className="px-5 py-4 text-slate-600">{metric.r2.toFixed(3)}</td>
                  <td className="px-5 py-4 text-slate-600">{metric.baseline_rmse.toFixed(2)}</td>
                  <td className="px-5 py-4 font-semibold text-emerald-700">{metric.improvement_percentage.toFixed(1)}%</td>
                  <td className="px-5 py-4 text-slate-600">{metric.confidence.toFixed(0)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function MetricCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <Card className="p-5">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-3 text-2xl font-bold tracking-tight text-slate-900">{value}</p>
      <p className="mt-2 text-xs leading-5 text-slate-400">{detail}</p>
    </Card>
  );
}
