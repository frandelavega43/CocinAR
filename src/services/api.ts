import type { ProductPrice } from '../types'
import { fetchMarketPrices } from './marketPrice'
import { searchIngredientProducts, isCompoundIngredientQuery } from './ingredientSearch'
import { searchMockProducts } from './mockData'
import { parseProductPresentation } from './presentationParser'
import { isPreciosClarosConfigured } from './preciosClaros/client'
import {
  mergeIngredientSuggestions,
  searchPersonalIngredientSuggestions,
} from './personalIngredientSearch'

const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'

const SUGGESTION_CACHE_TTL_MS = 2 * 60 * 1000
const suggestionCache = new Map<
  string,
  { results: IngredientSuggestion[]; fetchedAt: number }
>()

function getCachedSuggestions(query: string): IngredientSuggestion[] | null {
  const cached = suggestionCache.get(query)
  if (!cached) return null
  if (Date.now() - cached.fetchedAt > SUGGESTION_CACHE_TTL_MS) {
    suggestionCache.delete(query)
    return null
  }
  return cached.results
}

function setCachedSuggestions(query: string, results: IngredientSuggestion[]) {
  suggestionCache.set(query, { results, fetchedAt: Date.now() })
  if (suggestionCache.size > 60) {
    const oldest = [...suggestionCache.entries()].sort(
      (left, right) => left[1].fetchedAt - right[1].fetchedAt,
    )[0]
    if (oldest) suggestionCache.delete(oldest[0])
  }
}

export function peekIngredientSuggestions(
  query: string,
  limit = 18,
): IngredientSuggestion[] | null {
  const trimmed = query.trim()
  if (trimmed.length < 2) return null
  return getCachedSuggestions(`${trimmed.toLowerCase()}|${limit}`)
}

export interface IngredientSuggestion {
  name: string
  brand?: string
  presentacion?: string
  productId?: string
  priceMin?: number
  storeCount?: number
  suggestedUnit?: string
  isPersonal?: boolean
  personalIngredientId?: string
  manualUnitPrice?: number
}

export function isUsingMockData(): boolean {
  return USE_MOCK || !isPreciosClarosConfigured()
}

async function fetchIngredientPrices(name: string): Promise<ProductPrice[]> {
  if (isUsingMockData()) {
    return searchMockProducts(name)
  }

  return fetchMarketPrices(name)
}

export async function fetchPricesByIngredients(
  items: Array<{ name: string }>,
): Promise<Map<string, ProductPrice[]>> {
  const result = new Map<string, ProductPrice[]>()
  const uniqueItems = [
    ...new Map(items.map((item) => [item.name.trim().toLowerCase(), item])).values(),
  ]

  if (uniqueItems.length === 0) return result

  if (isUsingMockData()) {
    await new Promise((resolve) => setTimeout(resolve, 250))
  }

  for (const item of uniqueItems) {
    const key = item.name.trim().toLowerCase()
    try {
      const prices = await fetchIngredientPrices(item.name)
      result.set(key, prices)
    } catch {
      result.set(key, [])
    }
  }

  return result
}

export async function searchIngredientSuggestions(
  query: string,
  limit = 18,
  signal?: AbortSignal,
): Promise<IngredientSuggestion[]> {
  const trimmed = query.trim()
  if (trimmed.length < 2) return []

  const cacheKey = `${trimmed.toLowerCase()}|${limit}`
  const cached = getCachedSuggestions(cacheKey)
  if (cached) return cached

  const personal = searchPersonalIngredientSuggestions(trimmed, limit)

  if (isUsingMockData()) {
    const mockResults = searchMockProducts(trimmed).map((product) => ({
      name: product.name,
      brand: product.brand,
      presentacion: `${product.quantity} ${product.unit}`,
      priceMin: product.price,
      storeCount: 1,
      suggestedUnit: product.unit,
    }))
    const merged = mergeIngredientSuggestions(personal, mockResults, limit)
    setCachedSuggestions(cacheKey, merged)
    return merged
  }

  const suggestionLimit = Math.max(limit, isCompoundIngredientQuery(trimmed) ? 24 : 18)
  const { productos } = await searchIngredientProducts(
    trimmed,
    suggestionLimit,
    signal,
    'suggest',
  )

  if (signal?.aborted) return personal

  const apiResults = productos.map((product) => ({
    productId: product.id,
    name: product.nombre,
    brand: product.marca,
    presentacion: product.presentacion,
    priceMin: product.precioMin,
    storeCount: product.cantSucursalesDisponible,
    suggestedUnit: parseProductPresentation(product.presentacion, product.nombre).unit,
  }))

  const merged = mergeIngredientSuggestions(personal, apiResults, limit)
  setCachedSuggestions(cacheKey, merged)
  return merged
}
