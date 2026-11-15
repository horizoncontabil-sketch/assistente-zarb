import { describe, expect, it } from 'vitest'
import { TREINOS, cargaAquecimento, metaPassos, sugerirCarga, treinoDoDia } from './treino'

const supino = TREINOS[0].exercicios[0] // 4 x 6-8, passo 2

describe('treino', () => {
  it('escolhe o treino pelo dia da semana', () => {
    expect(treinoDoDia(new Date(2026, 10, 16))?.id).toBe('supA') // segunda
    expect(treinoDoDia(new Date(2026, 10, 17))?.id).toBe('infA')
    expect(treinoDoDia(new Date(2026, 10, 19))?.id).toBe('supB')
    expect(treinoDoDia(new Date(2026, 10, 21))?.id).toBe('infB')
    expect(treinoDoDia(new Date(2026, 10, 18))).toBeNull() // quarta
  })

  it('sobe a carga só quando fecha todas as séries no topo da faixa', () => {
    expect(sugerirCarga(supino, [])).toBeNull()
    expect(sugerirCarga(supino, [8, 8, 8, 8].map((r) => ({ kg: 30, reps: r })))).toEqual({ kg: 32, subir: true })
    expect(sugerirCarga(supino, [8, 8, 8, 7].map((r) => ({ kg: 30, reps: r })))).toEqual({ kg: 30, subir: false })
    expect(sugerirCarga(supino, [8, 8, 8].map((r) => ({ kg: 30, reps: r })))).toEqual({ kg: 30, subir: false })
  })

  it('aquecimento: porcentagem da carga, 0 é só a barra', () => {
    expect(cargaAquecimento(30, 50)).toBe(15)
    expect(cargaAquecimento(30, 0)).toBeNull()
    expect(cargaAquecimento(null, 50)).toBeNull()
  })

  it('meta de passos sobe por semana a partir de 16/11', () => {
    expect(metaPassos(new Date(2026, 10, 15)).meta).toBe(4000)
    expect(metaPassos(new Date(2026, 10, 22)).meta).toBe(4000)
    expect(metaPassos(new Date(2026, 10, 23)).meta).toBe(5000)
    expect(metaPassos(new Date(2026, 10, 30)).meta).toBe(6000)
    expect(metaPassos(new Date(2026, 11, 7)).meta).toBe(7000)
  })
})
