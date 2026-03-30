"use client";
import { useRef, useCallback, useState } from "react";

interface ResizeHandleProps {
  onResize: (delta: number) => void;
  side: "right" | "left";
}

export default function ResizeHandle({ onResize, side }: ResizeHandleProps) {
  const dragging = useRef(false);
  const lastX = useRef(0);
  const [active, setActive] = useState(false);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = true;
    lastX.current = e.clientX;
    setActive(true);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    function onMouseMove(ev: MouseEvent) {
      if (!dragging.current) return;
      const delta = ev.clientX - lastX.current;
      lastX.current = ev.clientX;
      onResize(side === "right" ? delta : -delta);
    }

    function onMouseUp() {
      dragging.current = false;
      setActive(false);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    }

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  }, [onResize, side]);

  return (
    <div
      onMouseDown={onMouseDown}
      className="group relative flex-shrink-0 flex items-center justify-center cursor-col-resize select-none"
      style={{ width: 6, zIndex: 20 }}
      title="Drag to resize"
    >
      {/* Track line — always present, visible on hover/active */}
      <div
        className="absolute inset-y-0 transition-all duration-150"
        style={{
          width: active ? 3 : 2,
          left: "50%",
          transform: "translateX(-50%)",
          background: active ? "#06b6d4" : "var(--border)",
          opacity: active ? 1 : 0,
          borderRadius: 99,
        }}
      />
      {/* Hover reveal */}
      <div
        className="absolute inset-y-0 group-hover:opacity-100 opacity-0 transition-opacity duration-150"
        style={{
          width: 2,
          left: "50%",
          transform: "translateX(-50%)",
          background: "var(--border)",
          borderRadius: 99,
        }}
      />
      {/* Grip dots — center of handle */}
      <div
        className="absolute flex flex-col gap-[3px] opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none"
        style={{ top: "50%", transform: "translateY(-50%)" }}
      >
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="rounded-full"
            style={{
              width: 3,
              height: 3,
              background: active ? "#06b6d4" : "var(--text-faint)",
            }}
          />
        ))}
      </div>
    </div>
  );
}
