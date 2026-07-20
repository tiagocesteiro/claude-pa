import { forwardRef } from "react";
import type { SelectHTMLAttributes } from "react";

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement>;

/** Full-width select, styled by the base element rules + `.select`. */
const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className, children, ...rest },
  ref
) {
  return (
    <select ref={ref} className={["select", className ?? ""].filter(Boolean).join(" ")} {...rest}>
      {children}
    </select>
  );
});

export default Select;
