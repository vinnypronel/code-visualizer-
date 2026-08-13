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
  onReadyChange,
}: {
  onToken: (token: string | null) => void;
  onReadyChange: (ready: boolean) => void;
}) {
  const elementRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  /*
   * Cloudflare's script can take a moment on a slow connection. The skeleton
   * holds the exact 300x65 until render() confirms that Turnstile initialized,
   * so the layout stays stable without depending on Cloudflare's private DOM.
   */
  const [widgetState, setWidgetState] = useState<"loading" | "ready" | "verified" | "error">("loading");

  const markUnavailable = useCallback(() => {
    setWidgetState("error");
    onReadyChange(false);
    onToken(null);
  }, [onReadyChange, onToken]);

  const renderWidget = useCallback(() => {
    if (!siteKey || !elementRef.current || !window.turnstile || widgetIdRef.current) return;
    try {
      widgetIdRef.current = window.turnstile.render(elementRef.current, {
        sitekey: siteKey,
        action: "study-assignment",
        theme: "light",
        size: "normal",
        appearance: "always",
        callback: (token: string) => {
          setWidgetState("verified");
          onToken(token);
        },
        "expired-callback": () => {
          setWidgetState("ready");
          onToken(null);
        },
        "timeout-callback": () => {
          setWidgetState("ready");
          onToken(null);
        },
        "unsupported-callback": markUnavailable,
        "error-callback": markUnavailable,
      });

      // A successful render() call is the reliable initialization signal.
      // Looking for an iframe can fail when Turnstile changes its DOM internals.
      setWidgetState((current) => current === "verified" ? current : "ready");
      onReadyChange(true);
    } catch {
      markUnavailable();
    }
  }, [markUnavailable, onReadyChange, onToken, siteKey]);

  /* Ad blockers can prevent the script from loading without firing onError. */
  useEffect(() => {
    if (!siteKey || widgetState !== "loading") return;
    const timeout = window.setTimeout(markUnavailable, 12_000);
    return () => window.clearTimeout(timeout);
  }, [markUnavailable, siteKey, widgetState]);

  useEffect(() => () => {
    if (widgetIdRef.current && window.turnstile) {
      window.turnstile.remove(widgetIdRef.current);
    }
    onReadyChange(false);
    onToken(null);
  }, [onReadyChange, onToken]);

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
        onError={markUnavailable}
      />
      <div
        className="relative w-[300px] h-[65px]"
        onContextMenu={(event) => event.preventDefault()}
      >
        {widgetState === "loading" && (
          <div
            className="challenge-skeleton absolute inset-0 rounded-md"
            aria-hidden="true"
          />
        )}
        <div ref={elementRef} aria-label="Human verification" />
        {widgetState === "verified" && (
          <div
            className="absolute inset-0 z-10"
            aria-hidden="true"
            onContextMenu={(event) => event.preventDefault()}
            title="Verification complete"
          />
        )}
        {widgetState === "error" && (
          <div
            className="absolute inset-0 rounded-md border border-red-300 bg-red-50 px-3 flex items-center"
            role="alert"
          >
            <p className="text-[11px] font-semibold leading-snug text-red-700">
              Verification could not load. Check your connection or browser extensions, then refresh the page.
            </p>
          </div>
        )}
      </div>
      {widgetState === "verified" && (
        <p className="mt-1 text-[11px] font-semibold text-emerald-700" role="status">
          Verification complete.
        </p>
      )}
    </>
  );
}
