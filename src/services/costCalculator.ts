import type { CostBreakdown, ProductPrice, RecipeIngredient } from '../types'
import { convertQuantity, pricePerBaseUnit, unitsAreCompatible } from './unitConverter'

type CalculatedIngredient = Omit<RecipeIngredient, 'status' | 'errorMessage' | 'ean'> & {
  ean?: string
}

export type IngredientCostResult =
  | { ok: true; ingredient: CalculatedIngredient }
  | { ok: false; errorMessage: string }

function average(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

export function calculateIngredientCost(
  name: string,
  quantity: number,
  unit: string,
  prices: ProductPrice[],
  existingId?: string,
): CalculatedIngredient {
  const result = calculateIngredientCostSafe(name, quantity, unit, prices, existingId)
  if (!result.ok) {
    return {
      id: existingId ?? crypto.randomUUID(),
      name,
      quantity,
      unit,
      averageUnitPrice: 0,
      matchedPrices: [],
      lineCost: 0,
    }
  }

  return result.ingredient
}

export function calculateIngredientCostSafe(
  name: string,
  quantity: number,
  unit: string,
  prices: ProductPrice[],
  existingId?: string,
): IngredientCostResult {
  if (prices.length === 0) {
    return {
      ok: false,
      errorMessage: 'No se encontraron precios para este ingrediente.',
    }
  }

  const compatiblePrices = prices.filter((price) => unitsAreCompatible(price.unit, unit))

  if (compatiblePrices.length === 0) {
    const productUnit = prices[0]?.unit ?? 'u'
    return {
      ok: false,
      errorMessage: `La unidad "${unit}" no coincide con el producto (${productUnit}). Cambiá la unidad del ingrediente.`,
    }
  }

  const unitPrices = compatiblePrices.map((price) =>
    pricePerBaseUnit(price.price, price.quantity, price.unit),
  )

  const averageUnitPrice = average(unitPrices)
  if (averageUnitPrice <= 0) {
    return {
      ok: false,
      errorMessage: 'No se pudo calcular un precio válido para este ingrediente.',
    }
  }

  const convertedQuantity =
    convertQuantity(quantity, unit, compatiblePrices[0]?.unit ?? unit) ?? quantity
  const lineCost = averageUnitPrice * convertedQuantity
  const priceInUserUnit = quantity > 0 ? lineCost / quantity : 0

  if (lineCost <= 0) {
    return {
      ok: false,
      errorMessage: 'Revisá la cantidad y la unidad del ingrediente.',
    }
  }

  return {
    ok: true,
    ingredient: {
      id: existingId ?? crypto.randomUUID(),
      name,
      quantity,
      unit,
      averageUnitPrice: priceInUserUnit,
      matchedPrices: compatiblePrices,
      lineCost,
    },
  }
}

export function calculateRecipeCost(
  ingredients: RecipeIngredient[],
  servings: number | null,
): CostBreakdown {
  const readyIngredients = ingredients.filter((ingredient) => ingredient.status === 'ready')
  const totalCost = readyIngredients.reduce((sum, ingredient) => sum + ingredient.lineCost, 0)

  return {
    ingredients: readyIngredients,
    totalCost,
    costPerServing: servings && servings > 0 ? totalCost / servings : null,
  }
}
