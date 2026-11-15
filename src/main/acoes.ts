// Execução das ações. A IA só chega aqui depois de validarAcao; ações que mexem fora do app
// (evento, Claude Code, atalho novo) só rodam quando o Paulo clica no botão do cartão.
import { shell } from 'electron'
import { spawn } from 'node:child_process'
import { existsSync, statSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import * as config from './config'
import * as dados from './dados'
import * as google from './google'
import { argumentosTerminal, codificar, pastaAceitavel, scriptClaude } from '../shared/claude'
import { tipoDoDestino } from '../shared/destino'
import { novaTarefa } from '../shared/tarefas'
import type { Atalho, Ok, Repetir, Tarefa } from '../shared/tipos'

export type Aviso = (o: 'tarefas' | 'eventos' | 'atalhos' | 'config') => void
let avisar: Aviso = () => {}
export function aoMudar(f: Aviso) {
  avisar = f
}

export function criarTarefa(titulo: string, quando: string | null, repetir: Repetir): Tarefa {
  const t = novaTarefa(randomUUID(), titulo.trim().slice(0, 200), quando, repetir, new Date())
  dados.mudarTarefas((l) => [...l, t])
  avisar('tarefas')
  // Opção: lembrete com horário vai também para o Google Agenda (e chega no celular pelo app do Google).
  if (quando && config.ler().copiarLembretesParaAgenda && google.estado().conectado) {
    google.criarEvento({ titulo: `Lembrete: ${t.titulo}`, inicio: quando, duracaoMin: 15, convidados: [], comMeet: false }).then(() => avisar('eventos'))
  }
  return t
}

export async function abrirAtalho(a: Atalho): Promise<Ok> {
  const tipo = tipoDoDestino(a.destino)
  if (!tipo) return { ok: false, erro: 'Destino do atalho inválido.' }
  if (tipo === 'site') {
    await shell.openExternal(a.destino)
    return { ok: true }
  }
  if (!existsSync(a.destino)) return { ok: false, erro: `Não achei ${a.destino}.` }
  const erro = await shell.openPath(a.destino)
  return erro ? { ok: false, erro } : { ok: true }
}

export function salvarAtalho(nome: string, destino: string, id?: string): Ok {
  const n = nome.trim().slice(0, 80)
  const d = destino.trim()
  const tipo = tipoDoDestino(d)
  if (!n) return { ok: false, erro: 'Dê um nome ao atalho.' }
  if (!tipo) return { ok: false, erro: 'Use um link que comece com https:// ou um caminho do Windows (C:\\...).' }
  const repetido = dados.ler.atalhos().find((a) => a.nome.toLowerCase() === n.toLowerCase() && a.id !== id)
  if (repetido) return { ok: false, erro: `Já existe um atalho "${repetido.nome}".` }
  dados.mudarAtalhos((l) => (id ? l.map((a) => (a.id === id ? { ...a, nome: n, destino: d, tipo } : a)) : [...l, { id: randomUUID(), nome: n, destino: d, tipo }]))
  avisar('atalhos')
  return { ok: true }
}

export function mandarClaude(pastaId: string, pedido: string): Promise<Ok> {
  const pasta = config.ler().pastasClaude.find((p) => p.id === pastaId)
  const texto = pedido.trim()
  if (!pasta) return Promise.resolve({ ok: false, erro: 'Escolha a pasta do projeto.' })
  if (!texto) return Promise.resolve({ ok: false, erro: 'O pedido está vazio.' })
  if (!pastaAceitavel(pasta.caminho) || !existsSync(pasta.caminho) || !statSync(pasta.caminho).isDirectory()) {
    return Promise.resolve({ ok: false, erro: `A pasta ${pasta.caminho} não existe mais.` })
  }
  // Janela visível do Windows Terminal; sem ele, uma janela do PowerShell.
  return new Promise((resolver) => {
    const wt = spawn('wt.exe', argumentosTerminal(pasta.caminho, texto), { detached: true, stdio: 'ignore' })
    wt.once('spawn', () => {
      wt.unref()
      resolver({ ok: true })
    })
    wt.once('error', () => {
      // detached no Windows abre o PowerShell no próprio console, visível.
      const ps = spawn('powershell.exe', ['-NoExit', '-EncodedCommand', codificar(scriptClaude(pasta.caminho, texto))], {
        cwd: pasta.caminho,
        detached: true,
        stdio: 'ignore',
      })
      ps.once('spawn', () => {
        ps.unref()
        resolver({ ok: true })
      })
      ps.once('error', () => resolver({ ok: false, erro: 'Não consegui abrir o terminal.' }))
    })
  })
}
