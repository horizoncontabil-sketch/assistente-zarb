// Rotina de sono combinada com o Paulo em 15/11/2026 (plano-pessoal-2027-02 no segundo cérebro):
// 21h30 aviso para encerrar, 22h tela e luz quentes, 22h30 deitar e o PC suspende (adiável de 15 em 15 min).
export const SONO = { aviso: '21:30', tela: '22:00', deitar: '22:30', acordar: '06:00', folga: 15, adiar: 15, prazo: 5 }

const min = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}
const FIM_DA_NOITE = 5 * 60 // depois das 5h o PC não suspende mais

export type FaseSono = 'aviso' | 'tela' | 'deitar' | null
export function faseSono(agora: Date): FaseSono {
  const m = agora.getHours() * 60 + agora.getMinutes()
  if (m >= min(SONO.deitar) || m < FIM_DA_NOITE) return 'deitar'
  if (m >= min(SONO.tela)) return 'tela'
  if (m >= min(SONO.aviso)) return 'aviso'
  return null
}

// A noite leva a data do dia em que começou (01h de terça ainda é a noite de segunda).
export function noiteDe(agora: Date): string {
  const d = new Date(agora)
  if (d.getHours() < 12) d.setDate(d.getDate() - 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// "No horário": deitou entre 18h e 22h30 + 15 min de folga.
export function noHorario(deitou: string): boolean {
  const m = min(deitou)
  return m >= 18 * 60 && m <= min(SONO.deitar) + SONO.folga
}

// Horas entre deitar e acordar (deitar à noite, acordar de manhã).
export function horasDormidas(deitou: string, acordou: string): number {
  let d = min(acordou) - min(deitou)
  if (d <= 0) d += 24 * 60
  return Math.round((d / 60) * 10) / 10
}

export function placarSono(dias: { deitou: string | null }[]): { noHorario: number; noites: number } {
  const com = dias.filter((d) => d.deitou)
  return { noHorario: com.filter((d) => noHorario(d.deitou!)).length, noites: com.length }
}
