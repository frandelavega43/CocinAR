import { getSavedRecipes } from './recipeStorage'
import { searchCatalog } from './productCatalog'
import { searchMockProducts } from './mockData'
import { isUsingMockData, type IngredientSuggestion } from './api'

function uniqueSuggestions(items: IngredientSuggestion[]): IngredientSuggestion[] {
  const seen = new Set<string>()
  const result: IngredientSuggestion[] = []

  for (const item of items) {
    const key = item.productId ?? item.name.toLowerCase()
    if (!key || seen.has(key)) continue
    seen.add(key)
    result.push(item)
  }

  return result
}

export function getLocalIngredientSuggestions(query: string, limit = 8): IngredientSuggestion[] {
  const normalized = query.trim().toLowerCase()
  if (normalized.length < 2) return []

  const fromCatalog = searchCatalog(query, limit).map((product) => ({
    productId: product.productId,
    name: product.name,
    brand: product.brand,
    presentacion: product.presentacion,
  }))

  const fromRecipes = getSavedRecipes()
    .flatMap((recipe) => recipe.ingredients)
    .filter((ingredient) => ingredient.name.toLowerCase().includes(normalized))
    .map((ingredient) => ({
      productId: ingredient.productId,
      name: ingredient.name,
      brand: 'Receta guardada',
    }))

  const fromMock = isUsingMockData()
    ? searchMockProducts(query).map((product) => ({
        name: product.name,
        brand: product.brand,
        presentacion: `${product.quantity} ${product.unit}`,
      }))
    : []

  return uniqueSuggestions([...fromCatalog, ...fromRecipes, ...fromMock])
    .sort((a, b) => a.name.localeCompare(b.name, 'es'))
    .slice(0, limit)
}

export type { IngredientSuggestion }
