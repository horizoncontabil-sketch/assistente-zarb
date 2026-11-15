// Regras de tarefas e lembretes (sem disco, sem relógio: tudo recebe "agora").
import { isoLocal, proximaOcorrencia } from './datas'
import type { Repetir, Tarefa } from './tipos'

export function novaTarefa(id: string, titulo: string, quando: string | null, repetir: Repetir, agora: Date): Tarefa {
  return { id, titulo, quando, repetir: quando ? repetir : null, feita: false, feitaEm: null, criadaEm: isoLocal(agora), avisada: false }
}

export function devidas(tarefas: Tarefa[], agora: Date): Tarefa[] {
  return tarefas.filter((t) => !t.feita && !t.avisada && t.quando && new Date(t.quando).getTime() <= agora.getTime())
}

export function concluir(t: Tarefa, agora: Date): Tarefa {
  if (t.repetir && t.quando) {
    return { ...t, quando: isoLocal(proximaOcorrencia(t.quando, t.repetir, agora)), avisada: false }
  }
  return { ...t, feita: true, feitaEm: isoLocal(agora) }
}

export function adiar(t: Tarefa, minutos: number, agora: Date): Tarefa {
  const m = Math.min(Math.max(Math.round(minutos), 1), 60 * 24 * 7)
  return { ...t, quando: isoLocal(new Date(agora.getTime() + m * 60_000)), avisada: false, feita: false, feitaEm: null }
}

// Pendentes primeiro (com horário, por horário; depois sem horário, mais novas em cima), feitas por último.
export function ordenar(tarefas: Tarefa[]): Tarefa[] {
  return [...tarefas].sort((a, b) => {
    if (a.feita !== b.feita) return a.feita ? 1 : -1
    if (a.feita) return (b.feitaEm ?? '').localeCompare(a.feitaEm ?? '')
    if (!!a.quando !== !!b.quando) return a.quando ? -1 : 1
    if (a.quando && b.quando) return new Date(a.quando).getTime() - new Date(b.quando).getTime()
    return b.criadaEm.localeCompare(a.criadaEm)
  })
}

// Feitas há mais de 30 dias saem da lista, para o arquivo não crescer para sempre.
export function limparAntigas(tarefas: Tarefa[], agora: Date): Tarefa[] {
  const corte = agora.getTime() - 30 * 86_400_000
  return tarefas.filter((t) => !t.feita || !t.feitaEm || new Date(t.feitaEm).getTime() > corte)
}
