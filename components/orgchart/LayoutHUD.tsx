'use client'

import React, { useState, useEffect, useRef } from 'react'

const MODE_META: Record<string, { icon: string; label: string }> = {
  'Grid Layout':        { icon: '▦', label: 'Grid Layout' },
  'Albero Profondo':    { icon: '↕', label: 'Albero Profondo' },
  'Vista Compatta':     { icon: '⊟', label: 'Vista Compatta' },
  'Stacking Verticale': { icon: '⇅', label: 'Stacking Verticale' },
}

interface LayoutHUDProps {
  activeLayoutModes: string[]
}

export default function LayoutHUD({ activeLayoutModes }: LayoutHUDProps) {
  const [visible, setVisible] = useState(true)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Reset fadeout timer whenever modes change
  useEffect(() => {
    setVisible(true)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setVisible(false), 4000)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [activeLayoutModes])

  if (activeLayoutModes.length === 0) return null

  return (
    <div
      className="flex flex-col gap-1 transition-opacity duration-500"
      style={{ opacity: visible ? 1 : 0 }}
    >
      {activeLayoutModes.map((mode) => {
        const meta = MODE_META[mode] ?? { icon: '◈', label: mode }
        return (
          <div
            key={mode}
            className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs
                       bg-white/90 border border-gray-200 shadow-sm text-gray-600
                       backdrop-blur-sm"
          >
            <span className="text-gray-400">{meta.icon}</span>
            <span>{meta.label}</span>
          </div>
        )
      })}
    </div>
  )
}
