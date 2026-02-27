import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Script from "next/script";

export const metadata: Metadata = {
  metadataBase: new URL("https://arcusquantfund.com"),
  title: {
    default: "Arcus Quant Fund — Systematic Algorithmic Trading",
    template: "%s | Arcus Quant Fund",
  },
  description:
    "Arcus Quant Fund is a systematic quantitative trading fund delivering data-driven returns through automated algorithmic strategies across crypto and equities. Performance-fee-only model. Live since 2025.",
  keywords: [
    "quant fund", "algorithmic trading fund", "systematic trading fund",
    "crypto hedge fund", "perpetual futures trading", "DC VWAP strategy",
    "quantitative hedge fund", "automated trading fund", "arcus quant",
    "arcusquantfund", "arcus quant fund", "performance fee fund",
    "Baraka protocol", "Islamic finance DeFi", "Shariah compliant trading",
  ],
  authors: [{ name: "Arcus Quant Fund", url: "https://arcusquantfund.com" }],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://arcusquantfund.com",
    siteName: "Arcus Quant Fund",
    title: "Arcus Quant Fund — Systematic Algorithmic Trading",
    description:
      "Systematic quantitative trading fund. Performance-fee-only model. Live algorithmic strategies with a 2.47 Sharpe ratio across crypto perpetual futures.",
    images: [
      {
        url: "https://arcusquantfund.com/og-image.png",
        width: 1200,
        height: 630,
        alt: "Arcus Quant Fund — Systematic Algorithmic Trading",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Arcus Quant Fund — Systematic Algorithmic Trading",
    description: "Systematic quant fund. Performance-fee-only. 2.47 Sharpe ratio, live since 2025.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-snippet": -1, "max-image-preview": "large", "max-video-preview": -1 },
  },
  alternates: {
    canonical: "https://arcusquantfund.com",
  },
  verification: {
    // Add Google Search Console verification token here when available
    // google: "your-google-verification-token",
  },
};

// ─── JSON-LD Structured Data ──────────────────────────────────────────────────
// Tells Google/Bing that arcusquantfund.com is a legitimate FinancialService.
// FinancialService + Organization schema + founder/advisor Person entities.

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "FinancialService",
      "@id": "https://arcusquantfund.com/#organization",
      "name": "Arcus Quant Fund",
      "alternateName": "Arcus Quant Fund LLC",
      "url": "https://arcusquantfund.com",
      "logo": "https://arcusquantfund.com/icon.png",
      "description": "Arcus Quant Fund is a systematic quantitative trading fund operating algorithmic strategies across cryptocurrency perpetual futures and equity markets. We operate on a performance-fee-only model — capital remains in the client's own brokerage account at all times.",
      "foundingDate": "2024",
      "email": "contact@arcusquantfund.com",
      "serviceType": [
        "Algorithmic Trading",
        "Quantitative Fund Management",
        "Systematic Trading",
        "Crypto Asset Management",
      ],
      "areaServed": "Worldwide",
      "founder": {
        "@type": "Person",
        "name": "Shehzad Ahmed",
        "jobTitle": "Founder & CEO",
        "description": "Finance major with Computer Science Engineering minor in Big Data & HPC. Builds and operates fully automated trading systems.",
      },
      "employee": [
        {
          "@type": "Person",
          "name": "Dr. Rafiq Bhuyan",
          "jobTitle": "Co-Founder & Strategic Advisor",
          "description": "Adjunct Professor of Economics and Finance at Monarch Business School Switzerland; Associate Professor at Alabama A&M University, USA. PhD Economics, Concordia University, Montreal. MS Finance, University of Illinois. Master & Bachelor of Commerce, University of Dhaka. 80+ peer-reviewed journal articles in finance, economics, entrepreneurship finance, micro-finance, and financial accounting. Fulbright Scholar. Outstanding Researcher Award x2, California State University. Former Purcell Chair Professor Le Moyne College; faculty at American University in Kuwait, California State University, USC, UC Davis, UC Riverside, Northeastern University. Private fund management experience in stocks and options.",
          "affiliation": [
            {
              "@type": "CollegeOrUniversity",
              "name": "Monarch Business School Switzerland",
            },
            {
              "@type": "CollegeOrUniversity",
              "name": "Alabama A&M University",
            },
          ],
          "alumniOf": [
            { "@type": "CollegeOrUniversity", "name": "Concordia University" },
            { "@type": "CollegeOrUniversity", "name": "University of Illinois" },
            { "@type": "CollegeOrUniversity", "name": "University of Dhaka" },
          ],
        },
        {
          "@type": "Person",
          "name": "Md. Jahidul Islam Bhuiya",
          "jobTitle": "Software Engineer",
        },
      ],
      "knowsAbout": [
        "Quantitative Finance",
        "Algorithmic Trading",
        "Cryptocurrency Markets",
        "Perpetual Futures",
        "Directional Change Strategy",
        "VWAP Trading",
        "Risk Management",
        "DeFi",
        "Islamic Finance",
      ],
      "sameAs": [
        "https://arcusquantfund.com",
      ],
    },
    {
      "@type": "WebSite",
      "@id": "https://arcusquantfund.com/#website",
      "url": "https://arcusquantfund.com",
      "name": "Arcus Quant Fund",
      "description": "Systematic quantitative trading fund — algorithmic strategies across crypto and equities.",
      "publisher": {
        "@id": "https://arcusquantfund.com/#organization",
      },
    },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <Script
          id="json-ld"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
          strategy="beforeInteractive"
        />
      </head>
      <body className="antialiased">
        <Navbar />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
