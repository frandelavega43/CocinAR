import type { SavedIngredientItem, SavedRecipe } from '../types'

const STORAGE_KEY = 'cocinaar-recipes'
const LAST_ACTIVE_RECIPE_KEY = 'cocinaar-last-recipe-id'

export function getLastActiveRecipeId(): string | null {
  try {
    return localStorage.getItem(LAST_ACTIVE_RECIPE_KEY)
  } catch {
    return null
  }
}

export function setLastActiveRecipeId(id: string | null): void {
  try {
    if (id) {
      localStorage.setItem(LAST_ACTIVE_RECIPE_KEY, id)
    } else {
      localStorage.removeItem(LAST_ACTIVE_RECIPE_KEY)
    }
  } catch {
    // ignore storage errors
  }
}

export function getSavedRecipes(): SavedRecipe[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as SavedRecipe[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveRecipe(recipe: SavedRecipe): SavedRecipe[] {
  const recipes = getSavedRecipes()
  const index = recipes.findIndex((item) => item.id === recipe.id)
  const next = [...recipes]

  if (index >= 0) {
    next[index] = recipe
  } else {
    next.unshift(recipe)
  }

  persistRecipes(next)
  return next
}

export function saveAllRecipes(recipes: SavedRecipe[]): SavedRecipe[] {
  const next = recipes.map((recipe) => ({
    ...recipe,
    name: recipe.name.trim(),
    updatedAt: recipe.updatedAt,
  }))
  persistRecipes(next)
  return next
}

function persistRecipes(recipes: SavedRecipe[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(recipes))
  } catch {
    throw new Error(
      'No se pudo guardar en este dispositivo. Probá exportar un respaldo o liberar espacio.',
    )
  }
}

export function duplicateRecipe(id: string): SavedRecipe {
  const recipes = getSavedRecipes()
  const source = recipes.find((recipe) => recipe.id === id)

  if (!source) {
    throw new Error('No encontramos esa receta para duplicar.')
  }

  const baseName = `Copia de ${source.name}`
  let name = baseName
  let counter = 2

  while (recipes.some((recipe) => recipe.name === name)) {
    name = `${baseName} (${counter})`
    counter += 1
  }

  const duplicate: SavedRecipe = {
    id: crypto.randomUUID(),
    name,
    steps: source.steps ? [...source.steps] : undefined,
    servings: source.servings,
    ingredients: source.ingredients.map((ingredient) => ({
      ...ingredient,
      id: crypto.randomUUID(),
    })),
    updatedAt: new Date().toISOString(),
  }

  saveRecipe(duplicate)
  return duplicate
}

export function deleteRecipe(id: string): SavedRecipe[] {
  const next = getSavedRecipes().filter((recipe) => recipe.id !== id)
  persistRecipes(next)
  if (getLastActiveRecipeId() === id) {
    setLastActiveRecipeId(null)
  }
  return next
}

export function toSavedIngredients(
  ingredients: SavedIngredientItem[],
): SavedIngredientItem[] {
  return ingredients.map((ingredient) => ({
    id: ingredient.id,
    name: ingredient.name.trim(),
    searchQuery: ingredient.searchQuery?.trim() || undefined,
    productId: ingredient.productId,
    quantity: ingredient.quantity,
    unit: ingredient.unit,
    isManual: ingredient.isManual,
    manualUnitPrice: ingredient.manualUnitPrice,
  }))
}
