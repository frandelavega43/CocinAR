import type { MercadoCentralItem } from '../../src/types/index.js'
import JSZip from 'jszip'
import XLSX from 'xlsx'

const INDEX_URL = 'https://mercadocentral.gob.ar/informaci%C3%B3n/precios-mayoristas'
const RETAIL_MARKUP = 1.55
const CACHE_TTL_MS = 12 * 60 * 60 * 1000

export type { MercadoCentralItem }

interface CatalogCache {
  items: MercadoCentralItem[]
  fetchedAt: number
  updatedAt: string
}

let catalogCache: CatalogCache | null = null
let catalogPromise: Promise<CatalogCache> | null = null

function normalizeText(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function titleCase(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/(^|\s)\S/g, (char) => char.toUpperCase())
}

function monthRank(label: string): number {
  const normalized = normalizeText(label)
  const months = [
    'enero',
    'febrero',
    'marzo',
    'abril',
    'mayo',
    'junio',
    'julio',
    'agosto',
    'septiembre',
    'septienbre',
    'octubre',
    'noviembre',
    'diciembre',
  ]
  for (let index = months.length - 1; index >= 0; index -= 1) {
    if (normalized.includes(months[index])) return index + 1
  }
  return 0
}

function pickLatestZip(urls: string[], kind: 'fruta' | 'hortaliza'): string | null {
  const filtered = urls.filter((url) => {
    const name = normalizeText(decodeURIComponent(url))
    if (kind === 'fruta') return name.includes('fruta')
    return name.includes('hortaliza')
  })

  if (filtered.length === 0) return null

  return filtered.sort((left, right) => {
    const leftName = decodeURIComponent(left)
    const rightName = decodeURIComponent(right)
    const monthDiff = monthRank(rightName) - monthRank(leftName)
    if (monthDiff !== 0) return monthDiff
    return rightName.localeCompare(leftName, 'es')
  })[0]
}

async function listZipUrls(signal?: AbortSignal): Promise<string[]> {
  const response = await fetch(INDEX_URL, { signal })
  if (!response.ok) {
    throw new Error(`Mercado Central respondió ${response.status}`)
  }

  const html = await response.text()
  const matches = [...html.matchAll(/href="(https:\/\/mercadocentral\.gob\.ar\/sites\/default\/files\/precios_mayoristas\/[^"]+\.zip)"/gi)]
  return [...new Set(matches.map((match) => match[1]))]
}

function parseSheetRows(
  rows: unknown[][],
  category: 'hortaliza' | 'fruta',
  updatedAt: string,
): MercadoCentralItem[] {
  if (rows.length === 0) return []

  const header = rows[0].map((cell) => String(cell ?? '').toUpperCase())
  const espIndex = header.indexOf('ESP')
  const varIndex = header.indexOf('VAR')
  const mopkIndex = header.indexOf('MOPK')

  if (espIndex < 0 || mopkIndex < 0) return []

  const byName = new Map<string, number[]>()

  for (const row of rows.slice(1)) {
    const especie = String(row[espIndex] ?? '').trim()
    if (!especie) continue

    const variedad = String(row[varIndex] ?? '').trim()
    const mopk = Number(row[mopkIndex])
    if (!Number.isFinite(mopk) || mopk <= 0) continue

    if (variedad.toLowerCase().includes('prom')) {
      byName.set(normalizeText(especie), [mopk])
      continue
    }

    const key = normalizeText(especie)
    if (byName.has(key) && byName.get(key)!.length === 1) {
      // Ya tenemos promedio de especie
      continue
    }

    const list = byName.get(key) ?? []
    list.push(mopk)
    byName.set(key, list)
  }

  const items: MercadoCentralItem[] = []
  for (const [key, prices] of byName.entries()) {
    const wholesale =
      prices.reduce((sum, value) => sum + value, 0) / Math.max(prices.length, 1)
    if (!Number.isFinite(wholesale) || wholesale <= 0) continue

    const displayName = titleCase(key)
    items.push({
      id: `mc-${category}-${key}`,
      name: displayName,
      unit: 'kg',
      wholesalePricePerKg: Math.round(wholesale),
      retailPricePerKg: Math.round(wholesale * RETAIL_MARKUP),
      updatedAt,
      source: 'mercado-central',
      category,
    })
  }

  return items
}

async function parseZip(
  url: string,
  category: 'hortaliza' | 'fruta',
  signal?: AbortSignal,
): Promise<MercadoCentralItem[]> {
  const response = await fetch(url, { signal })
  if (!response.ok) {
    throw new Error(`No se pudo bajar ${url}`)
  }

  const buffer = await response.arrayBuffer()
  const zip = await JSZip.loadAsync(buffer)
  const xlsFiles = Object.values(zip.files)
    .filter((file) => !file.dir && /\.xls$/i.test(file.name))
    .sort((left, right) => right.name.localeCompare(left.name, 'es'))

  if (xlsFiles.length === 0) return []

  // Usar el parte diario más reciente del mes.
  const latest = xlsFiles[0]
  const content = await latest.async('arraybuffer')
  const workbook = XLSX.read(content, { type: 'array' })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: null,
  }) as unknown[][]

  const updatedAt = new Date().toISOString()
  return parseSheetRows(rows, category, updatedAt)
}

async function buildCatalog(signal?: AbortSignal): Promise<CatalogCache> {
  const zipUrls = await listZipUrls(signal)
  const hortUrl = pickLatestZip(zipUrls, 'hortaliza')
  const fruitUrl = pickLatestZip(zipUrls, 'fruta')

  const [hortalizas, frutas] = await Promise.all([
    hortUrl ? parseZip(hortUrl, 'hortaliza', signal) : Promise.resolve([]),
    fruitUrl ? parseZip(fruitUrl, 'fruta', signal) : Promise.resolve([]),
  ])

  const byId = new Map<string, MercadoCentralItem>()
  for (const item of [...hortalizas, ...frutas]) {
    byId.set(item.id, item)
  }

  const items = [...byId.values()].sort((left, right) =>
    left.name.localeCompare(right.name, 'es'),
  )

  return {
    items,
    fetchedAt: Date.now(),
    updatedAt: new Date().toISOString(),
  }
}

export async function getMercadoCentralCatalog(
  signal?: AbortSignal,
): Promise<CatalogCache> {
  if (catalogCache && Date.now() - catalogCache.fetchedAt < CACHE_TTL_MS) {
    return catalogCache
  }

  if (catalogPromise) return catalogPromise

  catalogPromise = buildCatalog(signal)
    .then((catalog) => {
      catalogCache = catalog
      return catalog
    })
    .finally(() => {
      catalogPromise = null
    })

  return catalogPromise
}

function scoreItem(item: MercadoCentralItem, query: string): number {
  const name = normalizeText(item.name)
  const q = normalizeText(query)
  if (!q) return 0

  const words = name.split(/[^a-z0-9]+/).filter(Boolean)
  if (name === q) return 100
  if (words[0] === q) return 95
  if (words[0]?.startsWith(q) && q.length >= 4) return 80
  if (words.some((word) => word === q)) return 70
  if (words.some((word) => word.startsWith(q) && q.length >= 4)) return 50
  return 0
}

export function searchMercadoCentralItems(
  items: MercadoCentralItem[],
  query: string,
  limit = 12,
): MercadoCentralItem[] {
  const trimmed = query.trim()
  if (trimmed.length < 2) return []

  return items
    .map((item) => ({ item, score: scoreItem(item, trimmed) }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score
      return left.item.name.localeCompare(right.item.name, 'es')
    })
    .slice(0, limit)
    .map((entry) => entry.item)
}

export async function searchMercadoCentralPrices(
  query: string,
  limit = 12,
  signal?: AbortSignal,
): Promise<MercadoCentralItem[]> {
  const catalog = await getMercadoCentralCatalog(signal)
  return searchMercadoCentralItems(catalog.items, query, limit)
}

export const MERCADO_CENTRAL_RETAIL_MARKUP = RETAIL_MARKUP
