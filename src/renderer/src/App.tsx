import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as PE } from 'react'
import { diaLocal, hora, mesmoDia } from '../../shared/datas'
import { eventosDoDia } from '../../shared/google'
import { ehDiaDele, feitoNoDia } from '../../shared/habitos'
import { horizontal, type Borda } from '../../shared/posicao'
import type { Aba, Aviso, Cartao, Mensagem, Resposta } from '../../shared/tipos'
import { Avisos } from './Alerta'
import { Painel } from './Painel'
import { usarAgora, usarDados, type Dados } from './usarDados'
import { usarChamado, usarGravacao } from './usarVoz'
import { api, calar, emQuanto, falando, falar, minutosAte } from './util'

export type Troca = { id: number; pergunta: string; resposta: Resposta | null; falado: boolean }
type Pos = { borda: Borda; deslocamento: number; arrastando: boolean }
type Toast = { texto: string; desfazer?: () => void; erro?: boolean }

const JANELA = { w: 960, h: 660 }
const COMPRIMENTO = { deitado: 340, emPe: 210 }
let proximoId = 1

export function App() {
  const dados = usarDados()
  const agora = usarAgora()
  const [expandido, setExpandido] = useState(false)
  const [aba, setAba] = useState<Aba | 'conversa'>('hoje')
  const [avisos, setAvisos] = useState<Aviso[]>([])
  const [trocas, setTrocas] = useState<Troca[]>([])
  const [pos, setPos] = useState<Pos>({ borda: 'topo', deslocamento: (JANELA.w - COMPRIMENTO.deitado) / 2, arrastando: false })
  const [sobre, setSobre] = useState(false)
  const [toast, setToast] = useState<Toast | null>(null)
  const [entendendo, setEntendendo] = useState<string | null>(null)
  // Pergunta da IA que ficou no ar: aparece no entalho enquanto ele ouve a resposta.
  const [pergunta, setPergunta] = useState<string | null>(null)
  const entrada = useRef<HTMLTextAreaElement>(null)
  const historicoRef = useRef<Mensagem[]>([])

  const abrirPainel = useCallback((a?: Aba | 'conversa') => {
    if (a) setAba(a)
    setExpandido(true)
  }, [])

  useEffect(() => api.aoPosicao(setPos), [])

  useEffect(() => {
    api.configuracoes().then((c) => {
      if (!c.temChaveGroq) abrirPainel('config')
    })
  }, [abrirPainel])

  useEffect(() => {
    api.expandido(expandido)
    if (expandido) setTimeout(() => entrada.current?.focus(), 200)
  }, [expandido])

  useEffect(() => {
    historicoRef.current = trocas
      .filter((t) => t.resposta && !t.resposta.erro)
      .flatMap((t) => [
        { papel: 'eu' as const, texto: t.pergunta },
        { papel: 'assistente' as const, texto: t.resposta!.texto },
      ])
  }, [trocas])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), toast.erro ? 7000 : 5000)
    return () => clearTimeout(t)
  }, [toast])

  // O pedido. Falado com o painel fechado: a resposta simples aparece só no entalho e é falada;
  // o que pede decisão (evento, Claude Code, desligar) abre o painel na conversa.
  const enviarRef = useRef<(texto: string, falado: boolean) => Promise<void>>(async () => {})
  const gravacao = usarGravacao(
    useCallback((t: string) => enviarRef.current(t, true), []),
    useCallback((e: string) => setToast({ texto: e, erro: true }), []),
  )

  // Pergunta sem resposta some depois de 20 s.
  useEffect(() => {
    if (!pergunta || gravacao.estado !== 'parado' || entendendo) return
    const t = setTimeout(() => setPergunta(null), 20_000)
    return () => clearTimeout(t)
  }, [pergunta, gravacao.estado, entendendo])

  enviarRef.current = async (texto: string, falado: boolean) => {
    const t = texto.trim()
    if (!t) return
    const id = proximoId++
    const painelAberto = expandido
    setPergunta(null)
    setTrocas((l) => [...l.slice(-19), { id, pergunta: t, resposta: null, falado }])
    if (!falado || painelAberto) {
      setAba('conversa')
      setExpandido(true)
    } else setEntendendo(t)
    const r = await api.conversar(t, historicoRef.current)
    setEntendendo(null)
    setTrocas((l) => l.map((x) => (x.id === id ? { ...x, resposta: r } : x)))
    if (falado && r.pergunta) setPergunta(r.texto)
    if (falado && !painelAberto && r.rapida && !r.pergunta) setToast({ texto: r.texto, desfazer: desfazerDe(r.cartoes), erro: r.erro })
    else if (!(falado && r.pergunta && !painelAberto)) {
      setAba(r.aba ?? 'conversa')
      setExpandido(true)
    }
    if (falado) {
      const ouvirDeNovo = r.pergunta ? () => gravacao.iniciar() : undefined
      if (dados.config?.responderFalando) falar(r.texto, ouvirDeNovo)
      else ouvirDeNovo?.()
    }
  }

  const chamado = usarChamado(!!dados.config?.chamadoPorVoz && !!dados.config.modeloVozDisponivel, gravacao.estado !== 'parado' || !!entendendo, () => {
    calar()
    gravacao.iniciar()
  })

  useEffect(
    () =>
      api.aoComando((c) => {
        if (c.tipo === 'alternar') setExpandido((e) => !e)
        else if (c.tipo === 'expandir') abrirPainel(c.aba)
        else if (c.tipo === 'recolher') setExpandido(false)
        else if (c.tipo === 'falar') {
          if (falando()) calar()
          gravacao.alternar()
        } else if (c.tipo === 'aviso') setAvisos((l) => [...l.filter((a) => chave(a) !== chave(c.aviso)), c.aviso])
      }),
    [abrirPainel, gravacao],
  )

  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || document.body.dataset.gravandoAtalho) return
      calar()
      if (gravacao.estado === 'ouvindo') gravacao.cancelar()
      else setExpandido(false)
    }
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  }, [gravacao])

  const aviso = avisos[0] ?? null
  const tirarAviso = () => setAvisos((l) => l.slice(1))
  const toque = aviso?.tipo === 'evento' && aviso.marco > 1

  // O toque de "reunião em 10 min" some sozinho.
  useEffect(() => {
    if (!toque) return
    const t = setTimeout(tirarAviso, 20_000)
    return () => clearTimeout(t)
  }, [toque, aviso])

  const modo = pos.arrastando
    ? 'arrastando'
    : expandido
      ? 'expandido'
      : aviso
        ? toque
          ? 'toque'
          : 'alerta'
        : gravacao.estado !== 'parado'
          ? 'voz'
          : entendendo
            ? 'entendendo'
            : pergunta
              ? 'pergunta'
            : toast
              ? 'toast'
              : sobre
                ? 'sobre'
                : 'recolhido'

  const proximo = useMemo(() => proximoDoDia(dados, agora), [dados, agora])
  const estilo = medidas(modo, pos, !!pergunta)
  const emPe = !horizontal(pos.borda) && modo === 'recolhido'

  // Arrastar o entalho: segurar e mover mais de 5 px. Só clicar abre o painel.
  const arraste = useRef<{ x: number; y: number; movendo: boolean } | null>(null)
  const aoApertar = (e: PE<HTMLButtonElement>) => {
    if (e.button !== 0) return
    e.currentTarget.setPointerCapture(e.pointerId)
    arraste.current = { x: e.screenX, y: e.screenY, movendo: false }
  }
  const aoMover = (e: PE<HTMLButtonElement>) => {
    const a = arraste.current
    if (!a || a.movendo) return
    if (Math.hypot(e.screenX - a.x, e.screenY - a.y) > 5) {
      a.movendo = true
      api.arrastar('inicio')
    }
  }
  const aoSoltar = () => {
    const a = arraste.current
    arraste.current = null
    if (a?.movendo) api.arrastar('fim')
    else if (a) abrirPainel()
  }
  const pilula = { onPointerDown: aoApertar, onPointerMove: aoMover, onPointerUp: aoSoltar, 'aria-label': 'Abrir o assistente (segure e arraste para mudar de lugar)' }

  const marca = (
    <span className={`marca-casca ${chamado === 'escutando' ? 'atento' : ''}`} title={chamado === 'escutando' ? 'Ouvindo o "Ei, Zarb"' : undefined}>
      <span className="marca-anel" aria-hidden="true" />
    </span>
  )

  return (
    <div
      className={`entalho ${pos.borda} ${modo}`}
      style={estilo}
      onMouseEnter={() => {
        setSobre(true)
        api.mouseSobre(true)
      }}
      onMouseLeave={() => {
        setSobre(false)
        api.mouseSobre(false)
      }}
    >
      {modo === 'expandido' ? (
        <Painel
          dados={dados}
          agora={agora}
          aba={aba}
          setAba={setAba}
          trocas={trocas}
          limparConversa={() => {
            setTrocas([])
            setAba('hoje')
          }}
          enviar={(t) => enviarRef.current(t, false)}
          gravacao={gravacao}
          chamado={chamado}
          entrada={entrada}
          fechar={() => setExpandido(false)}
        />
      ) : (modo === 'alerta' || modo === 'toque') && aviso ? (
        <Avisos aviso={aviso} agora={agora} fechar={tirarAviso} marca={marca} mais={avisos.length - 1} />
      ) : modo === 'voz' ? (
        <div className="pilula" aria-live="polite">
          {marca}
          {gravacao.estado === 'transcrevendo' ? (
            <span className="linha-suave">Entendendo…</span>
          ) : (
            <>
              <span className="onda" aria-hidden="true">
                {[0.5, 1, 0.7, 1, 0.45].map((f, i) => (
                  <i key={i} style={{ transform: `scaleY(${0.25 + gravacao.nivel * f})` }} />
                ))}
              </span>
              <span className="linha-suave" style={{ color: '#fff' }}>
                {pergunta ?? 'Ouvindo'}
              </span>
              <span className="ponto-vermelho" aria-label="Microfone ligado" />
            </>
          )}
        </div>
      ) : modo === 'pergunta' ? (
        <button type="button" className="pilula" onClick={() => gravacao.iniciar()} aria-label="Responder falando">
          {marca}
          <span className="linha-suave" style={{ color: '#fff' }}>
            {pergunta}
          </span>
          <span className="chip">Responder</span>
        </button>
      ) : modo === 'entendendo' ? (
        <div className="pilula" aria-live="polite">
          {marca}
          <span className="linha-suave">"{entendendo}"</span>
        </div>
      ) : modo === 'toast' && toast ? (
        <div className="pilula" role="status">
          {marca}
          <span className={toast.erro ? 'linha-suave erro-texto' : 'linha-suave'} style={toast.erro ? undefined : { color: '#fff' }}>
            {toast.texto}
          </span>
          {toast.desfazer && (
            <button
              type="button"
              className="link-texto"
              onClick={() => {
                toast.desfazer?.()
                setToast({ texto: 'Desfeito.' })
              }}
            >
              Desfazer
            </button>
          )}
        </div>
      ) : modo === 'sobre' ? (
        <button type="button" className="pilula-duas" {...pilula}>
          <span className="primeira">
            {marca}
            <span className="hora">{hora(agora)}</span>
            <span className="linha-suave">{proximo?.texto ?? 'Nada nas próximas horas'}</span>
            {proximo && <span className="chip">{proximo.quando}</span>}
          </span>
          <span className="segunda">{resumo(dados, agora)} · clique para abrir</span>
        </button>
      ) : emPe ? (
        <button type="button" className="pilula em-pe" {...pilula}>
          {marca}
          <span className="vertical">
            {hora(agora)}
            {proximo ? ` · ${proximo.quando}` : ''}
          </span>
        </button>
      ) : (
        <button type="button" className="pilula" {...pilula}>
          {marca}
          <span className="hora">{hora(agora)}</span>
          <span className="linha-suave">{proximo?.texto ?? ''}</span>
          {proximo && <span className="chip">{proximo.quando}</span>}
        </button>
      )}
    </div>
  )
}

// Tamanho e lugar do entalho dentro da janela transparente, conforme o estado e a borda.
function medidas(modo: string, pos: Pos, comPergunta = false): CSSProperties {
  if (modo === 'expandido') return horizontal(pos.borda) ? { width: 940, height: 640, left: 10 } : { width: 940, height: 640, top: 10 }
  const tamanhos: Record<string, [number, number]> = {
    arrastando: [320, 38],
    recolhido: [320, 38],
    sobre: [380, 62],
    voz: [320, 40],
    pergunta: [440, 40],
    entendendo: [420, 40],
    toast: [440, 40],
    toque: [340, 38],
    alerta: [440, 118],
  }
  let [w, h] = tamanhos[modo] ?? [320, 38]
  if (modo === 'voz' && comPergunta) w = 440
  if (modo === 'recolhido' && !horizontal(pos.borda)) [w, h] = [40, COMPRIMENTO.emPe]
  if (modo === 'arrastando') return { width: w, height: h, top: 0, left: (JANELA.w - w) / 2 }
  if (horizontal(pos.borda)) {
    const centro = pos.deslocamento + COMPRIMENTO.deitado / 2
    return { width: w, height: h, left: Math.min(Math.max(centro - w / 2, 0), JANELA.w - w) }
  }
  const centro = pos.deslocamento + COMPRIMENTO.emPe / 2
  return { width: w, height: h, top: Math.min(Math.max(centro - h / 2, 0), JANELA.h - h) }
}

function chave(a: Aviso) {
  return a.tipo === 'lembrete' ? `t${a.tarefa.id}` : a.tipo === 'habito' ? `h${a.habito.id}` : `e${a.evento.id}${a.marco}`
}

// Desfazer do toast: só o que foi criado ou marcado agora.
function desfazerDe(cartoes: Cartao[]): (() => void) | undefined {
  const fns = cartoes.flatMap((c) => {
    if (c.tipo === 'tarefa') return [() => api.apagarTarefa(c.tarefa.id)]
    if (c.tipo === 'concluida') return [() => api.reabrirTarefa(c.tarefa.id)]
    if (c.tipo === 'corpo') return [() => api.trocarCorpoDoDia(c.registro.dia, c.antes)]
    if (c.tipo === 'habito') {
      const agora = c.habito.registro[diaLocal(new Date())] ?? 0
      return [() => api.registrarHabito(c.habito.id, c.antes - agora)]
    }
    return []
  })
  return fns.length ? () => fns.forEach((f) => f()) : undefined
}

// O que aparece no entalho fechado: reunião ou lembrete das próximas 3 horas.
function proximoDoDia(d: Dados, agora: Date): { texto: string; quando: string } | null {
  const ev = eventosDoDia(d.agenda.eventos, agora).find((e) => !e.diaInteiro && new Date(e.fim) > agora)
  const lem = d.tarefas.find((t) => !t.feita && t.quando && new Date(t.quando) > agora && mesmoDia(new Date(t.quando), agora))
  const opcoes = [ev && { min: minutosAte(ev.inicio, agora), texto: ev.titulo }, lem && { min: minutosAte(lem.quando!, agora), texto: lem.titulo }].filter(
    (x): x is { min: number; texto: string } => !!x && x.min <= 180,
  )
  if (!opcoes.length) return null
  const p = opcoes.sort((a, b) => a.min - b.min)[0]
  return { texto: p.texto, quando: p.min <= 0 ? 'agora' : emQuanto(p.min).replace(/^em /, '') }
}

function resumo(d: Dados, agora: Date): string {
  const atrasadas = d.tarefas.filter((t) => !t.feita && t.quando && new Date(t.quando) <= agora).length
  const deHoje = d.habitos.filter((h) => ehDiaDele(h, agora))
  const partes = [
    atrasadas ? `${atrasadas} ${atrasadas === 1 ? 'tarefa atrasada' : 'tarefas atrasadas'}` : 'nada atrasado',
    deHoje.length ? `${deHoje.filter((h) => feitoNoDia(h, agora)).length} de ${deHoje.length} hábitos` : null,
  ]
  return partes.filter(Boolean).join(' · ')
}
