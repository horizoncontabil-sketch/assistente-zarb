import { app, safeStorage } from 'electron'
import { readFileSync, renameSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { MODELO_PADRAO } from '../shared/groq'

type Gravado = {
  atalhoAbrir: string
  modelo: string
  // Chave da Groq cifrada pelo Windows (DPAPI, via safeStorage), em base64. Nunca em texto puro.
  groqCifrada?: string
}

const PADRAO: Gravado = { atalhoAbrir: 'Control+Space', modelo: MODELO_PADRAO }

const arquivo = () => join(app.getPath('userData'), 'config.json')

export function ler(): Gravado {
  try {
    return { ...PADRAO, ...JSON.parse(readFileSync(arquivo(), 'utf8')) }
  } catch {
    return { ...PADRAO }
  }
}

export function gravar(mudanca: Partial<Gravado>): Gravado {
  const novo = { ...ler(), ...mudanca }
  const tmp = arquivo() + '.tmp'
  writeFileSync(tmp, JSON.stringify(novo, null, 2))
  renameSync(tmp, arquivo())
  return novo
}

export function guardarChave(chave: string) {
  if (!safeStorage.isEncryptionAvailable()) throw new Error('O cofre do Windows não está disponível.')
  gravar({ groqCifrada: safeStorage.encryptString(chave.trim()).toString('base64') })
}

export function apagarChave() {
  gravar({ groqCifrada: undefined })
}

export function chaveGroq(): string | null {
  const c = ler().groqCifrada
  if (!c) return null
  try {
    return safeStorage.decryptString(Buffer.from(c, 'base64'))
  } catch {
    return null
  }
}
