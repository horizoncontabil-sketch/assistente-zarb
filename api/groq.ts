// Ponte para a Groq com a chave que fica só na Vercel (GROQ_API_KEY). Só atende o Paulo logado (token do Supabase
// conferido; o cadastro é fechado para um e-mail). Usada pela conversa do celular e pelo PC ligado ao celular.
import { GROQ_AUDIO, GROQ_CHAT, MODELO_AUDIO, MODELO_PADRAO } from '../src/shared/groq'

const SUPABASE_URL = 'https://xbqfrjgvevpuiybsvdco.supabase.co'
const SUPABASE_CHAVE = 'sb_publishable_QCQmEl6TGbLXHQgb9ze6bA_ilCkmnks'
const MODELOS = new Set([MODELO_PADRAO, 'llama-3.1-8b-instant', 'openai/gpt-oss-120b', 'openai/gpt-oss-20b', 'moonshotai/kimi-k2-instruct'])

type Req = { method?: string; headers: Record<string, string | string[] | undefined>; body?: unknown }
type Res = { status: (n: number) => Res; json: (b: unknown) => void }

export default async function handler(req: Req, res: Res) {
  if (req.method !== 'POST') return res.status(405).json({ erro: 'Use POST.' })
  const auth = String(req.headers.authorization ?? '')
  if (!auth.startsWith('Bearer ') || auth.length < 20) return res.status(401).json({ erro: 'Entre de novo no app.' })
  const quem = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { Authorization: auth, apikey: SUPABASE_CHAVE } })
  if (!quem.ok) return res.status(401).json({ erro: 'Entre de novo no app.' })

  const chave = process.env.GROQ_API_KEY
  if (!chave) return res.status(503).json({ erro: 'Falta a GROQ_API_KEY na Vercel.' })

  let corpo: { tipo?: unknown; pedido?: Record<string, unknown>; audio?: unknown }
  try {
    corpo = (typeof req.body === 'string' ? JSON.parse(req.body) : req.body) ?? {}
  } catch {
    return res.status(400).json({ erro: 'Pedido inválido.' })
  }

  if (corpo.tipo === 'chat' && corpo.pedido && typeof corpo.pedido === 'object') {
    const p = corpo.pedido
    if (JSON.stringify(p).length > 60_000) return res.status(413).json({ erro: 'Conversa longa demais.' })
    const model = typeof p.model === 'string' && MODELOS.has(p.model) ? p.model : MODELO_PADRAO
    const r = await fetch(GROQ_CHAT, {
      method: 'POST',
      headers: { Authorization: `Bearer ${chave}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...p, model, stream: false, max_tokens: 1024 }),
    })
    return res.status(r.status).json(await r.json().catch(() => ({})))
  }

  if (corpo.tipo === 'audio' && typeof corpo.audio === 'string') {
    const bytes = Buffer.from(corpo.audio, 'base64')
    if (!bytes.length || bytes.length > 3_000_000) return res.status(413).json({ erro: 'Áudio longo demais.' })
    const form = new FormData()
    form.append('file', new Blob([bytes], { type: 'audio/webm' }), 'fala.webm')
    form.append('model', MODELO_AUDIO)
    form.append('language', 'pt')
    form.append('response_format', 'json')
    const r = await fetch(GROQ_AUDIO, { method: 'POST', headers: { Authorization: `Bearer ${chave}` }, body: form })
    return res.status(r.status).json(await r.json().catch(() => ({})))
  }

  return res.status(400).json({ erro: 'Pedido inválido.' })
}
