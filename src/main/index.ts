import { app, BrowserWindow, globalShortcut, ipcMain, Menu, nativeImage, screen, Tray } from 'electron'
import { join } from 'node:path'
import * as config from './config'
import { corpoDoPedido, erroDaGroq, GROQ_URL, textoDaResposta, type Mensagem } from '../shared/groq'
import { posicaoNoTopo } from '../shared/posicao'
import type { Configuracoes, ResultadoConversa } from '../shared/tipos'

const LARGURA = 680
const ALTURA = 480

let janela: BrowserWindow | null = null
let bandeja: Tray | null = null
let atalhoAtual: string | null = null

if (!app.requestSingleInstanceLock()) app.quit()

function criarJanela() {
  janela = new BrowserWindow({
    width: LARGURA,
    height: ALTURA,
    show: false,
    frame: false,
    resizable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    backgroundColor: '#0f172a',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
    },
  })
  // A janela só mostra a tela do próprio app: nada de navegar ou abrir janelas.
  janela.webContents.on('will-navigate', (e) => e.preventDefault())
  janela.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
  janela.webContents.session.setPermissionRequestHandler((_wc, _perm, ok) => ok(false))
  janela.on('blur', () => janela?.hide())

  if (process.env.ELECTRON_RENDERER_URL) janela.loadURL(process.env.ELECTRON_RENDERER_URL)
  else janela.loadFile(join(__dirname, '../renderer/index.html'))
}

function abrir(tela: 'conversa' | 'configuracoes' = 'conversa') {
  if (!janela) return
  const area = screen.getDisplayNearestPoint(screen.getCursorScreenPoint()).workArea
  const { x, y } = posicaoNoTopo(area, LARGURA)
  janela.setPosition(x, y)
  janela.show()
  janela.focus()
  janela.webContents.send('abrir', tela)
}

function alternar() {
  if (janela?.isVisible()) janela.hide()
  else abrir()
}

function registrarAtalho(acc: string): boolean {
  try {
    return globalShortcut.register(acc, alternar)
  } catch {
    return false
  }
}

function criarBandeja() {
  bandeja = new Tray(nativeImage.createFromPath(join(__dirname, '../../resources/tray.png')))
  bandeja.setToolTip(app.getName())
  bandeja.on('click', () => abrir())
  const montarMenu = () =>
    Menu.buildFromTemplate([
      { label: 'Abrir', click: () => abrir() },
      { label: 'Configurações', click: () => abrir('configuracoes') },
      { type: 'separator' },
      { label: 'Sair', click: () => app.quit() },
    ])
  bandeja.setContextMenu(montarMenu())
}

function configuracoes(): Configuracoes {
  const c = config.ler()
  return {
    atalhoAbrir: c.atalhoAbrir,
    modelo: c.modelo,
    temChaveGroq: !!c.groqCifrada,
    iniciarComWindows: app.getLoginItemSettings().openAtLogin,
  }
}

async function conversar(historico: Mensagem[]): Promise<ResultadoConversa> {
  const chave = config.chaveGroq()
  if (!chave) return { ok: false, erro: 'Falta a chave da Groq. Coloque nas configurações.' }
  try {
    const r = await fetch(GROQ_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${chave}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(corpoDoPedido(config.ler().modelo, historico)),
      signal: AbortSignal.timeout(30_000),
    })
    if (!r.ok) return { ok: false, erro: erroDaGroq(r.status) }
    const texto = textoDaResposta(await r.json())
    return texto ? { ok: true, texto } : { ok: false, erro: 'A Groq respondeu vazio. Tente de novo.' }
  } catch {
    return { ok: false, erro: 'Sem conexão com a Groq. Confira a internet.' }
  }
}

function ligarIpc() {
  ipcMain.handle('configuracoes', () => configuracoes())
  ipcMain.handle('definirAtalho', (_e, acc: unknown) => {
    if (typeof acc !== 'string' || !acc) return { ok: false, erro: 'Combinação inválida.' }
    if (acc === atalhoAtual) return { ok: true }
    if (atalhoAtual) globalShortcut.unregister(atalhoAtual)
    if (!registrarAtalho(acc)) {
      if (atalhoAtual) registrarAtalho(atalhoAtual)
      return { ok: false, erro: 'Essa combinação já está em uso por outro programa. Escolha outra.' }
    }
    atalhoAtual = acc
    config.gravar({ atalhoAbrir: acc })
    return { ok: true }
  })
  // Enquanto grava uma combinação nova, o atalho atual sai do ar para não abrir/fechar a barra.
  ipcMain.handle('pausarAtalho', (_e, pausar: unknown) => {
    if (!atalhoAtual) return
    if (pausar === true) globalShortcut.unregister(atalhoAtual)
    else registrarAtalho(atalhoAtual)
  })
  ipcMain.handle('definirChaveGroq', (_e, chave: unknown) => {
    if (typeof chave !== 'string' || !chave.trim()) throw new Error('Chave vazia.')
    config.guardarChave(chave)
  })
  ipcMain.handle('apagarChaveGroq', () => config.apagarChave())
  ipcMain.handle('definirModelo', (_e, modelo: unknown) => {
    if (typeof modelo === 'string' && modelo.trim()) config.gravar({ modelo: modelo.trim() })
  })
  ipcMain.handle('definirIniciarComWindows', (_e, ligar: unknown) => {
    app.setLoginItemSettings({ openAtLogin: ligar === true })
  })
  ipcMain.handle('conversar', (_e, historico: unknown) => {
    const valido =
      Array.isArray(historico) &&
      historico.every((m) => (m?.papel === 'eu' || m?.papel === 'assistente') && typeof m?.texto === 'string')
    return valido ? conversar(historico as Mensagem[]) : { ok: false, erro: 'Conversa inválida.' }
  })
  ipcMain.handle('esconder', () => janela?.hide())
}

app.on('second-instance', () => abrir())

app.whenReady().then(() => {
  ligarIpc()
  criarJanela()
  criarBandeja()
  const acc = config.ler().atalhoAbrir
  if (registrarAtalho(acc)) atalhoAtual = acc
  // Sem atalho (combinação ocupada), abre as configurações para trocar.
  else janela?.webContents.once('did-finish-load', () => abrir('configuracoes'))
})

// App de bandeja: fechar a janela não encerra; só "Sair" no menu.
app.on('window-all-closed', () => {})
app.on('will-quit', () => globalShortcut.unregisterAll())
