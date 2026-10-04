// Line icons from the owner's Claude Design canvas (24×24, 1.75 stroke,
// currentColor). Decorative by default; give the surrounding control the label.

type IconProps = { size?: number; className?: string };

function Svg({ size = 16, className, children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
      style={{ flexShrink: 0 }}
    >
      {children}
    </svg>
  );
}

export const IconHome = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />
  </Svg>
);
export const IconEye = (p: IconProps) => (
  <Svg {...p}>
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
    <circle cx="12" cy="12" r="3" />
  </Svg>
);
export const IconTrendUp = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 17l6-6 4 4 8-8" />
    <path d="M14 7h7v7" />
  </Svg>
);
export const IconSliders = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 7h9M17 7h3M4 17h3M11 17h9" />
    <circle cx="15" cy="7" r="2" />
    <circle cx="9" cy="17" r="2" />
  </Svg>
);
export const IconHelp = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .8-1 1.5v.7" />
    <path d="M12 17h.01" />
  </Svg>
);
export const IconLogOut = (p: IconProps) => (
  <Svg {...p}>
    <path d="M15 4h4v16h-4" />
    <path d="M10 16l-4-4 4-4" />
    <path d="M6 12h10" />
  </Svg>
);
export const IconChevronDown = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6 9l6 6 6-6" />
  </Svg>
);
export const IconChevronUp = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6 15l6-6 6 6" />
  </Svg>
);
export const IconChevronLeft = (p: IconProps) => (
  <Svg {...p}>
    <path d="M15 18l-6-6 6-6" />
  </Svg>
);
export const IconChevronRight = (p: IconProps) => (
  <Svg {...p}>
    <path d="M9 6l6 6-6 6" />
  </Svg>
);
export const IconPlus = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 5v14M5 12h14" />
  </Svg>
);
export const IconSearch = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="M20 20l-3.5-3.5" />
  </Svg>
);
export const IconExternal = (p: IconProps) => (
  <Svg {...p}>
    <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
  </Svg>
);
export const IconX = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6 6l12 12M18 6L6 18" />
  </Svg>
);
export const IconCheck = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5 12l5 5 9-10" />
  </Svg>
);
export const IconInfo = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5" />
    <path d="M12 8h.01" />
  </Svg>
);
export const IconCheckCircle = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M8 12l3 3 5-6" />
  </Svg>
);
export const IconWarning = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 3 2 20h20L12 3z" />
    <path d="M12 10v4" />
    <path d="M12 17h.01" />
  </Svg>
);
export const IconAlert = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v6" />
    <path d="M12 16h.01" />
  </Svg>
);
export const IconClock = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </Svg>
);
export const IconMenu = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 6h16M4 12h16M4 18h16" />
  </Svg>
);
export const IconDots = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="5" cy="12" r="1.4" fill="currentColor" />
    <circle cx="12" cy="12" r="1.4" fill="currentColor" />
    <circle cx="19" cy="12" r="1.4" fill="currentColor" />
  </Svg>
);
export const IconImage = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 5h16v14H4z" />
    <circle cx="9" cy="10" r="1.5" />
    <path d="M4 17l5-5 4 4 3-3 4 4" />
  </Svg>
);
export const IconHash = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5 9h14M5 15h14M10 4 8 20M16 4l-2 16" />
  </Svg>
);

export const IconStore = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 10v10h16V10" />
    <path d="M3 10l2-6h14l2 6z" />
    <path d="M10 20v-5h4v5" />
  </Svg>
);
export const IconLock = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6 11h12v9H6z" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </Svg>
);

// Move types
export const IconPackage = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 7l9-4 9 4v10l-9 4-9-4z" />
    <path d="M3 7l9 4 9-4" />
    <path d="M12 11v10" />
  </Svg>
);
export const IconTag = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 12V3h9l9 9-9 9z" />
    <circle cx="7.5" cy="7.5" r="1.5" />
  </Svg>
);
export const IconTrendDown = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 7l6 6 4-4 8 8" />
    <path d="M14 17h7v-7" />
  </Svg>
);
export const IconBan = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M5.6 5.6l12.8 12.8" />
  </Svg>
);
export const IconDoc = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6 3h9l4 4v14H6z" />
    <path d="M14 3v5h5" />
  </Svg>
);
export const IconMessage = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 5h16v11H9l-5 4z" />
  </Svg>
);

/** Spinner arc (tw-spin in the canvas). `tone` is the arc colour. */
export function SpinnerIcon({ size = 16, tone = "currentColor" }: { size?: number; tone?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" className="ui-spin" style={{ flexShrink: 0 }}>
      <circle cx="12" cy="12" r="9" stroke={tone} strokeOpacity="0.22" strokeWidth="2.5" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke={tone} strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}
