import { describe, expect, it } from 'vitest'
import { somar, buscarAlimentos, ALIMENTOS_TACO } from './alimentacao'
import { REFEICOES_PADRAO } from './refeicoesPadrao'

describe('refeições padrão', () => {
  it('marmita de 600 g fecha perto do plano (~735 kcal, ~75 g de proteína)', () => {
    const m = REFEICOES_PADRAO.find((r) => r.nome === 'Marmita')!
    expect(m.itens.reduce((s, i) => s + i.gramas, 0)).toBe(600)
    const t = somar(m.itens)
    expect(t.kcal).toBeGreaterThan(720)
    expect(t.kcal).toBeLessThan(750)
    expect(t.p).toBeGreaterThan(70)
  })

  it('sanduíche de frango tem mais de 30 g de proteína', () => {
    expect(somar(REFEICOES_PADRAO[1].itens).p).toBeGreaterThan(30)
  })

  it('macarrão sem dizer cru acha o cozido calculado', () => {
    expect(buscarAlimentos(ALIMENTOS_TACO, 'macarrão')[0].id).toBe('calc:macarrao-cozido')
  })
})
