import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: "Assisted Sales Experiment Workbench",
  description:
    "A decision workbench for finding where human intervention creates incremental bookings. Concept prototype with synthetic data.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#fafafa" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} antialiased`}>
      <body className="min-h-screen font-sans">{children}</body>
    </html>
  );
}
