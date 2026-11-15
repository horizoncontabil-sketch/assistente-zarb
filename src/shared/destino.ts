import type { TipoAtalho } from './tipos'

// Destino de atalho: só https:// ou caminho absoluto do Windows. Nada de comando.
export function tipoDoDestino(destino: string): TipoAtalho | null {
  const d = destino.trim()
  if (/^https:\/\/[^\s/$.?#][^\s]*$/i.test(d)) {
    try {
      new URL(d)
      return 'site'
    } catch {
      return null
    }
  }
  if (/^([a-z]:\\|\\\\[^\\]+\\)[^<>|?*"]*$/i.test(d)) return /\.(exe|lnk|bat|cmd)$/i.test(d) ? 'programa' : 'pasta'
  return null
}

export function linkSeguro(url: unknown): url is string {
  return typeof url === 'string' && tipoDoDestino(url) === 'site'
}
