import type { VercelRequest, VercelResponse } from '@vercel/node'
import {
  getMercadoCentralCatalog,
  searchMercadoCentralItems,
} from '../server/mercadoCentral/catalog.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const query = String(req.query.q ?? '').trim()
    const limit = Math.min(Number(req.query.limit ?? 12) || 12, 30)
    const catalog = await getMercadoCentralCatalog()

    const items = query
      ? searchMercadoCentralItems(catalog.items, query, limit)
      : catalog.items.slice(0, limit)

    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400')
    return res.status(200).json({
      updatedAt: catalog.updatedAt,
      count: items.length,
      items,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error Mercado Central'
    return res.status(502).json({ error: message, items: [] })
  }
}
