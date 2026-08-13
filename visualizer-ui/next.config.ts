import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  distDir: process.env.NEXT_DIST_DIR || ".next",
  turbopack: {
    root: path.resolve(__dirname),
  },
  async headers() {
    /*
     * CSP, read before tightening.
     *
     * Third-party runtimes have hard requirements here, and removing one can
     * silently break a study screen in production only, since dev
     * runs a looser policy:
     *
     *   Monaco (the Java code panel) is loaded by @monaco-editor/react from
     *   the jsDelivr CDN, spawns its language workers from blob: URLs, and
     *   evaluates strings internally. Without cdn.jsdelivr.net, worker-src
     *   blob:, and 'unsafe-eval' the editor never loads and participants see
     *   an empty black panel where the Java code should be.
     *
     *   Turnstile evaluates strings inside its challenge frame, so it needs
     *   'unsafe-eval' too. Without it, consent verification fails.
     *
     * 'unsafe-eval' is a real loosening. It is acceptable here because the app
     * renders no participant-authored HTML: there is no dangerouslySetInnerHTML
     * anywhere in src, and code execution via /api/trace is disabled in
     * production. The way to drop it would be replacing Monaco with a
     * read-only highlighter, which is a larger change than this study needs.
     */
    const MONACO_CDN = "https://cdn.jsdelivr.net";
    const TURNSTILE = "https://challenges.cloudflare.com";
    const contentSecurityPolicy = [
      "default-src 'self'",
      `script-src 'self' 'unsafe-inline' 'unsafe-eval' ${TURNSTILE} ${MONACO_CDN}`,
      `style-src 'self' 'unsafe-inline' ${MONACO_CDN}`,
      "img-src 'self' data: blob:",
      `font-src 'self' data: ${MONACO_CDN}`,
      `connect-src 'self' ${TURNSTILE} ${MONACO_CDN}`,
      `frame-src ${TURNSTILE}`,
      "worker-src 'self' blob:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
    ].join("; ");

    return [{
      source: "/:path*",
      headers: [
        { key: "Content-Security-Policy", value: contentSecurityPolicy },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "no-referrer" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
      ],
    }];
  },
};

export default nextConfig;
