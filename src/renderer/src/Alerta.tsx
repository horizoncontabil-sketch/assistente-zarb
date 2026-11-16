import type { ReactNode } from 'react'
import { hora } from '../../shared/datas'
import { numero, progresso } from '../../shared/habitos'
import { useState } from 'react'
import type { Aba, Aviso } from '../../shared/tipos'
import { unidade } from './abas/Habitos'
import { Icone } from './icones'
import { api, emQuanto, minutosAte } from './util'

type Props = { aviso: Aviso; agora: Date; fechar: () => void; marca: ReactNode; mais: number; abrir: (a: Aba) => void }

export function Avisos({ aviso, agora, fechar, marca, mais, abrir }: Props) {
  const e = (f: () => Promise<unknown>) => async () => {
    await f()
    fechar()
  }
  const extra = mais > 0 ? <span className="selo">+{mais}</span> : null

  if (aviso.tipo === 'lembrete') {
    const t = aviso.tarefa
    return (
      <div className="aviso" role="alert">
        <div className="aviso-topo">
          <span style={{ color: 'var(--ambar)', display: 'grid' }}>
            <Icone nome="relogio" tamanho={22} />
          </span>
          <span className="aviso-texto">
            <small>Lembrete · {hora(new Date(t.quando!))}</small>
            <strong>{t.titulo}</strong>
          </span>
          {extra}
        </div>
        <div className="aviso-acoes">
          <button type="button" className="botao principal grande" onClick={e(() => api.concluirTarefa(t.id))}>
            Feito
          </button>
          <button type="button" className="botao" onClick={e(() => api.adiarTarefa(t.id, 10))}>
            10 min
          </button>
          <button type="button" className="botao" onClick={e(() => api.adiarTarefa(t.id, 60))}>
            1 hora
          </button>
          <button type="button" className="botao" onClick={e(() => api.adiarTarefa(t.id, minutosAteAmanha9(agora)))}>
            Amanhã
          </button>
        </div>
      </div>
    )
  }

  if (aviso.tipo === 'habito') {
    const h = aviso.habito
    return (
      <div className="aviso" role="alert">
        <div className="aviso-topo">
          <span style={{ color: 'var(--azul)', display: 'grid' }}>
            <Icone nome="habito" tamanho={22} />
          </span>
          <span className="aviso-texto">
            <small>Hábito{h.meta ? ` · ${progresso(h, agora).texto}` : ''}</small>
            <strong>{h.nome}</strong>
          </span>
          {extra}
        </div>
        <div className="aviso-acoes">
          <button type="button" className="botao principal grande" onClick={e(() => api.registrarHabito(h.id, h.meta ? h.meta.passo : 1))}>
            {h.meta ? `+ ${numero(h.meta.passo)} ${unidade(h.meta.passo, h.meta.unidade)}` : 'Feito'}
          </button>
          <button type="button" className="botao" onClick={fechar}>
            Depois
          </button>
        </div>
      </div>
    )
  }

  if (aviso.tipo === 'bomdia') return <BomDia aviso={aviso} fechar={fechar} extra={extra} />

  if (aviso.tipo === 'marmita') {
    const nome = aviso.refeicao === 'almoco' ? 'almoço' : 'jantar'
    return (
      <div className="aviso" role="alert">
        <div className="aviso-topo">
          <span style={{ color: 'var(--verde)', display: 'grid' }}>
            <Icone nome="relogio" tamanho={22} />
          </span>
          <span className="aviso-texto">
            <small>Ainda sem {nome} registrado hoje</small>
            <strong>Comeu a marmita?</strong>
          </span>
          {extra}
        </div>
        <div className="aviso-acoes">
          <button type="button" className="botao principal grande" onClick={e(() => api.comiMarmita(aviso.refeicao))}>
            Comi a marmita
          </button>
          <button type="button" className="botao" onClick={() => abrir('alimentacao')}>
            Outra coisa
          </button>
          <button type="button" className="botao" onClick={fechar}>
            Depois
          </button>
        </div>
      </div>
    )
  }

  if (aviso.tipo === 'atrasadas') {
    const n = aviso.titulos.length
    return (
      <div className="aviso" role="alert">
        <div className="aviso-topo">
          <span style={{ color: 'var(--ambar)', display: 'grid' }}>
            <Icone nome="relogio" tamanho={22} />
          </span>
          <span className="aviso-texto">
            <small>{n === 1 ? '1 lembrete passou da hora' : `${n} lembretes passaram da hora`}</small>
            <strong>{aviso.titulos.slice(0, 2).join(' · ')}{n > 2 ? ` e mais ${n - 2}` : ''}</strong>
          </span>
          {extra}
        </div>
        <div className="aviso-acoes">
          <button type="button" className="botao principal grande" onClick={() => abrir('tarefas')}>
            Ver tarefas
          </button>
          <button type="button" className="botao" onClick={fechar}>
            Depois
          </button>
        </div>
      </div>
    )
  }

  if (aviso.tipo === 'sono') {
    const textos = {
      aviso: { titulo: 'Hora de ir encerrando', sub: 'Às 22h30 o PC suspende. Salve o que estiver aberto.' },
      tela: { titulo: 'Luz quente', sub: 'Abaixe a lâmpada e deixe a tela escura e quente (Luz noturna do Windows).' },
      suspender: { titulo: 'Hora de deitar', sub: aviso.prazo ? `O PC suspende às ${hora(new Date(aviso.prazo))}. Nada é fechado.` : 'O PC vai suspender.' },
    }[aviso.fase]
    return (
      <div className="aviso" role="alert">
        <div className="aviso-topo">
          <span style={{ color: 'var(--ambar)', display: 'grid' }}>
            <Icone nome="relogio" tamanho={22} />
          </span>
          <span className="aviso-texto">
            <small>{textos.sub}</small>
            <strong>{textos.titulo}</strong>
          </span>
          {extra}
        </div>
        <div className="aviso-acoes">
          {aviso.fase === 'suspender' ? (
            <>
              <button type="button" className="botao principal grande" onClick={e(() => api.suspenderAgora())}>
                Suspender agora
              </button>
              <button type="button" className="botao" onClick={e(() => api.adiarSono())}>
                Estou em algo importante (+15 min)
              </button>
            </>
          ) : (
            <button type="button" className="botao principal grande" onClick={fechar}>
              Ok
            </button>
          )}
        </div>
      </div>
    )
  }

  const ev = aviso.evento
  const min = minutosAte(ev.inicio, agora)
  // 10 minutos antes: só um toque. 1 minuto antes: o aviso com o botão de entrar.
  if (aviso.marco > 1) {
    return (
      <button type="button" className="pilula" onClick={fechar} aria-label={`${ev.titulo} em ${min} minutos. Clique para dispensar.`}>
        {marca}
        <span className="linha-suave" style={{ color: '#fff' }}>
          {ev.titulo}
        </span>
        <span className="chip">{min <= 0 ? 'agora' : emQuanto(min)}</span>
      </button>
    )
  }
  return (
    <div className="aviso" role="alert">
      <div className="aviso-topo">
        <span style={{ color: 'var(--azul)', display: 'grid' }}>
          <Icone nome="video" tamanho={22} />
        </span>
        <span className="aviso-texto">
          <small style={{ color: 'var(--azul-texto)' }}>
            {hora(new Date(ev.inicio))} · {min <= 0 ? 'começando agora' : `começa ${emQuanto(min)}`}
          </small>
          <strong>{ev.titulo}</strong>
        </span>
        {extra}
      </div>
      <div className="aviso-acoes">
        {ev.meet ? (
          <button type="button" className="botao principal grande" onClick={e(() => api.abrirLink(ev.meet!))}>
            Entrar no Meet
          </button>
        ) : ev.link ? (
          <button type="button" className="botao principal grande" onClick={e(() => api.abrirLink(ev.link!))}>
            Abrir na agenda
          </button>
        ) : null}
        <button type="button" className="botao" onClick={fechar}>
          Agora não
        </button>
      </div>
    </div>
  )
}

function minutosAteAmanha9(agora: Date): number {
  const d = new Date(agora)
  d.setDate(d.getDate() + 1)
  d.setHours(9, 0, 0, 0)
  return Math.round((d.getTime() - agora.getTime()) / 60_000)
}

const HORAS_DEITOU = ['22:30', '23:00', '23:30', '00:00', '01:00']

function BomDia({ aviso, fechar, extra }: { aviso: Extract<Aviso, { tipo: 'bomdia' }>; fechar: () => void; extra: ReactNode }) {
  const [deitou, setDeitou] = useState<string | null>(null)
  const [peso, setPeso] = useState('')
  const [pesoSalvo, setPesoSalvo] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function sono(h: string) {
    const r = await api.registrarSono(h)
    if (r.ok) setDeitou(h)
    else setErro(r.erro)
  }
  async function salvarPeso() {
    const n = Number(peso.replace(',', '.'))
    if (!(n > 30 && n < 250)) return setErro('Peso fora do normal. Confira.')
    const d = new Date()
    const dia = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const r = await api.registrarCorpo({ dia, peso: Math.round(n * 10) / 10 })
    if (r.ok) setPesoSalvo(true)
    else setErro(r.erro)
  }

  return (
    <div className="aviso" role="alert">
      <div className="aviso-topo">
        <span style={{ color: 'var(--azul)', display: 'grid' }}>
          <Icone nome="relogio" tamanho={22} />
        </span>
        <span className="aviso-texto">
          <small>{aviso.linhas.slice(1).join(' · ')}</small>
          <strong>{aviso.linhas[0]}</strong>
        </span>
        {extra}
      </div>
      {erro && <small style={{ color: 'var(--vermelho)' }}>{erro}</small>}
      {aviso.pedirSono && (
        <div className="aviso-acoes" style={{ flexWrap: 'wrap' }}>
          <small style={{ width: '100%', color: 'var(--suave)' }}>{deitou ? `Deitou às ${deitou.replace(':', 'h')}. Anotado.` : 'Que horas você deitou ontem?'}</small>
          {!deitou &&
            HORAS_DEITOU.map((h) => (
              <button key={h} type="button" className="botao" onClick={() => sono(h)}>
                {h.replace(':', 'h').replace('h00', 'h')}
              </button>
            ))}
        </div>
      )}
      {aviso.pedirPeso && (
        <div className="aviso-acoes">
          {pesoSalvo ? (
            <small style={{ color: 'var(--suave)' }}>Peso anotado.</small>
          ) : (
            <>
              <input className="campo-texto" style={{ width: 110 }} inputMode="decimal" value={peso} onChange={(e) => setPeso(e.target.value)} placeholder="Peso (kg)" aria-label="Peso de hoje" />
              <button type="button" className="botao" disabled={!peso.trim()} onClick={salvarPeso}>
                Salvar peso
              </button>
            </>
          )}
        </div>
      )}
      <div className="aviso-acoes">
        <button type="button" className="botao principal grande" onClick={fechar}>
          Bom dia
        </button>
      </div>
    </div>
  )
}
