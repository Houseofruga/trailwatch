// Small inline stroke icons. They use `currentColor`, so they follow their
// parent's colour — including hover states like Delete turning red.

type IconProps = { size?: number };

export function PlusIcon({ size = 14 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M8 2.75v10.5M2.75 8h10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" />
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
      <g stroke="currentColor" strokeWidth="1.4" strokeLinejoin="miter">
        <path d="M11.3 2.2 L13.8 4.7 L5 13.5 L2.2 13.8 L2.5 11 Z" />
        <path d="M9.4 4.1 L11.9 6.6" />
      </g>
    </svg>
  );
}

export function TrashIcon({ size = 13 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <g stroke="currentColor" strokeWidth="1.4" strokeLinecap="square" strokeLinejoin="miter">
        <path d="M2.75 4.25 H13.25" />
        <path d="M6.25 4.25 V2.75 H9.75 V4.25" />
        <path d="M4.25 4.25 L4.85 13.25 H11.15 L11.75 4.25" />
      </g>
    </svg>
  );
}

// Door with an arrow leaving — sharp, matching the nav icon style.
export function LogoutIcon({ size = 14 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <g stroke="currentColor" strokeWidth="1.4" strokeLinecap="square" strokeLinejoin="miter">
        <path d="M6.5 2.75 H2.75 V13.25 H6.5" />
        <path d="M9.5 5 L12.5 8 L9.5 11" />
        <line x1="12.5" y1="8" x2="6" y2="8" />
      </g>
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
