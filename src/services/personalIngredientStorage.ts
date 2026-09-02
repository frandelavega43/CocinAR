import type { PersonalIngredient } from '../types'

const STORAGE_KEY = 'cocinaar-personal-ingredients'

function normalizeName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

export function getPersonalIngredients(): PersonalIngredient[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as PersonalIngredient[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function persistPersonalIngredients(items: PersonalIngredient[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  } catch {
    throw new Error('No se pudieron guardar tus ingredientes en este dispositivo.')
  }
}

export function upsertPersonalIngredient(input: {
  name: string
  unit: string
  manualUnitPrice: number
}): PersonalIngredient[] {
  const name = input.name.trim()
  if (!name) return getPersonalIngredients()

  const manualUnitPrice = Number.isFinite(input.manualUnitPrice) ? input.manualUnitPrice : 0
  const key = normalizeName(name)
  const items = getPersonalIngredients()
  const index = items.findIndex((item) => normalizeName(item.name) === key)

  const nextItem: PersonalIngredient = {
    id: index >= 0 ? items[index].id : crypto.randomUUID(),
    name,
    unit: input.unit,
    manualUnitPrice,
    updatedAt: new Date().toISOString(),
  }

  const next = [...items]
  if (index >= 0) {
    next[index] = nextItem
  } else {
    next.unshift(nextItem)
  }

  persistPersonalIngredients(next)
  return next
}

export function upsertPersonalIngredientFromManual(
  name: string,
  unit: string,
  totalPrice: number,
  quantity: number,
): PersonalIngredient[] {
  const manualUnitPrice = quantity > 0 ? totalPrice / quantity : 0
  return upsertPersonalIngredient({ name, unit, manualUnitPrice })
}

export function updatePersonalIngredient(
  id: string,
  input: { name: string; unit: string; manualUnitPrice: number },
): PersonalIngredient[] {
  const items = getPersonalIngredients()
  const index = items.findIndex((item) => item.id === id)
  if (index < 0) return items

  const next = [...items]
  next[index] = {
    ...next[index],
    name: input.name.trim(),
    unit: input.unit,
    manualUnitPrice: Number.isFinite(input.manualUnitPrice) ? input.manualUnitPrice : 0,
    updatedAt: new Date().toISOString(),
  }

  persistPersonalIngredients(next)
  return next
}

export function deletePersonalIngredient(id: string): PersonalIngredient[] {
  const next = getPersonalIngredients().filter((item) => item.id !== id)
  persistPersonalIngredients(next)
  return next
}
