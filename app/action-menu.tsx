"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";

/** A disclosure for ordinary controls, with keyboard and outside-click dismissal. */
export function ActionMenu({ label, trigger, children, className = "", chevron = true }: {
  label: string;
  trigger: ReactNode;
  children: ReactNode;
  className?: string;
  chevron?: boolean;
}) {
  const id = useId();
  const details = useRef<HTMLDetailsElement>(null);
  const summary = useRef<HTMLElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !details.current?.contains(event.target) && details.current) details.current.open = false;
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && details.current) {
        event.preventDefault();
        details.current.open = false;
        summary.current?.focus();
      }
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  return <details ref={details} className={`action-menu ${className}`} onToggle={(event) => setOpen(event.currentTarget.open)}>
    <summary ref={summary} role="button" aria-label={label} aria-expanded={open} aria-controls={id}>
      {trigger}
      {chevron && <svg className="menu-chevron" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="m4 6 4 4 4-4" /></svg>}
    </summary>
    <div id={id} className="action-menu-panel" onClick={(event) => {
      if (event.target instanceof Element && event.target.closest("button") && details.current) {
        details.current.open = false;
        summary.current?.focus();
      }
    }}>{children}</div>
  </details>;
}
