// Histórico do que o Paulo copia. Fica só no PC.
import type { Copia } from './tipos'

export const LIMITE_COPIAS = 500
export const DIAS_COPIAS = 30
export const MAX_CARACTERES = 20_000

// Formatos que gerenciadores de senha (1Password, Bitwarden, KeePass...) colocam para pedir
// que o conteúdo não seja guardado. "CanIncludeInClipboardHistory" com valor 0 = não guardar.
export const FORMATOS_PRIVADOS = ['ExcludeClipboardContentFromMonitorProcessing', 'Clipboard Viewer Ignore']

export function ehPrivado(formatos: string[], podeEntrarNoHistorico: number | null): boolean {
  if (podeEntrarNoHistorico === 0) return true
  return formatos.some((f) => FORMATOS_PRIVADOS.includes(f))
}

export function adicionarCopia(lista: Copia[], texto: string, id: string, agora: Date): Copia[] {
  if (!texto.trim() || texto.length > MAX_CARACTERES) return lista
  const existente = lista.find((c) => c.texto === texto)
  const nova: Copia = { id: existente?.id ?? id, texto, em: agora.toISOString(), fixada: existente?.fixada ?? false }
  return podar([nova, ...lista.filter((c) => c.texto !== texto)], agora)
}

export function podar(lista: Copia[], agora: Date): Copia[] {
  const corte = agora.getTime() - DIAS_COPIAS * 86_400_000
  const fixadas = lista.filter((c) => c.fixada)
  const soltas = lista.filter((c) => !c.fixada && new Date(c.em).getTime() > corte).slice(0, LIMITE_COPIAS)
  return [...fixadas, ...soltas].sort((a, b) => b.em.localeCompare(a.em))
}

export function buscarCopias(lista: Copia[], busca: string): Copia[] {
  const b = busca.trim().toLowerCase()
  const achadas = b ? lista.filter((c) => c.texto.toLowerCase().includes(b)) : lista
  return [...achadas.filter((c) => c.fixada), ...achadas.filter((c) => !c.fixada)]
}
