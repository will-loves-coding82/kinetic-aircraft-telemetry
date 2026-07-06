import type { HTMLAttributes } from "react";

/**
 * Glass dashboard card: frosted iOS-style surface — opaque-ish fill plus heavy
 * backdrop blur and saturation, a hairline border, and a soft drop shadow.
 */
export function Panel({
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`pointer-events-auto rounded-lg border border-line bg-panel shadow-[0_10px_40px_-8px_rgba(0,0,0,0.28)] backdrop-blur-2xl backdrop-saturate-150 ${className}`}
      {...props}
    />
  );
}

/** Uppercase micro-heading used at the top of panel sections. */
export function PanelHeading({
  className = "",
  ...props
}: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      className={`text-[12px] font-medium ${className}`}
      {...props}
    />
  );
}
