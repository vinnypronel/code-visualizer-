"use client";

import Script from "next/script";
import { useCallback, useEffect, useRef } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (element: HTMLElement, options: Record<string, unknown>) => string;
      remove: (widgetId: string) => void;
    };
  }
}

export default function AssignmentChallenge({
  onToken,
}: {
  onToken: (token: string | null) => void;
}) {
  const elementRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  const renderWidget = useCallback(() => {
    if (!siteKey || !elementRef.current || !window.turnstile || widgetIdRef.current) return;
    widgetIdRef.current = window.turnstile.render(elementRef.current, {
      sitekey: siteKey,
      action: "study-assignment",
      theme: "light",
      callback: (token: string) => onToken(token),
      "expired-callback": () => onToken(null),
      "error-callback": () => onToken(null),
    });
  }, [onToken, siteKey]);

  useEffect(() => () => {
    if (widgetIdRef.current && window.turnstile) {
      window.turnstile.remove(widgetIdRef.current);
    }
  }, []);

  if (!siteKey) {
    if (process.env.NODE_ENV !== "production") return null;
    return <p className="text-xs font-semibold text-red-700">Session verification is temporarily unavailable.</p>;
  }

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onReady={renderWidget}
      />
      <div ref={elementRef} aria-label="Human verification" />
    </>
  );
}
