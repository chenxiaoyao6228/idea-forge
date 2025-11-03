import type React from "react";

export function SubspacePublic(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none" {...props}>
      <circle cx="24" cy="24" r="16" stroke="currentColor" strokeWidth="3" fill="none" />
      <path d="M16 24 L20 28 L32 16" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="38" cy="10" r="3" fill="currentColor" />
      <circle cx="10" cy="10" r="3" fill="currentColor" />
      <circle cx="38" cy="38" r="3" fill="currentColor" />
      <circle cx="10" cy="38" r="3" fill="currentColor" />
    </svg>
  );
}
