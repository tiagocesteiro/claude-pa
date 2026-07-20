import { forwardRef } from "react";
import type { InputHTMLAttributes } from "react";

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

/** Full-width text input, styled by the base element rules + `.input`. */
const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, ...rest },
  ref
) {
  return <input ref={ref} className={["input", className ?? ""].filter(Boolean).join(" ")} {...rest} />;
});

export default Input;
