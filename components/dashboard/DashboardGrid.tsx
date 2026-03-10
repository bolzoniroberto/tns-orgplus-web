'use client'
import { useState } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  arrayMove,
  rectSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Dashboard, WidgetConfig } from '@/types'
import { useDashboardStore } from '@/store/useDashboardStore'
import Widget from './Widget'
import WidgetConfigModal from './WidgetConfigModal'

const SIZE_SPAN: Record<string, string> = {
  small: 'col-span-1',
  medium: 'col-span-2',
  large: 'col-span-3',
}

function SortableWidget({ config, onEdit, onDelete }: { config: WidgetConfig; onEdit: () => void; onDelete: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: config.id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }
  const dragHandle = (
    <span {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1 text-gray-300 hover:text-gray-500 dark:text-gray-600 dark:hover:text-gray-400 flex-none" title="Trascina">
      ⠿
    </span>
  )
  return (
    <div ref={setNodeRef} style={style} className={SIZE_SPAN[config.size]}>
      <Widget config={config} onEdit={onEdit} onDelete={onDelete} dragHandle={dragHandle} />
    </div>
  )
}

interface Props {
  dashboard: Dashboard
}

export default function DashboardGrid({ dashboard }: Props) {
  const { addWidget, updateWidget, deleteWidget, reorderWidgets } = useDashboardStore()
  const [modalOpen, setModalOpen] = useState(false)
  const [editingWidget, setEditingWidget] = useState<WidgetConfig | undefined>()

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIdx = dashboard.widgets.findIndex(w => w.id === active.id)
    const newIdx = dashboard.widgets.findIndex(w => w.id === over.id)
    reorderWidgets(dashboard.id, arrayMove(dashboard.widgets, oldIdx, newIdx))
  }

  function openAdd() {
    setEditingWidget(undefined)
    setModalOpen(true)
  }

  function openEdit(widget: WidgetConfig) {
    setEditingWidget(widget)
    setModalOpen(true)
  }

  function handleSave(config: WidgetConfig) {
    if (editingWidget) {
      updateWidget(dashboard.id, config)
    } else {
      addWidget(dashboard.id, config)
    }
    setModalOpen(false)
  }

  return (
    <>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={dashboard.widgets.map(w => w.id)} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-3 gap-4 p-4">
            {dashboard.widgets.map(widget => (
              <SortableWidget
                key={widget.id}
                config={widget}
                onEdit={() => openEdit(widget)}
                onDelete={() => deleteWidget(dashboard.id, widget.id)}
              />
            ))}

            {/* Add widget card */}
            <div className="col-span-1">
              <button
                onClick={openAdd}
                className="w-full border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg flex flex-col items-center justify-center gap-2 text-gray-400 dark:text-gray-600 hover:border-indigo-400 hover:text-indigo-500 dark:hover:border-indigo-600 dark:hover:text-indigo-400 transition-colors"
                style={{ minHeight: '200px' }}
              >
                <span className="text-3xl">+</span>
                <span className="text-sm">Aggiungi widget</span>
              </button>
            </div>
          </div>
        </SortableContext>
      </DndContext>

      <WidgetConfigModal
        open={modalOpen}
        initial={editingWidget}
        onSave={handleSave}
        onClose={() => setModalOpen(false)}
      />
    </>
  )
}
