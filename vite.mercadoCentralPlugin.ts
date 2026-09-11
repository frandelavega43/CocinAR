import type { Plugin } from 'vite'
import {
  getMercadoCentralCatalog,
  searchMercadoCentralItems,
} from './server/mercadoCentral/catalog'

/**
 * Expone /api/fresh-prices en `vite dev` (misma ruta que Vercel en producción).
 */
export function mercadoCentralApiPlugin(): Plugin {
  return {
    name: 'mercado-central-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url ? new URL(req.url, 'http://localhost') : null
        if (!url || url.pathname !== '/api/fresh-prices') {
          next()
          return
        }

        if (req.method !== 'GET') {
          res.statusCode = 405
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'Method not allowed' }))
          return
        }

        try {
          const query = url.searchParams.get('q')?.trim() ?? ''
          const limit = Math.min(Number(url.searchParams.get('limit') ?? 12) || 12, 30)
          const catalog = await getMercadoCentralCatalog()
          const items = query
            ? searchMercadoCentralItems(catalog.items, query, limit)
            : catalog.items.slice(0, limit)

          res.statusCode = 200
          res.setHeader('Content-Type', 'application/json')
          res.setHeader('Cache-Control', 'no-store')
          res.end(
            JSON.stringify({
              updatedAt: catalog.updatedAt,
              count: items.length,
              items,
            }),
          )
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Error Mercado Central'
          res.statusCode = 502
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: message, items: [] }))
        }
      })
    },
  }
}
