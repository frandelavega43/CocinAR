const CATALOG_KEY = 'cocinaar-product-catalog'

export interface CatalogProduct {
  productId: string
  name: string
  brand?: string
  presentacion?: string
  quantity?: number
  unit?: string
  updatedAt: string
}

function readCatalog(): Record<string, CatalogProduct> {
  try {
    const raw = localStorage.getItem(CATALOG_KEY)
    if (!raw) return {}
    return JSON.parse(raw) as Record<string, CatalogProduct>
  } catch {
    return {}
  }
}

function writeCatalog(catalog: Record<string, CatalogProduct>) {
  localStorage.setItem(CATALOG_KEY, JSON.stringify(catalog))
}

export function getCatalogProductById(productId: string): CatalogProduct | null {
  return readCatalog()[productId.trim()] ?? null
}

export function upsertCatalogProduct(product: CatalogProduct) {
  const catalog = readCatalog()
  catalog[product.productId.trim()] = product
  writeCatalog(catalog)
}

export function searchCatalog(query: string, limit = 8): CatalogProduct[] {
  const normalized = query.trim().toLowerCase()
  if (normalized.length < 2) return []

  return Object.values(readCatalog())
    .filter(
      (product) =>
        product.name.toLowerCase().includes(normalized) ||
        product.brand?.toLowerCase().includes(normalized),
    )
    .sort((a, b) => a.name.localeCompare(b.name, 'es'))
    .slice(0, limit)
}

export function getAllCatalogProducts(): CatalogProduct[] {
  return Object.values(readCatalog()).sort((a, b) => a.name.localeCompare(b.name, 'es'))
}
