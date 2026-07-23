import { DIETARY_OPTIONS, DIETARY_DATALIST_ID } from "@/lib/labels";

/** The shared <datalist> of canonical dietary options. Render once per form; wire
 * inputs to it with `list={DIETARY_DATALIST_ID}`. */
export default function DietaryDatalist() {
  return (
    <datalist id={DIETARY_DATALIST_ID}>
      {DIETARY_OPTIONS.map((d) => (
        <option key={d} value={d} />
      ))}
    </datalist>
  );
}
