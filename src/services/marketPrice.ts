import type { ProductPrice } from '../types'
import { searchIngredientProducts, isRelevantProduct, isCompoundIngredientQuery } from './ingredientSearch'
import {
  fetchMercadoCentralItems,
  isLikelyFreshProduce,
  mercadoCentralToProductPrices,
} from './mercadoCentralClient'
import { parseProductPresentation } from './presentationParser'
import { normalizeUnit } from './unitConverter'
import type { PreciosClarosAgrupable } from './preciosClaros/types'

const MARKET_SEARCH_LIMIT = 30

export function matchesSearchQuery(productName: string, query: string): boolean {
  return isRelevantProduct(productName, query)
}

function inferDefaultUnit(query: string): string {
  const normalized = query.trim().toLowerCase()
  if (normalized.includes('huevo')) return 'docena'
  if (
    normalized.includes('dulce de leche') ||
    normalized.includes('ddl')
  ) {
    return 'kg'
  }
  if (normalized.includes('leche') || normalized.includes('aceite') || normalized.includes('agua')) {
    return 'l'
  }
  if (
    normalized.includes('papa') ||
    normalized.includes('tomate') ||
    normalized.includes('cebolla') ||
    normalized.includes('zanahoria') ||
    normalized.includes('lechuga') ||
    normalized.includes('ajo') ||
    normalized.includes('zapallo') ||
    normalized.includes('batata') ||
    normalized.includes('morr') ||
    normalized.includes('pimiento') ||
    normalized.includes('acelga') ||
    normalized.includes('espinaca') ||
    normalized.includes('banana') ||
    normalized.includes('manzana') ||
    normalized.includes('limon') ||
    normalized.includes('limón') ||
    normalized.includes('carne') ||
    normalized.includes('pollo') ||
    normalized.includes('cerdo') ||
    normalized.includes('nalga') ||
    normalized.includes('vacio') ||
    normalized.includes('vacío') ||
    normalized.includes('asado') ||
    normalized.includes('pechuga') ||
    normalized.includes('bondiola') ||
    normalized.includes('harina') ||
    normalized.includes('azucar') ||
    normalized.includes('azúcar') ||
    normalized.includes('arroz')
  ) {
    return 'kg'
  }
  return 'u'
}

function mapAgrupablesToPrices(
  agrupables: PreciosClarosAgrupable[],
  query: string,
): ProductPrice[] {
  const unit = inferDefaultUnit(query)
  const quantity = unit === 'docena' ? 12 : 1

  return agrupables.map((agrupable) => ({
    id: `agrupable-${agrupable.id}`,
    name: query.trim(),
    brand: 'Promedio mercado',
    price:
      agrupable.precioMax > 0
        ? (agrupable.precioMin + agrupable.precioMax) / 2
        : agrupable.precioMin,
    unit,
    quantity,
  }))
}

export function mapSearchProductToPrice(product: {
  id: string
  nombre: string
  marca: string
  presentacion: string
  precioMin: number
}): ProductPrice {
  const { quantity, unit } = parseProductPresentation(product.presentacion, product.nombre)

  return {
    id: product.id,
    name: product.nombre,
    brand: product.marca,
    price: product.precioMin,
    unit: normalizeUnit(unit),
    quantity,
  }
}

export function countUniqueBrands(products: ProductPrice[]): number {
  const brands = products
    .map((product) => product.brand?.trim().toLowerCase())
    .filter((brand): brand is string => Boolean(brand))

  return new Set(brands).size
}

export async function fetchMarketPrices(query: string): Promise<ProductPrice[]> {
  const trimmed = query.trim()
  if (!trimmed) return []

  const { productos, agrupables } = await searchIngredientProducts(
    trimmed,
    isCompoundIngredientQuery(trimmed) ? 50 : MARKET_SEARCH_LIMIT,
  )

  const mapped = productos.map(mapSearchProductToPrice)

  if (mapped.length > 0) {
    return mapped
  }

  const fromAgrupables = mapAgrupablesToPrices(agrupables, trimmed)
  if (fromAgrupables.length > 0) {
    return fromAgrupables
  }

  if (isLikelyFreshProduce(trimmed)) {
    try {
      const fresh = await fetchMercadoCentralItems(trimmed, 8)
      return mercadoCentralToProductPrices(fresh)
    } catch {
      return []
    }
  }

  return []
}
