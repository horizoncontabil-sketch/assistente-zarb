// Google Agenda: só a agenda principal, permissão de eventos.
import type { Evento, RascunhoEvento } from './tipos'

export const ESCOPOS = ['openid', 'email', 'https://www.googleapis.com/auth/calendar.events']
export const URL_AUTORIZAR = 'https://accounts.google.com/o/oauth2/v2/auth'
export const URL_TOKEN = 'https://oauth2.googleapis.com/token'
export const URL_EVENTOS = 'https://www.googleapis.com/calendar/v3/calendars/primary/events'

export function urlDeAutorizacao(clientId: string, redirect: string, desafio: string, estado: string): string {
  const p = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirect,
    response_type: 'code',
    scope: ESCOPOS.join(' '),
    code_challenge: desafio,
    code_challenge_method: 'S256',
    state: estado,
    access_type: 'offline',
    prompt: 'consent',
  })
  return `${URL_AUTORIZAR}?${p}`
}

type EventoApi = {
  id?: string
  status?: string
  summary?: string
  start?: { dateTime?: string; date?: string }
  end?: { dateTime?: string; date?: string }
  location?: string
  hangoutLink?: string
  htmlLink?: string
  conferenceData?: { entryPoints?: { entryPointType?: string; uri?: string }[] }
  attendees?: { self?: boolean; responseStatus?: string }[]
}

export function eventoDaApi(e: EventoApi): Evento | null {
  if (!e?.id || e.status === 'cancelled') return null
  // Convite recusado não aparece no dia.
  if (e.attendees?.some((a) => a.self && a.responseStatus === 'declined')) return null
  const inicio = e.start?.dateTime ?? e.start?.date
  const fim = e.end?.dateTime ?? e.end?.date
  if (!inicio || !fim) return null
  const meet = e.hangoutLink ?? e.conferenceData?.entryPoints?.find((p) => p.entryPointType === 'video')?.uri ?? null
  return {
    id: e.id,
    titulo: e.summary?.trim() || '(sem título)',
    inicio,
    fim,
    diaInteiro: !e.start?.dateTime,
    local: e.location?.trim() || null,
    meet: meet && meet.startsWith('https://') ? meet : null,
    link: e.htmlLink?.startsWith('https://') ? e.htmlLink : null,
  }
}

export function eventosDaApi(json: unknown): Evento[] {
  const itens = (json as { items?: unknown })?.items
  return Array.isArray(itens) ? itens.map((i) => eventoDaApi(i as EventoApi)).filter((e): e is Evento => !!e) : []
}

export function corpoNovoEvento(r: RascunhoEvento, idPedido: string) {
  const inicio = new Date(r.inicio)
  const fim = new Date(inicio.getTime() + r.duracaoMin * 60_000)
  return {
    summary: r.titulo,
    start: { dateTime: inicio.toISOString() },
    end: { dateTime: fim.toISOString() },
    ...(r.convidados.length ? { attendees: r.convidados.map((email) => ({ email })) } : {}),
    ...(r.comMeet ? { conferenceData: { createRequest: { requestId: idPedido, conferenceSolutionKey: { type: 'hangoutsMeet' } } } } : {}),
    reminders: { useDefault: true },
  }
}

// Avisos de reunião em marcos (ex.: 10 min antes e 1 min antes). Cada marco avisa uma vez;
// se o PC ligou já perto da hora, avisa só o marco mais próximo e dá os outros por avisados.
export function eventosParaAvisar(eventos: Evento[], agora: Date, marcos: number[], avisados: Set<string>) {
  const saida: { e: Evento; min: number; marco: number; chaves: string[] }[] = []
  for (const e of eventos) {
    if (e.diaInteiro) continue
    const min = Math.round((new Date(e.inicio).getTime() - agora.getTime()) / 60_000)
    if (min < 0) continue
    const atingidos = marcos.filter((m) => min <= m)
    if (!atingidos.length) continue
    const marco = Math.min(...atingidos)
    const chave = `${e.id}@${e.inicio}@${marco}`
    if (avisados.has(chave)) continue
    saida.push({ e, min, marco, chaves: atingidos.map((m) => `${e.id}@${e.inicio}@${m}`) })
  }
  return saida
}

// Ordena e separa o que é do dia (inclusive dia inteiro).
export function eventosDoDia(eventos: Evento[], dia: Date): Evento[] {
  const ini = new Date(dia.getFullYear(), dia.getMonth(), dia.getDate()).getTime()
  const fim = ini + 86_400_000
  return eventos
    .filter((e) => {
      const i = e.diaInteiro ? new Date(e.inicio + 'T00:00:00').getTime() : new Date(e.inicio).getTime()
      const f = e.diaInteiro ? new Date(e.fim + 'T00:00:00').getTime() : new Date(e.fim).getTime()
      return i < fim && f > ini
    })
    .sort((a, b) => (a.diaInteiro === b.diaInteiro ? a.inicio.localeCompare(b.inicio) : a.diaInteiro ? -1 : 1))
}
