import type { Metadata } from "next";
import { Playfair_Display, Inter, Rampart_One } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import React, { Suspense } from "react";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const rampart = Rampart_One({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-rampart",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Golden Hotel | Smart Digital Menu & Ordering System",
  description: "Browse the menu, place your order, and enjoy great food delivered to your table or room.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${playfair.variable} ${inter.variable} ${rampart.variable}`}>
      <body className="min-h-screen bg-luxury-green text-foreground antialiased font-sans flex flex-col">
        <Suspense fallback={<div className="h-20 w-full border-b border-luxury-gold/15 bg-luxury-green" />}>
          <Navbar />
        </Suspense>
        <main className="flex-1 flex flex-col">
          {children}
        </main>
      </body>
    </html>
  );
}
