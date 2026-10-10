import type { Metadata } from "next";
import { Newsreader, Hanken_Grotesk } from "next/font/google";
import "./globals.css";

const serif = Newsreader({ variable: "--font-serif", subsets: ["latin"], weight: ["400", "500"], display: "swap" });
const sans = Hanken_Grotesk({ variable: "--font-sans", subsets: ["latin"], weight: ["400", "500", "600"], display: "swap" });

export const metadata: Metadata = {
  title: "Aangan Studio Calls",
  description: "Phone enquiry dashboard for Aangan Studio",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${serif.variable} ${sans.variable}`}>
      <body>{children}</body>
    </html>
  );
}
