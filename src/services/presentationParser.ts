const UNIT_ALIASES: Record<string, string> = {
  gr: 'g',
  grm: 'g',
  gramo: 'g',
  gramos: 'g',
  kg: 'kg',
  kgm: 'kg',
  kilo: 'kg',
  kilogramo: 'kg',
  kilogramos: 'kg',
  l: 'l',
  lt: 'l',
  lts: 'l',
  litro: 'l',
  litros: 'l',
  ml: 'ml',
  cc: 'ml',
  mililitro: 'ml',
  mililitros: 'ml',
  u: 'u',
  un: 'u',
  uni: 'u',
  unid: 'u',
  unidad: 'u',
  unidades: 'u',
  docena: 'docena',
}

const INVALID_PRESENTATIONS = new Set(['none none', 'none', ''])

function parseQuantityUnitPair(raw: string): { quantity: number; unit: string } | null {
  const match = raw.trim().match(/^([\d.,]+)\s*([a-zA-Záéíóúñ%.]+)/i)
  if (!match) return null

  const quantity = Number(match[1].replace(',', '.'))
  if (!Number.isFinite(quantity) || quantity <= 0) return null

  const unit = normalizePackageUnit(match[2])
  if (!unit) return null

  return { quantity, unit }
}

function parseFromName(nombre: string): { quantity: number; unit: string } | null {
  const patterns = [
    /\bx\s*(\d+(?:[.,]\d+)?)\s*(unid(?:ades)?|uni|un)\b/i,
    /(\d+(?:[.,]\d+)?)\s*(kgm|kilogramos?|kilos?|kg)\b/i,
    /(\d+(?:[.,]\d+)?)\s*(grm|gramos?|gr|g)\b/i,
    /(\d+(?:[.,]\d+)?)\s*(mililitros?|ml|cc)\b/i,
    /(\d+(?:[.,]\d+)?)\s*(litros?|lts?|lt|l)\b/i,
    /(\d+(?:[.,]\d+)?)\s*(unid(?:ades)?|uni|un)\b/i,
    /(\d+(?:[.,]\d+)?)\s*(docenas?)\b/i,
  ]

  for (const pattern of patterns) {
    const match = nombre.match(pattern)
    if (!match) continue

    const quantity = Number(match[1].replace(',', '.'))
    const unit = normalizePackageUnit(match[2])
    if (!unit || !Number.isFinite(quantity) || quantity <= 0) continue

    return { quantity, unit }
  }

  return null
}

export function normalizePackageUnit(unit: string): string | null {
  const cleaned = unit.trim().toLowerCase().replace(/\./g, '')
  if (!cleaned || cleaned === 'none') return null
  return UNIT_ALIASES[cleaned] ?? cleaned
}

export function parseProductPresentation(
  presentacion: string,
  nombre = '',
): { quantity: number; unit: string } {
  const normalizedPresentation = presentacion.trim().toLowerCase()
  if (!INVALID_PRESENTATIONS.has(normalizedPresentation)) {
    const fromPresentation = parseQuantityUnitPair(presentacion)
    if (fromPresentation) return fromPresentation
  }

  const fromName = parseFromName(nombre)
  if (fromName) return fromName

  return { quantity: 1, unit: 'u' }
}

export function inferRecipeUnit(presentacion: string, nombre = ''): string {
  return parseProductPresentation(presentacion, nombre).unit
}

export function formatPrice(value: number): string {
  return value.toLocaleString('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  })
}
