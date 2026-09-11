import { calculateIngredientCostSafe } from './costCalculator'
import { fetchPricesByIngredients } from './api'
import { countUniqueBrands } from './marketPrice'
import { getCachedPrices, setCachedPrices } from './priceCache'
import type { ProductPrice, RecipeIngredient } from '../types'

function ingredientPriceKey(name: string, searchQuery?: string): string {
  return (searchQuery?.trim() || name).trim().toLowerCase()
}

export function createManualIngredient(
  name: string,
  quantity: number,
  unit: string,
  totalPrice: number,
  existingId?: string,
  options?: { priceSource?: 'manual' | 'mercado-central' },
): RecipeIngredient {
  const manualUnitPrice = quantity > 0 ? totalPrice / quantity : 0
  const priceSource = options?.priceSource ?? 'manual'
  const isFresh = priceSource === 'mercado-central'

  return {
    id: existingId ?? crypto.randomUUID(),
    name,
    quantity,
    unit,
    isManual: !isFresh,
    manualUnitPrice,
    averageUnitPrice: manualUnitPrice,
    matchedPrices: isFresh
      ? [
          {
            id: existingId ?? `mc-ref-${name}`,
            name,
            brand: 'Mercado Central',
            store: 'Referencia frescos',
            price: manualUnitPrice,
            unit,
            quantity: 1,
          },
        ]
      : [],
    lineCost: totalPrice,
    status: 'ready',
    brandCount: isFresh ? 1 : undefined,
    priceSource,
  }
}

export function recalculateManualIngredient(
  ingredient: RecipeIngredient,
  quantity: number,
  unit: string,
): RecipeIngredient {
  const manualUnitPrice = ingredient.manualUnitPrice ?? 0
  const lineCost = manualUnitPrice * quantity
  const isFresh = ingredient.priceSource === 'mercado-central'

  return {
    ...ingredient,
    quantity,
    unit,
    averageUnitPrice: manualUnitPrice,
    lineCost,
    status: 'ready',
    isManual: !isFresh,
    priceSource: ingredient.priceSource ?? 'manual',
    matchedPrices: isFresh
      ? [
          {
            id: ingredient.id,
            name: ingredient.name,
            brand: 'Mercado Central',
            store: 'Referencia frescos',
            price: manualUnitPrice,
            unit,
            quantity: 1,
          },
        ]
      : ingredient.matchedPrices,
  }
}

export function restoreManualIngredient(
  item: {
    id: string
    name: string
    quantity: number
    unit: string
    manualUnitPrice?: number
    priceSource?: 'manual' | 'mercado-central' | 'sepa'
  },
): RecipeIngredient {
  const priceSource =
    item.priceSource === 'mercado-central' ? 'mercado-central' : 'manual'
  const totalPrice = (item.manualUnitPrice ?? 0) * item.quantity
  return createManualIngredient(
    item.name,
    item.quantity,
    item.unit,
    totalPrice,
    item.id,
    { priceSource },
  )
}

export function createPendingIngredient(
  name: string,
  quantity: number,
  unit: string,
  searchQuery?: string,
  existingId?: string,
): RecipeIngredient {
  return {
    id: existingId ?? crypto.randomUUID(),
    name,
    searchQuery,
    quantity,
    unit,
    averageUnitPrice: 0,
    matchedPrices: [],
    lineCost: 0,
    status: 'pending',
  }
}

function buildReadyIngredient(
  name: string,
  quantity: number,
  unit: string,
  rawPrices: ProductPrice[],
  searchQuery?: string,
  existingId?: string,
  fetchedAt?: string,
): RecipeIngredient {
  if (rawPrices.length === 0) {
    return {
      id: existingId ?? crypto.randomUUID(),
      name,
      searchQuery,
      quantity,
      unit,
      averageUnitPrice: 0,
      matchedPrices: [],
      lineCost: 0,
      status: 'error',
      errorMessage:
        'No se encontraron precios. Probá Precio manual: carne y verdura a granel suelen no estar en supermercados.',
    }
  }

  const calculated = calculateIngredientCostSafe(name, quantity, unit, rawPrices, existingId)

  if (!calculated.ok) {
    return {
      id: existingId ?? crypto.randomUUID(),
      name,
      searchQuery,
      quantity,
      unit,
      averageUnitPrice: 0,
      matchedPrices: rawPrices,
      lineCost: 0,
      status: 'error',
      errorMessage: calculated.errorMessage,
    }
  }

  const fromMercadoCentral = rawPrices.some((price) =>
    price.brand?.toLowerCase().includes('mercado central'),
  )

  return {
    ...calculated.ingredient,
    name,
    searchQuery,
    status: 'ready',
    brandCount: countUniqueBrands(calculated.ingredient.matchedPrices),
    priceFetchedAt: fetchedAt,
    priceSource: fromMercadoCentral ? 'mercado-central' : 'sepa',
  }
}

export function resolveIngredientFromCache(
  name: string,
  quantity: number,
  unit: string,
  searchQuery?: string,
  existingId?: string,
): RecipeIngredient {
  const key = ingredientPriceKey(name, searchQuery)
  const cached = key ? getCachedPrices(key) : null

  if (!cached) {
    return createPendingIngredient(name, quantity, unit, searchQuery, existingId)
  }

  return buildReadyIngredient(
    name,
    quantity,
    unit,
    cached.products,
    searchQuery,
    existingId,
    cached.fetchedAt,
  )
}

export function createLoadingIngredient(
  name: string,
  quantity: number,
  unit: string,
  searchQuery?: string,
  existingId?: string,
): RecipeIngredient {
  return {
    id: existingId ?? crypto.randomUUID(),
    name,
    searchQuery,
    quantity,
    unit,
    averageUnitPrice: 0,
    matchedPrices: [],
    lineCost: 0,
    status: 'loading',
  }
}

export async function fetchPricesForIngredients(
  ingredients: Array<{
    id: string
    name: string
    searchQuery?: string
    quantity: number
    unit: string
  }>,
): Promise<RecipeIngredient[]> {
  const uniqueItems = [
    ...new Map(
      ingredients.map((item) => [ingredientPriceKey(item.name, item.searchQuery), item]),
    ).values(),
  ]

  const pricesByKey = await fetchPricesByIngredients(
    uniqueItems.map((item) => ({
      name: item.searchQuery?.trim() || item.name,
    })),
  )
  const fetchedAt = new Date().toISOString()

  for (const [key, prices] of pricesByKey.entries()) {
    if (prices.length > 0) {
      setCachedPrices(key, prices)
    }
  }

  return ingredients.map((ingredient) => {
    const key = ingredientPriceKey(ingredient.name, ingredient.searchQuery)
    const prices = pricesByKey.get(key) ?? []

    if (prices.length === 0) {
      return {
        id: ingredient.id,
        name: ingredient.name,
        searchQuery: ingredient.searchQuery,
        quantity: ingredient.quantity,
        unit: ingredient.unit,
        averageUnitPrice: 0,
        matchedPrices: [],
        lineCost: 0,
        status: 'error',
        errorMessage:
          'No encontramos precios en supermercados. Para carne/verdura a granel usá Precio manual o Mis ingredientes.',
      }
    }

    return buildReadyIngredient(
      ingredient.name,
      ingredient.quantity,
      ingredient.unit,
      prices,
      ingredient.searchQuery,
      ingredient.id,
      fetchedAt,
    )
  })
}
