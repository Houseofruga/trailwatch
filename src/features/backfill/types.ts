// One entry in a page's history timeline (live-detected + archive-reconstructed).
export type PageHistoryItem = {
  id: string; // changes.id — links to /changes/[id]
  summary: string;
  detectedAt: string; // ISO — the newer capture's date
  isArchive: boolean; // true = reconstructed from the web archive; false = detected live
};

// Server-provided history for one page, handed to the Recent-history pill so it
// can show its count and open instantly: the stored change rows (live-detected +
// already-archived) plus whether the Wayback reconstruction has ever run. When it
// hasn't, the pill still enriches from the archive on first expand — in the
// background, over these rows, rather than as a blocking load.
export type InitialHistory = { items: PageHistoryItem[]; backfilled: boolean };

// What the HistoryPanel renders.
export type PageHistoryState =
  | { status: "ready"; items: PageHistoryItem[] }
  | { status: "empty" } // backfill ran, but the archive had no usable history
  | { status: "unavailable" } // no provider/transient error — hide
  | { status: "not-found" }; // page missing / not owned
