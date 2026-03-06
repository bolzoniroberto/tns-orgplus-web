'use client'
import React, { useCallback, useRef, useState } from 'react'
import { Upload, FileX, Table } from 'lucide-react'
import { parseFileBuffer } from '@/lib/enrichment/parseFile'
import type { ParsedFile } from '@/lib/enrichment/parseFile'

interface Props {
  onNext: (parsed: ParsedFile, fileName: string) => void
}

export default function StepUpload({ onNext }: Props) {
  const [dragOver, setDragOver] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<ParsedFile | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [parsing, setParsing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback(async (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase()
    if (!['xls', 'xlsx', 'csv'].includes(ext ?? '')) {
      setError('Formato non supportato. Usa .xlsx, .xls o .csv')
      return
    }
    setError(null)
    setParsing(true)
    try {
      const buf = await file.arrayBuffer()
      const parsed = parseFileBuffer(buf)
      if (parsed.headers.length === 0) {
        setError('Il file è vuoto o non contiene intestazioni')
        return
      }
      setSelectedFile(file)
      setPreview(parsed)
    } catch (e) {
      setError(`Errore parsing: ${String(e)}`)
    } finally {
      setParsing(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50">Step 1 — Carica file</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Seleziona un file Excel o CSV con i dati da importare.
        </p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".xls,.xlsx,.csv"
        className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = '' }}
      />

      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={[
          'border-2 border-dashed rounded-xl p-12 flex flex-col items-center justify-center gap-3 transition-colors cursor-pointer',
          dragOver
            ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-950'
            : 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 hover:border-gray-400',
        ].join(' ')}
      >
        <Upload className={`w-8 h-8 ${dragOver ? 'text-indigo-500' : 'text-gray-300 dark:text-gray-500'}`} />
        {parsing ? (
          <p className="text-sm text-gray-500">Analisi in corso…</p>
        ) : (
          <>
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
              <span className="font-medium text-gray-700 dark:text-gray-200">Trascina qui il file</span>
              <br />oppure clicca per selezionare
            </p>
            <p className="text-xs text-gray-400">.xlsx · .xls · .csv</p>
          </>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      {selectedFile && preview && (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Table className="w-4 h-4 text-indigo-500" />
              <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{selectedFile.name}</span>
              <span className="text-xs text-gray-400">
                {preview.rows.length} righe · {preview.headers.length} colonne
              </span>
            </div>
            <button
              onClick={e => { e.stopPropagation(); setSelectedFile(null); setPreview(null) }}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <FileX className="w-4 h-4" />
            </button>
          </div>

          {/* Preview table */}
          <div className="overflow-auto max-h-48 text-xs">
            <table className="min-w-full border-collapse">
              <thead>
                <tr className="bg-gray-100 dark:bg-gray-700">
                  {preview.headers.map(h => (
                    <th key={h} className="px-2 py-1 text-left text-gray-600 dark:text-gray-300 font-medium whitespace-nowrap border-b border-gray-200 dark:border-gray-600">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.rows.slice(0, 5).map((row, i) => (
                  <tr key={i} className="border-b border-gray-100 dark:border-gray-700">
                    {preview.headers.map(h => (
                      <td key={h} className="px-2 py-1 text-gray-700 dark:text-gray-300 whitespace-nowrap max-w-32 truncate">
                        {row[h]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {preview.rows.length > 5 && (
            <p className="text-xs text-gray-400 mt-2">…e altre {preview.rows.length - 5} righe</p>
          )}
        </div>
      )}

      <div className="flex justify-end">
        <button
          onClick={() => preview && selectedFile && onNext(preview, selectedFile.name)}
          disabled={!preview}
          className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-md hover:bg-indigo-700 disabled:opacity-40 font-medium transition-colors"
        >
          Avanti →
        </button>
      </div>
    </div>
  )
}
