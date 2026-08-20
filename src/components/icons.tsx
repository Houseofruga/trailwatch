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
