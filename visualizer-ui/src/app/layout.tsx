import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { StudyProvider } from "@/components/study/StudyProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Code Visualizer - UR2PhD Research Tool",
  description:
    "An interactive code visualizer that parses Java source code, renders execution flow on a live canvas, and provides AI-powered explanations in real time.",
  keywords: ["code visualizer", "AST", "Java", "execution trace", "AI explanation"],
  icons: {
    icon: [
      { url: "/icon.svg?v=4", type: "image/svg+xml" },
      { url: "/icon.png?v=4", type: "image/png" },
      { url: "/favicon.ico?v=4" },
    ],
    shortcut: "/icon.svg?v=4",
    apple: "/icon.png?v=4",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="h-full flex flex-col overflow-hidden">
        <StudyProvider>{children}</StudyProvider>
      </body>
    </html>
  );
}
