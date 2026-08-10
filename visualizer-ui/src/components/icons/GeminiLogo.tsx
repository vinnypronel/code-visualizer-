"use client";

interface GeminiLogoProps {
  className?: string;
  size?: number;
}

export default function GeminiLogo({ className = "w-4 h-4", size }: GeminiLogoProps) {
  const style = size ? { width: `${size}px`, height: `${size}px` } : {};

  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      style={style}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M12 0C12 6.627 6.627 12 0 12C6.627 12 12 17.373 12 24C12 17.373 17.373 12 24 12C17.373 12 12 6.627 12 0Z" />
    </svg>
  );
}
