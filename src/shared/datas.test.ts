import { describe, expect, it } from 'vitest'
import { descreverQuando, isoLocal, proximaOcorrencia, validarQuando } from './datas'

const agora = new Date(2026, 10, 15, 10, 0) // dom 15/11/2026 10:00

describe('validarQuando', () => {
  it('aceita horário futuro', () => {
    expect(validarQuando(isoLocal(new Date(2026, 10, 15, 15, 0)), agora).ok).toBe(true)
  })
  it('recusa horário que passou e texto que não é data', () => {
    const r = validarQuando(isoLocal(new Date(2026, 10, 15, 9, 0)), agora)
    expect(r.ok).toBe(false)
    expect(validarQuando('amanhã', agora).ok).toBe(false)
    expect(validarQuando(undefined, agora).ok).toBe(false)
  })
})

describe('descreverQuando', () => {
  it('fala hoje, amanhã e o dia da semana', () => {
    expect(descreverQuando(isoLocal(new Date(2026, 10, 15, 15, 0)), agora)).toBe('hoje, 15:00')
    expect(descreverQuando(isoLocal(new Date(2026, 10, 16, 9, 5)), agora)).toBe('amanhã, 09:05')
    expect(descreverQuando(isoLocal(new Date(2026, 10, 18, 8, 0)), agora)).toBe('qua 18/11, 08:00')
  })
})

describe('proximaOcorrencia', () => {
  it('diário vai para o dia seguinte', () => {
    const p = proximaOcorrencia(isoLocal(new Date(2026, 10, 15, 9, 0)), 'diario', agora)
    expect(p).toEqual(new Date(2026, 10, 16, 9, 0))
  })
  it('dias úteis pula o fim de semana', () => {
    const sexta = isoLocal(new Date(2026, 10, 13, 9, 0))
    expect(proximaOcorrencia(sexta, 'dias_uteis', new Date(2026, 10, 13, 9, 1))).toEqual(new Date(2026, 10, 16, 9, 0))
  })
  it('semanal recupera semanas perdidas com o PC desligado', () => {
    const p = proximaOcorrencia(isoLocal(new Date(2026, 9, 26, 8, 0)), 'semanal', agora)
    expect(p).toEqual(new Date(2026, 10, 16, 8, 0))
  })
  it('mensal no dia 31 cai no último dia e volta ao 31', () => {
    const jan31 = isoLocal(new Date(2027, 0, 31, 9, 0))
    const fev = proximaOcorrencia(jan31, 'mensal', new Date(2027, 0, 31, 10, 0))
    expect(fev).toEqual(new Date(2027, 1, 28, 9, 0))
    expect(proximaOcorrencia(jan31, 'mensal', new Date(2027, 1, 28, 10, 0))).toEqual(new Date(2027, 2, 31, 9, 0))
  })
})
