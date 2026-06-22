export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export type Overview = {
  city: string;
  current_aqi: number;
  predicted_aqi_24h: number;
  predicted_aqi_48h: number;
  predicted_aqi_72h: number;
  severe_zones: number;
  main_pollutant: string;
  risk_level: string;
  action_required: boolean;
};

export type Zone = {
  id: string;
  city: string;
  zone: string;
  latitude: number;
  longitude: number;
  current_aqi: number;
  predicted_aqi_24h: number;
  predicted_aqi_48h: number;
  predicted_aqi_72h: number;
  category: string;
  trend: string;
  confidence: number;
  main_source: string;
  priority: string;
};

export type ForecastPoint = {
  zone: string;
  city: string;
  aqi: number;
  category: string;
  trend: string;
  confidence: number;
};

export type Forecast = {
  source: string;
  "24h": ForecastPoint[];
  "48h": ForecastPoint[];
  "72h": ForecastPoint[];
};

export type Action = {
  priority: string;
  priority_score: number;
  zone: string;
  action: string;
  department: string;
  reason: string;
  expected_impact: string;
  status: string;
};

export type SourceAttribution = {
  zone: string;
  main_source: string;
  confidence: number;
  evidence: string[];
  contribution_breakdown: Record<string, number>;
  pollutant_contribution_percentages: Record<string, number>;
};

export type Advisory = {
  zone: string;
  language: "english" | "hindi";
  current_aqi: number;
  category: string;
  message: string;
};

export type ReportMetric = {
  forecast: string;
  rmse: number;
  mae: number;
  r2: number;
  baseline_rmse: number;
  improvement_percentage: number;
  confidence: number;
  model_name: string;
};

async function apiFetch<T>(path: string): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, { cache: "no-store" });
  } catch {
    throw new Error("Unable to connect to the UrbanAir IQ API. Please confirm the FastAPI backend is running.");
  }
  if (!response.ok) {
    throw new Error(`The UrbanAir IQ API returned an error (${response.status}). Please try again.`);
  }
  return response.json() as Promise<T>;
}

export const api = {
  overview: () => apiFetch<Overview>("/api/overview"),
  zones: () => apiFetch<Zone[]>("/api/zones"),
  forecast: () => apiFetch<Forecast>("/api/forecast"),
  actions: () => apiFetch<Action[]>("/api/actions"),
  sourceAttribution: () => apiFetch<SourceAttribution[]>("/api/source-attribution"),
  advisory: (zone: string, language: "english" | "hindi") =>
    apiFetch<Advisory>(`/api/advisory?zone=${encodeURIComponent(zone)}&language=${language}`),
  reports: () => apiFetch<ReportMetric[]>("/api/reports"),
};
