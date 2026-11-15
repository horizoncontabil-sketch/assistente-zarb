// "Ei, Zarb": o reconhecedor offline não conhece a palavra "Zarb" e escreve o que ouviu
// ("ei zarbe", "ei sarb", "hey zap"...). Aqui se decide se aquilo foi o chamado.
import { normalizar } from './comandos'

// Palavras comuns que soam parecido e não são o chamado.
const PARECIDAS = new Set(['sabe', 'sabia', 'zap', 'sapo', 'saber'])

const SAUDACAO = new Set(['ei', 'hei', 'hey', 'ey', 'e', 'oi', 'ai'])

// Aproxima sons parecidos: s/z, b/p, vogal final que o reconhecedor acrescenta.
function som(p: string): string {
  return p
    .replace(/s/g, 'z')
    .replace(/p/g, 'b')
    .replace(/[eiy]$/, '')
    .replace(/(.)\1+/g, '$1')
}

function distancia(a: string, b: string): number {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)])
  for (let j = 1; j <= b.length; j++) d[0][j] = j
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
  return d[a.length][b.length]
}

export function ouviuOChamado(ouvido: string, nome = 'zarb'): boolean {
  const palavras = normalizar(ouvido).split(' ')
  const alvo = som(normalizar(nome))
  for (let i = 1; i < palavras.length; i++) {
    if (!SAUDACAO.has(palavras[i - 1]) || PARECIDAS.has(palavras[i])) continue
    const p = som(palavras[i])
    if (p.length >= 3 && p.length <= alvo.length + 2 && p[0] === alvo[0] && distancia(p, alvo) <= 1) return true
  }
  return false
}
