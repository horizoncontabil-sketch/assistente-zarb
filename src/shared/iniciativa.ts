// Quando o assistente puxa assunto sozinho (pedido do Paulo, 16/11/2026: "está muito manual").
// Cada aviso aparece uma vez por dia; "feitos" guarda o último dia de cada um.
import { diaLocal } from './datas'

export type Feitos = { bomdia?: string; almoco?: string; jantar?: string; atrasadas?: string }
export type Iniciativa = 'bomdia' | 'almoco' | 'jantar' | 'atrasadas'

const min = (d: Date) => d.getHours() * 60 + d.getMinutes()
const JANELAS: Record<Iniciativa, [number, number]> = {
  bomdia: [5 * 60, 12 * 60], // primeiro uso do PC de manhã
  almoco: [12 * 60 + 30, 15 * 60],
  jantar: [19 * 60 + 30, 21 * 60 + 30],
  atrasadas: [15 * 60, 18 * 60],
}

export function iniciativasAgora(
  agora: Date,
  feitos: Feitos,
  s: { usandoAgora: boolean; almocoRegistrado: boolean; jantarRegistrado: boolean; atrasadas: number },
): Iniciativa[] {
  const hoje = diaLocal(agora)
  const m = min(agora)
  const na = (i: Iniciativa) => m >= JANELAS[i][0] && m < JANELAS[i][1] && feitos[i] !== hoje
  const r: Iniciativa[] = []
  if (!s.usandoAgora) return r // ninguém na frente do PC: espera
  if (na('bomdia')) r.push('bomdia')
  if (na('almoco') && !s.almocoRegistrado) r.push('almoco')
  if (na('jantar') && !s.jantarRegistrado) r.push('jantar')
  if (na('atrasadas') && s.atrasadas > 0) r.push('atrasadas')
  return r
}
