/*
 * Arrow key navigation for the lesson guides.
 *
 * Left and right step the guide backwards and forwards, which is how most
 * people expect a stepped walkthrough to behave. The guard below keeps that
 * from stealing keys the participant is actually using: arrows must still move
 * the caret inside a text box, a select, or the code editor.
 */

export function typingTargetHasFocus(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;

  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;

  /* Monaco renders its own editable surfaces rather than a plain textarea. */
  return !!target.closest(".monaco-editor, [role='textbox']");
}

/*
 * Returns "next", "back", or null. Modifier combinations are left alone so
 * browser and screen reader shortcuts keep working.
 */
export function guideArrowDirection(
  event: KeyboardEvent,
): "next" | "back" | null {
  if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return null;
  if (typingTargetHasFocus(event.target)) return null;
  if (event.key === "ArrowRight") return "next";
  if (event.key === "ArrowLeft") return "back";
  return null;
}
