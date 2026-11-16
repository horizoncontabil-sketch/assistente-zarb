import { describe, expect, it } from 'vitest'
import { iniciativasAgora } from './iniciativa'

const as = (h: number, m = 0) => new Date(2026, 10, 17, h, m)
const base = { usandoAgora: true, almocoRegistrado: false, jantarRegistrado: false, atrasadas: 0 }

describe('iniciativa', () => {
  it('bom dia uma vez, no primeiro uso da manhã', () => {
    expect(iniciativasAgora(as(7), {}, base)).toEqual(['bomdia'])
    expect(iniciativasAgora(as(7), { bomdia: '2026-11-17' }, base)).toEqual([])
    expect(iniciativasAgora(as(7), {}, { ...base, usandoAgora: false })).toEqual([])
    expect(iniciativasAgora(as(4, 59), {}, base)).toEqual([])
  })
  it('marmita só se a refeição não foi registrada', () => {
    expect(iniciativasAgora(as(12, 30), { bomdia: '2026-11-17' }, base)).toEqual(['almoco'])
    expect(iniciativasAgora(as(13), { bomdia: '2026-11-17' }, { ...base, almocoRegistrado: true })).toEqual([])
    expect(iniciativasAgora(as(20), { bomdia: '2026-11-17' }, base)).toEqual(['jantar'])
  })
  it('atrasadas à tarde, só se houver', () => {
    expect(iniciativasAgora(as(15, 10), { bomdia: '2026-11-17', almoco: '2026-11-17' }, { ...base, atrasadas: 2 })).toEqual(['atrasadas'])
    expect(iniciativasAgora(as(15, 10), { bomdia: '2026-11-17', almoco: '2026-11-17' }, base)).toEqual([])
  })
})
