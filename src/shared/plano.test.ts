import { expect, it } from 'vitest'
import { gorduraPeloPeso, marcos, mediaMovel, pesoAlvo, pesoEsperado, resumoSemana, semanaDe, sugerirMetas, type Plano } from './plano'

// Números de exemplo (não são de ninguém).
const base = { inicio: '2027-03-01', fim: '2027-05-31', pesoInicial: 90, gorduraInicial: 25, gorduraAlvo: 18, alturaCm: 180, idade: 30, treinosSemana: 4, refeicaoLivreKcal: 1000 }
const plano: Plano = { ...base, ...sugerirMetas(base) }

it('peso-alvo mantém a massa magra', () => {
  expect(pesoAlvo(plano)).toBe(82.3) // 67,5 kg magros ÷ 0,82
  expect(gorduraPeloPeso(plano, 82.3)).toBe(18)
})

it('peso esperado vai em linha reta e para no fim', () => {
  expect(pesoEsperado(plano, '2027-03-01')).toBe(90)
  expect(pesoEsperado(plano, '2027-05-31')).toBe(82.3)
  expect(pesoEsperado(plano, '2027-07-01')).toBe(82.3)
})

it('um marco por mês, o último no fim do plano', () => {
  expect(marcos(plano).map((m) => [m.mes, m.dia])).toEqual([
    ['Março', '2027-03-31'],
    ['Abril', '2027-04-30'],
    ['Maio', '2027-05-31'],
  ])
})

it('metas sugeridas fecham as calorias e respeitam o piso', () => {
  const m = sugerirMetas(base)
  expect(m.proteina).toBe(190)
  expect(m.gordura).toBe(70)
  expect(Math.abs(m.proteina * 4 + m.carbo * 4 + m.gordura * 9 - m.kcal)).toBeLessThanOrEqual(20)
  expect(sugerirMetas({ ...base, pesoInicial: 50, alturaCm: 150, idade: 60 }).kcal).toBe(1700)
})

it('semana de segunda a domingo, média e resumo', () => {
  expect(semanaDe('2027-03-03')).toEqual(['2027-03-01', '2027-03-02', '2027-03-03', '2027-03-04', '2027-03-05', '2027-03-06', '2027-03-07'])
  const regs = [{ dia: '2027-03-01', peso: 90, treino: true }, { dia: '2027-03-02', peso: 89.6 }, { dia: '2027-03-03', peso: 89.8, treino: true }]
  const r = resumoSemana(plano, regs, (d) => d !== '2027-03-02', '2027-03-03')
  expect(r).toMatchObject({ mediaPeso: 89.8, treinos: 2, diasNaMeta: 2, diasContados: 3 })
  expect(mediaMovel(regs).at(-1)).toEqual({ dia: '2027-03-03', media: 89.8 })
})
