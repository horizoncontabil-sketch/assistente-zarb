import { describe, expect, it } from 'vitest'
import { aplicarRemoto, diferencas, paraLinhas } from './sincronia'

const a = { id: 'a', t: 1 }
const b = { id: 'b', t: 1 }

describe('sincronia', () => {
  it('acha criados, mudados e apagados', () => {
    expect(diferencas([a, b], [{ id: 'a', t: 2 }, { id: 'c', t: 1 }], 'T')).toEqual({
      a: { dados: { id: 'a', t: 2 }, em: 'T' },
      c: { dados: { id: 'c', t: 1 }, em: 'T' },
      b: { dados: null, em: 'T' },
    })
    expect(diferencas([a], [a], 'T')).toEqual({})
  })
  it('nuvem vale, menos o pendente mais novo', () => {
    const remotos = [
      { id: 'a', dados: { id: 'a', t: 5 }, apagado: false, atualizado_em: '2026-11-16T10:00:00Z' },
      { id: 'b', dados: b, apagado: true, atualizado_em: '2026-11-16T10:00:00Z' },
      { id: 'd', dados: { id: 'd', t: 1 }, apagado: false, atualizado_em: '2026-11-16T12:00:00Z' },
    ]
    const r = aplicarRemoto(remotos, {
      a: { dados: { id: 'a', t: 9 }, em: '2026-11-16T11:00:00Z' }, // pendente mais novo: vale
      d: { dados: null, em: '2026-11-16T11:00:00Z' }, // nuvem mais nova: vale a nuvem
      e: { dados: { id: 'e', t: 1 }, em: '2026-11-16T11:00:00Z' }, // ainda não subiu
    })
    expect(r).toEqual([{ id: 'a', t: 9 }, { id: 'd', t: 1 }, { id: 'e', t: 1 }])
  })
  it('vira linhas para subir', () => {
    expect(paraLinhas({ b: { dados: null, em: 'T' } })).toEqual([{ id: 'b', dados: {}, apagado: true, atualizado_em: 'T' }])
  })
})
