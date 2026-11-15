import { app } from 'electron'
import { readFileSync, renameSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

// Arquivos JSON na pasta do app (%APPDATA%\Assistente Zarb). Gravação atômica: nunca fica meio arquivo.
const caminho = (nome: string) => join(app.getPath('userData'), `${nome}.json`)

export function lerJson<T>(nome: string, padrao: T): T {
  try {
    return JSON.parse(readFileSync(caminho(nome), 'utf8')) as T
  } catch {
    return padrao
  }
}

export function gravarJson(nome: string, dados: unknown) {
  const tmp = caminho(nome) + '.tmp'
  writeFileSync(tmp, JSON.stringify(dados, null, 2))
  renameSync(tmp, caminho(nome))
}
