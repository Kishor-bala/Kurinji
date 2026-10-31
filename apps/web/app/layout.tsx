import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "KURINJI | Badaga & Marwari Voice Vocabulary Learning Platform",
  description: "Interactive voice-based vocabulary learning platform for indigenous Badaga and Marwari languages with authentic native pronunciations.",
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
