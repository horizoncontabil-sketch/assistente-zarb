// Comandos diretos: resolvidos no próprio PC, sem gastar a Groq e funcionando sem internet.
import type { Atalho } from './tipos'

export function normalizar(t: string): string {
  return t
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\p{L}\p{N} ]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export type ComandoDireto =
  | { tipo: 'abrir'; atalho: Atalho }
  | { tipo: 'volume'; mudanca: { nivel?: number; mudar?: number; mudo?: boolean } }
  | { tipo: 'bloquear' }
  | { tipo: 'hoje' }
  | { tipo: 'aba'; aba: 'tarefas' | 'agenda' | 'copiados' | 'atalhos' | 'config' | 'habitos' | 'pc' | 'metas' | 'alimentacao' | 'corpo' }

const HOJE = /^(o que (eu )?tenho( pra| para)? hoje|minha agenda( de hoje)?|agenda( de)? hoje|meu dia|resumo do dia|hoje)$/
const ABAS: [RegExp, 'tarefas' | 'agenda' | 'copiados' | 'atalhos' | 'config' | 'habitos' | 'pc' | 'metas' | 'alimentacao' | 'corpo'][] = [
  [/^((minhas |ver )?tarefas( pendentes)?|tenho tarefas?( pendentes?)?|lista de tarefas)$/, 'tarefas'],
  [/^((minha |ver )?agenda( da semana)?|compromissos)$/, 'agenda'],
  [/^((ver )?copiados|historico( do que copiei)?|o que (eu )?copiei)$/, 'copiados'],
  [/^((meus |ver )?atalhos)$/, 'atalhos'],
  [/^(configuracoes|config|ajustes)$/, 'config'],
  [/^((meus )?habitos)$/, 'habitos'],
  [/^((minhas )?metas|minha meta)$/, 'metas'],
  [/^(alimentacao|dieta|refeicoes|o que (eu )?comi( hoje)?)$/, 'alimentacao'],
  [/^(corpo|peso|medidas|bioimpedancia)$/, 'corpo'],
  [/^(pc|computador)$/, 'pc'],
]

export function acharAtalho(nome: string, atalhos: Atalho[]): Atalho | null {
  const n = normalizar(nome).replace(/^(o|a|os|as|meu|minha) /, '')
  if (!n) return null
  const exato = atalhos.find((a) => normalizar(a.nome) === n)
  if (exato) return exato
  // Só aceita parecido quando há um candidato só; ambíguo vai para a IA perguntar.
  const parecidos = atalhos.filter((a) => {
    const an = normalizar(a.nome)
    return an.includes(n) || n.includes(an)
  })
  return parecidos.length === 1 ? parecidos[0] : null
}

export function comandoDireto(texto: string, atalhos: Atalho[]): ComandoDireto | null {
  const t = normalizar(texto).replace(/^(ei zarb|zarb) /, '').replace(/ (por favor|pf|pfv)$/, '')
  if (HOJE.test(t)) return { tipo: 'hoje' }
  for (const [re, aba] of ABAS) if (re.test(t)) return { tipo: 'aba', aba }
  if (/^(bloqueia|bloquear|trava|travar) (o pc|o computador|a tela)$/.test(t)) return { tipo: 'bloquear' }
  if (/^(aumenta|sobe|aumentar|subir) (o )?(volume|som)( um pouco)?$/.test(t)) return { tipo: 'volume', mudanca: { mudar: 10 } }
  if (/^(abaixa|baixa|diminui|abaixar|diminuir) (o )?(volume|som)( um pouco)?$/.test(t)) return { tipo: 'volume', mudanca: { mudar: -10 } }
  if (/^(muta|mutar|silencia|silenciar|tira) (o )?(som|volume|audio)$/.test(t)) return { tipo: 'volume', mudanca: { mudo: true } }
  const vol = t.match(/^(volume|som)( (em|no|pra|para))? (\d{1,3})( por cento)?$/)
  if (vol) return { tipo: 'volume', mudanca: { nivel: Math.min(100, Number(vol[4])) } }
  const abrir = t.match(/^(abre|abrir|abra|abrir o|abrir a|entra no|entra na|vai no|vai na) (.+)$/)
  if (abrir) {
    const atalho = acharAtalho(abrir[2], atalhos)
    if (atalho) return { tipo: 'abrir', atalho }
  }
  return null
}
