const UNIT_ALIASES: Record<string, string> = {
  kilogramo: 'kg',
  kilogramos: 'kg',
  kgm: 'kg',
  kilo: 'kg',
  gramo: 'g',
  gramos: 'g',
  gr: 'g',
  grm: 'g',
  litro: 'l',
  litros: 'l',
  lt: 'l',
  lts: 'l',
  mililitro: 'ml',
  mililitros: 'ml',
  cc: 'ml',
  unidad: 'u',
  unidades: 'u',
  un: 'u',
  uni: 'u',
  unid: 'u',
  docena: 'docena',
}

const BASE_UNITS: Record<string, string> = {
  kg: 'kg',
  g: 'kg',
  l: 'l',
  ml: 'l',
  u: 'u',
  docena: 'docena',
}

const TO_BASE: Record<string, number> = {
  kg: 1,
  g: 0.001,
  l: 1,
  ml: 0.001,
  u: 1,
  docena: 1,
}

export function normalizeUnit(unit: string): string {
  const cleaned = unit.trim().toLowerCase()
  return UNIT_ALIASES[cleaned] ?? cleaned
}

export function getBaseUnit(unit: string): string {
  const normalized = normalizeUnit(unit)
  return BASE_UNITS[normalized] ?? normalized
}

export function toBaseQuantity(quantity: number, unit: string): number {
  const normalized = normalizeUnit(unit)
  const factor = TO_BASE[normalized] ?? 1
  return quantity * factor
}

export function unitsAreCompatible(a: string, b: string): boolean {
  return getBaseUnit(a) === getBaseUnit(b)
}

export function convertQuantity(
  quantity: number,
  fromUnit: string,
  toUnit: string,
): number | null {
  if (!unitsAreCompatible(fromUnit, toUnit)) return null

  const baseQuantity = toBaseQuantity(quantity, fromUnit)
  const targetUnit = normalizeUnit(toUnit)
  const targetFactor = TO_BASE[targetUnit] ?? 1

  return baseQuantity / targetFactor
}

export function pricePerBaseUnit(price: number, packageQuantity: number, unit: string): number {
  const baseQuantity = toBaseQuantity(packageQuantity, unit)
  if (baseQuantity <= 0) return price
  return price / baseQuantity
}

export function pricePerRecipeUnit(
  packagePrice: number,
  packageQuantity: number,
  packageUnit: string,
  recipeUnit: string,
): number | null {
  const packageInRecipeUnit = convertQuantity(packageQuantity, packageUnit, recipeUnit)
  if (packageInRecipeUnit === null || packageInRecipeUnit <= 0) return null
  return packagePrice / packageInRecipeUnit
}
