// One entry in a page's history timeline (live-detected + archive-reconstructed).
export type PageHistoryItem = {
  id: string; // changes.id — links to /changes/[id]
  summary: string;
  detectedAt: string; // ISO — the newer capture's date
  isArchive: boolean; // true = reconstructed from the web archive; false = detected live
};

// What the HistoryPanel renders.
export type PageHistoryState =
  | { status: "ready"; items: PageHistoryItem[] }
  | { status: "empty" } // backfill ran, but the archive had no usable history
  | { status: "unavailable" } // no provider/transient error — hide
  | { status: "not-found" }; // page missing / not owned
