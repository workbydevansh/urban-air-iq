"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import Badge, { categoryTone } from "@/components/Badge";
import Card from "@/components/Card";
import ErrorState from "@/components/ErrorState";
import LoadingState from "@/components/LoadingState";
import { api, type Advisory, type Zone } from "@/lib/api";

type Language = "english" | "hindi";

type Guidance = {
  lead: string;
  healthRisk: string;
  children: string;
  elderly: string;
  respiratory: string;
  outdoor: string;
  maskWindow: string;
  citizens: string;
  schools: string;
  hospitals: string;
};

const categoryOrder = ["Good", "Satisfactory", "Moderate", "Poor", "Very Poor", "Severe"];

function getCategory(aqi: number) {
  if (aqi <= 50) return "Good";
  if (aqi <= 100) return "Satisfactory";
  if (aqi <= 200) return "Moderate";
  if (aqi <= 300) return "Poor";
  if (aqi <= 400) return "Very Poor";
  return "Severe";
}

function buildGuidance(category: string, forecastCategory: string, language: Language, zone: string): Guidance {
  const severity = Math.max(0, categoryOrder.indexOf(category));
  const elevated = severity >= 2;
  const high = severity >= 3;
  const veryHigh = severity >= 4;

  if (language === "hindi") {
    return {
      lead: `${zone} me agle 24 ghanto me AQI ${forecastCategory} rehne ki sambhavna hai. ${high ? "Bachche, elderly aur asthma patients outdoor activity avoid karein." : "Sensitive log outdoor activity me savdhani rakhein."}`,
      healthRisk: veryHigh
        ? "Health risk bahut zyada hai. Saans me takleef, khansi ya aankhon me jalan ho sakti hai."
        : high
          ? "Health risk high hai, khaaskar sensitive groups ke liye."
          : elevated
            ? "Sensitive logon ke liye moderate health risk hai."
            : "Health risk low hai; normal activity jaari rakh sakte hain.",
      children: high ? "Bachchon ko outdoor games aur sports se bachayein." : elevated ? "Lambi outdoor activity kam rakhein." : "Normal school aur play activity theek hai.",
      elderly: high ? "Elderly log ghar ke andar rahein aur zaroori medicines paas rakhein." : elevated ? "Thakaan ya saans ki dikkat par outdoor time kam karein." : "Normal routine jaari rakh sakte hain.",
      respiratory: elevated ? "Asthma/respiratory patients inhaler paas rakhein aur symptoms par doctor se baat karein." : "Routine medicines aur normal precautions follow karein.",
      outdoor: veryHigh ? "Outdoor exercise bilkul avoid karein." : high ? "Outdoor activity minimum rakhein, especially peak pollution hours me." : elevated ? "Heavy outdoor exercise kam karein." : "Outdoor activity safe hai.",
      maskWindow: high ? "Bahar N95 mask pehnein; peak hours me khidkiyan band rakhein aur indoor air clean rakhein." : elevated ? "Busy roads par mask use karein aur ventilation AQI ke hisaab se manage karein." : "Mask ki zaroorat nahi; ghar me normal ventilation rakhein.",
      citizens: high ? "Peak pollution hours me bahar kam niklein, public transport use karein aur kachra na jalayein." : "Local AQI updates dekhein aur clean-air habits follow karein.",
      schools: high ? "Outdoor assembly aur sports rok dein; sensitive students ke parents ko alert bhejein." : elevated ? "Outdoor sports ka time kam karein aur sensitive students ko breaks dein." : "Normal schedule rakhein aur AQI monitor karein.",
      hospitals: high ? "Respiratory triage ready rakhein, oxygen supply check karein aur high-risk patients ko advisory dein." : "Respiratory symptoms monitor karein aur routine preparedness maintain karein.",
    };
  }

  return {
    lead: `${zone} may experience ${forecastCategory} AQI over the next 24 hours. ${high ? "Children, older adults, and people with asthma should avoid outdoor activity." : "Sensitive residents should use reasonable precautions."}`,
    healthRisk: veryHigh
      ? "Very high health risk. Breathing discomfort, coughing, and eye irritation may affect the wider population."
      : high
        ? "High health risk, especially for children, older adults, and people with heart or lung conditions."
        : elevated
          ? "Moderate health risk for sensitive groups during prolonged exposure."
          : "Low health risk. Normal daily activity can continue.",
    children: high ? "Keep children indoors and pause outdoor sports." : elevated ? "Reduce prolonged outdoor play and provide regular breaks." : "Normal school and play activity is suitable.",
    elderly: high ? "Remain indoors where possible and keep prescribed medicine available." : elevated ? "Reduce outdoor time if tiredness or breathing discomfort occurs." : "Normal routines can continue.",
    respiratory: elevated ? "Keep inhalers available, follow the treatment plan, and seek care if symptoms worsen." : "Continue regular medication and routine precautions.",
    outdoor: veryHigh ? "Avoid all strenuous outdoor exercise." : high ? "Minimize outdoor activity, particularly during peak pollution hours." : elevated ? "Reduce heavy outdoor exertion." : "Outdoor activity is generally safe.",
    maskWindow: high ? "Use a well-fitted N95 mask outdoors; keep windows closed during peak hours and use indoor filtration if available." : elevated ? "Consider a mask near busy roads and adjust ventilation using local AQI updates." : "A mask is not required; normal ventilation is appropriate.",
    citizens: high ? "Limit travel during peak hours, use public transport, and do not burn waste." : "Check local AQI updates and continue clean-air practices.",
    schools: high ? "Pause outdoor assembly and sports, and alert families of sensitive students." : elevated ? "Shorten outdoor sports and provide indoor alternatives for sensitive students." : "Continue the normal schedule while monitoring AQI.",
    hospitals: high ? "Prepare respiratory triage, verify oxygen supplies, and alert high-risk patients." : "Monitor respiratory complaints and maintain routine preparedness.",
  };
}

export default function CitizenAdvisoryPage() {
  const [zones, setZones] = useState<Zone[]>([]);
  const [selectedZoneName, setSelectedZoneName] = useState("");
  const [language, setLanguage] = useState<Language>("english");
  const [advisory, setAdvisory] = useState<Advisory | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadInitialData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const zoneData = await api.zones();
      const initialZone = zoneData[0]?.zone ?? "Citywide";
      setZones(zoneData);
      setSelectedZoneName(initialZone);
      setAdvisory(await api.advisory(initialZone, "english"));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load citizen advisory data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadInitialData();
  }, [loadInitialData]);

  const generateAdvisory = async () => {
    if (!selectedZoneName) return;
    setGenerating(true);
    setError(null);
    try {
      setAdvisory(await api.advisory(selectedZoneName, language));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to generate the selected advisory.");
    } finally {
      setGenerating(false);
    }
  };

  const selectedZone = useMemo(
    () => zones.find((zone) => zone.zone === selectedZoneName),
    [selectedZoneName, zones],
  );
  const forecastCategory = getCategory(selectedZone?.predicted_aqi_24h ?? advisory?.current_aqi ?? 0);
  const guidance = advisory
    ? buildGuidance(advisory.category, forecastCategory, advisory.language, advisory.zone)
    : null;

  if (loading) return <LoadingState />;
  if (error && !advisory) return <ErrorState message={error} onRetry={loadInitialData} />;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wider text-teal-700">Public health information</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">Citizen Advisory</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-500">
          Clear, local air-quality guidance for residents, schools, and healthcare facilities.
        </p>
      </div>

      <Card className="p-5">
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_200px_auto] sm:items-end">
          <label className="text-sm font-medium text-slate-700">
            Zone
            <select
              value={selectedZoneName}
              onChange={(event) => setSelectedZoneName(event.target.value)}
              className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm shadow-sm"
            >
              {zones.map((zone) => <option key={zone.id} value={zone.zone}>{zone.zone} · {zone.city}</option>)}
            </select>
          </label>
          <label className="text-sm font-medium text-slate-700">
            Language
            <select
              value={language}
              onChange={(event) => setLanguage(event.target.value as Language)}
              className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm shadow-sm"
            >
              <option value="english">English</option>
              <option value="hindi">Hindi</option>
            </select>
          </label>
          <button
            type="button"
            onClick={() => void generateAdvisory()}
            disabled={generating}
            className="rounded-lg bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-teal-700 disabled:opacity-60"
          >
            {generating ? "Loading..." : "Get Advisory"}
          </button>
        </div>
      </Card>

      {error && <ErrorState message={error} onRetry={() => void generateAdvisory()} />}

      {advisory && guidance && (
        <>
          <Card className={`overflow-hidden border-l-4 ${categoryBorder(advisory.category)}`}>
            <div className="p-6">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                <div>
                  <p className="text-sm font-medium text-slate-500">Advisory for {advisory.zone}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    <p className="text-4xl font-bold text-slate-900">AQI {Math.round(advisory.current_aqi)}</p>
                    <Badge tone={categoryTone(advisory.category)}>{advisory.category}</Badge>
                  </div>
                  <p className="mt-2 text-xs text-slate-400">24h forecast category: {forecastCategory}</p>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-600">
                  {advisory.language === "hindi" ? "Hindi" : "English"}
                </span>
              </div>
              <p className="mt-5 max-w-4xl text-lg font-semibold leading-8 text-slate-800">{guidance.lead}</p>
              <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-500">{advisory.message}</p>
            </div>
          </Card>

          <Card title={advisory.language === "hindi" ? "Health guidance / Swasthya salah" : "Health Guidance"}>
            <dl className="grid sm:grid-cols-2">
              <GuidanceItem label={advisory.language === "hindi" ? "Health risk" : "Health risk"} value={guidance.healthRisk} />
              <GuidanceItem label={advisory.language === "hindi" ? "Bachche" : "Children"} value={guidance.children} />
              <GuidanceItem label={advisory.language === "hindi" ? "Elderly" : "Older adults"} value={guidance.elderly} />
              <GuidanceItem label={advisory.language === "hindi" ? "Asthma / respiratory patients" : "Asthma / respiratory patients"} value={guidance.respiratory} />
              <GuidanceItem label={advisory.language === "hindi" ? "Outdoor activity" : "Outdoor activity"} value={guidance.outdoor} />
              <GuidanceItem label={advisory.language === "hindi" ? "Mask aur windows" : "Mask and windows"} value={guidance.maskWindow} />
            </dl>
          </Card>

          <div className="grid gap-4 md:grid-cols-3">
            <AudienceCard title="General Citizens" subtitle={advisory.language === "hindi" ? "Aam nagrik" : "Everyday precautions"} message={guidance.citizens} accent="teal" />
            <AudienceCard title="Schools" subtitle={advisory.language === "hindi" ? "Schools aur students" : "Student safety"} message={guidance.schools} accent="orange" />
            <AudienceCard title="Hospitals" subtitle={advisory.language === "hindi" ? "Healthcare readiness" : "Clinical preparedness"} message={guidance.hospitals} accent="purple" />
          </div>
        </>
      )}
    </div>
  );
}

function GuidanceItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-slate-100 p-5 sm:odd:border-r">
      <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-2 text-sm leading-6 text-slate-700">{value}</dd>
    </div>
  );
}

function AudienceCard({ title, subtitle, message, accent }: { title: string; subtitle: string; message: string; accent: "teal" | "orange" | "purple" }) {
  const colors = {
    teal: "bg-teal-600",
    orange: "bg-orange-500",
    purple: "bg-purple-600",
  };
  return (
    <Card className="p-5">
      <span className={`block h-1 w-10 rounded-full ${colors[accent]}`} />
      <h2 className="mt-4 text-lg font-bold text-slate-900">{title}</h2>
      <p className="mt-1 text-xs font-medium text-slate-400">{subtitle}</p>
      <p className="mt-4 text-sm leading-6 text-slate-600">{message}</p>
    </Card>
  );
}

function categoryBorder(category: string) {
  return {
    Good: "border-l-emerald-500",
    Satisfactory: "border-l-lime-500",
    Moderate: "border-l-yellow-400",
    Poor: "border-l-orange-500",
    "Very Poor": "border-l-red-500",
    Severe: "border-l-purple-600",
  }[category] ?? "border-l-slate-400";
}
