// One entry in a page's reconstructed history timeline.
export type PageHistoryItem = {
  id: string; // changes.id — links to /changes/[id]
  summary: string;
  detectedAt: string; // ISO — the newer capture's date
};

// What the HistoryPanel renders.
export type PageHistoryState =
  | { status: "ready"; items: PageHistoryItem[] }
  | { status: "empty" } // backfill ran, but the archive had no usable history
  | { status: "unavailable" } // no provider/transient error — hide
  | { status: "not-found" }; // page missing / not owned
