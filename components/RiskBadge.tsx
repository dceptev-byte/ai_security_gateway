import type { RiskLevel } from "@/types";

const CONFIG: Record<
  RiskLevel,
  { label: string; bg: string; text: string; border: string; dot: string }
> = {
  LOW: {
    label: "Low Risk",
    bg: "bg-emerald-500/15",
    text: "text-emerald-400",
    border: "border-emerald-500/30",
    dot: "bg-emerald-400",
  },
  MEDIUM: {
    label: "Medium Risk",
    bg: "bg-amber-500/15",
    text: "text-amber-400",
    border: "border-amber-500/30",
    dot: "bg-amber-400",
  },
  HIGH: {
    label: "High Risk",
    bg: "bg-red-500/15",
    text: "text-red-400",
    border: "border-red-500/30",
    dot: "bg-red-400",
  },
};

export default function RiskBadge({ riskLevel }: { riskLevel: RiskLevel }) {
  const c = CONFIG[riskLevel];
  return (
    <div
      className={`inline-flex items-center gap-3 px-5 py-3 rounded-xl border ${c.bg} ${c.border}`}
    >
      <span className={`h-3 w-3 rounded-full ${c.dot} shadow-lg`} />
      <span className={`text-xl font-bold tracking-wide ${c.text}`}>
        {c.label}
      </span>
    </div>
  );
}
