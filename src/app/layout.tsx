import type { Metadata } from "next";
import { Manrope, Sora } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/layout/app-shell";
import { cn } from "@/lib/utils";

const bodyFont = Manrope({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const displayFont = Sora({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: "StudyBuddy AI",
  description: "Turn PDFs into clear lessons, flashcards, and daily study sessions.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn("min-h-screen bg-background font-sans antialiased", bodyFont.variable, displayFont.variable)}>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
