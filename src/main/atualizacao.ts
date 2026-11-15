// Atualização automática (decisão do Paulo, 15/11): baixa a versão nova do GitHub, confere a
// assinatura nossa e instala sozinho quando o painel estiver fechado. Sem assinatura válida, não instala.
import { app } from 'electron'
import { autoUpdater } from 'electron-updater'
import { readFileSync } from 'node:fs'
import { assinaturaConfere, CHAVE_PUBLICA } from '../shared/assinatura'

const REPO = 'https://github.com/horizoncontabil-sketch/assistente-zarb/releases/download'

import type { EstadoAtualizacao } from '../shared/tipos'
export type { EstadoAtualizacao }


let estado: EstadoAtualizacao = { tipo: 'em-dia', conferidoEm: null }
let avisar: () => void = () => {}
let podeInstalarAgora: () => boolean = () => false

export const estadoAtualizacao = () => ({ ...estado, versao_atual: app.getVersion() })

function mudar(e: EstadoAtualizacao) {
  estado = e
  avisar()
}

async function conferirAssinatura(arquivo: string, versao: string, nome: string): Promise<boolean> {
  try {
    const r = await fetch(`${REPO}/v${versao}/${encodeURIComponent(nome)}.sig`, { signal: AbortSignal.timeout(30_000) })
    return r.ok && assinaturaConfere(readFileSync(arquivo), await r.text())
  } catch {
    return false
  }
}

// Chamado quando o painel fecha e a cada verificação: instala se houver versão pronta.
export function talvezInstalar() {
  if (estado.tipo === 'pronta' && podeInstalarAgora()) autoUpdater.quitAndInstall(true, true)
}

export function iniciar(aoMudar: () => void, ocioso: () => boolean) {
  avisar = aoMudar
  podeInstalarAgora = ocioso
  if (!app.isPackaged) return mudar({ tipo: 'desligada', motivo: 'Versão de desenvolvimento.' })
  if (!CHAVE_PUBLICA) return mudar({ tipo: 'desligada', motivo: 'Chave das versões ainda não configurada.' })

  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = false // só instala depois de conferir a assinatura
  autoUpdater.on('update-not-available', () => mudar({ tipo: 'em-dia', conferidoEm: new Date().toISOString() }))
  autoUpdater.on('download-progress', (p) => estado.tipo === 'baixando' && mudar({ ...estado, porcento: Math.round(p.percent) }))
  autoUpdater.on('update-available', (i) => mudar({ tipo: 'baixando', versao: i.version, porcento: 0 }))
  autoUpdater.on('update-downloaded', async (i) => {
    const nome = i.files[0]?.url ?? ''
    if (await conferirAssinatura(i.downloadedFile, i.version, nome)) {
      mudar({ tipo: 'pronta', versao: i.version })
      talvezInstalar()
    } else {
      mudar({ tipo: 'recusada', versao: i.version, motivo: 'A assinatura da versão nova não confere. Não foi instalada.' })
    }
  })
  autoUpdater.on('error', () => mudar({ tipo: 'erro', motivo: 'Não consegui procurar atualização agora.' }))

  const conferir = () => {
    if (estado.tipo === 'pronta') return talvezInstalar()
    if (estado.tipo !== 'baixando') autoUpdater.checkForUpdates().catch(() => {})
  }
  setTimeout(conferir, 20_000)
  setInterval(conferir, 30 * 60_000)
}
