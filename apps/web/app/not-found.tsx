import React from "react";
import Link from "next/link";
import { BookOpen, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-slate-900 font-sans selection:bg-slate-900 selection:text-white">
      <div className="max-w-md w-full bg-white border border-slate-200 rounded-3xl p-8 sm:p-10 text-center shadow-lg space-y-6">
        {/* Brand Icon */}
        <div className="w-16 h-16 rounded-2xl bg-black text-white flex items-center justify-center mx-auto shadow-md">
          <BookOpen className="w-8 h-8 text-white" />
        </div>

        {/* Status & Friendly Message */}
        <div className="space-y-2">
          <span className="text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
            Page Not Found
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight pt-2">
            404 - Lost on the Hills
          </h1>
          <p className="text-sm text-slate-500 leading-relaxed max-w-sm mx-auto">
            The vocabulary card, category, or page you are looking for does not exist or may have been moved.
          </p>
        </div>

        {/* Action Button */}
        <div className="pt-2">
          <Link
            href="/"
            className="inline-flex items-center justify-center space-x-2 px-6 py-3 rounded-xl bg-black text-white text-sm font-bold hover:bg-slate-800 transition-all shadow-md active:scale-95"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Kurinji Home</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
