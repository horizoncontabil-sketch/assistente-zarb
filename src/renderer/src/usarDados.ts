import { useEffect, useState } from 'react'
import type { Atalho, Configuracoes, Copia, Evento, Habito, Mudou, Saude, Tarefa } from '../../shared/tipos'
import { api } from './util'

type Agenda = { eventos: Evento[]; lidoEm: string | null; erro: string | null }

export function usarDados() {
  const [config, setConfig] = useState<Configuracoes | null>(null)
  const [tarefas, setTarefas] = useState<Tarefa[]>([])
  const [agenda, setAgenda] = useState<Agenda>({ eventos: [], lidoEm: null, erro: null })
  const [copias, setCopias] = useState<Copia[]>([])
  const [atalhos, setAtalhos] = useState<Atalho[]>([])
  const [habitos, setHabitos] = useState<Habito[]>([])
  const [saude, setSaude] = useState<Saude>({ plano: null, corpo: [], refeicoes: [], receitas: [], alimentosMeus: [] })

  useEffect(() => {
    const carregar: Record<Mudou, () => void> = {
      config: () => api.configuracoes().then(setConfig),
      tarefas: () => api.tarefas().then(setTarefas),
      eventos: () => api.eventos().then(setAgenda),
      copias: () => api.copias().then(setCopias),
      atalhos: () => api.atalhos().then(setAtalhos),
      habitos: () => api.habitos().then(setHabitos),
      saude: () => api.saude().then(setSaude),
    }
    Object.values(carregar).forEach((f) => f())
    return api.aoMudar((o) => carregar[o]())
  }, [])

  return { config, tarefas, agenda, copias, atalhos, habitos, saude }
}

export type Dados = ReturnType<typeof usarDados>

// Relógio que anda a cada 15 s (suficiente para "em 5 min").
export function usarAgora(): Date {
  const [agora, setAgora] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setAgora(new Date()), 15_000)
    return () => clearInterval(t)
  }, [])
  return agora
}
