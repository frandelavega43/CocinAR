import type { SavedRecipe } from '../types'
import { getSavedRecipes } from './recipeStorage'

export const RECIPES_BACKUP_VERSION = 1

export interface RecipesBackup {
  version: number
  exportedAt: string
  recipes: SavedRecipe[]
}

function isSavedRecipe(value: unknown): value is SavedRecipe {
  if (!value || typeof value !== 'object') return false

  const recipe = value as SavedRecipe
  return (
    typeof recipe.id === 'string' &&
    typeof recipe.name === 'string' &&
    typeof recipe.servings === 'number' &&
    Array.isArray(recipe.ingredients) &&
    typeof recipe.updatedAt === 'string'
  )
}

function normalizeImportedRecipe(recipe: SavedRecipe): SavedRecipe {
  return {
    id: recipe.id,
    name: recipe.name.trim(),
    steps: Array.isArray(recipe.steps)
      ? recipe.steps.map((step) => String(step).trim()).filter(Boolean)
      : undefined,
    servings: Math.max(1, recipe.servings),
    ingredients: recipe.ingredients.map((ingredient) => ({
      id: ingredient.id,
      name: ingredient.name.trim(),
      searchQuery: ingredient.searchQuery?.trim() || undefined,
      productId: ingredient.productId,
      quantity: ingredient.quantity,
      unit: ingredient.unit,
      isManual: ingredient.isManual,
      manualUnitPrice: ingredient.manualUnitPrice,
    })),
    updatedAt: recipe.updatedAt,
  }
}

export function createRecipesBackup(): RecipesBackup {
  return {
    version: RECIPES_BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    recipes: getSavedRecipes(),
  }
}

export function downloadRecipesBackup(): void {
  const backup = createRecipesBackup()
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `cocinar-recetas-${new Date().toISOString().slice(0, 10)}.json`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export function parseRecipesBackup(raw: string): RecipesBackup {
  const parsed = JSON.parse(raw) as unknown

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('El archivo no tiene un formato válido.')
  }

  const payload = parsed as Partial<RecipesBackup>
  const recipes = Array.isArray(payload.recipes) ? payload.recipes : null

  if (!recipes) {
    throw new Error('No se encontraron recetas en el archivo.')
  }

  const validRecipes = recipes.filter(isSavedRecipe).map(normalizeImportedRecipe)

  if (validRecipes.length === 0) {
    throw new Error('El archivo no contiene recetas compatibles.')
  }

  return {
    version: payload.version ?? RECIPES_BACKUP_VERSION,
    exportedAt: payload.exportedAt ?? new Date().toISOString(),
    recipes: validRecipes,
  }
}

export function mergeImportedRecipes(
  existing: SavedRecipe[],
  imported: SavedRecipe[],
): SavedRecipe[] {
  const byId = new Map(existing.map((recipe) => [recipe.id, recipe]))

  for (const recipe of imported) {
    const current = byId.get(recipe.id)
    if (!current || new Date(recipe.updatedAt) > new Date(current.updatedAt)) {
      byId.set(recipe.id, recipe)
    }
  }

  return [...byId.values()].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  )
}
