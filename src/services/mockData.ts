import type { ProductPrice } from '../types'
import { isFallbackMatch, isPrimaryMatch } from './ingredientSearch'

const MOCK_CATALOG: ProductPrice[] = [
  { id: '1', name: 'Harina 0000', brand: 'Pureza', store: 'Carrefour', price: 1890, unit: 'kg', quantity: 1 },
  { id: '2', name: 'Harina 0000', brand: 'Cañuelas', store: 'Día', price: 1750, unit: 'kg', quantity: 1 },
  { id: '3', name: 'Harina 0000', brand: 'Pureza', store: 'Coto', price: 1820, unit: 'kg', quantity: 1 },
  { id: '4', name: 'Huevos', brand: 'Granja del Sol', store: 'Carrefour', price: 3200, unit: 'docena', quantity: 12 },
  { id: '5', name: 'Huevos', brand: 'Avícola del Sur', store: 'Día', price: 2980, unit: 'docena', quantity: 12 },
  { id: '6', name: 'Leche entera', brand: 'La Serenísima', store: 'Coto', price: 980, unit: 'L', quantity: 1 },
  { id: '7', name: 'Leche entera', brand: 'Sancor', store: 'Carrefour', price: 950, unit: 'L', quantity: 1 },
  { id: '8', name: 'Aceite de girasol', brand: 'Natura', store: 'Día', price: 2450, unit: 'L', quantity: 1 },
  { id: '9', name: 'Aceite de girasol', brand: 'Cocinero', store: 'Coto', price: 2380, unit: 'L', quantity: 1 },
  { id: '10', name: 'Azúcar', brand: 'Ledesma', store: 'Carrefour', price: 1100, unit: 'kg', quantity: 1 },
  { id: '11', name: 'Azúcar', brand: 'Chango', store: 'Día', price: 1050, unit: 'kg', quantity: 1 },
  { id: '12', name: 'Manteca', brand: 'La Serenísima', store: 'Coto', price: 4200, unit: 'kg', quantity: 0.2 },
  { id: '13', name: 'Pollo entero', brand: 'Granja Tres Arroyos', store: 'Carrefour', price: 2890, unit: 'kg', quantity: 1 },
  { id: '14', name: 'Cebolla', brand: 'Fresco', store: 'Verdulería', price: 890, unit: 'kg', quantity: 1 },
  { id: '15', name: 'Tomate', brand: 'Fresco', store: 'Verdulería', price: 1250, unit: 'kg', quantity: 1 },
  { id: '16', name: 'Papa', brand: 'Fresco', store: 'Verdulería', price: 780, unit: 'kg', quantity: 1 },
  { id: '17', name: 'Queso cremoso', brand: 'La Paulina', store: 'Coto', price: 8900, unit: 'kg', quantity: 1 },
  { id: '18', name: 'Sal fina', brand: 'Celusal', store: 'Día', price: 450, unit: 'kg', quantity: 1 },
  { id: '19', name: 'Dulce de leche', brand: 'La Serenísima', store: 'Coto', price: 3200, unit: 'kg', quantity: 0.45 },
  { id: '20', name: 'Dulce de leche', brand: 'San Ignacio', store: 'Carrefour', price: 2980, unit: 'kg', quantity: 0.45 },
  { id: '21', name: 'Dulce de leche', brand: 'Mardel', store: 'Día', price: 2750, unit: 'kg', quantity: 0.4 },
]

export function searchMockProducts(query: string): ProductPrice[] {
  const trimmed = query.trim()
  if (!trimmed) return []

  const matches = MOCK_CATALOG.filter((product) => isFallbackMatch(product.name, trimmed))
  const primary = matches
    .filter((product) => isPrimaryMatch(product.name, trimmed))
    .sort((left, right) => left.name.localeCompare(right.name, 'es'))
  const primaryIds = new Set(primary.map((product) => product.id))
  const rest = matches
    .filter((product) => !primaryIds.has(product.id))
    .sort((left, right) => left.name.localeCompare(right.name, 'es'))

  return [...primary, ...rest]
}
