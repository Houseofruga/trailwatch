import type { Metadata } from "next";
import { DM_Sans, Geist_Mono, Inter } from "next/font/google";
import "@/styles/tokens.css";

// DM Sans for the marketing site, Inter for the signed-in app and auth
// screens (the `.ui` scope in tokens.css), Geist Mono for URLs and excerpts.
const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-dm-sans",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-geist-mono",
});

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://gettrailwatch.com";

const TITLE = "TrailWatch — competitor briefings for Shopify brands";
const DESCRIPTION =
  "Track your competitors' products, prices, sales and stock. Instant alerts for big moves and a plain-English briefing every Monday. Free during beta.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: TITLE,
    template: "%s — TrailWatch",
  },
  description: DESCRIPTION,
  applicationName: "TrailWatch",
  openGraph: {
    type: "website",
    siteName: "TrailWatch",
    url: SITE_URL,
    title: TITLE,
    description: DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
  verification: {
    google: "AtMEWsREx52dkO3rXqharn960xJR8WI0tHggQFeCnls",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${dmSans.variable} ${inter.variable} ${geistMono.variable}`}>{children}</body>
    </html>
  );
}
