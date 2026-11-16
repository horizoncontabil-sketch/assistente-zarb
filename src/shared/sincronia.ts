// Sincronia PC <-> celular por item: cada coleção (tarefas, hábitos) vira linhas { id, dados, apagado, atualizado_em }.
// O aparelho guarda o que mudou e ainda não subiu (pendentes); ao puxar, a nuvem vale, menos o que está pendente.
export type Linha<T> = { id: string; dados: T; apagado: boolean; atualizado_em: string }
export type Pendente<T> = { dados: T | null; em: string } // dados null = apagado
export type Pendentes<T> = Record<string, Pendente<T>>

// O que mudou entre duas versões da lista (por id e conteúdo).
export function diferencas<T extends { id: string }>(antes: T[], depois: T[], em: string): Pendentes<T> {
  const p: Pendentes<T> = {}
  const velho = new Map(antes.map((x) => [x.id, JSON.stringify(x)]))
  const ids = new Set(depois.map((x) => x.id))
  for (const x of depois) if (velho.get(x.id) !== JSON.stringify(x)) p[x.id] = { dados: x, em }
  for (const x of antes) if (!ids.has(x.id)) p[x.id] = { dados: null, em }
  return p
}

// Lista que o aparelho mostra: nuvem + pendentes por cima. Linha da nuvem mais nova que o pendente vence.
export function aplicarRemoto<T extends { id: string }>(remotos: Linha<T>[], pendentes: Pendentes<T>): T[] {
  const mapa = new Map<string, T>()
  for (const r of remotos) if (!r.apagado) mapa.set(r.id, { ...r.dados, id: r.id })
  for (const [id, p] of Object.entries(pendentes)) {
    const r = remotos.find((x) => x.id === id)
    if (r && r.atualizado_em > p.em) continue
    if (p.dados) mapa.set(id, p.dados)
    else mapa.delete(id)
  }
  return [...mapa.values()]
}

export const paraLinhas = <T>(p: Pendentes<T>) =>
  Object.entries(p).map(([id, x]) => ({ id, dados: x.dados ?? {}, apagado: x.dados === null, atualizado_em: x.em }))
