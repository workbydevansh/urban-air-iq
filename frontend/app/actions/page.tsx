"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import Badge from "@/components/Badge";
import Card from "@/components/Card";
import ErrorState from "@/components/ErrorState";
import LoadingState from "@/components/LoadingState";
import { api, type Action } from "@/lib/api";

type WorkflowStatus = "Pending" | "In Progress" | "Completed";
type Department =
  | "Pollution Control Board"
  | "Traffic Police"
  | "Municipal Corporation"
  | "Health Department"
  | "Construction Enforcement Team";

type WorkflowAction = Action & {
  workflowDepartment: Department;
  workflowStatus: WorkflowStatus;
};

const departments: Department[] = [
  "Pollution Control Board",
  "Traffic Police",
  "Municipal Corporation",
  "Health Department",
  "Construction Enforcement Team",
];

const statuses: WorkflowStatus[] = ["Pending", "In Progress", "Completed"];

function assignDepartment(action: Action): Department {
  const text = `${action.action} ${action.department} ${action.reason}`.toLowerCase();
  if (text.includes("traffic") || text.includes("vehicle") || text.includes("transport")) return "Traffic Police";
  if (text.includes("construction") || text.includes("road sprinkling") || text.includes("dust-control")) return "Construction Enforcement Team";
  if (text.includes("industrial") || text.includes("stack-emission") || text.includes("emission compliance")) return "Pollution Control Board";
  if (text.includes("health") || text.includes("school") || text.includes("hospital") || text.includes("exposure avoidance")) return "Health Department";
  return "Municipal Corporation";
}

function normalizeActions(actions: Action[]): WorkflowAction[] {
  const demoStatuses: WorkflowStatus[] = ["Pending", "In Progress", "Pending", "Completed"];
  return actions.map((action, index) => {
    const rawStatus = action.status.toLowerCase();
    const workflowStatus: WorkflowStatus = rawStatus.includes("completed")
      ? "Completed"
      : rawStatus.includes("progress")
        ? "In Progress"
        : rawStatus.includes("immediate")
          ? "Pending"
          : demoStatuses[index % demoStatuses.length];
    return { ...action, workflowDepartment: assignDepartment(action), workflowStatus };
  }).sort((a, b) => b.priority_score - a.priority_score);
}

export default function ActionCenterPage() {
  const [actions, setActions] = useState<WorkflowAction[]>([]);
  const [priorityFilter, setPriorityFilter] = useState("All priorities");
  const [departmentFilter, setDepartmentFilter] = useState("All departments");
  const [statusFilter, setStatusFilter] = useState("All statuses");
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [planGenerated, setPlanGenerated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadActions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setActions(normalizeActions(await api.actions()));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load enforcement actions.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadActions();
  }, [loadActions]);

  const generateActionPlan = async () => {
    setGenerating(true);
    setError(null);
    try {
      setActions(normalizeActions(await api.actions()));
      setPlanGenerated(true);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to refresh the action plan.");
    } finally {
      setGenerating(false);
    }
  };

  const priorities = useMemo(
    () => ["All priorities", ...Array.from(new Set(actions.map((action) => action.priority)))],
    [actions],
  );

  const filteredActions = useMemo(
    () => actions.filter((action) =>
      (priorityFilter === "All priorities" || action.priority === priorityFilter)
      && (departmentFilter === "All departments" || action.workflowDepartment === departmentFilter)
      && (statusFilter === "All statuses" || action.workflowStatus === statusFilter)),
    [actions, departmentFilter, priorityFilter, statusFilter],
  );

  const summary = useMemo(() => ({
    highPriority: actions.filter((action) => action.priority_score >= 75).length,
    inspections: actions.filter((action) => action.action.toLowerCase().includes("inspect")).length,
    healthAlerts: actions.filter((action) => /health alert|school|hospital|exposure/i.test(`${action.action} ${action.expected_impact}`)).length,
    trafficActions: actions.filter((action) => action.workflowDepartment === "Traffic Police").length,
  }), [actions]);

  if (loading) return <LoadingState />;
  if (error && !actions.length) return <ErrorState message={error} onRetry={loadActions} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-teal-700">Officer workflow</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">Action Center</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-500">
            Prioritize, assign, and track evidence-backed air-quality interventions.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void generateActionPlan()}
          disabled={generating}
          className="rounded-lg bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {generating ? "Generating..." : "Generate Action Plan"}
        </button>
      </div>

      {planGenerated && (
        <div className="rounded-xl border border-teal-200 bg-teal-50 px-5 py-4 text-sm text-teal-900" role="status">
          <span className="font-semibold">Action plan refreshed.</span> Highest-priority recommendations are highlighted for officer review.
        </div>
      )}
      {error && <ErrorState message={error} onRetry={() => void generateActionPlan()} />}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard label="High priority actions" value={summary.highPriority} detail="Priority score 75 or above" tone="red" />
        <SummaryCard label="Inspections needed" value={summary.inspections} detail="Field compliance checks" tone="orange" />
        <SummaryCard label="Health alerts" value={summary.healthAlerts} detail="Public exposure controls" tone="purple" />
        <SummaryCard label="Traffic actions" value={summary.trafficActions} detail="Mobility interventions" tone="teal" />
      </div>

      <Card className="p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="grid gap-3 sm:grid-cols-3">
            <FilterSelect label="Priority" value={priorityFilter} options={priorities} onChange={setPriorityFilter} />
            <FilterSelect label="Department" value={departmentFilter} options={["All departments", ...departments]} onChange={setDepartmentFilter} />
            <FilterSelect label="Status" value={statusFilter} options={["All statuses", ...statuses]} onChange={setStatusFilter} />
          </div>
          <p className="text-sm text-slate-500">Showing {filteredActions.length} of {actions.length} actions</p>
        </div>
      </Card>

      <Card title="Recommended Action Queue" description="Operational recommendations ranked by intervention priority">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1320px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3 font-semibold">Priority</th>
                <th className="px-5 py-3 font-semibold">Zone</th>
                <th className="px-5 py-3 font-semibold">Recommended Action</th>
                <th className="px-5 py-3 font-semibold">Department</th>
                <th className="px-5 py-3 font-semibold">Reason</th>
                <th className="px-5 py-3 font-semibold">Expected Impact</th>
                <th className="px-5 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredActions.map((action) => (
                <tr
                  key={`${action.zone}-${action.action}`}
                  className={planGenerated && action.priority_score >= 75 ? "bg-teal-50/70" : "hover:bg-slate-50/70"}
                >
                  <td className="px-5 py-4 align-top">
                    <Badge tone={priorityTone(action.priority_score)}>{action.priority}</Badge>
                    <p className="mt-2 text-xs font-semibold text-slate-400">Score {action.priority_score}</p>
                  </td>
                  <td className="px-5 py-4 align-top font-semibold text-slate-900">{action.zone}</td>
                  <td className="max-w-xs px-5 py-4 align-top leading-6 text-slate-700">{action.action}</td>
                  <td className="max-w-52 px-5 py-4 align-top font-medium text-slate-700">{action.workflowDepartment}</td>
                  <td className="max-w-sm px-5 py-4 align-top leading-6 text-slate-600">{action.reason}</td>
                  <td className="max-w-xs px-5 py-4 align-top leading-6 text-slate-600">{action.expected_impact}</td>
                  <td className="px-5 py-4 align-top"><StatusBadge status={action.workflowStatus} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          {!filteredActions.length && (
            <div className="p-8 text-center text-sm text-slate-500">No actions match the selected workflow filters.</div>
          )}
        </div>
      </Card>
    </div>
  );
}

function SummaryCard({ label, value, detail, tone }: { label: string; value: number; detail: string; tone: "red" | "orange" | "purple" | "teal" }) {
  const colors = {
    red: "bg-red-500",
    orange: "bg-orange-500",
    purple: "bg-purple-600",
    teal: "bg-teal-600",
  };
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <span className={`h-2.5 w-2.5 rounded-full ${colors[tone]}`} />
      </div>
      <p className="mt-3 text-3xl font-bold text-slate-900">{value}</p>
      <p className="mt-2 text-xs text-slate-400">{detail}</p>
    </Card>
  );
}

function FilterSelect({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 block min-w-48 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal normal-case tracking-normal text-slate-700 shadow-sm"
      >
        {options.map((option) => <option key={option}>{option}</option>)}
      </select>
    </label>
  );
}

function priorityTone(score: number): "severe" | "very-poor" | "poor" | "moderate" | "neutral" {
  if (score >= 90) return "severe";
  if (score >= 75) return "very-poor";
  if (score >= 60) return "poor";
  if (score >= 45) return "moderate";
  return "neutral";
}

function StatusBadge({ status }: { status: WorkflowStatus }) {
  const styles: Record<WorkflowStatus, string> = {
    Pending: "border-amber-200 bg-amber-50 text-amber-700",
    "In Progress": "border-blue-200 bg-blue-50 text-blue-700",
    Completed: "border-emerald-200 bg-emerald-50 text-emerald-700",
  };
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${styles[status]}`}>{status}</span>;
}
