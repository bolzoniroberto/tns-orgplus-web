import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import type { WidgetConfig, StatsQueryResponse } from '@/types'

interface UseWidgetDataResult {
  data: StatsQueryResponse | null
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useWidgetData(config: WidgetConfig): UseWidgetDataResult {
  const [data, setData] = useState<StatsQueryResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    api.stats.query({
      entity: config.entity,
      groupBy: config.groupBy,
      groupBy2: config.groupBy2,
      aggregation: config.aggregation,
      aggregationField: config.aggregationField,
      includeNull: config.includeNull,
      limit: config.type === 'data_table' ? 200 : 50,
    }).then(res => {
      if (!cancelled) {
        setData(res)
        setLoading(false)
      }
    }).catch(err => {
      if (!cancelled) {
        setError(err instanceof Error ? err.message : 'Errore caricamento dati')
        setLoading(false)
      }
    })

    return () => { cancelled = true }
  }, [
    config.entity, config.groupBy, config.groupBy2,
    config.aggregation, config.aggregationField,
    config.includeNull, config.type, tick,
  ])

  return { data, loading, error, refetch: () => setTick(t => t + 1) }
}
