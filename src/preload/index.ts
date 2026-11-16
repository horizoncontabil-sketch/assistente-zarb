import { contextBridge, ipcRenderer } from 'electron'
import type { ApiAssistente, ComandoJanela, Mudou } from '../shared/tipos'

const i = (canal: string) => (...args: unknown[]) => ipcRenderer.invoke(canal, ...args)

const api: ApiAssistente = {
  configuracoes: i('configuracoes'),
  tarefas: i('tarefas'),
  eventos: i('eventos'),
  copias: i('copias'),
  atalhos: i('atalhos'),
  conversar: i('conversar'),
  transcrever: i('transcrever'),
  criarTarefa: i('criarTarefa'),
  editarTarefa: i('editarTarefa'),
  concluirTarefa: i('concluirTarefa'),
  reabrirTarefa: i('reabrirTarefa'),
  adiarTarefa: i('adiarTarefa'),
  apagarTarefa: i('apagarTarefa'),
  criarEvento: i('criarEvento'),
  atualizarAgenda: i('atualizarAgenda'),
  conectarGoogle: i('conectarGoogle'),
  desconectarGoogle: i('desconectarGoogle'),
  definirClienteGoogle: i('definirClienteGoogle'),
  abrir: i('abrir'),
  abrirLink: i('abrirLink'),
  salvarAtalho: i('salvarAtalho'),
  apagarAtalho: i('apagarAtalho'),
  escolherPasta: i('escolherPasta'),
  copiar: i('copiar'),
  fixarCopia: i('fixarCopia'),
  apagarCopia: i('apagarCopia'),
  limparCopias: i('limparCopias'),
  mandarClaude: i('mandarClaude'),
  salvarPastaClaude: i('salvarPastaClaude'),
  apagarPastaClaude: i('apagarPastaClaude'),
  definirAtalho: i('definirAtalho'),
  pausarAtalhos: i('pausarAtalhos'),
  definirChaveGroq: i('definirChaveGroq'),
  apagarChaveGroq: i('apagarChaveGroq'),
  mudarConfig: i('mudarConfig'),
  definirIniciarComWindows: i('definirIniciarComWindows'),
  modeloVoz: i('modeloVoz'),
  atualizacao: i('atualizacao'),
  habitos: i('habitos'),
  salvarHabito: i('salvarHabito'),
  apagarHabito: i('apagarHabito'),
  registrarHabito: i('registrarHabito'),
  adiarSono: i('adiarSono'),
  suspenderAgora: i('suspenderAgora'),
  saude: i('saude'),
  salvarPlano: i('salvarPlano'),
  registrarCorpo: i('registrarCorpo'),
  trocarCorpoDoDia: i('trocarCorpoDoDia'),
  salvarRefeicao: i('salvarRefeicao'),
  apagarRefeicao: i('apagarRefeicao'),
  salvarReceita: i('salvarReceita'),
  apagarReceita: i('apagarReceita'),
  salvarAlimento: i('salvarAlimento'),
  interpretarRefeicao: i('interpretarRefeicao'),
  pcEstado: i('pcEstado'),
  pc: i('pc'),
  arrastar: i('arrastar'),
  definirPosicao: i('definirPosicao'),
  aoPosicao: (cb) => {
    const f = (_e: unknown, p: Parameters<typeof cb>[0]) => cb(p)
    ipcRenderer.on('posicao', f)
    return () => ipcRenderer.removeListener('posicao', f)
  },
  expandido: i('expandido'),
  mouseSobre: i('mouseSobre'),
  sair: i('sair'),
  aoMudar: (cb) => {
    const f = (_e: unknown, o: Mudou) => cb(o)
    ipcRenderer.on('mudou', f)
    return () => ipcRenderer.removeListener('mudou', f)
  },
  aoComando: (cb) => {
    const f = (_e: unknown, c: ComandoJanela) => cb(c)
    ipcRenderer.on('comando', f)
    return () => ipcRenderer.removeListener('comando', f)
  },
} as ApiAssistente

contextBridge.exposeInMainWorld('assistente', api)
