import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function base(props: IconProps): IconProps {
  return {
    width: 16,
    height: 16,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
    ...props,
  };
}

export function SunIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}

export function MoonIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
    </svg>
  );
}

export function XIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

export function CrosshairIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="7" />
      <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
    </svg>
  );
}

export function TargetIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function PlaneIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2Z" />
    </svg>
  );
}

export function KineticIcon(props: IconProps) {
  // viewBox padded to 94x94 (center shifted to 47,47) so the ring's stroke —
  // whose outer edge sits at radius 40 + strokeWidth/2 = 43.5 — has a sliver
  // of margin inside the canvas edge; at 43.5-vs-43.5 with zero margin,
  // sub-pixel rounding from browser zoom clipped the stroke right at the edge.
  return (
    <svg
      {...base({
        viewBox: "0 0 94 94",
        fill: "none",
        stroke: "currentColor",
        ...props,
      })}
    >
      <circle cx="47" cy="47" r="40" strokeWidth={7} />
      <rect
        x="30.5"
        y="47.4706"
        width="24"
        height="24"
        transform="rotate(-45 30.5 47.4706)"
        fill="currentColor"
      />
    </svg>
  );
}

export function ChevronDownIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

export function TowerIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 15v7M8 22h8M9.5 15h5l1-6h-7l1 6Z" />
      <path d="M8.5 9 6 4M15.5 9 18 4M6 4l6-1.5L18 4" />
    </svg>
  );
}

export function GaugeIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M3 13a9 9 0 1 1 18 0" />
      <path d="M12 13 16 8" />
      <path d="M6 21h12" />
    </svg>
  );
}
