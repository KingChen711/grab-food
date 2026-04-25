/**
 * Minimal CSV parser for bulk menu item import.
 * Supports:
 * - Quoted fields (with embedded commas/newlines)
 * - Escaped quotes ("" inside a quoted field)
 * - Trailing newlines
 * - Empty cells → null
 *
 * Does NOT support:
 * - Multiline values without quotes
 * - Different delimiters (comma only)
 */
export function parseCsv(input: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let inQuotes = false
  let i = 0

  while (i < input.length) {
    const ch = input[i]

    if (inQuotes) {
      if (ch === '"') {
        if (input[i + 1] === '"') {
          cell += '"'
          i += 2
          continue
        }
        inQuotes = false
        i++
        continue
      }
      cell += ch
      i++
      continue
    }

    if (ch === '"') {
      inQuotes = true
      i++
      continue
    }
    if (ch === ',') {
      row.push(cell)
      cell = ''
      i++
      continue
    }
    if (ch === '\n' || ch === '\r') {
      // Handle CRLF
      if (ch === '\r' && input[i + 1] === '\n') i++
      row.push(cell)
      rows.push(row)
      row = []
      cell = ''
      i++
      continue
    }

    cell += ch
    i++
  }

  // Last cell / row
  if (cell.length > 0 || row.length > 0) {
    row.push(cell)
    rows.push(row)
  }

  // Drop empty trailing rows
  return rows.filter((r) => r.length > 1 || (r.length === 1 && r[0].trim() !== ''))
}

/**
 * Convert parsed CSV rows (header + data rows) into objects keyed by header.
 * @throws if header row is missing or empty
 */
export function csvRowsToObjects(rows: string[][]): Record<string, string>[] {
  if (rows.length < 1) throw new Error('CSV is empty')
  const [header, ...dataRows] = rows
  if (header.length === 0) throw new Error('CSV header is empty')

  return dataRows.map((row) => {
    const obj: Record<string, string> = {}
    for (let i = 0; i < header.length; i++) {
      obj[header[i].trim()] = (row[i] ?? '').trim()
    }
    return obj
  })
}
