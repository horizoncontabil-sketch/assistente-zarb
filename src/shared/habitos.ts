// Hábitos: de sim ou não, ou fracionados (2 L de água, 30 min de caminhada, 10 páginas).
// Tudo recebe o dia ou a hora de fora, para dar para testar.
import { diaLocal } from './datas'

export type Meta = { total: number; unidade: string; passo: number }
export type LembreteHabito =
  | { tipo: 'hora'; hora: string } // "09:00"
  | { tipo: 'intervalo'; aCadaMin: number; de: string; ate: string } // a cada 2 h, das 8 às 20

export type Habito = {
  id: string
  nome: string
  dias: number[] // 0 = domingo ... 6 = sábado
  meta: Meta | null // null = sim ou não
  lembrete: LembreteHabito | null
  registro: Record<string, number> // "AAAA-MM-DD" -> quanto fez
  criadoEm: string
}

export const TODO_DIA = [0, 1, 2, 3, 4, 5, 6]
const NOMES = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']

export function descreverDias(dias: number[]): string {
  const d = [...new Set(dias)].sort()
  if (d.length === 7) return 'Todo dia'
  if (d.join() === '1,2,3,4,5') return 'Dias úteis'
  if (d.join() === '0,6') return 'Fim de semana'
  const nomes = d.map((x) => NOMES[x])
  if (!nomes.length) return 'Nenhum dia'
  const texto = nomes.length === 1 ? nomes[0] : `${nomes.slice(0, -1).join(', ')} e ${nomes.at(-1)}`
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

export const ehDiaDele = (h: Habito, data: Date) => h.dias.includes(data.getDay())
export const quanto = (h: Habito, data: Date) => h.registro[diaLocal(data)] ?? 0
export const feitoNoDia = (h: Habito, data: Date) => quanto(h, data) >= (h.meta ? h.meta.total : 1)

function diaAnterior(d: Date): Date {
  const n = new Date(d)
  n.setDate(n.getDate() - 1)
  return n
}

// Dias de agenda dele seguidos e feitos. Hoje ainda não feito não quebra a sequência.
export function sequencia(h: Habito, hoje: Date): number {
  let d = new Date(hoje)
  let n = 0
  if (ehDiaDele(h, d) && !feitoNoDia(h, d)) d = diaAnterior(d)
  const criado = new Date(h.criadoEm)
  for (let i = 0; i < 800; i++) {
    if (d < new Date(criado.getFullYear(), criado.getMonth(), criado.getDate())) break
    if (ehDiaDele(h, d)) {
      if (!feitoNoDia(h, d)) break
      n++
    }
    d = diaAnterior(d)
  }
  return n
}

export type Dia = 'feito' | 'perdido' | 'fora' | 'pendente' | 'futuro'

// Semana de segunda a domingo que contém "hoje".
export function semana(h: Habito, hoje: Date): { data: Date; estado: Dia }[] {
  const seg = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - ((hoje.getDay() + 6) % 7))
  const hojeStr = diaLocal(hoje)
  return Array.from({ length: 7 }, (_, i) => {
    const data = new Date(seg.getFullYear(), seg.getMonth(), seg.getDate() + i)
    const s = diaLocal(data)
    let estado: Dia
    if (!ehDiaDele(h, data)) estado = 'fora'
    else if (feitoNoDia(h, data)) estado = 'feito'
    else if (s === hojeStr) estado = 'pendente'
    else if (s > hojeStr) estado = 'futuro'
    else estado = 'perdido'
    return { data, estado }
  })
}

// Soma (ou tira) no dia. Sim ou não: qualquer soma marca, qualquer tirada desmarca.
export function registrar(h: Habito, data: Date, delta: number): Habito {
  const dia = diaLocal(data)
  const atual = h.registro[dia] ?? 0
  const novo = h.meta ? Math.max(0, Math.round((atual + delta) * 1000) / 1000) : delta > 0 ? 1 : 0
  const registro = { ...h.registro }
  if (novo === 0) delete registro[dia]
  else registro[dia] = novo
  return { ...h, registro }
}

export function numero(n: number): string {
  return n.toLocaleString('pt-BR', { maximumFractionDigits: 2 })
}

export function progresso(h: Habito, data: Date): { texto: string; fracao: number } {
  const q = quanto(h, data)
  if (!h.meta) return { texto: q ? 'Feito' : 'Não feito', fracao: q ? 1 : 0 }
  return { texto: `${numero(q)} de ${numero(h.meta.total)} ${h.meta.unidade}`, fracao: Math.min(1, q / h.meta.total) }
}

const minutosDe = (hhmm: string) => {
  const [a, b] = hhmm.split(':').map(Number)
  return a * 60 + b
}

// Lembretes de hábito que vencem agora. "avisados" guarda a última vez de cada um (ISO).
export function lembretesDeHabito(habitos: Habito[], agora: Date, avisados: Record<string, string>): Habito[] {
  const min = agora.getHours() * 60 + agora.getMinutes()
  return habitos.filter((h) => {
    if (!h.lembrete || !ehDiaDele(h, agora) || feitoNoDia(h, agora)) return false
    const ultimo = avisados[h.id] ? new Date(avisados[h.id]) : null
    if (h.lembrete.tipo === 'hora') {
      const alvo = minutosDe(h.lembrete.hora)
      return min >= alvo && min < alvo + 60 && !(ultimo && diaLocal(ultimo) === diaLocal(agora))
    }
    const { aCadaMin, de, ate } = h.lembrete
    if (min < minutosDe(de) || min > minutosDe(ate)) return false
    return !ultimo || diaLocal(ultimo) !== diaLocal(agora) ? min >= minutosDe(de) : agora.getTime() - ultimo.getTime() >= aCadaMin * 60_000
  })
}

export function descreverLembrete(l: LembreteHabito | null): string | null {
  if (!l) return null
  if (l.tipo === 'hora') return `lembra às ${l.hora}`
  const h = l.aCadaMin % 60 === 0 ? `${l.aCadaMin / 60} h` : `${l.aCadaMin} min`
  return `lembra a cada ${h}`
}

export function acharHabito(habitos: Habito[], nome: string): Habito | null {
  const n = nome
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
  if (!n) return null
  const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  const achados = habitos.filter((h) => norm(h.nome).includes(n) || n.includes(norm(h.nome)) || norm(h.nome).split(' ').some((p) => p.length > 3 && n.includes(p)))
  return achados.length === 1 ? achados[0] : null
}
