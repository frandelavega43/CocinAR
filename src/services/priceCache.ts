import type { ProductPrice } from '../types'

const CACHE_KEY = 'cocinaar-price-cache'

export interface CachedPriceEntry {
  productId?: string
  products: ProductPrice[]
  fetchedAt: string
}

function normalizeKey(key: string): string {
  return key.trim().toLowerCase()
}

function readCache(): Record<string, CachedPriceEntry> {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return {}
    return JSON.parse(raw) as Record<string, CachedPriceEntry>
  } catch {
    return {}
  }
}

function writeCache(cache: Record<string, CachedPriceEntry>) {
  localStorage.setItem(CACHE_KEY, JSON.stringify(cache))
}

export function getCachedPrices(key: string): CachedPriceEntry | null {
  const cache = readCache()
  return cache[normalizeKey(key)] ?? null
}

export function setCachedPrices(key: string, products: ProductPrice[]) {
  const cache = readCache()
  const normalized = normalizeKey(key)

  cache[normalized] = {
    productId: products[0]?.id.split('-')[0],
    products,
    fetchedAt: new Date().toISOString(),
  }

  writeCache(cache)
}

export function getAllCachedIngredientNames(): string[] {
  const cache = readCache()
  return Object.values(cache)
    .map((entry) => entry.products[0]?.name ?? '')
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, 'es'))
}

export function clearPriceCache() {
  localStorage.removeItem(CACHE_KEY)
}
