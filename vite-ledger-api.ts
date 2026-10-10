/**
 * Dev-only Vite plugin that serves /api/scan-ledger locally, using the same handler as Vercel.
 * Reads ANTHROPIC_API_KEY from .env.local on the server side. Nothing is exposed to the browser.
 */
import type { Plugin } from 'vite'
import { loadEnv } from 'vite'
import { handleScan } from './api/scan-ledger.js'

const MAX_BYTES = 6 * 1024 * 1024

export function ledgerDevApi(): Plugin {
  let env: Record<string, string | undefined> = {}

  return {
    name: 'lumora-ledger-dev-api',
    configResolved(config) {
      env = loadEnv(config.mode, config.root, '')
    },
    configureServer(server) {
      server.middlewares.use('/api/scan-ledger', (req, res) => {
        const chunks: Buffer[] = []
        let size = 0
        let tooBig = false

        req.on('data', (chunk: Buffer) => {
          size += chunk.length
          if (size > MAX_BYTES) tooBig = true
          else chunks.push(chunk)
        })

        req.on('end', async () => {
          let body: unknown
          if (!tooBig && chunks.length) {
            try {
              body = JSON.parse(Buffer.concat(chunks).toString('utf8'))
            } catch {
              body = undefined
            }
          }
          const out = tooBig
            ? { status: 413, body: { code: 'bad_request', message: 'Image is too large.' } }
            : await handleScan(req.method, body, env)
          res.statusCode = out.status
          res.setHeader('Content-Type', 'application/json')
          res.setHeader('Cache-Control', 'no-store')
          res.end(JSON.stringify(out.body))
        })
      })
    },
  }
}
