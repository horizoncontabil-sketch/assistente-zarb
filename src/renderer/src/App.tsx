import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { hora, mesmoDia } from '../../shared/datas'
import { eventosDoDia } from '../../shared/google'
import type { Aba, Aviso, Mensagem, Resposta } from '../../shared/tipos'
import { Alerta } from './Alerta'
import { Painel } from './Painel'
import { usarAgora, usarDados } from './usarDados'
import { usarChamado, usarGravacao } from './usarVoz'
import { api, emQuanto, falar, minutosAte } from './util'

export type Troca = { id: number; pergunta: string; resposta: Resposta | null; falado: boolean }

let proximoId = 1

export function App() {
  const dados = usarDados()
  const agora = usarAgora()
  const [expandido, setExpandido] = useState(false)
  const [aba, setAba] = useState<Aba | 'conversa'>('hoje')
  const [avisos, setAvisos] = useState<Aviso[]>([])
  const [trocas, setTrocas] = useState<Troca[]>([])
  const [erroVoz, setErroVoz] = useState<string | null>(null)
  const [sobre, setSobre] = useState(false)
  const entrada = useRef<HTMLTextAreaElement>(null)

  const abrirPainel = useCallback((a?: Aba | 'conversa') => {
    if (a) setAba(a)
    setExpandido(true)
  }, [])

  // Primeira vez (sem a chave da Groq): abre direto nas configurações.
  useEffect(() => {
    api.configuracoes().then((c) => {
      if (!c.temChaveGroq) abrirPainel('config')
    })
  }, [abrirPainel])

  useEffect(() => {
    api.expandido(expandido)
    if (expandido) setTimeout(() => entrada.current?.focus(), 180)
  }, [expandido])

  const historico = useMemo<Mensagem[]>(
    () => trocas.filter((t) => t.resposta && !t.resposta.erro).flatMap((t) => [{ papel: 'eu', texto: t.pergunta }, { papel: 'assistente', texto: t.resposta!.texto }]),
    [trocas],
  )

  const enviar = useCallback(
    async (texto: string, falado = false) => {
      const t = texto.trim()
      if (!t) return
      const id = proximoId++
      setTrocas((l) => [...l.slice(-19), { id, pergunta: t, resposta: null, falado }])
      setAba('conversa')
      setExpandido(true)
      const r = await api.conversar(t, historico)
      setTrocas((l) => l.map((x) => (x.id === id ? { ...x, resposta: r } : x)))
      if (r.aba) setAba(r.aba)
      if (falado && dados.config?.responderFalando) falar(r.texto)
    },
    [historico, dados.config?.responderFalando],
  )

  const gravacao = usarGravacao(
    useCallback((t: string) => enviar(t, true), [enviar]),
    useCallback((e: string) => {
      setErroVoz(e)
      setTimeout(() => setErroVoz(null), 6000)
    }, []),
  )
  const chamado = usarChamado(
    !!dados.config?.chamadoPorVoz && !!dados.config.modeloVozDisponivel,
    gravacao.estado !== 'parado',
    gravacao.iniciar,
  )

  useEffect(
    () =>
      api.aoComando((c) => {
        if (c.tipo === 'alternar') setExpandido((e) => !e)
        else if (c.tipo === 'expandir') abrirPainel(c.aba)
        else if (c.tipo === 'recolher') setExpandido(false)
        else if (c.tipo === 'falar') gravacao.alternar()
        else if (c.tipo === 'aviso') setAvisos((l) => [...l.filter((a) => chaveAviso(a) !== chaveAviso(c.aviso)), c.aviso])
      }),
    [abrirPainel, gravacao.alternar],
  )

  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || document.body.dataset.gravandoAtalho) return
      if (gravacao.estado === 'ouvindo') gravacao.cancelar()
      else setExpandido(false)
    }
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  }, [gravacao])

  const aviso = avisos[0] ?? null
  const fecharAviso = () => setAvisos((l) => l.slice(1))

  // Estado do entalho, do menor para o maior.
  const modo = expandido ? 'expandido' : aviso ? 'alerta' : gravacao.estado !== 'parado' ? 'voz' : erroVoz ? 'erro' : sobre ? 'sobre' : 'recolhido'

  const proximo = useMemo(() => proximoDoDia(dados, agora), [dados, agora])

  return (
    <div
      className={`entalho ${modo}`}
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
          enviar={enviar}
          gravacao={gravacao}
          chamado={chamado}
          entrada={entrada}
          fechar={() => setExpandido(false)}
        />
      ) : modo === 'alerta' && aviso ? (
        <Alerta aviso={aviso} agora={agora} fechar={fecharAviso} mais={avisos.length - 1} />
      ) : (
        <button className="pilula" onClick={() => abrirPainel()} aria-label="Abrir o assistente">
          <span className={`marca-z ${chamado === 'escutando' ? 'atento' : ''}`} title={chamado === 'escutando' ? 'Ouvindo o "Ei, Zarb"' : undefined}>
            z
          </span>
          {modo === 'voz' ? (
            <span className="onda" aria-live="polite">
              {gravacao.estado === 'transcrevendo' ? (
                <span className="texto-pilula">Entendendo…</span>
              ) : (
                <>
                  {[0.6, 1, 0.75, 1, 0.55].map((f, i) => (
                    <i key={i} style={{ transform: `scaleY(${0.25 + gravacao.nivel * f})` }} />
                  ))}
                  <span className="texto-pilula">Ouvindo</span>
                </>
              )}
            </span>
          ) : modo === 'erro' ? (
            <span className="texto-pilula erro-texto">{erroVoz}</span>
          ) : (
            <span className="texto-pilula">
              <strong>{hora(agora)}</strong>
              {proximo && <span className="proximo"> · {proximo}</span>}
            </span>
          )}
          {gravacao.estado === 'ouvindo' && <span className="ponto-gravando" aria-label="Microfone ligado" />}
        </button>
      )}
    </div>
  )
}

function chaveAviso(a: Aviso) {
  return a.tipo === 'lembrete' ? `t${a.tarefa.id}` : `e${a.evento.id}`
}

// O que aparece no entalho fechado: compromisso ou lembrete mais próximo das próximas 3 horas.
function proximoDoDia(d: ReturnType<typeof usarDados>, agora: Date): string | null {
  const ev = eventosDoDia(d.agenda.eventos, agora).find((e) => !e.diaInteiro && new Date(e.fim) > agora)
  const lem = d.tarefas.find((t) => !t.feita && t.quando && new Date(t.quando) > agora && mesmoDia(new Date(t.quando), agora))
  const opcoes = [
    ev && { min: minutosAte(ev.inicio, agora), texto: ev.titulo },
    lem && { min: minutosAte(lem.quando!, agora), texto: lem.titulo },
  ].filter((x): x is { min: number; texto: string } => !!x && x.min <= 180)
  if (!opcoes.length) return null
  const p = opcoes.sort((a, b) => a.min - b.min)[0]
  return `${p.texto} ${p.min <= 0 ? 'agora' : emQuanto(p.min)}`
}
