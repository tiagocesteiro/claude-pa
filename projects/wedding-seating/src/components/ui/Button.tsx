import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: "md" | "sm";
  loading?: boolean;
  block?: boolean;
  children: ReactNode;
}

/**
 * Token-driven button primitive. Extends the design-system `.btn` classes in
 * globals.css. `loading` disables the button and shows a spinner without
 * changing the label the caller passes.
 */
export default function Button({
  variant = "secondary",
  size = "md",
  loading = false,
  block = false,
  className,
  disabled,
  children,
  type = "button",
  ...rest
}: ButtonProps) {
  const classes = [
    "btn",
    `btn-${variant}`,
    size === "sm" ? "btn-sm" : "",
    block ? "btn-block" : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type={type}
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading && <span className="btn-spinner" aria-hidden />}
      {children}
    </button>
  );
}
