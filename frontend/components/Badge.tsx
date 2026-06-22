import type { ReactNode } from "react";

type BadgeProps = {
  children: ReactNode;
  tone?: "good" | "satisfactory" | "moderate" | "poor" | "very-poor" | "severe" | "neutral";
};

const tones = {
  good: "border-emerald-200 bg-emerald-50 text-emerald-700",
  satisfactory: "border-lime-200 bg-lime-50 text-lime-700",
  moderate: "border-yellow-200 bg-yellow-50 text-yellow-800",
  poor: "border-orange-200 bg-orange-50 text-orange-700",
  "very-poor": "border-red-200 bg-red-50 text-red-700",
  severe: "border-purple-200 bg-purple-50 text-purple-700",
  neutral: "border-slate-200 bg-slate-50 text-slate-600",
};

export function categoryTone(category: string): BadgeProps["tone"] {
  const key = category.toLowerCase().replaceAll(" ", "-");
  return key in tones ? (key as BadgeProps["tone"]) : "neutral";
}

export default function Badge({ children, tone = "neutral" }: BadgeProps) {
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${tones[tone]}`}>{children}</span>;
}
