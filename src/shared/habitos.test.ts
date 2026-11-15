import { describe, expect, it } from 'vitest'
import { diaLocal } from './datas'
import { acharHabito, descreverDias, feitoNoDia, lembretesDeHabito, progresso, registrar, semana, sequencia, TODO_DIA, type Habito } from './habitos'

const hoje = new Date(2026, 10, 15, 10, 0) // domingo
const dia = (d: number) => diaLocal(new Date(2026, 10, d))
const base = (extra: Partial<Habito> = {}): Habito => ({
  id: 'h', nome: 'Ler 10 páginas', dias: TODO_DIA, meta: null, lembrete: null, registro: {}, criadoEm: '2026-10-01T00:00:00', ...extra,
})

describe('sequência', () => {
  it('conta dias seguidos e não quebra por hoje ainda não feito', () => {
    const h = base({ registro: { [dia(12)]: 1, [dia(13)]: 1, [dia(14)]: 1 } })
    expect(sequencia(h, hoje)).toBe(3)
    expect(sequencia(registrar(h, hoje, 1), hoje)).toBe(4)
  })
  it('pula os dias que não são dele', () => {
    const academia = base({ dias: [1, 3, 5], registro: { [dia(9)]: 1, [dia(11)]: 1, [dia(13)]: 1 } })
    expect(sequencia(academia, hoje)).toBe(3)
  })
  it('falhou ontem, zera', () => {
    expect(sequencia(base({ registro: { [dia(13)]: 1 } }), hoje)).toBe(0)
  })
})

describe('fracionado', () => {
  const agua = base({ nome: 'Beber água', meta: { total: 2, unidade: 'L', passo: 0.25 } })
  it('soma, mostra e só conta feito ao bater a meta', () => {
    let h = registrar(agua, hoje, 0.25)
    for (let i = 0; i < 4; i++) h = registrar(h, hoje, 0.25)
    expect(progresso(h, hoje)).toEqual({ texto: '1,25 de 2 L', fracao: 0.625 })
    expect(feitoNoDia(h, hoje)).toBe(false)
    h = registrar(h, hoje, 0.75)
    expect(feitoNoDia(h, hoje)).toBe(true)
  })
  it('não fica negativo', () => {
    expect(registrar(agua, hoje, -1).registro).toEqual({})
  })
})

it('semana de segunda a domingo com os estados', () => {
  const h = base({ dias: [1, 3, 5, 0], registro: { [dia(9)]: 1 } })
  expect(semana(h, hoje).map((d) => d.estado)).toEqual(['feito', 'fora', 'perdido', 'fora', 'perdido', 'fora', 'pendente'])
})

it('descreve os dias', () => {
  expect(descreverDias(TODO_DIA)).toBe('Todo dia')
  expect(descreverDias([1, 2, 3, 4, 5])).toBe('Dias úteis')
  expect(descreverDias([1, 3, 5])).toBe('Seg, qua e sex')
})

describe('lembrete de hábito', () => {
  it('na hora, uma vez por dia, e não se já fez', () => {
    const h = base({ lembrete: { tipo: 'hora', hora: '09:30' } })
    expect(lembretesDeHabito([h], hoje, {})).toHaveLength(1)
    expect(lembretesDeHabito([h], hoje, { h: new Date(2026, 10, 15, 9, 31).toISOString() })).toHaveLength(0)
    expect(lembretesDeHabito([registrar(h, hoje, 1)], hoje, {})).toHaveLength(0)
    expect(lembretesDeHabito([h], new Date(2026, 10, 15, 9, 0), {})).toHaveLength(0)
  })
  it('a cada intervalo, dentro da janela', () => {
    const h = base({ lembrete: { tipo: 'intervalo', aCadaMin: 120, de: '08:00', ate: '20:00' } })
    expect(lembretesDeHabito([h], hoje, { h: new Date(2026, 10, 15, 8, 0).toISOString() })).toHaveLength(1)
    expect(lembretesDeHabito([h], hoje, { h: new Date(2026, 10, 15, 9, 0).toISOString() })).toHaveLength(0)
    expect(lembretesDeHabito([h], new Date(2026, 10, 15, 21, 0), {})).toHaveLength(0)
  })
})

it('acha o hábito pelo que a pessoa falou', () => {
  const lista = [base({ id: 'a', nome: 'Beber 2 litros de água' }), base({ id: 'b', nome: 'Ler 10 páginas' })]
  expect(acharHabito(lista, 'agua')?.id).toBe('a')
  expect(acharHabito(lista, 'páginas')?.id).toBe('b')
  expect(acharHabito(lista, 'academia')).toBeNull()
})
