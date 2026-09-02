import type { PersonalIngredient } from '../types'
import type { IngredientSuggestion } from './api'
import { getPersonalIngredients } from './personalIngredientStorage'

function normalizeText(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function toSuggestion(item: PersonalIngredient): IngredientSuggestion {
  return {
    name: item.name,
    suggestedUnit: item.unit,
    priceMin: item.manualUnitPrice,
    brand: 'Ingrediente propio',
    isPersonal: true,
    personalIngredientId: item.id,
    manualUnitPrice: item.manualUnitPrice,
  }
}

export function searchPersonalIngredientSuggestions(
  query: string,
  limit = 10,
): IngredientSuggestion[] {
  const normalized = normalizeText(query)
  if (normalized.length < 2) return []

  return getPersonalIngredients()
    .filter((item) => normalizeText(item.name).includes(normalized))
    .sort((a, b) => {
      const aName = normalizeText(a.name)
      const bName = normalizeText(b.name)
      const aStarts = aName.startsWith(normalized) ? 0 : 1
      const bStarts = bName.startsWith(normalized) ? 0 : 1
      if (aStarts !== bStarts) return aStarts - bStarts
      return a.name.localeCompare(b.name, 'es')
    })
    .slice(0, limit)
    .map(toSuggestion)
}

export function mergeIngredientSuggestions(
  personal: IngredientSuggestion[],
  apiResults: IngredientSuggestion[],
  limit: number,
): IngredientSuggestion[] {
  const personalNames = new Set(personal.map((item) => normalizeText(item.name)))
  const dedupedApi = apiResults.filter(
    (item) => !personalNames.has(normalizeText(item.name)),
  )
  return [...personal, ...dedupedApi].slice(0, limit)
}
