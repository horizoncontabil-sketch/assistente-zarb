import { shell } from 'electron'
import { createHash, randomBytes, randomUUID } from 'node:crypto'
import { createServer } from 'node:http'
import type { AddressInfo } from 'node:net'
import * as config from './config'
import { corpoNovoEvento, eventosDaApi, URL_EVENTOS, URL_TOKEN, urlDeAutorizacao } from '../shared/google'
import type { Evento, Ok, RascunhoEvento } from '../shared/tipos'

type Tokens = { refresh: string; acesso: string; expiraEm: number }

const b64url = (b: Buffer) => b.toString('base64url')

function lerTokens(): Tokens | null {
  const t = config.decifrar(config.ler().googleTokensCifrados)
  try {
    return t ? (JSON.parse(t) as Tokens) : null
  } catch {
    return null
  }
}

function gravarTokens(t: Tokens) {
  config.gravar({ googleTokensCifrados: config.cifrar(JSON.stringify(t)) })
}

// Credencial de "app para computador" do Google Cloud da Zarb, posta na montagem (segredos do GitHub).
// Em app de computador o Google não trata essa chave como segredo; o app é Interno, então só contas
// da Zarb entram. Sem ela (versão de desenvolvimento), vale a cadastrada à mão nas configurações.
const EMBUTIDO = {
  id: import.meta.env.MAIN_VITE_GOOGLE_CLIENT_ID as string | undefined,
  segredo: import.meta.env.MAIN_VITE_GOOGLE_CLIENT_SECRET as string | undefined,
}

function cliente() {
  if (EMBUTIDO.id && EMBUTIDO.segredo) return { id: EMBUTIDO.id, segredo: EMBUTIDO.segredo }
  const c = config.ler()
  const segredo = config.decifrar(c.googleSegredoCifrado)
  return c.googleClientId && segredo ? { id: c.googleClientId, segredo } : null
}

export function estado() {
  const c = config.ler()
  return { temCliente: !!cliente(), conectado: !!c.googleTokensCifrados, email: c.googleEmail ?? null }
}

export function definirCliente(id: string, segredo: string): Ok {
  const i = id.trim()
  const s = segredo.trim()
  if (!/^[\w-]+\.apps\.googleusercontent\.com$/.test(i)) return { ok: false, erro: 'O ID do cliente termina em .apps.googleusercontent.com.' }
  if (!s) return { ok: false, erro: 'Falta a chave secreta do cliente.' }
  config.gravar({ googleClientId: i, googleSegredoCifrado: config.cifrar(s), googleTokensCifrados: undefined, googleEmail: undefined })
  return { ok: true }
}

export function desconectar() {
  config.gravar({ googleTokensCifrados: undefined, googleEmail: undefined })
}

function emailDoIdToken(idToken: unknown): string | undefined {
  if (typeof idToken !== 'string') return undefined
  try {
    const email = JSON.parse(Buffer.from(idToken.split('.')[1], 'base64url').toString('utf8')).email
    return typeof email === 'string' ? email : undefined
  } catch {
    return undefined
  }
}

// Login do Google pelo navegador. Durante o login (no máximo 5 minutos) o app escuta só em
// 127.0.0.1, numa porta aleatória, para receber a resposta do Google; depois fecha.
export function conectar(): Promise<Ok> {
  const c = cliente()
  if (!c) return Promise.resolve({ ok: false, erro: 'Cadastre primeiro o ID e a chave do cliente do Google.' })
  const verificador = b64url(randomBytes(32))
  const desafio = b64url(createHash('sha256').update(verificador).digest())
  const estadoEsperado = b64url(randomBytes(16))

  return new Promise((resolver) => {
    let terminou = false
    const servidor = createServer(async (req, res) => {
      const url = new URL(req.url ?? '/', 'http://127.0.0.1')
      if (url.pathname !== '/') {
        res.writeHead(404).end()
        return
      }
      const code = url.searchParams.get('code')
      const valido = code && url.searchParams.get('state') === estadoEsperado
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
      res.end(
        `<!doctype html><meta charset="utf-8"><title>Assistente pessoal</title><body style="font:16px system-ui;padding:40px">` +
          (valido ? 'Agenda conectada. Pode fechar esta aba.' : 'Login cancelado ou inválido. Pode fechar esta aba.') +
          '</body>',
      )
      if (!valido) return fim({ ok: false, erro: 'Login do Google cancelado.' })
      try {
        const r = await fetch(URL_TOKEN, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            code: code!,
            client_id: c.id,
            client_secret: c.segredo,
            code_verifier: verificador,
            grant_type: 'authorization_code',
            redirect_uri: `http://127.0.0.1:${(servidor.address() as AddressInfo).port}`,
          }),
          signal: AbortSignal.timeout(20_000),
        })
        const j = (await r.json()) as { access_token?: string; refresh_token?: string; expires_in?: number; id_token?: string }
        if (!r.ok || !j.access_token || !j.refresh_token) return fim({ ok: false, erro: 'O Google não liberou o acesso à agenda.' })
        gravarTokens({ refresh: j.refresh_token, acesso: j.access_token, expiraEm: Date.now() + (j.expires_in ?? 3600) * 1000 })
        config.gravar({ googleEmail: emailDoIdToken(j.id_token) })
        fim({ ok: true })
      } catch {
        fim({ ok: false, erro: 'Sem conexão com o Google.' })
      }
    })
    const limite = setTimeout(() => fim({ ok: false, erro: 'O login do Google demorou demais. Tente de novo.' }), 5 * 60_000)
    function fim(r: Ok) {
      if (terminou) return
      terminou = true
      clearTimeout(limite)
      servidor.close()
      resolver(r)
    }
    servidor.listen(0, '127.0.0.1', () => {
      const porta = (servidor.address() as AddressInfo).port
      shell.openExternal(urlDeAutorizacao(c.id, `http://127.0.0.1:${porta}`, desafio, estadoEsperado))
    })
    servidor.on('error', () => fim({ ok: false, erro: 'Não deu para abrir o login do Google.' }))
  })
}

class SemAcesso extends Error {}

async function tokenDeAcesso(): Promise<string> {
  const t = lerTokens()
  const c = cliente()
  if (!t || !c) throw new SemAcesso('Agenda não conectada.')
  if (t.expiraEm - 60_000 > Date.now()) return t.acesso
  const r = await fetch(URL_TOKEN, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: c.id, client_secret: c.segredo, refresh_token: t.refresh, grant_type: 'refresh_token' }),
    signal: AbortSignal.timeout(20_000),
  })
  const j = (await r.json().catch(() => ({}))) as { access_token?: string; expires_in?: number; error?: string }
  if (j.error === 'invalid_grant') {
    desconectar()
    throw new SemAcesso('O Google pediu login de novo. Conecte a agenda em Configurações.')
  }
  if (!r.ok || !j.access_token) throw new Error('Não deu para falar com o Google agora.')
  gravarTokens({ ...t, acesso: j.access_token, expiraEm: Date.now() + (j.expires_in ?? 3600) * 1000 })
  return j.access_token
}

export async function listarEventos(de: Date, ate: Date): Promise<Evento[]> {
  const p = new URLSearchParams({
    timeMin: de.toISOString(),
    timeMax: ate.toISOString(),
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '100',
  })
  const r = await fetch(`${URL_EVENTOS}?${p}`, { headers: { Authorization: `Bearer ${await tokenDeAcesso()}` }, signal: AbortSignal.timeout(20_000) })
  if (r.status === 401) throw new SemAcesso('O Google recusou o acesso. Conecte a agenda de novo.')
  if (!r.ok) throw new Error(`O Google Agenda respondeu com erro (${r.status}).`)
  return eventosDaApi(await r.json())
}

export async function criarEvento(rasc: RascunhoEvento): Promise<Ok> {
  try {
    const p = new URLSearchParams({ conferenceDataVersion: '1', sendUpdates: rasc.convidados.length ? 'all' : 'none' })
    const r = await fetch(`${URL_EVENTOS}?${p}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${await tokenDeAcesso()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(corpoNovoEvento(rasc, randomUUID())),
      signal: AbortSignal.timeout(20_000),
    })
    return r.ok ? { ok: true } : { ok: false, erro: `O Google Agenda recusou o evento (${r.status}).` }
  } catch (e) {
    return { ok: false, erro: e instanceof SemAcesso ? e.message : 'Sem conexão com o Google.' }
  }
}
