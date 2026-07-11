"use client";

/* Terminal screen shown when a participant does not consent. No ID is minted
 * and nothing is logged. */
export default function DeclinedScreen() {
  return (
    <div
      className="flex h-full w-full items-center justify-center p-6"
      style={{ background: "var(--bg-base)", color: "var(--text-primary)" }}
    >
      <div
        className="max-w-md text-center rounded-xl p-8"
        style={{ background: "var(--bg-panel)", border: "1px solid var(--border)" }}
      >
        <h1 className="text-lg font-bold mb-2">Thank you</h1>
        <p className="text-[13px]" style={{ color: "var(--text-secondary)" }}>
          You have chosen not to participate. You may now close this window. No
          information has been collected.
        </p>
      </div>
    </div>
  );
}
