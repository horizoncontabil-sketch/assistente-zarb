import * as config from './config'
import { corpoDoPedido, erroDaGroq, GROQ_AUDIO, GROQ_CHAT, lerResposta, MODELO_AUDIO, textoTranscrito, type Chamada } from '../shared/groq'
import type { Mensagem } from '../shared/tipos'

type Falha = { ok: false; erro: string }
const SEM_CHAVE: Falha = { ok: false, erro: 'Falta a chave da Groq. Coloque em Configurações.' }

function chave(): string | null {
  return config.decifrar(config.ler().groqCifrada)
}

export async function perguntar(
  sistema: string,
  historico: Mensagem[],
  texto: string,
): Promise<{ ok: true; texto: string | null; chamadas: Chamada[] } | Falha> {
  const k = chave()
  if (!k) return SEM_CHAVE
  try {
    const r = await fetch(GROQ_CHAT, {
      method: 'POST',
      headers: { Authorization: `Bearer ${k}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(corpoDoPedido(config.ler().modelo, sistema, historico, texto)),
      signal: AbortSignal.timeout(30_000),
    })
    if (!r.ok) return { ok: false, erro: erroDaGroq(r.status) }
    return { ok: true, ...lerResposta(await r.json()) }
  } catch {
    return { ok: false, erro: 'Sem conexão com a Groq. Confira a internet.' }
  }
}

export async function transcrever(audio: Uint8Array): Promise<{ ok: true; texto: string } | Falha> {
  const k = chave()
  if (!k) return SEM_CHAVE
  const form = new FormData()
  form.append('file', new Blob([new Uint8Array(audio)], { type: 'audio/webm' }), 'fala.webm')
  form.append('model', MODELO_AUDIO)
  form.append('language', 'pt')
  form.append('response_format', 'json')
  try {
    const r = await fetch(GROQ_AUDIO, { method: 'POST', headers: { Authorization: `Bearer ${k}` }, body: form, signal: AbortSignal.timeout(30_000) })
    if (!r.ok) return { ok: false, erro: erroDaGroq(r.status) }
    const texto = textoTranscrito(await r.json())
    return texto ? { ok: true, texto } : { ok: false, erro: 'Não ouvi nada. Tente de novo.' }
  } catch {
    return { ok: false, erro: 'Sem conexão com a Groq. Confira a internet.' }
  }
}
