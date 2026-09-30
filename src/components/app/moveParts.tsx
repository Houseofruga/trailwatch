// Shared bits for showing a move: its icon, priority badge, filter options.
import { Badge } from "@/components/ui/Badge";
import { IconBan, IconDoc, IconMessage, IconPackage, IconTag, IconTrendDown } from "@/components/ui/icons";
import type { Option } from "@/components/ui/Select";
import type { MoveKind, Priority } from "@/features/appData/types";

const ICONS: Record<MoveKind, (p: { size?: number }) => React.ReactElement> = {
  launch: IconPackage,
  price: IconTrendDown,
  undercut: IconTrendDown,
  sale: IconTag,
  stock: IconBan,
  promo: IconMessage,
  page: IconDoc,
};

export function MoveIcon({ kind }: { kind: MoveKind }) {
  const Icon = ICONS[kind];
  return <Icon size={16} />;
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  return priority === "high" ? (
    <Badge tone="attention">High</Badge>
  ) : priority === "normal" ? (
    <Badge tone="info">Normal</Badge>
  ) : (
    <Badge tone="neutral">Low</Badge>
  );
}

export const TYPE_OPTIONS: Option[] = [
  { value: "all", label: "All" },
  { value: "launch", label: "New products" },
  { value: "price", label: "Price changes" },
  { value: "sale", label: "Sales" },
  { value: "stock", label: "Stock" },
  { value: "promo", label: "Promotions" },
  { value: "page", label: "Pages" },
  { value: "undercut", label: "Cheaper than you" },
];

export const PRIORITY_OPTIONS: Option[] = [
  { value: "all", label: "All" },
  { value: "high", label: "High" },
  { value: "normal", label: "Normal" },
  { value: "low", label: "Low" },
];
