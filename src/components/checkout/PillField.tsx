import { LucideIcon } from "lucide-react";

interface PillFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  error?: string | null;
  placeholder?: string;
  type?: string;
  inputMode?: "text" | "numeric" | "tel" | "email" | "url" | "decimal" | "search";
  icon?: LucideIcon;
}

export function PillField({
  label,
  value,
  onChange,
  onBlur,
  error,
  placeholder,
  type = "text",
  inputMode,
  icon: Icon
}: PillFieldProps) {
  return (
    <div className="group space-y-1">
      <div className={`floating-field-container ${error ? "field-error" : ""}`}>
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder=" "
          inputMode={inputMode}
          className="floating-input"
        />
        <label className="floating-label">
          {label}
        </label>
        {Icon && (
          <Icon
            className={`floating-field-icon ${
              error ? "text-destructive/60" : "text-slate-300 group-focus-within:text-primary"
            }`}
          />
        )}
      </div>
      {error && (
        <p className="text-[11px] font-semibold text-destructive/90 mt-1.5 ml-0.5 animate-in fade-in slide-in-from-top-1">
          {error}
        </p>
      )}
    </div>
  );
}
