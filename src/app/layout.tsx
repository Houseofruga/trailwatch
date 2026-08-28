import type { Metadata } from "next";
import { DM_Sans, Geist_Mono } from "next/font/google";
import "@/styles/tokens.css";

// Two fonts: DM Sans for all UI text (headings, body, summaries — the v2
// design dropped the serif entirely), Geist Mono for URLs and excerpts.
const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-dm-sans",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-geist-mono",
});

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://trailwatch.houseofruga.com";

const DESCRIPTION =
  "We watch your competitors' pricing, homepage and changelog, and email you one plain-English digest a week explaining what actually changed. AI summaries on every plan, even free.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "TrailWatch — competitor tracking for founders, one email a week",
    template: "%s — TrailWatch",
  },
  description: DESCRIPTION,
  applicationName: "TrailWatch",
  openGraph: {
    type: "website",
    siteName: "TrailWatch",
    url: SITE_URL,
    title: "TrailWatch — competitor tracking for founders, one email a week",
    description: DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: "TrailWatch — competitor tracking for founders, one email a week",
    description: DESCRIPTION,
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${dmSans.variable} ${geistMono.variable}`}>{children}</body>
    </html>
  );
}
