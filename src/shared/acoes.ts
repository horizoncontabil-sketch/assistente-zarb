// Ferramentas que a IA pode pedir. Lista fechada: o código confere cada pedido antes de fazer.
import { validarQuando } from './datas'
import { acharAtalho, normalizar } from './comandos'
import { tipoDoDestino } from './destino'
import type { Atalho, PastaClaude, RascunhoEvento, Repetir, Tarefa } from './tipos'

const texto = (descricao: string) => ({ type: 'string', description: descricao })

export const FERRAMENTAS = [
  {
    name: 'criar_lembrete',
    description: 'Cria um lembrete com horário (avisa na hora). Use para "me lembra", "me avisa", timers ("daqui a 10 min").',
    parameters: {
      type: 'object',
      properties: {
        titulo: texto('O que lembrar, curto, começando com verbo. Ex.: "Ligar para a Costare".'),
        quando: texto('Data e hora no formato ISO 8601 com fuso, ex.: 2026-11-16T09:00:00-03:00'),
        repetir: { type: 'string', enum: ['nao', 'diario', 'dias_uteis', 'semanal', 'mensal'] },
      },
      required: ['titulo', 'quando'],
    },
  },
  {
    name: 'criar_tarefa',
    description: 'Cria uma tarefa sem horário (lista de pendências).',
    parameters: { type: 'object', properties: { titulo: texto('A tarefa, curta.') }, required: ['titulo'] },
  },
  {
    name: 'concluir_tarefa',
    description: 'Marca como feita uma tarefa ou lembrete pendente, pelo título.',
    parameters: { type: 'object', properties: { titulo: texto('Título ou parte do título.') }, required: ['titulo'] },
  },
  {
    name: 'resumo_do_dia',
    description: 'Mostra a agenda, os lembretes e as tarefas de hoje.',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'abrir_atalho',
    description: 'Abre um dos atalhos cadastrados (site, pasta ou programa) pelo nome.',
    parameters: { type: 'object', properties: { nome: texto('Nome do atalho, da lista.') }, required: ['nome'] },
  },
  {
    name: 'criar_evento',
    description: 'Prepara um evento no Google Agenda (reunião, call, compromisso com hora). O Paulo confirma antes de criar.',
    parameters: {
      type: 'object',
      properties: {
        titulo: texto('Título do evento.'),
        inicio: texto('Início em ISO 8601 com fuso.'),
        duracao_min: { type: 'integer', description: 'Duração em minutos. Padrão 30.' },
        convidados: { type: 'array', items: { type: 'string' }, description: 'E-mails, só se o Paulo disser.' },
        com_meet: { type: 'boolean', description: 'Criar link do Meet. Padrão: sim para reunião ou call.' },
      },
      required: ['titulo', 'inicio'],
    },
  },
  {
    name: 'pedir_claude_code',
    description: 'Prepara um pedido para o Claude Code. O Paulo revisa e manda.',
    parameters: {
      type: 'object',
      properties: {
        pedido: texto('O pedido, claro e completo, em português.'),
        pasta: texto('Nome da pasta/projeto da lista, se o Paulo disse.'),
      },
      required: ['pedido'],
    },
  },
  {
    name: 'ensinar_atalho',
    description: 'Prepara um atalho novo (nome falado -> site https ou caminho do Windows). O Paulo confirma.',
    parameters: {
      type: 'object',
      properties: { nome: texto('Como o Paulo vai chamar.'), destino: texto('URL https:// ou caminho C:\\...') },
      required: ['nome', 'destino'],
    },
  },
] as const

export type Acao =
  | { tipo: 'criar_tarefa'; titulo: string; quando: string | null; repetir: Repetir }
  | { tipo: 'concluir'; tarefa: Tarefa }
  | { tipo: 'hoje' }
  | { tipo: 'abrir'; atalho: Atalho }
  | { tipo: 'evento'; rascunho: RascunhoEvento }
  | { tipo: 'claude'; pedido: string; pastaId: string | null }
  | { tipo: 'ensinar'; nome: string; destino: string }

export type Contexto = { agora: Date; atalhos: Atalho[]; pastas: PastaClaude[]; tarefas: Tarefa[] }

type Resultado = { ok: true; acao: Acao } | { ok: false; erro: string }

const str = (v: unknown, max = 300) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null)
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function validarAcao(nome: string, argsJson: string, ctx: Contexto): Resultado {
  let a: Record<string, unknown>
  try {
    a = argsJson ? JSON.parse(argsJson) : {}
    if (!a || typeof a !== 'object') throw new Error()
  } catch {
    return { ok: false, erro: 'Não entendi o pedido.' }
  }
  switch (nome) {
    case 'criar_lembrete': {
      const titulo = str(a.titulo, 200)
      if (!titulo) return { ok: false, erro: 'Faltou dizer do que lembrar.' }
      const q = validarQuando(a.quando, ctx.agora)
      if (!q.ok) return q
      const r = a.repetir
      const repetir: Repetir = r === 'diario' || r === 'dias_uteis' || r === 'semanal' || r === 'mensal' ? r : null
      return { ok: true, acao: { tipo: 'criar_tarefa', titulo, quando: String(a.quando), repetir } }
    }
    case 'criar_tarefa': {
      const titulo = str(a.titulo, 200)
      return titulo ? { ok: true, acao: { tipo: 'criar_tarefa', titulo, quando: null, repetir: null } } : { ok: false, erro: 'Faltou a tarefa.' }
    }
    case 'concluir_tarefa': {
      const t = normalizar(str(a.titulo) ?? '')
      const pendentes = ctx.tarefas.filter((x) => !x.feita && t && normalizar(x.titulo).includes(t))
      if (pendentes.length === 1) return { ok: true, acao: { tipo: 'concluir', tarefa: pendentes[0] } }
      return { ok: false, erro: pendentes.length ? 'Achei mais de uma tarefa com esse nome. Marque na lista.' : 'Não achei essa tarefa pendente.' }
    }
    case 'resumo_do_dia':
      return { ok: true, acao: { tipo: 'hoje' } }
    case 'abrir_atalho': {
      const atalho = acharAtalho(str(a.nome) ?? '', ctx.atalhos)
      return atalho ? { ok: true, acao: { tipo: 'abrir', atalho } } : { ok: false, erro: `Não tenho atalho "${str(a.nome) ?? ''}". Cadastre na aba Atalhos.` }
    }
    case 'criar_evento': {
      const titulo = str(a.titulo, 200)
      if (!titulo) return { ok: false, erro: 'Faltou o título do evento.' }
      const q = validarQuando(a.inicio, ctx.agora)
      if (!q.ok) return q
      const d = Number(a.duracao_min)
      const duracaoMin = Number.isInteger(d) && d >= 5 && d <= 720 ? d : 30
      const convidados = Array.isArray(a.convidados)
        ? a.convidados.filter((e): e is string => typeof e === 'string' && EMAIL.test(e.trim())).map((e) => e.trim()).slice(0, 20)
        : []
      const comMeet = typeof a.com_meet === 'boolean' ? a.com_meet : /reuni|call|meet|conversa/i.test(titulo)
      return { ok: true, acao: { tipo: 'evento', rascunho: { titulo, inicio: String(a.inicio), duracaoMin, convidados, comMeet } } }
    }
    case 'pedir_claude_code': {
      const pedido = str(a.pedido, 4000)
      if (!pedido) return { ok: false, erro: 'Faltou o pedido para o Claude Code.' }
      const nomePasta = normalizar(str(a.pasta) ?? '')
      const pasta = nomePasta ? ctx.pastas.find((p) => normalizar(p.nome).includes(nomePasta) || nomePasta.includes(normalizar(p.nome))) : null
      return { ok: true, acao: { tipo: 'claude', pedido, pastaId: pasta?.id ?? (ctx.pastas.length === 1 ? ctx.pastas[0].id : null) } }
    }
    case 'ensinar_atalho': {
      const nomeAt = str(a.nome, 80)
      const destino = str(a.destino, 2000)
      if (!nomeAt || !destino || !tipoDoDestino(destino)) return { ok: false, erro: 'O atalho precisa de um nome e de um link https:// ou caminho do Windows.' }
      return { ok: true, acao: { tipo: 'ensinar', nome: nomeAt, destino } }
    }
    default:
      return { ok: false, erro: 'Pedido fora do que eu sei fazer.' }
  }
}
