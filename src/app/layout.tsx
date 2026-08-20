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

export const metadata: Metadata = {
  title: "Trailwatch",
  description:
    "We watch your competitors' pricing, homepage and changelog, and email you one digest a week explaining what actually changed.",
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
