import type { Metadata } from "next";
import { Geist_Mono, Newsreader, Source_Sans_3 } from "next/font/google";
import { SiteHeader } from "@/components/header";
import { getSession } from "@/lib/auth/session";
import "./globals.css";

const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-source-sans",
});

const newsreader = Newsreader({
  subsets: ["latin"],
  variable: "--font-newsreader",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: {
    default: "Learning Portal",
    template: "%s · Learning Portal",
  },
  description: "Internal course documents, live sessions, and topic quizzes.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getSession();
  return (
    <html lang="en">
      <body
        className={`${sourceSans.variable} ${newsreader.variable} ${geistMono.variable} min-h-screen font-sans antialiased`}
      >
        <SiteHeader user={user} />
        <main>{children}</main>
      </body>
    </html>
  );
}
