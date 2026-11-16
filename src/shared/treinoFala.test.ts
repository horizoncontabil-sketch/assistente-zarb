import { describe, expect, it } from 'vitest'
import { evolucao, lerSerieFalada } from './treino'

describe('série falada', () => {
  it('entende carga e repetições em vários jeitos', () => {
    expect(lerSerieFalada('30 kg 8')).toEqual({ kg: 30, reps: 8 })
    expect(lerSerieFalada('30 quilos 8 repetições')).toEqual({ kg: 30, reps: 8 })
    expect(lerSerieFalada('30 por 8')).toEqual({ kg: 30, reps: 8 })
    expect(lerSerieFalada('30 x 8')).toEqual({ kg: 30, reps: 8 })
    expect(lerSerieFalada('8 com 30')).toEqual({ kg: 30, reps: 8 })
    expect(lerSerieFalada('8 repetições com 32,5')).toEqual({ kg: 32.5, reps: 8 })
    expect(lerSerieFalada('trinta e dois e meio')).toBeNull()
    expect(lerSerieFalada('22 e meio por dez')).toEqual({ kg: 22.5, reps: 10 })
  })
  it('número sozinho é repetição; lixo não vira série', () => {
    expect(lerSerieFalada('oito')).toEqual({ kg: null, reps: 8 })
    expect(lerSerieFalada('40kg')).toEqual({ kg: 40, reps: null })
    expect(lerSerieFalada('fiz certinho')).toBeNull()
    expect(lerSerieFalada('8 8 8')).toBeNull()
    expect(lerSerieFalada('0 com 30')).toBeNull()
  })
})

describe('evolução', () => {
  it('maior carga por dia, mais recente primeiro', () => {
    expect(
      evolucao([
        { dia: '2026-11-16', kg: 30, reps: 8 },
        { dia: '2026-11-16', kg: 30, reps: 7 },
        { dia: '2026-11-16', kg: 25, reps: 10 },
        { dia: '2026-11-23', kg: 32, reps: 6 },
        { dia: '2026-11-23', kg: null, reps: 6 },
      ]),
    ).toEqual([
      { dia: '2026-11-23', kg: 32, reps: [6] },
      { dia: '2026-11-16', kg: 30, reps: [8, 7] },
    ])
  })
})
