import type { CSSProperties, ReactNode } from "react";
import {
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
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
  /** Style tambahan untuk kontainer grid (mis. kolom dinamis). */
  style?: CSSProperties;
  disabled?: boolean;
}

/**
 * Grid yang bisa diurutkan dengan drag (mouse, sentuh dengan long-press, dan keyboard).
 * - Mouse: mulai drag setelah gerak kecil 6px (perilaku desktop asli).
 * - Sentuh: scroll vertikal halaman bekerja normal; tekan lama (~250ms) memulai drag.
 * - Keyboard: navigasi spasi/panah tetap berfungsi.
 */
export function SortableGrid<T>({
  items,
  getId,
  onReorder,
  renderItem,
  className = "",
  style,
  disabled = false,
}: Props<T>) {
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 6 },
    }),
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
        <div className={className} style={style}>
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
    transform: CSS.Transform.toString(
      transform
        ? {
            ...transform,
            scaleX: isDragging ? 1.04 : 1,
            scaleY: isDragging ? 1.04 : 1,
          }
        : isDragging
          ? { x: 0, y: 0, scaleX: 1.04, scaleY: 1.04 }
          : null,
    ),
    transition,
    zIndex: isDragging ? 30 : undefined,
    opacity: isDragging ? 0.95 : 1,
    touchAction: "pan-y",
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`transition-shadow duration-200 motion-reduce:transition-none ${isDragging ? "shadow-2xl rounded-xl ring-2 ring-blue-500/40" : ""}`}
      {...attributes}
      {...listeners}
    >
      {children({ isDragging })}
    </div>
  );
}
