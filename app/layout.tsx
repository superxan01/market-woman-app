import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MarketApp | Your Market. Our People. Delivered.",
  description: "A market shopping and delivery app for customers, vendors, riders, and operations."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
