import type { MercadoCentralItem, ProductPrice } from '../types'

export type { MercadoCentralItem }

interface FreshPricesResponse {
  updatedAt?: string
  items?: MercadoCentralItem[]
  error?: string
}

const HORTICULTURAL_HINTS = [
  'tomate',
  'papa',
  'cebolla',
  'zanahoria',
  'lechuga',
  'ajo',
  'zapallo',
  'batata',
  'morr',
  'pimiento',
  'acelga',
  'espinaca',
  'banana',
  'manzana',
  'limon',
  'limón',
  'perejil',
  'choclo',
  'berenjena',
  'brocoli',
  'brócoli',
  'coliflor',
  'remolacha',
  'rucula',
  'rúcula',
  'naranja',
  'mandarina',
  'palta',
  'frutilla',
  'uva',
  'verdura',
  'fruta',
  'hortaliza',
]

export function isLikelyFreshProduce(query: string): boolean {
  const normalized = query
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')

  return HORTICULTURAL_HINTS.some((hint) => normalized.includes(hint))
}

export async function fetchMercadoCentralItems(
  query: string,
  limit = 12,
  signal?: AbortSignal,
): Promise<MercadoCentralItem[]> {
  const trimmed = query.trim()
  if (trimmed.length < 2) return []

  const params = new URLSearchParams({
    q: trimmed,
    limit: String(limit),
  })

  const response = await fetch(`/api/fresh-prices?${params.toString()}`, { signal })
  if (!response.ok) return []

  const payload = (await response.json()) as FreshPricesResponse
  return payload.items ?? []
}

export function mercadoCentralToProductPrices(items: MercadoCentralItem[]): ProductPrice[] {
  return items.map((item) => ({
    id: item.id,
    name: item.name,
    brand: 'Mercado Central',
    store: 'Referencia frescos',
    price: item.retailPricePerKg,
    unit: item.unit,
    quantity: 1,
  }))
}

export function mercadoCentralToSuggestions(items: MercadoCentralItem[]) {
  return items.map((item) => ({
    name: item.name,
    brand: 'Mercado Central',
    presentacion: 'Estimado verdulería (mayorista × markup)',
    priceMin: item.retailPricePerKg,
    storeCount: 1,
    suggestedUnit: item.unit,
    isFreshReference: true,
    manualUnitPrice: item.retailPricePerKg,
    priceSource: 'mercado-central' as const,
  }))
}
