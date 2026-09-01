import type { ProductPrice } from '../../types'
import { parseProductPresentation } from '../presentationParser'
import { normalizeUnit } from '../unitConverter'
import type {
  PreciosClarosPreciosProducto,
  PreciosClarosProductoDetalle,
  PreciosClarosSucursalConProducto,
} from './types'

function parsePriceValue(value: number | string | undefined): number | null {
  if (value === undefined || value === null || value === '') return null
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) return null
  return parsed
}

function getEffectivePrice(precios?: PreciosClarosPreciosProducto): number | null {
  if (!precios) return null

  const promoPrice =
    parsePriceValue(precios.promo1?.precio) ?? parsePriceValue(precios.promo2?.precio)
  if (promoPrice !== null) return promoPrice

  return parsePriceValue(precios.precioLista)
}

function buildFallbackPrice(
  producto: PreciosClarosProductoDetalle,
  quantity: number,
  unit: string,
): ProductPrice[] {
  const min = Number(producto.precioMin)
  const max = Number(producto.precioMax)
  if (!Number.isFinite(min) || min <= 0) return []

  const price = Number.isFinite(max) && max > 0 ? (min + max) / 2 : min

  return [
    {
      id: `${producto.id}-promedio`,
      name: producto.nombre,
      brand: producto.marca,
      store: 'Promedio supermercados',
      price,
      unit,
      quantity,
    },
  ]
}

export function mapProductoToPrices(
  producto: PreciosClarosProductoDetalle,
  sucursales: PreciosClarosSucursalConProducto[],
): ProductPrice[] {
  const { quantity, unit } = parseProductPresentation(producto.presentacion, producto.nombre)
  const normalizedUnit = normalizeUnit(unit)

  const mapped = sucursales
    .filter((sucursal) => !sucursal.message && sucursal.preciosProducto)
    .map((sucursal) => {
      const price = getEffectivePrice(sucursal.preciosProducto)
      if (price === null) return null

      const item: ProductPrice = {
        id: `${producto.id}-${sucursal.comercioId}-${sucursal.id}`,
        name: producto.nombre,
        brand: producto.marca,
        store: sucursal.banderaDescripcion ?? sucursal.sucursalNombre ?? 'Supermercado',
        price,
        unit: normalizedUnit,
        quantity,
      }
      return item
    })
    .filter((price): price is ProductPrice => price !== null)

  if (mapped.length > 0) return mapped

  return buildFallbackPrice(producto, quantity, normalizedUnit)
}
