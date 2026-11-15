import { hora, mesmoDia } from '../../../shared/datas'
import { eventosDoDia } from '../../../shared/google'
import { ehDiaDele, feitoNoDia, numero, progresso, sequencia } from '../../../shared/habitos'
import { totaisDoDia } from '../../../shared/alimentacao'
import { diaLocal } from '../../../shared/datas'
import type { Evento, Tarefa } from '../../../shared/tipos'
import { Compositor, type PropsPainel } from '../Painel'
import { Icone } from '../icones'
import { api, emQuanto, minutosAte } from '../util'

const maiuscula = (t: string) => t.charAt(0).toUpperCase() + t.slice(1)

export function Hoje({ dados, agora, setAba, enviar, gravacao, entrada }: PropsPainel) {
  const eventos = eventosDoDia(dados.agenda.eventos, agora).filter((e) => !e.diaInteiro)
  const pendentes = dados.tarefas.filter((t) => !t.feita)
  const atrasadas = pendentes.filter((t) => t.quando && new Date(t.quando) <= agora)
  const lembretesHoje = pendentes.filter((t) => t.quando && mesmoDia(new Date(t.quando), agora))
  const habitosHoje = dados.habitos.filter((h) => ehDiaDele(h, agora))
  const conectado = !!dados.config?.google.conectado

  // O que vem agora: reunião acontecendo ou na próxima hora; senão o próximo lembrete.
  const reuniao = eventos.find((e) => new Date(e.fim) > agora && minutosAte(e.inicio, agora) <= 60)
  const proxLembrete = lembretesHoje.find((t) => new Date(t.quando!) > agora)
  const min = reuniao ? minutosAte(reuniao.inicio, agora) : 0
  const sub = reuniao
    ? min <= 0
      ? `${reuniao.titulo} está acontecendo`
      : `${reuniao.titulo} ${emQuanto(min)}, às ${hora(new Date(reuniao.inicio))}`
    : proxLembrete
      ? `Próximo lembrete: ${proxLembrete.titulo}, às ${hora(new Date(proxLembrete.quando!))}`
      : atrasadas.length
        ? `${atrasadas.length} ${atrasadas.length === 1 ? 'tarefa atrasada' : 'tarefas atrasadas'}`
        : 'Nada marcado para as próximas horas'
  const mostrarMeet = reuniao?.meet && min <= 15

  // "A seguir": atrasadas primeiro, depois reuniões e lembretes de hoje em ordem.
  type Item = { chave: string; hora: string; texto: string; lado: string; atrasada?: boolean; tarefa?: Tarefa; evento?: Evento; t: number }
  const itens: Item[] = [
    ...atrasadas.map((t) => ({ chave: t.id, hora: hora(new Date(t.quando!)), texto: t.titulo, lado: 'atrasado', atrasada: true, tarefa: t, t: 0 })),
    ...eventos.filter((e) => new Date(e.fim) > agora).map((e) => ({ chave: e.id, hora: hora(new Date(e.inicio)), texto: e.titulo, lado: e.meet ? 'Meet' : (e.local ?? ''), evento: e, t: new Date(e.inicio).getTime() })),
    ...lembretesHoje.filter((t) => new Date(t.quando!) > agora).map((t) => ({ chave: t.id, hora: hora(new Date(t.quando!)), texto: t.titulo, lado: 'lembrete', tarefa: t, t: new Date(t.quando!).getTime() })),
  ].sort((a, b) => a.t - b.t)

  return (
    <>
      <div className="titulo-linha">
        <div className="titulo-bloco">
          <h1>{maiuscula(agora.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }))}</h1>
          <p>{sub}</p>
        </div>
        {mostrarMeet && (
          <button type="button" className="botao principal alto" onClick={() => api.abrirLink(reuniao!.meet!)}>
            <Icone nome="video" tamanho={16} /> Entrar no Meet
          </button>
        )}
      </div>

      <div className="rolagem">
        <section className="cartao" aria-label="Seu dia" style={{ gap: 10 }}>
          <div className="cartao-topo" style={{ paddingBottom: 0 }}>
            <strong>Seu dia</strong>
            <span className="meta">
              {conectado ? `${eventos.length} ${eventos.length === 1 ? 'reunião' : 'reuniões'} · ` : ''}
              {lembretesHoje.length} {lembretesHoje.length === 1 ? 'lembrete' : 'lembretes'}
            </span>
          </div>
          <LinhaDoDia eventos={eventos} lembretes={lembretesHoje} agora={agora} />
          <div className="legenda">
            <span>
              <i style={{ width: 12, height: 8, borderRadius: 3, background: 'var(--azul)', display: 'inline-block' }} />
              Reunião
            </span>
            <span>
              <i style={{ width: 8, height: 8, borderRadius: '50%', background: '#fff', display: 'inline-block' }} />
              Lembrete
            </span>
            {!conectado && (
              <button type="button" className="link" style={{ marginLeft: 'auto' }} onClick={() => setAba('config')}>
                Entrar com Google para ver as reuniões
              </button>
            )}
          </div>
        </section>

        <ComidaDeHoje dados={dados} agora={agora} irPara={() => setAba('alimentacao')} />

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.45fr) minmax(0, 1fr)', gap: 14 }}>
          <section className="cartao" aria-label="A seguir">
            <div className="cartao-topo">
              <strong>A seguir</strong>
              <button type="button" className="link" onClick={() => setAba('agenda')}>
                Ver agenda
              </button>
            </div>
            {itens.length ? (
              itens.slice(0, 6).map((i) => (
                <div key={i.chave} className="linha">
                  <span className="hora-coluna" style={i.atrasada ? { color: 'var(--ambar)' } : undefined}>
                    {i.hora}
                  </span>
                  <span className="principal-texto">{i.texto}</span>
                  {i.atrasada ? (
                    <>
                      <span className="acoes">
                        <button type="button" className="botao pequeno" onClick={() => api.concluirTarefa(i.tarefa!.id)}>
                          Feito
                        </button>
                      </span>
                      <span className="selo ambar">atrasado</span>
                    </>
                  ) : i.evento?.meet && minutosAte(i.evento.inicio, agora) <= 15 ? (
                    <button type="button" className="botao pequeno" onClick={() => api.abrirLink(i.evento!.meet!)}>
                      Meet
                    </button>
                  ) : (
                    <span className="meta">{i.lado}</span>
                  )}
                </div>
              ))
            ) : (
              <p className="nada">Nada pela frente hoje.</p>
            )}
          </section>

          <section className="cartao" aria-label="Hábitos de hoje">
            <div className="cartao-topo">
              <strong>Hábitos de hoje</strong>
              <span className="meta" style={{ color: 'var(--suave)' }}>
                {habitosHoje.filter((h) => feitoNoDia(h, agora)).length} de {habitosHoje.length}
              </span>
            </div>
            {habitosHoje.length ? (
              habitosHoje.map((h) => {
                const feito = feitoNoDia(h, agora)
                return (
                  <div key={h.id} className="linha">
                    <button
                      type="button"
                      className={`marcar ${feito ? 'feito' : ''}`}
                      aria-label={h.meta ? `Somar ${numero(h.meta.passo)} ${h.meta.unidade} em ${h.nome}` : feito ? `Desmarcar ${h.nome}` : `Marcar ${h.nome}`}
                      onClick={() => api.registrarHabito(h.id, h.meta ? h.meta.passo : feito ? -1 : 1)}
                    >
                      {feito && <Icone nome="check" tamanho={12} />}
                    </button>
                    <span className="principal-texto" style={feito ? { color: 'var(--suave)' } : undefined}>
                      {h.nome}
                      {h.meta && !feito && <span className="meta"> · {progresso(h, agora).texto}</span>}
                    </span>
                    <span className="meta">{sequencia(h, agora)} {sequencia(h, agora) === 1 ? 'dia' : 'dias'}</span>
                  </div>
                )
              })
            ) : (
              <p className="nada">
                Nenhum hábito ainda.{' '}
                <button type="button" className="link" onClick={() => setAba('habitos')}>
                  Criar um
                </button>
              </p>
            )}
          </section>
        </div>
      </div>

      <Compositor enviar={enviar} gravacao={gravacao} entrada={entrada} atalhoFalar={dados.config?.atalhoFalar} />
    </>
  )
}

// O dia numa linha: reuniões em azul, lembretes como pontos, a hora de agora marcada.
function LinhaDoDia({ eventos, lembretes, agora }: { eventos: Evento[]; lembretes: Tarefa[]; agora: Date }) {
  const horas = [...eventos.flatMap((e) => [new Date(e.inicio), new Date(e.fim)]), ...lembretes.map((t) => new Date(t.quando!)), agora].map((d) => d.getHours() + d.getMinutes() / 60)
  const ini = Math.min(8, Math.floor(Math.min(...horas)))
  const fim = Math.max(19, Math.ceil(Math.max(...horas)))
  const x = (h: number) => `${((h - ini) / (fim - ini)) * 100}%`
  const h = (iso: string) => {
    const d = new Date(iso)
    return d.getHours() + d.getMinutes() / 60
  }
  const marcas = Array.from({ length: Math.floor((fim - ini) / 2) + 1 }, (_, i) => ini + i * 2)
  const agoraH = agora.getHours() + agora.getMinutes() / 60
  return (
    <div className="dia-linha" role="img" aria-label={`Seu dia das ${ini}h às ${fim}h: ${eventos.length} reuniões e ${lembretes.length} lembretes.`}>
      <div className="dia-trilho" />
      {eventos.map((e) => (
        <div key={e.id} className="dia-evento" title={`${hora(new Date(e.inicio))} ${e.titulo}`} style={{ left: x(h(e.inicio)), width: `calc(${x(h(e.fim))} - ${x(h(e.inicio))})`, opacity: new Date(e.fim) <= agora ? 0.35 : 1 }} />
      ))}
      {lembretes.map((t) => (
        <div key={t.id} className="dia-lembrete" title={`${hora(new Date(t.quando!))} ${t.titulo}`} style={{ left: x(h(t.quando!)) }} />
      ))}
      <div className="dia-agora" style={{ left: x(agoraH) }} />
      <span className="dia-agora-rotulo" style={{ left: x(agoraH) }}>
        {hora(agora)}
      </span>
      {marcas.map((m) => (
        <span key={m} className="dia-hora" style={{ left: x(m) }}>
          {m}h
        </span>
      ))}
    </div>
  )
}

// Uma linha com a dieta do dia; clicar leva à Alimentação.
function ComidaDeHoje({ dados, agora, irPara }: { dados: PropsPainel['dados']; agora: Date; irPara: () => void }) {
  const p = dados.saude.plano
  if (!p) return null
  const t = totaisDoDia(dados.saude.refeicoes, diaLocal(agora))
  const barra = (atual: number, meta: number) => (
    <span className="barra-progresso" style={{ flex: 1 }}>
      <span style={{ width: `${Math.round(Math.min(1, atual / meta) * 100)}%`, background: atual > meta * 1.05 ? 'var(--ambar)' : undefined }} />
    </span>
  )
  return (
    <button type="button" className="cartao" onClick={irPara} style={{ flexDirection: 'row', alignItems: 'center', gap: 18, textAlign: 'left', padding: '14px 18px' }} aria-label="Abrir Alimentação">
      <strong style={{ width: 70 }}>Comida</strong>
      <span style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10 }}>
        <span className="meta" style={{ width: 120 }}>
          {t.kcal.toLocaleString('pt-BR')} de {p.kcal.toLocaleString('pt-BR')} kcal
        </span>
        {barra(t.kcal, p.kcal)}
      </span>
      <span style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10 }}>
        <span className="meta" style={{ width: 130 }}>
          {Math.round(t.p)} de {p.proteina} g proteína
        </span>
        {barra(t.p, p.proteina)}
      </span>
    </button>
  )
}
