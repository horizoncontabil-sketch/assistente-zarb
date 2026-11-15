import { safeStorage } from 'electron'
import { gravarJson, lerJson } from './armazem'
import { MODELO_PADRAO } from '../shared/groq'
import { POSICAO_PADRAO } from '../shared/posicao'
import type { PastaClaude, Posicao } from '../shared/tipos'

export type Gravado = {
  atalhoAbrir: string
  atalhoFalar: string
  atalhoCopiados: string
  modelo: string
  entalhoSempreVisivel: boolean
  responderFalando: boolean
  chamadoPorVoz: boolean
  copiasAtivas: boolean
  avisoEventoMin: number
  copiarLembretesParaAgenda: boolean
  pastasClaude: PastaClaude[]
  posicao: Posicao
  silenciarAvisos: boolean
  googleClientId?: string
  // Segredos cifrados pelo Windows (DPAPI, via safeStorage), em base64. Nunca em texto puro.
  groqCifrada?: string
  googleSegredoCifrado?: string
  googleTokensCifrados?: string
  googleEmail?: string
}

const PADRAO: Gravado = {
  atalhoAbrir: 'Control+Space',
  atalhoFalar: 'Control+Shift+Space',
  atalhoCopiados: 'Control+Shift+V',
  modelo: MODELO_PADRAO,
  entalhoSempreVisivel: true,
  responderFalando: true,
  chamadoPorVoz: false,
  copiasAtivas: true,
  avisoEventoMin: 10,
  copiarLembretesParaAgenda: false,
  pastasClaude: [],
  posicao: POSICAO_PADRAO,
  silenciarAvisos: false,
}

export function ler(): Gravado {
  return { ...PADRAO, ...lerJson<Partial<Gravado>>('config', {}) }
}

export function gravar(mudanca: Partial<Gravado>): Gravado {
  const novo = { ...ler(), ...mudanca }
  for (const k of Object.keys(novo) as (keyof Gravado)[]) if (novo[k] === undefined) delete novo[k]
  gravarJson('config', novo)
  return novo
}

export function cifrar(texto: string): string {
  if (!safeStorage.isEncryptionAvailable()) throw new Error('O cofre do Windows não está disponível.')
  return safeStorage.encryptString(texto).toString('base64')
}

export function decifrar(base64: string | undefined): string | null {
  if (!base64) return null
  try {
    return safeStorage.decryptString(Buffer.from(base64, 'base64'))
  } catch {
    return null
  }
}
