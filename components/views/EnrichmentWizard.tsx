'use client'
import React, { useState } from 'react'
import { CheckCircle } from 'lucide-react'
import StepUpload from '@/components/enrichment/StepUpload'
import StepIdMapping from '@/components/enrichment/StepIdMapping'
import StepColMapping from '@/components/enrichment/StepColMapping'
import StepPreview from '@/components/enrichment/StepPreview'
import { useOrgStore } from '@/store/useOrgStore'
import type { EnrichmentColumnMapping } from '@/types'
import type { ParsedFile } from '@/lib/enrichment/parseFile'

type Step = 1 | 2 | 3 | 4

const STEP_LABELS = ['Carica file', 'Tipo / ID', 'Colonne', 'Anteprima']

export default function EnrichmentWizard() {
  const { showToast, setActiveTab } = useOrgStore()

  const [step, setStep] = useState<Step>(1)
  const [parsedFile, setParsedFile] = useState<ParsedFile | null>(null)
  const [fileName, setFileName] = useState('')
  const [entityType, setEntityType] = useState<'dipendente' | 'struttura'>('dipendente')
  const [idColumn, setIdColumn] = useState('')
  const [columnMappings, setColumnMappings] = useState<EnrichmentColumnMapping[]>([])
  const [done, setDone] = useState(false)

  function reset() {
    setStep(1)
    setParsedFile(null)
    setFileName('')
    setEntityType('dipendente')
    setIdColumn('')
    setColumnMappings([])
    setDone(false)
  }

  function handleApplied() {
    setDone(true)
    showToast('Arricchimento applicato con successo', 'success')
  }

  if (done) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <CheckCircle className="w-12 h-12 text-green-500" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-50">Arricchimento completato</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Le modifiche sono state salvate. Puoi verificarle nello Storico.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={reset}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 transition-colors"
          >
            Nuovo arricchimento
          </button>
          <button
            onClick={() => setActiveTab('storico')}
            className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-md hover:bg-indigo-700 font-medium transition-colors"
          >
            Vai allo Storico
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Step indicator */}
      <div className="flex-none px-8 py-4 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-0 max-w-2xl">
          {STEP_LABELS.map((label, i) => {
            const n = (i + 1) as Step
            const active = step === n
            const done = step > n
            return (
              <React.Fragment key={n}>
                {i > 0 && (
                  <div className={`h-px flex-1 mx-2 ${done ? 'bg-indigo-400' : 'bg-gray-200 dark:bg-gray-700'}`} />
                )}
                <div className="flex items-center gap-1.5 shrink-0">
                  <div className={[
                    'w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold transition-colors',
                    active
                      ? 'bg-indigo-600 text-white'
                      : done
                      ? 'bg-indigo-400 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400',
                  ].join(' ')}>
                    {n}
                  </div>
                  <span className={`text-xs font-medium hidden sm:block ${active ? 'text-indigo-600 dark:text-indigo-400' : done ? 'text-gray-500' : 'text-gray-400'}`}>
                    {label}
                  </span>
                </div>
              </React.Fragment>
            )
          })}
        </div>
      </div>

      {/* Step content */}
      <div className="flex-1 overflow-auto px-8 py-6">
        <div className="max-w-4xl mx-auto">
          {step === 1 && (
            <StepUpload
              onNext={(parsed, name) => {
                setParsedFile(parsed)
                setFileName(name)
                setColumnMappings([])
                setStep(2)
              }}
            />
          )}

          {step === 2 && parsedFile && (
            <StepIdMapping
              headers={parsedFile.headers}
              rows={parsedFile.rows}
              entityType={entityType}
              idColumn={idColumn}
              onChangeEntityType={v => { setEntityType(v); setColumnMappings([]) }}
              onChangeIdColumn={v => { setIdColumn(v); setColumnMappings([]) }}
              onNext={() => setStep(3)}
              onBack={() => setStep(1)}
            />
          )}

          {step === 3 && parsedFile && (
            <StepColMapping
              headers={parsedFile.headers}
              rows={parsedFile.rows}
              idColumn={idColumn}
              entityType={entityType}
              columnMappings={columnMappings}
              onChange={setColumnMappings}
              onNext={() => setStep(4)}
              onBack={() => setStep(2)}
            />
          )}

          {step === 4 && parsedFile && (
            <StepPreview
              config={{ entityType, idColumn, columnMappings }}
              rows={parsedFile.rows}
              onApplied={handleApplied}
              onBack={() => setStep(3)}
            />
          )}
        </div>
      </div>
    </div>
  )
}
