import { searchProductos } from './preciosClaros/client'
import type {
  PreciosClarosAgrupable,
  PreciosClarosProductoResumen,
} from './preciosClaros/types'

const INGREDIENT_ALIASES: Record<string, string[]> = {
  huevos: ['huevo blanco', 'huevo x 30', 'huevo maple'],
  huevo: ['huevo blanco', 'huevo x 30'],
  leche: ['leche entera', 'leche larga vida'],
  leches: ['leche entera'],
  'dulce de leche': [
    'dulce de leche',
    'dulce de leche clasico',
    'dulce de leche repostero',
    'ddl',
  ],
  dulce: ['dulce de leche'],
  ddl: ['dulce de leche'],
  papas: ['papa'],
  tomates: ['tomate'],
  cebollas: ['cebolla'],
  zanahorias: ['zanahoria'],
  bananas: ['banana'],
  manzanas: ['manzana'],
  limones: ['limon'],
  morrones: ['morrón', 'morron'],
  aceite: ['aceite de girasol', 'aceite girasol'],
  manteca: ['manteca'],
  harina: ['harina 0000', 'harina 000'],
}

const EXCLUDED_PRODUCT_KEYWORDS: Record<string, string[]> = {
  huevo: [
    'fideo',
    'fideos',
    'pasta',
    'galletita',
    'galletitas',
    'alfajor',
    'dulce de leche',
    'mousse',
    'bizcochuelo',
    'panificado',
    'harina',
    'lasagna',
    'lasaña',
    'ravio',
    'ñoqui',
  ],
  huevos: [
    'fideo',
    'fideos',
    'pasta',
    'galletita',
    'galletitas',
    'alfajor',
    'dulce de leche',
    'mousse',
    'bizcochuelo',
    'panificado',
    'harina',
    'lasagna',
    'lasaña',
    'ravio',
    'ñoqui',
  ],
  leche: ['alfajor', 'dulce de leche', 'chocolate', 'galletita', 'galletitas', 'caramel', 'mousse'],
  leches: ['alfajor', 'dulce de leche', 'chocolate', 'galletita', 'galletitas', 'caramel', 'mousse'],
  'dulce de leche': ['alfajor', 'galletita', 'galletitas', 'bizcochuelo', 'mousse', 'brownie', 'cookie'],
  dulce: ['alfajor', 'galletita', 'galletitas', 'bizcochuelo', 'mousse'],
}

const SEARCH_STOP_WORDS = new Set(['de', 'del', 'la', 'el', 'los', 'las', 'y', 'con'])

function normalizeText(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function getFirstWord(text: string): string {
  const match = normalizeText(text).match(/^([a-z]+)/)
  return match?.[1] ?? ''
}

export function getIngredientSearchQueries(query: string): string[] {
  const trimmed = query.trim()
  const key = normalizeText(trimmed)
  const aliases = INGREDIENT_ALIASES[key] ?? []

  let fromPlural: string[] = []
  if (key.endsWith('es') && key.length > 3) {
    fromPlural = [key.slice(0, -2), key.slice(0, -1)]
  } else if (key.endsWith('s') && key.length > 2) {
    fromPlural = [key.slice(0, -1)]
  }

  return [...new Set([trimmed, ...aliases, ...fromPlural])]
}

function tokenMatchesName(token: string, text: string): boolean {
  const normalizedToken = normalizeText(token)
  const normalizedText = normalizeText(text)

  if (!normalizedToken) return true
  if (normalizedText.includes(normalizedToken)) return true

  if (normalizedToken.endsWith('es') && normalizedToken.length > 3) {
    const stem = normalizedToken.slice(0, -2)
    if (normalizedText.includes(stem)) return true
  }

  if (normalizedToken.endsWith('s') && normalizedToken.length > 2) {
    const stem = normalizedToken.slice(0, -1)
    if (normalizedText.includes(stem)) return true
  }

  return (
    normalizedText.includes(`${normalizedToken}s`) ||
    normalizedText.includes(`${normalizedToken}es`)
  )
}

function getSignificantTokens(query: string): string[] {
  return normalizeText(query)
    .split(/\s+/)
    .filter((token) => token && !SEARCH_STOP_WORDS.has(token))
}

function isCompoundQuery(query: string): boolean {
  return getSignificantTokens(query).length >= 2
}

export function isCompoundIngredientQuery(query: string): boolean {
  return isCompoundQuery(query)
}

const SIMPLE_SEARCH_LIMIT = 20
const COMPOUND_SEARCH_LIMIT = 80
const COMPOUND_SEARCH_PAGES = 2

function matchesCompoundPhrase(productName: string, query: string): boolean {
  if (!isCompoundQuery(query)) return false

  const normalizedName = normalizeText(productName)
  const normalizedQuery = normalizeText(query)

  if (normalizedName.includes(normalizedQuery)) {
    return true
  }

  const tokens = getSignificantTokens(query)
  let lastIndex = -1

  return tokens.every((token) => {
    const index = normalizedName.indexOf(token, lastIndex + 1)
    if (index === -1) return false
    lastIndex = index
    return true
  })
}

function phraseStartsAtBeginning(productName: string, query: string): boolean {
  const normalizedName = normalizeText(productName)
  const normalizedQuery = normalizeText(query)

  if (normalizedName.startsWith(normalizedQuery)) return true

  const tokens = getSignificantTokens(query)
  if (tokens.length === 0) return false
  if (!normalizedName.startsWith(tokens[0])) return false

  if (tokens.length === 1) return true

  let lastIndex = -1
  return tokens.every((token) => {
    const index = normalizedName.indexOf(token, lastIndex + 1)
    if (index === -1) return false
    lastIndex = index
    return true
  })
}

function phrasePosition(productName: string, query: string): number {
  const normalizedName = normalizeText(productName)
  const normalizedQuery = normalizeText(query)

  const exactIndex = normalizedName.indexOf(normalizedQuery)
  if (exactIndex >= 0) return exactIndex

  const tokens = getSignificantTokens(query)
  if (tokens.length === 0) return Number.MAX_SAFE_INTEGER

  return normalizedName.indexOf(tokens[0])
}

function isRelevantForRanking(productName: string, query: string): boolean {
  if (isFallbackMatch(productName, query)) return true

  return getIngredientSearchQueries(query).some(
    (searchQuery) => searchQuery !== query && isFallbackMatch(productName, searchQuery),
  )
}

function collectSearchProducts(
  response: { productos: PreciosClarosProductoResumen[] },
  query: string,
  searchQuery: string,
  products: Map<string, PreciosClarosProductoResumen>,
): void {
  for (const product of response.productos) {
    if (!isAvailableProduct(product)) continue
    if (!isProductRelevant(product.nombre, query, searchQuery)) continue
    products.set(product.id, product)
  }
}

async function fetchSearchPages(
  searchQuery: string,
  query: string,
  products: Map<string, PreciosClarosProductoResumen>,
  agrupables: Map<string, PreciosClarosAgrupable>,
  signal?: AbortSignal,
): Promise<void> {
  const compound = isCompoundQuery(query)
  const pageLimit = compound ? COMPOUND_SEARCH_LIMIT : SIMPLE_SEARCH_LIMIT
  const pages = compound ? COMPOUND_SEARCH_PAGES : 1

  for (let page = 0; page < pages; page += 1) {
    const response = await searchProductos(
      searchQuery,
      pageLimit,
      signal,
      page * pageLimit,
    )

    collectSearchProducts(response, query, searchQuery, products)

    for (const agrupable of response.agrupables ?? []) {
      if (!isAvailableAgrupable(agrupable)) continue
      agrupables.set(agrupable.id, agrupable)
    }

    if (!compound || response.productos.length < pageLimit) {
      break
    }
  }
}

function isProductRelevant(
  productName: string,
  originalQuery: string,
  searchQuery: string,
): boolean {
  if (isFallbackMatch(productName, originalQuery)) return true
  if (searchQuery !== originalQuery && isFallbackMatch(productName, searchQuery)) return true
  return false
}

function mapAgrupableToProduct(
  agrupable: PreciosClarosAgrupable,
  label: string,
): PreciosClarosProductoResumen {
  return {
    id: `agrupable-${agrupable.id}`,
    nombre: label,
    marca: 'Varias marcas',
    presentacion: 'Promedio de supermercados',
    precioMin: agrupable.precioMin,
    precioMax: agrupable.precioMax,
    cantSucursalesDisponible: agrupable.cantSucursalesDisponible,
  }
}
function passesExclusions(productName: string, query: string): boolean {
  const normalizedName = normalizeText(productName)
  const key = normalizeText(query)
  const excluded =
    EXCLUDED_PRODUCT_KEYWORDS[key] ?? EXCLUDED_PRODUCT_KEYWORDS[key.replace(/s$/, '')] ?? []

  return !excluded.some((word) => normalizedName.includes(normalizeText(word)))
}

function matchesAllTokens(productName: string, query: string): boolean {
  const normalizedName = normalizeText(productName)
  const queryTokens = getSignificantTokens(query)
  if (queryTokens.length === 0) return true
  return queryTokens.every((token) => tokenMatchesName(token, normalizedName))
}

export function matchesPrimaryWord(productName: string, query: string): boolean {
  const queryTokens = getSignificantTokens(query)
  const primaryToken = queryTokens[0]
  if (!primaryToken) return true

  const productFirstWord = getFirstWord(productName)
  return tokenMatchesName(primaryToken, productFirstWord)
}

export function isPrimaryMatch(productName: string, query: string): boolean {
  return (
    passesExclusions(productName, query) &&
    matchesPrimaryWord(productName, query) &&
    (matchesAllTokens(productName, query) || matchesCompoundPhrase(productName, query))
  )
}

export function isFallbackMatch(productName: string, query: string): boolean {
  if (!passesExclusions(productName, query)) return false
  return matchesAllTokens(productName, query) || matchesCompoundPhrase(productName, query)
}

export function isRelevantProduct(productName: string, query: string): boolean {
  return isFallbackMatch(productName, query)
}

function productRelevanceScore(productName: string, query: string): number {
  const normalizedName = normalizeText(productName)
  const normalizedQuery = normalizeText(query)
  const queryFirst = getSignificantTokens(query)[0] ?? getFirstWord(query)
  const productFirst = getFirstWord(productName)

  let score = 0

  if (phraseStartsAtBeginning(productName, query)) {
    score += 500
  }

  if (normalizedName.startsWith(normalizedQuery)) {
    score += 200
  }

  if (queryFirst && productFirst === queryFirst) {
    score += 100
  } else if (queryFirst && tokenMatchesName(queryFirst, productFirst)) {
    score += 80
  }

  const position = phrasePosition(productName, query)
  if (position === 0) {
    score += 80
  } else if (position > 0) {
    score -= Math.min(position * 4, 120)
  }

  const queryTokens = getSignificantTokens(query)
  if (queryTokens.every((token) => normalizedName.includes(token))) {
    score += 20
  }

  return score
}

function sortProductsByRelevance(
  products: PreciosClarosProductoResumen[],
  query: string,
): PreciosClarosProductoResumen[] {
  return [...products].sort((left, right) => {
    const scoreDiff =
      productRelevanceScore(right.nombre, query) - productRelevanceScore(left.nombre, query)
    if (scoreDiff !== 0) return scoreDiff
    return right.cantSucursalesDisponible - left.cantSucursalesDisponible
  })
}

function pickRankedProducts(
  products: PreciosClarosProductoResumen[],
  query: string,
  limit: number,
): PreciosClarosProductoResumen[] {
  const relevant = products.filter(
    (product) =>
      product.id.startsWith('agrupable-') || isRelevantForRanking(product.nombre, query),
  )

  const phraseStart = relevant.filter((product) => phraseStartsAtBeginning(product.nombre, query))
  if (phraseStart.length > 0) {
    return sortProductsByRelevance(phraseStart, query).slice(0, limit)
  }

  const primary = relevant.filter((product) => isPrimaryMatch(product.nombre, query))
  if (primary.length > 0) {
    return sortProductsByRelevance(primary, query).slice(0, limit)
  }

  return sortProductsByRelevance(relevant, query).slice(0, limit)
}

function isAvailableProduct(product: PreciosClarosProductoResumen): boolean {
  return product.cantSucursalesDisponible > 0 && product.precioMin > 0
}

function isAvailableAgrupable(agrupable: PreciosClarosAgrupable): boolean {
  return agrupable.cantSucursalesDisponible > 0 && agrupable.precioMin > 0
}

export async function searchIngredientProducts(
  query: string,
  limit = 30,
  signal?: AbortSignal,
): Promise<{ productos: PreciosClarosProductoResumen[]; agrupables: PreciosClarosAgrupable[] }> {
  const queries = getIngredientSearchQueries(query)
  const products = new Map<string, PreciosClarosProductoResumen>()
  const agrupables = new Map<string, PreciosClarosAgrupable>()

  for (const searchQuery of queries) {
    await fetchSearchPages(searchQuery, query, products, agrupables, signal)
  }

  if (products.size === 0 && agrupables.size > 0) {
    for (const agrupable of agrupables.values()) {
      const mapped = mapAgrupableToProduct(agrupable, query.trim())
      products.set(mapped.id, mapped)
    }
  }

  return {
    productos: pickRankedProducts([...products.values()], query, limit),
    agrupables: [...agrupables.values()],
  }
}
