import { describe, expect, it } from 'vitest'
import { faseSono, horasDormidas, noHorario, noiteDe, placarSono } from './sono'

const as = (h: number, m = 0) => new Date(2026, 10, 16, h, m)

describe('sono', () => {
  it('fases da noite', () => {
    expect(faseSono(as(21, 29))).toBeNull()
    expect(faseSono(as(21, 30))).toBe('aviso')
    expect(faseSono(as(22, 0))).toBe('tela')
    expect(faseSono(as(22, 30))).toBe('deitar')
    expect(faseSono(as(1, 0))).toBe('deitar')
    expect(faseSono(as(5, 0))).toBeNull()
    expect(faseSono(as(14, 0))).toBeNull()
  })
  it('madrugada é a noite anterior', () => {
    expect(noiteDe(as(23))).toBe('2026-11-16')
    expect(noiteDe(as(1))).toBe('2026-11-15')
  })
  it('placar e horas', () => {
    expect(noHorario('22:30')).toBe(true)
    expect(noHorario('22:45')).toBe(true)
    expect(noHorario('22:46')).toBe(false)
    expect(noHorario('00:00')).toBe(false)
    expect(horasDormidas('00:00', '06:00')).toBe(6)
    expect(horasDormidas('22:30', '06:00')).toBe(7.5)
    expect(placarSono([{ deitou: '22:20' }, { deitou: '00:10' }, { deitou: null }])).toEqual({ noHorario: 1, noites: 2 })
  })
})
