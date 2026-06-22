import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Market Woman | Local trade, made reliable",
  description: "A marketplace workflow for customers, vendors, riders, and operators."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
