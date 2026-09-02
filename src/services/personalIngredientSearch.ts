import type { PersonalIngredient } from '../types'
import type { IngredientSuggestion } from './api'
import { isFallbackMatch, isPrimaryMatch } from './ingredientSearch'
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

  const matches = getPersonalIngredients().filter((item) => isFallbackMatch(item.name, query))
  const primary = matches
    .filter((item) => isPrimaryMatch(item.name, query))
    .sort((a, b) => a.name.localeCompare(b.name, 'es'))
  const primaryIds = new Set(primary.map((item) => item.id))
  const rest = matches
    .filter((item) => !primaryIds.has(item.id))
    .sort((a, b) => a.name.localeCompare(b.name, 'es'))

  return [...primary, ...rest].slice(0, limit).map(toSuggestion)
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
