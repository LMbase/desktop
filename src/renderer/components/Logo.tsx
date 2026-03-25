import React from 'react';

export function TokenHubLogo({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="TokenHub"
    >
      {/* Hexagon outline */}
      <path
        d="M12 2L20.5 7V17L12 22L3.5 17V7L12 2Z"
        stroke="white"
        strokeWidth="1.5"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Exchange arrows inside */}
      <path
        d="M8 12L11 9L14 12"
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M16 12L13 15L10 12"
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
