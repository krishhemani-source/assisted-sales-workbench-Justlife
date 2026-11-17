import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans } from "next/font/google";
import "./globals.css";

const plex = IBM_Plex_Sans({
  variable: "--font-plex",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const title = "Assisted Sales Experiment Workbench";
const description =
  "Not every high-intent customer needs a call. A decision tool for putting agent time where it creates incremental bookings. Concept prototype with synthetic data.";

export const metadata: Metadata = {
  metadataBase: new URL("https://assisted-sales-workbench.vercel.app"),
  title,
  description,
  openGraph: { title, description, type: "website", siteName: title },
  twitter: { card: "summary_large_image", title, description },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#f3f5f4" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={plex.variable}>
      <body className="min-h-screen font-sans">{children}</body>
    </html>
  );
}
