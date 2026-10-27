export interface PaginationParams {
  page: number
  limit: number
  offset: number
}

export interface PaginationMeta {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}

interface ParseOptions {
  defaultLimit?: number
  maxLimit?: number
}

/**
 * Parse and clamp `?page=` / `?limit=` query parameters.
 *
 * Values are never trusted: bad input falls back to the defaults, and the
 * limit is capped so an admin cannot ask for the entire table by accident.
 */
export function parsePagination(
  query: { page?: string; limit?: string },
  options: ParseOptions = {}
): PaginationParams {
  const defaultLimit = options.defaultLimit ?? 20
  const maxLimit = options.maxLimit ?? 100

  const rawPage = Number.parseInt(query.page ?? '', 10)
  const rawLimit = Number.parseInt(query.limit ?? '', 10)

  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1
  const limit = Number.isFinite(rawLimit) && rawLimit > 0
    ? Math.min(rawLimit, maxLimit)
    : defaultLimit

  return { page, limit, offset: (page - 1) * limit }
}

export function buildPaginationMeta(
  total: number,
  page: number,
  limit: number
): PaginationMeta {
  const totalPages = total === 0 ? 0 : Math.ceil(total / limit)

  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  }
}

/** SQL LIKE pattern for a case-insensitive "contains" search. */
export function containsPattern(term: string): string {
  return `%${term.trim().toLowerCase()}%`
}
