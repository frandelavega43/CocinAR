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
  papas: ['papa', 'papa blanca', 'papa lavada'],
  papa: ['papa blanca', 'papa lavada'],
  tomates: ['tomate', 'tomate redondo', 'tomate perita'],
  tomate: ['tomate redondo', 'tomate perita'],
  cebollas: ['cebolla blanca', 'cebolla'],
  cebolla: ['cebolla blanca'],
  zanahorias: ['zanahoria'],
  bananas: ['banana'],
  manzanas: ['manzana'],
  limones: ['limon'],
  morrones: ['morron', 'pimiento', 'morrón'],
  morron: ['pimiento', 'morrón'],
  'morrón': ['pimiento', 'morron'],
  lechuga: ['lechuga crespa', 'lechuga mantecosa'],
  ajo: ['ajo colorado'],
  zapallo: ['zapallo anco', 'zapallo coreano'],
  batata: ['batata'],
  acelga: ['acelga'],
  espinaca: ['espinaca'],
  perejil: ['perejil'],
  choclo: ['choclo'],
  berenjena: ['berenjena'],
  brocoli: ['brocoli', 'brócoli'],
  'brócoli': ['brocoli'],
  coliflor: ['coliflor'],
  remolacha: ['remolacha'],
  rucula: ['rucula', 'rúcula'],
  'rúcula': ['rucula'],
  carne: [
    'carne picada',
    'carne vacuna',
    'nalga',
    'vacio',
    'vacío',
    'asado',
    'bife',
    'cuadril',
    'paleta vacuna',
  ],
  'carne picada': ['carne picada vacuna', 'picada especial'],
  nalga: ['nalga'],
  vacio: ['vacio', 'vacío'],
  'vacío': ['vacio'],
  asado: ['asado de tira', 'costilla'],
  bife: ['bife de chorizo', 'bife angosto'],
  pollo: ['pollo entero', 'suprema de pollo', 'pechuga de pollo', 'pata muslo'],
  pechuga: ['pechuga de pollo', 'suprema'],
  cerdo: ['bondiola', 'costilla de cerdo', 'carré de cerdo'],
  bondiola: ['bondiola de cerdo'],
  aceite: ['aceite de girasol', 'aceite girasol'],
  manteca: ['manteca'],
  harina: ['harina 0000', 'harina 000'],
  pan: ['pan lactal', 'pan frances', 'pan integral', 'pan de mesa', 'pan rallado'],
  panes: ['pan lactal', 'pan frances', 'pan integral'],
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
  pan: [
    'pantene',
    'acondicionador',
    'shampoo',
    'shampu',
    'jabon',
    'jabón',
    'enjuague',
    'capilar',
    'cabello',
    'pelo',
  ],
  panes: [
    'pantene',
    'acondicionador',
    'shampoo',
    'shampu',
    'jabon',
    'jabón',
    'enjuague',
    'capilar',
    'cabello',
    'pelo',
  ],
  carne: ['empanada', 'ravioles', 'raviol', 'salsa', 'hamburguesa', 'snack', 'alimento para'],
  'carne picada': ['empanada', 'ravioles', 'salsa'],
  pollo: ['caldo', 'sopas', 'sopa', 'nugget', 'medallon', 'empanada', 'alimento para'],
  pechuga: ['caldo', 'sopa'],
  cerdo: ['chorizo', 'fiambre', 'salame'],
  tomate: ['salsa', 'ketchup', 'pure', 'puré', 'extracto', 'concentrado', 'fideo'],
  tomates: ['salsa', 'ketchup', 'pure', 'puré', 'extracto', 'concentrado'],
  papa: ['snack', 'frita', 'chips', 'pure', 'puré'],
  papas: ['snack', 'frita', 'chips', 'pure', 'puré'],
  cebolla: [
    'snack',
    'deshidratad',
    'polvo',
    'escamas',
    'ahumada',
    'hamburguesa',
    'fritas',
    'grisine',
    'mani',
    'maní',
    'medallon',
    'medallón',
    'milanesa',
    'ciriola',
    'pringles',
    'krachitos',
    'caramelizada',
  ],
  cebollas: [
    'snack',
    'deshidratad',
    'polvo',
    'escamas',
    'ahumada',
    'hamburguesa',
    'fritas',
    'grisine',
    'mani',
    'maní',
    'medallon',
    'medallón',
    'milanesa',
    'ciriola',
    'pringles',
    'krachitos',
    'caramelizada',
  ],
  banana: ['snack', 'chips', 'dulce'],
  manzana: ['jugo', 'sidra', 'compota'],
}

const SEARCH_STOP_WORDS = new Set(['de', 'del', 'la', 'el', 'los', 'las', 'y', 'con'])

function normalizeText(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function getWords(text: string): string[] {
  return normalizeText(text)
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
}

function getFirstWord(text: string): string {
  return getWords(text)[0] ?? ''
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

/** Prefijo solo desde 4 letras: evita que "pan" matchee "Pantene". */
const MIN_PREFIX_TOKEN_LENGTH = 4

/** El token coincide con una palabra entera; prefijo solo si el texto es más largo. */
function wordMatchesQueryToken(word: string, token: string): boolean {
  const normalizedWord = normalizeText(word)
  const normalizedToken = normalizeText(token)

  if (!normalizedToken) return true
  if (!normalizedWord) return false

  if (normalizedWord === normalizedToken) return true

  if (
    normalizedWord === `${normalizedToken}s` ||
    normalizedWord === `${normalizedToken}es`
  ) {
    return true
  }

  if (normalizedToken.endsWith('es') && normalizedToken.length > 3) {
    const stem = normalizedToken.slice(0, -2)
    if (normalizedWord === stem) return true
    if (stem.length >= MIN_PREFIX_TOKEN_LENGTH && normalizedWord.startsWith(stem)) return true
  }

  if (normalizedToken.endsWith('s') && normalizedToken.length > 2) {
    const stem = normalizedToken.slice(0, -1)
    if (normalizedWord === stem) return true
    if (stem.length >= MIN_PREFIX_TOKEN_LENGTH && normalizedWord.startsWith(stem)) return true
  }

  if (
    normalizedToken.length >= MIN_PREFIX_TOKEN_LENGTH &&
    normalizedWord.startsWith(normalizedToken)
  ) {
    return true
  }

  return false
}

function tokenMatchesName(token: string, text: string): boolean {
  return getWords(text).some((word) => wordMatchesQueryToken(word, token))
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

const SIMPLE_SEARCH_LIMIT = 30
const SUGGEST_SEARCH_LIMIT = 25
const COMPOUND_SEARCH_LIMIT = 50
const COMPOUND_SEARCH_PAGES = 2
/** Consulta original + aliases en paralelo (una sola “vuelta” de red). */
const SUGGEST_QUERY_CAP = 4
const FULL_QUERY_CAP = 5

export type IngredientSearchMode = 'suggest' | 'full'

function matchesCompoundPhrase(productName: string, query: string): boolean {
  if (!isCompoundQuery(query)) return false

  const words = getWords(productName)
  const tokens = getSignificantTokens(query)
  if (tokens.length === 0) return false

  let wordIndex = 0
  return tokens.every((token) => {
    while (wordIndex < words.length) {
      if (wordMatchesQueryToken(words[wordIndex], token)) {
        wordIndex += 1
        return true
      }
      wordIndex += 1
    }
    return false
  })
}

function phraseStartsAtBeginning(productName: string, query: string): boolean {
  const words = getWords(productName)
  const tokens = getSignificantTokens(query)
  if (tokens.length === 0 || words.length === 0) return false

  return tokens.every((token, index) => {
    const word = words[index]
    return Boolean(word && wordMatchesQueryToken(word, token))
  })
}

function phrasePosition(productName: string, query: string): number {
  const words = getWords(productName)
  const tokens = getSignificantTokens(query)
  if (tokens.length === 0) return Number.MAX_SAFE_INTEGER

  const firstToken = tokens[0]
  const index = words.findIndex((word) => wordMatchesQueryToken(word, firstToken))
  return index >= 0 ? index : Number.MAX_SAFE_INTEGER
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
  mode: IngredientSearchMode = 'full',
): Promise<void> {
  const compound = isCompoundQuery(query)
  const pageLimit =
    mode === 'suggest'
      ? SUGGEST_SEARCH_LIMIT
      : compound
        ? COMPOUND_SEARCH_LIMIT
        : SIMPLE_SEARCH_LIMIT
  const pages = mode === 'suggest' ? 1 : compound ? COMPOUND_SEARCH_PAGES : 1

  for (let page = 0; page < pages; page += 1) {
    if (signal?.aborted) return

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

    if (!compound || mode === 'suggest' || response.productos.length < pageLimit) {
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
  const queryTokens = getSignificantTokens(query)
  if (queryTokens.length === 0) return true
  return queryTokens.every((token) => tokenMatchesName(token, productName))
}

export function matchesPrimaryWord(productName: string, query: string): boolean {
  const queryTokens = getSignificantTokens(query)
  const primaryToken = queryTokens[0]
  if (!primaryToken) return true

  const productFirstWord = getFirstWord(productName)
  return wordMatchesQueryToken(productFirstWord, primaryToken)
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
  const queryFirst = getSignificantTokens(query)[0] ?? getFirstWord(query)
  const productFirst = getFirstWord(productName)
  const words = getWords(productName)
  const normalizedName = normalizeText(productName)
  const normalizedQuery = normalizeText(query)

  let score = 0

  if (phraseStartsAtBeginning(productName, query)) {
    score += 500
  }

  if (queryFirst && productFirst === queryFirst) {
    score += 200
  } else if (queryFirst && wordMatchesQueryToken(productFirst, queryFirst)) {
    score += 150
  }

  const position = phrasePosition(productName, query)
  if (position === 0) {
    score += 80
  } else if (position > 0 && position < Number.MAX_SAFE_INTEGER) {
    score -= Math.min(position * 40, 200)
  }

  const queryTokens = getSignificantTokens(query)
  if (queryTokens.every((token) => words.some((word) => wordMatchesQueryToken(word, token)))) {
    score += 20
  }

  // Variedad base (blanca/común) arriba; especialidades abajo si no las pediste.
  score += varietyPreferenceScore(normalizedName, normalizedQuery, words, queryFirst)

  return score
}

/** Si buscás "cebolla", priorizar blanca/genérica y no morada/cherry/etc. */
const SPECIALTY_VARIETIES = [
  'morada',
  'morado',
  'roja',
  'rojo',
  'colorada',
  'colorado',
  'cherry',
  'perita',
  'violeta',
  'dulce',
  'platense',
  'chalota',
  'verdeo',
]

function varietyPreferenceScore(
  normalizedName: string,
  normalizedQuery: string,
  words: string[],
  queryFirst: string,
): number {
  const queryAsksSpecialty = SPECIALTY_VARIETIES.some((variety) =>
    normalizedQuery.includes(variety),
  )

  if (!queryAsksSpecialty) {
    for (const variety of SPECIALTY_VARIETIES) {
      if (normalizedName.includes(variety)) return -150
    }
  }

  let bonus = 0
  if (normalizedName.includes('blanca') || normalizedName.includes('blanco')) {
    bonus += 90
  }

  // Nombre corto tipo "Cebolla" / "Cebolla blanca" gana a marcas raras.
  if (queryFirst && words[0] === queryFirst && words.length <= 3) {
    bonus += 50
  }

  return bonus
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

  const primary = sortProductsByRelevance(
    relevant.filter((product) => isPrimaryMatch(product.nombre, query)),
    query,
  )

  // Si hay matches de primera palabra, no mezclar snacks/elaborados del resto.
  if (primary.length > 0) {
    return primary.slice(0, limit)
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
  mode: IngredientSearchMode = 'full',
): Promise<{ productos: PreciosClarosProductoResumen[]; agrupables: PreciosClarosAgrupable[] }> {
  const queries = getIngredientSearchQueries(query)
  const products = new Map<string, PreciosClarosProductoResumen>()
  const agrupables = new Map<string, PreciosClarosAgrupable>()

  if (queries.length === 0) {
    return { productos: [], agrupables: [] }
  }

  const queryCap = mode === 'suggest' ? SUGGEST_QUERY_CAP : FULL_QUERY_CAP
  const queriesToFetch = queries.slice(0, queryCap)

  // Todas en paralelo: una sola espera de red en lugar de cadena.
  await Promise.all(
    queriesToFetch.map((searchQuery) =>
      fetchSearchPages(searchQuery, query, products, agrupables, signal, mode),
    ),
  )

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
