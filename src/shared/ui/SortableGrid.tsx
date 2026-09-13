import type { CSSProperties, ReactNode } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

export interface SortableRenderState {
  isDragging: boolean;
}

interface Props<T> {
  items: T[];
  getId: (item: T) => string;
  /** Dipanggil dengan indeks asal dan tujuan setelah drop. */
  onReorder: (from: number, to: number) => void;
  renderItem: (item: T, index: number, state: SortableRenderState) => ReactNode;
  className?: string;
  disabled?: boolean;
}

/**
 * Grid yang bisa diurutkan dengan drag (pointer + keyboard).
 * Memakai pointer events, jadi tetap berjalan meski drag-drop native Tauri aktif.
 */
export function SortableGrid<T>({
  items,
  getId,
  onReorder,
  renderItem,
  className = "",
  disabled = false,
}: Props<T>) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const ids = items.map(getId);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = ids.indexOf(String(active.id));
    const to = ids.indexOf(String(over.id));
    if (from >= 0 && to >= 0) onReorder(from, to);
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={ids} strategy={rectSortingStrategy} disabled={disabled}>
        <div className={className}>
          {items.map((item, index) => (
            <SortableItem key={ids[index]} id={ids[index]} disabled={disabled}>
              {(state) => renderItem(item, index, state)}
            </SortableItem>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

function SortableItem({
  id,
  disabled,
  children,
}: {
  id: string;
  disabled: boolean;
  children: (state: SortableRenderState) => ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled,
  });
  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
    opacity: isDragging ? 0.85 : 1,
    touchAction: "none",
  };
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {children({ isDragging })}
    </div>
  );
}
