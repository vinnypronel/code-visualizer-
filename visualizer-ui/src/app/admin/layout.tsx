/*
 * The root layout locks the body to the viewport for the participant flow. The
 * dashboard is a long scrolling page, so it claims the remaining column height
 * and owns its own scroll container.
 */

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-0 flex-1 flex-col">{children}</div>;
}
