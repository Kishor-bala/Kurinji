import React from 'react';

export default function KurinjiLogo({ size = 32, className = '' }) {
  return (
    <div className={`kurinji-logo-wrapper ${className}`} style={{ display: 'inline-flex', alignItems: 'center' }}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 36 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ flexShrink: 0 }}
      >
        <defs>
          <linearGradient id="kurinjiGrad" x1="2" y1="2" x2="34" y2="34" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#4f46e5" />
            <stop offset="50%" stopColor="#7c3aed" />
            <stop offset="100%" stopColor="#9333ea" />
          </linearGradient>
          <linearGradient id="kurinjiWave" x1="12" y1="12" x2="24" y2="24" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#c7d2fe" />
          </linearGradient>
        </defs>

        {/* Geometric Kurinji Flower Petal Backdrop */}
        <rect x="2" y="2" width="32" height="32" rx="10" fill="url(#kurinjiGrad)" />

        {/* Kurinji Petal Curves */}
        <path
          d="M18 7C19.5 12 24 16.5 29 18C24 19.5 19.5 24 18 29C16.5 24 12 19.5 7 18C12 16.5 16.5 12 18 7Z"
          fill="rgba(255, 255, 255, 0.22)"
        />

        {/* Acoustic Soundwave Core (Speech AI) */}
        <line x1="13" y1="18" x2="13" y2="18" stroke="url(#kurinjiWave)" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="15.5" y1="15" x2="15.5" y2="21" stroke="url(#kurinjiWave)" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="18" y1="12" x2="18" y2="24" stroke="url(#kurinjiWave)" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="20.5" y1="15" x2="20.5" y2="21" stroke="url(#kurinjiWave)" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="23" y1="18" x2="23" y2="18" stroke="url(#kurinjiWave)" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    </div>
  );
}
