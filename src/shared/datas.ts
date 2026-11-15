import type { Repetir } from './tipos'

const dois = (n: number) => String(n).padStart(2, '0')

// ISO com o fuso do PC (ex.: 2026-11-15T14:30:00-03:00), que é o que a IA recebe e devolve.
export function isoLocal(d: Date): string {
  const off = -d.getTimezoneOffset()
  const sinal = off >= 0 ? '+' : '-'
  const a = Math.abs(off)
  return (
    `${d.getFullYear()}-${dois(d.getMonth() + 1)}-${dois(d.getDate())}` +
    `T${dois(d.getHours())}:${dois(d.getMinutes())}:${dois(d.getSeconds())}` +
    `${sinal}${dois(Math.floor(a / 60))}:${dois(a % 60)}`
  )
}

export function diaLocal(d: Date): string {
  return `${d.getFullYear()}-${dois(d.getMonth() + 1)}-${dois(d.getDate())}`
}

const DIAS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado']
const DIAS_CURTOS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']

export function diaDaSemana(d: Date): string {
  return DIAS[d.getDay()]
}

export function mesmoDia(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

export function hora(d: Date): string {
  return `${dois(d.getHours())}:${dois(d.getMinutes())}`
}

export function descreverDia(d: Date, agora: Date): string {
  const amanha = new Date(agora)
  amanha.setDate(agora.getDate() + 1)
  const ontem = new Date(agora)
  ontem.setDate(agora.getDate() - 1)
  if (mesmoDia(d, agora)) return 'hoje'
  if (mesmoDia(d, amanha)) return 'amanhã'
  if (mesmoDia(d, ontem)) return 'ontem'
  return `${DIAS_CURTOS[d.getDay()]} ${dois(d.getDate())}/${dois(d.getMonth() + 1)}`
}

export function descreverQuando(iso: string, agora: Date): string {
  const d = new Date(iso)
  return `${descreverDia(d, agora)}, ${hora(d)}`
}

export function descreverRepetir(r: Repetir): string | null {
  if (!r) return null
  return { diario: 'todo dia', dias_uteis: 'dias úteis', semanal: 'toda semana', mensal: 'todo mês' }[r]
}

// Data que a IA mandou: precisa existir, não pode ter passado (1 min de folga) nem estar longe demais.
export function validarQuando(iso: unknown, agora: Date): { ok: true; data: Date } | { ok: false; erro: string } {
  if (typeof iso !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(iso)) {
    return { ok: false, erro: 'Não entendi o horário.' }
  }
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return { ok: false, erro: 'Não entendi o horário.' }
  if (d.getTime() < agora.getTime() - 60_000) return { ok: false, erro: `Esse horário já passou (${descreverQuando(iso, agora)}).` }
  if (d.getTime() > agora.getTime() + 2 * 365 * 86_400_000) return { ok: false, erro: 'Horário longe demais.' }
  return { ok: true, data: d }
}

function avancar(d: Date, r: Exclude<Repetir, null>): Date {
  const n = new Date(d)
  if (r === 'diario') n.setDate(n.getDate() + 1)
  else if (r === 'semanal') n.setDate(n.getDate() + 7)
  else if (r === 'mensal') {
    const dia = d.getDate()
    n.setDate(1)
    n.setMonth(n.getMonth() + 1)
    // Dia 31 em mês de 30 dias cai no último dia do mês.
    const ultimo = new Date(n.getFullYear(), n.getMonth() + 1, 0).getDate()
    n.setDate(Math.min(dia, ultimo))
  } else {
    do n.setDate(n.getDate() + 1)
    while (n.getDay() === 0 || n.getDay() === 6)
  }
  return n
}

// Próxima vez de um lembrete que repete, sempre depois de "agora".
export function proximaOcorrencia(iso: string, r: Exclude<Repetir, null>, agora: Date): Date {
  let d = new Date(iso)
  // Mensal guarda o dia original para não ir encolhendo (31 -> 30 -> 30...).
  const diaOriginal = d.getDate()
  let i = 0
  do {
    d = avancar(d, r)
    if (r === 'mensal') {
      const ultimo = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
      d.setDate(Math.min(diaOriginal, ultimo))
    }
  } while (d.getTime() <= agora.getTime() && ++i < 5000)
  return d
}
