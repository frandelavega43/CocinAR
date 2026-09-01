import type { ProductPrice } from '../types'
import { normalizeUnit } from './unitConverter'

function packageKey(price: ProductPrice): string {
  const unit = normalizeUnit(price.unit)
  return `${price.name.trim().toLowerCase()}|${unit}|${price.quantity}`
}

function average(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

export function filterSimilarProducts(products: ProductPrice[], query: string): ProductPrice[] {
  const normalizedQuery = query.trim().toLowerCase()
  if (!normalizedQuery) return products

  return products.filter((product) =>
    product.name.toLowerCase().includes(normalizedQuery),
  )
}

export function groupPricesByPackage(products: ProductPrice[]): ProductPrice[] {
  const groups = new Map<string, ProductPrice[]>()

  for (const product of products) {
    const key = packageKey(product)
    const group = groups.get(key) ?? []
    group.push(product)
    groups.set(key, group)
  }

  return [...groups.values()].map((group) => {
    const stores = [...new Set(group.map((item) => item.store).filter(Boolean))]

    return {
      ...group[0],
      id: packageKey(group[0]),
      price: average(group.map((item) => item.price)),
      store:
        stores.length > 1
          ? `${stores.length} supermercados`
          : stores[0] ?? 'Sin comercio',
    }
  })
}

export function countUniqueStores(products: ProductPrice[]): number {
  return new Set(products.map((product) => product.store).filter(Boolean)).size
}
