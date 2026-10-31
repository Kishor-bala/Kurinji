"use client";

import React, { useEffect } from "react";
import { AlertCircle, RotateCcw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global application error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-slate-900 font-sans">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-3xl p-8 sm:p-10 text-center shadow-lg space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-black text-white flex items-center justify-center mx-auto shadow-md">
            <AlertCircle className="w-8 h-8 text-white" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Application Error
            </h1>
            <p className="text-sm text-slate-500 leading-relaxed max-w-sm mx-auto">
              We encountered an issue loading Kurinji. Please click below to reload the platform.
            </p>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={() => reset()}
              className="inline-flex items-center justify-center space-x-2 px-6 py-3 rounded-xl bg-black text-white text-sm font-bold hover:bg-slate-800 transition-all shadow-md active:scale-95"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reload Kurinji</span>
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
