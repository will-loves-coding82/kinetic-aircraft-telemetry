"use client";

/** Minimal 2px sparkline; current value marked with a surface-ringed dot. */
export function Sparkline({
  values,
  className = "",
}: {
  values: number[];
  className?: string;
}) {
  if (values.length < 2) {
    return (
      <div className={`flex items-center text-[10px] text-mute ${className}`}>
        gathering…
      </div>
    );
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const pad = 3;
  const width = 100;
  const height = 28;
  const points = values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * (width - pad * 2);
    const y = pad + (1 - (v - min) / range) * (height - pad * 2);
    return [x, y] as const;
  });
  const last = points[points.length - 1];

  return (
    <div className={`relative h-7 w-full ${className}`}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className="h-full w-full"
        role="img"
        aria-label="trend sparkline"
      >
        <polyline
          points={points.map(([x, y]) => `${x},${y}`).join(" ")}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      {/*
        Rendered as a plain HTML dot, positioned by percentage, instead of an
        SVG circle inside the viewBox above: that viewBox is non-uniformly
        stretched (preserveAspectRatio="none") to fill the wide/short
        container, which would squish a circle into an ellipse.
      */}
      <span
        className="absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent ring-2 ring-panel-solid"
        style={{
          left: `${(last[0] / width) * 100}%`,
          top: `${(last[1] / height) * 100}%`,
        }}
      />
    </div>
  );
}
