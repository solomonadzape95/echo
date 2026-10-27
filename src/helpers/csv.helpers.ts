export interface MasterlistCsvStudent {
  name: string
  regNo: string
}

export interface MasterlistCsvParseResult {
  students: MasterlistCsvStudent[]
  errors: Array<{ line: number; message: string }>
}

const REG_HEADERS = [
  'regno',
  'regnumber',
  'registrationnumber',
  'matric',
  'matricno',
  'matriculationnumber',
  'studentid',
]

const NAME_HEADERS = [
  'name',
  'fullname',
  'studentname',
  'names',
]

const IGNORED_HEADERS = ['sn', 'sno', 'serial', 'serialno', 'no', 'index', 'id']

function normalizeHeader(value: string): string {
  return value
    .replace(/^\uFEFF/, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
}

function detectDelimiter(line: string): string {
  const candidates: Array<{ delimiter: string; count: number }> = [
    { delimiter: ',', count: 0 },
    { delimiter: '\t', count: 0 },
    { delimiter: ';', count: 0 },
  ]

  let inQuotes = false
  for (const char of line) {
    if (char === '"') {
      inQuotes = !inQuotes
      continue
    }
    if (!inQuotes) {
      const candidate = candidates.find((entry) => entry.delimiter === char)
      if (candidate) candidate.count++
    }
  }

  return candidates.sort((a, b) => b.count - a.count)[0]?.delimiter ?? ','
}

/** Minimal RFC-4180 style parser: handles quotes, escaped quotes and newlines inside quotes. */
export function parseDelimited(text: string, delimiter: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false

  const source = text.replace(/^\uFEFF/, '')

  for (let i = 0; i < source.length; i++) {
    const char = source[i]

    if (inQuotes) {
      if (char === '"') {
        if (source[i + 1] === '"') {
          field += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        field += char
      }
      continue
    }

    if (char === '"') {
      inQuotes = true
    } else if (char === delimiter) {
      row.push(field)
      field = ''
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && source[i + 1] === '\n') i++
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else {
      field += char
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field)
    rows.push(row)
  }

  return rows
}

/**
 * Parse a masterlist CSV into `{ name, regNo }` records.
 *
 * Accepted headers (case/spacing/punctuation insensitive):
 *   name:  name, full name, student name
 *   regNo: reg no, reg number, registration number, matric no, student id
 * Columns such as `S/N` are ignored.
 */
export function parseMasterlistCsv(text: string): MasterlistCsvParseResult {
  const errors: MasterlistCsvParseResult['errors'] = []
  const lines = text.split(/\r\n|\n|\r/).filter((line) => line.trim().length > 0)

  if (lines.length === 0) {
    return { students: [], errors: [{ line: 1, message: 'The file is empty.' }] }
  }

  const delimiter = detectDelimiter(lines[0]!)
  const rows = parseDelimited(text, delimiter).filter((row) =>
    row.some((cell) => cell.trim().length > 0)
  )

  if (rows.length === 0) {
    return { students: [], errors: [{ line: 1, message: 'The file is empty.' }] }
  }

  const header = rows[0]!.map(normalizeHeader)
  const regIndex = header.findIndex((value) => REG_HEADERS.includes(value))
  const nameIndex = header.findIndex((value) => NAME_HEADERS.includes(value))

  if (regIndex === -1 || nameIndex === -1) {
    return {
      students: [],
      errors: [{
        line: 1,
        message:
          'Missing header row. The first row must contain a name column and a registration number column (for example: Name, Reg No).',
      }],
    }
  }

  const students: MasterlistCsvStudent[] = []
  const seen = new Map<string, number>()

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]!
    const line = i + 1

    // Rows that only carry ignored columns are padding, not errors.
    const meaningful = row.some((cell, index) =>
      cell.trim().length > 0 && !IGNORED_HEADERS.includes(header[index] ?? '')
    )
    if (!meaningful) continue

    const name = (row[nameIndex] ?? '').trim()
    const regNo = (row[regIndex] ?? '').trim()

    if (!name) {
      errors.push({ line, message: 'Missing student name.' })
      continue
    }

    if (!regNo) {
      errors.push({ line, message: 'Missing registration number.' })
      continue
    }

    if (name.length > 255) {
      errors.push({ line, message: 'Student name is longer than 255 characters.' })
      continue
    }

    if (regNo.length > 255) {
      errors.push({ line, message: 'Registration number is longer than 255 characters.' })
      continue
    }

    const key = regNo.toLowerCase()
    const previousLine = seen.get(key)
    if (previousLine !== undefined) {
      errors.push({
        line,
        message: `Duplicate registration number "${regNo}" (already used on line ${previousLine}).`,
      })
      continue
    }

    seen.set(key, line)
    students.push({ name, regNo })
  }

  if (students.length === 0 && errors.length === 0) {
    errors.push({ line: 2, message: 'No student rows were found below the header.' })
  }

  return { students, errors }
}

/** A small starter file admins can download and fill in. */
export function masterlistCsvTemplate(): string {
  return [
    'Name,Reg No',
    'Ada Lovelace,REG001',
    'Alan Turing,REG002',
  ].join('\n')
}
