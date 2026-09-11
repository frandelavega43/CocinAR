export interface ProductPrice {
  id: string
  name: string
  brand?: string
  store?: string
  price: number
  unit: string
  quantity: number
}

export type PriceSource = 'sepa' | 'mercado-central' | 'manual'

export interface MercadoCentralItem {
  id: string
  name: string
  unit: 'kg'
  wholesalePricePerKg: number
  retailPricePerKg: number
  updatedAt: string
  source: 'mercado-central'
  category: 'hortaliza' | 'fruta'
}

export interface RecipeIngredient {
  id: string
  name: string
  searchQuery?: string
  productId?: string
  quantity: number
  unit: string
  averageUnitPrice: number
  matchedPrices: ProductPrice[]
  lineCost: number
  status: 'pending' | 'loading' | 'ready' | 'error'
  errorMessage?: string
  brandCount?: number
  priceFetchedAt?: string
  isManual?: boolean
  manualUnitPrice?: number
  priceSource?: PriceSource
}

export interface SavedIngredientItem {
  id: string
  name: string
  searchQuery?: string
  productId?: string
  quantity: number
  unit: string
  isManual?: boolean
  manualUnitPrice?: number
  priceSource?: PriceSource
}

export interface SavedRecipe {
  id: string
  name: string
  steps?: string[]
  servings: number
  ingredients: SavedIngredientItem[]
  updatedAt: string
}

export interface PersonalIngredient {
  id: string
  name: string
  unit: string
  manualUnitPrice: number
  updatedAt: string
}

export interface CostBreakdown {
  ingredients: RecipeIngredient[]
  totalCost: number
  costPerServing: number | null
}
