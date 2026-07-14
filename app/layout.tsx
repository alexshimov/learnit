import type { Metadata, Viewport } from "next";
import { Geist, Space_Grotesk, Newsreader, Space_Mono } from "next/font/google";
import "./globals.css";
import { BottomNav } from "./components/bottom-nav";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const display = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});
const serif = Newsreader({
  variable: "--font-serif",
  subsets: ["latin"],
  style: ["normal", "italic"],
  weight: ["400", "500", "600"],
});
const mono = Space_Mono({
  variable: "--font-sp-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "learnit",
  description: "Spaced repetition for everything you want to remember.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "learnit" },
};

export const viewport: Viewport = {
  themeColor: "#6a5ae0",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${display.variable} ${serif.variable} ${mono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <div className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col bg-surface-0">
          <main className="flex-1 px-5 pb-28 pt-6">{children}</main>
          <BottomNav />
        </div>
      </body>
    </html>
  );
}
