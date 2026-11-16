// Acesso ao banco (Supabase pessoal do Paulo). A chave publicável é pública por natureza; quem protege
// os dados são as regras do banco (cada linha só do dono) e o cadastro fechado para um e-mail só.
import { createClient } from '@supabase/supabase-js'
import type { ItemRefeicao, TipoRefeicao } from '../../src/shared/alimentacao'

export const supabase = createClient('https://xbqfrjgvevpuiybsvdco.supabase.co', 'sb_publishable_QCQmEl6TGbLXHQgb9ze6bA_ilCkmnks', {
  auth: { persistSession: true, autoRefreshToken: true },
})

export type Refeicao = { id: string; dia: string; tipo: TipoRefeicao; nome: string | null; itens: ItemRefeicao[]; criado_em: string }
export type RefeicaoSalva = { id: string; nome: string; itens: ItemRefeicao[]; ordem: number }
export type Serie = { id: string; dia: string; treino: string; exercicio: string; numero: number; aquecimento: boolean; kg: number | null; reps: number | null }
export type Dia = { dia: string; peso: number | null; passos: number | null; deitou?: string | null; acordou?: string | null }

export const diaIso = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

export function erroLegivel(e: unknown): string {
  const m = (e as { message?: string })?.message ?? ''
  if (/fetch|network|Failed/i.test(m)) return 'Sem internet. Tente de novo quando a conexão voltar.'
  if (/Invalid login/i.test(m)) return 'E-mail ou senha não conferem.'
  if (/Email not confirmed/i.test(m)) return 'Falta confirmar o e-mail: abra o link que chegou na sua caixa.'
  if (/Cadastro fechado|Database error saving new user/i.test(m)) return 'Este e-mail não tem acesso.'
  return 'Não deu certo. Tente de novo.'
}

async function ok<T>(p: PromiseLike<{ data: T | null; error: unknown }>): Promise<T> {
  const { data, error } = await p
  if (error) throw error
  return data as T
}

export const lerRefeicoes = (dia: string) => ok<Refeicao[]>(supabase.from('refeicoes').select('*').eq('dia', dia).order('criado_em'))
export const salvarRefeicao = (r: { dia: string; tipo: TipoRefeicao; nome: string | null; itens: ItemRefeicao[] }) => ok(supabase.from('refeicoes').insert(r))
export const apagarRefeicao = (id: string) => ok(supabase.from('refeicoes').delete().eq('id', id))

export const lerSalvas = () => ok<RefeicaoSalva[]>(supabase.from('refeicoes_salvas').select('*').order('ordem'))
export const criarSalvas = (lista: { nome: string; itens: ItemRefeicao[]; ordem: number }[]) => ok(supabase.from('refeicoes_salvas').insert(lista))

export const lerSeriesDoDia = (dia: string) => ok<Serie[]>(supabase.from('series').select('*').eq('dia', dia))
export const salvarSerie = (s: Omit<Serie, 'id'>) =>
  ok(supabase.from('series').upsert(s, { onConflict: 'dono,dia,exercicio,numero,aquecimento' }))
export const apagarSerie = (dia: string, exercicio: string, numero: number, aquecimento: boolean) =>
  ok(supabase.from('series').delete().match({ dia, exercicio, numero, aquecimento }))

// Séries de trabalho da última vez que o exercício foi feito antes de hoje.
export async function ultimaVez(exercicio: string, antesDe: string): Promise<{ dia: string; series: Serie[] } | null> {
  const ult = await ok<{ dia: string }[]>(supabase.from('series').select('dia').eq('exercicio', exercicio).eq('aquecimento', false).lt('dia', antesDe).order('dia', { ascending: false }).limit(1))
  if (!ult.length) return null
  const series = await ok<Serie[]>(supabase.from('series').select('*').eq('exercicio', exercicio).eq('aquecimento', false).eq('dia', ult[0].dia).order('numero'))
  return { dia: ult[0].dia, series }
}

export const lerDias = (desde: string) => ok<Dia[]>(supabase.from('dias').select('dia,peso,passos,deitou,acordou').gte('dia', desde).order('dia'))
export const salvarDia = (d: Partial<Dia> & { dia: string }) => ok(supabase.from('dias').upsert(d, { onConflict: 'dono,dia' }))

// Tarefas e hábitos: os mesmos do PC (uma linha por item; apagado em vez de apagar, para o PC saber).
export async function lerItens<T extends { id: string }>(tabela: 'tarefas' | 'habitos'): Promise<T[]> {
  const l = await ok<{ id: string; dados: T }[]>(supabase.from(tabela).select('id,dados').eq('apagado', false))
  return l.map((x) => ({ ...x.dados, id: x.id }))
}
export const salvarItem = <T extends { id: string }>(tabela: 'tarefas' | 'habitos', x: T) =>
  ok(supabase.from(tabela).upsert({ id: x.id, dados: x, apagado: false, atualizado_em: new Date().toISOString() }, { onConflict: 'dono,id' }))
export const apagarItem = (tabela: 'tarefas' | 'habitos', id: string) =>
  ok(supabase.from(tabela).upsert({ id, dados: {}, apagado: true, atualizado_em: new Date().toISOString() }, { onConflict: 'dono,id' }))

// Séries de trabalho do exercício antes de hoje, para a evolução (até ~3 meses de treinos).
export const historico = (exercicio: string, antesDe: string) =>
  ok<Serie[]>(supabase.from('series').select('*').eq('exercicio', exercicio).eq('aquecimento', false).lt('dia', antesDe).order('dia', { ascending: false }).limit(150))
