import type { PreciosClarosSearchResponse } from './types'

const SEARCH_CACHE_TTL_MS = 5 * 60 * 1000
const SEARCH_CACHE_MAX = 80

interface CachedSearch {
  data: PreciosClarosSearchResponse
  fetchedAt: number
}

const searchCache = new Map<string, CachedSearch>()

function cacheKey(query: string, limit: number, offset: number): string {
  return `${query.trim().toLowerCase()}|${limit}|${offset}`
}

function pruneSearchCache() {
  if (searchCache.size <= SEARCH_CACHE_MAX) return

  const entries = [...searchCache.entries()].sort(
    (left, right) => left[1].fetchedAt - right[1].fetchedAt,
  )

  const toRemove = entries.slice(0, entries.length - SEARCH_CACHE_MAX)
  for (const [key] of toRemove) {
    searchCache.delete(key)
  }
}

export function getCachedProductSearch(
  query: string,
  limit: number,
  offset: number,
): PreciosClarosSearchResponse | null {
  const key = cacheKey(query, limit, offset)
  const cached = searchCache.get(key)
  if (!cached) return null
  if (Date.now() - cached.fetchedAt > SEARCH_CACHE_TTL_MS) {
    searchCache.delete(key)
    return null
  }
  return cached.data
}

export function setCachedProductSearch(
  query: string,
  limit: number,
  offset: number,
  data: PreciosClarosSearchResponse,
) {
  searchCache.set(cacheKey(query, limit, offset), {
    data,
    fetchedAt: Date.now(),
  })
  pruneSearchCache()
}
