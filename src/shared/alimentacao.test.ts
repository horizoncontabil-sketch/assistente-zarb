import { describe, expect, it } from 'vitest'
import { ALIMENTOS_TACO, buscarAlimentos, diaNaMeta, gramasDaMedida, gramasDaMedidaMedia, item, somar } from './alimentacao'

it('a base TACO carregou', () => {
  expect(ALIMENTOS_TACO.length).toBeGreaterThan(550)
})

it('acha o alimento pronto para comer primeiro', () => {
  expect(buscarAlimentos(ALIMENTOS_TACO, 'arroz')[0].nome).toMatch(/Arroz.*cozido/)
  expect(buscarAlimentos(ALIMENTOS_TACO, 'peito de frango')[0].nome).toMatch(/Frango, peito.*(grelhado|cozido|assado)/)
  expect(buscarAlimentos(ALIMENTOS_TACO, 'frango cru')[0].nome).toMatch(/cru/)
  expect(buscarAlimentos(ALIMENTOS_TACO, 'xyzabc')).toEqual([])
})

it('calcula pelo peso e soma', () => {
  const arroz = ALIMENTOS_TACO.find((a) => a.nome === 'Arroz, tipo 1, cozido')!
  expect(item(arroz, 150)).toMatchObject({ gramas: 150, kcal: 192, p: 3.8, c: 42.2 })
  expect(somar([item(arroz, 100), item(arroz, 50)]).kcal).toBe(192)
})

it('converte medida caseira', () => {
  const arroz = ALIMENTOS_TACO.find((a) => a.nome === 'Arroz, tipo 1, cozido')!
  expect(gramasDaMedida(arroz, 'colheres de sopa', 4)).toBe(100)
  expect(gramasDaMedida(arroz, 'xícara', 1)).toBeNull()
})

it('dia na meta: calorias até 5% acima e 90% da proteína', () => {
  expect(diaNaMeta({ kcal: 2080, p: 150, c: 0, g: 0, fibra: 0 }, { kcal: 2000, proteina: 155 })).toBe(true)
  expect(diaNaMeta({ kcal: 2200, p: 160, c: 0, g: 0, fibra: 0 }, { kcal: 2000, proteina: 155 })).toBe(false)
  expect(diaNaMeta({ kcal: 1800, p: 120, c: 0, g: 0, fibra: 0 }, { kcal: 2000, proteina: 155 })).toBe(false)
})

describe('busca pelo jeito de falar', () => {
  it('arroz branco acha o tipo 1 cozido', () => {
    expect(buscarAlimentos(ALIMENTOS_TACO, 'arroz branco cozido')[0].nome).toBe('Arroz, tipo 1, cozido')
  })
  it('palavra que não existe na tabela não zera a busca', () => {
    expect(buscarAlimentos(ALIMENTOS_TACO, 'feijão carioca caseiro')[0].nome).toBe('Feijão, carioca, cozido')
  })
  it('medida média quando o alimento não tem a dele', () => {
    expect(gramasDaMedidaMedia('conchas', 2)).toBe(200)
    expect(gramasDaMedidaMedia('pitada', 1)).toBeNull()
    const ovo = buscarAlimentos(ALIMENTOS_TACO, 'ovo cozido')[0]
    expect(gramasDaMedidaMedia('unidades', 3, ovo)).toBe(150)
    expect(gramasDaMedidaMedia('unidade', 2, buscarAlimentos(ALIMENTOS_TACO, 'pão francês')[0])).toBe(100)
  })
})
