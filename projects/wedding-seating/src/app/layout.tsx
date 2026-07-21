import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Fraunces } from "next/font/google";
import "./globals.css";

// Body/UI face — a warm, geometric-humanist sans. Pairs with Fraunces for a
// premium, boutique feel (2025-26 luxury-wedding pairing) instead of an admin tool.
const jakarta = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

// Elegant, warm display serif for the wordmark and page titles.
const fraunces = Fraunces({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "Aliança — organiza o teu casamento",
  description:
    "Aliança liga casais e quintas: gere os convidados, segue as confirmações e monta o seating sobre as plantas reais do espaço, com disposição automática das mesas.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt"
      className={`${jakarta.variable} ${fraunces.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
