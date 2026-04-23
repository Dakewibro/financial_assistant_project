import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Maximize2, Minimize2, RectangleHorizontal } from "lucide-react";
import { SIZE_TO_COLS, WIDGETS } from "./registry";

export default function SortableWidget({ id, size, editMode, onResize, data, isOverlay = false }) {
  const {
    attributes, listeners, setNodeRef, transform, transition, isDragging,
  } = useSortable({ id, disabled: !editMode || isOverlay });

  const cols = SIZE_TO_COLS[size];
  const style = isOverlay ? {
    width: "100%",
    height: "100%",
  } : {
    transform: CSS.Transform.toString(transform),
    transition,
    gridColumn: `span ${cols} / span ${cols}`,
    alignSelf: "start",
    // Hide the original visually while a DragOverlay ghost follows the cursor
    opacity: isDragging ? 0 : 1,
    zIndex: isDragging ? 0 : "auto",
  };

  const W = WIDGETS[id];
  if (!W) return null;

  // Placeholder state: dashed outline at the origin slot while dragging
  if (isDragging && !isOverlay) {
    return (
      <div ref={setNodeRef} style={style} data-testid={`widget-${id}-placeholder`} data-size={size}>
        <div className="rounded-xl border-2 border-dashed border-moss/40 bg-moss-soft/40 h-full min-h-[120px]" />
      </div>
    );
  }

  return (
    <div
      ref={isOverlay ? undefined : setNodeRef}
      style={style}
      data-testid={`widget-${id}`}
      data-size={size}
      className={`relative ${isOverlay ? "shadow-2xl rotate-[0.5deg] scale-[1.02] cursor-grabbing" : ""}`}
    >
      {editMode && !isOverlay && (
        <div className="absolute inset-0 rounded-xl border-2 border-dashed border-moss/50 z-10 pointer-events-none" />
      )}
      {editMode && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1 bg-white border border-sand-200 shadow-sm rounded-full pl-1 pr-1 py-1">
          <button
            className="p-1 rounded-full hover:bg-sand-100 cursor-grab active:cursor-grabbing touch-none"
            {...listeners} {...attributes}
            data-testid={`drag-${id}`}
            aria-label="Drag to reorder"
          >
            <GripVertical size={13} className="text-[color:var(--text-secondary)]" />
          </button>
          <div className="w-[1px] h-4 bg-sand-200" />
          <SizeButton active={size === "s"} onClick={() => onResize?.(id, "s")} testid={`size-${id}-s`} title="Small">
            <Minimize2 size={11} />
          </SizeButton>
          <SizeButton active={size === "m"} onClick={() => onResize?.(id, "m")} testid={`size-${id}-m`} title="Medium">
            <RectangleHorizontal size={11} />
          </SizeButton>
          <SizeButton active={size === "l"} onClick={() => onResize?.(id, "l")} testid={`size-${id}-l`} title="Large">
            <Maximize2 size={11} />
          </SizeButton>
        </div>
      )}
      <div className={`${editMode && !isOverlay ? "widget-wiggle pointer-events-none select-none" : ""}`}>
        <W.render size={size} data={data} />
      </div>
    </div>
  );
}

function SizeButton({ active, onClick, children, testid, title }) {
  return (
    <button
      onClick={onClick}
      data-testid={testid}
      title={title}
      className={`px-1.5 py-1 rounded-full text-[10px] font-medium transition-colors ${
        active ? "bg-moss text-white" : "text-[color:var(--text-secondary)] hover:bg-sand-100"
      }`}
    >
      {children}
    </button>
  );
}
