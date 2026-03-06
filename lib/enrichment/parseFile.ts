import * as XLSX from 'xlsx'

export interface ParsedFile {
  headers: string[]
  rows: Record<string, string>[]
}

export function parseFileBuffer(buffer: ArrayBuffer): ParsedFile {
  const workbook = XLSX.read(buffer, { type: 'array' })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' })

  if (data.length === 0) return { headers: [], rows: [] }

  const headers = Object.keys(data[0])
  const rows = data.map(row => {
    const r: Record<string, string> = {}
    for (const h of headers) {
      r[h] = String(row[h] ?? '')
    }
    return r
  })

  return { headers, rows }
}

export function slugify(label: string): string {
  return label
    .toLowerCase()
    .replace(/[àáâã]/g, 'a')
    .replace(/[èéêë]/g, 'e')
    .replace(/[ìíîï]/g, 'i')
    .replace(/[òóôõ]/g, 'o')
    .replace(/[ùúûü]/g, 'u')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}
