import Link from "next/link";
import type { CSSProperties } from "react";

/**
 * The Aliança brand wordmark: a pair of interlocking rings (the "aliança" —
 * wedding ring + union) next to the name set in the display serif. Rendered as
 * a link when `href` is given (app header, landing nav), otherwise as plain
 * inline text (auth screens). One source of truth for the brand mark.
 */
export default function Wordmark({
  href,
  style,
  className,
}: {
  href?: string;
  style?: CSSProperties;
  className?: string;
}) {
  const content = (
    <>
      <svg
        className="wordmark-mark"
        viewBox="0 0 34 24"
        aria-hidden
        focusable="false"
      >
        <circle cx="12" cy="12" r="8.6" fill="none" stroke="currentColor" strokeWidth="2.3" />
        <circle cx="22" cy="12" r="8.6" fill="none" stroke="var(--accent)" strokeWidth="2.3" />
      </svg>
      <span className="wordmark-name">Aliança</span>
    </>
  );

  const cls = className ? `wordmark ${className}` : "wordmark";

  if (href) {
    return (
      <Link href={href} className={cls} style={style} aria-label="Aliança">
        {content}
      </Link>
    );
  }
  return (
    <span className={cls} style={style} aria-label="Aliança">
      {content}
    </span>
  );
}
