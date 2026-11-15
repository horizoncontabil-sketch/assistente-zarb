import { contextBridge, ipcRenderer } from 'electron'
import type { ApiAssistente } from '../shared/tipos'

const api: ApiAssistente = {
  configuracoes: () => ipcRenderer.invoke('configuracoes'),
  definirAtalho: (acc) => ipcRenderer.invoke('definirAtalho', acc),
  pausarAtalho: (pausar) => ipcRenderer.invoke('pausarAtalho', pausar),
  definirChaveGroq: (chave) => ipcRenderer.invoke('definirChaveGroq', chave),
  apagarChaveGroq: () => ipcRenderer.invoke('apagarChaveGroq'),
  definirModelo: (modelo) => ipcRenderer.invoke('definirModelo', modelo),
  definirIniciarComWindows: (ligar) => ipcRenderer.invoke('definirIniciarComWindows', ligar),
  conversar: (historico) => ipcRenderer.invoke('conversar', historico),
  esconder: () => ipcRenderer.invoke('esconder'),
  aoAbrir: (cb) => {
    const ouvinte = (_e: unknown, tela: 'conversa' | 'configuracoes') => cb(tela)
    ipcRenderer.on('abrir', ouvinte)
    return () => ipcRenderer.removeListener('abrir', ouvinte)
  },
}

contextBridge.exposeInMainWorld('assistente', api)
