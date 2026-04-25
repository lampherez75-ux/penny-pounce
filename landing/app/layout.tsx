import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PennyPounce — Jump on Savings Instantly",
  description:
    "The free browser extension that automatically finds and applies the best coupon codes while you shop online. Save time and money effortlessly.",
  keywords: ["coupons", "savings", "browser extension", "deals", "price comparison"],
  openGraph: {
    title: "PennyPounce — Jump on Savings Instantly",
    description: "Automatically find and apply the best coupon codes while you shop.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geist.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
