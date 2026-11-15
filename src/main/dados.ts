// Tarefas, atalhos, cópias e a agenda guardada: estado em memória + arquivo JSON no PC.
import { randomUUID } from 'node:crypto'
import { gravarJson, lerJson } from './armazem'
import { adicionarCopia, podar } from '../shared/copias'
import { limparAntigas, ordenar } from '../shared/tarefas'
import type { Atalho, Copia, Evento, Tarefa } from '../shared/tipos'

const OS = 'https://os.zarbmedia.com.br'
const ATALHOS_INICIAIS: [string, string][] = [
  ['Zarb OS', OS],
  ['Início', `${OS}/inicio`],
  ['Carteira', `${OS}/clientes`],
  ['Contas de anúncio', `${OS}/conexoes`],
  ['Health Score', `${OS}/health-score`],
  ['Sinais', `${OS}/sinais`],
  ['Indicadores de CS', `${OS}/indicadores-cs`],
  ['Renovação', `${OS}/renovacao`],
  ['Check-in', `${OS}/check-in`],
  ['Documentos', `${OS}/documentos`],
  ['Equipe', `${OS}/equipe`],
  ['Monday', 'https://monday.com'],
  ['Gerenciador de anúncios', 'https://adsmanager.facebook.com'],
  ['Google Drive', 'https://drive.google.com'],
  ['Google Agenda', 'https://calendar.google.com'],
  ['Gmail', 'https://mail.google.com'],
  ['WhatsApp', 'https://web.whatsapp.com'],
  ['Vercel', 'https://vercel.com/dashboard'],
  ['Supabase', 'https://supabase.com/dashboard'],
  ['Fly', 'https://fly.io/dashboard'],
  ['Claude', 'https://claude.ai'],
]

let tarefas: Tarefa[] = ordenar(limparAntigas(lerJson<Tarefa[]>('tarefas', []), new Date()))
let atalhos: Atalho[] = lerJson<Atalho[] | null>('atalhos', null) ?? ATALHOS_INICIAIS.map(([nome, destino]) => ({ id: randomUUID(), nome, destino, tipo: 'site' as const }))
let copias: Copia[] = podar(lerJson<Copia[]>('copias', []), new Date())
let agenda = lerJson<{ eventos: Evento[]; lidoEm: string | null }>('agenda', { eventos: [], lidoEm: null })

export const ler = {
  tarefas: () => tarefas,
  atalhos: () => atalhos,
  copias: () => copias,
  agenda: () => agenda,
}

export function mudarTarefas(f: (t: Tarefa[]) => Tarefa[]) {
  tarefas = ordenar(f(tarefas))
  gravarJson('tarefas', tarefas)
}

export function mudarAtalhos(f: (a: Atalho[]) => Atalho[]) {
  atalhos = f(atalhos).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
  gravarJson('atalhos', atalhos)
}

export function mudarCopias(f: (c: Copia[]) => Copia[]) {
  copias = f(copias)
  gravarJson('copias', copias)
}

export function novaCopia(texto: string) {
  const antes = copias
  copias = adicionarCopia(copias, texto, randomUUID(), new Date())
  if (copias !== antes) gravarJson('copias', copias)
  return copias !== antes
}

export function gravarAgenda(eventos: Evento[]) {
  agenda = { eventos, lidoEm: new Date().toISOString() }
  gravarJson('agenda', agenda)
}

export function limparAgenda() {
  agenda = { eventos: [], lidoEm: null }
  gravarJson('agenda', agenda)
}
