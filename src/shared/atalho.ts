// Monta o "accelerator" do Electron a partir de uma tecla apertada na tela de configurações.
// Devolve null enquanto só há modificadores (Ctrl, Shift...) ou quando falta modificador.

export type TeclaApertada = {
  key: string
  code: string
  ctrlKey: boolean
  altKey: boolean
  shiftKey: boolean
  metaKey: boolean
}

const SO_MODIFICADOR = new Set(['Control', 'Shift', 'Alt', 'Meta', 'AltGraph'])

function teclaPrincipal(t: TeclaApertada): string | null {
  if (t.code === 'Space') return 'Space'
  if (/^Key[A-Z]$/.test(t.code)) return t.code.slice(3)
  if (/^Digit[0-9]$/.test(t.code)) return t.code.slice(5)
  if (/^F([1-9]|1[0-9]|2[0-4])$/.test(t.code)) return t.code
  const especiais: Record<string, string> = {
    Enter: 'Enter', Tab: 'Tab', Backspace: 'Backspace', Delete: 'Delete',
    Insert: 'Insert', Home: 'Home', End: 'End', PageUp: 'PageUp', PageDown: 'PageDown',
    ArrowUp: 'Up', ArrowDown: 'Down', ArrowLeft: 'Left', ArrowRight: 'Right',
  }
  return especiais[t.code] ?? null
}

export function aceleradorDaTecla(t: TeclaApertada): string | null {
  if (SO_MODIFICADOR.has(t.key)) return null
  const principal = teclaPrincipal(t)
  if (!principal) return null
  const mods: string[] = []
  if (t.ctrlKey) mods.push('Control')
  if (t.altKey) mods.push('Alt')
  if (t.shiftKey) mods.push('Shift')
  if (t.metaKey) mods.push('Super')
  // Tecla de função sozinha pode; letra, número e espaço sozinhos atrapalhariam a digitação.
  if (mods.length === 0 && !/^F\d+$/.test(principal)) return null
  // Shift sozinho com letra é só letra maiúscula.
  if (mods.length === 1 && mods[0] === 'Shift' && !/^F\d+$/.test(principal)) return null
  return [...mods, principal].join('+')
}

export function aceleradorLegivel(acc: string): string {
  return acc
    .split('+')
    .map((p) => ({ Control: 'Ctrl', Super: 'Win', Space: 'Espaço', Up: '↑', Down: '↓', Left: '←', Right: '→' })[p] ?? p)
    .join(' + ')
}
