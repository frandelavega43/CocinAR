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
  limit = 10,
  signal?: AbortSignal,
): Promise<IngredientSuggestion[]> {
  const trimmed = query.trim()
  if (trimmed.length < 2) return []

  const personal = searchPersonalIngredientSuggestions(trimmed, limit)

  if (isUsingMockData()) {
    await new Promise((resolve) => setTimeout(resolve, 150))
    const mockResults = searchMockProducts(trimmed).map((product) => ({
      name: product.name,
      brand: product.brand,
      presentacion: `${product.quantity} ${product.unit}`,
      priceMin: product.price,
      storeCount: 1,
      suggestedUnit: product.unit,
    }))
    return mergeIngredientSuggestions(personal, mockResults, limit)
  }

  const suggestionLimit = Math.max(limit, isCompoundIngredientQuery(trimmed) ? 25 : 10)
  const { productos } = await searchIngredientProducts(trimmed, suggestionLimit, signal)

  const apiResults = productos.map((product) => ({
    productId: product.id,
    name: product.nombre,
    brand: product.marca,
    presentacion: product.presentacion,
    priceMin: product.precioMin,
    storeCount: product.cantSucursalesDisponible,
    suggestedUnit: parseProductPresentation(product.presentacion, product.nombre).unit,
  }))

  return mergeIngredientSuggestions(personal, apiResults, suggestionLimit)
}
