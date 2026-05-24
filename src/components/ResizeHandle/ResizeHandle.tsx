import { useRef } from "react";

interface Props {
  direction: "horizontal" | "vertical";
  onResize: (delta: number) => void;
}

export function ResizeHandle({ direction, onResize }: Props) {
  const startPos = useRef<number>(0);

  const isH = direction === "horizontal";

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    startPos.current = isH ? e.clientX : e.clientY;
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
    const current = isH ? e.clientX : e.clientY;
    const delta = current - startPos.current;
    startPos.current = current;
    onResize(delta);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  return (
    <div
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      className={`shrink-0 flex items-center justify-center group transition-colors z-10
        ${isH
          ? "w-1.5 cursor-col-resize hover:bg-violet-500/30 dark:bg-surface-600 bg-gray-200"
          : "h-1.5 cursor-row-resize hover:bg-violet-500/30 dark:bg-surface-600 bg-gray-200"
        }`}
    >
      <div
        className={`rounded-full bg-gray-500 group-hover:bg-violet-400 transition-colors
          ${isH ? "w-0.5 h-6" : "h-0.5 w-6"}`}
      />
    </div>
  );
}
