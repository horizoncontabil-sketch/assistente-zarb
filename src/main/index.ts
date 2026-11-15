import { app, BrowserWindow, clipboard, dialog, globalShortcut, ipcMain, Menu, nativeImage, Notification, screen, shell, Tray } from 'electron'
import { randomUUID } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import * as acoes from './acoes'
import * as assistente from './assistente'
import * as atualizacao from './atualizacao'
import * as config from './config'
import * as dados from './dados'
import * as google from './google'
import * as groq from './groq'
import * as pc from './pc'
import { ehPrivado, FORMATOS_PRIVADOS } from '../shared/copias'
import { descreverQuando } from '../shared/datas'
import { linkSeguro } from '../shared/destino'
import { eventosParaAvisar } from '../shared/google'
import { lembretesDeHabito, registrar as registrarNoHabito, TODO_DIA, type Habito } from '../shared/habitos'
import { bordaMaisProxima, horizontal, posicaoValida, posicionarJanela } from '../shared/posicao'
import { pastaAceitavel } from '../shared/claude'
import { adiar, concluir, devidas } from '../shared/tarefas'
import type { ComandoJanela, Configuracoes, Mensagem, Mudou, NovoHabito, PedidoPc, QualAtalho, RascunhoEvento, Repetir } from '../shared/tipos'

const APP_ID = 'br.com.zarbmedia.assistente'
// A janela é transparente e maior que o entalho: o espaço vazio deixa o clique passar.
const LARGURA = 960
const ALTURA = 660
// Comprimento do entalho ao longo da borda (deitado no topo e embaixo, em pé nas laterais).
const COMPRIMENTO_DEITADO = 340
const COMPRIMENTO_EM_PE = 210

let janela: BrowserWindow | null = null
let bandeja: Tray | null = null
let expandido = false
// Janela de escolher pasta aberta: perder o foco para ela não fecha o painel.
let dialogoAberto = false
const atalhosAtivos: Partial<Record<QualAtalho, string>> = {}

if (!app.requestSingleInstanceLock()) app.quit()
// Datas e campos de data sempre em português, qualquer que seja o idioma do Windows.
app.commandLine.appendSwitch('lang', 'pt-BR')
app.setAppUserModelId(APP_ID)

// ---------- janela do entalho ----------

const recursos = () => (app.isPackaged ? process.resourcesPath : join(__dirname, '../../resources'))

let arrastando: ReturnType<typeof setInterval> | null = null
let telaDoEntalho: number | null = null

function areaDaTela() {
  const telas = screen.getAllDisplays()
  return (telas.find((t) => t.id === telaDoEntalho) ?? screen.getPrimaryDisplay()).workArea
}

function posicionar() {
  if (!janela || arrastando) return
  const pos = config.ler().posicao
  const comprimento = horizontal(pos.borda) ? COMPRIMENTO_DEITADO : COMPRIMENTO_EM_PE
  const r = posicionarJanela(pos, areaDaTela(), LARGURA, ALTURA, comprimento)
  janela.setBounds({ x: r.x, y: r.y, width: LARGURA, height: ALTURA })
  janela.webContents.send('posicao', { borda: pos.borda, deslocamento: r.deslocamento, arrastando: false })
}

// Arrastar: a janela segue o ponteiro; ao soltar, gruda na borda mais próxima da tela onde ele está.
function comecarArraste() {
  if (!janela || arrastando) return
  janela.setIgnoreMouseEvents(false)
  janela.webContents.send('posicao', { borda: 'topo', deslocamento: (LARGURA - COMPRIMENTO_DEITADO) / 2, arrastando: true })
  const inicio = Date.now()
  arrastando = setInterval(() => {
    const p = screen.getCursorScreenPoint()
    janela?.setPosition(Math.round(p.x - LARGURA / 2), Math.round(p.y - 19))
    if (Date.now() - inicio > 30_000) terminarArraste() // o botão foi solto fora: não fica preso
  }, 16)
}

function terminarArraste() {
  if (!arrastando) return
  clearInterval(arrastando)
  arrastando = null
  const p = screen.getCursorScreenPoint()
  const tela = screen.getDisplayNearestPoint(p)
  telaDoEntalho = tela.id
  config.gravar({ posicao: bordaMaisProxima(p, tela.workArea) })
  posicionar()
  if (!expandido) janela?.setIgnoreMouseEvents(true, { forward: true })
  mudou('config')
}

function criarJanela() {
  janela = new BrowserWindow({
    width: LARGURA,
    height: ALTURA,
    show: false,
    frame: false,
    transparent: true,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    hasShadow: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      spellcheck: false,
    },
  })
  janela.setAlwaysOnTop(true, 'screen-saver')
  janela.setVisibleOnAllWorkspaces(true)
  janela.setIgnoreMouseEvents(true, { forward: true })
  posicionar()

  const wc = janela.webContents
  wc.on('will-navigate', (e) => e.preventDefault())
  wc.setWindowOpenHandler(() => ({ action: 'deny' }))
  // Só o microfone (para falar e para o "Ei, Zarb"); nada mais.
  wc.session.setPermissionRequestHandler((_wc, perm, ok, det) => {
    const soAudio = perm === 'media' && (det as { mediaTypes?: string[] }).mediaTypes?.every((m) => m === 'audio')
    ok(!!soAudio)
  })
  wc.session.setPermissionCheckHandler((_wc, perm) => perm === 'media')

  janela.on('blur', () => {
    if (expandido && !dialogoAberto) enviar({ tipo: 'recolher' })
  })
  if (process.env.ELECTRON_RENDERER_URL) janela.loadURL(process.env.ELECTRON_RENDERER_URL)
  else janela.loadFile(join(__dirname, '../renderer/index.html'))
  wc.on('did-finish-load', () => {
    posicionar()
    if (config.ler().entalhoSempreVisivel) janela?.showInactive()
  })
}

function enviar(c: ComandoJanela) {
  if (!janela) return
  if (c.tipo === 'expandir' || c.tipo === 'alternar' || c.tipo === 'falar' || c.tipo === 'aviso') {
    if (!janela.isVisible()) janela.showInactive()
  }
  janela.webContents.send('comando', c)
}

function mudou(o: Mudou) {
  janela?.webContents.send('mudou', o)
}

function definirExpandido(sim: boolean) {
  if (!janela) return
  expandido = sim
  if (sim) {
    janela.setIgnoreMouseEvents(false)
    janela.show()
    janela.focus()
  } else {
    janela.setIgnoreMouseEvents(true, { forward: true })
    // Devolve o foco ao programa de antes.
    janela.blur()
    if (!config.ler().entalhoSempreVisivel) janela.hide()
    atualizacao.talvezInstalar()
  }
}

// ---------- atalhos de teclado ----------

const acaoDoAtalho: Record<QualAtalho, () => void> = {
  atalhoAbrir: () => enviar({ tipo: 'alternar' }),
  atalhoFalar: () => enviar({ tipo: 'falar' }),
  atalhoCopiados: () => enviar({ tipo: 'expandir', aba: 'copiados' }),
}

function registrar(qual: QualAtalho, acc: string): boolean {
  try {
    if (!globalShortcut.register(acc, acaoDoAtalho[qual])) return false
    atalhosAtivos[qual] = acc
    return true
  } catch {
    return false
  }
}

function registrarTodos() {
  const c = config.ler()
  const falhas = (['atalhoAbrir', 'atalhoFalar', 'atalhoCopiados'] as QualAtalho[]).filter((q) => !registrar(q, c[q]))
  if (falhas.length) {
    new Notification({ title: 'Assistente Zarb', body: 'Um atalho de teclado está em uso por outro programa. Troque em Configurações.' }).show()
  }
}

// ---------- lembretes, agenda e cópias ----------

function notificar(titulo: string, corpo: string) {
  if (!Notification.isSupported() || config.ler().silenciarAvisos) return
  const n = new Notification({ title: titulo, body: corpo })
  n.on('click', () => enviar({ tipo: 'expandir', aba: 'hoje' }))
  n.show()
}

function verificarLembretes() {
  const agora = new Date()
  const vencidos = devidas(dados.ler.tarefas(), agora)
  if (!vencidos.length) return
  dados.mudarTarefas((l) => l.map((t) => (vencidos.some((v) => v.id === t.id) ? { ...t, avisada: true } : t)))
  mudou('tarefas')
  for (const t of vencidos) {
    // Lembrete de mais de 5 min atrás: o PC estava desligado ou dormindo.
    const atrasado = agora.getTime() - new Date(t.quando!).getTime() > 5 * 60_000
    enviar({ tipo: 'aviso', aviso: { tipo: 'lembrete', tarefa: t, atrasado } })
    notificar(atrasado ? 'Lembrete perdido' : 'Lembrete', atrasado ? `${t.titulo} (era ${descreverQuando(t.quando!, agora)})` : t.titulo)
  }
}

let erroAgenda: string | null = null
async function lerAgenda() {
  if (!google.estado().conectado) return
  const hoje = new Date()
  const de = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate())
  const ate = new Date(de.getTime() + 8 * 86_400_000)
  try {
    dados.gravarAgenda(await google.listarEventos(de, ate))
    erroAgenda = null
  } catch (e) {
    erroAgenda = e instanceof Error ? e.message : 'Não deu para ler a agenda.'
  }
  mudou('eventos')
  mudou('config')
}

const eventosAvisados = new Set<string>()
function verificarEventos() {
  const agora = new Date()
  const antes = config.ler().avisoEventoMin
  const marcos = antes > 1 ? [antes, 1] : [1]
  for (const { e, min, marco, chaves } of eventosParaAvisar(dados.ler.agenda().eventos, agora, marcos, eventosAvisados)) {
    chaves.forEach((c) => eventosAvisados.add(c))
    enviar({ tipo: 'aviso', aviso: { tipo: 'evento', evento: e, minutos: min, marco } })
    if (marco === 1) notificar(e.titulo, e.meet ? 'Começa em 1 minuto. Entre pelo assistente.' : 'Começa em 1 minuto.')
  }
}

function verificarHabitos() {
  const agora = new Date()
  for (const h of lembretesDeHabito(dados.ler.habitos(), agora, dados.ler.avisosHabitos())) {
    dados.marcarAvisoHabito(h.id, agora)
    enviar({ tipo: 'aviso', aviso: { tipo: 'habito', habito: h } })
    notificar('Hábito', h.nome)
  }
}

let ultimaCopia = ''
let lendoCopia = false
const formato = (f: string) => `electron application/osclipboard;format="${f}"`

async function podeEntrarNoHistorico(): Promise<number | null> {
  try {
    const [item] = await clipboard.read()
    const tipo = formato('CanIncludeInClipboardHistory')
    if (!item?.types.includes(tipo)) return null
    const buf = Buffer.from(await ((await item.getType(tipo)) as Blob).arrayBuffer())
    return buf.length >= 4 ? buf.readUInt32LE(0) : null
  } catch {
    return null
  }
}

async function vigiarCopias() {
  if (lendoCopia || !config.ler().copiasAtivas) return
  lendoCopia = true
  try {
    const texto = await clipboard.readText()
    if (!texto || texto === ultimaCopia) return
    ultimaCopia = texto
    const presentes = (await Promise.all(FORMATOS_PRIVADOS.map(async (f) => ((await clipboard.has(formato(f)).catch(() => false)) ? f : null)))).filter(
      (f): f is string => !!f,
    )
    if (ehPrivado(presentes, await podeEntrarNoHistorico())) return
    if (dados.novaCopia(texto)) mudou('copias')
  } catch {
    // Área de transferência ocupada por outro programa: tenta na próxima volta.
  } finally {
    lendoCopia = false
  }
}

// ---------- bandeja ----------

function criarBandeja() {
  bandeja = new Tray(nativeImage.createFromPath(join(recursos(), 'tray.png')))
  bandeja.setToolTip('Assistente Zarb')
  bandeja.on('click', () => enviar({ tipo: 'expandir' }))
  bandeja.setContextMenu(
    Menu.buildFromTemplate([
      { label: 'Abrir', click: () => enviar({ tipo: 'expandir' }) },
      { label: 'Copiados', click: () => enviar({ tipo: 'expandir', aba: 'copiados' }) },
      { label: 'Configurações', click: () => enviar({ tipo: 'expandir', aba: 'config' }) },
      { type: 'separator' },
      { label: 'Sair', click: () => app.quit() },
    ]),
  )
}

// ---------- ponte com a tela ----------

const texto = (v: unknown, max = 4000) => (typeof v === 'string' ? v.slice(0, max) : '')
const REPETIR = new Set(['diario', 'dias_uteis', 'semanal', 'mensal'])
const QUAIS = new Set(['atalhoAbrir', 'atalhoFalar', 'atalhoCopiados'])

function configuracoes(): Configuracoes {
  const c = config.ler()
  return {
    atalhoAbrir: c.atalhoAbrir,
    atalhoFalar: c.atalhoFalar,
    atalhoCopiados: c.atalhoCopiados,
    modelo: c.modelo,
    temChaveGroq: !!c.groqCifrada,
    iniciarComWindows: app.getLoginItemSettings().openAtLogin,
    entalhoSempreVisivel: c.entalhoSempreVisivel,
    responderFalando: c.responderFalando,
    chamadoPorVoz: c.chamadoPorVoz,
    copiasAtivas: c.copiasAtivas,
    google: google.estado(),
    avisoEventoMin: c.avisoEventoMin,
    copiarLembretesParaAgenda: c.copiarLembretesParaAgenda,
    pastasClaude: c.pastasClaude,
    posicao: c.posicao,
    silenciarAvisos: c.silenciarAvisos,
    modeloVozDisponivel: existsSync(join(recursos(), 'voz', 'modelo-pt.tar.gz')),
  }
}

function historicoValido(h: unknown): Mensagem[] {
  if (!Array.isArray(h)) return []
  return h
    .filter((m) => (m?.papel === 'eu' || m?.papel === 'assistente') && typeof m?.texto === 'string')
    .slice(-20)
    .map((m) => ({ papel: m.papel, texto: m.texto.slice(0, 4000) }))
}

function rascunhoValido(r: unknown): RascunhoEvento | null {
  const x = r as RascunhoEvento
  if (!x || typeof x.titulo !== 'string' || !x.titulo.trim() || typeof x.inicio !== 'string' || Number.isNaN(new Date(x.inicio).getTime())) return null
  const d = Number(x.duracaoMin)
  return {
    titulo: x.titulo.trim().slice(0, 200),
    inicio: x.inicio,
    duracaoMin: Number.isInteger(d) && d >= 5 && d <= 720 ? d : 30,
    convidados: Array.isArray(x.convidados) ? x.convidados.filter((e) => typeof e === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)).slice(0, 20) : [],
    comMeet: x.comMeet === true,
  }
}

function habitoValido(v: unknown): NovoHabito | null {
  const h = v as NovoHabito
  const nome = typeof h?.nome === 'string' ? h.nome.trim().slice(0, 80) : ''
  const dias = Array.isArray(h?.dias) ? [...new Set(h.dias.filter((d) => Number.isInteger(d) && d >= 0 && d <= 6))] : TODO_DIA
  if (!nome || !dias.length) return null
  const m = h.meta
  const meta =
    m && Number(m.total) > 0 && Number(m.passo) > 0 && typeof m.unidade === 'string'
      ? { total: Number(m.total), passo: Number(m.passo), unidade: m.unidade.trim().slice(0, 20) || 'vezes' }
      : null
  const l = h.lembrete
  const hora = (x: unknown) => typeof x === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(x)
  const lembrete: Habito['lembrete'] =
    l?.tipo === 'hora' && hora(l.hora)
      ? { tipo: 'hora', hora: l.hora }
      : l?.tipo === 'intervalo' && hora(l.de) && hora(l.ate) && Number(l.aCadaMin) >= 15
        ? { tipo: 'intervalo', aCadaMin: Math.round(Number(l.aCadaMin)), de: l.de, ate: l.ate }
        : null
  return { nome, dias, meta, lembrete }
}

function pedidoPcValido(v: unknown): PedidoPc | null {
  const p = v as PedidoPc
  const sim = (x: unknown) => x === true
  switch (p?.tipo) {
    case 'volume': {
      const m = p.mudanca ?? {}
      return { tipo: 'volume', mudanca: { nivel: typeof m.nivel === 'number' ? m.nivel : undefined, mudar: typeof m.mudar === 'number' ? m.mudar : undefined, mudo: typeof m.mudo === 'boolean' ? m.mudo : undefined } }
    }
    case 'brilho':
      return typeof p.nivel === 'number' ? { tipo: 'brilho', nivel: p.nivel } : null
    case 'energia':
      return ['bloquear', 'suspender', 'reiniciar', 'desligar'].includes(p.acao) ? { tipo: 'energia', acao: p.acao, confirmado: sim(p.confirmado) } : null
    case 'esvaziarLixeira':
    case 'limparTemporarios':
    case 'organizarAreaDeTrabalho':
      return { tipo: p.tipo, confirmado: sim(p.confirmado) }
    case 'fecharPrograma':
      return Number.isInteger(p.pid) ? { tipo: 'fecharPrograma', pid: p.pid, confirmado: sim(p.confirmado) } : null
    case 'mostrarDownload':
      return typeof p.nome === 'string' ? { tipo: 'mostrarDownload', nome: p.nome } : null
    case 'abrirDownloads':
      return { tipo: 'abrirDownloads' }
    default:
      return null
  }
}

function ligarIpc() {
  const h = ipcMain.handle.bind(ipcMain)
  h('configuracoes', () => configuracoes())
  h('tarefas', () => dados.ler.tarefas())
  h('eventos', () => ({ ...dados.ler.agenda(), erro: erroAgenda }))
  h('copias', () => dados.ler.copias())
  h('atalhos', () => dados.ler.atalhos())

  h('conversar', (_e, t: unknown, hist: unknown) => assistente.conversar(texto(t), historicoValido(hist)))
  h('transcrever', (_e, audio: unknown) => {
    if (!(audio instanceof Uint8Array) || audio.byteLength === 0) return { ok: false, erro: 'Áudio vazio.' }
    if (audio.byteLength > 20 * 1024 * 1024) return { ok: false, erro: 'Áudio longo demais.' }
    return groq.transcrever(audio)
  })

  h('criarTarefa', (_e, t: unknown, quando: unknown, rep: unknown) => {
    const titulo = texto(t, 200).trim()
    if (!titulo) return { ok: false, erro: 'Escreva a tarefa.' }
    const q = typeof quando === 'string' && !Number.isNaN(new Date(quando).getTime()) ? quando : null
    acoes.criarTarefa(titulo, q, q && REPETIR.has(rep as string) ? (rep as Repetir) : null)
    return { ok: true }
  })
  h('editarTarefa', (_e, id: unknown, t: unknown, quando: unknown, rep: unknown) => {
    const titulo = texto(t, 200).trim()
    if (typeof id !== 'string' || !titulo) return { ok: false, erro: 'Escreva a tarefa.' }
    const q = typeof quando === 'string' && !Number.isNaN(new Date(quando).getTime()) ? quando : null
    const repetir = q && REPETIR.has(rep as string) ? (rep as Repetir) : null
    dados.mudarTarefas((l) => l.map((x) => (x.id === id ? { ...x, titulo, quando: q, repetir, avisada: false } : x)))
    mudou('tarefas')
    return { ok: true }
  })
  const mudarTarefa = (id: unknown, f: Parameters<typeof dados.mudarTarefas>[0]) => {
    if (typeof id !== 'string') return
    dados.mudarTarefas(f)
    mudou('tarefas')
  }
  h('concluirTarefa', (_e, id: unknown) => mudarTarefa(id, (l) => l.map((t) => (t.id === id ? concluir(t, new Date()) : t))))
  h('reabrirTarefa', (_e, id: unknown) => mudarTarefa(id, (l) => l.map((t) => (t.id === id ? { ...t, feita: false, feitaEm: null } : t))))
  h('adiarTarefa', (_e, id: unknown, min: unknown) =>
    mudarTarefa(id, (l) => l.map((t) => (t.id === id && typeof min === 'number' ? adiar(t, min, new Date()) : t))),
  )
  // Apagar: a tela só chama depois do clique em "Apagar" e da confirmação.
  h('apagarTarefa', (_e, id: unknown) => mudarTarefa(id, (l) => l.filter((t) => t.id !== id)))

  h('criarEvento', async (_e, r: unknown) => {
    const rasc = rascunhoValido(r)
    if (!rasc) return { ok: false, erro: 'Evento incompleto.' }
    const res = await google.criarEvento(rasc)
    if (res.ok) lerAgenda()
    return res
  })
  h('atualizarAgenda', () => lerAgenda())
  h('conectarGoogle', async () => {
    const r = await google.conectar()
    mudou('config')
    if (r.ok) lerAgenda()
    return r
  })
  h('desconectarGoogle', () => {
    google.desconectar()
    dados.limparAgenda()
    mudou('config')
    mudou('eventos')
  })
  h('definirClienteGoogle', (_e, id: unknown, segredo: unknown) => {
    const r = google.definirCliente(texto(id, 300), texto(segredo, 300))
    mudou('config')
    return r
  })

  h('abrir', (_e, id: unknown) => {
    const a = dados.ler.atalhos().find((x) => x.id === id)
    return a ? acoes.abrirAtalho(a) : { ok: false, erro: 'Atalho não existe mais.' }
  })
  // Link de evento (Meet, Agenda) vindo da tela: só https.
  h('abrirLink', async (_e, url: unknown) => {
    if (!linkSeguro(url)) return { ok: false, erro: 'Link inválido.' }
    await shell.openExternal(url)
    return { ok: true }
  })
  h('salvarAtalho', (_e, nome: unknown, destino: unknown, id: unknown) => acoes.salvarAtalho(texto(nome, 80), texto(destino, 2000), typeof id === 'string' ? id : undefined))
  h('apagarAtalho', (_e, id: unknown) => {
    dados.mudarAtalhos((l) => l.filter((a) => a.id !== id))
    mudou('atalhos')
  })
  h('escolherPasta', async () => {
    if (!janela) return null
    dialogoAberto = true
    try {
      const r = await dialog.showOpenDialog(janela, { properties: ['openDirectory'] })
      return r.canceled ? null : (r.filePaths[0] ?? null)
    } finally {
      dialogoAberto = false
      janela.focus()
    }
  })

  h('copiar', async (_e, id: unknown) => {
    const c = dados.ler.copias().find((x) => x.id === id)
    if (!c) return
    ultimaCopia = c.texto
    await clipboard.writeText(c.texto)
    dados.novaCopia(c.texto)
    mudou('copias')
  })
  h('fixarCopia', (_e, id: unknown, fixada: unknown) => {
    dados.mudarCopias((l) => l.map((c) => (c.id === id ? { ...c, fixada: fixada === true } : c)))
    mudou('copias')
  })
  h('apagarCopia', (_e, id: unknown) => {
    dados.mudarCopias((l) => l.filter((c) => c.id !== id))
    mudou('copias')
  })
  h('limparCopias', () => {
    dados.mudarCopias((l) => l.filter((c) => c.fixada))
    mudou('copias')
  })

  h('mandarClaude', (_e, pastaId: unknown, pedido: unknown) => acoes.mandarClaude(texto(pastaId, 100), texto(pedido)))
  h('salvarPastaClaude', (_e, nome: unknown, caminho: unknown) => {
    const n = texto(nome, 60).trim()
    const c = texto(caminho, 500).trim()
    if (!n) return { ok: false, erro: 'Dê um nome à pasta.' }
    if (!pastaAceitavel(c) || !existsSync(c)) return { ok: false, erro: 'Escolha uma pasta que exista no PC.' }
    config.gravar({ pastasClaude: [...config.ler().pastasClaude, { id: randomUUID(), nome: n, caminho: c }] })
    mudou('config')
    return { ok: true }
  })
  h('apagarPastaClaude', (_e, id: unknown) => {
    config.gravar({ pastasClaude: config.ler().pastasClaude.filter((p) => p.id !== id) })
    mudou('config')
  })

  h('definirAtalho', (_e, qual: unknown, acc: unknown) => {
    if (!QUAIS.has(qual as string) || typeof acc !== 'string' || !acc) return { ok: false, erro: 'Combinação inválida.' }
    const q = qual as QualAtalho
    if (Object.entries(atalhosAtivos).some(([k, v]) => k !== q && v === acc)) return { ok: false, erro: 'Essa combinação já é outro atalho do assistente.' }
    const antigo = atalhosAtivos[q]
    if (antigo === acc) return { ok: true }
    if (antigo) globalShortcut.unregister(antigo)
    delete atalhosAtivos[q]
    if (!registrar(q, acc)) {
      if (antigo) registrar(q, antigo)
      return { ok: false, erro: 'Essa combinação já está em uso por outro programa. Escolha outra.' }
    }
    config.gravar({ [q]: acc })
    mudou('config')
    return { ok: true }
  })
  // Enquanto grava uma combinação nova, os atalhos saem do ar para não dispararem.
  h('pausarAtalhos', (_e, pausar: unknown) => {
    if (pausar === true) globalShortcut.unregisterAll()
    else for (const [q, acc] of Object.entries(atalhosAtivos)) registrar(q as QualAtalho, acc)
  })
  h('definirChaveGroq', (_e, chave: unknown) => {
    const k = texto(chave, 300).trim()
    if (!k) return { ok: false, erro: 'Chave vazia.' }
    try {
      config.gravar({ groqCifrada: config.cifrar(k) })
      mudou('config')
      return { ok: true }
    } catch {
      return { ok: false, erro: 'O cofre do Windows não respondeu.' }
    }
  })
  h('apagarChaveGroq', () => {
    config.gravar({ groqCifrada: undefined })
    mudou('config')
  })
  h('mudarConfig', (_e, m: unknown) => {
    const x = (m ?? {}) as Record<string, unknown>
    const mud: Partial<config.Gravado> = {}
    if (typeof x.modelo === 'string' && x.modelo.trim()) mud.modelo = x.modelo.trim().slice(0, 100)
    for (const k of ['entalhoSempreVisivel', 'responderFalando', 'chamadoPorVoz', 'copiasAtivas', 'copiarLembretesParaAgenda', 'silenciarAvisos'] as const) {
      if (typeof x[k] === 'boolean') mud[k] = x[k]
    }
    if (typeof x.avisoEventoMin === 'number' && x.avisoEventoMin >= 0 && x.avisoEventoMin <= 120) mud.avisoEventoMin = Math.round(x.avisoEventoMin)
    config.gravar(mud)
    if (mud.entalhoSempreVisivel === true) janela?.showInactive()
    mudou('config')
  })
  h('definirIniciarComWindows', (_e, ligar: unknown) => {
    app.setLoginItemSettings({ openAtLogin: ligar === true })
    mudou('config')
  })
  // Modelo de voz offline do "Ei, Zarb" (só lido do próprio instalador).
  h('modeloVoz', () => {
    const p = join(recursos(), 'voz', 'modelo-pt.tar.gz')
    return existsSync(p) ? new Uint8Array(readFileSync(p)) : null
  })

  h('atualizacao', () => atualizacao.estadoAtualizacao())
  h('habitos', () => dados.ler.habitos())
  h('salvarHabito', (_e, novo: unknown, id: unknown) => {
    const n = habitoValido(novo)
    if (!n) return { ok: false, erro: 'Dê um nome ao hábito e escolha pelo menos um dia.' }
    if (typeof id === 'string') dados.mudarHabitos((l) => l.map((x) => (x.id === id ? { ...x, ...n } : x)))
    else dados.mudarHabitos((l) => [...l, { ...n, id: randomUUID(), registro: {}, criadoEm: new Date().toISOString() }])
    mudou('habitos')
    return { ok: true }
  })
  h('apagarHabito', (_e, id: unknown) => {
    dados.mudarHabitos((l) => l.filter((x) => x.id !== id))
    mudou('habitos')
  })
  h('registrarHabito', (_e, id: unknown, delta: unknown) => {
    if (typeof delta !== 'number' || !Number.isFinite(delta)) return
    dados.mudarHabitos((l) => l.map((x) => (x.id === id ? registrarNoHabito(x, new Date(), delta) : x)))
    mudou('habitos')
  })
  h('pcEstado', () => pc.estado())
  h('pc', (_e, pedido: unknown) => {
    const p = pedidoPcValido(pedido)
    return p ? pc.executar(p) : { ok: false, erro: 'Pedido inválido.' }
  })
  h('arrastar', (_e, fase: unknown) => (fase === 'inicio' ? comecarArraste() : terminarArraste()))
  h('definirPosicao', (_e, p: unknown) => {
    const pos = posicaoValida(p)
    if (!pos) return
    config.gravar({ posicao: pos })
    posicionar()
    mudou('config')
  })
  h('expandido', (_e, sim: unknown) => definirExpandido(sim === true))
  h('mouseSobre', (_e, sim: unknown) => {
    if (!expandido) janela?.setIgnoreMouseEvents(sim !== true, { forward: true })
  })
  h('sair', () => app.quit())
}

// ---------- início ----------

app.on('second-instance', () => enviar({ tipo: 'expandir' }))

app.whenReady().then(() => {
  // Primeira vez: abre junto com o Windows (dá para desligar nas configurações).
  if (!config.ler().googleClientId && !existsSync(join(app.getPath('userData'), 'config.json'))) {
    config.gravar({})
    if (app.isPackaged) app.setLoginItemSettings({ openAtLogin: true })
  }
  acoes.aoMudar((o) => mudou(o))
  ligarIpc()
  criarJanela()
  criarBandeja()
  registrarTodos()
  screen.on('display-metrics-changed', posicionar)
  screen.on('display-added', posicionar)
  screen.on('display-removed', posicionar)

  setInterval(verificarLembretes, 15_000)
  setInterval(verificarEventos, 15_000)
  setInterval(verificarHabitos, 30_000)
  setInterval(vigiarCopias, 800)
  setInterval(lerAgenda, 5 * 60_000)
  setTimeout(verificarLembretes, 3000)
  lerAgenda()
  atualizacao.iniciar(() => mudou('config'), () => !expandido)
})

app.on('window-all-closed', () => {})
app.on('will-quit', () => globalShortcut.unregisterAll())

