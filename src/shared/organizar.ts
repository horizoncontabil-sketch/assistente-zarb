// Organizar a área de trabalho: arquivos soltos vão para "Organizado\<tipo>". Atalhos ficam onde estão.
const TIPOS: [string, RegExp][] = [
  ['PDFs', /\.pdf$/i],
  ['Imagens', /\.(png|jpe?g|gif|webp|bmp|heic|svg|psd|ai)$/i],
  ['Planilhas', /\.(xlsx?|csv|ods)$/i],
  ['Apresentações', /\.(pptx?|key|odp)$/i],
  ['Documentos', /\.(docx?|txt|rtf|odt|md)$/i],
  ['Vídeos', /\.(mp4|mov|avi|mkv|webm)$/i],
  ['Áudios', /\.(mp3|wav|m4a|ogg|opus)$/i],
  ['Compactados', /\.(zip|rar|7z|tar|gz)$/i],
]
const FICAM = /\.(lnk|url|ini)$|^desktop\.ini$/i

export function grupoDoArquivo(nome: string): string | null {
  if (FICAM.test(nome) || nome.startsWith('.')) return null
  return TIPOS.find(([, re]) => re.test(nome))?.[0] ?? 'Outros'
}

export function planoDeOrganizacao(arquivos: string[]): { pasta: string; arquivos: string[] }[] {
  const mapa = new Map<string, string[]>()
  for (const a of arquivos) {
    const g = grupoDoArquivo(a)
    if (g) mapa.set(g, [...(mapa.get(g) ?? []), a])
  }
  return [...mapa.entries()].map(([pasta, lista]) => ({ pasta, arquivos: lista.sort() })).sort((a, b) => b.arquivos.length - a.arquivos.length)
}

// Nome livre na pasta de destino: "relatorio (2).pdf" se já existir.
export function nomeLivre(nome: string, existentes: Set<string>): string {
  if (!existentes.has(nome.toLowerCase())) return nome
  const p = nome.lastIndexOf('.')
  const base = p > 0 ? nome.slice(0, p) : nome
  const ext = p > 0 ? nome.slice(p) : ''
  for (let i = 2; ; i++) {
    const n = `${base} (${i})${ext}`
    if (!existentes.has(n.toLowerCase())) return n
  }
}

export function tamanho(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} MB`
  return `${(bytes / 1024 ** 3).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} GB`
}
