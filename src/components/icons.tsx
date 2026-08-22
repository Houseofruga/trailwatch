// Small inline stroke icons. They use `currentColor`, so they follow their
// parent's colour — including hover states like Delete turning red.

type IconProps = { size?: number };

export function PlusIcon({ size = 14 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M8 3.25v9.5M3.25 8h9.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function ChevronLeftIcon({ size = 12 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M10 3.5 5.5 8l4.5 4.5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function PencilIcon({ size = 13 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M11.2 2.3a1.13 1.13 0 0 1 1.6 0l.9.9a1.13 1.13 0 0 1 0 1.6L5.6 12.9l-3 .5.5-3 8.1-8.1Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function TrashIcon({ size = 13 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M2.75 4.25h10.5M6.25 4.25V2.75h3.5v1.5M4.25 4.25l.55 8.4a.6.6 0 0 0 .6.6h5.2a.6.6 0 0 0 .6-.6l.55-8.4"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// --- Nav icons: sharp, geometric, matching the zero-radius design system ---

export function DashboardIcon({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <g stroke="currentColor" strokeWidth="1.4">
        <rect x="2.5" y="2.5" width="4.3" height="4.3" />
        <rect x="9.2" y="2.5" width="4.3" height="4.3" />
        <rect x="2.5" y="9.2" width="4.3" height="4.3" />
        <rect x="9.2" y="9.2" width="4.3" height="4.3" />
      </g>
    </svg>
  );
}

// Concentric squares — a "watch/target" mark, echoing the radar theme.
export function CompetitorsIcon({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <g stroke="currentColor" strokeWidth="1.4">
        <rect x="2.5" y="2.5" width="11" height="11" />
        <rect x="6.25" y="6.25" width="3.5" height="3.5" />
      </g>
    </svg>
  );
}

export function BillingIcon({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <g stroke="currentColor" strokeWidth="1.4">
        <rect x="2" y="3.5" width="12" height="9" />
        <line x1="2" y1="6.5" x2="14" y2="6.5" />
      </g>
    </svg>
  );
}

// Sliders — sharp square handles on two tracks.
export function SettingsIcon({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <g stroke="currentColor" strokeWidth="1.4" strokeLinecap="square">
        <line x1="2.5" y1="5" x2="13.5" y2="5" />
        <line x1="2.5" y1="11" x2="13.5" y2="11" />
      </g>
      <rect x="9" y="3.5" width="3" height="3" fill="currentColor" />
      <rect x="4" y="9.5" width="3" height="3" fill="currentColor" />
    </svg>
  );
}
