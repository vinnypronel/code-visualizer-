"use client";

import { useEffect } from "react";

/**
 * Discourages casual inspection during the study without interfering with
 * ordinary form controls or accessibility navigation. This is intentionally a
 * deterrent only: browser menus and JavaScript-disabled clients cannot be
 * controlled by a webpage.
 */
export default function BrowserInspectionDeterrent() {
  useEffect(() => {
    const preventContextMenu = (event: MouseEvent) => {
      event.preventDefault();
    };

    const preventInspectionShortcuts = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      const controlOrCommand = event.ctrlKey || event.metaKey;

      const opensDeveloperTools =
        event.key === "F12" ||
        (controlOrCommand &&
          event.shiftKey &&
          ["i", "j", "c", "k"].includes(key)) ||
        (event.metaKey && event.altKey && ["i", "j", "c"].includes(key));

      const opensPageSource =
        (controlOrCommand && key === "u") ||
        (event.metaKey && event.altKey && key === "u");

      if (opensDeveloperTools || opensPageSource) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    document.addEventListener("contextmenu", preventContextMenu);
    window.addEventListener("keydown", preventInspectionShortcuts, true);

    return () => {
      document.removeEventListener("contextmenu", preventContextMenu);
      window.removeEventListener("keydown", preventInspectionShortcuts, true);
    };
  }, []);

  return null;
}
