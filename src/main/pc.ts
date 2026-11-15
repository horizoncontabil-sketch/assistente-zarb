// Funções do PC (só Windows). Cada comando roda num PowerShell escondido, com o texto fixo aqui:
// nada que venha da IA ou de fora entra no comando, só números já conferidos.
// Desligar, reiniciar, suspender, esvaziar a lixeira, limpar temporários, fechar programa e organizar
// a área de trabalho só rodam com "confirmado", que vem do botão de confirmação da tela.
import { app, shell } from 'electron'
import { execFile } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, renameSync, rmSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { nomeLivre, planoDeOrganizacao, tamanho } from '../shared/organizar'
import type { EstadoPc, Ok, PedidoPc } from '../shared/tipos'

const WINDOWS = process.platform === 'win32'

function powershell(script: string, ms = 20_000): Promise<string> {
  return new Promise((resolver, falhar) => {
    execFile(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', script],
      { windowsHide: true, timeout: ms, maxBuffer: 4 * 1024 * 1024 },
      (erro, saida) => (erro ? falhar(erro) : resolver(String(saida).trim())),
    )
  })
}

function rodar(exe: string, args: string[]): Promise<void> {
  return new Promise((resolver, falhar) => execFile(exe, args, { windowsHide: true }, (e) => (e ? falhar(e) : resolver())))
}

// Volume pelo Core Audio do Windows (IAudioEndpointVolume), compilado na hora pelo PowerShell.
const AUDIO = `
Add-Type -TypeDefinition @'
using System.Runtime.InteropServices;
[Guid("5CDF2C82-841E-4546-9722-0CF74078229A"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IAudioEndpointVolume {
  int f(); int g(); int h(); int i();
  int SetMasterVolumeLevelScalar(float fLevel, System.Guid pguidEventContext);
  int j();
  int GetMasterVolumeLevelScalar(out float pfLevel);
  int k(); int l(); int m(); int n();
  int SetMute([MarshalAs(UnmanagedType.Bool)] bool bMute, System.Guid pguidEventContext);
  int GetMute(out bool pbMute);
}
[Guid("D666063F-1587-4E43-81F1-B948E807363F"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IMMDevice { int Activate(ref System.Guid id, int clsCtx, int activationParams, out IAudioEndpointVolume aev); }
[Guid("A95664D2-9614-4F35-A746-DE8DB63617E6"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IMMDeviceEnumerator { int f(); int GetDefaultAudioEndpoint(int dataFlow, int role, out IMMDevice endpoint); }
[ComImport, Guid("BCDE0395-E52F-467C-8E3D-C4579291692E")] class MMDeviceEnumeratorComObject { }
public class AudioZarb {
  static IAudioEndpointVolume Vol() {
    var en = new MMDeviceEnumeratorComObject() as IMMDeviceEnumerator;
    IMMDevice dev = null; Marshal.ThrowExceptionForHR(en.GetDefaultAudioEndpoint(0, 1, out dev));
    IAudioEndpointVolume v = null; var id = typeof(IAudioEndpointVolume).GUID;
    Marshal.ThrowExceptionForHR(dev.Activate(ref id, 23, 0, out v)); return v;
  }
  public static float Volume { get { float v = -1; Marshal.ThrowExceptionForHR(Vol().GetMasterVolumeLevelScalar(out v)); return v; } set { Marshal.ThrowExceptionForHR(Vol().SetMasterVolumeLevelScalar(value, System.Guid.Empty)); } }
  public static bool Mudo { get { bool m; Marshal.ThrowExceptionForHR(Vol().GetMute(out m)); return m; } set { Marshal.ThrowExceptionForHR(Vol().SetMute(value, System.Guid.Empty)); } }
}
'@
`

async function lerVolume(): Promise<{ volume: number; mudo: boolean } | null> {
  try {
    const s = await powershell(`${AUDIO}; @{ v = [math]::Round([AudioZarb]::Volume * 100); m = [AudioZarb]::Mudo } | ConvertTo-Json -Compress`)
    const j = JSON.parse(s) as { v: number; m: boolean }
    return { volume: j.v, mudo: j.m }
  } catch {
    return null
  }
}

export async function mudarVolume(m: { nivel?: number; mudar?: number; mudo?: boolean }): Promise<{ volume: number; mudo: boolean } | null> {
  if (!WINDOWS) return null
  const atual = await lerVolume()
  if (!atual) return null
  const alvo = m.nivel ?? (m.mudar !== undefined ? atual.volume + m.mudar : atual.volume)
  const nivel = Math.min(100, Math.max(0, Math.round(alvo)))
  const mudo = m.mudo ?? (m.nivel !== undefined || m.mudar !== undefined ? false : atual.mudo)
  try {
    await powershell(`${AUDIO}; [AudioZarb]::Volume = ${(nivel / 100).toFixed(2)}; [AudioZarb]::Mudo = $${mudo ? 'true' : 'false'}`)
    return { volume: nivel, mudo }
  } catch {
    return null
  }
}

async function lerBrilho(): Promise<number | null> {
  try {
    const s = await powershell('(Get-CimInstance -Namespace root/WMI -ClassName WmiMonitorBrightness -ErrorAction Stop | Select-Object -First 1).CurrentBrightness')
    const n = Number(s)
    return Number.isFinite(n) && s !== '' ? n : null
  } catch {
    return null // monitor de mesa normalmente não deixa (só tela de notebook)
  }
}

async function lerLixeira(): Promise<{ itens: number; bytes: number } | null> {
  try {
    const s = await powershell(
      "$i = (New-Object -ComObject Shell.Application).NameSpace(10).Items(); $t = 0; foreach ($x in $i) { $t += [int64]$x.ExtendedProperty('Size') }; @{ n = $i.Count; b = $t } | ConvertTo-Json -Compress",
    )
    const j = JSON.parse(s) as { n: number; b: number }
    return { itens: j.n, bytes: j.b }
  } catch {
    return null
  }
}

let travadosVistos: { pid: number; nome: string; titulo: string }[] = []

async function lerProgramas(): Promise<{ travados: EstadoPc['travados']; abertos: string[] }> {
  try {
    const s = await powershell(
      "Get-Process | Where-Object { $_.MainWindowHandle -ne 0 } | ForEach-Object { @{ p = $_.Id; n = $_.ProcessName; t = $_.MainWindowTitle; r = $_.Responding } } | ConvertTo-Json -Compress",
    )
    const lista = ([] as { p: number; n: string; t: string; r: boolean }[]).concat(s ? JSON.parse(s) : [])
    travadosVistos = lista.filter((x) => !x.r).map((x) => ({ pid: x.p, nome: x.n, titulo: x.t }))
    return { travados: travadosVistos, abertos: [...new Set(lista.map((x) => x.n))].filter((n) => !/^(explorer|ApplicationFrameHost|TextInputHost|SystemSettings|Assistente Zarb)$/i.test(n)) }
  } catch {
    return { travados: [], abertos: [] }
  }
}

function tamanhoDaPasta(pasta: string, limite = 20_000): number {
  let total = 0
  let vistos = 0
  const pilha = [pasta]
  while (pilha.length && vistos < limite) {
    const atual = pilha.pop()!
    let itens: string[] = []
    try {
      itens = readdirSync(atual)
    } catch {
      continue
    }
    for (const nome of itens) {
      if (++vistos > limite) break
      const c = join(atual, nome)
      try {
        const st = statSync(c)
        if (st.isDirectory()) pilha.push(c)
        else total += st.size
      } catch {
        // arquivo em uso ou sem permissão: ignora
      }
    }
  }
  return total
}

function arquivosSoltos(pasta: string): string[] {
  try {
    return readdirSync(pasta).filter((n) => {
      try {
        return statSync(join(pasta, n)).isFile()
      } catch {
        return false
      }
    })
  } catch {
    return []
  }
}

function ultimosDownloads(): EstadoPc['downloads'] {
  const pasta = app.getPath('downloads')
  return arquivosSoltos(pasta)
    .filter((nome) => !nome.startsWith('.') && !/^desktop\.ini$/i.test(nome) && !/\.(crdownload|part|tmp)$/i.test(nome))
    .map((nome) => {
      const st = statSync(join(pasta, nome))
      return { nome, bytes: st.size, em: st.mtime.toISOString() }
    })
    .sort((a, b) => b.em.localeCompare(a.em))
    .slice(0, 5)
}

export async function estado(): Promise<EstadoPc> {
  const desktop = arquivosSoltos(app.getPath('desktop'))
  const grupos = planoDeOrganizacao(desktop)
  const base = {
    windows: WINDOWS,
    downloads: ultimosDownloads(),
    areaDeTrabalho: { soltos: grupos.reduce((n, g) => n + g.arquivos.length, 0), grupos },
    temporarios: tamanhoDaPasta(tmpdir()),
  }
  if (!WINDOWS) return { ...base, volume: null, mudo: null, brilho: null, lixeira: null, travados: [], abertos: [] }
  const [vol, brilho, lixeira, prog] = await Promise.all([lerVolume(), lerBrilho(), lerLixeira(), lerProgramas()])
  return { ...base, volume: vol?.volume ?? null, mudo: vol?.mudo ?? null, brilho, lixeira, travados: prog.travados, abertos: prog.abertos }
}

const SO_WINDOWS: Ok = { ok: false, erro: 'Isso só funciona no Windows.' }
const PRECISA_CONFIRMAR: Ok = { ok: false, erro: 'Precisa confirmar na tela.' }

export async function executar(p: PedidoPc): Promise<Ok & { texto?: string }> {
  switch (p.tipo) {
    case 'volume': {
      const r = await mudarVolume(p.mudanca)
      return r ? { ok: true, texto: r.mudo ? 'Som no mudo.' : `Volume em ${r.volume}%.` } : WINDOWS ? { ok: false, erro: 'Não consegui mudar o volume.' } : SO_WINDOWS
    }
    case 'brilho': {
      if (!WINDOWS) return SO_WINDOWS
      const n = Math.min(100, Math.max(0, Math.round(p.nivel)))
      try {
        await powershell(`(Get-CimInstance -Namespace root/WMI -ClassName WmiMonitorBrightnessMethods -ErrorAction Stop | Select-Object -First 1) | Invoke-CimMethod -MethodName WmiSetBrightness -Arguments @{ Timeout = 1; Brightness = ${n} }`)
        return { ok: true, texto: `Brilho em ${n}%.` }
      } catch {
        return { ok: false, erro: 'Este monitor não deixa mudar o brilho pelo Windows.' }
      }
    }
    case 'energia': {
      if (!WINDOWS) return SO_WINDOWS
      if (p.acao !== 'bloquear' && !p.confirmado) return PRECISA_CONFIRMAR
      const cmd: Record<typeof p.acao, [string, string[]]> = {
        bloquear: ['rundll32.exe', ['user32.dll,LockWorkStation']],
        suspender: ['rundll32.exe', ['powrprof.dll,SetSuspendState', '0,1,0']],
        reiniciar: ['shutdown.exe', ['/r', '/t', '5']],
        desligar: ['shutdown.exe', ['/s', '/t', '5']],
      }
      try {
        await rodar(...cmd[p.acao])
        return { ok: true }
      } catch {
        return { ok: false, erro: 'O Windows não aceitou o pedido.' }
      }
    }
    case 'esvaziarLixeira': {
      if (!WINDOWS) return SO_WINDOWS
      if (!p.confirmado) return PRECISA_CONFIRMAR
      const antes = await lerLixeira()
      try {
        await powershell('Clear-RecycleBin -Force -ErrorAction SilentlyContinue')
        return { ok: true, texto: antes ? `Lixeira esvaziada: ${tamanho(antes.bytes)} liberados.` : 'Lixeira esvaziada.' }
      } catch {
        return { ok: false, erro: 'Não consegui esvaziar a lixeira.' }
      }
    }
    case 'limparTemporarios': {
      if (!p.confirmado) return PRECISA_CONFIRMAR
      // Só o que tem mais de um dia: o que está em uso agora fica.
      const pasta = tmpdir()
      const corte = Date.now() - 86_400_000
      let liberado = 0
      for (const nome of readdirSync(pasta)) {
        const c = join(pasta, nome)
        try {
          const st = statSync(c)
          if (st.mtimeMs > corte) continue
          const t = st.isDirectory() ? tamanhoDaPasta(c, 5000) : st.size
          rmSync(c, { recursive: true, force: true })
          liberado += t
        } catch {
          // em uso: fica
        }
      }
      return { ok: true, texto: `Temporários limpos: ${tamanho(liberado)} liberados.` }
    }
    case 'fecharPrograma': {
      if (!WINDOWS) return SO_WINDOWS
      if (!p.confirmado) return PRECISA_CONFIRMAR
      const alvo = travadosVistos.find((t) => t.pid === p.pid)
      if (!alvo || !Number.isInteger(p.pid)) return { ok: false, erro: 'Esse programa não está mais na lista de travados.' }
      try {
        await powershell(`Stop-Process -Id ${p.pid} -Force -ErrorAction Stop`)
        return { ok: true, texto: `${alvo.nome} fechado.` }
      } catch {
        return { ok: false, erro: `Não consegui fechar o ${alvo.nome}.` }
      }
    }
    case 'organizarAreaDeTrabalho': {
      if (!p.confirmado) return PRECISA_CONFIRMAR
      const desktop = app.getPath('desktop')
      const plano = planoDeOrganizacao(arquivosSoltos(desktop))
      let movidos = 0
      for (const g of plano) {
        const destino = join(desktop, 'Organizado', g.pasta)
        mkdirSync(destino, { recursive: true })
        const existentes = new Set(readdirSync(destino).map((n) => n.toLowerCase()))
        for (const nome of g.arquivos) {
          const novo = nomeLivre(nome, existentes)
          try {
            renameSync(join(desktop, nome), join(destino, novo))
            existentes.add(novo.toLowerCase())
            movidos++
          } catch {
            // aberto em outro programa: fica onde está
          }
        }
      }
      return { ok: true, texto: `${movidos} arquivos foram para a pasta Organizado.` }
    }
    case 'mostrarDownload': {
      const caminho = join(app.getPath('downloads'), p.nome)
      // Só mostra na pasta (não abre: abrir um download poderia rodar um programa).
      if (p.nome.includes('/') || p.nome.includes('\\') || !existsSync(caminho)) return { ok: false, erro: 'Arquivo não encontrado.' }
      shell.showItemInFolder(caminho)
      return { ok: true }
    }
    case 'abrirDownloads': {
      const erro = await shell.openPath(app.getPath('downloads'))
      return erro ? { ok: false, erro } : { ok: true }
    }
  }
}
