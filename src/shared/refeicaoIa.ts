// Da frase para o rascunho da refeição: a IA separa os alimentos e quantidades; o código acha cada um
// na base (TACO + os seus) e calcula. O Paulo confere e salva; nada é salvo direto.
import { buscarAlimentos, gramasDaMedida, gramasDaMedidaMedia, type Alimento, type TipoRefeicao } from './alimentacao'

export type LinhaRascunho = { nome: string; gramas: number | null; alimento: Alimento | null; sugestoes: Alimento[]; aviso?: string }
export type RascunhoRefeicao = { tipo: TipoRefeicao; dia: string; itens: LinhaRascunho[] }

type ItemIa = { alimento?: unknown; gramas?: unknown; medida?: unknown; quantidade?: unknown; kcal_100g?: unknown; proteina_100g?: unknown; carbo_100g?: unknown; gordura_100g?: unknown }
const TIPOS = new Set(['cafe', 'almoco', 'lanche', 'jantar', 'ceia', 'livre'])
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : null)

export function tipoPelaHora(h: number): TipoRefeicao {
  if (h < 10) return 'cafe'
  if (h < 15) return 'almoco'
  if (h < 18) return 'lanche'
  if (h < 22) return 'jantar'
  return 'ceia'
}

export function montarRascunho(args: { tipo?: unknown; itens?: unknown }, base: Alimento[], dia: string, agora: Date): RascunhoRefeicao | null {
  if (!Array.isArray(args.itens) || !args.itens.length) return null
  const tipo = (TIPOS.has(args.tipo as string) ? args.tipo : tipoPelaHora(agora.getHours())) as TipoRefeicao
  const itens = (args.itens as ItemIa[]).slice(0, 20).map((it): LinhaRascunho => {
    const nome = typeof it.alimento === 'string' ? it.alimento.trim().slice(0, 80) : ''
    const sugestoes = nome ? buscarAlimentos(base, nome, 5) : []
    let alimento: Alimento | null = sugestoes[0] ?? null
    let aviso: string | undefined
    // Produto que não está na base (whey, barra de proteína): usa o rótulo que a IA estimou, marcado.
    if (!alimento && num(it.kcal_100g) !== null) {
      alimento = { id: `ia:${nome.toLowerCase()}`, nome, fonte: 'ia', kcal: num(it.kcal_100g)!, p: num(it.proteina_100g) ?? 0, c: num(it.carbo_100g) ?? 0, g: num(it.gordura_100g) ?? 0, fibra: 0 }
      aviso = 'Valores estimados pela IA. Confira no rótulo.'
    }
    let gramas = num(it.gramas)
    const qtd = num(it.quantidade) ?? 1
    if (gramas === null && alimento && typeof it.medida === 'string') gramas = gramasDaMedida(alimento, it.medida, qtd)
    if (gramas === null && alimento && typeof it.medida === 'string') {
      gramas = gramasDaMedidaMedia(it.medida, qtd, alimento)
      if (gramas !== null) aviso = aviso ?? `Usei ${gramas} g (${qtd} × ${it.medida}, medida média). Confira.`
    }
    if (gramas === null && typeof it.medida === 'string') aviso = aviso ?? `Quantos gramas é "${qtd} ${it.medida}"?`
    if (!alimento) aviso = 'Não achei na tabela. Escolha o alimento.'
    return { nome, gramas: gramas !== null ? Math.round(gramas) : null, alimento, sugestoes, aviso }
  })
  return { tipo, dia, itens: itens.filter((i) => i.nome) }
}
