export interface ProductPrice {
  id: string
  name: string
  brand?: string
  store?: string
  price: number
  unit: string
  quantity: number
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
}

export interface SavedRecipe {
  id: string
  name: string
  steps?: string[]
  servings: number
  ingredients: SavedIngredientItem[]
  updatedAt: string
}

export interface CostBreakdown {
  ingredients: RecipeIngredient[]
  totalCost: number
  costPerServing: number | null
}
