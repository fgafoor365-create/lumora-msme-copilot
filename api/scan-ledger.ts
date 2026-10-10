/**
 * Ledger scanner endpoint. SERVER-SIDE ONLY. Never import this from src/.
 *
 *  - Deployed on Vercel it is the serverless function at /api/scan-ledger.
 *  - In local dev it is served by vite-ledger-api.ts (see LEDGER_SCANNER_SETUP.md).
 *
 * The API key is read from ANTHROPIC_API_KEY on the server. It is never sent to the browser.
 * Ledger images and extracted names are NOT logged or stored here.
 */

const ALLOWED = ['image/jpeg', 'image/png', 'image/webp'] as const
type MediaType = (typeof ALLOWED)[number]

const MAX_BASE64_CHARS = 4_000_000 // ≈ 3 MB image
const API_URL = 'https://api.anthropic.com/v1/messages'
const DEFAULT_MODEL = 'claude-sonnet-5-5'

type Env = Record<string, string | undefined>
export type ScanResult = { status: number; body: Record<string, unknown> }

type VercelReq = { method?: string; body?: unknown }
type VercelRes = {
  status(code: number): VercelRes
  setHeader(name: string, value: string): void
  json(body: unknown): void
}

const CONF = { type: 'string', enum: ['high', 'medium', 'low'] }

const TOOL = {
  name: 'record_ledger_entries',
  description: 'Record every handwritten ledger entry that is legible on the page.',
  input_schema: {
    type: 'object',
    properties: {
      readable: { type: 'boolean', description: 'False if the image is not a ledger page or is unreadable.' },
      notes: {
        type: 'array',
        items: { type: 'string' },
        description: 'Short warnings for the owner, e.g. blurry area, unreadable column, mixed languages.',
      },
      entries: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            date: { type: ['string', 'null'], description: 'ISO date YYYY-MM-DD, or null if not determinable.' },
            name: { type: ['string', 'null'], description: 'Customer or supplier exactly as written, or null.' },
            amount: { type: ['number', 'null'], description: 'Rupee amount as written, or null if unreadable.' },
            type: { type: 'string', enum: ['sale', 'expense', 'payment_received', 'credit_given', 'unclear'] },
            description: { type: 'string', description: 'Item or note as written. Empty string if none.' },
            status: { type: 'string', enum: ['paid', 'unpaid', 'unknown'] },
            confidence: {
              type: 'object',
              properties: { date: CONF, name: CONF, amount: CONF, type: CONF },
              required: ['date', 'name', 'amount', 'type'],
            },
            rawText: { type: 'string', description: 'The line as you read it.' },
          },
          required: ['date', 'name', 'amount', 'type', 'description', 'status', 'confidence', 'rawText'],
        },
      },
    },
    required: ['readable', 'notes', 'entries'],
  },
}

const system = (today: string) => `You read photographs of handwritten shop or business account-book pages (ledgers) kept by small business owners in India. Writing may be in English, Telugu, Hindi or Urdu, often mixed, with messy handwriting.

Rules:
- Today's date is ${today}. If a date has no year, assume the current year and mark date confidence "medium".
- NEVER guess or invent. If a name, date or amount is not legible, return null for it and confidence "low". It is better to report less than to report something wrong.
- Copy amounts exactly as written. Do not add, total or correct them. Ignore running totals and page totals.
- Classify type only from evidence on the page: "sale" (money received for goods/services), "expense" (money paid out), "credit_given" (sold on credit / udhar given, not yet paid), "payment_received" (a customer paying back earlier credit). If you cannot tell, use "unclear".
- Set status "unpaid" only if the page clearly shows it is unpaid or pending, "paid" only if clearly paid, otherwise "unknown".
- If the line has no customer or supplier name, use null for name and confidence "high" for name.
- Keep names in the original script; do not translate or transliterate them.
- If the image is not a ledger page or nothing is legible, set readable=false and return no entries.
Return everything through the record_ledger_entries tool.`

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null

const conf = (v: unknown): 'high' | 'medium' | 'low' => (v === 'high' || v === 'medium' || v === 'low' ? v : 'low')
const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '')

function sanitize(input: unknown) {
  const out = { readable: false, notes: [] as string[], entries: [] as Record<string, unknown>[] }
  if (!isRecord(input)) return out
  out.readable = input.readable !== false
  if (Array.isArray(input.notes)) out.notes = input.notes.map((n) => str(n, 160)).filter(Boolean).slice(0, 5)
  if (!Array.isArray(input.entries)) return out

  for (const e of input.entries.slice(0, 60)) {
    if (!isRecord(e)) continue
    const c = isRecord(e.confidence) ? e.confidence : {}
    const amount = typeof e.amount === 'number' && Number.isFinite(e.amount) && e.amount > 0 ? Math.round(e.amount * 100) / 100 : null
    const date = typeof e.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(e.date) ? e.date : null
    const name = str(e.name, 80) || null
    const type = ['sale', 'expense', 'payment_received', 'credit_given'].includes(String(e.type)) ? e.type : 'unclear'
    out.entries.push({
      date,
      name,
      amount,
      type,
      description: str(e.description, 120),
      status: e.status === 'paid' || e.status === 'unpaid' ? e.status : 'unknown',
      confidence: {
        date: date ? conf(c.date) : 'low',
        name: name ? conf(c.name) : 'high',
        amount: amount !== null ? conf(c.amount) : 'low',
        type: type === 'unclear' ? 'low' : conf(c.type),
      },
      rawText: str(e.rawText, 200),
    })
  }
  return out
}

function parseBody(body: unknown): { image: string; mediaType: MediaType; today: string } | null {
  if (!isRecord(body)) return null
  const { image, mediaType, today } = body
  if (typeof image !== 'string' || image.length < 100 || image.length > MAX_BASE64_CHARS) return null
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(image.slice(0, 200))) return null
  if (!ALLOWED.includes(mediaType as MediaType)) return null
  const t = typeof today === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(today) ? today : new Date().toISOString().slice(0, 10)
  return { image, mediaType: mediaType as MediaType, today: t }
}

export async function handleScan(method: string | undefined, body: unknown, env: Env): Promise<ScanResult> {
  const key = env.ANTHROPIC_API_KEY

  if (method === 'GET') return { status: 200, body: { configured: Boolean(key) } }
  if (method !== 'POST') return { status: 405, body: { code: 'method', message: 'Use POST.' } }
  if (!key) {
    return {
      status: 503,
      body: { code: 'not_configured', message: 'Handwriting recognition is not configured on the server.' },
    }
  }

  const parsed = parseBody(body)
  if (!parsed) {
    return {
      status: 400,
      body: { code: 'bad_request', message: 'Send a JPEG, PNG or WebP image under about 3 MB.' },
    }
  }

  let upstream: Response
  try {
    upstream = await fetch(API_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: env.LEDGER_MODEL || DEFAULT_MODEL,
        max_tokens: 4000,
        system: system(parsed.today),
        tools: [TOOL],
        tool_choice: { type: 'tool', name: TOOL.name },
        messages: [
          {
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: parsed.mediaType, data: parsed.image } },
              { type: 'text', text: 'Read every ledger entry on this page.' },
            ],
          },
        ],
      }),
    })
  } catch {
    return { status: 502, body: { code: 'provider_unreachable', message: 'Could not reach the recognition service.' } }
  }

  if (!upstream.ok) {
    // Log only the status code, never the image or response body.
    console.error(`ledger-scan: provider returned ${upstream.status}`)
    if (upstream.status === 401 || upstream.status === 403) {
      return { status: 502, body: { code: 'provider_auth', message: 'The server’s AI key was rejected.' } }
    }
    if (upstream.status === 429) {
      return { status: 429, body: { code: 'rate_limited', message: 'Too many scans right now. Try again in a minute.' } }
    }
    return { status: 502, body: { code: 'provider_error', message: 'The recognition service had a problem.' } }
  }

  let data: unknown
  try {
    data = await upstream.json()
  } catch {
    return { status: 502, body: { code: 'provider_error', message: 'Unreadable response from the recognition service.' } }
  }

  const content = isRecord(data) && Array.isArray(data.content) ? data.content : []
  const block = content.find((b) => isRecord(b) && b.type === 'tool_use')
  const result = sanitize(isRecord(block) ? block.input : null)

  if (!result.readable) {
    return {
      status: 422,
      body: { code: 'unreadable', message: 'This doesn’t look like a readable ledger page.', notes: result.notes },
    }
  }
  return { status: 200, body: { entries: result.entries, notes: result.notes } }
}

/** Vercel serverless entry point. */
export default async function handler(req: VercelReq, res: VercelRes) {
  const out = await handleScan(req.method, req.body, process.env)
  res.setHeader('Cache-Control', 'no-store')
  res.status(out.status).json(out.body)
}
