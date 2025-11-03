import type React from "react";

export function SubspaceWorkspaceWide(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none" {...props}>
      <circle cx="24" cy="12" r="6" fill="currentColor" />
      <circle cx="12" cy="24" r="5" fill="currentColor" />
      <circle cx="36" cy="24" r="5" fill="currentColor" />
      <circle cx="18" cy="36" r="4" fill="currentColor" />
      <circle cx="30" cy="36" r="4" fill="currentColor" />
      <path d="M24 18 L12 19 M24 18 L36 19 M12 29 L18 32 M36 29 L30 32 M18 32 L30 32" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}
