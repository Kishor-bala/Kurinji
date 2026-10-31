import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VaniVoice | Badaga & Marwari Voice Vocabulary Learning Platform",
  description: "AI-Powered Voice-Based Vocabulary Learning Platform supporting Badaga and Marwari languages using XLS-R acoustic embeddings, dual vector stores, and grounded AI tutor.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full bg-slate-50 text-slate-900 antialiased">
      <body className="min-h-full flex flex-col font-sans bg-slate-50 text-slate-900 selection:bg-slate-900 selection:text-white">
        {children}
      </body>
    </html>
  );
}
