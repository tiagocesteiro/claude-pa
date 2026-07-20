import type { ReactNode } from "react";

type Tone = "neutral" | "accent" | "success" | "warning" | "danger";

export interface BadgeProps {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}

/** Small pill for status / counts. */
export default function Badge({ tone = "neutral", className, children }: BadgeProps) {
  return (
    <span className={["badge", `badge-${tone}`, className ?? ""].filter(Boolean).join(" ")}>
      {children}
    </span>
  );
}
