import type { HTMLAttributes, ReactNode } from "react";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  pad?: "md" | "sm";
  children: ReactNode;
}

/** Surface container with warm border + soft shadow. */
export default function Card({ pad = "md", className, children, ...rest }: CardProps) {
  const classes = ["card", pad === "sm" ? "card-pad-sm" : "", className ?? ""]
    .filter(Boolean)
    .join(" ");
  return (
    <div className={classes} {...rest}>
      {children}
    </div>
  );
}
