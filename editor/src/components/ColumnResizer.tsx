import { useRef } from 'react';

export const DEFAULT_RIGHT_COLUMN_WIDTH = 380;
const MIN_WIDTH = 280;
/** Always leave at least this much for the viewport. */
const MIN_VIEWPORT_WIDTH = 320;

export function clampRightColumnWidth(width: number): number {
  const max = Math.max(MIN_WIDTH, window.innerWidth - MIN_VIEWPORT_WIDTH);
  return Math.round(Math.min(Math.max(width, MIN_WIDTH), max));
}

interface ColumnResizerProps {
  width: number;
  onChange: (width: number) => void;
}

/** Drag handle on the right column's left edge. Double-click resets to the default width. */
export default function ColumnResizer({ width, onChange }: ColumnResizerProps) {
  const drag = useRef<{ startX: number; startWidth: number } | null>(null);

  return (
    <div
      className="column-resizer"
      role="separator"
      aria-orientation="vertical"
      aria-valuenow={width}
      title="Drag to resize · double-click to reset"
      onPointerDown={(e) => {
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        drag.current = { startX: e.clientX, startWidth: width };
        document.body.classList.add('is-resizing-column');
      }}
      onPointerMove={(e) => {
        if (!drag.current) return;
        // Handle sits on the column's left edge: dragging left widens the column.
        onChange(clampRightColumnWidth(drag.current.startWidth + drag.current.startX - e.clientX));
      }}
      onPointerUp={(e) => {
        drag.current = null;
        e.currentTarget.releasePointerCapture(e.pointerId);
        document.body.classList.remove('is-resizing-column');
      }}
      onDoubleClick={() => onChange(DEFAULT_RIGHT_COLUMN_WIDTH)}
    />
  );
}
