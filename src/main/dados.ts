// Tarefas, atalhos, cópias e a agenda guardada: estado em memória + arquivo JSON no PC.
import { randomUUID } from 'node:crypto'
import { gravarJson, lerJson } from './armazem'
import { colecao, colecaoMapeada, db, deu } from './nuvem'
import { adicionarCopia, podar } from '../shared/copias'
import { limparAntigas, ordenar } from '../shared/tarefas'
import type { Habito } from '../shared/habitos'
import type { Alimento, Receita, Refeicao } from '../shared/alimentacao'
import type { Plano, RegistroCorpo } from '../shared/plano'
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
let habitos: Habito[] = lerJson<Habito[]>('habitos', [])
let avisosHabitos: Record<string, string> = lerJson<Record<string, string>>('avisos-habitos', {})
// Saúde: só no PC. Nada disso vai para o código nem para fora, a não ser o que o Paulo fala com a IA.
let plano: Plano | null = lerJson<Plano | null>('plano', null)
let corpo: RegistroCorpo[] = lerJson<RegistroCorpo[]>('corpo', [])
let refeicoes: Refeicao[] = lerJson<Refeicao[]>('refeicoes', [])
let receitas: Receita[] = lerJson<Receita[]>('receitas', [])
let alimentosMeus: Alimento[] = lerJson<Alimento[]>('alimentos-meus', [])
let agenda = lerJson<{ eventos: Evento[]; lidoEm: string | null }>('agenda', { eventos: [], lidoEm: null })

export const ler = {
  tarefas: () => tarefas,
  atalhos: () => atalhos,
  copias: () => copias,
  agenda: () => agenda,
  habitos: () => habitos,
  plano: () => plano,
  corpo: () => corpo,
  refeicoes: () => refeicoes,
  receitas: () => receitas,
  alimentosMeus: () => alimentosMeus,
  avisosHabitos: () => avisosHabitos,
}

const nuvemTarefas = colecao<Tarefa>('tarefas', 'tarefas')
const nuvemHabitos = colecao<Habito>('habitos', 'habitos')

export function mudarHabitos(f: (h: Habito[]) => Habito[]) {
  const antes = habitos
  habitos = f(habitos)
  gravarJson('habitos', habitos)
  nuvemHabitos.mudou(antes, habitos)
}

export function marcarAvisoHabito(id: string, em: Date) {
  avisosHabitos = { ...avisosHabitos, [id]: em.toISOString() }
  gravarJson('avisos-habitos', avisosHabitos)
}

export function mudarTarefas(f: (t: Tarefa[]) => Tarefa[]) {
  const antes = tarefas
  tarefas = ordenar(f(tarefas))
  gravarJson('tarefas', tarefas)
  nuvemTarefas.mudou(antes, tarefas)
}

// Primeira conexão com a nuvem: o que está no PC sobe (sem passar por cima do que já está lá).
export function subirTudo() {
  nuvemTarefas.subirTudo(tarefas)
  nuvemHabitos.subirTudo(habitos)
}

export function subirSaude() {
  nuvemRefeicoes.subirTudo(refeicoes)
  nuvemCorpo.subirTudo(corpoComId(corpo))
  nuvemReceitas.subirTudo(receitas)
  nuvemAlimentos.subirTudo(alimentosMeus)
  if (plano) nuvemPlano.subirTudo([{ ...plano, id: 'plano' }])
}

// ----- comida e corpo iguais no celular -----
type RefeicaoNuvem = Refeicao & { nome?: string | null }
const nuvemRefeicoes = colecaoMapeada<RefeicaoNuvem>('refeicoes', {
  ler: async () => {
    const r = await db.from('refeicoes').select('id,dia,tipo,nome,itens,criado_em')
    return r.error ? null : (r.data ?? []).map((x) => ({ id: x.id, dia: x.dia, tipo: x.tipo, nome: x.nome, itens: x.itens, em: x.criado_em }))
  },
  gravar: async (x) => deu(await db.from('refeicoes').upsert({ id: x.id, dia: x.dia, tipo: x.tipo, nome: x.nome ?? null, itens: x.itens, criado_em: x.em })),
  apagar: async (id) => deu(await db.from('refeicoes').delete().eq('id', id)),
})
type CorpoNuvem = RegistroCorpo & { id: string }
const corpoComId = (l: RegistroCorpo[]): CorpoNuvem[] => l.map((c) => ({ ...c, id: c.dia }))
const semId = (l: CorpoNuvem[]): RegistroCorpo[] =>
  l.map((c) => {
    const { id: _id, ...resto } = c
    return resto
  }).sort((a, b) => a.dia.localeCompare(b.dia))
const COLUNAS_CORPO = 'dia,peso,abdomen,gordura,musculo,visceral,pressao_sis,pressao_dia,treino'
const nuvemCorpo = colecaoMapeada<CorpoNuvem>('corpo', {
  ler: async () => {
    const r = await db.from('dias').select(COLUNAS_CORPO)
    if (r.error) return null
    const n = (v: unknown) => (v == null ? undefined : Number(v))
    return (r.data ?? [])
      .map((x) => {
        const c: CorpoNuvem = { id: x.dia, dia: x.dia, peso: n(x.peso), abdomen: n(x.abdomen), gordura: n(x.gordura), musculo: n(x.musculo), visceral: n(x.visceral), pressaoSis: n(x.pressao_sis), pressaoDia: n(x.pressao_dia), treino: x.treino ?? undefined }
        for (const k of Object.keys(c) as (keyof CorpoNuvem)[]) if (c[k] === undefined) delete c[k]
        return c
      })
      .filter((c) => Object.keys(c).length > 2)
  },
  // Só as colunas do corpo: passos e sono do mesmo dia (vindos do celular) ficam como estão.
  gravar: async (c) =>
    deu(await db.from('dias').upsert({ dia: c.dia, peso: c.peso ?? null, abdomen: c.abdomen ?? null, gordura: c.gordura ?? null, musculo: c.musculo ?? null, visceral: c.visceral ?? null, pressao_sis: c.pressaoSis ?? null, pressao_dia: c.pressaoDia ?? null, treino: c.treino ?? null }, { onConflict: 'dono,dia' })),
  apagar: async (dia) => deu(await db.from('dias').update({ peso: null, abdomen: null, gordura: null, musculo: null, visceral: null, pressao_sis: null, pressao_dia: null, treino: null }).eq('dia', dia)),
})
const nuvemReceitas = colecao<Receita>('receitas', 'receitas')
const nuvemAlimentos = colecao<Alimento>('alimentos_meus', 'alimentos-meus')
const nuvemPlano = colecao<Plano & { id: string }>('plano', 'plano')

// Traz o que mudou no celular. Devolve o que trocou, para avisar a tela.
export async function puxarNuvem(): Promise<('tarefas' | 'habitos' | 'saude')[]> {
  const mudou: ('tarefas' | 'habitos' | 'saude')[] = []
  const igual = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)
  let saude = false
  const rf = await nuvemRefeicoes.puxar()
  const ordemR = (l: Refeicao[]) => [...l].sort((a, b) => a.em.localeCompare(b.em))
  if (rf && !igual(ordemR(rf), ordemR(refeicoes))) {
    refeicoes = ordemR(rf)
    gravarJson('refeicoes', refeicoes)
    saude = true
  }
  const co = await nuvemCorpo.puxar()
  if (co && !igual(semId(co), corpo)) {
    corpo = semId(co)
    gravarJson('corpo', corpo)
    saude = true
  }
  const ordemN = <T extends { nome: string }>(l: T[]) => [...l].sort((a, b) => a.nome.localeCompare(b.nome))
  const rc = await nuvemReceitas.puxar()
  if (rc && !igual(ordemN(rc), ordemN(receitas))) {
    receitas = ordemN(rc)
    gravarJson('receitas', receitas)
    saude = true
  }
  const al = await nuvemAlimentos.puxar()
  if (al && !igual(ordemN(al), ordemN(alimentosMeus))) {
    alimentosMeus = ordemN(al)
    gravarJson('alimentos-meus', alimentosMeus)
    saude = true
  }
  const pl = await nuvemPlano.puxar()
  if (pl) {
    let novo: Plano | null = null
    if (pl[0]) {
      const { id: _id, ...p } = pl[0]
      novo = p
    }
    if (!igual(novo, plano)) {
      plano = novo
      gravarJson('plano', plano)
      saude = true
    }
  }
  if (saude) mudou.push('saude')
  const t = await nuvemTarefas.puxar()
  if (t && JSON.stringify(ordenar(t)) !== JSON.stringify(tarefas)) {
    tarefas = ordenar(t)
    gravarJson('tarefas', tarefas)
    mudou.push('tarefas')
  }
  const h = await nuvemHabitos.puxar()
  const ordemH = (l: Habito[]) => [...l].sort((a, b) => a.criadoEm.localeCompare(b.criadoEm))
  if (h && JSON.stringify(ordemH(h)) !== JSON.stringify(ordemH(habitos))) {
    habitos = ordemH(h)
    gravarJson('habitos', habitos)
    mudou.push('habitos')
  }
  return mudou
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

export function gravarPlano(p: Plano | null) {
  const antes = plano
  plano = p
  gravarJson('plano', p)
  nuvemPlano.mudou(antes ? [{ ...antes, id: 'plano' }] : [], p ? [{ ...p, id: 'plano' }] : [])
}

// Um registro por dia: o novo junta com o que já havia no dia.
export function registrarCorpo(r: RegistroCorpo) {
  const antes = corpo.find((x) => x.dia === r.dia)
  const velho = corpo
  corpo = [...corpo.filter((x) => x.dia !== r.dia), { ...antes, ...r }].sort((a, b) => a.dia.localeCompare(b.dia))
  gravarJson('corpo', corpo)
  nuvemCorpo.mudou(corpoComId(velho), corpoComId(corpo))
  return antes ?? null
}

export function trocarCorpoDoDia(dia: string, r: RegistroCorpo | null) {
  const velho = corpo
  corpo = [...corpo.filter((x) => x.dia !== dia), ...(r ? [r] : [])].sort((a, b) => a.dia.localeCompare(b.dia))
  gravarJson('corpo', corpo)
  nuvemCorpo.mudou(corpoComId(velho), corpoComId(corpo))
}

export function mudarRefeicoes(f: (r: Refeicao[]) => Refeicao[]) {
  const antes = refeicoes
  refeicoes = f(refeicoes)
  gravarJson('refeicoes', refeicoes)
  nuvemRefeicoes.mudou(antes, refeicoes)
}

export function mudarReceitas(f: (r: Receita[]) => Receita[]) {
  const antes = receitas
  receitas = f(receitas)
  gravarJson('receitas', receitas)
  nuvemReceitas.mudou(antes, receitas)
}

export function mudarAlimentosMeus(f: (a: Alimento[]) => Alimento[]) {
  const antes = alimentosMeus
  alimentosMeus = f(alimentosMeus)
  gravarJson('alimentos-meus', alimentosMeus)
  nuvemAlimentos.mudou(antes, alimentosMeus)
}
