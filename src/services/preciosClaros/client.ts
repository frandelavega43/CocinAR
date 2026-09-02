import type {
  PreciosClarosProductoResponse,
  PreciosClarosSearchResponse,
  PreciosClarosSucursalesResponse,
} from './types'
import { getCachedProductSearch, setCachedProductSearch } from './searchCache'

const API_BASE =
  (import.meta.env.VITE_PRECIOS_CLAROS_URL as string | undefined)?.replace(/\/$/, '') ??
  'https://d3e6htiiul5ek9.cloudfront.net/prod'

const DEFAULT_LAT = Number(import.meta.env.VITE_PRECIOS_CLAROS_LAT ?? -34.6037)
const DEFAULT_LNG = Number(import.meta.env.VITE_PRECIOS_CLAROS_LNG ?? -58.3816)
const MAX_SUCURSALES = 50

const SUCURSALES_CACHE_KEY = 'cocinaar-precios-claros-sucursales'
const SUCURSALES_TTL_MS = 24 * 60 * 60 * 1000

let sucursalesPromise: Promise<string> | null = null

interface CachedSucursales {
  ids: string
  fetchedAt: number
}

async function apiGet<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, { signal })

  if (!response.ok) {
    throw new Error(`Precios Claros respondió ${response.status}`)
  }

  const payload = (await response.json()) as T & { status?: number; errorDescription?: string }

  if (payload.status && payload.status !== 200) {
    throw new Error(payload.errorDescription ?? 'Error al consultar Precios Claros')
  }

  return payload
}

function readSucursalesCache(): CachedSucursales | null {
  try {
    const raw = sessionStorage.getItem(SUCURSALES_CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as CachedSucursales
    if (Date.now() - parsed.fetchedAt > SUCURSALES_TTL_MS) return null
    return parsed
  } catch {
    return null
  }
}

function writeSucursalesCache(ids: string) {
  sessionStorage.setItem(
    SUCURSALES_CACHE_KEY,
    JSON.stringify({ ids, fetchedAt: Date.now() } satisfies CachedSucursales),
  )
}

export function isPreciosClarosConfigured(): boolean {
  return Boolean(API_BASE)
}

export async function getSucursalesIds(force = false): Promise<string> {
  if (!force) {
    const cached = readSucursalesCache()
    if (cached) return cached.ids
  }

  if (!force && sucursalesPromise) {
    return sucursalesPromise
  }

  sucursalesPromise = (async () => {
    const query = new URLSearchParams({
      lat: String(DEFAULT_LAT),
      lng: String(DEFAULT_LNG),
      limit: String(MAX_SUCURSALES),
    })

    const response = await apiGet<PreciosClarosSucursalesResponse>(
      `/sucursales?${query.toString()}`,
    )

    const ids = response.sucursales.map((sucursal) => sucursal.id).join(',')
    writeSucursalesCache(ids)
    return ids
  })()

  try {
    return await sucursalesPromise
  } finally {
    sucursalesPromise = null
  }
}

/** Precarga sucursales en idle para que la primera búsqueda no espere esto. */
export function prefetchSucursales() {
  if (typeof window === 'undefined') return
  if (!isPreciosClarosConfigured()) return
  if (readSucursalesCache()) return

  const run = () => {
    void getSucursalesIds().catch(() => {
      // silencioso: se reintentará en la primera búsqueda
    })
  }

  const idle = (window as Window & { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number })
    .requestIdleCallback

  if (typeof idle === 'function') {
    idle(run, { timeout: 2000 })
  } else {
    window.setTimeout(run, 300)
  }
}

export async function searchProductos(
  query: string,
  limit = 10,
  signal?: AbortSignal,
  offset = 0,
): Promise<PreciosClarosSearchResponse> {
  const trimmed = query.trim()
  if (!trimmed) {
    return { status: 200, productos: [], total: 0 }
  }

  const cached = getCachedProductSearch(trimmed, limit, offset)
  if (cached) return cached

  const sucursales = await getSucursalesIds()
  const params = new URLSearchParams({
    string: trimmed,
    array_sucursales: sucursales,
    offset: String(offset),
    limit: String(limit),
  })

  const data = await apiGet<PreciosClarosSearchResponse>(
    `/productos?${params.toString()}`,
    signal,
  )

  if (!signal?.aborted) {
    setCachedProductSearch(trimmed, limit, offset, data)
  }

  return data
}

export async function getProductoByEan(ean: string): Promise<PreciosClarosProductoResponse> {
  const sucursales = await getSucursalesIds()
  const params = new URLSearchParams({
    id_producto: ean.trim(),
    array_sucursales: sucursales,
    limit: String(MAX_SUCURSALES),
  })

  return apiGet<PreciosClarosProductoResponse>(`/producto?${params.toString()}`)
}

export function isValidEan(value: string): boolean {
  return /^\d{8,14}$/.test(value.trim())
}

export async function resolveProductByName(name: string) {
  const results = await searchProductos(name, 5)
  const normalized = name.trim().toLowerCase()

  const exact = results.productos.find(
    (product) => product.nombre.trim().toLowerCase() === normalized,
  )
  if (exact) return exact

  const partial = results.productos.find((product) =>
    product.nombre.toLowerCase().includes(normalized),
  )
  return partial ?? results.productos[0] ?? null
}
