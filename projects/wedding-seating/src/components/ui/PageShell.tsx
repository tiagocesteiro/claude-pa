import type { HTMLAttributes, ReactNode } from "react";

const MAX_WIDTHS = {
  sm: 440,
  md: 720,
  lg: 1200,
} as const;

export interface PageShellProps extends HTMLAttributes<HTMLElement> {
  size?: keyof typeof MAX_WIDTHS;
  as?: "main" | "div" | "section";
  children: ReactNode;
}

/** Centered, padded, max-width container for a page's content. */
export default function PageShell({
  size = "md",
  as: Tag = "main",
  className,
  style,
  children,
  ...rest
}: PageShellProps) {
  return (
    <Tag
      className={["page-shell", className ?? ""].filter(Boolean).join(" ")}
      style={{ maxWidth: MAX_WIDTHS[size], ...style }}
      {...rest}
    >
      {children}
    </Tag>
  );
}
