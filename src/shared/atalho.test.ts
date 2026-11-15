import { describe, expect, it } from 'vitest'
import { aceleradorDaTecla, aceleradorLegivel } from './atalho'

const t = (key: string, code: string, m: Partial<Record<'ctrlKey' | 'altKey' | 'shiftKey' | 'metaKey', boolean>> = {}) => ({
  key, code, ctrlKey: false, altKey: false, shiftKey: false, metaKey: false, ...m,
})

describe('aceleradorDaTecla', () => {
  it('monta combinações com modificador', () => {
    expect(aceleradorDaTecla(t(' ', 'Space', { ctrlKey: true }))).toBe('Control+Space')
    expect(aceleradorDaTecla(t('K', 'KeyK', { ctrlKey: true, shiftKey: true }))).toBe('Control+Shift+K')
    expect(aceleradorDaTecla(t('1', 'Digit1', { altKey: true }))).toBe('Alt+1')
  })
  it('usa o código físico, não a letra (teclado ABNT, Alt Gr)', () => {
    expect(aceleradorDaTecla(t('ç', 'KeyC', { ctrlKey: true }))).toBe('Control+C')
  })
  it('espera a tecla principal enquanto só há modificador', () => {
    expect(aceleradorDaTecla(t('Control', 'ControlLeft', { ctrlKey: true }))).toBeNull()
  })
  it('recusa tecla comum sozinha ou só com Shift', () => {
    expect(aceleradorDaTecla(t('a', 'KeyA'))).toBeNull()
    expect(aceleradorDaTecla(t('A', 'KeyA', { shiftKey: true }))).toBeNull()
    expect(aceleradorDaTecla(t(' ', 'Space'))).toBeNull()
  })
  it('aceita tecla F sozinha', () => {
    expect(aceleradorDaTecla(t('F9', 'F9'))).toBe('F9')
  })
  it('recusa tecla desconhecida', () => {
    expect(aceleradorDaTecla(t('´', 'BracketLeft', { ctrlKey: true }))).toBeNull()
  })
})

it('aceleradorLegivel mostra em português', () => {
  expect(aceleradorLegivel('Control+Shift+Space')).toBe('Ctrl + Shift + Espaço')
})
