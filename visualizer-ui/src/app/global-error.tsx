"use client";

/*
 * Last resort boundary, for a failure in the root layout itself.
 *
 * This replaces the entire document, so it has to supply its own html and body
 * and cannot rely on the stylesheet or on any CSS variable from globals.css.
 * Every style here is inline on purpose. If this screen ever renders, the app
 * is badly broken, so it says the one useful thing (your answers are stored in
 * this browser, reload rather than restart) and gets out of the way.
 */

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f3f4f6",
          color: "#172033",
          fontFamily: "system-ui, sans-serif",
          padding: "24px",
        }}
      >
        <div style={{ maxWidth: 420, textAlign: "center" }}>
          <p
            style={{
              margin: "0 0 12px",
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "#8793a3",
              fontFamily: "ui-monospace, monospace",
            }}
          >
            Code Visualizer Study
          </p>

          <h1 style={{ margin: "0 0 12px", fontSize: 24 }}>
            The study could not load
          </h1>

          <p
            style={{
              margin: "0 0 28px",
              fontSize: 14,
              lineHeight: 1.6,
              color: "#5f6b7a",
            }}
          >
            Your answers so far are stored in this browser. Reloading will
            resume the same session, so please do not start over.
          </p>

          <button
            type="button"
            className="btn-primary"
            onClick={reset}
          >
            <span>Try again</span>
            <svg
              className="btn-arrow"
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M6 12L10 8L6 4"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          <p
            style={{
              margin: "28px 0 0",
              fontSize: 12,
              lineHeight: 1.6,
              color: "#8793a3",
            }}
          >
            If this keeps happening, contact{" "}
            <a href="mailto:yama@kean.edu" style={{ color: "#1769aa" }}>
              yama@kean.edu
            </a>
            .
          </p>

          {error.digest && (
            <p
              style={{
                margin: "14px 0 0",
                fontSize: 10,
                color: "#8793a3",
                fontFamily: "ui-monospace, monospace",
              }}
            >
              Reference: {error.digest}
            </p>
          )}
        </div>
      </body>
    </html>
  );
}
