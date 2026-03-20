import type { Finding, PIIType } from "@/types";

const TYPE_CONFIG: Record<
  PIIType,
  { label: string; bg: string; text: string; border: string; icon: string }
> = {
  EMAIL: {
    label: "Email",
    bg: "bg-blue-500/10",
    text: "text-blue-300",
    border: "border-blue-500/30",
    icon: "✉️",
  },
  PHONE: {
    label: "Phone",
    bg: "bg-purple-500/10",
    text: "text-purple-300",
    border: "border-purple-500/30",
    icon: "📞",
  },
  CREDIT_CARD: {
    label: "Credit Card",
    bg: "bg-orange-500/10",
    text: "text-orange-300",
    border: "border-orange-500/30",
    icon: "💳",
  },
};

export default function FindingsList({ findings }: { findings: Finding[] }) {
  if (findings.length === 0) {
    return (
      <p className="text-slate-500 text-sm italic">
        No sensitive data detected.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {findings.map((f, i) => {
        const c = TYPE_CONFIG[f.type];
        return (
          <div
            key={i}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium ${c.bg} ${c.text} ${c.border}`}
          >
            <span aria-hidden="true">{c.icon}</span>
            <span className="font-semibold">{c.label}</span>
            <span className="opacity-60">·</span>
            <code className="font-mono text-xs opacity-80 max-w-[160px] truncate">
              {f.value}
            </code>
          </div>
        );
      })}
    </div>
  );
}
