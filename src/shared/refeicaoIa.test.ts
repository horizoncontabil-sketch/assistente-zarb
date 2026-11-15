import { expect, it } from 'vitest'
import { ALIMENTOS_TACO } from './alimentacao'
import { montarRascunho, tipoPelaHora } from './refeicaoIa'

const agora = new Date(2027, 2, 1, 13, 0)

it('acha os alimentos, converte medida e calcula', () => {
  const r = montarRascunho(
    { tipo: 'almoco', itens: [{ alimento: 'peito de frango grelhado', gramas: 150 }, { alimento: 'arroz', medida: 'colher de sopa', quantidade: 4 }, { alimento: 'whey protein', gramas: 30, kcal_100g: 400, proteina_100g: 80 }] },
    ALIMENTOS_TACO,
    '2027-03-01',
    agora,
  )!
  expect(r.tipo).toBe('almoco')
  expect(r.itens[0]).toMatchObject({ gramas: 150, alimento: { fonte: 'taco' } })
  expect(r.itens[1]).toMatchObject({ gramas: 100 })
  expect(r.itens[2]).toMatchObject({ gramas: 30, alimento: { fonte: 'ia', kcal: 400 }, aviso: expect.stringMatching(/rótulo/) })
})

it('sem quantidade nem alimento conhecido, pede para completar', () => {
  const r = montarRascunho({ itens: [{ alimento: 'coisa inexistente xyz', medida: 'pote' }] }, ALIMENTOS_TACO, '2027-03-01', agora)!
  expect(r.tipo).toBe('almoco')
  expect(r.itens[0]).toMatchObject({ alimento: null, gramas: null })
})

it('tipo pela hora e nada quando não há itens', () => {
  expect(tipoPelaHora(8)).toBe('cafe')
  expect(tipoPelaHora(20)).toBe('jantar')
  expect(montarRascunho({ itens: [] }, ALIMENTOS_TACO, '2027-03-01', agora)).toBeNull()
})
