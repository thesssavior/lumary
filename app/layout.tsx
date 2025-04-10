import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "YouTube Summary AI",
  description: "Get instant AI-powered summaries of any YouTube video",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}