"use client";

import Script from "next/script";
import { useCallback, useEffect, useRef, useState } from "react";

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
  /*
   * Cloudflare's script can take a moment on a slow connection. Until its
   * widget has actually painted, a skeleton holds the exact 300x65 the widget
   * will occupy, so the participant sees something immediately and nothing
   * shifts underneath them when it arrives.
   */
  const [widgetPainted, setWidgetPainted] = useState(false);

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

  /* render() returns before the iframe exists, so wait for the iframe itself. */
  useEffect(() => {
    if (widgetPainted) return;
    const host = elementRef.current;
    if (!host) return;
    const check = () => {
      if (host.querySelector("iframe")) setWidgetPainted(true);
    };
    check();
    const observer = new MutationObserver(check);
    observer.observe(host, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [widgetPainted]);

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
      <div className="relative w-[300px] h-[65px]">
        {!widgetPainted && (
          <div
            className="challenge-skeleton absolute inset-0 rounded-md"
            aria-hidden="true"
          />
        )}
        <div ref={elementRef} aria-label="Human verification" />
      </div>
    </>
  );
}
