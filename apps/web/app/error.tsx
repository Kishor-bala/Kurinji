"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { AlertCircle, RotateCcw, Home } from "lucide-react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log privately to browser console for developers without exposing anything in UI
    console.error("Application error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-slate-900 font-sans selection:bg-slate-900 selection:text-white">
      <div className="max-w-md w-full bg-white border border-slate-200 rounded-3xl p-8 sm:p-10 text-center shadow-lg space-y-6">
        {/* Warning Icon */}
        <div className="w-16 h-16 rounded-2xl bg-amber-500 text-white flex items-center justify-center mx-auto shadow-md">
          <AlertCircle className="w-8 h-8 text-white" />
        </div>

        {/* Clean, Non-Technical User Message */}
        <div className="space-y-2">
          <span className="text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
            Notice
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight pt-2">
            Something Went Wrong
          </h1>
          <p className="text-sm text-slate-500 leading-relaxed max-w-sm mx-auto">
            An unexpected error occurred while loading this view. Please try refreshing or return to the main dashboard.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => reset()}
            className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-5 py-2.5 rounded-xl bg-black text-white text-xs font-bold hover:bg-slate-800 transition-all shadow-md active:scale-95"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Try Again</span>
          </button>
          <Link
            href="/"
            className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-5 py-2.5 rounded-xl bg-slate-100 text-slate-800 text-xs font-bold hover:bg-slate-200 border border-slate-200 transition-all"
          >
            <Home className="w-4 h-4" />
            <span>Go to Home</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
