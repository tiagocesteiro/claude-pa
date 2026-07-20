import type { ReactNode } from "react";

export interface StatProps {
  value: ReactNode;
  label: ReactNode;
  className?: string;
}

/** A single number + caption, used in the venue progress cards. */
export default function Stat({ value, label, className }: StatProps) {
  return (
    <div className={["stat", className ?? ""].filter(Boolean).join(" ")}>
      <span className="stat-value">{value}</span>
      <span className="stat-label">{label}</span>
    </div>
  );
}
