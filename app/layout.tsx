import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  metadataBase: new URL("https://arcusquantfund.com"),
  title: {
    default: "Arcus Quant Fund — Algorithmic Trading",
    template: "%s | Arcus Quant Fund",
  },
  description:
    "Systematic quantitative trading fund delivering data-driven returns. Algorithmic strategies across crypto and equities — 2.47 Sharpe ratio, live since 2025.",
  keywords: [
    "quant fund", "algorithmic trading", "systematic trading",
    "crypto trading", "perpetual futures", "DC VWAP strategy",
    "Baraka protocol", "Islamic finance", "DeFi", "Arbitrum",
    "hedge fund", "quantitative finance",
  ],
  authors: [{ name: "Arcus Quant Fund", url: "https://arcusquantfund.com" }],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://arcusquantfund.com",
    siteName: "Arcus Quant Fund",
    title: "Arcus Quant Fund — Algorithmic Trading",
    description:
      "Systematic quantitative trading fund. Live algorithmic strategies with a 2.47 Sharpe ratio across crypto perpetual futures.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Arcus Quant Fund — Algorithmic Trading",
    description: "Systematic quantitative fund. 2.47 Sharpe ratio, live since 2025.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-snippet": -1 },
  },
  alternates: {
    canonical: "https://arcusquantfund.com",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        <Navbar />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
