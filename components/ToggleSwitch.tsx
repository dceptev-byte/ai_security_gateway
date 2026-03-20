"use client";

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  labelLeft: string;
  labelRight: string;
}

export default function ToggleSwitch({
  checked,
  onChange,
  labelLeft,
  labelRight,
}: ToggleSwitchProps) {
  return (
    <div className="flex items-center gap-3">
      <span
        className={`text-sm font-medium transition-colors duration-200 ${
          !checked ? "text-slate-100" : "text-slate-500"
        }`}
      >
        {labelLeft}
      </span>

      <button
        role="switch"
        aria-checked={checked}
        aria-label={`Toggle between ${labelLeft} and ${labelRight} view`}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-800 ${
          checked ? "bg-blue-600" : "bg-slate-600"
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition-transform duration-200 ${
            checked ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </button>

      <span
        className={`text-sm font-medium transition-colors duration-200 ${
          checked ? "text-slate-100" : "text-slate-500"
        }`}
      >
        {labelRight}
      </span>
    </div>
  );
}
