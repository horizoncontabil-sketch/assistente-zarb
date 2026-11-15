// Alimentação com contagem completa: base TACO (por 100 g) + alimentos e receitas do Paulo.
import taco from './dados/taco.json'
import { normalizar } from './comandos'

export type Nutrientes = { kcal: number; p: number; c: number; g: number; fibra: number }
export type Medida = { medida: string; gramas: number }
export type Alimento = Nutrientes & { id: string; nome: string; fonte: 'taco' | 'meu' | 'ia'; categoria?: string; medidas?: Medida[] }
export type ItemRefeicao = Nutrientes & { alimentoId: string; nome: string; gramas: number }
export type TipoRefeicao = 'cafe' | 'almoco' | 'lanche' | 'jantar' | 'ceia' | 'livre'
export type Refeicao = { id: string; dia: string; tipo: TipoRefeicao; itens: ItemRefeicao[]; em: string }
export type Receita = { id: string; nome: string; itens: { alimentoId: string; gramas: number }[] }

export const TIPOS: { id: TipoRefeicao; nome: string }[] = [
  { id: 'cafe', nome: 'Café da manhã' },
  { id: 'almoco', nome: 'Almoço' },
  { id: 'lanche', nome: 'Lanche' },
  { id: 'jantar', nome: 'Jantar' },
  { id: 'ceia', nome: 'Ceia' },
  { id: 'livre', nome: 'Refeição livre' },
]

type LinhaTaco = { id: number; nome: string; categoria: string; kcal: number | null; p: number | null; c: number | null; g: number | null; fibra: number | null; medidas?: Medida[] }
export const FONTE_TACO = (taco as { fonte: string }).fonte

export const ALIMENTOS_TACO: Alimento[] = (taco as { alimentos: LinhaTaco[] }).alimentos
  .filter((a) => a.kcal != null)
  .map((a) => ({ id: `taco:${a.id}`, nome: a.nome, categoria: a.categoria, fonte: 'taco', kcal: a.kcal ?? 0, p: a.p ?? 0, c: a.c ?? 0, g: a.g ?? 0, fibra: a.fibra ?? 0, medidas: a.medidas }))

const PREPARADO = /\b(cozid[oa]|grelhad[oa]|assad[oa]|refogad[oa]|frit[oa])\b/

// Busca tolerante: todas as palavras precisam aparecer; ganha quem começa igual, quem é pronto para
// comer (cozido, grelhado) quando a pessoa não disse "cru", e o nome mais curto.
// Como se fala x como está na TACO.
const SINONIMOS: Record<string, string> = { branco: 'tipo 1', branca: 'tipo 1', comum: 'tipo 1', parboilizado: 'tipo 2' }

export function buscarAlimentos(lista: Alimento[], termo: string, limite = 8): Alimento[] {
  const todas = normalizar(termo)
    .split(' ')
    .filter((p) => p.length > 1 && !['de', 'do', 'da', 'com', 'e', 'sem'].includes(p))
    .flatMap((p) => (SINONIMOS[p] ?? p).split(' '))
    .filter((p) => p.length > 1)
  // Palavra que não aparece em nenhum alimento ("caseiro", "temperado") não pode zerar a busca.
  const palavras = todas.filter((p) => lista.some((a) => normalizar(a.nome).includes(p.replace(/s$/, ''))))
  if (!palavras.length) return []
  const pediuCru = palavras.includes('cru') || palavras.includes('crua')
  const pontos = (a: Alimento) => {
    const n = normalizar(a.nome)
    const radicais = palavras.map((p) => p.replace(/s$/, ''))
    if (!radicais.every((p) => n.includes(p))) return -1
    let s = 0
    if (n.startsWith(radicais[0])) s += 30
    if (a.fonte === 'meu') s += 40
    if (!pediuCru && PREPARADO.test(n)) s += 15
    if (!pediuCru && /\bcru[a]?\b/.test(n)) s -= 10
    return s - n.length / 10
  }
  return lista
    .map((a) => ({ a, s: pontos(a) }))
    .filter((x) => x.s >= 0)
    .sort((x, y) => y.s - x.s)
    .slice(0, limite)
    .map((x) => x.a)
}

const r1 = (n: number) => Math.round(n * 10) / 10

export function item(a: Alimento, gramas: number): ItemRefeicao {
  const f = gramas / 100
  return { alimentoId: a.id, nome: a.nome, gramas: Math.round(gramas), kcal: Math.round(a.kcal * f), p: r1(a.p * f), c: r1(a.c * f), g: r1(a.g * f), fibra: r1(a.fibra * f) }
}

export function somar(itens: Nutrientes[]): Nutrientes {
  const t = itens.reduce((s, i) => ({ kcal: s.kcal + i.kcal, p: s.p + i.p, c: s.c + i.c, g: s.g + i.g, fibra: s.fibra + i.fibra }), { kcal: 0, p: 0, c: 0, g: 0, fibra: 0 })
  return { kcal: Math.round(t.kcal), p: r1(t.p), c: r1(t.c), g: r1(t.g), fibra: r1(t.fibra) }
}

export const totaisDoDia = (refeicoes: Refeicao[], dia: string) => somar(refeicoes.filter((r) => r.dia === dia).flatMap((r) => r.itens))

// "2 colheres de sopa", "1 concha": acha a medida caseira do alimento e devolve os gramas.
const singular = (t: string) =>
  normalizar(t)
    .split(' ')
    .map((w) => (w.endsWith('res') || w.endsWith('oes') ? w.slice(0, -2) : w.endsWith('s') ? w.slice(0, -1) : w))
    .join(' ')

const acharMedida = (medidas: { medida: string; gramas: number }[] | undefined, m: string) => medidas?.find((x) => singular(x.medida).startsWith(m) || m.startsWith(singular(x.medida)))

// Medidas médias para quando o alimento não tem as dele na tabela (a POF não cobre todos).
const MEDIAS = [
  { medida: 'concha', gramas: 100 },
  { medida: 'colher de sopa', gramas: 25 },
  { medida: 'colher de servir', gramas: 45 },
  { medida: 'escumadeira', gramas: 85 },
  { medida: 'xicara', gramas: 160 },
  { medida: 'copo', gramas: 200 },
]

export function gramasDaMedida(a: Alimento, medida: string, quantidade: number): number | null {
  const achada = acharMedida(a.medidas, singular(medida))
  return achada ? Math.round(achada.gramas * quantidade) : null
}

// Peso médio de uma unidade dos alimentos que se contam por unidade.
const UNIDADES: [RegExp, number][] = [
  [/^ovo/, 50],
  [/^pao trigo frances/, 50],
  [/^pao trigo forma/, 25],
  [/^banana/, 70],
  [/^maca/, 130],
  [/^laranja/, 180],
  [/^tangerina/, 135],
]

// Medida média, usada só com aviso para o Paulo conferir.
export function gramasDaMedidaMedia(medida: string, quantidade: number, a?: Alimento): number | null {
  const m = singular(medida)
  if (a && /^(unidade|fatia|un)\b/.test(m)) {
    const u = UNIDADES.find(([r]) => r.test(normalizar(a.nome)))
    if (u) return Math.round(u[1] * quantidade)
  }
  const achada = acharMedida(MEDIAS, m)
  return achada ? Math.round(achada.gramas * quantidade) : null
}

// Dia "na meta": calorias até 5% acima da meta e pelo menos 90% da proteína.
export function diaNaMeta(t: Nutrientes, meta: { kcal: number; proteina: number }): boolean {
  return t.kcal > 0 && t.kcal <= meta.kcal * 1.05 && t.p >= meta.proteina * 0.9
}
