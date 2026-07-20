import { cloneElement, isValidElement, useId } from "react";
import type { ReactElement, ReactNode } from "react";

export interface FieldProps {
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  htmlFor?: string;
  children: ReactNode;
}

/**
 * Label + control + optional hint/error wrapper. When the label wraps a single
 * form control we generate an id and associate the `<label>` with it for
 * accessibility; callers can also pass `htmlFor` explicitly.
 */
export default function Field({ label, hint, error, htmlFor, children }: FieldProps) {
  const generatedId = useId();
  const controlId = htmlFor ?? generatedId;

  // Inject the id into a single child control if it doesn't already have one.
  let control = children;
  if (!htmlFor && isValidElement<{ id?: string }>(children)) {
    const el = children as ReactElement<{ id?: string }>;
    if (el.props?.id == null) {
      control = cloneElement(el, { id: controlId });
    }
  }

  return (
    <div className="field">
      <label className="field-label" htmlFor={controlId}>
        {label}
      </label>
      {control}
      {hint && <span className="field-hint">{hint}</span>}
      {error && <span className="field-error">{error}</span>}
    </div>
  );
}
