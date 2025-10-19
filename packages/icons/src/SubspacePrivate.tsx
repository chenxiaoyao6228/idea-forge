import type React from "react";

export function SubspacePrivate(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none" {...props}>
      <rect x="10" y="18" width="28" height="20" rx="4" stroke="currentColor" strokeWidth="3" fill="none" />
      <path d="M18 18 V14 C18 10.686 20.686 8 24 8 C27.314 8 30 10.686 30 14 V18" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <circle cx="24" cy="28" r="3" fill="currentColor" />
      <rect x="6" y="22" width="4" height="4" fill="currentColor" fillOpacity="0.5" />
      <rect x="38" y="22" width="4" height="4" fill="currentColor" fillOpacity="0.5" />
      <rect x="6" y="30" width="4" height="4" fill="currentColor" fillOpacity="0.5" />
      <rect x="38" y="30" width="4" height="4" fill="currentColor" fillOpacity="0.5" />
    </svg>
  );
}
