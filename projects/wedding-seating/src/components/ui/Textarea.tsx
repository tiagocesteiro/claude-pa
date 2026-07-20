import { forwardRef } from "react";
import type { TextareaHTMLAttributes } from "react";

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

/** Full-width, vertically-resizable textarea. */
const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className, ...rest },
  ref
) {
  return (
    <textarea ref={ref} className={["textarea", className ?? ""].filter(Boolean).join(" ")} {...rest} />
  );
});

export default Textarea;
