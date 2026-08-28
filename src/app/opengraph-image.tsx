import { ImageResponse } from "next/og";

// Default social card for every route without its own opengraph-image.
// Palette mirrors src/styles/tokens.css (ImageResponse can't read CSS vars).
export const alt = "TrailWatch — competitor tracking for founders";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#f5f5f5",
          padding: "72px 80px",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            fontSize: 34,
            fontWeight: 600,
            color: "#1a1a17",
          }}
        >
          <div
            style={{
              width: 18,
              height: 18,
              background: "#9ff50a",
              marginRight: 16,
            }}
          />
          TrailWatch
        </div>

        <div
          style={{
            display: "flex",
            fontSize: 62,
            fontWeight: 600,
            lineHeight: 1.1,
            letterSpacing: "-0.02em",
            color: "#1a1a17",
            maxWidth: 900,
          }}
        >
          Competitor tracking for founders, one email a week.
        </div>

        <div
          style={{
            display: "flex",
            fontSize: 28,
            color: "#4a4740",
          }}
        >
          Pricing, features, messaging — the meaningful changes, in plain English.
        </div>
      </div>
    ),
    { ...size },
  );
}
